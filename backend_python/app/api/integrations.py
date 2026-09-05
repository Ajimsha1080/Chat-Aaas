import time
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from app.db.database import db
from app.core.tenant import TenantContext, get_tenant_context
from app.core.permissions import has_permission
from app.core.security import encrypt_secret

router = APIRouter(prefix="/integrations", tags=["Integrations & Connectors"])

class ConnectIntegrationRequest(BaseModel):
    provider: str  # slack, whatsapp, hubspot, salesforce, webhook, email
    name: str
    credentials: Dict[str, Any]
    config: Optional[Dict[str, Any]] = {}

@router.get("")
def list_integrations(ctx: TenantContext = Depends(get_tenant_context)):
    integrations = [i for i in db.integrations.values() if i.get("companyId") == ctx.company_id]
    
    # Return masked representation
    masked = []
    for item in integrations:
        masked.append({
            "id": item["id"],
            "provider": item["provider"],
            "name": item["name"],
            "status": item["status"],
            "config": item.get("config", {}),
            "connectedAt": item.get("connectedAt")
        })
    return {"status": 200, "data": {"integrations": masked}}

@router.post("/connect")
def connect_integration(req: ConnectIntegrationRequest, ctx: TenantContext = Depends(get_tenant_context)):
    if not has_permission(ctx.role, "integration:manage"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions to manage integrations.")

    int_id = f"int-{ctx.company_id}-{req.provider}"
    encrypted = encrypt_secret(str(req.credentials))

    db.integrations[int_id] = {
        "id": int_id,
        "companyId": ctx.company_id,
        "provider": req.provider,
        "name": req.name,
        "status": "connected",
        "encryptedCredentials": encrypted,
        "config": req.config or {},
        "connectedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }

    return {
        "status": 200,
        "data": {
            "id": int_id,
            "provider": req.provider,
            "name": req.name,
            "status": "connected"
        }
    }

@router.delete("/{integration_id}")
def disconnect_integration(integration_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    if not has_permission(ctx.role, "integration:manage"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions to manage integrations.")

    item = db.integrations.get(integration_id)
    if not item or item.get("companyId") != ctx.company_id:
        raise HTTPException(status_code=404, detail="Integration not found")

    del db.integrations[integration_id]
    return {"status": 200, "data": {"message": f"Integration {integration_id} successfully disconnected."}}
