import asyncio
import json
import time
from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.schemas import ChatRequest, ChatResponse
from app.core.tenant import TenantContext, get_tenant_context
from app.services.agent_runtime import AgentRuntime
from app.services.usage_service import UsageService
from app.services.rate_limiter import RateLimiter
from app.db.database import db

router = APIRouter(prefix="/chat", tags=["Agent Chat & Streaming"])

@router.post("", response_model=ChatResponse)
@router.post("/message", response_model=ChatResponse)
async def process_chat_message(
    req: ChatRequest,
    ctx: TenantContext = Depends(get_tenant_context)
):
    """
    Direct synchronous AI agent execution with RAG retrieval, anti-spam rate limiting, and tool gates.
    """
    company_id = ctx.company_id
    
    # 1. Anti-spam & Cost Protection: Max 20 requests/minute per tenant session
    client_key = f"{company_id}_{req.conversation_id or 'anon'}"
    RateLimiter.check_rate_limit(client_key, max_requests=20)

    stored_chunks = [c for c in db.document_chunks.values() if c.get("companyId") == company_id]
    agent = db.get_agent_for_company(company_id) or {"name": "Aura", "model": "gpt-4o-mini"}


    response = await AgentRuntime.process_message(
        request=req,
        company_id=company_id,
        agent_config=agent,
        stored_chunks=stored_chunks
    )

    # Record usage
    UsageService.record_event(company_id, "message", 1, {"conversationId": req.conversation_id})
    UsageService.record_event(company_id, "llm_tokens", response.tokens_used, {"model": agent.get("model", "gpt-4o")})

    return response

@router.post("/stream")
async def stream_chat_tokens(
    req: ChatRequest,
    ctx: TenantContext = Depends(get_tenant_context)
):
    """
    Real SSE Token Streaming endpoint for React chat widgets and web dashboards.
    """
    company_id = ctx.company_id
    
    # 1. Anti-spam & Cost Protection: Max 20 requests/minute per tenant session
    client_key = f"{company_id}_{req.conversation_id or 'anon'}"
    RateLimiter.check_rate_limit(client_key, max_requests=20)

    stored_chunks = [c for c in db.document_chunks.values() if c.get("companyId") == company_id]
    agent = db.get_agent_for_company(company_id) or {"name": "Aura", "model": "gpt-4o-mini"}


    response = await AgentRuntime.process_message(
        request=req,
        company_id=company_id,
        agent_config=agent,
        stored_chunks=stored_chunks
    )

    # Record usage
    UsageService.record_event(company_id, "message", 1, {"conversationId": req.conversation_id})
    UsageService.record_event(company_id, "llm_tokens", response.tokens_used, {"model": agent.get("model", "gpt-4o")})

    async def sse_event_generator():
        # 1. Send metadata event
        init_event = {
            "type": "start",
            "conversationId": req.conversation_id,
            "citations": response.citations,
            "confidenceScore": response.confidence_score
        }
        yield f"data: {json.dumps(init_event)}\n\n"

        # 2. Stream tokens
        for chunk in AgentRuntime.stream_tokens(response.message):
            yield chunk

        # 3. Send done event with full response summary
        done_event = {
            "type": "done",
            "fullMessage": response.message,
            "tokensUsed": response.tokens_used,
            "shouldEscalate": response.should_escalate_to_human,
            "pendingAction": response.pending_action
        }
        yield f"data: {json.dumps(done_event)}\n\n"

    return StreamingResponse(
        sse_event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
