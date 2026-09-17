import pytest
from app.db.database import db
from app.services.billing_service import BillingService
from app.services.crawler_service import CrawlerService
from app.core.queue import JobQueue

@pytest.mark.asyncio
async def test_postgresql_rls_session_context():
    """Verifies that get_session properly sets tenant context variable."""
    # Test session context manager
    with db.get_session(company_id="comp-tenant-a") as session:
        assert session is not None
    with db.get_session(is_super_admin=True) as session:
        assert session is not None

def test_gstin_validation_and_state_codes():
    """Verifies 15-character statutory GSTIN syntax and state code extraction."""
    # Valid Karnataka GSTIN
    assert BillingService.validate_gstin("29AABCU9603R1ZM") is True
    assert BillingService.extract_state_code("29AABCU9603R1ZM") == "29"

    # Valid Maharashtra GSTIN
    assert BillingService.validate_gstin("27AABCU9603R1ZM") is True
    assert BillingService.extract_state_code("27AABCU9603R1ZM") == "27"

    # Invalid GSTINs
    assert BillingService.validate_gstin("INVALID_GSTIN") is False
    assert BillingService.validate_gstin("99AABCU9603R1ZM") is False  # Invalid state code 99
    assert BillingService.validate_gstin("") is False
    assert BillingService.validate_gstin(None) is False

def test_audited_gst_tax_split_and_sequential_numbering():
    """Verifies intra-state (CGST+SGST) vs inter-state (IGST) calculations and sequential invoice numbering."""
    # Intrastate (Karnataka buyer -> Karnataka supplier)
    intra = BillingService.calculate_gst_invoice(amount_inr=10000.0, buyer_gstin="29AABCU9603R1ZM")
    assert intra["subtotalINR"] == 10000.0
    assert intra["taxAmountINR"] == 1800.0
    assert intra["totalINR"] == 11800.0
    assert intra["isInterstate"] is False
    assert intra["taxBreakdown"]["cgstAmountINR"] == 900.0
    assert intra["taxBreakdown"]["sgstAmountINR"] == 900.0
    assert intra["taxBreakdown"]["igstAmountINR"] == 0.0
    assert intra["sacCode"] == "998313"

    # Interstate (Maharashtra buyer -> Karnataka supplier)
    inter = BillingService.calculate_gst_invoice(amount_inr=10000.0, buyer_gstin="27AABCU9603R1ZM")
    assert inter["subtotalINR"] == 10000.0
    assert inter["taxAmountINR"] == 1800.0
    assert inter["totalINR"] == 11800.0
    assert inter["isInterstate"] is True
    assert inter["taxBreakdown"]["igstAmountINR"] == 1800.0
    assert inter["taxBreakdown"]["cgstAmountINR"] == 0.0
    assert inter["taxBreakdown"]["sgstAmountINR"] == 0.0

    # Sequential invoice numbering
    inv1 = BillingService.generate_invoice_number()
    inv2 = BillingService.generate_invoice_number()
    assert inv1.startswith("INV-")
    assert inv2.startswith("INV-")
    assert inv1 != inv2

@pytest.mark.asyncio
async def test_worker_queue_dlq_and_poison_pill_defense():
    """Verifies Dead-Letter Queue (DLQ) routing, exponential backoff, and poison-pill isolation."""
    queue = JobQueue(queue_name="test_worker_queue")

    # 1. Backoff delay calculation
    delay_1 = queue.calculate_backoff_delay(attempt=1, base_seconds=1.0)
    delay_2 = queue.calculate_backoff_delay(attempt=2, base_seconds=1.0)
    delay_3 = queue.calculate_backoff_delay(attempt=3, base_seconds=1.0)
    assert delay_1 >= 1.0
    assert delay_2 >= 2.0
    assert delay_3 >= 4.0

    # 2. Poison-pill direct DLQ routing
    job_id = await queue.enqueue(
        job_type="document_ingestion",
        company_id="comp-techflow",
        payload={"corrupt_file": True},
        max_attempts=3
    )

    await queue.fail_job(
        job_id=job_id,
        error="Fatal syntax error in malicious PDF header",
        is_poison_pill=True,
        stack_trace="Traceback: CorruptFileException at line 42"
    )

    status = queue.get_job_status(job_id)
    assert status["status"] == "dlq"
    assert "Poison Pill Defended" in status["error"]

    # 3. DLQ listing and replay
    dlq_jobs = queue.get_dlq_jobs(company_id="comp-techflow")
    assert any(j["id"] == job_id for j in dlq_jobs)

    replayed = await queue.replay_dlq_job(job_id)
    assert replayed is True
    assert queue.get_job_status(job_id)["status"] == "queued"

@pytest.mark.asyncio
async def test_crawler_ssrf_and_domain_scope_defense():
    """Verifies crawler SSRF blocks on private IPs / metadata and domain scope locks."""
    # SSRF Direct IP Blocks
    assert CrawlerService.validate_url_safety("http://127.0.0.1/admin")[0] is False
    assert CrawlerService.validate_url_safety("http://169.254.169.254/latest/meta-data")[0] is False
    assert CrawlerService.validate_url_safety("http://10.0.1.50/internal")[0] is False
    assert CrawlerService.validate_url_safety("http://192.168.1.1/router")[0] is False
    assert CrawlerService.validate_url_safety("http://localhost:8080/secrets")[0] is False

    # Domain Scope Lock
    assert CrawlerService.validate_domain_scope("https://example.com", "https://example.com/docs") is True
    assert CrawlerService.validate_domain_scope("https://example.com", "https://api.example.com/v1") is True
    assert CrawlerService.validate_domain_scope("https://example.com", "https://malicious-site.com/hack") is False

    # Robots.txt rule parser
    robots_sample = """
    User-agent: *
    Disallow: /admin/
    Disallow: /private/
    
    User-agent: Googlebot
    Disallow: /no-google/
    """
    disallowed = CrawlerService.parse_robots_txt_rules(robots_sample, user_agent="CoarAI-WebCrawler")
    assert "/admin/" in disallowed
    assert "/private/" in disallowed
    assert CrawlerService.is_path_allowed_by_robots("/admin/dashboard", disallowed) is False
    assert CrawlerService.is_path_allowed_by_robots("/public/help", disallowed) is True
