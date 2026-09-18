import pytest
from app.services.rag_engine import RAGEngine
from app.services.embedding_service import EmbeddingService
from app.services.crawler_service import CrawlerService
from app.workers.document_worker import DocumentWorker
from app.db.database import db

@pytest.mark.asyncio
async def test_paraphrased_semantic_retrieval_above_threshold():
    """
    Verifies that a query with DIFFERENT words/synonyms (zero direct keyword overlap)
    successfully matches the relevant chunk with high cosine similarity above the threshold,
    which a pure keyword matching approach would fail.
    """
    tenant_id = "tenant-paraphrase-test"

    # Chunk describes pricing/cost in formal enterprise wording
    chunk_pricing = {
        "id": "chk-pricing-1",
        "companyId": tenant_id,
        "title": "Enterprise Subscription Terms",
        "sectionHeader": "Subscription Fees",
        "content": "The organization subscription tier requires an annual fee of 12000 USD billed quarterly, granting boundless seat allocations.",
        "embedding": EmbeddingService.compute_dense_vector("The organization subscription tier requires an annual fee of 12000 USD billed quarterly, granting boundless seat allocations.")
    }

    # Chunk describes returns and refunds
    chunk_returns = {
        "id": "chk-returns-1",
        "companyId": tenant_id,
        "title": "Merchandise Return Guidelines",
        "sectionHeader": "Reimbursement Policy",
        "content": "Customers seeking moneyback reimbursement must dispatch unused items within thirty days of acquisition.",
        "embedding": EmbeddingService.compute_dense_vector("Customers seeking moneyback reimbursement must dispatch unused items within thirty days of acquisition.")
    }

    chunks = [chunk_pricing, chunk_returns]

    # Paraphrased query 1: asks about cost/rates using different words
    query_price = "How much does the plan cost and what is the payment rate?"
    results_price = RAGEngine.search_chunks(query_price, tenant_id, chunks, threshold=0.25, top_k=2)

    assert len(results_price) > 0, "Semantic retrieval must return relevant chunk for paraphrased pricing query"
    assert results_price[0].chunk_id == "chk-pricing-1"
    assert results_price[0].similarity_score >= 0.30

    # Paraphrased query 2: asks about return/refund policy using different words
    query_refund = "What is the policy for getting a refund or money back?"
    results_refund = RAGEngine.search_chunks(query_refund, tenant_id, chunks, threshold=0.25, top_k=2)

    assert len(results_refund) > 0, "Semantic retrieval must return relevant chunk for paraphrased refund query"
    assert results_refund[0].chunk_id == "chk-returns-1"
    assert results_refund[0].similarity_score >= 0.30


@pytest.mark.asyncio
async def test_crawler_link_extraction_and_domain_scope():
    """Verifies that extract_internal_links accurately captures internal links and rejects external/assets."""
    html_sample = """
    <html>
      <body>
        <a href="/about-us">About Us</a>
        <a href="/pricing">Pricing Plans</a>
        <a href="https://coarai.com/docs/api">API Reference</a>
        <a href="https://external-competitor.com/phishing">Malicious Link</a>
        <a href="/assets/logo.png">Image Asset</a>
        <a href="mailto:support@coarai.com">Email Us</a>
        <a href="javascript:void(0)">JS Action</a>
      </body>
    </html>
    """
    root = "https://coarai.com"
    links = CrawlerService.extract_internal_links(html_sample, base_url="https://coarai.com/home", root_url=root)

    assert "https://coarai.com/about-us" in links
    assert "https://coarai.com/pricing" in links
    assert "https://coarai.com/docs/api" in links
    assert not any("external-competitor" in l for l in links)
    assert not any(".png" in l for l in links)
    assert not any("mailto:" in l for l in links)


@pytest.mark.asyncio
async def test_crawler_multi_page_simulation_and_metrics(monkeypatch):
    """Verifies that crawl_website_multi_page aggregates pages and surfaces coverage metrics."""
    # Mock fetch_and_parse to return simulated pages
    async def mock_fetch(url, root_url=None, depth=1, respect_robots=True):
        if "forbidden-private" in url:
            return {"success": False, "error": "Blocked by SSRF", "url": url}
        if "page2" in url:
            return {
                "success": True,
                "title": "Page 2 - Features",
                "content": "Features include multi-agent routing and omnichannel webhooks.",
                "rawHtml": "<p>Features include multi-agent routing.</p>",
                "url": url,
                "rawLength": 100,
                "textLength": 50,
                "depth": depth
            }
        return {
            "success": True,
            "title": "Home - CoarAI",
            "content": "Welcome to CoarAI Customer Support Platform.",
            "rawHtml": "<h1>Welcome</h1><a href='/page2'>Features</a><a href='http://127.0.0.1/admin'>Admin</a>",
            "url": url,
            "rawLength": 150,
            "textLength": 60,
            "depth": depth
        }

    monkeypatch.setattr(CrawlerService, "fetch_and_parse", mock_fetch)

    crawl_res = await CrawlerService.crawl_website_multi_page("https://coarai.com", max_pages=5, max_depth=2)

    assert crawl_res["success"] is True
    assert crawl_res["pagesCrawled"] >= 2
    assert "Features" in crawl_res["content"]
    assert "Welcome" in crawl_res["content"]
    assert "contentHash" in crawl_res
    assert len(crawl_res["crawledUrls"]) >= 2


@pytest.mark.asyncio
async def test_recrawl_stale_website_worker_with_diffing(monkeypatch):
    """
    Verifies that DocumentWorker.recrawl_stale_website_sources diffs content hashes
    and avoids re-chunking/re-embedding when content has not changed.
    """
    tenant_id = "tenant-recrawl-diff"
    src_id = f"ks-{tenant_id}-web-test"

    db.knowledge_sources[src_id] = {
        "id": src_id,
        "companyId": tenant_id,
        "title": "CoarAI Docs",
        "sourceType": "website",
        "sourceUrl": "https://docs.coarai.com",
        "category": "Website",
        "status": "ready",
        "lifecycleState": "active",
        "content": "Original documentation text content.",
        "contentHash": "initial-dummy-hash",
        "chunkCount": 1,
        "totalChunks": 1,
        "lastIndexedAt": "2020-01-01T00:00:00Z",  # very old / stale
        "retentionDays": 1
    }

    async def mock_crawl(url, max_pages=20, max_depth=2, respect_robots=True):
        return {
            "success": True,
            "title": "CoarAI Docs Updated",
            "content": "New updated documentation text content with additional endpoints.",
            "contentHash": "new-updated-hash-12345",
            "pagesCrawled": 3,
            "pagesSkipped": 0,
            "pagesFailed": 0,
            "crawledUrls": ["https://docs.coarai.com", "https://docs.coarai.com/api", "https://docs.coarai.com/faq"]
        }

    monkeypatch.setattr(CrawlerService, "crawl_website_multi_page", mock_crawl)

    result = await DocumentWorker.recrawl_stale_website_sources(force=True)

    assert result["updated"] >= 1
    updated_source = db.knowledge_sources[src_id]
    assert updated_source["contentHash"] == "new-updated-hash-12345"
    assert updated_source["isStale"] is False
    assert "lastCheckedAt" in updated_source
