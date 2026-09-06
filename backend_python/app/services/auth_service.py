import time
from typing import Dict, Any, Optional
from app.db.database import db
from app.core.security import hash_password, verify_password, create_jwt_token

class AuthService:
    @staticmethod
    def login(email: str, password: str) -> Optional[Dict[str, Any]]:
        user = next((u for u in db.users.values() if u.get("email", "").lower() == email.lower()), None)
        if not user or not verify_password(password, user.get("passwordHash", "")):
            return None

        membership = next((m for m in db.memberships.values() if m.get("userId") == user["id"]), None)
        company_id = membership["companyId"] if membership else "comp-techflow"
        role = membership["role"] if membership else "owner"
        token = create_jwt_token(user["id"], company_id, role)

        return {
            "user": {
                "id": user["id"],
                "email": user["email"],
                "fullName": user["fullName"],
                "avatarUrl": user.get("avatarUrl")
            },
            "companyId": company_id,
            "role": role,
            "token": token
        }

    @staticmethod
    def signup(full_name: str, email: str, password: str, company_name: str, industry: str, plan_id: str = "starter") -> Dict[str, Any]:
        user_id = f"usr-{int(time.time() * 1000)}"
        company_id = f"comp-{int(time.time() * 1000)}"

        new_user = {
            "id": user_id,
            "email": email,
            "passwordHash": hash_password(password),
            "fullName": full_name,
            "isEmailVerified": True,
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }

        new_company = {
            "id": company_id,
            "name": company_name,
            "slug": company_name.lower().replace(" ", "-"),
            "domain": f"{company_name.lower().replace(' ', '')}.com",
            "industry": industry,
            "planId": plan_id,
            "billingCycle": "monthly",
            "planStatus": "active",
            "isSuspended": False,
            "apiKey": f"aas_live_{company_id}",
            "apiSecretEncrypted": f"enc_kms_sec_{company_id}",
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }

        agent_id = f"agent-{company_id}"
        version_id = f"ver-{company_id}-v1"

        new_version = {
            "id": version_id,
            "agentId": agent_id,
            "companyId": company_id,
            "versionNumber": 1,
            "status": "published",
            "systemInstructions": f"You are the official single AI agent for {company_name}.",
            "greetingMessage": f"Hello! Welcome to {company_name}. How may I help you?",
            "fallbackMessage": "I do not have verified knowledge on this topic. Connecting you to support.",
            "tone": "professional",
            "allowedActionIds": [],
            "escalationSettings": {
                "enabled": True,
                "triggerKeywords": ["human", "escalate", "agent", "support"],
                "maxUnansweredQueriesBeforeEscalation": 2,
                "notifyEmail": f"support@{new_company['domain']}",
                "escalationMessage": "Transferring you to a live support representative.",
                "requireHumanApprovalForRefund": True
            },
            "customSafetyRules": ["Never fabricate policies or figures."],
            "publishedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }

        new_agent = {
            "id": agent_id,
            "companyId": company_id,
            "name": f"{company_name} AI Assistant",
            "description": f"Autonomous AI Q&A assistant for {company_name}.",
            "avatarUrl": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe",
            "status": "active",
            "tone": "professional",
            "activeVersionId": version_id,
            "draftVersionId": version_id,
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }

        db.users[user_id] = new_user
        db.companies[company_id] = new_company
        db.agents[agent_id] = new_agent
        db.agent_versions[version_id] = new_version
        db.memberships[f"mem-{user_id}"] = {
            "id": f"mem-{user_id}",
            "userId": user_id,
            "companyId": company_id,
            "role": "owner",
            "status": "active"
        }

        token = create_jwt_token(user_id, company_id, "owner")
        return {
            "user": new_user,
            "company": new_company,
            "agent": new_agent,
            "token": token
        }
