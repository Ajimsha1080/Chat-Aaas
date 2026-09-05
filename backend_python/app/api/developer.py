import time
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.db.database import db
from app.core.tenant import TenantContext, get_tenant_context
from app.core.permissions import has_permission

router = APIRouter(prefix="/developer", tags=["Developer Platform & API Keys"])

class CreateApiKeyRequest(BaseModel):
    keyName: str
    scopes: Optional[list] = ["chat:read", "chat:write"]

class CreateWebhookRequest(BaseModel):
    targetUrl: str
    events: list
    description: Optional[str] = "Webhook endpoint"

@router.get("/api-keys")
def get_api_keys(ctx: TenantContext = Depends(get_tenant_context)):
    if not has_permission(ctx.role, "developer:manage"):
        raise HTTPException(status_code=403, detail="Forbidden: Developer privilege required.")
    keys = [k for k in db.api_keys.values() if k.get("companyId") == ctx.company_id]
    return {"status": 200, "data": {"apiKeys": keys}}

@router.post("/api-keys")
def create_api_key(req: CreateApiKeyRequest, ctx: TenantContext = Depends(get_tenant_context)):
    if not has_permission(ctx.role, "developer:manage"):
        raise HTTPException(status_code=403, detail="Forbidden: Developer privilege required.")

    key_id = f"key-{int(time.time() * 1000)}"
    new_key = {
        "id": key_id,
        "companyId": ctx.company_id,
        "name": req.keyName,
        "keyPrefix": f"aas_{key_id[:8]}",
        "secretMasked": f"aas_live_{key_id[:6]}...{int(time.time()) % 1000}",
        "scopes": req.scopes,
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }
    db.api_keys[key_id] = new_key
    return {"status": 201, "data": new_key}

@router.get("/webhooks")
def get_webhooks(ctx: TenantContext = Depends(get_tenant_context)):
    if not has_permission(ctx.role, "developer:manage"):
        raise HTTPException(status_code=403, detail="Forbidden: Developer privilege required.")
    webhooks = [w for w in db.webhooks.values() if w.get("companyId") == ctx.company_id]
    return {"status": 200, "data": {"webhooks": webhooks}}

@router.post("/webhooks")
def create_webhook(req: CreateWebhookRequest, ctx: TenantContext = Depends(get_tenant_context)):
    if not has_permission(ctx.role, "developer:manage"):
        raise HTTPException(status_code=403, detail="Forbidden: Developer privilege required.")

    hook_id = f"hook-{int(time.time() * 1000)}"
    new_hook = {
        "id": hook_id,
        "companyId": ctx.company_id,
        "targetUrl": req.targetUrl,
        "events": req.events,
        "description": req.description,
        "status": "active",
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }
    db.webhooks[hook_id] = new_hook
    return {"status": 201, "data": new_hook}
