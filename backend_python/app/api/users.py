import time
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from app.db.database import db
from app.core.tenant import TenantContext, get_tenant_context
from app.core.permissions import has_permission

router = APIRouter(prefix="/users", tags=["Users & Team"])

class UpdateProfileRequest(BaseModel):
    fullName: Optional[str] = None
    avatarUrl: Optional[str] = None

class InviteMemberRequest(BaseModel):
    email: EmailStr
    fullName: str
    role: Optional[str] = "agent_editor"

class UpdateRoleRequest(BaseModel):
    role: str

@router.get("/me")
def get_current_user_profile(ctx: TenantContext = Depends(get_tenant_context)):
    user = db.users.get(ctx.user_id)
    if not user:
        return {
            "status": 200,
            "data": {
                "id": ctx.user_id,
                "email": "user@company.com",
                "fullName": "Team Member",
                "role": ctx.role,
                "companyId": ctx.company_id
            }
        }
    return {
        "status": 200,
        "data": {
            "id": user["id"],
            "email": user["email"],
            "fullName": user["fullName"],
            "avatarUrl": user.get("avatarUrl"),
            "role": ctx.role,
            "companyId": ctx.company_id
        }
    }

@router.put("/me")
def update_current_user_profile(req: UpdateProfileRequest, ctx: TenantContext = Depends(get_tenant_context)):
    user = db.users.get(ctx.user_id)
    if user:
        if req.fullName:
            user["fullName"] = req.fullName
        if req.avatarUrl:
            user["avatarUrl"] = req.avatarUrl
        user["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
    return {"status": 200, "data": {"user": user or {"fullName": req.fullName}}}

@router.get("/team")
def get_team_members(ctx: TenantContext = Depends(get_tenant_context)):
    memberships = [m for m in db.memberships.values() if m.get("companyId") == ctx.company_id]
    team = []
    for m in memberships:
        u = db.users.get(m.get("userId", ""))
        team.append({
            "membershipId": m["id"],
            "userId": m.get("userId"),
            "role": m.get("role", "viewer"),
            "status": m.get("status", "active"),
            "fullName": u.get("fullName", "Team Member") if u else "Team Member",
            "email": u.get("email", "") if u else "",
            "avatarUrl": u.get("avatarUrl") if u else None
        })
    return {"status": 200, "data": {"team": team}}

@router.post("/team/invite")
def invite_team_member(req: InviteMemberRequest, ctx: TenantContext = Depends(get_tenant_context)):
    if not has_permission(ctx.role, "team:manage"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions to invite team members.")

    new_user_id = f"usr-{int(time.time() * 1000)}"
    new_mem_id = f"mem-{new_user_id}"

    db.users[new_user_id] = {
        "id": new_user_id,
        "email": req.email,
        "fullName": req.fullName,
        "passwordHash": "",
        "isEmailVerified": False,
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }

    db.memberships[new_mem_id] = {
        "id": new_mem_id,
        "userId": new_user_id,
        "companyId": ctx.company_id,
        "role": req.role or "agent_editor",
        "status": "invited",
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }

    return {
        "status": 201,
        "data": {
            "message": f"Invitation sent to {req.email}",
            "membershipId": new_mem_id,
            "role": req.role
        }
    }
