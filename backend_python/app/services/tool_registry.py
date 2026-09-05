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

        # Mock Execution of Approved Tools
        if tool_name == "check_order_status":
            order_id = params.get("order_id", "ORD-8821")
            return ToolExecutionResponse(
                success=True,
                result={
                    "order_id": order_id,
                    "status": "In Transit via BlueDart Express",
                    "estimated_delivery": "Tomorrow by 2:00 PM IST",
                    "tracking_number": "BLU-994821038"
                }
            )

        if tool_name == "create_support_ticket":
            subject = params.get("subject", "General Inquiry")
            return ToolExecutionResponse(
                success=True,
                result={
                    "ticket_id": f"TICK-{hash(subject) % 10000:04d}",
                    "status": "Open",
                    "priority": params.get("priority", "Normal"),
                    "created_at": "Just now"
                }
            )

        if tool_name == "execute_refund":
            order_id = params.get("order_id", "ORD-1029")
            amount = params.get("amount", "?2,499")
            return ToolExecutionResponse(
                success=True,
                result={
                    "refund_id": f"RFND-{abs(hash(order_id)) % 100000:05d}",
                    "order_id": order_id,
                    "amount_refunded": amount,
                    "status": "Processed via Razorpay/Stripe",
                    "confirmation_code": "RF-AUTH-993821"
                }
            )

        return ToolExecutionResponse(
            success=True,
            result={"status": "Action executed successfully", "params": params}
        )
