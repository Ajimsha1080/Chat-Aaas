from fastapi import APIRouter, HTTPException, Depends
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
  src="https://chat-aaas.com/widget/embed.js" 
  data-company-id="{ctx.company_id}" 
  data-position="bottom-right" 
  async>
</script>"""

    iframe_snippet = f"""<iframe 
  src="https://chat-aaas.com/widget/{ctx.company_id}" 
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
