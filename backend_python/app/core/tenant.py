import time
from dataclasses import dataclass
from typing import Optional
from fastapi import Header, HTTPException, status, Depends
from app.core.security import decode_jwt_token
from app.core.config import settings
from app.db.database import db

@dataclass
class TenantContext:
    company_id: str
    user_id: str
    role: str
    correlation_id: str
    is_impersonated: bool = False
    impersonator_user_id: Optional[str] = None

def _resolve_api_key_context(key_str: str, header_comp: Optional[str], correlation_id: str) -> TenantContext:
    matched_key = next((k for k in db.api_keys.values() if k.get("key") == key_str or k.get("id") == key_str), None)
    if matched_key:
        if matched_key.get("status") == "revoked":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API key has been revoked."
            )
        comp_id = matched_key.get("companyId")
        if header_comp and header_comp != comp_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: API key does not match requested company."
            )
        key_comp = db.companies.get(comp_id)
        if key_comp and key_comp.get("isSuspended"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Company workspace is suspended."
            )
        return TenantContext(
            company_id=comp_id,
            user_id=f"key_{matched_key.get('id')}",
            role="api_client",
            correlation_id=correlation_id
        )

    matched_comp = next((c for c in db.companies.values() if c.get("apiKey") == key_str), None)
    if matched_comp:
        if matched_comp.get("isSuspended"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Company workspace is suspended."
            )
        return TenantContext(
            company_id=matched_comp["id"],
            user_id=f"api_{matched_comp['id']}",
            role="owner",
            correlation_id=correlation_id
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or unrecognized API key."
    )

def get_tenant_context(
    authorization: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None, alias="x-api-key"),
    x_company_id: Optional[str] = Header(None, alias="x-company-id"),
    x_tenant_id: Optional[str] = Header(None, alias="x-tenant-id"),
    x_internal_token: Optional[str] = Header(None, alias="x-internal-token"),
    x_request_id: Optional[str] = Header(None, alias="x-request-id"),
    x_deployment_id: Optional[str] = Header(None, alias="x-deployment-id")
) -> TenantContext:
    correlation_id = x_request_id or f"req_{int(time.time() * 1000)}"
    header_comp = x_company_id or x_tenant_id

    # 1. Internal Service Worker
    if x_internal_token and x_internal_token == settings.INTERNAL_SERVICE_SECRET:
        comp = header_comp or "comp-internal"
        return TenantContext(
            company_id=comp,
            user_id="service_worker",
            role="super_admin",
            correlation_id=correlation_id
        )

    # 2. Authorization Header (JWT Bearer Token or API Key)
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
        payload = decode_jwt_token(token)
        if payload:
            token_comp = payload.get("company_id")
            if not token_comp:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication token missing tenant workspace identifier."
                )

            user_role = payload.get("role", "member")
            is_impersonation = bool(payload.get("is_impersonation", False))
            impersonator_id = payload.get("impersonator_user_id")

            # Multi-Tenant Boundary: forbid accessing other company workspaces unless platform_super_admin
            if header_comp and header_comp != token_comp and user_role not in ["super_admin", "platform_super_admin"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Forbidden: Token is scoped to tenant '{token_comp}', cannot access '{header_comp}'."
                )

            # Check tenant suspension status (Super Admin bypasses to allow administrative remediation)
            comp = db.companies.get(token_comp)
            if comp and comp.get("isSuspended") and user_role not in ["super_admin", "platform_super_admin"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Company workspace '{comp.get('name', token_comp)}' has been suspended by platform administration."
                )

            # Check user account suspension status
            user_id = payload.get("sub", "usr-auth")
            user = db.users.get(user_id)
            if user and user.get("isSuspended"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User account has been suspended."
                )

            return TenantContext(
                company_id=token_comp,
                user_id=user_id,
                role=user_role,
                correlation_id=correlation_id,
                is_impersonated=is_impersonation,
                impersonator_user_id=impersonator_id
            )
        
        # If not a valid JWT, check if Bearer token is a valid API Key (e.g., widget.js, cURL)
        try:
            return _resolve_api_key_context(token, header_comp, correlation_id)
        except HTTPException as e:
            if "." in token and token.count(".") == 2:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired authentication token."
                )
            raise e

    # 3. Verified API Key (REST API via x-api-key header)
    if x_api_key:
        return _resolve_api_key_context(x_api_key, header_comp, correlation_id)

    # 4. Verified Deployment ID (Public Chat Widget Channel)
    if x_deployment_id:
        dep = db.deployments.get(x_deployment_id)
        if not dep:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Deployment channel not found."
            )
        if dep.get("status") == "disabled":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The AI assistant is currently unavailable on this deployment channel."
            )
        comp = db.companies.get(dep["companyId"])
        if comp and comp.get("isSuspended"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The company workspace for this AI assistant has been suspended."
            )
        return TenantContext(
            company_id=dep["companyId"],
            user_id=f"visitor_{int(time.time())}",
            role="visitor",
            correlation_id=correlation_id
        )

    # 5. Direct Company Header (Permitted ONLY in non-production environments for local testing/dev)
    if header_comp and settings.ENVIRONMENT != "production":
        comp = db.companies.get(header_comp)
        if comp:
            if comp.get("isSuspended"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Company workspace is suspended."
                )
            return TenantContext(
                company_id=header_comp,
                user_id=f"usr-{header_comp}-owner",
                role="owner",
                correlation_id=correlation_id
            )

    # No valid authentication or tenant could be resolved
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Provide a valid Bearer token or API key."
    )


def require_super_admin(
    ctx: TenantContext = Depends(get_tenant_context)
) -> TenantContext:
    """
    Centralized dependency enforcing genuine Platform Super Admin authority.
    Strictly denies:
    - Impersonated sessions
    - Non-platform roles (owner, admin, member, visitor)
    - Suspended administrator accounts
    """
    if ctx.is_impersonated:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Impersonation sessions cannot access super admin administration endpoints."
        )
    if ctx.role not in ["super_admin", "platform_super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Platform Super Admin privileges required."
        )
    if ctx.user_id != "service_worker":
        user = db.users.get(ctx.user_id)
        if user and user.get("isSuspended"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Super Admin account is suspended."
            )
    return ctx


