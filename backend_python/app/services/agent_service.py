import time
from typing import Dict, Any, Optional, List
from app.db.database import db

class AgentService:
    @staticmethod
    def get_agent_for_company(company_id: str) -> Optional[Dict[str, Any]]:
        agent = db.get_agent_for_company(company_id)
        if not agent:
            return None
        active_ver = db.agent_versions.get(agent.get("activeVersionId", ""))
        draft_ver = db.agent_versions.get(agent.get("draftVersionId", ""))
        all_vers = [v for v in db.agent_versions.values() if v.get("agentId") == agent["id"] or v.get("companyId") == company_id]
        all_vers.sort(key=lambda v: v.get("versionNumber", 1), reverse=True)

        return {
            "agent": agent,
            "activeVersion": active_ver,
            "draftVersion": draft_ver,
            "versions": all_vers
        }

    @staticmethod
    def update_draft(company_id: str, draft_data: Dict[str, Any]) -> Dict[str, Any]:
        agent = db.get_agent_for_company(company_id)
        if not agent:
            raise ValueError(f"No agent found for company {company_id}")

        draft_id = agent.get("draftVersionId")
        draft = db.agent_versions.get(draft_id)
        if not draft:
            draft_id = f"ver-{company_id}-draft"
            draft = {
                "id": draft_id,
                "agentId": agent["id"],
                "companyId": company_id,
                "versionNumber": (db.agent_versions.get(agent.get("activeVersionId", {}), {}).get("versionNumber", 1)) + 1,
                "status": "draft",
                "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            }
            agent["draftVersionId"] = draft_id
            db.agent_versions[draft_id] = draft

        # Apply updates
        for key, value in draft_data.items():
            if value is not None:
                draft[key] = value

        draft["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
        return draft

    @staticmethod
    def publish_draft(company_id: str, change_summary: str, user_id: str = "usr-owner") -> Dict[str, Any]:
        agent = db.get_agent_for_company(company_id)
        if not agent:
            raise ValueError(f"No agent found for company {company_id}")

        active_ver = db.agent_versions.get(agent.get("activeVersionId", ""))
        next_ver_num = (active_ver.get("versionNumber", 1) if active_ver else 0) + 1
        draft_ver = db.agent_versions.get(agent.get("draftVersionId", ""))

        new_version_id = f"ver-{company_id}-v{next_ver_num}"
        published_version = {
            **(draft_ver or {}),
            "id": new_version_id,
            "agentId": agent["id"],
            "companyId": company_id,
            "versionNumber": next_ver_num,
            "status": "published",
            "changeSummary": change_summary or f"Version {next_ver_num} release",
            "publishedByUserId": user_id,
            "publishedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }

        db.agent_versions[new_version_id] = published_version
        agent["activeVersionId"] = new_version_id
        agent["draftVersionId"] = new_version_id
        return published_version

    @staticmethod
    def rollback_version(company_id: str, target_version_id: str) -> Dict[str, Any]:
        agent = db.get_agent_for_company(company_id)
        if not agent:
            raise ValueError(f"No agent found for company {company_id}")

        target_ver = db.agent_versions.get(target_version_id)
        if not target_ver or target_ver.get("companyId") != company_id:
            raise ValueError("Target version not found or belongs to another company")

        agent["activeVersionId"] = target_version_id
        agent["draftVersionId"] = target_version_id
        return target_ver
