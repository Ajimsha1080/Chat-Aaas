import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import db

client = TestClient(app)

@pytest.mark.clean_db
def test_fresh_customer_complete_production_lifecycle():
    # Explicitly clear db to guarantee clean slate
    db.clear()

    # 1. SIGNUP FRESH CUSTOMER
    signup_payload = {
        "fullName": "Jane Doe",
        "email": "jane@acmesystems.io",
        "password": "SecurePass123!",
        "companyName": "Acme Systems",
        "industry": "Industrial Robotics",
        "planId": "growth"
    }
    signup_res = client.post("/api/v1/auth/signup", json=signup_payload)
    assert signup_res.status_code == 201
    auth_data = signup_res.json()["data"]
    acme_token = auth_data["token"]
    acme_comp_id = auth_data["company"]["id"]
    acme_headers = {"Authorization": f"Bearer {acme_token}", "X-Company-ID": acme_comp_id}

    # 2. VERIFY CLEAN WORKSPACE
    # Knowledge must be empty
    k_res = client.get("/api/v1/knowledge", headers=acme_headers)
    assert k_res.status_code == 200
    assert k_res.json()["data"]["sources"] == []
    assert k_res.json()["data"]["totalChunks"] == 0

    # Conversations inbox must be empty
    c_res = client.get("/api/v1/conversations", headers=acme_headers)
    assert c_res.status_code == 200
    assert c_res.json()["data"]["conversations"] == []

    # Deployments list must be empty
    d_res = client.get("/api/v1/deployments", headers=acme_headers)
    assert d_res.status_code == 200
    assert d_res.json()["data"]["deployments"] == []

    # 3. RAG HONEST REFUSAL (ZERO DEMO DATA)
    chat_payload = {"message": "What is Acme Systems replacement warranty for robotics motors?"}
    refusal_res = client.post("/api/v1/chat", json=chat_payload, headers=acme_headers)
    assert refusal_res.status_code == 200
    refusal_data = refusal_res.json()
    assert refusal_data.get("is_refusal") is True or "don't have enough verified information" in refusal_data["message"].lower()
    assert refusal_data.get("citations") in [[], None]

    # 4. REAL KNOWLEDGE INGESTION
    warranty_doc = {
        "title": "Acme Systems Warranty and Service Guarantee",
        "content": (
            "Acme Systems provides a standard 36-month warranty on all robotic actuator motors. "
            "Under this guarantee, replacement parts are dispatched within 24 hours of RMA approval. "
            "Clients with Platinum Tier support receive on-site engineer dispatch within 4 hours."
        ),
        "fileName": "warranty-policy-2026.pdf",
        "docType": "pdf",
        "category": "Hardware Support"
    }
    ingest_res = client.post("/api/v1/knowledge/files", json=warranty_doc, headers=acme_headers)
    assert ingest_res.status_code == 201
    ingest_data = ingest_res.json()["data"]
    source_id = ingest_data["source"]["id"]
    assert ingest_data["source"]["lifecycleState"] == "active"
    assert ingest_data["chunksCount"] >= 1

    # Verify knowledge list now has 1 active source
    k_res_after = client.get("/api/v1/knowledge", headers=acme_headers)
    assert len(k_res_after.json()["data"]["sources"]) == 1
    assert k_res_after.json()["data"]["totalChunks"] >= 1

    # 5. REAL RAG RETRIEVAL & SYNTHESIS
    chat_q2 = {"message": "How long is the warranty on robotic actuator motors?"}
    rag_res = client.post("/api/v1/chat", json=chat_q2, headers=acme_headers)
    assert rag_res.status_code == 200
    rag_data = rag_res.json()
    assert not rag_data.get("is_refusal", False)
    assert "36-month" in rag_data["message"].lower() or "36 month" in rag_data["message"].lower()

    # 6. DRAFT EDITING & PUBLISHING
    draft_res = client.put(
        "/api/v1/agent/draft",
        json={"greetingMessage": "Welcome to Acme Systems Robotics Support. How can we assist?"},
        headers=acme_headers
    )
    assert draft_res.status_code == 200

    pub_res = client.post(
        "/api/v1/agent/publish",
        json={"changeSummary": "Initial production release v1"},
        headers=acme_headers
    )
    assert pub_res.status_code == 200
    assert pub_res.json()["data"]["version"]["versionNumber"] in [1, 2]

    # 7. DEPLOYMENT CREATION & LIVE CONVERSATION
    dep_payload = {
        "name": "Acme Production Web Widget",
        "channel": "website_widget",
        "domain": "robotics.acmesystems.io"
    }
    create_dep_res = client.post("/api/v1/deployments", json=dep_payload, headers=acme_headers)
    assert create_dep_res.status_code == 201
    dep_id = create_dep_res.json()["data"]["id"]
    assert create_dep_res.json()["data"]["status"] == "active"

    # External user sends message through conversations
    user_msg_payload = {
        "text": "What is the RMA dispatch timeline for replacement parts?",
        "customerName": "Alice Engineer",
        "customerEmail": "alice@partner.com"
    }
    msg_res = client.post("/api/v1/conversations/message", json=user_msg_payload, headers=acme_headers)
    assert msg_res.status_code == 200
    conv_data = msg_res.json()["data"]
    conv_id = conv_data["conversation"]["id"]
    assert conv_data["conversation"]["companyId"] == acme_comp_id
    assert "24 hour" in conv_data["agentMessage"]["text"].lower()

    # Verify conversation now in inbox
    inbox_res = client.get("/api/v1/conversations", headers=acme_headers)
    assert len(inbox_res.json()["data"]["conversations"]) == 1

    # 8. KNOWLEDGE TRASH & EXCLUSION FROM RAG
    trash_res = client.post(f"/api/v1/knowledge/sources/{source_id}/trash", headers=acme_headers)
    assert trash_res.status_code == 200

    # Query again: MUST refuse because the knowledge is in Trash!
    rag_trashed_res = client.post("/api/v1/chat", json=chat_q2, headers=acme_headers)
    assert rag_trashed_res.status_code == 200
    assert rag_trashed_res.json().get("is_refusal") is True or "don't have enough verified information" in rag_trashed_res.json()["message"].lower()

    # Restore from Trash
    restore_res = client.post(f"/api/v1/knowledge/sources/{source_id}/restore", headers=acme_headers)
    assert restore_res.status_code == 200

    # Query again: MUST work again
    rag_restored_res = client.post("/api/v1/chat", json=chat_q2, headers=acme_headers)
    assert rag_restored_res.status_code == 200
    assert "36-month" in rag_restored_res.json()["message"].lower() or "36 month" in rag_restored_res.json()["message"].lower()

    # Permanently delete
    perm_del_res = client.delete(f"/api/v1/knowledge/sources/{source_id}/permanent", headers=acme_headers)
    assert perm_del_res.status_code == 200
    assert perm_del_res.json()["data"]["deletedChunksCount"] >= 1

    # Chunks are completely wiped
    k_res_empty = client.get("/api/v1/knowledge", headers=acme_headers)
    assert len(k_res_empty.json()["data"]["sources"]) == 0
    assert k_res_empty.json()["data"]["totalChunks"] == 0

    # 9. DEPLOYMENT LIFECYCLE (DISABLE / ENABLE)
    dis_res = client.post(f"/api/v1/deployments/{dep_id}/disable", headers=acme_headers)
    assert dis_res.status_code == 200
    assert dis_res.json()["data"]["deployment"]["status"] == "disabled"

    en_res = client.post(f"/api/v1/deployments/{dep_id}/enable", headers=acme_headers)
    assert en_res.status_code == 200
    assert en_res.json()["data"]["deployment"]["status"] == "active"

    # 10. MULTI-TENANCY & SECURITY ISOLATION
    # Create Tenant B
    signup_b = client.post("/api/v1/auth/signup", json={
        "fullName": "Bob Vance",
        "email": "bob@vancefridge.com",
        "password": "Password999!",
        "companyName": "Vance Refrigeration",
        "industry": "HVAC",
        "planId": "starter"
    })
    assert signup_b.status_code == 201
    tenant_b_token = signup_b.json()["data"]["token"]
    b_headers = {"Authorization": f"Bearer {tenant_b_token}"}

    # Tenant B attempts to access Acme's company details -> Forbidden 403
    cross_comp_res = client.get(f"/api/v1/companies/{acme_comp_id}", headers=b_headers)
    assert cross_comp_res.status_code == 403

    # Tenant B attempts to access Acme's conversation details -> 404 or 403
    cross_conv_res = client.get(f"/api/v1/conversations/{conv_id}", headers=b_headers)
    assert cross_conv_res.status_code in [403, 404]

    # Tenant B attempts to forge Acme company header -> Forbidden 403
    forged_headers = {"Authorization": f"Bearer {tenant_b_token}", "X-Company-ID": acme_comp_id}
    forged_res = client.get("/api/v1/agent", headers=forged_headers)
    assert forged_res.status_code == 403
