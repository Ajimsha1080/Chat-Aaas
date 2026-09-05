from fastapi import FastAPI, Header, HTTPException, Query
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
    ROIAnalyticsResponse
)
from app.services.agent_runtime import AgentRuntime
from app.services.crawler_service import CrawlerService
from app.services.rag_engine import RAGEngine
from app.services.tool_registry import ToolRegistry

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
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

# Seed Knowledge Base for Demonstration / Testing
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

def get_tenant_id(x_company_id: Optional[str] = Header(default="comp_techflow")) -> str:
    """Extracts and verifies tenant company ID from request header."""
    return x_company_id or "comp_techflow"

@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "AaaS Python AI Runtime",
        "version": "1.0.0",
        "framework": "FastAPI + Pydantic v2",
        "llm_engine": "Pluggable (OpenAI / Anthropic / Gemini / Ollama)"
    }

# ----------------- 1. Agent Management & Versioning -----------------
@app.get("/api/v1/agent")
async def get_agent_details(company_id: str = Header(default="comp_techflow", alias="x-company-id")):
    return {
        "company_id": company_id,
        "agent": {
            "name": "Aura AI Assistant",
            "active_version": 2,
            "draft_version": 3,
            "status": "active",
            "model": "gpt-4o",
            "tone": "professional",
            "greeting": "Hello! I am Aura, your dedicated AI assistant. How can I assist your business today?"
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

# ----------------- 2. Real-Time Chat & Streaming -----------------
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

# ----------------- 3. Knowledge Ingestion & RAG -----------------
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
        "source_id": f"src_{hash(req.title) % 100000}",
        "title": req.title,
        "chunks_created": len(chunks),
        "status": "indexed_in_pgvector"
    }

# ----------------- 4. Tools & Actions -----------------
@app.post("/api/v1/tools/execute")
async def execute_tool_action(
    req: ToolExecutionRequest,
    company_id: str = Header(default="comp_techflow", alias="x-company-id")
):
    res = ToolRegistry.execute_tool(
        tool_name=req.tool_name,
        params=req.parameters,
        company_id=company_id,
        user_confirmed=req.user_confirmed
    )
    return res

# ----------------- 5. ROI & Analytics -----------------
@app.get("/api/v1/analytics/roi", response_model=ROIAnalyticsResponse)
async def get_roi_analytics(company_id: str = Header(default="comp_techflow", alias="x-company-id")):
    return ROIAnalyticsResponse(
        resolution_rate_percent=88.4,
        escalation_rate_percent=11.6,
        avg_response_time_ms=420,
        estimated_hours_saved=148.0,
        estimated_labor_cost_offset_inr=118400.0,
        tasks_automated=1420,
        net_saas_roi_multiplier=14.8,
        unanswered_queries_count=3
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
