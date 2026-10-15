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
    def check_monthly_quota(company_id: str, billing_period: str = None) -> Dict[str, Any]:
        """
        Validates monthly conversation usage, token burn, and cost caps against active subscription tier.
        Protects platform margins against excessive token burn, runaway loops, and malicious exhaustion.
        """
        company = db.companies.get(company_id, {})
        plan_id = company.get("planId", "starter")
        settings_obj = company.get("settings", {}) or {}

        # Monthly limits
        plan_limits = {
            "starter": {"conversations": 1000, "tokens": 2_000_000, "cost_inr": 1500.0},
            "growth": {"conversations": 5000, "tokens": 15_000_000, "cost_inr": 7500.0},
            "business": {"conversations": 25000, "tokens": 100_000_000, "cost_inr": 35000.0}
        }
        tier_cfg = plan_limits.get(plan_id, plan_limits["starter"])

        max_conversations = settings_obj.get("monthlyConversationLimit") or tier_cfg["conversations"]
        max_tokens = settings_obj.get("monthlyTokenCap") or tier_cfg["tokens"]
        max_cost_inr = settings_obj.get("monthlyCostCap") or tier_cfg["cost_inr"]

        # Count tenant conversations in current billing period (calendar month YYYY-MM)
        current_period = billing_period or time.strftime("%Y-%m")
        tenant_convs = []
        for c in db.conversations.values():
            if c.get("companyId") != company_id:
                continue
            created_ts = c.get("createdAt") or c.get("startedAt")
            if created_ts:
                if str(created_ts).startswith(current_period):
                    tenant_convs.append(c)
            else:
                tenant_convs.append(c)
        used_convs = len(tenant_convs)

        # Count tenant token consumption in current billing period
        tenant_events = [
            e for e in db.usage_events
            if e.get("companyId") == company_id and str(e.get("timestamp", "")).startswith(current_period)
        ]
        tokens_used = sum(e.get("quantity", 0) for e in tenant_events if e.get("unit") == "tokens")

        # Estimated cost (₹0.00015 per token)
        estimated_cost_inr = round(tokens_used * 0.00015, 2)

        conv_exceeded = used_convs >= max_conversations
        token_exceeded = tokens_used >= max_tokens
        cost_exceeded = estimated_cost_inr >= max_cost_inr
        is_exceeded = conv_exceeded or token_exceeded or cost_exceeded

        reasons = []
        if conv_exceeded:
            reasons.append(f"Conversation limit reached ({used_convs}/{max_conversations})")
        if token_exceeded:
            reasons.append(f"Monthly token cap reached ({tokens_used}/{max_tokens})")
        if cost_exceeded:
            reasons.append(f"Monthly cost cap reached (₹{estimated_cost_inr}/₹{max_cost_inr})")

        usage_percent = round((used_convs / max_conversations) * 100, 1) if max_conversations > 0 else 100.0
        token_usage_percent = round((tokens_used / max_tokens) * 100, 1) if max_tokens > 0 else 100.0

        return {
            "companyId": company_id,
            "planId": plan_id,
            "monthlyLimit": max_conversations,
            "conversationsUsed": used_convs,
            "usagePercent": usage_percent,
            "tokenCap": max_tokens,
            "tokensUsed": tokens_used,
            "tokenUsagePercent": token_usage_percent,
            "costCapINR": max_cost_inr,
            "estimatedCostINR": estimated_cost_inr,
            "isExceeded": is_exceeded,
            "exceededReasons": reasons,
            "overageRateINR": 0.50,
            "billingPeriod": current_period
        }


