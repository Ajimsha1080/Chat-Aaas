import asyncio
import sys
from app.services.rag_engine import RAGEngine
from app.services.document_ai import DocumentAIService
from app.services.crawler_service import CrawlerService
from app.services.query_rewriter import QueryRewriter
from app.services.llm_service import LLMProvider
from app.services.agent_runtime import AgentRuntime
from app.schemas import DocumentProcessRequest, ChatRequest, ChatMessage
from app.db.database import db

def print_header(title):
    print(f"\n{'='*20} {title} {'='*20}")

async def run_diagnostics():
    passed = 0
    failed = 0
    total = 0

    def assert_check(name, condition, detail=""):
        nonlocal passed, failed, total
        total += 1
        if condition:
            print(f"  [PASS] {name}")
            passed += 1
        else:
            print(f"  [FAIL] {name} - {detail}")
            failed += 1

    print_header("1. INGESTION & SEMANTIC CHUNKING DIAGNOSTICS")
    # Test hierarchical chunking with markdown table and headings
    complex_doc = """
# Enterprise Service Guide

## Cloud Hosting Infrastructure
We operate across 12 tier-4 data centers globally with guaranteed 99.99% uptime.

## Pricing Plans
| Plan Name | Monthly Cost | Included Bandwidth | Dedicated Support |
| --- | --- | --- | --- |
| Micro | $19 | 100 GB | No |
| Growth | $89 | 1 TB | Yes |
| Scale | $299 | 10 TB | 24/7 Priority |

## Return and Cancellation Policy
Customers can cancel their plan at any time within 45 days of initial signup for a 100% full refund.
    """
    doc_res = DocumentAIService.process_document(
        DocumentProcessRequest(title="Enterprise Guide", raw_text=complex_doc, doc_type="markdown", chunk_size=300)
    )
    assert_check("Chunking produces chunks", len(doc_res.chunks) >= 3, f"Got {len(doc_res.chunks)} chunks")
    table_chunk = next((c for c in doc_res.chunks if "| Micro |" in c.content), None)
    assert_check("Table chunk preserved atomically", table_chunk is not None and "| Scale |" in table_chunk.content)
    assert_check("Context header embedded in chunk", any("[Document: Enterprise Guide" in c.content for c in doc_res.chunks))

    print_header("2. WEB CRAWLER HTML CLEANING & TABLE EXTRACTION")
    sample_html = """
    <html>
        <body>
            <nav><a href="#">Nav Item</a></nav>
            <div class="cookie-notice">Accept cookies to proceed</div>
            <h2>Product Catalog</h2>
            <table>
                <tr><th>Product</th><th>SKU</th><th>Price</th></tr>
                <tr><td>Widget Alpha</td><td>WA-101</td><td>$49.99</td></tr>
                <tr><td>Widget Beta</td><td>WB-202</td><td>$89.99</td></tr>
            </table>
            <script>trackPageView();</script>
            <footer>Footer text</footer>
        </body>
    </html>
    """
    cleaned_html = CrawlerService.clean_html_content(sample_html)
    assert_check("Scripts stripped", "trackPageView" not in cleaned_html)
    assert_check("Cookie notice stripped", "Accept cookies" not in cleaned_html)
    assert_check("Nav stripped", "Nav Item" not in cleaned_html)
    assert_check("HTML table converted to Markdown", "| Widget Alpha | WA-101 | $49.99 |" in cleaned_html)

    print_header("3. QUERY REWRITING & CONVERSATIONAL CONTEXT")
    hist = [
        ChatMessage(role="user", content="Tell me about the Enterprise Cloud plan"),
        ChatMessage(role="assistant", content="The Enterprise Cloud plan provides 10TB bandwidth for $299/mo.")
    ]
    rewritten_pronoun = QueryRewriter.rewrite_query("How much is it?", hist)
    assert_check("Pronoun 'it' resolved to Enterprise Cloud", "Enterprise Cloud" in rewritten_pronoun)

    hist_list = [
        ChatMessage(role="user", content="What plans do you have?"),
        ChatMessage(role="assistant", content="We have three options:\n1. Micro Plan\n2. Growth Tier\n3. Scale Package")
    ]
    rewritten_ord = QueryRewriter.rewrite_query("Explain the second one", hist_list)
    assert_check("Ordinal 'second one' resolved to Growth Tier", "Growth Tier" in rewritten_ord)

    print_header("4. HYBRID RETRIEVAL (DENSE + BM25 + RRF) & ISOLATION")
    tenant_a = "company_alpha_diag"
    tenant_b = "company_beta_diag"
    stored_chunks = [
        {
            "id": "chk_a1",
            "companyId": tenant_a,
            "content": "[Document: Alpha Docs]\nTenant Alpha secret activation token is ALPHA-TOKEN-8831.",
            "title": "Alpha Docs",
            "sectionHeader": "Secrets",
            "lifecycleState": "active",
            "metadata": {"title": "Alpha Docs"}
        },
        {
            "id": "chk_b1",
            "companyId": tenant_b,
            "content": "[Document: Beta Docs]\nTenant Beta secret activation token is BETA-TOKEN-4492.",
            "title": "Beta Docs",
            "sectionHeader": "Secrets",
            "lifecycleState": "active",
            "metadata": {"title": "Beta Docs"}
        },
        {
            "id": "chk_a_trash",
            "companyId": tenant_a,
            "content": "[Document: Alpha Docs]\nOld deprecated token is ALPHA-OLD-0000.",
            "title": "Alpha Docs",
            "sectionHeader": "Archived",
            "lifecycleState": "trash",
            "metadata": {"title": "Alpha Docs"}
        }
    ]

    res_a, diag_a = RAGEngine.search_chunks_with_diagnostics(
        query="What is the secret activation token?",
        standalone_query="What is the secret activation token?",
        company_id=tenant_a,
        stored_chunks=stored_chunks,
        threshold=0.1
    )
    assert_check("Tenant A retrieves own chunk", len(res_a) == 1 and "ALPHA-TOKEN-8831" in res_a[0].content)
    assert_check("Cross-tenant leakage blocked", not any("BETA-TOKEN" in r.content for r in res_a))
    assert_check("Trashed/Archived chunk filtered out", not any("ALPHA-OLD-0000" in r.content for r in res_a))
    assert_check("RAGDiagnostics populated", len(diag_a.dense_results) > 0 and len(diag_a.fusion_results) > 0)

    print_header("5. NATURAL SYNTHESIS & REASONING CAPABILITIES")
    knowledge_context = (
        "You are an AI assistant for company comp_diag.\n"
        "Verified Knowledge Context:\n"
        "Source (Pricing Guide): The Micro plan is $19/mo with 100GB. The Scale plan is $299/mo with 10TB and 24/7 Priority support.\n"
        "Source (Policy Doc): Cancellation policy allows 100% full refund within 45 days of initial purchase."
    )

    # 5.1 Factual Price Query
    ans_price = LLMProvider.synthesize_grounded_answer("What is the price of the Micro plan?", knowledge_context)
    assert_check("Factual price extracted ($19)", "$19" in ans_price or "19" in ans_price)

    # 5.2 Refund Duration Query
    ans_refund = LLMProvider.synthesize_grounded_answer("How long is the refund period?", knowledge_context)
    assert_check("Refund period extracted (45 days)", "45" in ans_refund)

    # 5.3 Comparison Query
    ans_comp = LLMProvider.synthesize_grounded_answer("Compare the Micro plan and Scale plan", knowledge_context)
    assert_check("Comparison reasons across Micro and Scale", "Micro" in ans_comp and "Scale" in ans_comp and "$19" in ans_comp and "$299" in ans_comp)

    # 5.4 Out-of-Domain / Unknown Query Refusal
    agent_cfg = {"name": "DiagBot", "status": "active"}
    chat_req_unknown = ChatRequest(message="What is the population of Mars?", conversation_id="conv_diag_unk")
    res_unknown = await AgentRuntime.process_message(chat_req_unknown, tenant_a, agent_cfg, stored_chunks)
    assert_check("Out-of-domain query triggers clean refusal / anti-hallucination", res_unknown.is_refusal is True or "don't have" in res_unknown.message.lower() or "not contain" in res_unknown.message.lower() or "verified information" in res_unknown.message.lower())

    print_header("SUMMARY")
    print(f"Total Diagnostics Executed: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    if failed == 0:
        print("\n>>> ALL RAG SUBSYSTEMS ARE 100% HEALTHY, FACTUAL, AND OPERATIONAL <<<")
    else:
        print("\n>>> ISSUES DETECTED - REVIEW FAILED CHECKS <<<")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(run_diagnostics())
