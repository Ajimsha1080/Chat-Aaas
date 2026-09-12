import os
import sys
import asyncio
import pytest
from fastapi.testclient import TestClient

# Ensure UTF-8 output on Windows consoles
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Ensure backend_python is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.main import app
from app.core.security import create_jwt_token, hash_password
from app.db.database import db
from app.services.billing_service import BillingService
from app.services.crawler_service import CrawlerService
from app.workers.document_worker import DocumentWorker
from app.workers.evaluation_worker import EvaluationWorker
from app.workers.webhook_worker import WebhookWorker

client = TestClient(app)

def test_health_and_readiness():
    """Verify health and readiness endpoints."""
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "uptime_seconds" in data

    ready_res = client.get("/ready")
    assert ready_res.status_code == 200
    ready_data = ready_res.json()
    assert ready_data["ready"] is True
    assert ready_data["checks"]["database_connected"] is True


def test_auth_and_jwt_tokens():
    """Verify login and JWT token issuance."""
    # Test valid owner login
    res = client.post("/api/v1/auth/login", json={
        "email": "alex@techflow.io",
        "password": "Password123!"
    })
    assert res.status_code == 200
    body = res.json()
    assert "token" in body["data"]
    assert body["data"]["role"] == "owner"

    # Test invalid login
    bad_res = client.post("/api/v1/auth/login", json={
        "email": "alex@techflow.io",
        "password": "WrongPassword"
    })
    assert bad_res.status_code == 401


def test_multi_tenant_isolation():
    """Verify Tenant A cannot access Tenant B resources."""
    # Create tokens for TechFlow (Tenant A) and Apex Health (Tenant B)
    token_techflow = create_jwt_token("usr-alex", "comp-techflow", "owner")
    token_apex = create_jwt_token("usr-apex-1", "comp-apex-health", "owner")

    # Fetch agent as TechFlow
    res_a = client.get("/api/v1/agent", headers={"Authorization": f"Bearer {token_techflow}"})
    assert res_a.status_code == 200
    agent_a = res_a.json()["data"]["agent"]
    assert agent_a["companyId"] == "comp-techflow"

    # Fetch agent as Apex
    res_b = client.get("/api/v1/agent", headers={"Authorization": f"Bearer {token_apex}"})
    assert res_b.status_code == 200
    agent_b = res_b.json()["data"]["agent"]
    assert agent_b["companyId"] == "comp-apex-health"

    # Verify distinct names and isolation
    assert agent_a["companyId"] != agent_b["companyId"]


def test_rbac_permission_enforcement():
    """Verify RBAC rules: Viewer cannot edit draft, Non-SuperAdmin cannot access admin platform routes."""
    viewer_token = create_jwt_token("usr-viewer", "comp-techflow", "viewer")
    owner_token = create_jwt_token("usr-alex", "comp-techflow", "owner")
    admin_token = create_jwt_token("usr-admin", "comp-techflow", "super_admin")

    # Viewer tries to edit agent draft -> Forbidden
    edit_res = client.put(
        "/api/v1/agent/draft",
        json={"name": "Hacked Name"},
        headers={"Authorization": f"Bearer {viewer_token}"}
    )
    assert edit_res.status_code == 403

    # Owner can edit draft -> Success
    edit_ok = client.put(
        "/api/v1/agent/draft",
        json={"name": "CoarAI Senior Specialist"},
        headers={"Authorization": f"Bearer {owner_token}"}
    )
    assert edit_ok.status_code == 200

    # Owner tries to view platform-wide admin tenants -> Forbidden
    admin_res = client.get("/api/v1/admin/tenants", headers={"Authorization": f"Bearer {owner_token}"})
    assert admin_res.status_code == 403

    # Super Admin can view platform-wide admin tenants -> Success
    super_res = client.get("/api/v1/admin/tenants", headers={"Authorization": f"Bearer {admin_token}"})
    assert super_res.status_code == 200
    assert "companies" in super_res.json()["data"]


