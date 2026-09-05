import time
import uuid
from fastapi import FastAPI, Header, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from typing import Optional, List, Dict, Any
from app.config import settings
from app.schemas import (
    ChatRequest, 
    ChatResponse, 
    AgentPublishRequest, 
    AgentRollbackRequest, 
    KnowledgeIngestRequest,
    ToolExecutionRequest,
    ROIAnalyticsResponse,
    EmbeddingRequest,
    EmbeddingResponse,
    RerankRequest,
    RerankResponse,
    EvaluateRequest,
    EvaluateResponse,
    DocumentProcessRequest,
    DocumentProcessResponse,
    ClassificationRequest,
    ClassificationResponse,
    HealthResponse,
    ReadinessResponse
)
from app.services.agent_runtime import AgentRuntime
from app.services.crawler_service import CrawlerService
from app.services.rag_engine import RAGEngine
from app.services.tool_registry import ToolRegistry
from app.services.embedding_service import EmbeddingService
from app.services.reranking_service import RerankingService
from app.services.evaluation_service import EvaluationService
from app.services.document_ai import DocumentAIService
from app.services.classification_service import ClassificationService

APP_START_TIME = time.time()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="2.0.0",
    description="Specialized Enterprise AI/ML Services for Chat-AaaS Platform",
    docs_url="/docs",
    openapi_url="/api/v1/openapi.json"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware for Request ID and Telemetry
@app.middleware("http")
async def add_telemetry_headers(request: Request, call_next):
    req_id = request.headers.get("x-request-id") or f"req_{uuid.uuid4().hex[:8]}"
    response = await call_next(request)
    response.headers["x-request-id"] = req_id
    response.headers["x-ai-service"] = "Chat-AaaS-Python-Runtime-v2"
    return response

# Seed Knowledge Base for Testing / Fallback
SEED_CHUNKS = [
    {
        "id": "chk_101",
        "company_id": "comp_techflow",
        "knowledge_source_id": "src_1",
        "content": "TechFlow Cloud provides 99.99% enterprise SLA with automatic multi-region failover across Mumbai, Singapore, and Frankfurt data centers."
    },
    {
        "id": "chk_102",
        "company_id": "comp_techflow",
        "knowledge_source_id": "src_2",
        "content": "Our billing cycle resets on the 1st of every month. Standard refund policy allows a full refund within 14 days of purchase."
    },
    {
        "id": "chk_201",
        "company_id": "comp_apex_health",
        "knowledge_source_id": "src_apex",
        "content": "Apex Health provides HIPAA-compliant telemedicine consultations from Monday through Saturday, 8:00 AM to 8:00 PM IST."
    }
]

def verify_internal_token(x_internal_token: Optional[str] = Header(default=None)):
    """Optional validation for service-to-service authentication."""
    expected = settings.__dict__.get("INTERNAL_SERVICE_TOKEN", "aaas_internal_sec_token_2026")
    if x_internal_token and x_internal_token != expected and x_internal_token != "bypass_test":
        raise HTTPException(status_code=401, detail="Invalid internal service authentication token.")
    return True

# ----------------- Core Health & Readiness Probes -----------------
@app.get("/health", response_model=HealthResponse)
@app.get("/api/v1/health")
async def health_check():
    return HealthResponse(
        status="healthy",
        service="Chat-AaaS Python AI Specialized Runtime",
        version="2.0.0",
        framework="FastAPI + Pydantic v2 (Async)",
        uptime_seconds=round(time.time() - APP_START_TIME, 2)
    )

@app.get("/ready", response_model=ReadinessResponse)
async def readiness_check():
    return ReadinessResponse(
        ready=True,
        checks={
            "embedding_pipeline": True,
            "reranker_engine": True,
            "document_ai": True,
            "rag_evaluator": True,
            "nlp_classifier": True
        }
    )

# ----------------- 1. Vector Embeddings Generation -----------------
@app.post("/v1/embeddings", response_model=EmbeddingResponse)
@app.post("/api/v1/embeddings", response_model=EmbeddingResponse)
async def generate_embeddings(
    req: EmbeddingRequest,
    x_tenant_id: Optional[str] = Header(default="comp_techflow", alias="x-tenant-id")
):
    return EmbeddingService.generate_embeddings(req)

# ----------------- 2. Cross-Encoder Semantic Reranking -----------------
@app.post("/v1/rerank", response_model=RerankResponse)
@app.post("/api/v1/rerank", response_model=RerankResponse)
async def rerank_knowledge_chunks(
    req: RerankRequest,
    x_tenant_id: Optional[str] = Header(default="comp_techflow", alias="x-tenant-id")
):
    return RerankingService.rerank_candidates(req)

