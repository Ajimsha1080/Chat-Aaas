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
        user_confirmed: bool = False
    ) -> Dict[str, Any]:
        tools = ToolService.get_tools_for_company(company_id)
        tool = next((t for t in tools if t.get("code") == tool_code), None)
        if not tool:
            return {"status": "error", "error": f"Tool '{tool_code}' not configured for tenant."}

        # 1. Schema Validation
        validation = ToolService.validate_arguments(tool, arguments)
        if not validation["valid"]:
            return {
                "status": "validation_error",
                "error": f"Missing required parameter '{validation.get('missingParam')}'."
            }

        # 2. Risk Tier & Confirmation Gate Check
        if (tool.get("riskLevel") == "high_risk" or tool.get("requiresUserConfirmation")) and not user_confirmed:
            return {
                "status": "requires_confirmation",
                "confirmationPrompt": tool.get("confirmationPrompt") or f"Action '{tool.get('name')}' requires explicit confirmation before proceeding.",
                "pendingAction": {
                    "toolCode": tool_code,
                    "arguments": arguments,
                    "riskLevel": tool.get("riskLevel", "high_risk")
                }
            }

        # 3. Dynamic Dispatch Execution
        if tool_code == "check_order_status":
            order_id = arguments.get("order_id", "ORD-8821")
            return {
                "status": "success",
                "result": {
                    "order_id": order_id,
                    "status": "PROVISIONED_AND_HEALTHY",
                    "region": "ap-south-1 (Mumbai)",
                    "nodes_running": 6,
                    "estimated_delivery": "Live Online"
                }
            }
        elif tool_code == "execute_refund":
            order_id = arguments.get("order_id", "ORD-UNKNOWN")
            amount = arguments.get("amount", "Rs. 500")
            return {
                "status": "success",
                "result": {
                    "refund_id": f"ref_{int(time.time())}",
                    "order_id": order_id,
                    "amount_refunded": amount,
                    "status": "PROCESSED",
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                }
            }
        elif tool_code == "restart_cluster_nodes":
            cluster_id = arguments.get("clusterId", "cls-prod-9941")
            return {
                "status": "success",
                "result": {
                    "cluster_id": cluster_id,
                    "restarted_nodes": 4,
                    "status": "RESTARTED_HEALTHY"
                }
            }

        return {
            "status": "success",
            "result": {"message": f"Action '{tool.get('name')}' executed successfully.", "arguments": arguments}
        }
