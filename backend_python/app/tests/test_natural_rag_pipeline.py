import os
import sys
import pytest

# Ensure backend_python is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.schemas import ChatRequest, ChatMessage
from app.services.agent_runtime import AgentRuntime
from app.services.query_rewriter import QueryRewriter

SAMPLE_TENANT_CHUNKS = [
    {
        "id": "chk_cloud_1",
        "company_id": "tenant_test_rag",
        "title": "Cloud Services & Support Policies",
        "content": "Our company provides AWS and Azure cloud services. We provide 24/7 customer support. Customers can request refunds within 30 days."
    },
    {
        "id": "chk_tarksha_1",
        "company_id": "tenant_test_rag",
        "title": "TARKSHA Security Platform",
        "content": "TARKSHA is an enterprise data protection platform. TARKSHA protects data using end-to-end envelope encryption and hardware security modules."
    }
]

@pytest.mark.asyncio
async def test_q1_what_does_company_do():
    req = ChatRequest(message="What does your company do?")
    resp = await AgentRuntime.process_message(req, "tenant_test_rag", {}, SAMPLE_TENANT_CHUNKS)
    ans = resp.message.lower()
    assert "cloud" in ans
    assert ("aws" in ans or "azure" in ans)
    # Ensure it didn't dump unrelated refund or support sentences as main answer
    assert "refund" not in ans

@pytest.mark.asyncio
async def test_q2_support_at_night():
    req = ChatRequest(message="Can I get support at night?")
    resp = await AgentRuntime.process_message(req, "tenant_test_rag", {}, SAMPLE_TENANT_CHUNKS)
    ans = resp.message.lower()
    assert "yes" in ans
    assert "24/7" in ans or "support" in ans
    # Ensure it didn't dump cloud services or refund info
    assert "aws" not in ans

@pytest.mark.asyncio
async def test_q3_refund_time_limit():
    req = ChatRequest(message="How long do I have to ask for a refund?")
    resp = await AgentRuntime.process_message(req, "tenant_test_rag", {}, SAMPLE_TENANT_CHUNKS)
    ans = resp.message.lower()
    assert "30 days" in ans
    assert "refund" in ans
    # Ensure it didn't dump cloud services info
    assert "aws" not in ans

@pytest.mark.asyncio
async def test_q4_can_customers_get_refunds():
    req = ChatRequest(message="Can customers request refunds?")
    resp = await AgentRuntime.process_message(req, "tenant_test_rag", {}, SAMPLE_TENANT_CHUNKS)
    ans = resp.message.lower()
    assert "30 days" in ans
    assert "refund" in ans

@pytest.mark.asyncio
async def test_q5_unsupported_question_ceo_refusal():
    req = ChatRequest(message="Who is the CEO of the company?")
    resp = await AgentRuntime.process_message(req, "tenant_test_rag", {}, SAMPLE_TENANT_CHUNKS)
    ans = resp.message.lower()
    # Must refuse or state information is not present rather than hallucinating
    assert any(phrase in ans for phrase in ["don't have", "not have", "does not contain", "cannot verify", "knowledge base"])

@pytest.mark.asyncio
async def test_query_rewriter_followup_resolution():
    history = [
        ChatMessage(role="user", content="What is TARKSHA?"),
        ChatMessage(role="assistant", content="TARKSHA is an enterprise data protection platform.")
    ]
    followup_q = "How does it protect data?"
    rewritten = QueryRewriter.rewrite_query(followup_q, history)
    assert "tarksha" in rewritten.lower()

    # Verify agent runtime answers accurately with the rewritten query
    req = ChatRequest(message=followup_q, history=history)
    resp = await AgentRuntime.process_message(req, "tenant_test_rag", {}, SAMPLE_TENANT_CHUNKS)
    ans = resp.message.lower()
    assert "encryption" in ans or "tarksha" in ans or "envelope" in ans

@pytest.mark.asyncio
async def test_stream_process_message_sse():
    import json
    req = ChatRequest(message="What does your company do?")
    events = []
    async for event_str in AgentRuntime.stream_process_message(req, "tenant_test_rag", {}, SAMPLE_TENANT_CHUNKS):
        if event_str.startswith("data: ") and not event_str.startswith("data: [DONE]"):
            data = json.loads(event_str[6:].strip())
            events.append(data)

    event_types = [e.get("type") for e in events]
    assert "start" in event_types
    assert "token" in event_types
    assert "done" in event_types

    done_event = next(e for e in events if e.get("type") == "done")
    assert "cloud" in done_event["fullMessage"].lower()
