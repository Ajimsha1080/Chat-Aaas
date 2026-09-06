import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from app.main import app
from app.services.crawler_service import CrawlerService
from app.services.rag_engine import RAGEngine

client = TestClient(app)

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
        }
    )
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == 201
    assert body["data"]["status"] == "indexed"
    assert body["data"]["chunksCreated"] >= 1
    assert body["data"]["fileName"] == "security_policy_2026.pdf"