def test_agent_draft_publish_and_rollback():
    """Verify full agent lifecycle: Draft -> Publish -> Rollback."""
    owner_token = create_jwt_token("usr-alex", "comp-techflow", "owner")
    headers = {"Authorization": f"Bearer {owner_token}"}

    # 1. Update draft
    client.put(
        "/api/v1/agent/draft",
        json={"greetingMessage": "Greetings! I am CoarAI v2.1 Enterprise."},
        headers=headers
    )

    # 2. Publish draft
    pub_res = client.post(
        "/api/v1/agent/publish",
        json={"changeSummary": "Updated enterprise greeting tone"},
        headers=headers
    )
    assert pub_res.status_code == 200
    pub_data = pub_res.json()["data"]
    new_version_id = pub_data["version"]["id"]
    new_version_number = pub_data["version"]["versionNumber"]
    assert new_version_number >= 2

    # 3. View versions history
    ver_res = client.get("/api/v1/agent/versions", headers=headers)
    assert ver_res.status_code == 200
    versions = ver_res.json()["data"]["versions"]
    assert len(versions) >= 2

    # 4. Rollback to v1
    v1 = [v for v in versions if v["versionNumber"] == 1][0]
    roll_res = client.post(
        "/api/v1/agent/rollback",
        json={"targetVersionId": v1["id"]},
        headers=headers
    )
    assert roll_res.status_code == 200
    assert roll_res.json()["data"]["activeVersion"]["versionNumber"] == 1


def test_tool_risk_tiers_and_confirmation_gate():
    """Verify 3-tier risk actions: read_only runs freely, high_risk requires explicit confirmation."""
    owner_token = create_jwt_token("usr-alex", "comp-techflow", "owner")
    headers = {"Authorization": f"Bearer {owner_token}"}

    # Low/Read-only action: check_order_status
    read_res = client.post(
        "/api/v1/tools/execute",
        json={"toolCode": "check_order_status", "args": {"order_id": "ORD-123"}},
        headers=headers
    )
    assert read_res.status_code == 200
    assert read_res.json()["data"]["status"] == "success"

    # High-risk action: execute_refund without confirmation -> blocked
    blocked_res = client.post(
        "/api/v1/tools/execute",
        json={"toolCode": "execute_refund", "args": {"order_id": "ORD-123", "amount": "Rs. 500"}, "userConfirmed": False},
        headers=headers
    )
    assert blocked_res.status_code == 200
    assert blocked_res.json()["data"]["status"] == "requires_confirmation"
    assert "confirmationPrompt" in blocked_res.json()["data"]

    # High-risk action: execute_refund with confirmation -> executed
    confirmed_res = client.post(
        "/api/v1/tools/execute",
        json={"toolCode": "execute_refund", "args": {"order_id": "ORD-123", "amount": "Rs. 500"}, "userConfirmed": True},
        headers=headers
    )
    assert confirmed_res.status_code == 200
    assert confirmed_res.json()["data"]["status"] == "success"


def test_ssrf_crawler_defense():
    """Verify SSRF defense stops localhost, private IP subnets, and AWS/GCP metadata endpoints."""
    # Localhost
    safe1, msg1 = CrawlerService.validate_url_safety("http://localhost:8000/metrics")
    assert safe1 is False
    assert "blocked" in msg1.lower() or "ssrf" in msg1.lower()

    # Cloud metadata IP (169.254.169.254)
    safe2, msg2 = CrawlerService.validate_url_safety("http://169.254.169.254/latest/meta-data")
    assert safe2 is False

    # Private network RFC1918
    safe3, msg3 = CrawlerService.validate_url_safety("http://192.168.1.1/admin")
    assert safe3 is False

    # Public safe HTTPS URL
    safe4, _ = CrawlerService.validate_url_safety("https://docs.techflow.io/guides/setup")
    assert safe4 is True


