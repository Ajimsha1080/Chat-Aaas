from fastapi import APIRouter, HTTPException, Depends
from app.db.database import db
from app.core.tenant import TenantContext, get_tenant_context
from app.core.permissions import has_permission

router = APIRouter(prefix="/admin", tags=["Platform Super Admin"])

@router.get("/tenants")
def list_all_tenants(ctx: TenantContext = Depends(get_tenant_context)):
    if not has_permission(ctx.role, "admin:all"):
        raise HTTPException(status_code=403, detail="Forbidden: Super admin privilege required.")
    return {"status": 200, "data": {"companies": list(db.companies.values())}}

@router.get("/metrics")
def get_platform_metrics(ctx: TenantContext = Depends(get_tenant_context)):
    if not has_permission(ctx.role, "admin:all"):
        raise HTTPException(status_code=403, detail="Forbidden: Super admin privilege required.")

    total_tenants = len(db.companies)
    active_agents = len([a for a in db.agents.values() if a.get("status") == "active"])
    total_messages = sum(e["quantity"] for e in db.usage_events if e.get("eventType") == "message")

    return {
        "status": 200,
        "data": {
            "totalTenants": total_tenants,
            "activeAgents": active_agents,
            "totalPlatformMessages": total_messages,
            "systemHealth": "OPTIMAL",
            "activeWorkerJobs": 0
        }
    }
