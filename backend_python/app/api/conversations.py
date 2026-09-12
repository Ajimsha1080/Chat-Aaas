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
    operatorName: Optional[str] = None
    operatorId: Optional[str] = None

class HumanReplyRequest(BaseModel):
    text: Optional[str] = None
    content: Optional[str] = None
    operatorName: Optional[str] = None
    operatorId: Optional[str] = None

class HandoffRequest(BaseModel):
    reason: Optional[str] = "Customer requested live support"

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

    # 2. Check if AI response is suppressed because a human is active or requested
    if ConversationService.is_ai_suppressed(conv_id, company_id):
        conv["lastMessageAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
        db.flush_durable_storage()
        UsageService.record_event(company_id, "message", 1, "count", conv_id)
        notice_msg = {
            "id": f"msg-sys-{int(time.time() * 1000)}",
            "conversationId": conv_id,
            "companyId": company_id,
            "sender": "system",
            "text": "Your message was sent to our support team. An operator will respond momentarily.",
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }
        return {
            "status": 200,
            "data": {
                "conversation": conv,
                "userMessage": user_msg,
                "agentMessage": notice_msg,
                "isHumanActive": True
            }
        }

    # 3. Process through Agent Runtime
    chunks = db.get_document_chunks_for_tenant(company_id, only_active=True)
    agent = db.get_agent_for_company(company_id) or {}
    chat_req = ChatRequest(message=req.text, session_id=conv_id)
    runtime_res = await AgentRuntime.process_message(chat_req, company_id, agent, chunks)

    # 4. Agent Response Message
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
        conv["status"] = "handoff_requested"
        conv["sentiment"] = "urgent"

    db.flush_durable_storage()
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
    op_name = req.operatorName or req.operatorId or "Staff Agent"
    res = ConversationService.human_takeover(conversation_id, ctx.company_id, op_name)
    return {"status": 200, "data": res}

@router.post("/{conversation_id}/handoff")
def handoff_chat(conversation_id: str, req: Optional[HandoffRequest] = None, ctx: TenantContext = Depends(get_tenant_context)):
    reason = req.reason if req else "Customer requested live assistance"
    res = ConversationService.request_handoff(conversation_id, ctx.company_id, reason)
    return {"status": 200, "data": res}

@router.post("/{conversation_id}/reply")
def reply_as_human(conversation_id: str, req: HumanReplyRequest, ctx: TenantContext = Depends(get_tenant_context)):
    op_name = req.operatorName or req.operatorId or "Staff Agent"
    msg_text = req.text or req.content or ""
    res = ConversationService.send_human_reply(conversation_id, ctx.company_id, op_name, msg_text)
    return {"status": 200, "data": res}

@router.post("/{conversation_id}/resolve")
def resolve_chat(conversation_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    res = ConversationService.resolve_conversation(conversation_id, ctx.company_id)
    return {"status": 200, "data": res}

@router.post("/{conversation_id}/close")
def close_chat(conversation_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    res = ConversationService.close_conversation(conversation_id, ctx.company_id)
    return {"status": 200, "data": res}

class BulkConversationActionRequest(BaseModel):
    conversationIds: List[str]

@router.post("/{conversation_id}/archive")
def archive_conversation(conversation_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    conv = db.conversations.get(conversation_id)
    if not conv or conv.get("companyId") != ctx.company_id:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    conv["status"] = "archived"
    conv["archivedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
    return {"status": 200, "data": {"conversation": conv, "message": "Conversation archived."}}

@router.delete("/{conversation_id}")
def delete_conversation(conversation_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    conv = db.conversations.get(conversation_id)
    if not conv or conv.get("companyId") != ctx.company_id:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    del db.conversations[conversation_id]
    msg_ids = [mid for mid, m in db.messages.items() if m.get("conversationId") == conversation_id and m.get("companyId") == ctx.company_id]
    for mid in msg_ids:
        del db.messages[mid]
    return {"status": 200, "data": {"message": f"Conversation deleted and {len(msg_ids)} messages removed."}}

@router.post("/bulk-archive")
def bulk_archive_conversations(req: BulkConversationActionRequest, ctx: TenantContext = Depends(get_tenant_context)):
    archived_count = 0
    for cid in req.conversationIds:
        conv = db.conversations.get(cid)
        if conv and conv.get("companyId") == ctx.company_id:
            conv["status"] = "archived"
            conv["archivedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
            archived_count += 1
    return {"status": 200, "data": {"archivedCount": archived_count, "message": f"{archived_count} conversations archived."}}

@router.post("/bulk-delete")
def bulk_delete_conversations(req: BulkConversationActionRequest, ctx: TenantContext = Depends(get_tenant_context)):
    deleted_count = 0
    total_messages_deleted = 0
    for cid in req.conversationIds:
        conv = db.conversations.get(cid)
        if conv and conv.get("companyId") == ctx.company_id:
            del db.conversations[cid]
            deleted_count += 1
            msg_ids = [mid for mid, m in db.messages.items() if m.get("conversationId") == cid and m.get("companyId") == ctx.company_id]
            for mid in msg_ids:
                del db.messages[mid]
            total_messages_deleted += len(msg_ids)
    return {"status": 200, "data": {"deletedCount": deleted_count, "messagesDeleted": total_messages_deleted, "message": f"{deleted_count} conversations deleted."}}

