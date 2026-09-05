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

def run_tests():
    print("\n=======================================================")
    print("[HYBRID v2] RUNNING PYTHON AI RUNTIME FASTAPI TEST SUITE")
    print("=======================================================\n")
    
    passed = 0
    failed = 0

    # 1. SSRF Defense Test
    print("1. Testing SSRF Crawler Protection...")
    safe_local, _ = CrawlerService.validate_url_safety("http://localhost:8000/admin")
    safe_ip, _ = CrawlerService.validate_url_safety("http://127.0.0.1/etc/passwd")
    safe_aws, _ = CrawlerService.validate_url_safety("http://169.254.169.254/latest/meta-data")
    
    if not safe_local and not safe_ip and not safe_aws:
        print("  [PASS] SSRF Protection correctly blocked localhost, loopback, and cloud metadata.")
        passed += 1
    else:
        print("  [FAIL] SSRF Protection failed to block unsafe targets!")
        failed += 1

    # 2. Multi-Tenancy Partitioning Test
    print("2. Testing RAG Multi-Tenancy Isolation...")
    mock_chunks = [
        {"id": "c1", "company_id": "tenant_alpha", "content": "Alpha confidential financials."},
        {"id": "c2", "company_id": "tenant_beta", "content": "Beta confidential roadmap."}
    ]
    alpha_results = RAGEngine.search_chunks("financials", "tenant_alpha", mock_chunks, threshold=0.1)
    beta_results = RAGEngine.search_chunks("financials", "tenant_beta", mock_chunks, threshold=0.1)
    
    if len(alpha_results) == 1 and len(beta_results) == 0:
        print("  [PASS] Multi-Tenancy Isolation verified: Tenant Beta cannot access Tenant Alpha chunks.")
        passed += 1
    else:
        print("  [FAIL] Multi-Tenancy Isolation breach detected!")
        failed += 1

    # 3. High-Risk Action Confirmation Gate
    print("3. Testing High-Risk Tool Confirmation Gate...")
    refund_res = ToolRegistry.execute_tool("execute_refund", {"order_id": "ORD-123", "amount": "Rs.500"}, "comp_test", user_confirmed=False)
    if refund_res.requires_confirmation and not refund_res.success:
        print("  [PASS] High-risk action 'execute_refund' was safely blocked until explicit confirmation.")
        passed += 1
    else:
        print("  [FAIL] Confirmation gate failed for high-risk action!")
        failed += 1

    # 4. Anti-Hallucination Grounding Test
    print("4. Testing Anti-Hallucination & Safe Fallback...")
    chunks_empty = []
    is_grounded, refusal_msg = RAGEngine.evaluate_groundedness(chunks_empty, threshold=0.72)
    if not is_grounded:
        print("  [PASS] Anti-Hallucination verified: Agent safely refuses when knowledge is missing.")
        passed += 1
    else:
        print("  [FAIL] Agent hallucinated on missing evidence!")
        failed += 1

    # 5. Async Agent Runtime Flow
    print("5. Testing Async Agent Runtime & Human Handoff...")
    async def test_runtime():
        req = ChatRequest(message="I need to talk to a human support manager")
        resp = await AgentRuntime.process_message(req, "comp_techflow", {}, mock_chunks)
        return resp.should_escalate_to_human

    handoff_ok = asyncio.run(test_runtime())
    if handoff_ok:
        print("  [PASS] Human Handoff trigger successfully routed message.")
        passed += 1
    else:
        print("  [FAIL] Human handoff failed to trigger!")
        failed += 1

    # 6. Vector Embeddings Generation Test
    print("6. Testing Dense Vector Embeddings Generation (/v1/embeddings)...")
    emb_req = EmbeddingRequest(texts=["TechFlow Cloud SLA guarantee", "Kubernetes cluster scaling"])
    emb_res = EmbeddingService.generate_embeddings(emb_req)
    if emb_res.success and len(emb_res.embeddings) == 2 and len(emb_res.embeddings[0].embedding) == 1536:
        print(f"  [PASS] Embeddings generated: 2 items, {emb_res.dimensions} dimensions, {emb_res.total_tokens} tokens.")
        passed += 1
    else:
        print("  [FAIL] Embedding generation failed!")
        failed += 1

    # 7. Semantic Cross-Encoder Reranker Test
    print("7. Testing Semantic Cross-Encoder Reranking (/v1/rerank)...")
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
    if rerank_res.success and rerank_res.results[0].id == "chk_2" and rerank_res.results[0].rank == 1:
        print(f"  [PASS] Cross-encoder rerank verified: top chunk 'chk_2' scored {rerank_res.results[0].relevance_score}.")
        passed += 1
    else:
        print("  [FAIL] Semantic reranking failed!")
        failed += 1

    # 8. RAG Semantic Evaluation & Hallucination Scoring Test
    print("8. Testing RAG Hallucination Scoring (/v1/evaluate)...")
    eval_req = EvaluateRequest(
        query="What is the refund window?",
        answer="You can get a full refund within 14 days of purchase.",
        grounding_contexts=["Standard refund policy allows a full refund within 14 days of purchase."]
    )
    eval_res = EvaluationService.evaluate_rag_response(eval_req)
    if eval_res.success and eval_res.faithfulness_score >= 0.75 and eval_res.hallucination_risk == "low":
        print(f"  [PASS] RAG Evaluator verified: faithfulness score {eval_res.faithfulness_score} (low hallucination risk).")
        passed += 1
    else:
        print("  [FAIL] RAG evaluation failed!")
        failed += 1

    # 9. Document Intelligence & Semantic Chunking Test
    print("9. Testing Document Intelligence & Chunking (/v1/process-document)...")
    doc_req = DocumentProcessRequest(
        title="Enterprise SLA Policy",
        raw_text="# Overview\n\nTechFlow provides 99.99% uptime.\n\n# Refunds\n\n14-day money back guarantee.",
        doc_type="pdf",
        chunk_size=100
    )
    doc_res = DocumentAIService.process_document(doc_req)
    if doc_res.success and doc_res.total_chunks >= 2:
        print(f"  [PASS] Document AI parsed: {doc_res.total_chunks} chunks, {doc_res.total_tokens} tokens.")
        passed += 1
    else:
        print("  [FAIL] Document processing failed!")
        failed += 1

    # 10. NLP Classification & Intent Detection Test
    print("10. Testing NLP Intent & Sentiment Classification (/v1/classify)...")
    cls_req = ClassificationRequest(text="URGENT: I need a refund for ORD-9921 immediately!")
    cls_res = ClassificationService.classify_text(cls_req)
    if cls_res.success and cls_res.intent == "refund_request" and cls_res.sentiment == "urgent" and "ORD-9921" in str(cls_res.detected_entities):
        print(f"  [PASS] NLP Classifier verified: intent='{cls_res.intent}', sentiment='{cls_res.sentiment}', entities={cls_res.detected_entities}.")
        passed += 1
    else:
        print("  [FAIL] NLP classification failed!")
        failed += 1

    print("\n-------------------------------------------------------")
    print(f"RESULTS: {passed} PASSED, {failed} FAILED across 10 Python AI suites.")
    print("-------------------------------------------------------\n")
    return failed == 0

if __name__ == "__main__":
    success = run_tests()
    exit(0 if success else 1)
