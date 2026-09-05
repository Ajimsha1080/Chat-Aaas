import os
import sys
import asyncio

# Ensure backend_python is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.services.crawler_service import CrawlerService
from app.services.rag_engine import RAGEngine
from app.services.tool_registry import ToolRegistry
from app.services.agent_runtime import AgentRuntime
from app.schemas import ChatRequest

def run_tests():
    print("\n=======================================================")
    print("?? RUNNING PYTHON AI RUNTIME FASTAPI TEST SUITE")
    print("=======================================================\n")
    
    passed = 0
    failed = 0

    # 1. SSRF Defense Test
    print("1. Testing SSRF Crawler Protection...")
    safe_local, _ = CrawlerService.validate_url_safety("http://localhost:8000/admin")
    safe_ip, _ = CrawlerService.validate_url_safety("http://127.0.0.1/etc/passwd")
    safe_aws, _ = CrawlerService.validate_url_safety("http://169.254.169.254/latest/meta-data")
    
    if not safe_local and not safe_ip and not safe_aws:
        print("  ? SSRF Protection correctly blocked localhost, loopback, and cloud metadata.")
        passed += 1
    else:
        print("  ? SSRF Protection failed to block unsafe targets!")
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
        print("  ? Multi-Tenancy Isolation verified: Tenant Beta cannot access Tenant Alpha chunks.")
        passed += 1
    else:
        print("  ? Multi-Tenancy Isolation breach detected!")
        failed += 1

    # 3. High-Risk Action Confirmation Gate
    print("3. Testing High-Risk Tool Confirmation Gate...")
    refund_res = ToolRegistry.execute_tool("execute_refund", {"order_id": "ORD-123", "amount": "?500"}, "comp_test", user_confirmed=False)
    if refund_res.requires_confirmation and not refund_res.success:
        print("  ? High-risk action 'execute_refund' was safely blocked until explicit confirmation.")
        passed += 1
    else:
        print("  ? Confirmation gate failed for high-risk action!")
        failed += 1

    # 4. Anti-Hallucination Grounding Test
    print("4. Testing Anti-Hallucination & Safe Fallback...")
    chunks_empty = []
    is_grounded, refusal_msg = RAGEngine.evaluate_groundedness(chunks_empty, threshold=0.72)
    if not is_grounded:
        print("  ? Anti-Hallucination verified: Agent safely refuses when knowledge is missing.")
        passed += 1
    else:
        print("  ? Agent hallucinated on missing evidence!")
        failed += 1

    # 5. Async Agent Runtime Flow
    print("5. Testing Async Agent Runtime & Human Handoff...")
    async def test_runtime():
        req = ChatRequest(message="I need to talk to a human support manager")
        resp = await AgentRuntime.process_message(req, "comp_techflow", {}, mock_chunks)
        return resp.handoff_required

    handoff_ok = asyncio.run(test_runtime())
    if handoff_ok:
        print("  ? Human Handoff trigger successfully routed message.")
        passed += 1
    else:
        print("  ? Human handoff failed to trigger!")
        failed += 1

    print("\n-------------------------------------------------------")
    print(f"RESULTS: {passed} PASSED, {failed} FAILED across 5 core Python suites.")
    print("-------------------------------------------------------\n")
    return failed == 0

if __name__ == "__main__":
    success = run_tests()
    exit(0 if success else 1)
