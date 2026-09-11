import time
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.db.database import db
from app.core.tenant import TenantContext, get_tenant_context
from app.core.config import settings

router = APIRouter(prefix="/deployments", tags=["Deployments & Web Widget"])

class UpdateWidgetConfigRequest(BaseModel):
    primaryColor: Optional[str] = "#4f46e5"
    position: Optional[str] = "bottom-right"
    headerTitle: Optional[str] = "Chat with AI Specialist"
    welcomeMessage: Optional[str] = None
    suggestedQuestions: Optional[list] = None

@router.get("/widget-config")
def get_widget_configuration(ctx: TenantContext = Depends(get_tenant_context)):
    company = db.companies.get(ctx.company_id) or {}
    agent = db.get_agent_for_company(ctx.company_id) or {}
    ver = db.agent_versions.get(agent.get("activeVersionId", ""), {})

    script_snippet = f"""<script 
  src="https://coarai.com/widget/embed.js" 
  data-company-id="{ctx.company_id}" 
  data-position="bottom-right" 
  async>
</script>"""

    iframe_snippet = f"""<iframe 
  src="https://coarai.com/widget/{ctx.company_id}" 
  width="400" 
  height="600" 
  frameborder="0">
</iframe>"""

    return {
        "status": 200,
        "data": {
            "companyId": ctx.company_id,
            "agentName": agent.get("name", "AI Specialist"),
            "greeting": ver.get("greetingMessage", "Hello! How can I help you today?"),
            "embedScript": script_snippet,
            "iframeEmbed": iframe_snippet,
            "widgetSettings": company.get("settings", {}).get("widget", {
                "primaryColor": "#4f46e5",
                "position": "bottom-right",
                "headerTitle": agent.get("name", "AI Specialist"),
                "suggestedQuestions": [
                    "What are your enterprise SLAs?",
                    "How does billing work?",
                    "Can I talk to human support?"
                ]
            })
        }
    }

@router.put("/widget-config")
def update_widget_configuration(req: UpdateWidgetConfigRequest, ctx: TenantContext = Depends(get_tenant_context)):
    company = db.companies.get(ctx.company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    if "settings" not in company:
        company["settings"] = {}

    company["settings"]["widget"] = req.model_dump(exclude_unset=True)
    return {"status": 200, "data": {"widgetSettings": company["settings"]["widget"]}}

# ================= LIFECYCLE DEPLOYMENT MANAGEMENT ================= #

class CreateDeploymentRequest(BaseModel):
    name: str
    channel: str = "website_widget"  # website_widget, react_iframe, rest_api, webhook, mobile_sdk
    domain: Optional[str] = None
    config: Optional[dict] = None

@router.get("")
def list_deployments(ctx: TenantContext = Depends(get_tenant_context)):
    """Lists all configured deployment channels and their live status for tenant."""
    deps = db.get_deployments_for_tenant(ctx.company_id)
    return {"status": 200, "data": {"deployments": deps, "total": len(deps)}}

@router.post("", status_code=status.HTTP_201_CREATED)
def create_deployment(req: CreateDeploymentRequest, ctx: TenantContext = Depends(get_tenant_context)):
    """Creates a new deployment channel for the assistant."""
    dep_id = f"dep-{ctx.company_id}-{len(db.deployments) + 1}"
    agent = db.get_agent_for_company(ctx.company_id) or {}
    new_dep = {
        "id": dep_id,
        "companyId": ctx.company_id,
        "name": req.name,
        "channel": req.channel,
        "status": "active",
        "assistantVersion": f"v{agent.get('publishedVersionNumber', 1)}",
        "domain": req.domain or f"app.{ctx.company_id}.io",
        "config": req.config or {},
        "lastActiveAt": "Just now",
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }
    db.deployments[dep_id] = new_dep
    return {"status": 201, "data": new_dep}

@router.post("/{deployment_id}/disable")
def disable_deployment(deployment_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    """Temporarily disables an active deployment without modifying or deleting the assistant."""
    dep = db.deployments.get(deployment_id)
    if not dep or dep.get("companyId") != ctx.company_id:
        raise HTTPException(status_code=404, detail="Deployment channel not found.")

    dep["status"] = "disabled"
    dep["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
    return {"status": 200, "data": {"deployment": dep, "message": f"Deployment '{dep.get('name')}' disabled."}}

@router.post("/{deployment_id}/enable")
def enable_deployment(deployment_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    """Re-enables a disabled deployment channel."""
    dep = db.deployments.get(deployment_id)
    if not dep or dep.get("companyId") != ctx.company_id:
        raise HTTPException(status_code=404, detail="Deployment channel not found.")

    dep["status"] = "active"
    dep["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
    return {"status": 200, "data": {"deployment": dep, "message": f"Deployment '{dep.get('name')}' enabled."}}

@router.delete("/{deployment_id}")
def remove_deployment(deployment_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    """Removes a deployment channel from the workspace without affecting the assistant."""
    dep = db.deployments.get(deployment_id)
    if not dep or dep.get("companyId") != ctx.company_id:
        raise HTTPException(status_code=404, detail="Deployment channel not found.")

    del db.deployments[deployment_id]
    return {"status": 200, "data": {"message": f"Deployment '{dep.get('name')}' removed successfully."}}

