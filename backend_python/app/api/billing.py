from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.services.billing_service import BillingService
from app.services.usage_service import UsageService
from app.services.audit_service import AuditService
from app.core.tenant import TenantContext, get_tenant_context
from app.core.permissions import has_permission

router = APIRouter(prefix="/billing", tags=["Billing & Subscriptions"])

class UpgradePlanRequest(BaseModel):
    planId: str
    billingCycle: Optional[str] = "monthly"

@router.get("/plans")
def get_plans():
    return {"status": 200, "data": {"plans": BillingService.get_plans()}}

@router.post("/upgrade")
def upgrade_plan(req: UpgradePlanRequest, ctx: TenantContext = Depends(get_tenant_context)):
    if not has_permission(ctx.role, "billing:manage"):
        raise HTTPException(status_code=403, detail="Forbidden: Only owners/admins can change subscriptions.")

    res = BillingService.change_plan(ctx.company_id, req.planId, req.billingCycle or "monthly")
    AuditService.log(
        company_id=ctx.company_id,
        actor=ctx.user_id,
        actor_role=ctx.role,
        action="SUBSCRIPTION_UPGRADED",
        details=f"Upgraded plan to {req.planId.upper()} ({req.billingCycle})"
    )
    return {"status": 200, "data": res}

@router.get("/usage")
def get_usage(ctx: TenantContext = Depends(get_tenant_context)):
    summary = UsageService.get_tenant_summary(ctx.company_id)
    return {"status": 200, "data": {"usage": summary}}
