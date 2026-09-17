import time
from typing import Dict, Any, List, Optional
from app.db.database import db

class ConversationService:
    @staticmethod
    def get_conversations_for_company(company_id: str, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        # Retrieve authoritative conversations from SQL/cache
        all_convs = []
        try:
            from app.db.models import Base
            with db.engine.connect() as conn:
                stmt = Base.metadata.tables["conversations"].select().where(
                    Base.metadata.tables["conversations"].c.company_id == company_id
                )
                if status_filter and status_filter != "all":
                    if status_filter == "needs_attention":
                        stmt = stmt.where(Base.metadata.tables["conversations"].c.status == "escalated_to_human")
                    else:
                        stmt = stmt.where(Base.metadata.tables["conversations"].c.status == status_filter)
                rows = conn.execute(stmt).mappings().all()
                for r in rows:
                    c = {
                        "id": r["id"],
                        "companyId": r["company_id"],
                        "customerSessionId": r["customer_session_id"],
                        "customerName": r["customer_name"],
                        "customerEmail": r["customer_email"],
                        "channel": r["channel"],
                        "status": r["status"],
                        "sentiment": r["sentiment"],
                        "assignedOperator": r["assigned_human_id"],
                        "handoffReason": r["internal_notes"],
                        "tags": r["tags"] or [],
                        "totalTokensUsed": r["total_tokens_used"],
                        "startedAt": r["started_at"],
                        "lastMessageAt": r["last_message_at"]
                    }
                    db.conversations[r["id"]] = c
                    all_convs.append(c)
        except Exception:
            all_convs = [c for c in db.conversations.values() if c.get("companyId") == company_id]
            if status_filter and status_filter != "all":
                if status_filter == "needs_attention":
                    all_convs = [c for c in all_convs if c.get("status") == "escalated_to_human"]
                else:
                    all_convs = [c for c in all_convs if c.get("status") == status_filter]
        
        result = []
        for c in all_convs:
            cd = dict(c)
            msgs = db.get_messages_for_conversation(c["id"], company_id)
            msgs.sort(key=lambda m: m.get("createdAt", ""))
            cd["messages"] = msgs
            result.append(cd)

        result.sort(key=lambda x: x.get("lastMessageAt", ""), reverse=True)
        return result

    @staticmethod
    def get_conversation_details(conversation_id: str, company_id: str) -> Optional[Dict[str, Any]]:
        conv = db.get_conversation_by_id(conversation_id, company_id)
        if not conv or conv.get("companyId") != company_id:
            return None
        messages = db.get_messages_for_conversation(conversation_id, company_id)
        messages.sort(key=lambda m: m.get("createdAt", ""))
        return {"conversation": conv, "messages": messages}

    @staticmethod
    def is_ai_suppressed(conversation_id: str, company_id: str) -> bool:
        """Returns True if the conversation is currently under human control or escalated."""
        conv = db.get_conversation_by_id(conversation_id, company_id)
        if not conv or conv.get("companyId") != company_id:
            return False
        return conv.get("status") in ["handoff_requested", "assigned", "human_active", "escalated_to_human"]

    @staticmethod
    def request_handoff(conversation_id: str, company_id: str, reason: str = "Customer requested human assistance") -> Dict[str, Any]:
        conv = db.get_conversation_by_id(conversation_id, company_id)
        if not conv or conv.get("companyId") != company_id:
            raise ValueError("Conversation not found for tenant")

        conv["status"] = "handoff_requested"
        conv["sentiment"] = "urgent"
        conv["handoffReason"] = reason
        conv["handoffRequestedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")

        sys_msg_id = f"msg-sys-{int(time.time() * 1000)}"
        msg = {
            "id": sys_msg_id,
            "conversationId": conversation_id,
            "companyId": company_id,
            "sender": "system",
            "text": f"Human operator handoff requested: {reason}.",
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }
        db.save_conversation(conv)
        db.save_message(msg)
        return {"success": True, "conversation": conv, "status": "handoff_requested"}

    @staticmethod
    def assign_operator(conversation_id: str, company_id: str, operator_name: str) -> Dict[str, Any]:
        conv = db.get_conversation_by_id(conversation_id, company_id)
        if not conv or conv.get("companyId") != company_id:
            raise ValueError("Conversation not found for tenant")

        conv["status"] = "assigned"
        conv["assignedOperator"] = operator_name
        conv["assignedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
        db.save_conversation(conv)
        return {"success": True, "conversation": conv}

    @staticmethod
    def human_takeover(conversation_id: str, company_id: str, operator_name: str = "Staff Agent") -> Dict[str, Any]:
        conv = db.get_conversation_by_id(conversation_id, company_id)
        if not conv or conv.get("companyId") != company_id:
            raise ValueError("Conversation not found for tenant")

        conv["status"] = "human_active"
        conv["assignedOperator"] = operator_name
        conv["sentiment"] = "urgent"
        conv["humanActiveAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")

        # System message notice
        sys_msg_id = f"msg-sys-{int(time.time() * 1000)}"
        msg = {
            "id": sys_msg_id,
            "conversationId": conversation_id,
            "companyId": company_id,
            "sender": "system",
            "text": f"Human operator {operator_name} has taken over the conversation.",
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }
        db.save_conversation(conv)
        db.save_message(msg)
        return {"success": True, "conversation": conv, "status": "human_active"}

    @staticmethod
    def send_human_reply(conversation_id: str, company_id: str, operator_name: str, text: str) -> Dict[str, Any]:
        conv = db.get_conversation_by_id(conversation_id, company_id)
        if not conv or conv.get("companyId") != company_id:
            raise ValueError("Conversation not found for tenant")

        conv["status"] = "human_active"
        conv["assignedOperator"] = operator_name
        conv["lastMessageAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")

        msg_id = f"msg-h-{int(time.time() * 1000)}"
        msg = {
            "id": msg_id,
            "conversationId": conversation_id,
            "companyId": company_id,
            "sender": "human_agent",
            "senderName": operator_name,
            "text": text,
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }
        db.save_conversation(conv)
        db.save_message(msg)
        return {"success": True, "message": msg, "conversation": conv}

    @staticmethod
    def resolve_conversation(conversation_id: str, company_id: str) -> Dict[str, Any]:
        conv = db.get_conversation_by_id(conversation_id, company_id)
        if not conv or conv.get("companyId") != company_id:
            raise ValueError("Conversation not found for tenant")

        conv["status"] = "resolved"
        conv["resolvedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
        db.save_conversation(conv)
        return {"success": True, "conversation": conv}

    @staticmethod
    def close_conversation(conversation_id: str, company_id: str) -> Dict[str, Any]:
        conv = db.get_conversation_by_id(conversation_id, company_id)
        if not conv or conv.get("companyId") != company_id:
            raise ValueError("Conversation not found for tenant")

        conv["status"] = "closed"
        conv["closedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
        db.save_conversation(conv)
        return {"success": True, "conversation": conv}

