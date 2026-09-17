import pytest
import time
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_environment():
    comp_id = "comp-test-prod"
    api_key = "sk_live_testprod123"
    db.companies[comp_id] = {
        "id": comp_id,
        "name": "Product Test Corp",
        "apiKey": api_key,
        "planId": "starter",
        "isSuspended": False,
        "agent": {
            "name": "TestBot",
            "model": "gpt-4o-mini",
            "status": "active"
        }
    }
    db.api_keys[api_key] = {
        "id": "key-test-prod",
        "key": api_key,
        "companyId": comp_id,
        "status": "active"
    }
    yield
    if comp_id in db.companies:
        del db.companies[comp_id]
    if api_key in db.api_keys:
        del db.api_keys[api_key]


def test_bearer_token_api_key_authentication():
    headers = {
        "Authorization": "Bearer sk_live_testprod123",
        "Content-Type": "application/json"
    }
    res = client.post(
        "/api/v1/chat",
        headers=headers,
        json={"message": "Hello from widget", "session_id": "sess_widget_01"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "message" in data


def test_chat_persists_conversation_and_messages():
    sess_id = "sess_persist_99"
    headers = {
        "Authorization": "Bearer sk_live_testprod123",
        "Content-Type": "application/json"
    }
    res = client.post(
        "/api/v1/chat",
        headers=headers,
        json={"message": "What is the return policy?", "session_id": sess_id, "customer_name": "Alice"}
    )
    assert res.status_code == 200
    data = res.json()
    conv_id = data.get("conversation_id")
    assert conv_id is not None
    assert conv_id in db.conversations
    assert db.conversations[conv_id]["companyId"] == "comp-test-prod"
    assert db.conversations[conv_id]["customerName"] == "Alice"

    conv_msgs = [m for m in db.messages.values() if m.get("conversationId") == conv_id]
    assert len(conv_msgs) >= 2


def test_agent_disabled_returns_503():
    db.companies["comp-test-prod"]["agent"]["status"] = "disabled"
    headers = {
        "Authorization": "Bearer sk_live_testprod123",
        "Content-Type": "application/json"
    }
    res = client.post(
        "/api/v1/chat",
        headers=headers,
        json={"message": "Hello?"}
    )
    assert res.status_code == 503
    assert "disabled" in res.json().get("detail", "").lower()
    db.companies["comp-test-prod"]["agent"]["status"] = "active"


def test_chat_quota_enforcement():
    comp_id = "comp-test-prod"
    for i in range(1000):
        cid = f"dummy-conv-{i}"
        db.conversations[cid] = {"id": cid, "companyId": comp_id, "status": "resolved"}

    headers = {
        "Authorization": "Bearer sk_live_testprod123",
        "Content-Type": "application/json"
    }
    res = client.post(
        "/api/v1/chat",
        headers=headers,
        json={"message": "Is this blocked?"}
    )
    assert res.status_code == 402
    assert "quota" in res.json().get("detail", "").lower() or "limit" in res.json().get("detail", "").lower()

    for i in range(1000):
        db.conversations.pop(f"dummy-conv-{i}", None)


def test_knowledge_quota_enforcement():
    comp_id = "comp-test-prod"
    for i in range(10):
        sid = f"ks-test-seed-{i}"
        db.knowledge_sources[sid] = {"id": sid, "companyId": comp_id, "lifecycleState": "active"}

    headers = {
        "Authorization": "Bearer sk_live_testprod123",
        "Content-Type": "application/json"
    }
    res = client.post(
        "/api/v1/knowledge/files",
        headers=headers,
        json={"title": "Doc 11", "content": "Sample content for testing quota"}
    )
    assert res.status_code == 402
    assert "limit" in res.json().get("detail", "").lower()

    for i in range(10):
        db.knowledge_sources.pop(f"ks-test-seed-{i}", None)


def test_team_member_lifecycle_role_and_removal():
    comp_id = "comp-test-prod"
    mem_owner_id = "mem-prod-owner"
    mem_member_id = "mem-prod-member"

    db.memberships[mem_owner_id] = {
        "id": mem_owner_id,
        "userId": "usr-owner-prod",
        "companyId": comp_id,
        "role": "owner"
    }
    db.memberships[mem_member_id] = {
        "id": mem_member_id,
        "userId": "usr-member-prod",
        "companyId": comp_id,
        "role": "viewer"
    }

    headers = {
        "Authorization": "Bearer sk_live_testprod123",
        "Content-Type": "application/json"
    }

    res_update = client.put(
        f"/api/v1/users/team/{mem_member_id}/role",
        headers=headers,
        json={"role": "agent_editor"}
    )
    assert res_update.status_code == 200
    assert db.memberships[mem_member_id]["role"] == "agent_editor"

    res_del_owner = client.delete(
        f"/api/v1/users/team/{mem_owner_id}",
        headers=headers
    )
    assert res_del_owner.status_code == 400
    assert "owner" in res_del_owner.json().get("detail", "").lower()

    res_del_member = client.delete(
        f"/api/v1/users/team/{mem_member_id}",
        headers=headers
    )
    assert res_del_member.status_code == 200
    assert mem_member_id not in db.memberships


def test_billing_usage_includes_quota():
    headers = {
        "Authorization": "Bearer sk_live_testprod123"
    }
    res = client.get("/api/v1/billing/usage", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert "usage" in data
    assert "quota" in data
    assert "monthlyLimit" in data["quota"]
    assert "conversationsUsed" in data["quota"]
    assert "usagePercent" in data["quota"]


def test_monthly_quota_resets_across_billing_periods():
    from app.services.usage_service import UsageService
    comp_id = "comp-quota-test"
    db.companies[comp_id] = {"id": comp_id, "name": "Quota Test Co", "planId": "starter"}

    # 1. Simulate 1000 conversations created in a past billing month (2026-07)
    for i in range(1000):
        cid = f"past-conv-{i}"
        db.conversations[cid] = {
            "id": cid,
            "companyId": comp_id,
            "status": "resolved",
            "createdAt": f"2026-07-15T12:00:{i%60:02d}Z"
        }

    # Current month quota should be 0 used and NOT exceeded
    quota_curr = UsageService.check_monthly_quota(comp_id)
    assert quota_curr["conversationsUsed"] == 0
    assert quota_curr["isExceeded"] is False

    # Historical month check (2026-07) should reflect 1000 used and exceeded
    quota_past = UsageService.check_monthly_quota(comp_id, billing_period="2026-07")
    assert quota_past["conversationsUsed"] == 1000
    assert quota_past["isExceeded"] is True

    # 2. Add current month conversations up to quota limit
    cur_month = time.strftime("%Y-%m")
    for i in range(1000):
        cid = f"cur-conv-{i}"
        db.conversations[cid] = {
            "id": cid,
            "companyId": comp_id,
            "status": "resolved",
            "createdAt": f"{cur_month}-05T10:00:00Z"
        }

    quota_now = UsageService.check_monthly_quota(comp_id)
    assert quota_now["conversationsUsed"] == 1000
    assert quota_now["isExceeded"] is True

    # Clean up dummy conversations and company
    for i in range(1000):
        db.conversations.pop(f"past-conv-{i}", None)
        db.conversations.pop(f"cur-conv-{i}", None)
    db.companies.pop(comp_id, None)


def test_real_token_usage_tracking():
    from app.services.llm_service import LLMProvider
    from app.services.usage_service import UsageService
    comp_id = "comp-test-prod"

    # Verify LLMProvider token counting via tiktoken
    prompt_text = "What is the refund policy for enterprise customers?"
    token_cnt = LLMProvider.count_tokens(prompt_text, "gpt-4o")
    assert token_cnt > 0
    assert isinstance(token_cnt, int)

    headers = {
        "Authorization": "Bearer sk_live_testprod123",
        "Content-Type": "application/json"
    }

    # Execute a chat message turn
    res = client.post(
        "/api/v1/chat",
        headers=headers,
        json={"message": "Hello, how can I configure custom integrations?"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "tokens_used" in data
    assert data["tokens_used"] > 0
    assert isinstance(data["tokens_used"], int)

    # Check that usage event recorded real tokens
    events = UsageService.get_events_for_company(comp_id)
    token_events = [e for e in events if e.get("unit") == "tokens"]
    assert len(token_events) > 0
    assert all(e["quantity"] > 0 for e in token_events)


def test_impersonation_short_lifetime_and_unbacked_rejection():
    from app.core.security import decode_jwt_token, create_jwt_token
    admin_token = create_jwt_token("usr-root-admin", "comp-techflow", "super_admin")
    admin_headers = {"Authorization": f"Bearer {admin_token}", "X-Company-ID": "comp-techflow"}

    # 1. Impersonate valid company with existing member
    res = client.post(
        "/api/v1/admin/impersonate",
        headers=admin_headers,
        json={"companyId": "comp-techflow"}
    )
    assert res.status_code == 200
    imp_token = res.json()["data"]["token"]

    # Decode token and verify short lifetime (~15 minutes / 900 seconds)
    claims = decode_jwt_token(imp_token)
    assert claims["is_impersonation"] is True
    assert claims["impersonator_user_id"] == "usr-root-admin"
    exp = claims["exp"]
    now = time.time()
    # Expiry should be within 15 minutes (between 800s and 950s from now)
    assert 800 <= (exp - now) <= 950

    # 2. Impersonating a company with zero memberships must return 400 Bad Request
    db.companies["comp-empty-tenant"] = {
        "id": "comp-empty-tenant",
        "name": "Empty Ghost Tenant",
        "planId": "starter"
    }
    bad_res = client.post(
        "/api/v1/admin/impersonate",
        headers=admin_headers,
        json={"companyId": "comp-empty-tenant"}
    )
    assert bad_res.status_code == 400
    assert "No active member accounts" in bad_res.json()["detail"]
    db.companies.pop("comp-empty-tenant", None)

