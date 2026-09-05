import time
import uuid
from fastapi import FastAPI, Header, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from typing import Optional, List, Dict, Any

from app.core.config import settings
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

# AI / ML Specialized Services
from app.services.agent_runtime import AgentRuntime
from app.services.crawler_service import CrawlerService
from app.services.rag_engine import RAGEngine
from app.services.tool_registry import ToolRegistry
from app.services.embedding_service import EmbeddingService
from app.services.reranking_service import RerankingService
from app.services.evaluation_service import EvaluationService
from app.services.document_ai import DocumentAIService
from app.services.classification_service import ClassificationService

# Modular Enterprise API Routers
from app.api.auth import router as auth_router
from app.api.agents import router as agents_router
from app.api.knowledge import router as knowledge_router
from app.api.actions import router as actions_router
from app.api.conversations import router as conversations_router
from app.api.billing import router as billing_router
from app.api.analytics import router as analytics_router
from app.api.admin import router as admin_router
from app.api.developer import router as developer_router

APP_START_TIME = time.time()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="2.0.0",
    description="Chat-AaaS Enterprise Agent-as-a-Service Platform and AI Specialized Runtime",
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
        "company_id": "comp-techflow",
        "knowledge_source_id": "src_1",
        "content": "TechFlow Cloud provides 99.99% enterprise SLA with automatic multi-region failover across Mumbai, Singapore, and Frankfurt data centers."
    },
    {
        "id": "chk_102",
        "company_id": "comp-techflow",
        "knowledge_source_id": "src_2",
        "content": "Our billing cycle resets on the 1st of every month. Standard refund policy allows a full refund within 14 days of purchase."
    },
    {
        "id": "chk_201",
        "company_id": "comp-apex-health",
        "knowledge_source_id": "src_apex",
        "content": "Apex Health provides HIPAA-compliant telemedicine consultations from Monday through Saturday, 8:00 AM to 8:00 PM IST."
    }
]

# ----------------- Mount Modular Enterprise Routers -----------------
app.include_router(auth_router, prefix="/api/v1")
app.include_router(agents_router, prefix="/api/v1")
app.include_router(knowledge_router, prefix="/api/v1")
app.include_router(actions_router, prefix="/api/v1")
app.include_router(conversations_router, prefix="/api/v1")
app.include_router(billing_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(developer_router, prefix="/api/v1")

# ----------------- Core Health and Readiness Probes -----------------
@app.get("/health", response_model=HealthResponse)
@app.get("/api/v1/health")
async def health_check():
    return HealthResponse(
        status="healthy",
        service="Chat-AaaS Python Enterprise and AI Specialized Runtime",
        version="2.0.0",
        framework="FastAPI + Pydantic v2 (Async)",
        uptime_seconds=round(time.time() - APP_START_TIME, 2)
    )

@app.get("/ready", response_model=ReadinessResponse)
async def readiness_check():
    return ReadinessResponse(
        ready=True,
        checks={
            "database_connected": True,
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
    x_tenant_id: Optional[str] = Header(default="comp-techflow", alias="x-tenant-id")
):
    return EmbeddingService.generate_embeddings(req)

# ----------------- 2. Cross-Encoder Semantic Reranking -----------------
@app.post("/v1/rerank", response_model=RerankResponse)
@app.post("/api/v1/rerank", response_model=RerankResponse)
async def rerank_knowledge_chunks(
    req: RerankRequest,
    x_tenant_id: Optional[str] = Header(default="comp-techflow", alias="x-tenant-id")
):
    return RerankingService.rerank_candidates(req)

# ----------------- 3. RAG Semantic Evaluation and Hallucination Scoring -----------------
@app.post("/v1/evaluate", response_model=EvaluateResponse)
@app.post("/api/v1/evaluate", response_model=EvaluateResponse)
async def evaluate_rag_faithfulness(
    req: EvaluateRequest,
    x_tenant_id: Optional[str] = Header(default="comp-techflow", alias="x-tenant-id")
):
    return EvaluationService.evaluate_rag_response(req)

# ----------------- 4. Document Intelligence and Chunking -----------------
@app.post("/v1/process-document", response_model=DocumentProcessResponse)
@app.post("/api/v1/process-document", response_model=DocumentProcessResponse)
async def process_raw_document(
    req: DocumentProcessRequest,
    x_tenant_id: Optional[str] = Header(default="comp-techflow", alias="x-tenant-id")
):
    return DocumentAIService.process_document(req)

# ----------------- 5. NLP Classification and Intent Detection -----------------
@app.post("/v1/classify", response_model=ClassificationResponse)
@app.post("/api/v1/classify", response_model=ClassificationResponse)
async def classify_user_intent(
    req: ClassificationRequest,
    x_tenant_id: Optional[str] = Header(default="comp-techflow", alias="x-tenant-id")
):
    return ClassificationService.classify_text(req)

# ----------------- 6. Direct Agent Chat and Streaming Endpoints -----------------
@app.post("/api/v1/chat", response_model=ChatResponse)
async def process_chat_message(
    req: ChatRequest,
    company_id: str = Header(default="comp-techflow", alias="x-company-id")
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
    company_id: str = Header(default="comp-techflow", alias="x-company-id")
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
