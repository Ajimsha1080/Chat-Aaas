import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from app.main import app
from app.services.crawler_service import CrawlerService
from app.services.rag_engine import RAGEngine

from app.core.security import create_jwt_token

client = TestClient(app)

AUTH_HEADER = {
    "Authorization": f"Bearer {create_jwt_token('usr-alex', 'comp-techflow', 'owner')}",
    "X-Company-ID": "comp-techflow"
}

def test_ssrf_crawler_defense():
    # Localhost
    safe, msg = CrawlerService.validate_url_safety("http://localhost:8080/metrics")
    assert safe is False

    # Loopback IP
    safe_ip, msg_ip = CrawlerService.validate_url_safety("http://127.0.0.1/admin")
    assert safe_ip is False

    # AWS metadata
    safe_aws, _ = CrawlerService.validate_url_safety("http://169.254.169.254/latest/meta-data")
    assert safe_aws is False

    # Private network
    safe_priv, _ = CrawlerService.validate_url_safety("http://192.168.0.100/config")
    assert safe_priv is False

    # Valid public URL
    safe_pub, _ = CrawlerService.validate_url_safety("https://docs.enterprise-support.com")
    assert safe_pub is True

def test_multi_tenant_chunk_retrieval_isolation():
    chunks = [
        {"id": "c1", "company_id": "tenant_1", "content": "Tenant 1 specific financial data."},
        {"id": "c2", "company_id": "tenant_2", "content": "Tenant 2 specific medical logs."}
    ]

    res1 = RAGEngine.search_chunks("financial data", "tenant_1", chunks)
    res2 = RAGEngine.search_chunks("financial data", "tenant_2", chunks)

    assert len(res1) == 1
    assert res1[0].chunk_id == "c1"
    assert len(res2) == 0

def test_knowledge_document_upload():
    response = client.post(
        "/api/v1/knowledge/upload",
        json={
            "title": "Quarterly Security Policy",
            "content": "All production database accesses require multi-factor authentication and hardware security keys. Encryption at rest is mandatory for all customer data.",
            "fileName": "security_policy_2026.pdf",
            "docType": "pdf",
            "category": "security"
        },
        headers=AUTH_HEADER
    )
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == 201
    assert body["data"]["status"] == "indexed"
    assert body["data"]["chunksCreated"] >= 1
    assert body["data"]["fileName"] == "security_policy_2026.pdf"

def test_knowledge_faq_creation_and_list():
    response = client.post(
        "/api/v1/knowledge/faqs",
        json={
            "question": "What is the standard SLA response time for Critical incidents?",
            "answer": "Critical severity tickets are guaranteed an initial engineer response within 15 minutes, 24/7/365.",
            "category": "SLA & Support"
        },
        headers=AUTH_HEADER
    )
    assert response.status_code == 201
    data = response.json()["data"]
    assert "source" in data
    assert data["source"]["sourceType"] == "faq"

    # List sources
    list_res = client.get("/api/v1/knowledge?source_type=faq", headers=AUTH_HEADER)
    assert list_res.status_code == 200
    sources = list_res.json()["data"]["sources"]
    assert any(s["title"] == "What is the standard SLA response time for Critical incidents?" for s in sources)

def test_knowledge_collections_lifecycle():
    # Create Collection
    create_res = client.post(
        "/api/v1/knowledge/collections",
        json={
            "name": "Security & Compliance 2026",
            "description": "SOC2, ISO27001, and HIPAA policies",
            "icon": "Shield",
            "color": "emerald"
        },
        headers=AUTH_HEADER
    )
    assert create_res.status_code == 201
    col = create_res.json()["data"]
    col_id = col["id"]
    assert col["name"] == "Security & Compliance 2026"

    # List Collections
    list_res = client.get("/api/v1/knowledge/collections", headers=AUTH_HEADER)
    assert list_res.status_code == 200
    cols = list_res.json()["data"]["collections"]
    assert any(c["id"] == col_id for c in cols)

    # Delete Collection
    del_res = client.delete(f"/api/v1/knowledge/collections/{col_id}", headers=AUTH_HEADER)
    assert del_res.status_code == 200

def test_knowledge_gaps_and_faq_conversion():
    # Get Gaps
    gaps_res = client.get("/api/v1/knowledge/gaps", headers=AUTH_HEADER)
    assert gaps_res.status_code == 200
    gaps = gaps_res.json()["data"]["gaps"]
    assert len(gaps) > 0
    target_gap = gaps[0]

    # Convert Gap to FAQ
    convert_res = client.post(
        f"/api/v1/knowledge/gaps/{target_gap['id']}/convert-faq",
        json={
            "answer": "We support on-premise deployments via our enterprise Kubernetes Helm charts."
        },
        headers=AUTH_HEADER
    )
    assert convert_res.status_code == 201
    assert convert_res.json()["data"]["faq"]["source"]["title"] == target_gap["query"]

def test_rag_test_endpoint():
    # Grounded Query
    grounded_res = client.post(
        "/api/v1/knowledge/test-rag",
        json={"query": "What is the return policy timeframe?", "top_k": 3},
        headers=AUTH_HEADER
    )
    assert grounded_res.status_code == 200
    data = grounded_res.json()["data"]
    assert data["grounded"] is True
    assert len(data["citations"]) > 0

    # Ungrounded Query (triggers refusal + gap creation)
    ungrounded_res = client.post(
        "/api/v1/knowledge/test-rag",
        json={"query": "What is the quantum teleportation frequency of the enterprise rocket?", "top_k": 3},
        headers=AUTH_HEADER
    )
    assert ungrounded_res.status_code == 200
    ug_data = ungrounded_res.json()["data"]
    assert ug_data["grounded"] is False
    assert ug_data["needsGapRecorded"] is True
    assert "couldn't find enough information" in ug_data["answer"].lower()

def test_knowledge_health_metrics():
    res = client.get("/api/v1/knowledge/health", headers=AUTH_HEADER)
    assert res.status_code == 200
    data = res.json()["data"]
    assert "healthScore" in data
    assert "status" in data
    assert data["status"] in ["Healthy", "Needs Attention", "Critical"]
    assert "totalSources" in data
    assert "totalChunks" in data



