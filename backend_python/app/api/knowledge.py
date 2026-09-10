import time
import uuid
from fastapi import APIRouter, HTTPException, Depends, status, Query
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from app.db.database import db
from app.services.crawler_service import CrawlerService
from app.services.rag_engine import RAGEngine
from app.services.document_ai import DocumentAIService
from app.schemas import DocumentProcessRequest
from app.core.tenant import TenantContext, get_tenant_context
from app.core.permissions import has_permission

router = APIRouter(prefix="/knowledge", tags=["Enterprise Knowledge System"])

# ================= REQUEST / RESPONSE SCHEMAS ================= #

class CreateCollectionRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    icon: Optional[str] = "Folder"
    color: Optional[str] = "indigo"

class IngestFileRequest(BaseModel):
    title: str
    content: str
    fileName: Optional[str] = None
    docType: Optional[str] = "pdf"
    collectionId: Optional[str] = None
    category: Optional[str] = "General"

class IngestWebsiteRequest(BaseModel):
    url: str
    collectionId: Optional[str] = None
    category: Optional[str] = "Website"
    maxPages: Optional[int] = 20

class IngestFaqRequest(BaseModel):
    question: str = Field(..., min_length=2)
    answer: str = Field(..., min_length=2)
    collectionId: Optional[str] = None
    category: Optional[str] = "FAQ"

class ConvertGapToFaqRequest(BaseModel):
    answer: str = Field(..., min_length=2)
    collectionId: Optional[str] = None
    category: Optional[str] = "FAQ"

class KnowledgeFeedbackRequest(BaseModel):
    conversationId: Optional[str] = None
    messageId: Optional[str] = None
    rating: str = Field(..., pattern="^(helpful|not_helpful)$")
    feedbackText: Optional[str] = None
    retrievedChunkIds: Optional[List[str]] = []

