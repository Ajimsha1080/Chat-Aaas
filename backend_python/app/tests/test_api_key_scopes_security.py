import time
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import db
from app.core.security import create_jwt_token

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_workspace():
    """Sets up a test company, developer API key, and memberships."""
    comp_id = f"comp-scope-test-{int(time.time() * 1000)}"
    company_api_key = f"aas_live_scope_{uuid.uuid4().hex[:12]}"

    # 1. Company
    db.companies[comp_id] = {
        "id": comp_id,
        "name": "Scope Test Co",
        "slug": "scope-test",
        "planId": "growth",
        "billingCycle": "monthly",
        "planStatus": "active",
        "isSuspended": False,
        "apiKey": company_api_key,
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }

    # 2. Scoped API Key (chat only)
    chat_key_id = f"key-chat-{int(time.time() * 1000)}"
    chat_key_secret = f"aas_live_sec_chat_{uuid.uuid4().hex[:16]}"
    db.api_keys[chat_key_id] = {
        "id": chat_key_id,
        "key": chat_key_secret,
        "companyId": comp_id,
        "name": "Chat Bot Key",
        "scopes": ["chat:read", "chat:write"],
        "status": "active"
    }

    # 3. Privileged API Key with team:manage scope
    team_key_id = f"key-team-{int(time.time() * 1000)}"
    team_key_secret = f"aas_live_sec_team_{uuid.uuid4().hex[:16]}"
    db.api_keys[team_key_id] = {
        "id": team_key_id,
        "key": team_key_secret,
        "companyId": comp_id,
        "name": "Team Admin Key",
        "scopes": ["team:manage", "chat:read", "chat:write"],
        "status": "active"
    }

    # 4. Users
    owner_id = f"usr-owner-{int(time.time() * 1000)}"
    admin_id = f"usr-admin-{int(time.time() * 1000)}"
    member_id = f"usr-mem-{int(time.time() * 1000)}"

    db.users[owner_id] = {"id": owner_id, "email": "owner@scopetest.com", "fullName": "Workspace Owner", "isEmailVerified": True}
    db.users[admin_id] = {"id": admin_id, "email": "admin@scopetest.com", "fullName": "Workspace Admin", "isEmailVerified": True}
    db.users[member_id] = {"id": member_id, "email": "member@scopetest.com", "fullName": "Workspace Member", "isEmailVerified": True}

    db.memberships[f"mem-{owner_id}"] = {"id": f"mem-{owner_id}", "userId": owner_id, "companyId": comp_id, "role": "owner", "status": "active"}
    db.memberships[f"mem-{admin_id}"] = {"id": f"mem-{admin_id}", "userId": admin_id, "companyId": comp_id, "role": "admin", "status": "active"}
    db.memberships[f"mem-{member_id}"] = {"id": f"mem-{member_id}", "userId": member_id, "companyId": comp_id, "role": "viewer", "status": "active"}

    return {
        "comp_id": comp_id,
        "company_api_key": company_api_key,
        "chat_key_secret": chat_key_secret,
        "team_key_secret": team_key_secret,
        "owner_id": owner_id,
        "admin_id": admin_id,
        "member_id": member_id,
        "owner_token": create_jwt_token(owner_id, comp_id, "owner"),
        "admin_token": create_jwt_token(admin_id, comp_id, "admin"),
        "member_token": create_jwt_token(member_id, comp_id, "viewer")
    }

def test_chat_scoped_api_key_blocked_from_team_invite(setup_test_workspace):
    """A developer API key with only ['chat:read', 'chat:write'] cannot invite team members."""
    ws = setup_test_workspace
    res = client.post(
        "/api/v1/users/team/invite",
        headers={"x-api-key": ws["chat_key_secret"]},
        json={"email": "attacker@example.com", "fullName": "Attacker", "role": "agent_editor"}
    )
    assert res.status_code == 403
    assert "Forbidden" in res.json().get("detail", "")

