import time
import uuid
from typing import Dict, Any, Optional
from app.db.database import db
from app.core.security import hash_password, verify_password, create_jwt_token, create_refresh_token, decode_jwt_token, revoke_token, revoke_user_sessions
from app.services.rate_limiter import RateLimiter
from app.services.email_service import EmailService

class AuthService:
    @staticmethod
    def login(email: str, password: str) -> Optional[Dict[str, Any]]:
        norm_email = email.lower().strip()
        from fastapi import HTTPException, status

        # 1. Account-Level Lockout Defense: Check consecutive failures for this account
        if RateLimiter.is_account_locked(norm_email, max_failures=5):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Account temporarily locked due to 5 consecutive failed login attempts. Please wait 15 minutes or reset your password."
            )

        user = db.get_user_by_email(norm_email)
        if not user or not verify_password(password, user.get("passwordHash", "")):
            RateLimiter.record_failed_login(norm_email)
            if RateLimiter.is_account_locked(norm_email, max_failures=5):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Account temporarily locked due to 5 consecutive failed login attempts. Please wait 15 minutes or reset your password."
                )
            return None

        if user.get("isSuspended"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is suspended.")

        # 2. Email Verification Enforcement
        if user.get("isEmailVerified") is False:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email address not verified. Please verify your email via the confirmation link sent to your inbox before logging in."
            )

        membership = db.get_membership_for_user(user["id"])
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is not linked to an active workspace company."
            )

        # Successful authentication: Clear account failure counter
        RateLimiter.clear_failed_logins(norm_email)

        company_id = membership["companyId"]
        role = membership.get("role", "member")
        token = create_jwt_token(user["id"], company_id, role)
        refresh_token = create_refresh_token(user["id"], company_id, role)

        return {
            "user": {
                "id": user["id"],
                "email": user["email"],
                "fullName": user["fullName"],
                "avatarUrl": user.get("avatarUrl"),
                "isEmailVerified": user.get("isEmailVerified", True)
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
        # Unpredictable Cryptographically Random IDs & API Keys
        user_id = f"usr-{uuid.uuid4().hex[:12]}"
        company_id = f"comp-{uuid.uuid4().hex[:12]}"
        slug = company_name.lower().strip().replace(" ", "-")
        api_key = f"aas_live_{slug[:4]}_{uuid.uuid4().hex[:12]}"

        new_user = {
            "id": user_id,
            "email": email.lower().strip(),
            "passwordHash": hash_password(password),
            "fullName": full_name.strip(),
            "isEmailVerified": False,
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }

        new_company = {
            "id": company_id,
            "name": company_name.strip(),
            "slug": slug,
            "domain": f"{slug.replace('-', '')}.com",
            "industry": industry,
            "planId": plan_id,
            "billingCycle": "monthly",
            "planStatus": "active",
            "isSuspended": False,
            "apiKey": api_key,
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

        # Dispatch account verification email
        EmailService.send_verification_email(user_id, new_user["email"], new_user["fullName"])

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
