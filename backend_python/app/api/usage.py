from fastapi import APIRouter, Depends
from app.services.usage_service import UsageService
from app.core.tenant import TenantContext, get_tenant_context

router = APIRouter(prefix="/usage", tags=["Usage & Metering"])

@router.get("/summary")
def get_usage_summary(ctx: TenantContext = Depends(get_tenant_context)):
    summary = UsageService.get_tenant_usage_summary(ctx.company_id)
    return {"status": 200, "data": summary}

@router.get("/events")
def get_usage_events(ctx: TenantContext = Depends(get_tenant_context)):
    events = UsageService.get_events_for_company(ctx.company_id)
    return {"status": 200, "data": {"events": events}}
