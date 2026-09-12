import time
from typing import Dict, Any, List, Optional
from app.db.database import db

class ToolService:
    @staticmethod
    def get_tools_for_company(company_id: str) -> List[Dict[str, Any]]:
        return [t for t in db.agent_tools.values() if t.get("companyId") == company_id]

    @staticmethod
    def validate_arguments(tool: Dict[str, Any], args: Dict[str, Any]) -> Dict[str, Any]:
        for param in tool.get("parameters", []):
            if param.get("required") and (param.get("name") not in args or args[param.get("name")] is None):
                return {"valid": False, "missingParam": param.get("name")}
        return {"valid": True}

    @staticmethod
    def execute_tool(
        company_id: str,
        tool_code: str,
        arguments: Dict[str, Any],
        user_confirmed: bool = False,
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        tools = ToolService.get_tools_for_company(company_id)
        tool = next((t for t in tools if t.get("code") == tool_code), None)
        if not tool:
            return {"status": "error", "error": f"Tool '{tool_code}' not configured for tenant."}

        # 0. Idempotency Check: prevent duplicate financial or destructive operations
        if idempotency_key:
            cached = db.get_action_by_idempotency_key(company_id, idempotency_key)
            if cached and cached.get("status") == "succeeded":
                return {
                    "status": "success",
                    "result": cached.get("result"),
                    "idempotentReplay": True,
                    "actionId": cached.get("id")
                }

        # 1. Schema Validation
        validation = ToolService.validate_arguments(tool, arguments)
        if not validation["valid"]:
            return {
                "status": "validation_error",
                "error": f"Missing required parameter '{validation.get('missingParam')}'."
            }

        action_id = f"act_{int(time.time() * 1000)}"

        # 2. Risk Tier & Confirmation Gate Check
        if (tool.get("riskLevel") == "high_risk" or tool.get("requiresUserConfirmation")) and not user_confirmed:
            db.record_action_execution(action_id, {
                "id": action_id,
                "companyId": company_id,
                "toolCode": tool_code,
                "idempotencyKey": idempotency_key,
                "status": "confirmation_required",
                "riskLevel": tool.get("riskLevel", "high_risk"),
                "requiresUserConfirmation": True,
                "isConfirmed": False,
                "parameters": arguments,
                "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            })
            return {
                "status": "requires_confirmation",
                "actionId": action_id,
                "confirmationPrompt": tool.get("confirmationPrompt") or f"Action '{tool.get('name')}' requires explicit confirmation before proceeding.",
                "pendingAction": {
                    "actionId": action_id,
                    "toolCode": tool_code,
                    "arguments": arguments,
                    "riskLevel": tool.get("riskLevel", "high_risk")
                }
            }

        # 3. Mark executing
        db.record_action_execution(action_id, {
            "id": action_id,
            "companyId": company_id,
            "toolCode": tool_code,
            "idempotencyKey": idempotency_key,
            "status": "executing",
            "riskLevel": tool.get("riskLevel", "low_risk"),
            "requiresUserConfirmation": tool.get("requiresUserConfirmation", False),
            "isConfirmed": user_confirmed,
            "parameters": arguments,
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        })

        # 4. Dynamic Dispatch Execution
        result_payload = {}
        if tool_code == "check_order_status":
            order_id = arguments.get("order_id", "ORD-8821")
            result_payload = {
                "order_id": order_id,
                "status": "PROVISIONED_AND_HEALTHY",
                "region": "ap-south-1 (Mumbai)",
                "nodes_running": 6,
                "estimated_delivery": "Live Online"
            }
        elif tool_code == "execute_refund":
            order_id = arguments.get("order_id", "ORD-UNKNOWN")
            amount = arguments.get("amount", "Rs. 500")
            result_payload = {
                "refund_id": f"ref_{int(time.time())}",
                "order_id": order_id,
                "amount_refunded": amount,
                "status": "PROCESSED",
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            }
        elif tool_code == "restart_cluster_nodes":
            cluster_id = arguments.get("clusterId", "cls-prod-9941")
            result_payload = {
                "cluster_id": cluster_id,
                "restarted_nodes": 4,
                "status": "RESTARTED_HEALTHY"
            }
        else:
            result_payload = {
                "message": f"Action '{tool.get('name')}' executed successfully.",
                "arguments": arguments
            }

        # Mark succeeded
        db.update_action_execution(action_id, {
            "status": "succeeded",
            "result": result_payload,
            "completedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        })

        return {
            "status": "success",
            "actionId": action_id,
            "result": result_payload
        }

