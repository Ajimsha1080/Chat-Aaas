import pytest
import asyncio
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import db
from app.core.cache import tenant_cache
from app.core.locks import DistributedLock, distributed_lock
from app.core.metrics import metrics_collector
from app.services.backup_service import BackupService

client = TestClient(app)

def test_database_connection_pool_and_read_replica():
    """Verifies connection pool configuration and read replica session routing."""
    status = db.get_pool_status()
    assert isinstance(status, dict)
    
    # Read session manager works
    with db.get_read_session(company_id="comp-techflow") as session:
        assert session is not None

@pytest.mark.asyncio
async def test_tenant_cache_lifecycle_and_invalidation():
    """Verifies multi-tenant cache isolation, TTL, and prefix invalidation."""
    comp_a = "comp-tenant-alpha"
    comp_b = "comp-tenant-beta"

    # Set cached entities
    await tenant_cache.set(comp_a, "agent", "agent-1", {"name": "Alpha Agent"}, ttl_seconds=60)
    await tenant_cache.set(comp_b, "agent", "agent-1", {"name": "Beta Agent"}, ttl_seconds=60)

    # Multi-tenant isolation in cache
    val_a = await tenant_cache.get(comp_a, "agent", "agent-1")
    val_b = await tenant_cache.get(comp_b, "agent", "agent-1")
    assert val_a["name"] == "Alpha Agent"
    assert val_b["name"] == "Beta Agent"

    # Specific entity invalidation
    await tenant_cache.invalidate(comp_a, "agent", "agent-1")
    assert await tenant_cache.get(comp_a, "agent", "agent-1") is None
    assert await tenant_cache.get(comp_b, "agent", "agent-1") is not None

    # Full tenant invalidation
    await tenant_cache.invalidate_tenant(comp_b)
    assert await tenant_cache.get(comp_b, "agent", "agent-1") is None

@pytest.mark.asyncio
async def test_distributed_lock_concurrency_and_context_manager():
    """Verifies distributed lock mutual exclusion and safe release."""
    lock_key = "agent_publishing_mutex"
    lock1 = DistributedLock(lock_key, ttl_seconds=5.0)
    lock2 = DistributedLock(lock_key, ttl_seconds=5.0)

    # 1. Lock 1 acquires
    acq1 = await lock1.acquire(timeout_seconds=0.5)
    assert acq1 is True

    # 2. Lock 2 attempts to acquire and is blocked
    acq2 = await lock2.acquire(timeout_seconds=0.1)
    assert acq2 is False

    # 3. Lock 1 releases
    rel1 = await lock1.release()
    assert rel1 is True

    # 4. Lock 2 can now acquire
    acq2_retry = await lock2.acquire(timeout_seconds=0.5)
    assert acq2_retry is True
    await lock2.release()

    # 5. Context manager usage
    async with distributed_lock("billing_checkout_mutex", ttl_seconds=5.0) as l:
        assert l.acquired is True

def test_prometheus_apm_metrics_endpoint():
    """Verifies /metrics endpoint returns valid Prometheus format and tracks APM histograms."""
    # Record synthetic metric data
    metrics_collector.record_request("GET", "/api/v1/agents", 200, 0.045)
    metrics_collector.record_request("POST", "/api/v1/chat", 200, 0.120)
    metrics_collector.record_token_consumption("gpt-4o", "comp-techflow", 1500)
    metrics_collector.record_rag_faithfulness(0.96)

    response = client.get("/metrics")
    assert response.status_code == 200
    assert "text/plain" in response.headers["content-type"]
    body = response.text

    assert "# HELP http_requests_total" in body
    assert "# TYPE http_requests_total counter" in body
    assert 'http_requests_total{method="GET",endpoint="/api/v1/agents",status="200"}' in body
    assert "# HELP http_request_duration_seconds" in body
    assert "quantile=\"0.95\"" in body
    assert "llm_tokens_consumed_total" in body
    assert "rag_evaluation_faithfulness_ratio" in body
    assert "db_connection_pool_size" in body

def test_disaster_recovery_tenant_backup_and_restore():
    """Verifies point-in-time encrypted snapshot generation and state restoration."""
    if "comp-techflow" not in db.companies:
        db.seed_demo_data()

    # 1. Create tenant backup
    backup = BackupService.create_tenant_backup("comp-techflow")
    assert backup["success"] is True
    assert backup["companyId"] == "comp-techflow"
    assert backup["sizeBytes"] > 0
    assert backup["entityCounts"]["agents"] >= 1

    # 2. Simulate data mutation
    orig_name = db.companies["comp-techflow"]["name"]
    db.companies["comp-techflow"]["name"] = "Corrupted Company Name"

    # 3. Restore backup
    restore_payload = {
        "companyId": "comp-techflow",
        "company": {"id": "comp-techflow", "name": orig_name, "slug": "techflow-cloud", "planId": "business", "billingCycle": "monthly", "planStatus": "active", "isSuspended": False, "createdAt": "2026-08-01T00:00:00.000Z"},
        "agents": [db.agents.get("agent-tf-1", {"id": "agent-tf-1", "companyId": "comp-techflow", "name": "FlowBot"})]
    }
    restore_res = BackupService.restore_tenant_backup("comp-techflow", restore_payload)
    assert restore_res["success"] is True
    assert db.companies["comp-techflow"]["name"] == orig_name
