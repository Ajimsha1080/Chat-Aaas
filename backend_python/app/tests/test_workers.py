import os
import sys
import asyncio
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from app.workers.document_worker import DocumentWorker
from app.workers.evaluation_worker import EvaluationWorker
from app.workers.webhook_worker import WebhookWorker

def test_document_worker_semantic_chunking():
    job_payload = {
        "companyId": "comp-techflow",
        "title": "Cloud SLA Guide",
        "rawText": "# Overview\n\n99.99% multi-region uptime.\n\n# Support\n\n24/7 dedicated engineering.",
        "chunkSize": 50
    }
    res = asyncio.run(DocumentWorker.process_document_job(job_payload))
    assert res["status"] == "completed"
    assert res["totalChunks"] >= 2

def test_evaluation_worker_rag_scoring():
    job_payload = {
        "companyId": "comp-techflow",
        "query": "What is the uptime SLA?",
        "answer": "99.99% multi-region uptime.",
        "groundingContexts": ["99.99% multi-region uptime."]
    }
    res = asyncio.run(EvaluationWorker.evaluate_conversation_turn(job_payload))
    assert res["status"] == "evaluated"
    assert res["faithfulness"] == 1.0
    assert res["hallucinationRisk"] == "low"

def test_webhook_worker_event_dispatch():
    res = asyncio.run(WebhookWorker.dispatch_event(
        "https://api.company.com/webhook",
        "agent.published",
        {"agentId": "agent-1", "versionNumber": 2}
    ))
    assert res["status"] == "delivered"
    assert res["eventType"] == "agent.published"
