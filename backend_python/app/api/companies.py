import time
import uuid
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from app.db.database import db
from app.core.tenant import TenantContext, get_tenant_context
from app.core.permissions import has_permission

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

def _format_company_response(comp: Dict[str, Any]) -> Dict[str, Any]:
    c = dict(comp)
    cid = c.get("id", "comp-default")
    agent = db.get_agent_for_company(cid)
    if agent:
        c["agent"] = agent
    elif "agent" not in c:
        c["agent"] = {
            "name": f"{c.get('name', 'Company')} Assistant",
            "role": "Customer Support Specialist",
            "status": "active",
            "avatarUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            "description": f"Dedicated AI assistant for {c.get('name', 'Company')}",
            "tone": "professional",
            "creativityLevel": 0.3,
            "systemInstructions": "You are a helpful customer assistant.",
            "businessInstructions": "Answer accurately based on knowledge.",
            "greetingMessage": f"Hello! How can I assist you today at {c.get('name', 'our company')}?",
            "fallbackMessage": "I don't have that information in my guides. Let me connect you with our team.",
            "allowedActions": [],
            "escalationSettings": {
                "enabled": True,
                "triggerKeywords": ["human", "agent", "support", "refund"],
                "maxUnansweredQueriesBeforeEscalation": 2,
                "notifyEmail": f"support@{c.get('domain', 'example.com')}",
                "escalationMessage": "Transferring you to a live support team member now.",
                "requireHumanApprovalForRefund": True
            },
            "customSafetyRules": ["Never fabricate prices"]
        }

    if "widgetSettings" not in c:
        c["widgetSettings"] = {
            "primaryColor": "#4f46e5",
            "secondaryColor": "#0f172a",
            "themeMode": "dark",
            "headerTitle": c.get("name", "Support"),
            "headerSubtitle": "Customer Assistant",
            "launcherText": "Chat with us",
            "position": "bottom_right",
            "botAvatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            "userAvatar": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
            "borderRadius": "rounded-2xl",
            "showPoweredBy": False,
            "enableSound": True,
            "autoExpandSeconds": 0
        }

    if "stats" not in c:
        tenant_convs = [cv for cv in db.conversations.values() if cv.get("companyId") == cid]
        tenant_events = [e for e in db.usage_events if e.get("companyId") == cid]
        c["stats"] = {
            "totalConversations": len(tenant_convs),
            "totalMessages": sum(e.get("quantity", 1) for e in tenant_events if e.get("eventType") == "message"),
            "resolvedConversations": len([cv for cv in tenant_convs if cv.get("status") == "resolved"]),
            "escalatedConversations": len([cv for cv in tenant_convs if cv.get("status") == "escalated_to_human"]),
            "messagesThisMonth": sum(e.get("quantity", 1) for e in tenant_events if e.get("eventType") == "message"),
            "tokensThisMonth": sum(e.get("quantity", 1) for e in tenant_events if e.get("unit") == "tokens"),
            "knowledgeChunksUsed": len([chk for chk in db.document_chunks.values() if chk.get("companyId") == cid])
        }

    return c

@router.get("")
def list_companies():
    """Lists all registered company workspaces."""
    comp_list = [_format_company_response(comp) for comp in db.companies.values()]
    return {"status": 200, "data": {"companies": comp_list}}

@router.post("")
def create_company(req: CreateCompanyRequest):
    """Creates a new company workspace with isolated agent and default parameters."""
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
        "apiSecretEncrypted": f"enc_kms_sec_{slug}_prod",
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
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
    return {"status": 200, "data": {"company": new_company}}

@router.get("/current")
def get_current_company(ctx: TenantContext = Depends(get_tenant_context)):
    comp = db.companies.get(ctx.company_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")
    c = dict(comp)
    agent = db.get_agent_for_company(ctx.company_id)
    if agent:
        c["agent"] = agent
    return {"status": 200, "data": {"company": c}}

@router.put("/current")
def update_current_company(req: UpdateCompanyRequest, ctx: TenantContext = Depends(get_tenant_context)):
    return update_company_by_id(ctx.company_id, req)

@router.get("/{company_id}")
def get_company_by_id(company_id: str):
    comp = db.companies.get(company_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")
    c = dict(comp)
    agent = db.get_agent_for_company(company_id)
    if agent:
        c["agent"] = agent
    return {"status": 200, "data": {"company": c}}

@router.put("/{company_id}")
def update_company_by_id(company_id: str, req: UpdateCompanyRequest):
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

    comp["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
    c = dict(comp)
    agent = db.get_agent_for_company(company_id)
    if agent:
        c["agent"] = agent
    return {"status": 200, "data": {"company": c}}
