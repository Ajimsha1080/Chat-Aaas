import time
from typing import Dict, Any, Optional
from app.db.database import db
from app.core.security import hash_password, verify_password, create_jwt_token, create_refresh_token, decode_jwt_token, revoke_token, revoke_user_sessions

class AuthService:
    @staticmethod
    def login(email: str, password: str) -> Optional[Dict[str, Any]]:
        user = db.get_user_by_email(email)
        if not user or not verify_password(password, user.get("passwordHash", "")):
            return None

        if user.get("isSuspended"):
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is suspended.")

        membership = db.get_membership_for_user(user["id"])
        if not membership:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is not linked to an active workspace company."
            )
        company_id = membership["companyId"]
        role = membership.get("role", "member")
        token = create_jwt_token(user["id"], company_id, role)
        refresh_token = create_refresh_token(user["id"], company_id, role)

        return {
            "user": {
                "id": user["id"],
                "email": user["email"],
                "fullName": user["fullName"],
                "avatarUrl": user.get("avatarUrl")
            },
            "companyId": company_id,
            "role": role,
            "token": token,
            "refreshToken": refresh_token,
            "tokenType": "Bearer",
            "expiresIn": 900
        }

    @staticmethod
    def refresh_session(refresh_token: str) -> Dict[str, Any]:
        payload = decode_jwt_token(refresh_token)
        if not payload or payload.get("token_type") != "refresh":
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token.")

        user_id = payload["sub"]
        company_id = payload["company_id"]
        role = payload.get("role", "member")

        # Rotate refresh token: revoke old one, issue new pair
        old_jti = payload.get("jti")
        if old_jti:
            revoke_token(old_jti)

        new_access = create_jwt_token(user_id, company_id, role)
        new_refresh = create_refresh_token(user_id, company_id, role)

        return {
            "token": new_access,
            "refreshToken": new_refresh,
            "tokenType": "Bearer",
            "expiresIn": 900
        }

    @staticmethod
    def logout(jti: Optional[str], user_id: Optional[str] = None) -> None:
        if jti:
            revoke_token(jti)
        if user_id:
            revoke_user_sessions(user_id)

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

        mem = {
            "id": f"mem-{user_id}",
            "userId": user_id,
            "companyId": company_id,
            "role": "owner",
            "status": "active",
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }

        # Targeted persistent writes to SQL & cache
        db.save_user(new_user)
        db.save_company(new_company)
        db.save_membership(mem)
        db.save_agent(new_agent)
        db.save_agent_version(new_version)

        token = create_jwt_token(user_id, company_id, "owner")
        refresh_token = create_refresh_token(user_id, company_id, "owner")
        return {
            "user": new_user,
            "company": new_company,
            "agent": new_agent,
            "token": token,
            "refreshToken": refresh_token,
            "tokenType": "Bearer",
            "expiresIn": 900
        }
