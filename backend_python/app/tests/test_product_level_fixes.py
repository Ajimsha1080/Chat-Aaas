import pytest
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
