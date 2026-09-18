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
    async def recrawl_stale_website_sources(cls, force: bool = False, max_age_seconds: int = 86400) -> Dict[str, Any]:
        """
        Scans all active website knowledge sources, recrawls their live URLs,
        diffs content hashes, and conditionally refreshes chunks and embeddings
        only when content has actually changed.
        """
        import hashlib
        from app.services.crawler_service import CrawlerService
        from app.services.embedding_service import EmbeddingService

        now = time.time()
        checked = 0
        updated = 0
        unchanged = 0
        errors = []

        website_sources = [
            s for s in list(db.knowledge_sources.values())
            if s.get("sourceType") in ("website", "url") and s.get("lifecycleState") == "active" and s.get("sourceUrl")
        ]

        for source in website_sources:
            source_id = source["id"]
            url = source.get("sourceUrl", "")
            if not url:
                continue

            # Check if source is stale based on lastIndexedAt or retentionDays
            last_indexed_str = source.get("lastIndexedAt", "")
            last_indexed_time = 0.0
            if last_indexed_str:
                try:
                    # Parse ISO format or timestamp
                    import datetime
                    dt = datetime.datetime.fromisoformat(last_indexed_str.replace("Z", "+00:00"))
                    last_indexed_time = dt.timestamp()
                except Exception:
                    last_indexed_time = 0.0

            age_seconds = now - last_indexed_time
            retention_days = source.get("retentionDays", 30)
            threshold_seconds = max_age_seconds if not retention_days else min(max_age_seconds, retention_days * 86400)

            if not force and age_seconds < threshold_seconds:
                continue

            checked += 1
            try:
                crawl_res = await CrawlerService.crawl_website_multi_page(url, max_pages=20, max_depth=2, respect_robots=True)
                if not crawl_res.get("success"):
                    errors.append({"sourceId": source_id, "url": url, "error": crawl_res.get("error")})
                    continue

                new_content = crawl_res.get("content", "").strip()
                new_hash = crawl_res.get("contentHash") or hashlib.sha256(new_content.encode("utf-8")).hexdigest()
                existing_hash = source.get("contentHash") or hashlib.sha256((source.get("content") or "").encode("utf-8")).hexdigest()

                # Content Diffing: Avoid needless re-embedding if content is unchanged
                if new_hash == existing_hash and not force:
                    source["lastCheckedAt"] = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
                    source["isStale"] = False
                    unchanged += 1
                    continue

                # Content changed: Chunk and re-embed
                company_id = source.get("companyId")
                title = crawl_res.get("title") or source.get("title")
                doc_req = DocumentProcessRequest(
                    title=title,
                    raw_text=new_content,
                    doc_type="website",
                    chunk_size=500,
                    chunk_overlap=50
                )
                doc_res = DocumentAIService.process_document(doc_req)

                # Remove old chunks
                old_chk_ids = [cid for cid, c in db.document_chunks.items() if (c.get("knowledgeSourceId") == source_id or c.get("knowledge_source_id") == source_id)]
                for cid in old_chk_ids:
                    del db.document_chunks[cid]

                created_chunk_ids = []
                for c in doc_res.chunks:
                    chk_id = f"chk-{company_id}-{uuid.uuid4().hex[:8]}"
                    chk_emb = EmbeddingService.compute_dense_vector(c.content, dimensions=1536, normalize=True)
                    chk = {
                        "id": chk_id,
                        "knowledgeSourceId": source_id,
                        "companyId": company_id,
                        "collectionId": source.get("collectionId"),
                        "chunkIndex": c.chunk_index,
                        "content": c.content,
                        "tokenCount": c.token_count,
                        "embedding": chk_emb,
                        "sectionHeader": c.section_header or title,
                        "metadata": {"title": title, "category": source.get("category"), "url": url}
                    }
                    db.document_chunks[chk_id] = chk
                    created_chunk_ids.append(chk_id)

                source["content"] = new_content
                source["contentHash"] = new_hash
                source["chunkCount"] = len(created_chunk_ids)
                source["totalChunks"] = len(created_chunk_ids)
                source["totalTokens"] = doc_res.total_tokens
                source["lastIndexedAt"] = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
                source["lastCheckedAt"] = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
                source["isStale"] = False
                source["crawlMetadata"] = {
                    "pagesCrawled": crawl_res.get("pagesCrawled", 1),
                    "pagesSkipped": crawl_res.get("pagesSkipped", 0),
                    "pagesFailed": crawl_res.get("pagesFailed", 0),
                    "crawledUrls": crawl_res.get("crawledUrls", [url]),
                    "contentHash": new_hash,
                    "lastCheckedAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
                }
                updated += 1
            except Exception as e:
                errors.append({"sourceId": source_id, "url": url, "error": str(e)})

        db.save_state()
        return {
            "checked": checked,
            "updated": updated,
            "unchanged": unchanged,
            "errors": errors
        }

    @classmethod
    def stop_worker(cls):
        """Signals the background loop to stop gracefully."""
        cls._running = False

