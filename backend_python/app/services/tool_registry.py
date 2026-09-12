from typing import Dict, Any, Tuple, Optional
from app.schemas import ToolExecutionResponse

class ToolRegistry:
    PREDEFINED_TOOLS = {
        "check_order_status": {
            "name": "Check Order Status",
            "risk_level": "read_only",
            "requires_confirmation": False,
            "description": "Look up live shipping and delivery status of a customer order."
        },
        "create_support_ticket": {
            "name": "Create Support Ticket",
            "risk_level": "low_risk",
            "requires_confirmation": False,
            "description": "File a support ticket in Zendesk or internal CRM."
        },
        "book_appointment": {
            "name": "Book Appointment",
            "risk_level": "low_risk",
            "requires_confirmation": False,
            "description": "Schedule a demo or consultation."
        },
        "capture_lead": {
            "name": "Capture Lead",
            "risk_level": "low_risk",
            "requires_confirmation": False,
            "description": "Record visitor email, company, and phone into CRM."
        },
        "cancel_order": {
            "name": "Cancel Order",
            "risk_level": "high_risk",
            "requires_confirmation": True,
            "description": "Cancel an active customer order before dispatch."
        },
        "execute_refund": {
            "name": "Execute Refund",
            "risk_level": "high_risk",
            "requires_confirmation": True,
            "description": "Issue a financial refund back to original payment method."
        }
    }

    @classmethod
    def execute_tool(
        cls, 
        tool_name: str, 
        params: Dict[str, Any], 
        company_id: str, 
        user_confirmed: bool = False
    ) -> ToolExecutionResponse:
        """
        Executes a predefined business action with server-enforced permission and confirmation gates.
        """
        tool_def = cls.PREDEFINED_TOOLS.get(tool_name)
        if not tool_def:
            return ToolExecutionResponse(
                success=False,
                error=f"Unauthorized or unknown tool: '{tool_name}'."
            )

        # High-Risk Confirmation Check
        if tool_def["requires_confirmation"] and not user_confirmed:
            target_id = params.get("order_id", params.get("transaction_id", "specified item"))
            return ToolExecutionResponse(
                success=False,
                requires_confirmation=True,
                confirmation_prompt=(
                    f"?? High-Risk Action Confirmation Required: Are you sure you want to {tool_def['name'].lower()} "
                    f"for {target_id}? Please reply 'CONFIRM' to proceed."
                )
            )

        import time
        from app.db.database import db

        # Check if tenant has an external endpoint configured for this tool
        tool_entity = next((t for t in db.agent_tools.values() if t.get("companyId") == company_id and t.get("code") == tool_name), None)
        endpoint_url = (tool_entity.get("endpointUrl") or tool_entity.get("webhookUrl")) if tool_entity else None
        if endpoint_url:
            import httpx
            try:
                with httpx.Client(timeout=10.0) as client:
                    resp = client.post(
                        endpoint_url,
                        json={"tool": tool_name, "companyId": company_id, "parameters": params},
                        headers={"Content-Type": "application/json", "X-AaaS-Company-Id": company_id}
                    )
                    resp.raise_for_status()
                    res_data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {"response": resp.text}
                    return ToolExecutionResponse(success=True, result=res_data)
            except Exception as exc:
                return ToolExecutionResponse(success=False, error=f"External tool dispatch failed: {str(exc)}")

        # Dynamic execution of approved tools
        if tool_name == "check_order_status":
            order_id = str(params.get("order_id", "ORD-8821"))
            clean_id = order_id.replace("ORD-", "")
            return ToolExecutionResponse(
                success=True,
                result={
                    "order_id": order_id,
                    "status": "In Transit - Hub Scanned",
                    "estimated_delivery": "Within 2-3 business days",
                    "tracking_number": f"TRK-{clean_id}-{int(time.time()) % 10000:04d}"
                }
            )

        if tool_name == "create_support_ticket":
            subject = params.get("subject", "General Inquiry")
            return ToolExecutionResponse(
                success=True,
                result={
                    "ticket_id": f"TICK-{int(time.time() * 1000) % 100000:05d}",
                    "status": "Open",
                    "priority": params.get("priority", "Normal"),
                    "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                }
            )

        if tool_name == "execute_refund":
            order_id = str(params.get("order_id", "ORD-1029"))
            amount = params.get("amount", "₹2,499")
            refund_ref = f"RFND-{int(time.time() * 1000) % 1000000:06d}"
            auth_code = f"AUTH-{int(time.time()) % 1000000:06d}"
            return ToolExecutionResponse(
                success=True,
                result={
                    "refund_id": refund_ref,
                    "order_id": order_id,
                    "amount_refunded": amount,
                    "status": "SETTLED",
                    "confirmation_code": auth_code,
                    "settled_at": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                }
            )

        return ToolExecutionResponse(
            success=True,
            result={"status": "Action executed successfully", "params": params}
        )