def test_billing_and_gst_calculation():
    """Verify Indian GST (18%) computation with CGST+SGST / IGST breakdown."""
    plans = BillingService.get_plans()
    assert len(plans) >= 3

    # Pro tier monthly = Rs. 14,999
    # Intra-state (Maharashtra -> Maharashtra): 9% CGST + 9% SGST = 18% Total
    intra_invoice = BillingService.calculate_gst_invoice(14999, is_interstate=False)
    assert intra_invoice["subtotalINR"] == 14999.0
    assert intra_invoice["taxRatePercent"] == 18.0
    assert intra_invoice["taxBreakdown"]["cgst"] == round(14999 * 0.09, 2)
    assert intra_invoice["taxBreakdown"]["sgst"] == round(14999 * 0.09, 2)
    assert intra_invoice["taxBreakdown"]["igst"] == 0.0
    assert intra_invoice["totalINR"] == round(14999 * 1.18, 2)

    # Inter-state (Maharashtra -> Karnataka): 18% IGST
    inter_invoice = BillingService.calculate_gst_invoice(14999, is_interstate=True)
    assert inter_invoice["taxBreakdown"]["cgst"] == 0.0
    assert inter_invoice["taxBreakdown"]["sgst"] == 0.0
    assert inter_invoice["taxBreakdown"]["igst"] == round(14999 * 0.18, 2)
    assert inter_invoice["totalINR"] == round(14999 * 1.18, 2)


def test_async_worker_pipelines():
    """Verify document chunking, evaluation, and webhook delivery workers."""
    # 1. Document Worker
    doc_job = asyncio.run(DocumentWorker.process_document_job({
        "companyId": "comp-techflow",
        "title": "Security Whitepaper",
        "rawText": "# Encryption\n\nAll customer data is encrypted using AES-256-GCM."
    }))
    assert doc_job["status"] == "completed"
    assert doc_job["totalChunks"] >= 1

    # 2. Evaluation Worker
    eval_job = asyncio.run(EvaluationWorker.evaluate_conversation_turn({
        "companyId": "comp-techflow",
        "query": "What encryption is used?",
        "answer": "All customer data is encrypted using AES-256-GCM.",
        "groundingContexts": ["All customer data is encrypted using AES-256-GCM."]
    }))
    assert eval_job["status"] == "evaluated"
    assert eval_job["faithfulness"] >= 0.75

    # 3. Webhook Worker
    hook_job = asyncio.run(WebhookWorker.dispatch_event(
        "https://webhook.site/test",
        "conversation.resolved",
        {"conversationId": "conv-101", "resolvedBy": "agent"}
    ))
    assert hook_job["status"] == "delivered"
    assert hook_job["eventType"] == "conversation.resolved"


def test_ai_specialized_services():
    """Verify specialized AI endpoints: embeddings, rerank, evaluate, classify with auth protection."""
    token = create_jwt_token("usr-alex", "comp-techflow", "owner")
    headers = {"Authorization": f"Bearer {token}"}

    # Unauthenticated request must be rejected
    unauth_res = client.post("/api/v1/embeddings", json={"texts": ["Unauthenticated check"]})
    assert unauth_res.status_code == 401

    # Embeddings (Authenticated)
    emb_res = client.post("/api/v1/embeddings", json={"texts": ["TechFlow enterprise cloud", "Billing policy"]}, headers=headers)
    assert emb_res.status_code == 200
    assert len(emb_res.json()["embeddings"]) == 2

    # Reranking (Authenticated)
    rerank_res = client.post("/api/v1/rerank", json={
        "query": "refund timeline",
        "candidates": [
            {"id": "c1", "content": "Mumbai cluster status"},
            {"id": "c2", "content": "14 days refund policy window"}
        ]
    }, headers=headers)
    assert rerank_res.status_code == 200
    assert rerank_res.json()["results"][0]["id"] == "c2"

    # NLP Intent Classification (Authenticated)
    cls_res = client.post("/api/v1/classify", json={"text": "I want to cancel my subscription right now"}, headers=headers)
    assert cls_res.status_code == 200
    assert cls_res.json()["intent"] in ["cancellation_request", "refund_request", "general_inquiry"]
