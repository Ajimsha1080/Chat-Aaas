import os
import sys
import asyncio

# Ensure UTF-8 output on Windows consoles
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Ensure backend_python is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.services.crawler_service import CrawlerService
from app.services.rag_engine import RAGEngine
from app.services.tool_registry import ToolRegistry
from app.services.agent_runtime import AgentRuntime
from app.services.embedding_service import EmbeddingService
from app.services.reranking_service import RerankingService
from app.services.evaluation_service import EvaluationService
from app.services.document_ai import DocumentAIService
from app.services.classification_service import ClassificationService
from app.schemas import (
    ChatRequest, 
    EmbeddingRequest, 
    RerankRequest, 
    RerankCandidate, 
    EvaluateRequest, 
    DocumentProcessRequest, 
    ClassificationRequest
)

import pytest

mock_chunks = [
    {"id": "c1", "company_id": "tenant_alpha", "content": "Alpha confidential financials."},
    {"id": "c2", "company_id": "tenant_beta", "content": "Beta confidential roadmap."}
]

def test_ssrf_crawler_protection():
    safe_local, _ = CrawlerService.validate_url_safety("http://localhost:8000/admin")
    safe_ip, _ = CrawlerService.validate_url_safety("http://127.0.0.1/etc/passwd")
    safe_aws, _ = CrawlerService.validate_url_safety("http://169.254.169.254/latest/meta-data")
    assert not safe_local
    assert not safe_ip
    assert not safe_aws

def test_rag_multi_tenancy_isolation():
    alpha_results = RAGEngine.search_chunks("financials", "tenant_alpha", mock_chunks, threshold=0.1)
    beta_results = RAGEngine.search_chunks("financials", "tenant_beta", mock_chunks, threshold=0.1)
    assert len(alpha_results) == 1
    assert len(beta_results) == 0

def test_high_risk_tool_confirmation_gate():
    refund_res = ToolRegistry.execute_tool("execute_refund", {"order_id": "ORD-123", "amount": "Rs.500"}, "comp_test", user_confirmed=False)
    assert refund_res.requires_confirmation is True
    assert refund_res.success is False

def test_anti_hallucination_grounding():
    chunks_empty = []
    is_grounded, refusal_msg = RAGEngine.evaluate_groundedness(chunks_empty, threshold=0.72)
    assert not is_grounded
    assert "cannot verify" in refusal_msg.lower() or "missing" in refusal_msg.lower() or len(refusal_msg) > 0

@pytest.mark.asyncio
async def test_async_agent_runtime_handoff():
    req = ChatRequest(message="I need to talk to a human support manager")
    resp = await AgentRuntime.process_message(req, "comp_techflow", {}, mock_chunks)
    assert resp.should_escalate_to_human is True

def test_dense_vector_embeddings_generation():
    emb_req = EmbeddingRequest(texts=["TechFlow Cloud SLA guarantee", "Kubernetes cluster scaling"])
    emb_res = EmbeddingService.generate_embeddings(emb_req)
    assert emb_res.success is True
    assert len(emb_res.embeddings) == 2
    assert len(emb_res.embeddings[0].embedding) == 1536

def test_semantic_cross_encoder_reranking():
    rerank_req = RerankRequest(
        query="What is the refund policy duration?",
        candidates=[
            RerankCandidate(id="chk_1", content="TechFlow supports multi-region failover across Mumbai."),
            RerankCandidate(id="chk_2", content="Standard refund policy allows a full refund within 14 days of purchase."),
            RerankCandidate(id="chk_3", content="Kubernetes pods auto-scale on CPU threshold.")
        ],
        top_k=2
    )
    rerank_res = RerankingService.rerank_candidates(rerank_req)
    assert rerank_res.success is True
    assert rerank_res.results[0].id == "chk_2"
    assert rerank_res.results[0].rank == 1

def test_rag_hallucination_scoring():
    eval_req = EvaluateRequest(
        query="What is the refund window?",
        answer="You can get a full refund within 14 days of purchase.",
        grounding_contexts=["Standard refund policy allows a full refund within 14 days of purchase."]
    )
    eval_res = EvaluationService.evaluate_rag_response(eval_req)
    assert eval_res.success is True
    assert eval_res.faithfulness_score >= 0.75
    assert eval_res.hallucination_risk == "low"

def test_document_intelligence_semantic_chunking():
    doc_req = DocumentProcessRequest(
        title="Enterprise SLA Policy",
        raw_text="# Overview\n\nTechFlow provides 99.99% uptime.\n\n# Refunds\n\n14-day money back guarantee.",
        doc_type="pdf",
        chunk_size=100
    )
    doc_res = DocumentAIService.process_document(doc_req)
    assert doc_res.success is True
    assert doc_res.total_chunks >= 2

def test_nlp_intent_and_sentiment_classification():
    cls_req = ClassificationRequest(text="URGENT: I need a refund for ORD-9921 immediately!")
    cls_res = ClassificationService.classify_text(cls_req)
    assert cls_res.success is True
    assert cls_res.intent == "refund_request"
    assert cls_res.sentiment == "urgent"
    assert "ORD-9921" in str(cls_res.detected_entities)
