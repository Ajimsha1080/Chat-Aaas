import time
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.db.database import db
from app.core.tenant import TenantContext, get_tenant_context
from app.core.permissions import has_permission

router = APIRouter(prefix="/companies", tags=["Companies & Organization"])

class UpdateCompanyRequest(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    industry: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

@router.get("/current")
def get_current_company(ctx: TenantContext = Depends(get_tenant_context)):
    comp = db.companies.get(ctx.company_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")
    return {"status": 200, "data": {"company": comp}}

@router.put("/current")
def update_current_company(req: UpdateCompanyRequest, ctx: TenantContext = Depends(get_tenant_context)):
    if not has_permission(ctx.role, "company:manage"):
        raise HTTPException(status_code=403, detail="Forbidden: Admin permissions required to modify organization profile.")

    comp = db.companies.get(ctx.company_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")

    if req.name:
        comp["name"] = req.name
    if req.domain:
        comp["domain"] = req.domain
    if req.industry:
        comp["industry"] = req.industry
    if req.settings:
        comp["settings"] = {**comp.get("settings", {}), **req.settings}

    comp["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
    return {"status": 200, "data": {"company": comp}}
