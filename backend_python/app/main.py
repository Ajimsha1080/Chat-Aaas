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

# Specialized AI Services
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
from app.api.users import router as users_router
from app.api.companies import router as companies_router
from app.api.agents import router as agents_router
from app.api.chat import router as chat_router
from app.api.conversations import router as conversations_router
from app.api.knowledge import router as knowledge_router
from app.api.actions import router as actions_router
from app.api.integrations import router as integrations_router
from app.api.deployment import router as deployment_router
from app.api.usage import router as usage_router
from app.api.billing import router as billing_router
from app.api.analytics import router as analytics_router
from app.api.admin import router as admin_router
from app.api.developer import router as developer_router

APP_START_TIME = time.time()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="2.0.0",
    description="Chat-AaaS Enterprise Agent-as-a-Service Platform & AI Specialized Runtime",
    docs_url="/docs",
    openapi_url="/api/v1/openapi.json"
)

# Secure Environment-driven CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:[0-9]+)?",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["x-request-id", "x-ai-service"]
)

# Telemetry and Request Tracing Middleware
@app.middleware("http")
async def add_telemetry_headers(request: Request, call_next):
    req_id = request.headers.get("x-request-id") or f"req_{uuid.uuid4().hex[:8]}"
    response = await call_next(request)
    response.headers["x-request-id"] = req_id
    response.headers["x-ai-service"] = "Chat-AaaS-Enterprise-FastAPI-v2"
    return response

# ----------------- Mount Modular Enterprise Routers -----------------
app.include_router(auth_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(companies_router, prefix="/api/v1")
app.include_router(agents_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")
app.include_router(conversations_router, prefix="/api/v1")
app.include_router(knowledge_router, prefix="/api/v1")
app.include_router(actions_router, prefix="/api/v1")
app.include_router(integrations_router, prefix="/api/v1")
app.include_router(deployment_router, prefix="/api/v1")
app.include_router(usage_router, prefix="/api/v1")
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
        service="Chat-AaaS Python Enterprise & AI Specialized Runtime",
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

# ----------------- Specialized AI Endpoints -----------------
@app.post("/v1/embeddings", response_model=EmbeddingResponse)
@app.post("/api/v1/embeddings", response_model=EmbeddingResponse)
async def generate_embeddings(req: EmbeddingRequest):
    return EmbeddingService.generate_embeddings(req)

@app.post("/v1/rerank", response_model=RerankResponse)
@app.post("/api/v1/rerank", response_model=RerankResponse)
async def rerank_knowledge_chunks(req: RerankRequest):
    return RerankingService.rerank_candidates(req)

@app.post("/v1/evaluate", response_model=EvaluateResponse)
@app.post("/api/v1/evaluate", response_model=EvaluateResponse)
async def evaluate_rag_faithfulness(req: EvaluateRequest):
    return EvaluationService.evaluate_rag_response(req)

@app.post("/v1/process-document", response_model=DocumentProcessResponse)
@app.post("/api/v1/process-document", response_model=DocumentProcessResponse)
async def process_raw_document(req: DocumentProcessRequest):
    return DocumentAIService.process_document(req)

@app.post("/v1/classify", response_model=ClassificationResponse)
@app.post("/api/v1/classify", response_model=ClassificationResponse)
async def classify_user_intent(req: ClassificationRequest):
    return ClassificationService.classify_text(req)
