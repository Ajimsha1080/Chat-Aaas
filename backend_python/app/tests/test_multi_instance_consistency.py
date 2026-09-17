import uuid
import sys
import subprocess
import json
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
    user_id = signup_res.json()["data"]["user"]["id"]

    # Evict from in-memory cache on Instance B to simulate independent worker memory
    if user_id in db.users:
        del db.users[user_id]
    if company_id in db.companies:
        del db.companies[company_id]

    # Simulate email verification flow
    from app.services.email_service import _EMAIL_TOKENS
    v_token = [rec["token"] for rec in _EMAIL_TOKENS.values() if rec.get("userId") == user_id and rec.get("tokenType") == "verify_email"][-1]
    verify_res = client_b.post("/api/v1/auth/verify-email", json={"token": v_token})
    assert verify_res.status_code == 200

    # Instance B logs in: must query SQL directly
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

    # Simulate Instance B receiving the inbox request without in-memory state from Instance A
    # Clear in-memory dict for this conversation and its messages
    if conv_id in db.conversations:
        del db.conversations[conv_id]
    db.messages = {k: v for k, v in db.messages.items() if v.get("conversationId") != conv_id}

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

    # Simulate Instance B evicting memory cache
    if conv_id in db.conversations:
        del db.conversations[conv_id]

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


def test_cross_process_subprocess_consistency():
    """Verify that an independent OS subprocess writing to the database is immediately readable in this process."""
    sub_suffix = uuid.uuid4().hex[:6]
    test_user_id = f"usr-subproc-{sub_suffix}"
    test_email = f"subproc_{sub_suffix}@isolated.process"
    test_conv_id = f"conv-subproc-{sub_suffix}"
    test_msg_id = f"msg-subproc-{sub_suffix}"
    company_id = "comp-techflow"

    # Python code executed in a completely separate OS process with its own separate memory heap
    worker_script = f"""
import sys, time
from app.db.database import db
from app.core.security import hash_password

db.save_user({{
    "id": "{test_user_id}",
    "email": "{test_email}",
    "passwordHash": hash_password("SubProcPassword123!"),
    "fullName": "Subprocess Worker User",
    "isEmailVerified": True,
    "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
}})

db.save_conversation({{
    "id": "{test_conv_id}",
    "companyId": "{company_id}",
    "customerSessionId": "sess_subproc",
    "customerName": "Subproc Customer",
    "customerEmail": "{test_email}",
    "channel": "rest_api",
    "status": "active",
    "sentiment": "neutral",
    "tags": ["SubprocessTest"],
    "startedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
    "lastMessageAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
}})

db.save_message({{
    "id": "{test_msg_id}",
    "conversationId": "{test_conv_id}",
    "companyId": "{company_id}",
    "sender": "user",
    "text": "Hello from separate subprocess!",
    "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
}})
"""

    result = subprocess.run(
        [sys.executable, "-c", worker_script],
        capture_output=True,
        text=True
    )
    assert result.returncode == 0, f"Subprocess failed with stderr: {result.stderr}"

    # Confirm the current process can read the new user, conversation, and message from SQL
    user = db.get_user_by_email(test_email)
    assert user is not None, "User saved by separate OS process must be readable in main process"
    assert user["id"] == test_user_id

    conv = db.get_conversation_by_id(test_conv_id, company_id)
    assert conv is not None, "Conversation saved by separate OS process must be readable in main process"
    assert conv["id"] == test_conv_id

    messages = db.get_messages_for_conversation(test_conv_id, company_id)
    assert len(messages) == 1, "Messages saved by separate OS process must be readable in main process"
    assert messages[0]["id"] == test_msg_id
    assert messages[0]["text"] == "Hello from separate subprocess!"