def test_chat_scoped_api_key_blocked_from_billing(setup_test_workspace):
    """A developer API key cannot manage billing or subscriptions."""
    ws = setup_test_workspace
    res = client.post(
        "/api/v1/billing/checkout",
        headers={"x-api-key": ws["chat_key_secret"]},
        json={"planId": "enterprise"}
    )
    assert res.status_code == 403

def test_chat_scoped_api_key_blocked_from_developer_management(setup_test_workspace):
    """A developer API key cannot create or rotate API keys without developer:manage."""
    ws = setup_test_workspace
    res = client.get(
        "/api/v1/developer/api-keys",
        headers={"x-api-key": ws["chat_key_secret"]}
    )
    assert res.status_code == 403

def test_company_api_key_resolves_to_api_client_not_owner(setup_test_workspace):
    """Company-level apiKey must resolve to role 'api_client', NOT full 'owner'."""
    ws = setup_test_workspace
    res = client.post(
        "/api/v1/users/team/invite",
        headers={"x-api-key": ws["company_api_key"]},
        json={"email": "hacker@example.com", "fullName": "Hacker", "role": "owner"}
    )
    assert res.status_code == 403

def test_team_scoped_api_key_can_invite_editor_but_not_owner(setup_test_workspace):
    """An API key with team:manage can invite normal roles (agent_editor), but cannot invite owner."""
    ws = setup_test_workspace

    # 1. Invite agent_editor -> Allowed
    res1 = client.post(
        "/api/v1/users/team/invite",
        headers={"x-api-key": ws["team_key_secret"]},
        json={"email": "collab@example.com", "fullName": "Collab Editor", "role": "agent_editor"}
    )
    assert res1.status_code == 201

    # 2. Invite owner -> Denied (only owner/super_admin user can invite owner)
    res2 = client.post(
        "/api/v1/users/team/invite",
        headers={"x-api-key": ws["team_key_secret"]},
        json={"email": "newowner@example.com", "fullName": "New Owner", "role": "owner"}
    )
    assert res2.status_code == 403
    assert "Only existing workspace owners" in res2.json().get("detail", "")

def test_admin_user_cannot_invite_or_promote_owner(setup_test_workspace):
    """Admin users cannot invite an owner or promote members to owner."""
    ws = setup_test_workspace

    # Admin invites owner -> Denied
    res1 = client.post(
        "/api/v1/users/team/invite",
        headers={"Authorization": f"Bearer {ws['admin_token']}"},
        json={"email": "takeover@example.com", "fullName": "Takeover Attempt", "role": "owner"}
    )
    assert res1.status_code == 403
    assert "Only existing workspace owners" in res1.json().get("detail", "")

    # Admin promotes viewer to owner -> Denied
    target_mem_id = f"mem-{ws['member_id']}"
    res2 = client.put(
        f"/api/v1/users/team/{target_mem_id}/role",
        headers={"Authorization": f"Bearer {ws['admin_token']}"},
        json={"role": "owner"}
    )
    assert res2.status_code == 403
    assert "Only existing workspace owners" in res2.json().get("detail", "")

def test_owner_user_can_invite_owner_and_roles(setup_test_workspace):
    """Owner user can invite any valid role including owner."""
    ws = setup_test_workspace
    res = client.post(
        "/api/v1/users/team/invite",
        headers={"Authorization": f"Bearer {ws['owner_token']}"},
        json={"email": "coowner@example.com", "fullName": "Co-Owner", "role": "owner"}
    )
    assert res.status_code == 201
    assert res.json()["data"]["role"] == "owner"

def test_invalid_role_in_team_invite_rejected(setup_test_workspace):
    """Inviting invalid/non-existent role returns 400 Bad Request."""
    ws = setup_test_workspace
    res = client.post(
        "/api/v1/users/team/invite",
        headers={"Authorization": f"Bearer {ws['owner_token']}"},
        json={"email": "invalid@example.com", "fullName": "Invalid", "role": "root_super_god"}
    )
    assert res.status_code == 400
    assert "Invalid role" in res.json().get("detail", "")
