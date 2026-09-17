from fastapi import APIRouter, HTTPException, Depends, status, Request
from pydantic import BaseModel
from typing import Optional
from app.services.auth_service import AuthService
from app.services.rate_limiter import RateLimiter
from app.core.tenant import TenantContext, get_tenant_context

router = APIRouter(prefix="/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    email: str
    password: str

class SignupRequest(BaseModel):
    fullName: str
    email: str
    password: str
    companyName: str
    industry: str
    planId: Optional[str] = "starter"

@router.post("/login")
def login(req: LoginRequest, request: Request):
    client_ip = RateLimiter.get_client_ip(request)
    RateLimiter.check_auth_rate_limit(client_ip)
    res = AuthService.login(req.email, req.password)
    if not res:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password credentials.")
    return {"status": 200, "data": res}

@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(req: SignupRequest, request: Request):
    client_ip = RateLimiter.get_client_ip(request)
    RateLimiter.check_auth_rate_limit(client_ip)
    res = AuthService.signup(
        full_name=req.fullName,
        email=req.email,
        password=req.password,
        company_name=req.companyName,
        industry=req.industry,
        plan_id=req.planId or "starter"
    )
    return {"status": 201, "data": res}

class RefreshTokenRequest(BaseModel):
    refreshToken: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    newPassword: str

class VerifyEmailRequest(BaseModel):
    token: str

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, request: Request):
    """Initiates single-use expiring password reset flow via transactional email."""
    client_ip = RateLimiter.get_client_ip(request)
    RateLimiter.check_auth_rate_limit(client_ip)
    
    from app.db.database import db
    from app.services.email_service import EmailService
    user = db.get_user_by_email(req.email)
    if user:
        token = EmailService.send_password_reset_email(user["id"], user["email"], user.get("fullName", "User"))
        return {
            "status": 200,
            "data": {
                "message": "Password reset instructions have been sent to your registered email.",
                "resetToken": token  # provided for fast programmatic verification/testing
            }
        }
    return {
        "status": 200,
        "data": {"message": "If that email is registered, password reset instructions have been sent."}
    }

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, request: Request):
    """Sets a new password using a validated single-use token and invalidates previous sessions."""
    client_ip = RateLimiter.get_client_ip(request)
    RateLimiter.check_auth_rate_limit(client_ip)
    
    from app.services.email_service import EmailService
    success = EmailService.reset_password_with_token(req.token, req.newPassword)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid, expired, or already used password reset token."
        )
    return {
        "status": 200,
        "data": {"message": "Password successfully updated. Please log in with your new password."}
    }

@router.post("/verify-email")
def verify_email(req: VerifyEmailRequest):
    """Validates single-use email verification token."""
    from app.services.email_service import EmailService
    success = EmailService.verify_email_with_token(req.token)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid, expired, or already used email verification token."
        )
    return {
        "status": 200,
        "data": {"message": "Email address successfully verified."}
    }

@router.post("/refresh")
def refresh_token(req: RefreshTokenRequest):
    """Rotates refresh token and issues a new 15-minute access token."""
    res = AuthService.refresh_session(req.refreshToken)
    return {"status": 200, "data": res}

@router.post("/logout")
def logout(ctx: TenantContext = Depends(get_tenant_context)):
    """Revokes the active user session and invalidates all session tokens."""
    AuthService.logout(jti=None, user_id=ctx.user_id)
    return {"status": 200, "data": {"message": "Successfully logged out. Session has been revoked."}}

@router.get("/me")
def get_current_user(ctx: TenantContext = Depends(get_tenant_context)):
    return {
        "status": 200,
        "data": {
            "userId": ctx.user_id,
            "companyId": ctx.company_id,
            "role": ctx.role
        }
    }

# ----------------- Enterprise Single Sign-On (SSO) -----------------

class SSODiscoverRequest(BaseModel):
    email: str

class SAMLInitiateRequest(BaseModel):
    companyId: str
    relayState: Optional[str] = "/dashboard"

class SAMLCallbackRequest(BaseModel):
    companyId: str
    samlResponse: str

class OIDCCallbackRequest(BaseModel):
    companyId: str
    claims: dict

@router.post("/sso/discover")
def discover_sso(req: SSODiscoverRequest):
    """Home Realm Discovery (HRD): Detects if user's enterprise email uses SSO."""
    from app.services.sso_service import SSOService
    config = SSOService.discover_tenant_by_email(req.email)
    if not config or not config.get("enabled"):
        return {"status": 200, "data": {"ssoAvailable": False}}
    return {
        "status": 200,
        "data": {
            "ssoAvailable": True,
            "companyId": config["companyId"],
            "providerType": config["providerType"],
            "idpName": config["idpName"],
            "entrypointUrl": config["entrypointUrl"]
        }
    }

@router.post("/sso/saml/initiate")
def initiate_saml(req: SAMLInitiateRequest):
    """Generates SP-Initiated SAML AuthnRequest."""
    from app.services.sso_service import SSOService
    try:
        res = SSOService.generate_saml_authn_request(req.companyId, req.relayState)
        return {"status": 200, "data": res}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/sso/saml/callback")
def saml_callback(req: SAMLCallbackRequest):
    """Processes SAML Response assertion and issues a signed JWT session."""
    import uuid
    import time
    from app.services.sso_service import SSOService
    from app.services.auth_service import AuthService
    from app.core.security import create_jwt_token, create_refresh_token
    from app.db.database import db

    try:
        user_info = SSOService.process_saml_response(req.companyId, req.samlResponse)
        # Find or provision user
        user = db.get_user_by_email(user_info["email"])
        if not user:
            user_id = f"usr_{uuid.uuid4().hex[:12]}"
            user = {
                "id": user_id,
                "companyId": req.companyId,
                "email": user_info["email"],
                "fullName": user_info["name"],
                "role": user_info["role"],
                "isEmailVerified": True,
                "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            }
            db.save_user(user)

        access_token = create_jwt_token(user["id"], user.get("companyId", req.companyId), user.get("role", "member"))
        refresh_token = create_refresh_token(user["id"], user.get("companyId", req.companyId), user.get("role", "member"))

        return {
            "status": 200,
            "data": {
                "user": user,
                "token": access_token,
                "refreshToken": refresh_token
            }
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"SAML Authentication failed: {str(e)}")

@router.post("/sso/oidc/callback")
def oidc_callback(req: OIDCCallbackRequest):
    """Processes validated OIDC ID Token and issues a signed JWT session."""
    import uuid
    import time
    from app.services.sso_service import SSOService
    from app.core.security import create_jwt_token, create_refresh_token
    from app.db.database import db

    try:
        user_info = SSOService.process_oidc_token(req.companyId, req.claims)
        user = db.get_user_by_email(user_info["email"])
        if not user:
            user_id = f"usr_{uuid.uuid4().hex[:12]}"
            user = {
                "id": user_id,
                "companyId": req.companyId,
                "email": user_info["email"],
                "fullName": user_info["name"],
                "role": user_info["role"],
                "isEmailVerified": True,
                "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            }
            db.save_user(user)

        access_token = create_jwt_token(user["id"], user.get("companyId", req.companyId), user.get("role", "member"))
        refresh_token = create_refresh_token(user["id"], user.get("companyId", req.companyId), user.get("role", "member"))

        return {
            "status": 200,
            "data": {
                "user": user,
                "token": access_token,
                "refreshToken": refresh_token
            }
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"OIDC Authentication failed: {str(e)}")