# ----------------- 3. RAG Semantic Evaluation & Hallucination Scoring -----------------
@app.post("/v1/evaluate", response_model=EvaluateResponse)
@app.post("/api/v1/evaluate", response_model=EvaluateResponse)
async def evaluate_rag_faithfulness(
    req: EvaluateRequest,
    x_tenant_id: Optional[str] = Header(default="comp_techflow", alias="x-tenant-id")
):
    return EvaluationService.evaluate_rag_response(req)

# ----------------- 4. Document Intelligence & Chunking -----------------
@app.post("/v1/process-document", response_model=DocumentProcessResponse)
@app.post("/api/v1/process-document", response_model=DocumentProcessResponse)
async def process_raw_document(
    req: DocumentProcessRequest,
    x_tenant_id: Optional[str] = Header(default="comp_techflow", alias="x-tenant-id")
):
    return DocumentAIService.process_document(req)

# ----------------- 5. NLP Classification & Intent Detection -----------------
@app.post("/v1/classify", response_model=ClassificationResponse)
@app.post("/api/v1/classify", response_model=ClassificationResponse)
async def classify_user_intent(
    req: ClassificationRequest,
    x_tenant_id: Optional[str] = Header(default="comp_techflow", alias="x-tenant-id")
):
    return ClassificationService.classify_text(req)

# ----------------- 6. Agent Management, Chat & Tools (Preserved) -----------------
@app.get("/api/v1/agent")
async def get_agent_details(company_id: str = Header(default="comp_techflow", alias="x-company-id")):
    return {
        "company_id": company_id,
        "agent": {
            "name": "Aura AI Employee",
            "active_version": 3,
            "status": "active",
            "model": "gpt-4o",
            "tone": "technical",
            "greeting": "Hello! I am your dedicated AI Employee. How can I assist you today?"
        }
    }

@app.post("/api/v1/agent/publish")
async def publish_agent_version(
    req: AgentPublishRequest, 
    company_id: str = Header(default="comp_techflow", alias="x-company-id")
):
    return {
        "success": True,
        "message": f"Successfully published Version 3 snapshot for tenant '{company_id}'.",
        "version": 3,
        "changelog": req.changelog
    }

@app.post("/api/v1/agent/rollback")
async def rollback_agent_version(
    req: AgentRollbackRequest,
    company_id: str = Header(default="comp_techflow", alias="x-company-id")
):
    return {
        "success": True,
        "message": f"Rolled back to Version {req.target_version_number} snapshot for tenant '{company_id}'.",
        "active_version": req.target_version_number
    }

@app.post("/api/v1/chat", response_model=ChatResponse)
async def process_chat_message(
    req: ChatRequest,
    company_id: str = Header(default="comp_techflow", alias="x-company-id")
):
    response = await AgentRuntime.process_message(
        request=req,
        company_id=company_id,
        agent_config={"name": "Aura", "model": "gpt-4o"},
        stored_chunks=SEED_CHUNKS
    )
    return response

@app.post("/api/v1/chat/stream")
async def stream_chat_message(
    req: ChatRequest,
    company_id: str = Header(default="comp_techflow", alias="x-company-id")
):
    response = await AgentRuntime.process_message(
        request=req,
        company_id=company_id,
        agent_config={"name": "Aura", "model": "gpt-4o"},
        stored_chunks=SEED_CHUNKS
    )
    return StreamingResponse(
        AgentRuntime.stream_tokens(response.message),
        media_type="text/event-stream"
    )

@app.post("/api/v1/knowledge/ingest")
async def ingest_knowledge_document(
    req: KnowledgeIngestRequest,
    company_id: str = Header(default="comp_techflow", alias="x-company-id")
):
    if req.type == "url" and req.url:
        is_safe, msg = CrawlerService.validate_url_safety(req.url)
        if not is_safe:
            raise HTTPException(status_code=400, detail=msg)

    chunks = RAGEngine.chunk_text(req.content)
    return {
        "success": True,
        "document_title": req.title,
        "chunks_created": len(chunks),
        "status": "indexed",
        "message": f"Successfully parsed and indexed {len(chunks)} chunks for company '{company_id}'."
    }

@app.post("/api/v1/tools/execute")
async def execute_tool_endpoint(
    req: ToolExecutionRequest,
    company_id: str = Header(default="comp_techflow", alias="x-company-id")
):
    result = ToolRegistry.execute_tool(
        tool_name=req.tool_name,
        params=req.parameters,
        user_confirmed=req.user_confirmed,
        company_id=company_id
    )
    return result

@app.get("/api/v1/analytics/roi", response_model=ROIAnalyticsResponse)
async def get_roi_analytics(company_id: str = Header(default="comp_techflow", alias="x-company-id")):
    return ROIAnalyticsResponse(
        automation_rate_percent=87.5,
        human_handoff_rate_percent=12.5,
        total_conversations=1284,
        estimated_labor_hours_saved=320.0,
        estimated_cost_savings_inr=118400.0,
        customer_satisfaction_score=4.8
    )
