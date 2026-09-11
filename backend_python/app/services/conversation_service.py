import time
from typing import Dict, Any, List, Optional
from app.db.database import db

class ConversationService:
    @staticmethod
    def get_conversations_for_company(company_id: str, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        convs = [c for c in db.conversations.values() if c.get("companyId") == company_id]
        if status_filter and status_filter != "all":
            if status_filter == "needs_attention":
                convs = [c for c in convs if c.get("status") == "escalated_to_human"]
            else:
                convs = [c for c in convs if c.get("status") == status_filter]
        
        result = []
        for c in convs:
            cd = dict(c)
            msgs = db.get_messages_for_conversation(c["id"], company_id)
            msgs.sort(key=lambda m: m.get("createdAt", ""))
            cd["messages"] = msgs
            result.append(cd)

        result.sort(key=lambda x: x.get("lastMessageAt", ""), reverse=True)
        return result

    @staticmethod
    def get_conversation_details(conversation_id: str, company_id: str) -> Optional[Dict[str, Any]]:
        conv = db.conversations.get(conversation_id)
        if not conv or conv.get("companyId") != company_id:
            return None
        messages = db.get_messages_for_conversation(conversation_id, company_id)
        messages.sort(key=lambda m: m.get("createdAt", ""))
        return {"conversation": conv, "messages": messages}

    @staticmethod
    def human_takeover(conversation_id: str, company_id: str, operator_name: str = "Staff Agent") -> Dict[str, Any]:
        conv = db.conversations.get(conversation_id)
        if not conv or conv.get("companyId") != company_id:
            raise ValueError("Conversation not found for tenant")

        conv["status"] = "escalated_to_human"
        conv["assignedOperator"] = operator_name
        conv["sentiment"] = "urgent"

        # System message notice
        sys_msg_id = f"msg-sys-{int(time.time() * 1000)}"
        db.messages[sys_msg_id] = {
            "id": sys_msg_id,
            "conversationId": conversation_id,
            "companyId": company_id,
            "sender": "system",
            "text": f"Human operator {operator_name} joined the conversation.",
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }
        return {"success": True, "conversation": conv}

    @staticmethod
    def resolve_conversation(conversation_id: str, company_id: str) -> Dict[str, Any]:
        conv = db.conversations.get(conversation_id)
        if not conv or conv.get("companyId") != company_id:
            raise ValueError("Conversation not found for tenant")

        conv["status"] = "resolved"
        conv["resolvedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
        return {"success": True, "conversation": conv}
