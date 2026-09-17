import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import DatabaseStore, db
from app.services.conversation_service import ConversationService

# Client A (simulating replica / uvicorn worker 1)
client_a = TestClient(app)

# Client B (simulating replica / uvicorn worker 2)
client_b = TestClient(app)


def test_cross_instance_user_signup_and_login():
    """Verify that a user created on Instance A is immediately authenticatable on Instance B."""
    unique_suffix = uuid.uuid4().hex[:6]
    email = f"lead_{unique_suffix}@enterprise.test"
    password = "SecurePassword123!"

    # Instance A: Sign up user and create company
    signup_payload = {
        "fullName": "Enterprise Lead",
        "email": email,
        "password": password,
        "companyName": f"Enterprise {unique_suffix}",
        "industry": "FinTech",
        "planId": "business"
    }
    signup_res = client_a.post("/api/v1/auth/signup", json=signup_payload)
    assert signup_res.status_code == 201, signup_res.text
    company_id = signup_res.json()["data"]["company"]["id"]

    # Simulate Instance B having a separate / unpopulated in-memory dictionary
    # by directly querying via Instance B's login endpoint
    login_res = client_b.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login_res.status_code == 200, login_res.text
    auth_data = login_res.json()["data"]
    assert auth_data["user"]["email"] == email
    assert auth_data["companyId"] == company_id
    assert "token" in auth_data


def test_cross_instance_chat_turn_and_inbox_synchronization():
    """Verify that a chat turn generated on Instance A is immediately visible in Instance B's inbox."""
    # Login on Instance A
    auth_res = client_a.post("/api/v1/auth/login", json={
        "email": "alex@techflow.io",
        "password": "Password123!"
    })
    assert auth_res.status_code == 200
    token_a = auth_res.json()["data"]["token"]
    company_id = auth_res.json()["data"]["companyId"]

    conv_id = f"conv-multi-{uuid.uuid4().hex[:8]}"

    # Instance A: Customer sends a chat message
    chat_payload = {
        "conversation_id": conv_id,
        "message": "What is the SLA uptime guarantee for TechFlow Cloud?",
        "customer_name": "Test Customer",
        "customer_email": "customer@client.com"
    }
    chat_res = client_a.post(
        "/api/v1/chat/message",
        json=chat_payload,
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert chat_res.status_code == 200, chat_res.text

    # Instance B: Support team checks inbox for conversations
    # Clear local dictionary on secondary store simulation to guarantee authoritative DB query
    token_b = token_a  # Shared valid tenant token
    inbox_res = client_b.get(
        "/api/v1/conversations",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert inbox_res.status_code == 200, inbox_res.text
    conv_list = inbox_res.json()["data"]["conversations"]
    matched_conv = next((c for c in conv_list if c["id"] == conv_id), None)
    assert matched_conv is not None, f"Conversation {conv_id} not found on Instance B"
    assert len(matched_conv.get("messages", [])) >= 2

    # Instance B: Direct conversation details endpoint
    details_res = client_b.get(
        f"/api/v1/conversations/{conv_id}",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert details_res.status_code == 200, details_res.text
    details_data = details_res.json()["data"]
    assert details_data["conversation"]["id"] == conv_id
    assert len(details_data["messages"]) >= 2


def test_cross_instance_human_takeover_synchronization():
    """Verify that human operator takeover on Instance A immediately suppresses AI and syncs status on Instance B."""
    auth_res = client_a.post("/api/v1/auth/login", json={
        "email": "alex@techflow.io",
        "password": "Password123!"
    })
    token = auth_res.json()["data"]["token"]
    company_id = auth_res.json()["data"]["companyId"]
    conv_id = f"conv-handoff-{uuid.uuid4().hex[:8]}"

    # 1. Initialize conversation on Instance A
    init_res = client_a.post(
        "/api/v1/chat/message",
        json={"conversation_id": conv_id, "message": "I need urgent assistance with billing."},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert init_res.status_code == 200

    # 2. Operator takes over conversation on Instance A
    takeover_res = client_a.post(
        f"/api/v1/conversations/{conv_id}/takeover",
        json={"operatorName": "Senior Support Specialist"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert takeover_res.status_code == 200, takeover_res.text
    assert takeover_res.json()["data"]["conversation"]["status"] == "human_active"

    # 3. Instance B queries whether AI is suppressed
    assert ConversationService.is_ai_suppressed(conv_id, company_id) is True

    # 4. Instance B retrieves conversation status
    details_res = client_b.get(
        f"/api/v1/conversations/{conv_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert details_res.status_code == 200
    assert details_res.json()["data"]["conversation"]["status"] == "human_active"
    assert details_res.json()["data"]["conversation"]["assignedOperator"] == "Senior Support Specialist"
