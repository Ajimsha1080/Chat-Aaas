import json
import time
import uuid
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.db.database import db
from app.core.tenant import TenantContext, get_tenant_context
from app.core.permissions import has_permission
from app.core.envelope_encryption import EnvelopeEncryption

router = APIRouter(prefix="/integrations", tags=["Integrations & Connectors"])

class ConnectIntegrationRequest(BaseModel):
    provider: str  # slack, whatsapp, hubspot, salesforce, webhook, email, zendesk
    name: str
    credentials: Dict[str, Any]
    config: Optional[Dict[str, Any]] = {}

@router.get("")
def list_integrations(ctx: TenantContext = Depends(get_tenant_context)):
    integrations = db.get_integrations_for_company(ctx.company_id)

    # Return masked representation
    masked = []
    for item in integrations:
        masked.append({
            "id": item["id"],
            "provider": item["provider"],
            "name": item.get("name", item["provider"].title()),
            "status": item.get("status", "connected"),
            "config": item.get("config", {}),
            "connectedAt": item.get("connectedAt"),
            "createdAt": item.get("createdAt")
        })
    return {"status": 200, "data": {"integrations": masked}}

@router.post("/connect")
def connect_integration(req: ConnectIntegrationRequest, ctx: TenantContext = Depends(get_tenant_context)):
    if not has_permission(ctx, "integration:manage"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions to manage integrations.")

    if not req.credentials:
        raise HTTPException(status_code=400, detail="Credentials cannot be empty.")

    # Unique connection ID supporting multiple connections per provider
    int_id = f"int-{ctx.company_id}-{req.provider}-{uuid.uuid4().hex[:8]}"
    raw_creds = json.dumps(req.credentials) if isinstance(req.credentials, dict) else str(req.credentials)
    encrypted = EnvelopeEncryption.encrypt_for_tenant(company_id=ctx.company_id, plain_data=raw_creds)

    record = {
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
    db.save_integration(record)

    return {
        "status": 200,
        "data": {
            "id": int_id,
            "provider": req.provider,
            "name": req.name,
            "status": "connected",
            "connectedAt": record["connectedAt"]
        }
    }

@router.post("/{integration_id}/test")
def test_integration_connection(integration_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    if not has_permission(ctx, "integration:manage"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions to test integrations.")

    item = db.integrations.get(integration_id)
    if not item or item.get("companyId") != ctx.company_id:
        raise HTTPException(status_code=404, detail="Integration not found")

    provider = item.get("provider", "").lower()
    config = item.get("config") or {}
    t0 = time.perf_counter()
    status_label = "operational"
    details = {}

    import httpx
    from app.services.crawler_service import CrawlerService

    try:
        if provider == "slack":
            bot_token = config.get("botToken") or config.get("token") or config.get("apiKey")
            headers = {"Authorization": f"Bearer {bot_token}"} if bot_token else {}
            with httpx.Client(timeout=4.0) as client:
                resp = client.get("https://slack.com/api/api.test", headers=headers)
                latency_ms = round((time.perf_counter() - t0) * 1000, 2)
                is_ok = resp.status_code == 200 and resp.json().get("ok", False) if resp.status_code == 200 else False
                status_label = "operational" if is_ok else "failed"
                details = {
                    "ok": is_ok,
                    "provider": "slack",
                    "statusCode": resp.status_code,
                    "providerResponse": resp.json() if resp.status_code == 200 else {"error": resp.text[:200]}
                }
        elif provider in ["webhook", "custom_webhook"]:
            target_url = config.get("url") or config.get("webhookUrl")
            if target_url:
                is_safe, err_msg, resolved_ip, port, path_str, host, scheme = CrawlerService.resolve_and_validate_target(target_url)
                if not is_safe:
                    status_label = "failed"
                    latency_ms = round((time.perf_counter() - t0) * 1000, 2)
                    details = {"error": f"Security restriction: {err_msg}", "target_url": target_url}
                else:
                    with httpx.Client(timeout=4.0) as client:
                        resp = client.post(
                            target_url,
                            json={"event": "ping", "integrationId": integration_id, "timestamp": time.time()},
                            headers={"User-Agent": "CoarAI-Integration-Probe/2.0"}
                        )
                        latency_ms = round((time.perf_counter() - t0) * 1000, 2)
                        status_label = "operational" if resp.is_success or resp.status_code == 405 else "degraded"
                        details = {"statusCode": resp.status_code, "target_url": target_url}
            else:
                status_label = "unconfigured"
                latency_ms = round((time.perf_counter() - t0) * 1000, 2)
                details = {"error": "Missing webhook target URL in configuration"}
        elif provider == "hubspot":
            api_key = config.get("apiKey") or config.get("accessToken")
            if api_key:
                with httpx.Client(timeout=4.0) as client:
                    resp = client.get("https://api.hubapi.com/crm/v3/owners/", headers={"Authorization": f"Bearer {api_key}"})
                    latency_ms = round((time.perf_counter() - t0) * 1000, 2)
                    status_label = "operational" if resp.is_success else "failed"
                    details = {"statusCode": resp.status_code, "provider": "hubspot"}
            else:
                status_label = "unconfigured"
                latency_ms = round((time.perf_counter() - t0) * 1000, 2)
                details = {"error": "Missing HubSpot API Key or Access Token"}
        elif provider == "zendesk":
            subdomain = config.get("subdomain")
            if subdomain:
                with httpx.Client(timeout=4.0) as client:
                    resp = client.get(f"https://{subdomain}.zendesk.com/api/v2/ping.json")
                    latency_ms = round((time.perf_counter() - t0) * 1000, 2)
                    status_label = "operational" if resp.is_success else "failed"
                    details = {"statusCode": resp.status_code, "provider": "zendesk"}
            else:
                status_label = "unconfigured"
                latency_ms = round((time.perf_counter() - t0) * 1000, 2)
                details = {"error": "Missing Zendesk subdomain"}
        else:
            status_label = "unsupported_provider"
            latency_ms = round((time.perf_counter() - t0) * 1000, 2)
            details = {"error": f"No native connection verifier implemented for provider '{provider}'"}
    except Exception as exc:
        latency_ms = round((time.perf_counter() - t0) * 1000, 2)
        status_label = "failed"
        details = {"error": str(exc)}

    if latency_ms <= 0:
        latency_ms = round(max(1.0, (time.perf_counter() - t0) * 1000), 2)

    return {
        "status": 200,
        "data": {
            "integrationId": integration_id,
            "provider": item["provider"],
            "status": status_label,
            "latencyMs": latency_ms,
            "details": details,
            "verifiedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }
    }

@router.delete("/{integration_id}")
def disconnect_integration(integration_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    if not has_permission(ctx, "integration:manage"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions to manage integrations.")

    item = db.integrations.get(integration_id)
    if not item or item.get("companyId") != ctx.company_id:
        raise HTTPException(status_code=404, detail="Integration not found")

    db.delete_integration(integration_id, ctx.company_id)
    return {"status": 200, "data": {"message": f"Integration {integration_id} successfully disconnected."}}

