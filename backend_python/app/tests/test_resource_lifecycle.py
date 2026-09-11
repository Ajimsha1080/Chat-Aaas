import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import db

client = TestClient(app)

from app.core.security import create_jwt_token

AUTH_HEADER_TENANT_A = {
    "Authorization": f"Bearer {create_jwt_token('usr-alex', 'comp-techflow', 'owner')}",
    "X-Company-ID": "comp-techflow"
}
AUTH_HEADER_TENANT_B = {
    "Authorization": f"Bearer {create_jwt_token('usr-sarah', 'comp-apex-health', 'owner')}",
    "X-Company-ID": "comp-apex-health"
}


def test_assistant_lifecycle():
    """Tests Draft, Published, Dependencies, Unpublish, Disable, Enable, Archive."""
    # 1. Check dependencies
    dep_res = client.get("/api/v1/agent/dependencies", headers=AUTH_HEADER_TENANT_A)
    assert dep_res.status_code == 200
    data = dep_res.json()["data"]
    assert "totalActiveDeployments" in data
    assert "websitesCount" in data

    # 2. Update Draft
    draft_res = client.put("/api/v1/agent/draft", json={"greetingMessage": "Hello from lifecycle test!"}, headers=AUTH_HEADER_TENANT_A)
    assert draft_res.status_code == 200

    # 3. Publish Draft
    pub_res = client.post("/api/v1/agent/publish", json={"changeSummary": "Lifecycle release v2"}, headers=AUTH_HEADER_TENANT_A)
    assert pub_res.status_code == 200
    agent_info = client.get("/api/v1/agent", headers=AUTH_HEADER_TENANT_A).json()["data"]["agent"]
    assert agent_info["lifecycleStatus"] == "published"

    # 4. Unpublish Agent
    unpub_res = client.post("/api/v1/agent/unpublish", headers=AUTH_HEADER_TENANT_A)
    assert unpub_res.status_code == 200
    assert unpub_res.json()["data"]["agent"]["lifecycleStatus"] == "ready"

    # 5. Disable Agent
    dis_res = client.post("/api/v1/agent/disable", headers=AUTH_HEADER_TENANT_A)
    assert dis_res.status_code == 200
    assert dis_res.json()["data"]["agent"]["lifecycleStatus"] == "disabled"
    assert dis_res.json()["data"]["agent"]["status"] == "paused"

    # Verify that disabled agent returns unavailable message on chat
    chat_res = client.post("/api/v1/conversations/message", json={"text": "What is your SLA?"}, headers=AUTH_HEADER_TENANT_A)
    assert chat_res.status_code == 200
    assert "unavailable on this deployment" in chat_res.json()["data"]["agentMessage"]["text"]

    # 6. Enable Agent again
    en_res = client.post("/api/v1/agent/enable", headers=AUTH_HEADER_TENANT_A)
    assert en_res.status_code == 200
    assert en_res.json()["data"]["agent"]["lifecycleStatus"] == "published"
    assert en_res.json()["data"]["agent"]["status"] == "active"


