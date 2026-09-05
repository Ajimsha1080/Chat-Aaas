import time
from dataclasses import dataclass
from typing import Optional
from fastapi import Header
from app.core.security import decode_jwt_token
from app.core.config import settings

@dataclass
class TenantContext:
    company_id: str
    user_id: str
    role: str
    correlation_id: str

def get_tenant_context(
    authorization: Optional[str] = Header(None),
    x_company_id: Optional[str] = Header(None, alias="x-company-id"),
    x_tenant_id: Optional[str] = Header(None, alias="x-tenant-id"),
    x_internal_token: Optional[str] = Header(None, alias="x-internal-token"),
    x_request_id: Optional[str] = Header(None, alias="x-request-id")
) -> TenantContext:
    correlation_id = x_request_id or f"req_{int(time.time() * 1000)}"
    resolved_comp = x_company_id or x_tenant_id or "comp-techflow"
    
    if x_internal_token and x_internal_token == settings.INTERNAL_SERVICE_SECRET:
        return TenantContext(
            company_id=resolved_comp,
            user_id="service_worker",
            role="super_admin",
            correlation_id=correlation_id
        )

    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        payload = decode_jwt_token(token)
        if payload:
            return TenantContext(
                company_id=payload.get("company_id", resolved_comp),
                user_id=payload.get("sub", "usr-auth"),
                role=payload.get("role", "owner"),
                correlation_id=correlation_id
            )
            
    return TenantContext(
        company_id=resolved_comp,
        user_id="usr-default-owner",
        role="owner",
        correlation_id=correlation_id
    )
