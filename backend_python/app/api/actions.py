from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional
from app.services.tool_service import ToolService
from app.core.tenant import TenantContext, get_tenant_context
from app.core.permissions import has_permission

router = APIRouter(prefix="/tools", tags=["Actions & Tools"])

class ExecuteToolRequest(BaseModel):
    toolCode: str
    args: Optional[Dict[str, Any]] = {}
    userConfirmed: Optional[bool] = False
    idempotencyKey: Optional[str] = None

@router.get("")
def list_tools(ctx: TenantContext = Depends(get_tenant_context)):
    tools = ToolService.get_tools_for_company(ctx.company_id)
    return {"status": 200, "data": {"tools": tools}}

@router.post("/execute")
def execute_tool(req: ExecuteToolRequest, ctx: TenantContext = Depends(get_tenant_context)):
    if not has_permission(ctx.role, "tool:execute"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient role permissions to execute actions.")

    result = ToolService.execute_tool(
        company_id=ctx.company_id,
        tool_code=req.toolCode,
        arguments=req.args or {},
        user_confirmed=req.userConfirmed or False,
        idempotency_key=req.idempotencyKey
    )
    return {"status": 200, "data": result}
