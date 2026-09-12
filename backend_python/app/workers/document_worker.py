import asyncio
import time
import uuid
from typing import Dict, Any, Optional
from app.db.database import db
from app.services.document_ai import DocumentAIService
from app.schemas import DocumentProcessRequest
from app.core.queue import JobQueue

class DocumentWorker:
    """
    Production Asynchronous Worker for Document Ingestion, Semantic Chunking,
    and Persistent Knowledge Storage with Redis and SQL JobQueue.
    """
    _queue = JobQueue("document_processing")
    _running: bool = False

    @classmethod
    async def enqueue_job(cls, job_payload: Dict[str, Any]) -> str:
        """Enqueues a document processing job and returns its tracking job ID."""
        company_id = job_payload.get("companyId") or job_payload.get("company_id")
        if not company_id:
            raise ValueError("Document job enqueue failed: 'companyId' is required.")

        job_id = await cls._queue.enqueue(
            job_type="process_document",
            company_id=company_id,
            payload=job_payload,
            prefix="docjob_"
        )
        return job_id

    @classmethod
    def get_job(cls, job_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve the live status and result of a document processing job."""
        st = cls._queue.get_job_status(job_id)
        if st:
            st["jobId"] = st.get("id", job_id)
        return st

    @staticmethod
    async def process_document_job(job_payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes document ingestion, chunking, and durable persistence.
        Ensures backing knowledge source exists so chunks are searchable.
        """
        company_id = job_payload.get("companyId") or job_payload.get("company_id")
        if not company_id:
            raise ValueError("Document processing failed: 'companyId' is required and cannot be omitted.")
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
        Background queue runner that processes pending jobs via Redis and SQL store.
        """
        cls._running = True
        iterations = 0
        worker_id = f"doc_worker_{uuid.uuid4().hex[:6]}"
        while cls._running:
            if max_iterations is not None and iterations >= max_iterations:
                break
            claimed = await cls._queue.claim_job(worker_id=worker_id, poll_timeout=poll_interval)
            if not claimed:
                iterations += 1
                await asyncio.sleep(poll_interval)
                continue

            try:
                result = await cls.process_document_job(claimed["payload"])
                await cls._queue.complete_job(claimed["id"], result)
            except Exception as exc:
                await cls._queue.fail_job(claimed["id"], str(exc), retry=True)
            finally:
                iterations += 1

    @classmethod
    def stop_worker(cls):
        """Signals the background loop to stop gracefully."""
        cls._running = False
