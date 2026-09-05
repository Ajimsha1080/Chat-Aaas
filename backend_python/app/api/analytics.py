from fastapi import APIRouter, Depends
from app.services.analytics_service import AnalyticsService
from app.services.audit_service import AuditService
from app.core.tenant import TenantContext, get_tenant_context

router = APIRouter(prefix="/analytics", tags=["Analytics & ROI"])

@router.get("/roi")
def get_roi_analytics(ctx: TenantContext = Depends(get_tenant_context)):
    data = AnalyticsService.get_roi_analytics(ctx.company_id)
    return {"status": 200, "data": data}

@router.get("/audit-logs")
def get_audit_logs(ctx: TenantContext = Depends(get_tenant_context)):
    logs = AuditService.get_logs_for_company(ctx.company_id)
    return {"status": 200, "data": {"logs": logs}}
