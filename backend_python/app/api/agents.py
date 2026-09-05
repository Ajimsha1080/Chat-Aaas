from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.services.agent_service import AgentService
from app.core.tenant import TenantContext, get_tenant_context
from app.core.permissions import has_permission

router = APIRouter(prefix="/agent", tags=["Agents"])

class UpdateDraftRequest(BaseModel):
    name: Optional[str] = None
    greetingMessage: Optional[str] = None
    fallbackMessage: Optional[str] = None
    tone: Optional[str] = None
    systemInstructions: Optional[str] = None

class PublishDraftRequest(BaseModel):
    changeSummary: Optional[str] = "Version release"

class RollbackRequest(BaseModel):
    targetVersionId: str

@router.get("")
def get_agent(ctx: TenantContext = Depends(get_tenant_context)):
    res = AgentService.get_agent_for_company(ctx.company_id)
    if not res:
        raise HTTPException(status_code=404, detail="Agent not found for company")
    return {"status": 200, "data": res}

@router.get("/versions")
def get_agent_versions(ctx: TenantContext = Depends(get_tenant_context)):
    res = AgentService.get_agent_for_company(ctx.company_id)
    if not res:
        raise HTTPException(status_code=404, detail="Agent not found for company")
    return {"status": 200, "data": {"versions": res.get("versions", [])}}

@router.put("/draft")
def update_draft(req: UpdateDraftRequest, ctx: TenantContext = Depends(get_tenant_context)):
    if not has_permission(ctx.role, "agent:write"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient role permissions to edit draft.")
    res = AgentService.update_draft(ctx.company_id, req.model_dump(exclude_unset=True))
    return {"status": 200, "data": {"draft": res}}

@router.post("/publish")
def publish_draft(req: PublishDraftRequest, ctx: TenantContext = Depends(get_tenant_context)):
    if not has_permission(ctx.role, "agent:publish"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient role permissions to publish version.")
    res = AgentService.publish_draft(ctx.company_id, req.changeSummary, ctx.user_id)
    return {"status": 200, "data": {"version": res}}

@router.post("/rollback")
def rollback_version(req: RollbackRequest, ctx: TenantContext = Depends(get_tenant_context)):
    if not has_permission(ctx.role, "agent:rollback"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient role permissions to rollback version.")
    res = AgentService.rollback_version(ctx.company_id, req.targetVersionId)
    return {"status": 200, "data": {"activeVersion": res}}
