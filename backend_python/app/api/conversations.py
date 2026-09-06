import time
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from app.db.database import db
from app.services.conversation_service import ConversationService
from app.services.agent_runtime import AgentRuntime
from app.services.usage_service import UsageService
from app.services.rate_limiter import RateLimiter
from app.schemas import ChatRequest
from app.core.tenant import TenantContext, get_tenant_context

router = APIRouter(prefix="/conversations", tags=["Conversations & Support Inbox"])

class SendMessageRequest(BaseModel):
    conversationId: Optional[str] = None
    text: str
    customerName: Optional[str] = "Website Visitor"
    customerEmail: Optional[str] = "visitor@guest.io"

class TakeoverRequest(BaseModel):
    operatorName: Optional[str] = "Staff Agent"

@router.get("")
def list_conversations(status: Optional[str] = "all", ctx: TenantContext = Depends(get_tenant_context)):
    convs = ConversationService.get_conversations_for_company(ctx.company_id, status)
    return {"status": 200, "data": {"conversations": convs}}

@router.get("/{conversation_id}")
def get_conversation(conversation_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    details = ConversationService.get_conversation_details(conversation_id, ctx.company_id)
    if not details:
        raise HTTPException(status_code=404, detail="Conversation not found for tenant")
    return {"status": 200, "data": details}

@router.post("/message")
async def send_message(req: SendMessageRequest, ctx: TenantContext = Depends(get_tenant_context)):
    company_id = ctx.company_id

    # Anti-Spam Rate Limiter
    client_key = f"{company_id}_{req.conversationId or req.customerEmail or 'anon'}"
    RateLimiter.check_rate_limit(client_key, max_requests=20)


    # Find or create conversation
    conv_id = req.conversationId or f"conv-{int(time.time() * 1000)}"
    conv = db.conversations.get(conv_id)
    if not conv or conv.get("companyId") != company_id:
        conv = {
            "id": conv_id,
            "companyId": company_id,
            "customerSessionId": f"sess_{int(time.time())}",
            "customerName": req.customerName,
            "customerEmail": req.customerEmail,
            "channel": "website_widget",
            "status": "active",
            "sentiment": "neutral",
            "totalTokensUsed": 120,
            "tags": ["Live Session"],
            "startedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "lastMessageAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }
        db.conversations[conv_id] = conv

    # 1. User Message
    user_msg_id = f"msg-u-{int(time.time() * 1000)}"
    user_msg = {
        "id": user_msg_id,
        "conversationId": conv_id,
        "companyId": company_id,
        "sender": "user",
        "text": req.text,
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }
    db.messages[user_msg_id] = user_msg

    # 2. Process through Agent Runtime
    chunks = db.get_document_chunks_for_tenant(company_id)
    agent = db.get_agent_for_company(company_id) or {}
    chat_req = ChatRequest(message=req.text, session_id=conv_id)
    runtime_res = await AgentRuntime.process_message(chat_req, company_id, agent, chunks)

    # 3. Agent Response Message
    agent_msg_id = f"msg-a-{int(time.time() * 1000)}"
    agent_msg = {
        "id": agent_msg_id,
        "conversationId": conv_id,
        "companyId": company_id,
        "sender": "agent",
        "text": runtime_res.message,
        "reasoningSteps": [s.model_dump() for s in runtime_res.reasoning_steps],
        "toolExecuted": runtime_res.tool_executed,
        "toolResult": runtime_res.tool_result,
        "requiresConfirmation": runtime_res.requires_confirmation,
        "confirmationAction": runtime_res.confirmation_action,
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }
    db.messages[agent_msg_id] = agent_msg

    conv["lastMessageAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
    if runtime_res.should_escalate_to_human or runtime_res.handoff_required:
        conv["status"] = "escalated_to_human"
        conv["sentiment"] = "urgent"

    UsageService.record_event(company_id, "message", 2, "count", conv_id)
    UsageService.record_event(company_id, "token_consumption", 350, "tokens", conv_id)

    return {
        "status": 200,
        "data": {
            "conversation": conv,
            "userMessage": user_msg,
            "agentMessage": agent_msg
        }
    }

@router.post("/{conversation_id}/takeover")
def takeover_chat(conversation_id: str, req: TakeoverRequest, ctx: TenantContext = Depends(get_tenant_context)):
    res = ConversationService.human_takeover(conversation_id, ctx.company_id, req.operatorName or "Staff Agent")
    return {"status": 200, "data": res}

@router.post("/{conversation_id}/resolve")
def resolve_chat(conversation_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    res = ConversationService.resolve_conversation(conversation_id, ctx.company_id)
    return {"status": 200, "data": res}
