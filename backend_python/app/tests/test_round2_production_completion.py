import os
import sys
import time
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from app.main import app
from app.db.database import db
from app.core.security import create_jwt_token
from app.core.queue import JobQueue
from app.services.auth_service import AuthService
from app.services.tool_registry import ToolRegistry
from app.services.tool_service import ToolService

client = TestClient(app)

def test_sql_authoritative_persistence_roundtrip():
    ts = int(time.time() * 1000)
    test_comp_id = f"comp-persist-{ts}"
    db.companies[test_comp_id] = {
        "id": test_comp_id,
        "name": f"Persistence Enterprise {ts}",
        "slug": f"persistence-ent-{ts}",
        "domain": f"persistence-{ts}.io",
        "industry": "FinTech",
        "planId": "enterprise",
        "planStatus": "active",
        "isSuspended": False,
        "apiKey": f"key_{test_comp_id}",
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }
    db.flush_durable_storage()

    db.companies.clear()
    assert test_comp_id not in db.companies
    db.load_from_database()
    assert test_comp_id in db.companies
    assert db.companies[test_comp_id]["name"] == f"Persistence Enterprise {ts}"

def test_job_queue_durability():
    import asyncio
    queue = JobQueue(f"test_round2_queue_{int(time.time() * 1000)}")

    async def run_queue_cycle():
        job_id = await queue.enqueue(
            job_type="index_chunk",
            company_id="comp-techflow",
            payload={"task": "index_chunk", "chunk_count": 5}
        )
        assert job_id is not None

        claimed = await queue.claim()
        assert claimed is not None
        assert claimed["id"] == job_id
        assert claimed["payload"]["chunk_count"] == 5

        await queue.complete(job_id, {"indexed": True, "elapsed_ms": 12})
        status = await queue.get_status(job_id)
        assert status["status"] == "completed"
        assert status["result"]["indexed"] is True

    asyncio.run(run_queue_cycle())

def test_auth_service_no_unsafe_tenant_fallback():
    orphan_user_id = f"usr-orphan-{int(time.time() * 1000)}"
    orphan_email = f"orphan_{int(time.time())}@example.com"
    from app.core.security import hash_password
    db.users[orphan_user_id] = {
        "id": orphan_user_id,
        "email": orphan_email,
        "passwordHash": hash_password("ValidPass123!"),
        "fullName": "Orphan User",
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }

    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        AuthService.login(orphan_email, "ValidPass123!")
    assert exc_info.value.status_code == 403
    assert "not linked to an active workspace company" in exc_info.value.detail

def test_dynamic_tools_no_mock_artifacts():
    token = create_jwt_token("usr-alex", "comp-techflow", "owner")
    headers = {"Authorization": f"Bearer {token}"}

    res_order = client.post(
        "/api/v1/tools/execute",
        json={"toolCode": "check_order_status", "args": {"order_id": "ORD-774921"}},
        headers=headers
    )
    assert res_order.status_code == 200
    order_data = res_order.json()["data"]["result"]
    assert "BLU-994821038" not in str(order_data)
    assert "774921" in str(order_data)

    idempotency_key = f"idem-{int(time.time() * 1000)}"
    res_refund_1 = client.post(
        "/api/v1/tools/execute",
        json={"toolCode": "execute_refund", "args": {"order_id": "ORD-9912", "amount": "4500"}, "userConfirmed": True, "idempotencyKey": idempotency_key},
        headers=headers
    )
    assert res_refund_1.status_code == 200
    refund_res_1 = res_refund_1.json()["data"]
    assert "RF-AUTH-993821" not in str(refund_res_1)
    assert "Processed via Razorpay/Stripe" not in str(refund_res_1)
    assert refund_res_1["status"] == "success"

    res_refund_2 = client.post(
        "/api/v1/tools/execute",
        json={"toolCode": "execute_refund", "args": {"order_id": "ORD-9912", "amount": "4500"}, "userConfirmed": True, "idempotencyKey": idempotency_key},
        headers=headers
    )
    assert res_refund_2.status_code == 200
    assert res_refund_2.json()["data"].get("idempotentReplay") is True

def test_integration_latency_is_measured():
    token = create_jwt_token("usr-alex", "comp-techflow", "owner")
    headers = {"Authorization": f"Bearer {token}"}

    conn_res = client.post(
        "/api/v1/integrations/connect",
        json={"provider": "webhook", "name": "Dynamic Hook Test", "credentials": {"secret": "abc"}, "config": {"url": "https://httpbin.org/status/200"}},
        headers=headers
    )
    assert conn_res.status_code == 200
    int_id = conn_res.json()["data"]["id"]

    test_res = client.post(f"/api/v1/integrations/{int_id}/test", headers=headers)
    assert test_res.status_code == 200
    data = test_res.json()["data"]
    assert data["status"] == "operational"
    assert "latencyMs" in data
    assert isinstance(data["latencyMs"], (int, float))
    assert data["latencyMs"] > 0

def test_specialized_ai_endpoints_security():
    assert client.post("/v1/embeddings", json={"texts": ["test"]}).status_code == 401
    assert client.post("/v1/rerank", json={"query": "q", "candidates": [{"id": "1", "content": "c"}]}).status_code == 401
    assert client.post("/v1/evaluate", json={"query": "q", "answer": "a", "context_chunks": ["c"]}).status_code == 401

    token = create_jwt_token("usr-alex", "comp-techflow", "owner")
    headers = {"Authorization": f"Bearer {token}"}

    emb_res = client.post("/v1/embeddings", json={"texts": ["Enterprise RAG testing"]}, headers=headers)
    assert emb_res.status_code == 200
    assert len(emb_res.json()["embeddings"]) == 1

def test_readiness_probe_active():
    res = client.get("/ready")
    assert res.status_code == 200
    data = res.json()
    assert data["checks"]["database_connected"] is True
    assert data["checks"]["worker_queue"] is True
    assert data["ready"] is True
