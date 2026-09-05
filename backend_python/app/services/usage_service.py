import time
from typing import Dict, Any, List
from app.db.database import db

class UsageService:
    @staticmethod
    def record_event(
        company_id: str,
        event_type: str,
        quantity: int,
        unit: str = "tokens",
        conversation_id: str = None
    ) -> Dict[str, Any]:
        event = {
            "id": f"use-{int(time.time() * 1000)}",
            "companyId": company_id,
            "conversationId": conversation_id,
            "eventType": event_type,
            "quantity": quantity,
            "unit": unit,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }
        db.usage_events.append(event)
        return event

    @staticmethod
    def get_tenant_summary(company_id: str) -> Dict[str, Any]:
        tenant_events = [e for e in db.usage_events if e.get("companyId") == company_id]
        total_tokens = sum(e["quantity"] for e in tenant_events if e.get("unit") == "tokens")
        total_messages = sum(e["quantity"] for e in tenant_events if e.get("eventType") == "message")
        total_tool_calls = sum(1 for e in tenant_events if e.get("eventType") == "tool_call")

        return {
            "companyId": company_id,
            "totalTokens": total_tokens,
            "totalMessages": total_messages,
            "totalToolCalls": total_tool_calls,
            "eventCount": len(tenant_events)
        }