class TestRagRequest(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: Optional[int] = 3

class SemanticTestRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5


# ================= 1. SOURCES MANAGEMENT ================= #

@router.get("")
def list_knowledge_sources(
    collection_id: Optional[str] = Query(None),
    source_type: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    ctx: TenantContext = Depends(get_tenant_context)
):
    """Lists knowledge sources with multi-tenant filtering, search, and collection scoping."""
    sources = db.get_knowledge_sources_for_tenant(
        company_id=ctx.company_id,
        collection_id=collection_id,
        source_type=source_type,
        status=status_filter,
        search=search
    )
    chunks = db.get_document_chunks_for_tenant(ctx.company_id)
    return {
        "status": 200,
        "data": {
            "sources": sources,
            "totalSources": len(sources),
            "totalChunks": len(chunks),
            "chunks": chunks
        }
    }

@router.get("/sources/{source_id}")
def get_knowledge_source_details(source_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    """Retrieves specific knowledge source details and its parsed chunks."""
    source = db.knowledge_sources.get(source_id)
    if not source or source.get("companyId") != ctx.company_id:
        raise HTTPException(status_code=404, detail="Knowledge source not found.")
    
    source_chunks = [c for c in db.document_chunks.values() if c.get("knowledgeSourceId") == source_id and c.get("companyId") == ctx.company_id]
    return {
        "status": 200,
        "data": {
            "source": source,
            "chunks": source_chunks,
            "chunkCount": len(source_chunks)
        }
    }

@router.delete("/sources/{source_id}")
def delete_knowledge_source(source_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    """Permanently removes a knowledge source and all its associated vector chunks."""
    if not has_permission(ctx.role, "knowledge:delete"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions to delete knowledge.")

    source = db.knowledge_sources.get(source_id)
    if not source or source.get("companyId") != ctx.company_id:
        raise HTTPException(status_code=404, detail="Knowledge source not found.")

    # Remove source
    del db.knowledge_sources[source_id]

    # Cascade delete chunks
    chunk_ids_to_del = [cid for cid, c in db.document_chunks.items() if c.get("knowledgeSourceId") == source_id and c.get("companyId") == ctx.company_id]
    for cid in chunk_ids_to_del:
        del db.document_chunks[cid]

    return {
        "status": 200,
        "data": {
            "message": f"Successfully deleted knowledge source '{source.get('title')}' and {len(chunk_ids_to_del)} vector chunks."
        }
    }


# ================= 2. DOCUMENT / FILE INGESTION ================= #

@router.post("/files", status_code=status.HTTP_201_CREATED)
@router.post("/upload", status_code=status.HTTP_201_CREATED)
@router.post("/ingest", status_code=status.HTTP_201_CREATED)
def ingest_file_document(req: IngestFileRequest, ctx: TenantContext = Depends(get_tenant_context)):
    """Ingests, sanitizes, and chunks multi-format documents (.pdf, .docx, .txt, .md, .csv, .json)."""
    if not has_permission(ctx.role, "knowledge:write"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient role permissions to ingest knowledge.")

    if not req.content or not req.content.strip():
        raise HTTPException(status_code=400, detail="Document content cannot be empty.")

    # 1. Semantic Chunking
    doc_req = DocumentProcessRequest(
        title=req.title,
        raw_text=req.content,
        doc_type=req.docType or "pdf",
        chunk_size=500
    )
    res = DocumentAIService.process_document(doc_req)

    # 2. Create Knowledge Source Record
    src_id = f"ks-{ctx.company_id}-{uuid.uuid4().hex[:8]}"
    new_source = {
        "id": src_id,
        "companyId": ctx.company_id,
        "collectionId": req.collectionId or "col-tf-1",
        "title": req.title,
        "sourceType": "file",
        "fileName": req.fileName or req.title,
        "fileSizeBytes": len(req.content.encode('utf-8')),
        "mimeType": f"application/{req.docType or 'pdf'}",
        "version": 1,
        "category": req.category or "General",
        "status": "ready",
        "chunkCount": len(res.chunks),
        "totalTokens": res.total_tokens,
        "lastSyncedAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
    }
    db.knowledge_sources[src_id] = new_source

    # 3. Store Chunks
    created_chunk_ids = []
    for c in res.chunks:
        chunk_id = f"chk-{ctx.company_id}-{uuid.uuid4().hex[:8]}"
        new_chunk = {
            "id": chunk_id,
            "knowledgeSourceId": src_id,
            "companyId": ctx.company_id,
            "collectionId": req.collectionId,
            "chunkIndex": c.chunk_index,
            "content": c.content,
            "tokenCount": c.token_count,
            "sectionHeader": c.section_header,
            "metadata": {
                "title": req.title,
                "fileName": req.fileName or req.title,
                "category": req.category,
                "docType": req.docType
            }
        }
        db.document_chunks[chunk_id] = new_chunk
        created_chunk_ids.append(chunk_id)

    return {
        "status": 201,
        "data": {
            "success": True,
            "sourceId": src_id,
            "documentTitle": req.title,
            "fileName": req.fileName,
            "chunksCreated": len(created_chunk_ids),
            "totalTokens": res.total_tokens,
            "status": "indexed",
            "message": f"Successfully parsed and indexed {len(created_chunk_ids)} semantic chunks for '{req.title}'."
        }
    }


# ================= 3. WEBSITE & URL CRAWL ================= #

@router.post("/websites", status_code=status.HTTP_201_CREATED)
@router.post("/crawl", status_code=status.HTTP_201_CREATED)
async def crawl_and_ingest_website(req: IngestWebsiteRequest, ctx: TenantContext = Depends(get_tenant_context)):
    """Crawls website URL with strict SSRF defense, depth limits, and HTML parsing."""
    if not has_permission(ctx.role, "knowledge:write"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient role permissions.")

    safe, reason = CrawlerService.validate_url_safety(req.url)
    if not safe:
        raise HTTPException(status_code=400, detail=f"SSRF Safety Validation Rejected: {reason}")

    res = await CrawlerService.fetch_and_parse(req.url)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Failed to fetch webpage."))

    cleaned_content = res.get("content", "")
    src_id = f"ks-{ctx.company_id}-web-{uuid.uuid4().hex[:6]}"
    title = res.get("title") or req.url

    # Process via DocumentAIService for multi-chunk semantic parsing
    doc_req = DocumentProcessRequest(
        title=title,
        raw_text=cleaned_content,
        doc_type="txt",
        chunk_size=500
    )
    doc_res = DocumentAIService.process_document(doc_req)
    chunks_to_save = doc_res.chunks if doc_res.chunks else []

    # Create source
    new_source = {
        "id": src_id,
        "companyId": ctx.company_id,
        "collectionId": req.collectionId or "col-tf-1",
        "title": title,
        "sourceType": "website",
        "sourceUrl": req.url,
        "category": req.category or "Website",
        "status": "ready",
        "chunkCount": max(1, len(chunks_to_save)),
        "totalTokens": doc_res.total_tokens or (len(cleaned_content) // 4),
        "lastSyncedAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
    }
    db.knowledge_sources[src_id] = new_source

    created_chunk_ids = []
    if chunks_to_save:
        for c in chunks_to_save:
            chk_id = f"chk-{ctx.company_id}-{uuid.uuid4().hex[:8]}"
            chk = {
                "id": chk_id,
                "knowledgeSourceId": src_id,
                "companyId": ctx.company_id,
                "collectionId": req.collectionId,
                "chunkIndex": c.chunk_index,
                "content": c.content,
                "tokenCount": c.token_count,
                "sectionHeader": c.section_header or title,
                "metadata": {"title": title, "category": req.category, "url": req.url}
            }
            db.document_chunks[chk_id] = chk
            created_chunk_ids.append(chk_id)
    else:
        chk_id = f"chk-{ctx.company_id}-{uuid.uuid4().hex[:8]}"
        chk = {
            "id": chk_id,
            "knowledgeSourceId": src_id,
            "companyId": ctx.company_id,
            "collectionId": req.collectionId,
            "chunkIndex": 0,
            "content": cleaned_content[:1200],
            "tokenCount": max(1, len(cleaned_content[:1200]) // 4),
            "sectionHeader": title,
            "metadata": {"title": title, "category": req.category, "url": req.url}
        }
        db.document_chunks[chk_id] = chk
        created_chunk_ids.append(chk_id)

    return {
        "status": 201,
        "data": {
            "success": True,
            "source": new_source,
            "chunksCreated": len(created_chunk_ids),
            "message": f"Successfully crawled and indexed {len(created_chunk_ids)} semantic chunks from '{req.url}'."
        }
    }


# ================= 4. FAQ / Q&A INGESTION ================= #

@router.post("/faq", status_code=status.HTTP_201_CREATED)
@router.post("/faqs", status_code=status.HTTP_201_CREATED)
def create_faq_knowledge(req: IngestFaqRequest, ctx: TenantContext = Depends(get_tenant_context)):
    """Creates a structured FAQ knowledge entry and indexes it immediately."""
    if not has_permission(ctx.role, "knowledge:write"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions.")

    src_id = f"ks-{ctx.company_id}-faq-{uuid.uuid4().hex[:6]}"
    content = f"Question: {req.question}\n\nAnswer: {req.answer}"

    new_source = {
        "id": src_id,
        "companyId": ctx.company_id,
        "collectionId": req.collectionId or "col-tf-1",
        "title": req.question,
        "sourceType": "faq",
        "category": req.category or "FAQ",
        "status": "ready",
        "chunkCount": 1,
        "totalTokens": len(content) // 4,
        "lastSyncedAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
    }
    db.knowledge_sources[src_id] = new_source

    chunk_id = f"chk-{ctx.company_id}-{uuid.uuid4().hex[:8]}"
    new_chunk = {
        "id": chunk_id,
        "knowledgeSourceId": src_id,
        "companyId": ctx.company_id,
        "collectionId": req.collectionId,
        "chunkIndex": 0,
        "content": content,
        "tokenCount": max(1, len(content) // 4),
        "sectionHeader": "FAQ",
        "metadata": {"title": req.question, "category": req.category, "faq": True}
    }
    db.document_chunks[chunk_id] = new_chunk

    return {
        "status": 201,
        "data": {
            "source": new_source,
            "chunk": new_chunk,
            "message": "FAQ saved and indexed into knowledge base."
        }
    }


# ================= 5. COLLECTIONS ================= #

@router.get("/collections")
def list_collections(ctx: TenantContext = Depends(get_tenant_context)):
    """Lists knowledge collections belonging to the current tenant."""
    collections = db.get_collections_for_tenant(ctx.company_id)
    return {"status": 200, "data": {"collections": collections, "total": len(collections)}}

@router.post("/collections", status_code=status.HTTP_201_CREATED)
def create_collection(req: CreateCollectionRequest, ctx: TenantContext = Depends(get_tenant_context)):
    """Creates a new organized knowledge collection."""
    if not has_permission(ctx.role, "knowledge:write"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions.")

    col_id = f"col-{ctx.company_id}-{uuid.uuid4().hex[:6]}"
    new_col = {
        "id": col_id,
        "companyId": ctx.company_id,
        "name": req.name,
        "description": req.description,
        "icon": req.icon or "Folder",
        "color": req.color or "indigo",
        "sourceCount": 0,
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
    }
    db.knowledge_collections[col_id] = new_col
    return {"status": 201, "data": new_col}

@router.delete("/collections/{collection_id}")
def delete_collection(collection_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    """Deletes a collection and detaches its associated sources."""
    if not has_permission(ctx.role, "knowledge:delete"):
        raise HTTPException(status_code=403, detail="Forbidden.")

    col = db.knowledge_collections.get(collection_id)
    if not col or col.get("companyId") != ctx.company_id:
        raise HTTPException(status_code=404, detail="Collection not found.")

    del db.knowledge_collections[collection_id]
    return {"status": 200, "data": {"message": f"Collection '{col.get('name')}' deleted."}}


# ================= 6. KNOWLEDGE GAPS & FEEDBACK ================= #

@router.get("/gaps")
def list_knowledge_gaps(ctx: TenantContext = Depends(get_tenant_context)):
    """Lists unanswered questions that require additional business knowledge."""
    gaps = db.get_knowledge_gaps_for_tenant(ctx.company_id)
    return {"status": 200, "data": {"gaps": gaps, "total": len(gaps)}}

@router.post("/gaps/{gap_id}/convert-faq", status_code=status.HTTP_201_CREATED)
def convert_gap_to_faq(gap_id: str, req: ConvertGapToFaqRequest, ctx: TenantContext = Depends(get_tenant_context)):
    """Converts an identified knowledge gap into an indexed FAQ entry."""
    gap = db.knowledge_gaps.get(gap_id)
    if not gap or gap.get("companyId") != ctx.company_id:
        raise HTTPException(status_code=404, detail="Knowledge gap not found.")

    # Create FAQ
    faq_req = IngestFaqRequest(
        question=gap.get("query", "Customer Question"),
        answer=req.answer,
        collectionId=req.collectionId,
        category=req.category or gap.get("suggestedCategory", "FAQ")
    )
    res = create_faq_knowledge(faq_req, ctx)

    # Mark gap resolved
    gap["status"] = "converted_to_faq"

    return {
        "status": 201,
        "data": {
            "message": "Knowledge gap resolved and converted to live FAQ.",
            "faq": res["data"]
        }
    }

@router.post("/feedback", status_code=status.HTTP_201_CREATED)
def record_knowledge_feedback(req: KnowledgeFeedbackRequest, ctx: TenantContext = Depends(get_tenant_context)):
    """Records customer or staff feedback on AI answers."""
    entry = {
        "id": f"fb-{uuid.uuid4().hex[:8]}",
        "companyId": ctx.company_id,
        "conversationId": req.conversationId,
        "messageId": req.messageId,
        "rating": req.rating,
        "feedbackText": req.feedbackText,
        "retrievedChunkIds": req.retrievedChunkIds or [],
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
    }
    db.knowledge_feedback.append(entry)
    return {"status": 201, "data": {"success": True, "feedbackId": entry["id"]}}


# ================= 7. RAG SEARCH, TEST & HEALTH ================= #

@router.post("/test-rag")
def test_rag_knowledge(req: TestRagRequest, ctx: TenantContext = Depends(get_tenant_context)):
    """Executes a real grounded RAG query returning verified source citations and anti-hallucination validation."""
    chunks = db.get_document_chunks_for_tenant(ctx.company_id)
    res = RAGEngine.execute_rag_query(req.query, ctx.company_id, chunks, top_k=req.top_k or 3)

    # If answer was ungrounded, record a knowledge gap automatically
    if res.get("needsGapRecorded"):
        gap_id = f"gap-{ctx.company_id}-{uuid.uuid4().hex[:6]}"
        db.knowledge_gaps[gap_id] = {
            "id": gap_id,
            "companyId": ctx.company_id,
            "query": req.query,
            "occurrences": 1,
            "lastAskedAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
            "status": "unresolved",
            "suggestedCategory": "General",
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
        }

    return {"status": 200, "data": res}

@router.post("/semantic-test")
def semantic_search_test(req: SemanticTestRequest, ctx: TenantContext = Depends(get_tenant_context)):
    """Raw semantic chunk search endpoint for developer telemetry."""
    chunks = db.get_document_chunks_for_tenant(ctx.company_id)
    results = RAGEngine.search_chunks(req.query, ctx.company_id, chunks, top_k=req.top_k or 5, threshold=0.1)
    return {"status": 200, "data": {"query": req.query, "results": results}}

@router.get("/health")
def get_knowledge_health(ctx: TenantContext = Depends(get_tenant_context)):
    """Returns dynamic knowledge health score and operational metrics."""
    health_data = db.get_knowledge_health_for_tenant(ctx.company_id)
    return {"status": 200, "data": health_data}
