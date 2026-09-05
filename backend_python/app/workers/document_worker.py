import asyncio
import time
from typing import Dict, Any
from app.db.database import db
from app.services.document_ai import DocumentAIService
from app.schemas import DocumentProcessRequest

class DocumentWorker:
    """
    Asynchronous Worker for Long-Running Document Processing & Embedding Generation
    """
    @staticmethod
    async def process_document_job(job_payload: Dict[str, Any]) -> Dict[str, Any]:
        company_id = job_payload.get("companyId", "comp-techflow")
        title = job_payload.get("title", "Untitled Document")
        raw_text = job_payload.get("rawText", "")
        doc_type = job_payload.get("docType", "pdf")

        # 1. Semantic Chunking
        req = DocumentProcessRequest(
            title=title,
            raw_text=raw_text,
            doc_type=doc_type,
            chunk_size=job_payload.get("chunkSize", 500)
        )
        res = DocumentAIService.process_document(req)

        # 2. Ingest chunks into Tenant Knowledge store
        created_chunk_ids = []
        for c in res.chunks:
            chunk_id = f"chk-{company_id}-{c.chunk_id}"
            db.document_chunks[chunk_id] = {
                "id": chunk_id,
                "knowledgeSourceId": f"ks-{company_id}-{int(time.time())}",
                "companyId": company_id,
                "chunkIndex": c.chunk_index,
                "content": c.content,
                "tokenCount": c.token_count,
                "metadata": {"title": title, "category": job_payload.get("category", "General")}
            }
            created_chunk_ids.append(chunk_id)

        return {
            "status": "completed",
            "totalChunks": len(created_chunk_ids),
            "chunkIds": created_chunk_ids
        }
