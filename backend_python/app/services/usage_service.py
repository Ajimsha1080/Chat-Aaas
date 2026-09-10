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

    @staticmethod
    def get_tenant_usage_summary(company_id: str) -> Dict[str, Any]:
        return UsageService.get_tenant_summary(company_id)

    @staticmethod
    def get_events_for_company(company_id: str) -> List[Dict[str, Any]]:
        return [e for e in db.usage_events if e.get("companyId") == company_id]

    @staticmethod
    def check_monthly_quota(company_id: str) -> Dict[str, Any]:
        """
        Validates monthly conversation usage against the active subscription tier.
        Protects platform margins against excessive token burn and runaway loops.
        """
        company = db.companies.get(company_id, {})
        plan_id = company.get("planId", "starter")
        
        # Monthly limits
        plan_limits = {
            "starter": 1000,
            "growth": 5000,
            "business": 25000
        }
        max_allowed = plan_limits.get(plan_id, 1000)
        
        # Count tenant conversations in current billing period
        tenant_convs = [c for c in db.conversations.values() if c.get("companyId") == company_id]
        used_count = len(tenant_convs)
        
        is_exceeded = used_count >= max_allowed
        usage_percent = round((used_count / max_allowed) * 100, 1) if max_allowed > 0 else 100.0

        return {
            "companyId": company_id,
            "planId": plan_id,
            "monthlyLimit": max_allowed,
            "conversationsUsed": used_count,
            "usagePercent": usage_percent,
            "isExceeded": is_exceeded,
            "overageRateINR": 0.50  # ₹0.50 per additional conversation
        }

