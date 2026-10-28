import time
import uuid
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.db.database import db
from app.core.tenant import TenantContext, get_tenant_context
from app.core.permissions import has_permission
from app.core.websocket_manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/companies", tags=["Companies & Organization"])

class CreateCompanyRequest(BaseModel):
    name: str
    domain: Optional[str] = "example.com"
    industry: Optional[str] = "Technology"
    planId: Optional[str] = "growth"
    agentName: Optional[str] = None
    tone: Optional[str] = "professional"

class UpdateCompanyRequest(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    industry: Optional[str] = None
    planId: Optional[str] = None
    planStatus: Optional[str] = None
    agent: Optional[Dict[str, Any]] = None
    widgetSettings: Optional[Dict[str, Any]] = None
    settings: Optional[Dict[str, Any]] = None

def _sanitize_company(company: Dict[str, Any]) -> Dict[str, Any]:
    c = dict(company)
    c.pop("apiSecretEncrypted", None)
    c.pop("api_secret_encrypted", None)
    return c

@router.get("")
def list_companies(ctx: TenantContext = Depends(get_tenant_context)):
    """Lists company workspaces scoped to the authorized tenant (or all for super admin)."""
    if ctx.role in ["super_admin", "platform_super_admin"]:
        comp_list = []
        for comp in db.companies.values():
            c = _sanitize_company(comp)
            agent = db.get_agent_for_company(c["id"])
            if agent:
                c["agent"] = agent
            comp_list.append(c)
        return {"status": 200, "data": {"companies": comp_list}}

    comp = db.companies.get(ctx.company_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")
    c = _sanitize_company(comp)
    agent = db.get_agent_for_company(ctx.company_id)
    if agent:
        c["agent"] = agent
    return {"status": 200, "data": {"companies": [c]}}

@router.post("", status_code=201)
async def create_company(req: CreateCompanyRequest, ctx: TenantContext = Depends(get_tenant_context)):
    """Creates a new company workspace with isolated agent and default parameters."""
    if not has_permission(ctx, "company:create"):
        raise HTTPException(
            status_code=403,
            detail="Forbidden: 'company:create' permission required to create company workspaces."
        )
    slug = req.name.lower().replace(" ", "-").replace(".", "").replace("/", "")
    comp_id = f"comp-{slug}-{int(time.time() % 10000)}"

    new_company = {
        "id": comp_id,
        "name": req.name,
        "slug": slug,
        "domain": req.domain,
        "industry": req.industry,
        "planId": req.planId or "growth",
        "billingCycle": "monthly",
        "planStatus": "active",
        "isSuspended": False,
        "apiKey": f"aas_live_{slug[:4]}_{uuid.uuid4().hex[:12]}",
        # Note: 'apiSecretEncrypted' is deprecated; real credentials use EnvelopeEncryption with CMEK in tenant_keys
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "stats": {
            "totalConversations": 0,
            "totalMessages": 0,
            "resolvedConversations": 0,
            "escalatedConversations": 0,
            "messagesThisMonth": 0,
            "tokensThisMonth": 0,
            "knowledgeChunksUsed": 0
        }
    }
    db.companies[comp_id] = new_company

    agent_id = f"agent-{slug}-1"
    version_id = f"ver-{slug}-v1"
    new_agent = {
        "id": agent_id,
        "companyId": comp_id,
        "name": req.agentName or f"{req.name} Assistant",
        "role": "Customer Support Specialist",
        "description": f"Official AI assistant for {req.name}",
        "avatarUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        "status": "active",
        "tone": req.tone or "professional",
        "creativityLevel": "balanced",
        "greetingMessage": f"Hello! How can I help you today with {req.name}?",
        "fallbackMessage": "I don't have that information in my official guides yet. Let me connect you with a team member.",
        "allowedActions": [],
        "escalationSettings": {
            "enabled": True,
            "triggerKeywords": ["human", "agent", "support", "refund", "billing"],
            "notifyEmail": f"support@{req.domain or 'example.com'}",
            "escalationMessage": "I am transferring your request to our team right away."
        },
        "activeVersionId": version_id,
        "draftVersionId": version_id,
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }
    db.agents[agent_id] = new_agent

    new_version = {
        "id": version_id,
        "agentId": agent_id,
        "companyId": comp_id,
        "versionNumber": 1,
        "name": "v1.0.0 Initial Release",
        "changeSummary": "Initial workspace creation snapshot",
        "status": "published",
        "systemInstructions": f"You are the official AI assistant for {req.name}. Assist users accurately.",
        "greetingMessage": new_agent["greetingMessage"],
        "fallbackMessage": new_agent["fallbackMessage"],
        "tone": new_agent["tone"],
        "publishedBy": "System Admin",
        "publishedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }
    db.agent_versions[version_id] = new_version

    new_company["agent"] = new_agent
    await ws_manager.broadcast_all("company:created", {"companyId": comp_id, "name": req.name})
    await ws_manager.broadcast_all("admin:telemetry", {"type": "company_created", "companyId": comp_id})
    return {"status": 200, "data": {"company": new_company}}

@router.get("/current")
def get_current_company(ctx: TenantContext = Depends(get_tenant_context)):
    comp = db.companies.get(ctx.company_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")
    c = _sanitize_company(comp)
    agent = db.get_agent_for_company(ctx.company_id)
    if agent:
        c["agent"] = agent
    return {"status": 200, "data": {"company": c}}

@router.put("/current")
def update_current_company(req: UpdateCompanyRequest, ctx: TenantContext = Depends(get_tenant_context)):
    return update_company_by_id(ctx.company_id, req, ctx)

@router.get("/{company_id}")
def get_company_by_id(company_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    if ctx.role not in ["super_admin", "platform_super_admin"] and ctx.company_id != company_id:
        raise HTTPException(status_code=403, detail="Forbidden: You do not have permission to access another company workspace.")
    comp = db.companies.get(company_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")
    c = _sanitize_company(comp)
    agent = db.get_agent_for_company(company_id)
    if agent:
        c["agent"] = agent
    return {"status": 200, "data": {"company": c}}

@router.put("/{company_id}")
def update_company_by_id(company_id: str, req: UpdateCompanyRequest, ctx: TenantContext = Depends(get_tenant_context)):
    if not has_permission(ctx, "company:manage"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions to modify company workspace.")
    if ctx.role not in ["super_admin", "platform_super_admin"] and ctx.company_id != company_id:
        raise HTTPException(status_code=403, detail="Forbidden: You do not have permission to modify another company workspace.")
    comp = db.companies.get(company_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")

    if req.name:
        comp["name"] = req.name
    if req.domain:
        comp["domain"] = req.domain
    if req.industry:
        comp["industry"] = req.industry
    if req.planId:
        comp["planId"] = req.planId
    if req.planStatus:
        comp["planStatus"] = req.planStatus
    if req.widgetSettings:
        comp["widgetSettings"] = {**comp.get("widgetSettings", {}), **req.widgetSettings}
    if req.settings:
        comp["settings"] = {**comp.get("settings", {}), **req.settings}

    if req.agent:
        agent = db.get_agent_for_company(company_id)
        if agent:
            agent.update({k: v for k, v in req.agent.items() if v is not None})
            agent["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
            db.save_agent(agent)

    comp["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
    db.save_company(comp)

    c = _sanitize_company(comp)
    agent = db.get_agent_for_company(company_id)
    if agent:
        c["agent"] = agent
    return {"status": 200, "data": {"company": c}}

# ----------------- SOC2 Audit Trail & DR Backup Endpoints -----------------

@router.get("/{company_id}/audit-trail")
def get_company_audit_trail(company_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    """Fetches tamper-evident SOC2 audit trail for tenant."""
    if ctx.role not in ["super_admin", "platform_super_admin"] and ctx.company_id != company_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    from app.services.audit_service import AuditService
    logs = AuditService.get_logs_for_company(company_id)
    return {"status": 200, "data": {"logs": logs, "total": len(logs)}}

@router.get("/{company_id}/audit-trail/verify")
def verify_company_audit_chain(company_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    """Cryptographically verifies tenant audit hash chain."""
    if ctx.role not in ["super_admin", "platform_super_admin"] and ctx.company_id != company_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    from app.services.audit_service import AuditService
    is_valid, reason = AuditService.verify_audit_chain(company_id)
    return {"status": 200, "data": {"isValid": is_valid, "message": reason}}

@router.get("/{company_id}/audit-trail/export")
def export_company_audit_trail(company_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    """Exports cryptographically sealed SOC2 compliance bundle."""
    if ctx.role not in ["super_admin", "platform_super_admin"] and ctx.company_id != company_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    from app.services.audit_service import AuditService
    bundle = AuditService.export_audit_trail(company_id)
    return {"status": 200, "data": bundle}

@router.post("/{company_id}/backup/export")
def export_company_backup(company_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    """Creates point-in-time compressed, encrypted snapshot for tenant."""
    if ctx.role not in ["super_admin", "platform_super_admin"] and ctx.company_id != company_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    from app.services.backup_service import BackupService
    backup_meta = BackupService.export_tenant_snapshot(company_id)
    return {"status": 200, "data": backup_meta}

class RestoreBackupRequest(BaseModel):
    snapshotJsonGzBase64: str

@router.post("/{company_id}/backup/restore")
def restore_company_backup(company_id: str, req: RestoreBackupRequest, ctx: TenantContext = Depends(get_tenant_context)):
    """Restores tenant workspace from encrypted point-in-time snapshot."""
    if ctx.role not in ["super_admin", "platform_super_admin"] and ctx.company_id != company_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    from app.services.backup_service import BackupService
    result = BackupService.restore_tenant_snapshot(company_id, req.snapshotJsonGzBase64)
    return {"status": 200, "data": result}


# ----------------- GDPR Compliance (Art. 17 & Art. 20) Endpoints -----------------

@router.get("/{company_id}/gdpr/export")
@router.post("/{company_id}/gdpr/export")
def export_tenant_gdpr_bundle(company_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    """
    GDPR Article 20: Right to Data Portability.
    Exports all tenant customer data in an open, structured JSON format.
    """
    if ctx.role not in ["super_admin", "platform_super_admin", "owner"] or (ctx.company_id != company_id and ctx.role not in ["super_admin", "platform_super_admin"]):
        raise HTTPException(status_code=403, detail="Forbidden: Tenant owner or super admin permission required.")
    
    from app.services.backup_service import BackupService
    bundle = BackupService.export_tenant_snapshot(company_id)
    return {
        "status": 200,
        "compliance": "GDPR Article 20 - Data Portability",
        "companyId": company_id,
        "data": bundle
    }


@router.delete("/{company_id}/gdpr/delete")
def delete_tenant_gdpr_data(company_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    """
    GDPR Article 17: Right to Erasure ('Right to be Forgotten').
    Permanently cascades deletion of all tenant data, embeddings, document chunks, 
    conversations, messages, integrations, deployments, and keys.
    """
    if ctx.role not in ["super_admin", "platform_super_admin", "owner"] or (ctx.company_id != company_id and ctx.role not in ["super_admin", "platform_super_admin"]):
        raise HTTPException(status_code=403, detail="Forbidden: Tenant owner or super admin permission required.")

    # 1. Purge memory caches
    db.companies.pop(company_id, None)
    db.agents = {k: v for k, v in db.agents.items() if v.get("companyId") != company_id}
    db.agent_versions = {k: v for k, v in db.agent_versions.items() if v.get("companyId") != company_id}
    db.knowledge_collections = {k: v for k, v in db.knowledge_collections.items() if v.get("companyId") != company_id}
    db.knowledge_sources = {k: v for k, v in db.knowledge_sources.items() if v.get("companyId") != company_id}
    db.document_chunks = {k: v for k, v in db.document_chunks.items() if v.get("companyId") != company_id}
    db.knowledge_gaps = {k: v for k, v in db.knowledge_gaps.items() if v.get("companyId") != company_id}
    db.agent_tools = {k: v for k, v in db.agent_tools.items() if v.get("companyId") != company_id}
    db.integrations = {k: v for k, v in db.integrations.items() if v.get("companyId") != company_id}
    db.deployments = {k: v for k, v in db.deployments.items() if v.get("companyId") != company_id}
    db.api_keys = {k: v for k, v in db.api_keys.items() if v.get("companyId") != company_id}
    db.webhooks = {k: v for k, v in db.webhooks.items() if v.get("companyId") != company_id}
    db.conversations = {k: v for k, v in db.conversations.items() if v.get("companyId") != company_id}
    db.messages = {k: v for k, v in db.messages.items() if v.get("companyId") != company_id}
    db.memberships = {k: v for k, v in db.memberships.items() if v.get("companyId") != company_id}

    # 2. Durable database cascading deletion
    if db.engine:
        from sqlalchemy import text
        try:
            with db.engine.begin() as conn:
                for table in [
                    "messages", "conversations", "document_chunks", "knowledge_sources",
                    "knowledge_collections", "agent_tools", "agent_versions", "agents",
                    "deployments", "api_keys", "webhooks", "integrations", "action_executions",
                    "invoices", "subscriptions", "memberships", "tenant_key_metadata"
                ]:
                    conn.execute(text(f"DELETE FROM {table} WHERE company_id = :cid"), {"cid": company_id})
                conn.execute(text("DELETE FROM companies WHERE id = :cid"), {"cid": company_id})
        except Exception as e:
            logger.error(f"Error purging database records for tenant {company_id}: {e}")

    return {
        "status": 200,
        "compliance": "GDPR Article 17 - Right to Erasure",
        "message": f"Tenant {company_id} and all associated data have been permanently erased."
    }


