import asyncio
import time
import uuid
from typing import Dict, Any, Optional
from app.db.database import db
from app.services.document_ai import DocumentAIService
from app.schemas import DocumentProcessRequest

class DocumentWorker:
    """
    Production Asynchronous Worker for Document Ingestion, Semantic Chunking,
    and Persistent Knowledge Storage with Job Queue State Management.
    """
    _jobs: Dict[str, Dict[str, Any]] = {}
    _queue: Optional[asyncio.Queue] = None
    _loop = None
    _running: bool = False

    @classmethod
    def _get_queue(cls) -> asyncio.Queue:
        try:
            current_loop = asyncio.get_running_loop()
        except RuntimeError:
            current_loop = None

        if cls._queue is None or cls._loop != current_loop:
            cls._queue = asyncio.Queue()
            cls._loop = current_loop
            # Re-queue any pending jobs for this loop
            for jid, j in cls._jobs.items():
                if j.get("status") == "queued":
                    cls._queue.put_nowait(jid)
        return cls._queue

    @classmethod
    async def enqueue_job(cls, job_payload: Dict[str, Any]) -> str:
        """Enqueues a document processing job and returns its tracking job ID."""
        job_id = f"docjob_{int(time.time())}_{uuid.uuid4().hex[:6]}"
        job_record = {
            "jobId": job_id,
            "status": "queued",
            "payload": job_payload,
            "companyId": job_payload.get("companyId", "comp-techflow"),
            "title": job_payload.get("title", "Untitled Document"),
            "enqueuedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "completedAt": None,
            "error": None,
            "result": None,
            "retryCount": 0
        }
        cls._jobs[job_id] = job_record
        queue = cls._get_queue()
        await queue.put(job_id)
        return job_id

    @classmethod
    def get_job(cls, job_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve the live status and result of a document processing job."""
        return cls._jobs.get(job_id)

    @staticmethod
    async def process_document_job(job_payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes document ingestion, chunking, and durable persistence.
        Ensures backing knowledge source exists so chunks are searchable.
        """
        company_id = job_payload.get("companyId", "comp-techflow")
        title = job_payload.get("title", "Untitled Document")
        raw_text = job_payload.get("rawText", "")
        doc_type = job_payload.get("docType", "pdf")
        category = job_payload.get("category", "General")
        source_id = job_payload.get("sourceId") or f"ks-{company_id}-{int(time.time())}"

        # 1. Ensure parent KnowledgeSource exists in database
        if source_id not in db.knowledge_sources:
            db.knowledge_sources[source_id] = {
                "id": source_id,
                "companyId": company_id,
                "title": title,
                "sourceType": doc_type,
                "category": category,
                "status": "indexed",
                "lifecycleState": "active",
                "totalChunks": 0,
                "tokenCount": 0,
                "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            }

        # 2. Semantic Chunking via DocumentAIService
        req = DocumentProcessRequest(
            title=title,
            raw_text=raw_text,
            doc_type=doc_type,
            chunk_size=job_payload.get("chunkSize", 500)
        )
        res = DocumentAIService.process_document(req)

        # 3. Ingest chunks into durable store
        created_chunk_ids = []
        total_tokens = 0
        for c in res.chunks:
            chunk_id = f"chk-{company_id}-{c.chunk_id}"
            db.document_chunks[chunk_id] = {
                "id": chunk_id,
                "knowledgeSourceId": source_id,
                "companyId": company_id,
                "chunkIndex": c.chunk_index,
                "content": c.content,
                "tokenCount": c.token_count,
                "metadata": {"title": title, "category": category}
            }
            created_chunk_ids.append(chunk_id)
            total_tokens += c.token_count

        # Update parent knowledge source stats
        if source_id in db.knowledge_sources:
            db.knowledge_sources[source_id]["totalChunks"] = len(created_chunk_ids)
            db.knowledge_sources[source_id]["tokenCount"] = total_tokens
            db.knowledge_sources[source_id]["status"] = "indexed"

        # Persist to disk/database
        db.save_state()

        return {
            "status": "completed",
            "sourceId": source_id,
            "totalChunks": len(created_chunk_ids),
            "totalTokens": total_tokens,
            "chunkIds": created_chunk_ids
        }

    @classmethod
    async def run_worker_loop(cls, max_iterations: Optional[int] = None, poll_interval: float = 0.5):
        """
        Background queue runner that processes pending jobs with retries.
        """
        cls._running = True
        iterations = 0
        queue = cls._get_queue()
        while cls._running:
            if max_iterations is not None and iterations >= max_iterations:
                break
            try:
                job_id = await asyncio.wait_for(queue.get(), timeout=poll_interval)
            except asyncio.TimeoutError:
                iterations += 1
                continue

            job = cls._jobs.get(job_id)
            if not job:
                queue.task_done()
                continue

            job["status"] = "processing"
            try:
                result = await cls.process_document_job(job["payload"])
                job["status"] = "completed"
                job["result"] = result
                job["completedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
            except Exception as exc:
                job["retryCount"] += 1
                if job["retryCount"] < 3:
                    job["status"] = "queued"
                    await queue.put(job_id)
                else:
                    job["status"] = "failed"
                    job["error"] = str(exc)
                    job["completedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
            finally:
                queue.task_done()
                iterations += 1

    @classmethod
    def stop_worker(cls):
        """Signals the background loop to stop gracefully."""
        cls._running = False
