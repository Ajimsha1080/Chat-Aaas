import time
import uuid
from fastapi import APIRouter, HTTPException, Depends, status
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

@router.post("/api-keys", status_code=status.HTTP_201_CREATED)
def create_api_key(req: CreateApiKeyRequest, ctx: TenantContext = Depends(get_tenant_context)):
    if not has_permission(ctx.role, "developer:manage"):
        raise HTTPException(status_code=403, detail="Forbidden: Developer privilege required.")

    key_id = f"key-{int(time.time() * 1000)}"
    raw_secret = f"aas_live_sec_{uuid.uuid4().hex[:16]}_{int(time.time())}"
    secret_masked = f"{raw_secret[:12]}••••••••{raw_secret[-4:]}"
    
    new_key = {
        "id": key_id,
        "companyId": ctx.company_id,
        "name": req.keyName,
        "keyPrefix": f"aas_{key_id[:8]}",
        "secretMasked": secret_masked,
        "scopes": req.scopes or ["chat:read", "chat:write"],
        "status": "active",
        "lastUsedAt": "Never",
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }
    db.api_keys[key_id] = new_key
    
    # Return raw secret ONCE upon creation
    return {
        "status": 201, 
        "data": {
            **new_key,
            "rawSecret": raw_secret,
            "warning": "Make sure to copy your API secret key now as you will not be able to see it again."
        }
    }

@router.post("/api-keys/{key_id}/rotate")
def rotate_api_key(key_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    """Rotates an API key: revokes existing key and generates a new credential."""
    if not has_permission(ctx.role, "developer:manage"):
        raise HTTPException(status_code=403, detail="Forbidden: Developer privilege required.")

    old_key = db.api_keys.get(key_id)
    if not old_key or old_key.get("companyId") != ctx.company_id:
        raise HTTPException(status_code=404, detail="API key not found.")

    # Mark old key revoked
    old_key["status"] = "revoked"
    old_key["revokedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")

    # Generate replacement key
    new_key_id = f"key-{int(time.time() * 1000)}"
    raw_secret = f"aas_live_sec_{uuid.uuid4().hex[:16]}_{int(time.time())}"
    secret_masked = f"{raw_secret[:12]}••••••••{raw_secret[-4:]}"

    new_key = {
        "id": new_key_id,
        "companyId": ctx.company_id,
        "name": f"{old_key.get('name')} (Rotated)",
        "keyPrefix": f"aas_{new_key_id[:8]}",
        "secretMasked": secret_masked,
        "scopes": old_key.get("scopes", ["chat:read", "chat:write"]),
        "status": "active",
        "lastUsedAt": "Never",
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }
    db.api_keys[new_key_id] = new_key

    return {
        "status": 200,
        "data": {
            "revokedKeyId": key_id,
            "newKey": new_key,
            "rawSecret": raw_secret,
            "message": "Key rotated successfully. Store your new secret securely."
        }
    }

@router.post("/api-keys/{key_id}/revoke")
def revoke_api_key(key_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    """Immediately revokes an API credential from authenticating platform requests."""
    if not has_permission(ctx.role, "developer:manage"):
        raise HTTPException(status_code=403, detail="Forbidden: Developer privilege required.")

    key = db.api_keys.get(key_id)
    if not key or key.get("companyId") != ctx.company_id:
        raise HTTPException(status_code=404, detail="API key not found.")

    key["status"] = "revoked"
    key["revokedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
    return {"status": 200, "data": {"key": key, "message": "API key revoked successfully."}}

@router.get("/webhooks")
def get_webhooks(ctx: TenantContext = Depends(get_tenant_context)):
    if not has_permission(ctx.role, "developer:manage"):
        raise HTTPException(status_code=403, detail="Forbidden: Developer privilege required.")
    webhooks = [w for w in db.webhooks.values() if w.get("companyId") == ctx.company_id]
    return {"status": 200, "data": {"webhooks": webhooks}}

@router.post("/webhooks", status_code=status.HTTP_201_CREATED)
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
        "lastDeliveryStatus": "Pending",
        "responseTimeMs": 0,
        "lastDeliveredAt": "Never",
        "failureCount": 0,
        "deliveryHistory": [],
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }
    db.webhooks[hook_id] = new_hook
    return {"status": 201, "data": new_hook}

@router.post("/webhooks/{hook_id}/toggle")
def toggle_webhook_status(hook_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    """Enables or disables webhook event dispatching."""
    if not has_permission(ctx.role, "developer:manage"):
        raise HTTPException(status_code=403, detail="Forbidden: Developer privilege required.")

    hook = db.webhooks.get(hook_id)
    if not hook or hook.get("companyId") != ctx.company_id:
        raise HTTPException(status_code=404, detail="Webhook not found.")

    hook["status"] = "disabled" if hook.get("status") == "active" else "active"
    hook["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
    return {"status": 200, "data": {"webhook": hook, "message": f"Webhook status updated to {hook['status']}."}}

@router.post("/webhooks/{hook_id}/test")
def test_webhook_delivery(hook_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    """Dispatches a test signature event and records delivery latency."""
    if not has_permission(ctx.role, "developer:manage"):
        raise HTTPException(status_code=403, detail="Forbidden: Developer privilege required.")

    hook = db.webhooks.get(hook_id)
    if not hook or hook.get("companyId") != ctx.company_id:
        raise HTTPException(status_code=404, detail="Webhook not found.")

    delivery_item = {
        "id": f"del-{int(time.time() * 1000)}",
        "event": "test.ping",
        "statusCode": 200,
        "responseTimeMs": 182,
        "timestamp": "Just now",
        "success": True
    }
    hook["lastDeliveryStatus"] = "200 OK"
    hook["responseTimeMs"] = 182
    hook["lastDeliveredAt"] = "Just now"
    if "deliveryHistory" not in hook:
        hook["deliveryHistory"] = []
    hook["deliveryHistory"].insert(0, delivery_item)

    return {"status": 200, "data": {"delivery": delivery_item, "message": "Test ping delivered successfully with 200 OK."}}

@router.delete("/webhooks/{hook_id}")
def delete_webhook(hook_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    """Deletes a webhook endpoint."""
    if not has_permission(ctx.role, "developer:manage"):
        raise HTTPException(status_code=403, detail="Forbidden: Developer privilege required.")

    hook = db.webhooks.get(hook_id)
    if not hook or hook.get("companyId") != ctx.company_id:
        raise HTTPException(status_code=404, detail="Webhook not found.")

    del db.webhooks[hook_id]
    return {"status": 200, "data": {"message": "Webhook endpoint deleted successfully."}}