def test_knowledge_lifecycle_and_rag_data_removal():
    """
    CRITICAL: Tests Knowledge Ingest -> Active in RAG -> Move to Trash -> Excluded from RAG ->
    Restore -> Active in RAG again -> Permanent Delete -> Chunks Completely Purged.
    """
    unique_term = f"ZetaUniqueCode_{uuid.uuid4().hex[:6]}"
    doc_content = f"Official protocol for {unique_term} specifies mandatory biometric validation and quantum encryption algorithms."
    rag_query = f"{unique_term} biometric validation quantum encryption algorithms"

    # 1. Ingest knowledge source
    ingest_res = client.post("/api/v1/knowledge/files", json={
        "title": "Zeta Security Protocol",
        "content": doc_content,
        "docType": "txt",
        "category": "Security"
    }, headers=AUTH_HEADER_TENANT_A)
    assert ingest_res.status_code == 201
    src_id = ingest_res.json()["data"]["sourceId"]
    assert src_id in db.knowledge_sources

    # Verify chunks exist in db.document_chunks
    chunks_created = [c for c in db.document_chunks.values() if c.get("knowledgeSourceId") == src_id]
    assert len(chunks_created) >= 1

    # 2. Test RAG query: Must find and ground the answer
    rag_active = client.post("/api/v1/knowledge/test-rag", json={"query": rag_query}, headers=AUTH_HEADER_TENANT_A)
    assert rag_active.status_code == 200
    active_data = rag_active.json()["data"]
    assert active_data["isGrounded"] is True or active_data.get("grounded") is True
    assert len(active_data["citations"]) >= 1

    # 3. Disable Knowledge Source
    dis_res = client.post(f"/api/v1/knowledge/sources/{src_id}/disable", headers=AUTH_HEADER_TENANT_A)
    assert dis_res.status_code == 200
    assert db.knowledge_sources[src_id]["lifecycleState"] == "disabled"

    # Verify RAG now CANNOT retrieve from disabled source
    rag_disabled = client.post("/api/v1/knowledge/test-rag", json={"query": rag_query}, headers=AUTH_HEADER_TENANT_A)
    assert rag_disabled.status_code == 200
    assert rag_disabled.json()["data"]["isGrounded"] is False
    assert len(rag_disabled.json()["data"]["citations"]) == 0

    # 4. Enable Knowledge Source again
    en_res = client.post(f"/api/v1/knowledge/sources/{src_id}/enable", headers=AUTH_HEADER_TENANT_A)
    assert en_res.status_code == 200
    assert db.knowledge_sources[src_id]["lifecycleState"] == "active"

    # 5. Move to Trash (Soft Delete)
    trash_res = client.post(f"/api/v1/knowledge/sources/{src_id}/trash", headers=AUTH_HEADER_TENANT_A)
    assert trash_res.status_code == 200
    assert db.knowledge_sources[src_id]["lifecycleState"] == "trash"

    # Verify source appears in /knowledge/trash list with 30-day retention
    trash_list = client.get("/api/v1/knowledge/trash", headers=AUTH_HEADER_TENANT_A).json()["data"]
    assert any(s["id"] == src_id for s in trash_list["trash"])
    assert trash_list["retentionPolicyDays"] == 30

    # Verify that trashed source CANNOT be retrieved by RAG
    rag_trashed = client.post("/api/v1/knowledge/test-rag", json={"query": rag_query}, headers=AUTH_HEADER_TENANT_A)
    assert rag_trashed.status_code == 200
    assert rag_trashed.json()["data"]["isGrounded"] is False

    # 6. Restore from Trash
    restore_res = client.post(f"/api/v1/knowledge/sources/{src_id}/restore", headers=AUTH_HEADER_TENANT_A)
    assert restore_res.status_code == 200
    assert db.knowledge_sources[src_id]["lifecycleState"] == "active"

    # Verify RAG can retrieve it again
    rag_restored = client.post("/api/v1/knowledge/test-rag", json={"query": rag_query}, headers=AUTH_HEADER_TENANT_A)
    assert rag_restored.status_code == 200
    assert rag_restored.json()["data"]["isGrounded"] is True

    # 7. Reprocess Knowledge Source
    reprocess_res = client.post(f"/api/v1/knowledge/sources/{src_id}/reprocess", headers=AUTH_HEADER_TENANT_A)
    assert reprocess_res.status_code == 200
    assert db.knowledge_sources[src_id]["processingStage"] == "indexed"

    # 8. Permanent Delete (Purge all RAG data)
    perm_del_res = client.delete(f"/api/v1/knowledge/sources/{src_id}/permanent", headers=AUTH_HEADER_TENANT_A)
    assert perm_del_res.status_code == 200
    assert src_id not in db.knowledge_sources

    # Verify all document chunks for this source are completely purged from database!
    remaining_chunks = [c for c in db.document_chunks.values() if c.get("knowledgeSourceId") == src_id]
    assert len(remaining_chunks) == 0

    # Verify assistant CANNOT answer after permanent deletion
    rag_post_delete = client.post("/api/v1/knowledge/test-rag", json={"query": rag_query}, headers=AUTH_HEADER_TENANT_A)
    assert rag_post_delete.status_code == 200
    assert rag_post_delete.json()["data"]["isGrounded"] is False
    assert len(rag_post_delete.json()["data"]["citations"]) == 0


def test_deployments_lifecycle():
    """Tests Deployment Create -> Disable -> Enable -> Remove."""
    # 1. List deployments
    list_res = client.get("/api/v1/deployments", headers=AUTH_HEADER_TENANT_A)
    assert list_res.status_code == 200
    assert "deployments" in list_res.json()["data"]

    # 2. Create new deployment
    create_res = client.post("/api/v1/deployments", json={
        "name": "Staging Mobile App",
        "channel": "mobile_sdk",
        "domain": "staging.techflow.cloud"
    }, headers=AUTH_HEADER_TENANT_A)
    assert create_res.status_code == 201
    dep_id = create_res.json()["data"]["id"]
    assert db.deployments[dep_id]["status"] == "active"

    # 3. Disable deployment
    dis_res = client.post(f"/api/v1/deployments/{dep_id}/disable", headers=AUTH_HEADER_TENANT_A)
    assert dis_res.status_code == 200
    assert db.deployments[dep_id]["status"] == "disabled"

    # 4. Enable deployment
    en_res = client.post(f"/api/v1/deployments/{dep_id}/enable", headers=AUTH_HEADER_TENANT_A)
    assert en_res.status_code == 200
    assert db.deployments[dep_id]["status"] == "active"

    # 5. Remove deployment
    del_res = client.delete(f"/api/v1/deployments/{dep_id}", headers=AUTH_HEADER_TENANT_A)
    assert del_res.status_code == 200
    assert dep_id not in db.deployments


