from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from app.db.database import db
from app.services.crawler_service import CrawlerService
from app.services.rag_engine import RAGEngine
from app.core.tenant import TenantContext, get_tenant_context
from app.core.permissions import has_permission

router = APIRouter(prefix="/knowledge", tags=["Knowledge Base"])

class CrawlUrlRequest(BaseModel):
    url: str
    category: Optional[str] = "General"

class SemanticTestRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5

@router.get("")
def list_knowledge(ctx: TenantContext = Depends(get_tenant_context)):
    chunks = db.get_document_chunks_for_tenant(ctx.company_id)
    return {"status": 200, "data": {"chunks": chunks, "total": len(chunks)}}

@router.post("/crawl", status_code=status.HTTP_201_CREATED)
async def crawl_url(req: CrawlUrlRequest, ctx: TenantContext = Depends(get_tenant_context)):
    if not has_permission(ctx.role, "knowledge:write"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient role permissions to ingest knowledge.")

    safe, reason = CrawlerService.validate_url_safety(req.url)
    if not safe:
        raise HTTPException(status_code=400, detail=f"SSRF Safety Validation Rejected: {reason}")

    res = await CrawlerService.fetch_and_parse(req.url)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Failed to fetch webpage."))

    # Ingest chunks into DB
    chunk_id = f"chk-{ctx.company_id}-{len(db.document_chunks) + 1}"
    new_chunk = {
        "id": chunk_id,
        "knowledgeSourceId": f"ks-{ctx.company_id}-url",
        "companyId": ctx.company_id,
        "chunkIndex": 0,
        "content": res["content"][:800],
        "tokenCount": len(res["content"][:800]) // 4,
        "metadata": {"title": res.get("title", req.url), "category": req.category, "url": req.url}
    }
    db.document_chunks[chunk_id] = new_chunk
    return {"status": 201, "data": {"message": "Knowledge indexed successfully.", "chunk": new_chunk}}

@router.post("/semantic-test")
def semantic_search_test(req: SemanticTestRequest, ctx: TenantContext = Depends(get_tenant_context)):
    chunks = db.get_document_chunks_for_tenant(ctx.company_id)
    results = RAGEngine.search_chunks(req.query, ctx.company_id, chunks, top_k=req.top_k or 5, threshold=0.1)
    return {"status": 200, "data": {"query": req.query, "results": results}}
