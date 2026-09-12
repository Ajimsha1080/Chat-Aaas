import os
import sys
import json
import asyncio
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from app.main import app
from app.core.security import create_jwt_token
from app.db.database import db
from app.workers.document_worker import DocumentWorker
from app.workers.webhook_worker import WebhookWorker

client = TestClient(app)

def test_tool_idempotency_caching():
    """Verify tool execution with an idempotency key replays cached result on retry."""
    token = create_jwt_token("usr-alex", "comp-techflow", "owner")
    headers = {"Authorization": f"Bearer {token}"}
    idempotency_key = "test-idem-key-9988"

    payload = {
        "toolCode": "execute_refund",
        "args": {"order_id": "ORD-9988", "amount": "Rs. 2500"},
        "userConfirmed": True,
        "idempotencyKey": idempotency_key
    }

    # First call - executes action
    res1 = client.post("/api/v1/tools/execute", json=payload, headers=headers)
    assert res1.status_code == 200
    data1 = res1.json()["data"]
    assert data1["status"] == "success"
    first_result = data1["result"]

    # Second call with same idempotency key - returns cached replay
    res2 = client.post("/api/v1/tools/execute", json=payload, headers=headers)
    assert res2.status_code == 200
    data2 = res2.json()["data"]
    assert data2["status"] == "success"
    assert data2["result"] == first_result
    assert data2.get("idempotentReplay") is True

def test_streaming_sse_endpoint():
    """Verify /api/v1/chat/stream returns real SSE event stream."""
    token = create_jwt_token("usr-alex", "comp-techflow", "owner")
    headers = {"Authorization": f"Bearer {token}"}

    req_body = {
        "message": "What is TechFlow Cloud SLA?",
        "conversation_id": "conv-stream-test",
        "stream": True
    }

    with client.stream("POST", "/api/v1/chat/stream", json=req_body, headers=headers) as response:
        assert response.status_code == 200
        assert "text/event-stream" in response.headers.get("content-type", "")

        events = []
        for line in response.iter_lines():
            if line and line.startswith("data: "):
                raw_json = line[6:].strip()
                if raw_json != "[DONE]":
                    events.append(json.loads(raw_json))

        assert len(events) >= 2
        event_types = [e.get("type") for e in events]
        assert "start" in event_types
        assert "done" in event_types

def test_human_handoff_lifecycle_and_ai_suppression():
    """Verify 6-stage lifecycle and AI response suppression when human is active."""
    token = create_jwt_token("usr-alex", "comp-techflow", "owner")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Send initial user message (conversation created)
    res = client.post(
        "/api/v1/conversations/message",
        json={"conversationId": "conv-handoff-test", "text": "I need help with my billing.", "customerName": "John Doe"},
        headers=headers
    )
    assert res.status_code == 200

    # 2. Trigger Handoff -> state becomes handoff_requested
    res_handoff = client.post(
        "/api/v1/conversations/conv-handoff-test/handoff",
        json={"reason": "Customer requested human supervisor"},
        headers=headers
    )
    assert res_handoff.status_code == 200
    assert res_handoff.json()["data"]["status"] == "handoff_requested"

    # 3. Operator Takeover -> state becomes human_active
    res_takeover = client.post(
        "/api/v1/conversations/conv-handoff-test/takeover",
        json={"operatorId": "usr-alex"},
        headers=headers
    )
    assert res_takeover.status_code == 200
    assert res_takeover.json()["data"]["status"] == "human_active"

    # 4. User sends message while human is active -> AI MUST be suppressed
    res_suppressed = client.post(
        "/api/v1/conversations/message",
        json={"conversationId": "conv-handoff-test", "text": "Are you there?", "customerName": "John Doe"},
        headers=headers
    )
    assert res_suppressed.status_code == 200
    data_suppressed = res_suppressed.json()["data"]
    assert data_suppressed.get("isHumanActive") is True

    # 5. Operator replies directly
    res_reply = client.post(
        "/api/v1/conversations/conv-handoff-test/reply",
        json={"content": "Hello, I am Alex from support. How can I assist?"},
        headers=headers
    )
    assert res_reply.status_code == 200
    assert res_reply.json()["data"]["success"] is True

    # 6. Resolve conversation
    res_resolve = client.post(
        "/api/v1/conversations/conv-handoff-test/resolve",
        headers=headers
    )
    assert res_resolve.status_code == 200
    assert res_resolve.json()["data"]["conversation"]["status"] == "resolved"

    # 7. Close conversation
    res_close = client.post(
        "/api/v1/conversations/conv-handoff-test/close",
        headers=headers
    )
    assert res_close.status_code == 200
    assert res_close.json()["data"]["conversation"]["status"] == "closed"

def test_multi_connection_integrations():
    """Verify multiple connections can be added per provider with unique IDs and tested."""
    token = create_jwt_token("usr-alex", "comp-techflow", "owner")
    headers = {"Authorization": f"Bearer {token}"}

    # Add first Slack connection (#general)
    res1 = client.post(
        "/api/v1/integrations/connect",
        json={"provider": "slack", "name": "Slack General", "credentials": {"bot_token": "xoxb-1"}},
        headers=headers
    )
    assert res1.status_code == 200
    int_id_1 = res1.json()["data"]["id"]

    # Add second Slack connection (#alerts) - must NOT overwrite first!
    res2 = client.post(
        "/api/v1/integrations/connect",
        json={"provider": "slack", "name": "Slack Alerts", "credentials": {"bot_token": "xoxb-2"}},
        headers=headers
    )
    assert res2.status_code == 200
    int_id_2 = res2.json()["data"]["id"]
    assert int_id_1 != int_id_2

    # Test connection endpoint
    res_test = client.post(f"/api/v1/integrations/{int_id_1}/test", headers=headers)
    assert res_test.status_code == 200
    assert res_test.json()["data"]["status"] == "operational"

    # Disconnect
    res_disc = client.delete(f"/api/v1/integrations/{int_id_1}", headers=headers)
    assert res_disc.status_code == 200

def test_workers_queue_and_hmac():
    """Verify DocumentWorker queue processing and WebhookWorker HMAC signing."""
    async def run_worker_checks():
        # Document worker queue
        job_payload = {
            "companyId": "comp-techflow",
            "title": "Production Deployment Manual",
            "rawText": "Deploying services with zero downtime and rolling updates.",
            "chunkSize": 40
        }
        job_id = await DocumentWorker.enqueue_job(job_payload)
        assert job_id.startswith("docjob_")
        assert DocumentWorker.get_job(job_id)["status"] == "queued"

        # Run single loop iteration
        await DocumentWorker.run_worker_loop(max_iterations=1, poll_interval=0.1)
        job_status = DocumentWorker.get_job(job_id)
        assert job_status["status"] == "completed"
        assert job_status["result"]["totalChunks"] >= 1

        # Webhook worker HMAC
        res = await WebhookWorker.dispatch_event(
            target_url="https://api.company.com/webhook",
            event_type="order.refunded",
            payload={"orderId": "ORD-5541"},
            secret="prod_webhook_secret_key"
        )
        assert res["status"] == "delivered"
        assert res["signature"] is not None
        assert res["signature"].startswith("sha256=")

    asyncio.run(run_worker_checks())