def test_api_keys_and_webhooks_lifecycle():
    """Tests API Key Create (Secret once) -> Rotate -> Revoke, and Webhook Toggle -> Test -> Delete."""
    # 1. Create API key
    create_key_res = client.post("/api/v1/developer/api-keys", json={"keyName": "Mobile SDK Key"}, headers=AUTH_HEADER_TENANT_A)
    assert create_key_res.status_code == 201
    key_data = create_key_res.json()["data"]
    key_id = key_data["id"]
    assert "rawSecret" in key_data
    assert key_data["status"] == "active"

    # 2. Rotate API key
    rot_res = client.post(f"/api/v1/developer/api-keys/{key_id}/rotate", headers=AUTH_HEADER_TENANT_A)
    assert rot_res.status_code == 200
    assert rot_res.json()["data"]["revokedKeyId"] == key_id
    assert db.api_keys[key_id]["status"] == "revoked"

    # 3. Revoke new key
    new_key_id = rot_res.json()["data"]["newKey"]["id"]
    rev_res = client.post(f"/api/v1/developer/api-keys/{new_key_id}/revoke", headers=AUTH_HEADER_TENANT_A)
    assert rev_res.status_code == 200
    assert db.api_keys[new_key_id]["status"] == "revoked"

    # 4. Webhook Create -> Toggle -> Test -> Delete
    create_wh_res = client.post("/api/v1/developer/webhooks", json={
        "targetUrl": "https://api.techflow.cloud/hooks",
        "events": ["conversation.started"]
    }, headers=AUTH_HEADER_TENANT_A)
    assert create_wh_res.status_code == 201
    wh_id = create_wh_res.json()["data"]["id"]

    # Toggle Webhook
    tog_res = client.post(f"/api/v1/developer/webhooks/{wh_id}/toggle", headers=AUTH_HEADER_TENANT_A)
    assert tog_res.status_code == 200
    assert db.webhooks[wh_id]["status"] == "disabled"

    # Test Webhook
    test_wh_res = client.post(f"/api/v1/developer/webhooks/{wh_id}/test", headers=AUTH_HEADER_TENANT_A)
    assert test_wh_res.status_code == 200
    assert test_wh_res.json()["data"]["delivery"]["statusCode"] == 200

    # Delete Webhook
    del_wh_res = client.delete(f"/api/v1/developer/webhooks/{wh_id}", headers=AUTH_HEADER_TENANT_A)
    assert del_wh_res.status_code == 200
    assert wh_id not in db.webhooks


def test_conversations_lifecycle():
    """Tests Conversation Archive, Delete, Bulk-Archive, Bulk-Delete."""
    # 1. Create two test conversations
    conv1 = client.post("/api/v1/conversations/message", json={"text": "Hello 1"}, headers=AUTH_HEADER_TENANT_A).json()["data"]["conversation"]
    conv2 = client.post("/api/v1/conversations/message", json={"text": "Hello 2"}, headers=AUTH_HEADER_TENANT_A).json()["data"]["conversation"]
    cid1, cid2 = conv1["id"], conv2["id"]

    # 2. Archive conversation 1
    arc_res = client.post(f"/api/v1/conversations/{cid1}/archive", headers=AUTH_HEADER_TENANT_A)
    assert arc_res.status_code == 200
    assert db.conversations[cid1]["status"] == "archived"

    # 3. Delete conversation 1
    del_res = client.delete(f"/api/v1/conversations/{cid1}", headers=AUTH_HEADER_TENANT_A)
    assert del_res.status_code == 200
    assert cid1 not in db.conversations

    # 4. Bulk Archive
    conv3 = client.post("/api/v1/conversations/message", json={"text": "Hello 3"}, headers=AUTH_HEADER_TENANT_A).json()["data"]["conversation"]
    cid3 = conv3["id"]
    bulk_arc = client.post("/api/v1/conversations/bulk-archive", json={"conversationIds": [cid2, cid3]}, headers=AUTH_HEADER_TENANT_A)
    assert bulk_arc.status_code == 200
    assert bulk_arc.json()["data"]["archivedCount"] == 2

    # 5. Bulk Delete
    bulk_del = client.post("/api/v1/conversations/bulk-delete", json={"conversationIds": [cid2, cid3]}, headers=AUTH_HEADER_TENANT_A)
    assert bulk_del.status_code == 200
    assert bulk_del.json()["data"]["deletedCount"] == 2
    assert cid2 not in db.conversations
    assert cid3 not in db.conversations


def test_workspace_isolation_and_security():
    """Ensures Tenant B cannot access or mutate Tenant A resources."""
    # Tenant B tries to delete Tenant A's knowledge source
    del_res = client.delete("/api/v1/knowledge/sources/ks-tf-1", headers=AUTH_HEADER_TENANT_B)
    assert del_res.status_code == 404
    assert "ks-tf-1" in db.knowledge_sources  # Untouched

    # Tenant B tries to disable Tenant A's deployment
    dis_res = client.post("/api/v1/deployments/dep-tf-widget/disable", headers=AUTH_HEADER_TENANT_B)
    assert dis_res.status_code == 404
    assert db.deployments["dep-tf-widget"]["status"] == "active"  # Untouched
