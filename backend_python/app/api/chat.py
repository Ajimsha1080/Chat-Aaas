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

def _persist_chat_turn(company_id: str, req: ChatRequest, bot_reply: str, tokens_used: int) -> Optional[str]:
    # Do not persist ephemeral playground test chats or anonymous one-off probes
    if req.is_test_mode:
        return None
    if not (req.conversation_id or req.session_id or req.customer_email or req.customer_name):
        return None

    conv_id = req.conversation_id or req.session_id or f"conv-{int(time.time() * 1000)}"
    conv = db.conversations.get(conv_id)
    now_str = time.strftime("%Y-%m-%dT%H:%M:%SZ")
    if not conv or conv.get("companyId") != company_id:
        conv = {
            "id": conv_id,
            "companyId": company_id,
            "customerSessionId": req.session_id or f"sess_{int(time.time())}",
            "customerName": req.customer_name or "Website Visitor",
            "customerEmail": req.customer_email or "visitor@guest.io",
            "channel": "website_widget",
            "status": "active",
            "sentiment": "neutral",
            "totalTokensUsed": tokens_used,
            "tags": ["Live Session", "Public Widget"],
            "startedAt": now_str,
            "lastMessageAt": now_str
        }
        db.conversations[conv_id] = conv
    else:
        conv["lastMessageAt"] = now_str
        conv["totalTokensUsed"] = conv.get("totalTokensUsed", 0) + tokens_used

    # Save User message
    u_msg_id = f"msg-u-{int(time.time() * 1000)}"
    db.messages[u_msg_id] = {
        "id": u_msg_id,
        "conversationId": conv_id,
        "companyId": company_id,
        "sender": "user",
        "text": req.message,
        "createdAt": now_str
    }

    # Save Agent message
    a_msg_id = f"msg-a-{int(time.time() * 1000) + 1}"
    db.messages[a_msg_id] = {
        "id": a_msg_id,
        "conversationId": conv_id,
        "companyId": company_id,
        "sender": "agent",
        "text": bot_reply,
        "tokensUsed": tokens_used,
        "createdAt": now_str
    }
    db.flush_durable_storage()
    return conv_id

@router.post("", response_model=ChatResponse)
@router.post("/message", response_model=ChatResponse)
async def process_chat_message(
    req: ChatRequest,
    ctx: TenantContext = Depends(get_tenant_context)
):
    """
    Direct synchronous AI agent execution with RAG retrieval, anti-spam rate limiting, quota checks, and tool gates.
    """
    # 0. Global AI Killswitch Interception
    if db.global_killswitch_active:
        raise HTTPException(
            status_code=503,
            detail=f"Global AI operations are currently paused by platform administration. Reason: {db.global_killswitch_reason or 'Emergency Maintenance'}"
        )

    company_id = ctx.company_id

    # 1. Agent Active / Maintenance Gate
    agent = db.get_agent_for_company(company_id) or {"name": "Coar AI", "model": "gpt-4o-mini", "status": "active"}
    if agent.get("status") == "disabled" or agent.get("lifecycleStatus") == "disabled":
        raise HTTPException(
            status_code=503,
            detail="The AI assistant for this workspace is currently disabled by its owner."
        )

    # 2. Subscription Plan Monthly Quota Check
    if ctx.role not in ["super_admin", "platform_super_admin"]:
        quota = UsageService.check_monthly_quota(company_id)
        if quota.get("isExceeded"):
            raise HTTPException(
                status_code=402,
                detail=f"Monthly conversation limit ({quota.get('monthlyLimit')}) exceeded for your active subscription. Please upgrade to continue."
            )
    
    # 3. Anti-spam & Cost Protection: Max 20 requests/minute per tenant session
    client_key = f"{company_id}_{req.conversation_id or req.session_id or 'anon'}"
    RateLimiter.check_rate_limit(client_key, max_requests=20)

    stored_chunks = db.get_document_chunks_for_tenant(company_id, only_active=True)

    response = await AgentRuntime.process_message(
        request=req,
        company_id=company_id,
        agent_config=agent,
        stored_chunks=stored_chunks
    )

    # 4. Durable Conversation & Message Persistence
    conv_id = _persist_chat_turn(company_id, req, response.message, response.tokens_used)
    response.conversation_id = conv_id

    # 5. Record usage telemetry
    UsageService.record_event(company_id, "message", 1, "messages", conv_id)
    UsageService.record_event(company_id, "llm_tokens", response.tokens_used, "tokens", conv_id)

    # 6. Automatic Knowledge Gap Detection
    if getattr(response, "is_refusal", False) and req.message:
        import hashlib
        norm_query = req.message.strip()
        gap_id = f"gap-{company_id}-{hashlib.md5(norm_query.lower().encode()).hexdigest()[:8]}"
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
        if gap_id in db.knowledge_gaps:
            db.knowledge_gaps[gap_id]["occurrences"] = db.knowledge_gaps[gap_id].get("occurrences", 1) + 1
            db.knowledge_gaps[gap_id]["lastAskedAt"] = now_iso
        else:
            db.knowledge_gaps[gap_id] = {
                "id": gap_id,
                "companyId": company_id,
                "query": norm_query,
                "occurrences": 1,
                "lastAskedAt": now_iso,
                "status": "unresolved",
                "suggestedCategory": "Deployment" if "deploy" in norm_query.lower() else "General",
                "createdAt": now_iso
            }

    return response

@router.post("/stream")
async def stream_chat_tokens(
    req: ChatRequest,
    ctx: TenantContext = Depends(get_tenant_context)
):
    """
    Real SSE Token Streaming endpoint for React chat widgets and web dashboards.
    Streams tokens directly as they are generated by the LLM provider.
    """
    # 0. Global AI Killswitch Interception
    if db.global_killswitch_active:
        raise HTTPException(
            status_code=503,
            detail=f"Global AI operations are currently paused by platform administration. Reason: {db.global_killswitch_reason or 'Emergency Maintenance'}"
        )

    company_id = ctx.company_id
    
    # 1. Anti-spam & Cost Protection: Max 20 requests/minute per tenant session
    client_key = f"{company_id}_{req.conversation_id or req.session_id or 'anon'}"
    RateLimiter.check_rate_limit(client_key, max_requests=20)

    stored_chunks = db.get_document_chunks_for_tenant(company_id, only_active=True)
    agent = db.get_agent_for_company(company_id) or {"name": "Coar AI", "model": "gpt-4o-mini"}

    return StreamingResponse(
        AgentRuntime.stream_process_message(
            request=req,
            company_id=company_id,
            agent_config=agent,
            stored_chunks=stored_chunks
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
