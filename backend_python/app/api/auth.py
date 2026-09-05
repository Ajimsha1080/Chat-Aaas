from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional
from app.services.auth_service import AuthService
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
def login(req: LoginRequest):
    res = AuthService.login(req.email, req.password)
    if not res:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password credentials.")
    return {"status": 200, "data": res}

@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(req: SignupRequest):
    res = AuthService.signup(
        full_name=req.fullName,
        email=req.email,
        password=req.password,
        company_name=req.companyName,
        industry=req.industry,
        plan_id=req.planId or "starter"
    )
    return {"status": 201, "data": res}

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
