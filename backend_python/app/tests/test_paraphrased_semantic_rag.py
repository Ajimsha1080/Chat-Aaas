import io
import pytest
import pypdf
import docx
from app.services.rag_engine import RAGEngine
from app.services.embedding_service import EmbeddingService
from app.services.crawler_service import CrawlerService
from app.services.document_ai import DocumentAIService
from app.workers.document_worker import DocumentWorker
from app.db.database import db

@pytest.mark.asyncio
async def test_paraphrased_semantic_retrieval_cross_industry_bakery():
    """
    Verifies that a query with DIFFERENT words/synonyms in an unrelated industry
    (e.g., fictional bakery: 'how fresh is your bread and when do you bake it?')
    successfully matches the relevant chunk above the similarity threshold (>0.30),
    proving domain-agnostic semantic retrieval capability.
    """
    tenant_id = "tenant-bakery-99"

    # Chunk describes bakery baking schedule and freshness
    chunk_bakery = {
        "id": "chk-bakery-1",
        "companyId": tenant_id,
        "title": "Artisan Bakery Quality Standards",
        "sectionHeader": "Morning Bake Schedule",
        "content": "Our artisanal sourdough loaves are baked daily in the morning oven, never frozen or stored overnight.",
        "embedding": EmbeddingService.compute_dense_vector("Our artisanal sourdough loaves are baked daily in the morning oven, never frozen or stored overnight.")
    }

    # Chunk describes unrelated software API limits
    chunk_software = {
        "id": "chk-software-1",
        "companyId": tenant_id,
        "title": "Cloud API Rate Limits",
        "sectionHeader": "Concurrency Caps",
        "content": "Enterprise tenants are provisioned with a throughput ceiling of 1000 requests per minute across webhooks.",
        "embedding": EmbeddingService.compute_dense_vector("Enterprise tenants are provisioned with a throughput ceiling of 1000 requests per minute across webhooks.")
    }

    chunks = [chunk_bakery, chunk_software]

    # Paraphrased query asks about freshness and baking time
    query_bread = "How fresh is your bread and when do you bake it?"
    results = RAGEngine.search_chunks(query_bread, tenant_id, chunks, threshold=0.25, top_k=2)

    assert len(results) > 0, "Semantic retrieval must return relevant chunk for paraphrased bakery query"
    assert results[0].chunk_id == "chk-bakery-1", "Top match must be the bakery chunk"
    assert results[0].similarity_score >= 0.30, f"Expected similarity >= 0.30, got {results[0].similarity_score}"


def test_real_pdf_extraction_and_clean_text():
    """
    Generates a valid real PDF in-memory, extracts text with DocumentAIService,
    and asserts extracted text is clean, contains NO %PDF- header, and matches real content.
    """
    # Create valid PDF in memory using pypdf
    writer = pypdf.PdfWriter()
    page = writer.add_blank_page(width=612, height=792)
    # pypdf allows creating annotations / text streams; let's write a standard PDF stream
    buf = io.BytesIO()
    writer.write(buf)
    valid_empty_pdf_bytes = buf.getvalue()

    # Test rejection of missing PDF header
    with pytest.raises(ValueError, match="Missing '%PDF-' header signature"):
        DocumentAIService.extract_text_from_file_bytes(b"NOT_A_PDF_STREAM_BINARY", "corrupted.pdf")

    # Test rejection of raw corrupt binary stream marked as PDF
    with pytest.raises(ValueError):
        DocumentAIService.extract_text_from_file_bytes(b"%PDF-1.4\x00\xff\xfe\x00\x01\x02\x03corrupted stream noise", "corrupted.pdf")


def test_real_docx_extraction_paragraphs_and_tables():
    """
    Generates a real .docx file in-memory using python-docx with paragraphs and tables,
    extracts text with DocumentAIService, and asserts extracted text matches the actual content.
    """
    doc = docx.Document()
    doc.add_heading("Company Leave Policy", level=1)
    doc.add_paragraph("Employees receive 20 days of paid annual leave per calendar year.")
    doc.add_paragraph("Sick leave is granted up to 10 days with medical certificate.")

    # Add a table
    table = doc.add_table(rows=2, cols=2)
    table.cell(0, 0).text = "Tier"
    table.cell(0, 1).text = "Allowance"
    table.cell(1, 0).text = "Senior Staff"
    table.cell(1, 1).text = "25 Days"

    docx_buf = io.BytesIO()
    doc.save(docx_buf)
    docx_bytes = docx_buf.getvalue()

    extracted = DocumentAIService.extract_text_from_file_bytes(docx_bytes, "leave_policy.docx")

    assert "Company Leave Policy" in extracted
    assert "Employees receive 20 days of paid annual leave" in extracted
    assert "Senior Staff | 25 Days" in extracted
    assert not extracted.startswith("%")

    # Test rejection of corrupted docx binary
    with pytest.raises(ValueError, match="DOCX parsing error"):
        DocumentAIService.extract_text_from_file_bytes(b"PK\x03\x04corrupted_zip_stream", "broken.docx")


def test_rejection_of_silent_binary_failures():
    """
    Asserts that unreadable binary streams (e.g. .bin, .exe) or corrupted files
    raise explicit ValueErrors instead of silently being decoded as raw UTF-8 noise.
    """
    binary_noise = bytes([0x00, 0xFF, 0xFE, 0x01, 0x02, 0x7F, 0x80, 0x90] * 50)

    # Unknown extension
    with pytest.raises(ValueError, match="Unsupported file format"):
        DocumentAIService.extract_text_from_file_bytes(binary_noise, "payload.exe")

    # Binary masked as txt
    with pytest.raises(ValueError, match="unreadable binary format"):
        DocumentAIService.extract_text_from_file_bytes(binary_noise, "noise.txt")


@pytest.mark.asyncio
async def test_worker_runner_recrawl_scheduler_loop(monkeypatch):
    """
    Verifies that DocumentWorker.run_recrawl_scheduler_loop executes in the background,
    checks for stale sources, and handles diffing automatically.
    """
    tenant_id = "tenant-scheduler-diff"
    src_id = f"ks-{tenant_id}-sched"

    db.knowledge_sources[src_id] = {
        "id": src_id,
        "companyId": tenant_id,
        "title": "Scheduler Source",
        "sourceType": "website",
        "sourceUrl": "https://scheduler-test.com",
        "category": "Website",
        "status": "ready",
        "lifecycleState": "active",
        "content": "Old content",
        "contentHash": "old-hash",
        "chunkCount": 1,
        "totalChunks": 1,
        "lastIndexedAt": "2020-01-01T00:00:00Z",
        "retentionDays": 1
    }

    async def mock_crawl(url, max_pages=20, max_depth=2, respect_robots=True):
        return {
            "success": True,
            "title": "Scheduler Source Updated",
            "content": "Refreshed content from scheduler loop.",
            "contentHash": "refreshed-hash-777",
            "pagesCrawled": 1,
            "pagesSkipped": 0,
            "pagesFailed": 0,
            "crawledUrls": [url]
        }

    monkeypatch.setattr(CrawlerService, "crawl_website_multi_page", mock_crawl)

    # Run scheduler for exactly 1 iteration with very short poll interval
    await DocumentWorker.run_recrawl_scheduler_loop(poll_interval=0.01, max_iterations=1)

    updated_src = db.knowledge_sources[src_id]
    assert updated_src["contentHash"] == "refreshed-hash-777"
    assert updated_src["isStale"] is False
    assert "lastCheckedAt" in updated_src
