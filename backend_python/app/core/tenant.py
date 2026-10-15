import hashlib
import hmac
import time
from dataclasses import dataclass
from typing import Optional, List
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
    scopes: Optional[List[str]] = None
    is_api_key: bool = False


def _resolve_api_key_context(key_str: str, header_comp: Optional[str], correlation_id: str) -> TenantContext:
    incoming_hash = hashlib.sha256(key_str.encode("utf-8")).hexdigest()
    matched_key = None

    for k in db.api_keys.values():
        stored_hash = k.get("key_hash") or k.get("keyHash")
        if stored_hash and hmac.compare_digest(stored_hash, incoming_hash):
            matched_key = k
            break
        # Legacy/test unhashed key matching only in non-production
        if settings.ENVIRONMENT != "production":
            raw_key = k.get("key")
            if isinstance(raw_key, str) and hmac.compare_digest(raw_key, key_str):
                matched_key = k
                break

    # If not a standard API key, check if it's a verified publishable key
    if not matched_key:
        for dep in db.deployments.values():
            pub_key = dep.get("publishableKey") or dep.get("publishable_key")
            if isinstance(pub_key, str) and hmac.compare_digest(pub_key, key_str):
                if dep.get("status") == "disabled":
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="The AI assistant is currently unavailable on this deployment channel."
                    )
                comp = db.companies.get(dep["companyId"])
                if not comp or comp.get("isSuspended"):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Company workspace is suspended."
                    )
                return TenantContext(
                    company_id=dep["companyId"],
                    user_id=f"visitor_{int(time.time())}",
                    role="visitor",
                    correlation_id=correlation_id,
                    scopes=["chat:write", "chat:read"],
                    is_api_key=True
                )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or unrecognized API key."
        )

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
    if not key_comp or key_comp.get("isSuspended"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Company workspace is suspended."
        )

    # Check if publishable widget key (role visitor with minimal scopes)
    is_publishable = (
        key_str.startswith("pk_")
        or key_str.startswith("pub_")
        or matched_key.get("isPublishable")
        or matched_key.get("role") == "visitor"
    )
    if is_publishable:
        return TenantContext(
            company_id=comp_id,
            user_id=f"visitor_{int(time.time())}",
            role="visitor",
            correlation_id=correlation_id,
            scopes=["chat:write", "chat:read"],
            is_api_key=True
        )

    key_scopes = matched_key.get("scopes", ["chat:read", "chat:write"])
    return TenantContext(
        company_id=comp_id,
        user_id=f"key_{matched_key.get('id')}",
        role="api_client",
        correlation_id=correlation_id,
        scopes=key_scopes,
        is_api_key=True
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
    # Normalize header inputs
    auth_str = authorization if isinstance(authorization, str) else None
    api_key_str = x_api_key if isinstance(x_api_key, str) else None
    comp_id_str = x_company_id if isinstance(x_company_id, str) else None
    tenant_id_str = x_tenant_id if isinstance(x_tenant_id, str) else None
    internal_token_str = x_internal_token if isinstance(x_internal_token, str) else None
    request_id_str = x_request_id if isinstance(x_request_id, str) else None
    deployment_id_str = x_deployment_id if isinstance(x_deployment_id, str) else None

    correlation_id = request_id_str or f"req_{int(time.time() * 1000)}"
    header_comp = comp_id_str or tenant_id_str

    # 1. Internal Service Worker
    if internal_token_str and hmac.compare_digest(internal_token_str, settings.INTERNAL_SERVICE_SECRET):
        comp = header_comp or "comp-internal"
        return TenantContext(
            company_id=comp,
            user_id="service_worker",
            role="super_admin",
            correlation_id=correlation_id
        )

    # 2. Authorization Header (JWT Bearer Token or API Key)
    if auth_str and auth_str.startswith("Bearer "):
        token = auth_str[7:].strip()
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

        # If not a valid JWT, check if Bearer token is a valid API Key (e.g. widget.js, cURL)
        return _resolve_api_key_context(token, header_comp, correlation_id)

    # 3. Verified API Key (REST API via x-api-key header)
    if api_key_str:
        return _resolve_api_key_context(api_key_str, header_comp, correlation_id)

    # 4. Verified Deployment ID (Public Chat Widget Channel)
    if deployment_id_str:
        dep = db.deployments.get(deployment_id_str)
        if not dep:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or unrecognized deployment identifier."
            )
        if dep.get("status") == "disabled":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The AI assistant is currently unavailable on this deployment channel."
            )
        comp = db.companies.get(dep["companyId"])
        if not comp or comp.get("isSuspended"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The company workspace for this AI assistant has been suspended."
            )
        return TenantContext(
            company_id=dep["companyId"],
            user_id=f"visitor_{int(time.time())}",
            role="visitor",
            correlation_id=correlation_id,
            scopes=["chat:write", "chat:read"]
        )

    # Strictly no unauthenticated fallback, no auto-created companies, no owner from x-company-id!
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Provide a valid Bearer token, API key, or verified deployment ID."
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
