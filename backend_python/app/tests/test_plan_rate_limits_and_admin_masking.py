import time
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import db
from app.core.security import create_jwt_token
from app.services.rate_limiter import RateLimiter
from app.services.usage_service import UsageService

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_rate_limiter_and_db():
    RateLimiter.reset()
    yield
    RateLimiter.reset()

def test_starter_tier_rate_limit_per_session():
    """Starter tier tenant is rate-limited after exceeding 20 req/min on a single session."""
    comp_id = f"comp-starter-{int(time.time() * 1000)}"
    db.companies[comp_id] = {
        "id": comp_id,
        "name": "Starter Co",
        "planId": "starter",
        "planStatus": "active",
        "isSuspended": False,
        "agent": {"name": "Bot", "status": "active"}
    }
    token = create_jwt_token("usr-owner", comp_id, "owner")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    session_id = "sess-starter-01"

    # Send 20 requests -> all 20 should pass (200 OK)
    for i in range(20):
        res = client.post("/api/v1/chat", headers=headers, json={"message": f"Hello {i}", "session_id": session_id})
        assert res.status_code == 200, f"Request {i+1} failed with {res.status_code}: {res.text}"

    # 21st request on same session -> should be rate-limited (429)
    res_21 = client.post("/api/v1/chat", headers=headers, json={"message": "Hello 21", "session_id": session_id})
    assert res_21.status_code == 429
    assert "Rate limit exceeded" in res_21.json().get("detail", "") or "Too many requests" in res_21.json().get("detail", "")

def test_business_tier_higher_rate_limit():
    """Business tier tenant is NOT rate-limited at 25 req/min, but IS at 200 req/min."""
    comp_id = f"comp-biz-{int(time.time() * 1000)}"
    db.companies[comp_id] = {
        "id": comp_id,
        "name": "Business Co",
        "planId": "business",
        "planStatus": "active",
        "isSuspended": False,
        "agent": {"name": "Bot", "status": "active"}
    }
    token = create_jwt_token("usr-owner", comp_id, "owner")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    session_id = "sess-biz-01"

    # Send 25 requests (which would have failed for starter) -> all pass
    for i in range(25):
        res = client.post("/api/v1/chat", headers=headers, json={"message": f"Hello {i}", "session_id": session_id})
        assert res.status_code == 200, f"Request {i+1} failed: {res.text}"

    # Fill up to 200 requests directly via RateLimiter for speed
    for i in range(25, 200):
        RateLimiter.check_rate_limit(f"{comp_id}_{session_id}", max_requests=200)
        RateLimiter.check_rate_limit(f"tenant_{comp_id}", max_requests=1000)

    # 201st request -> rate-limited (429)
    res_201 = client.post("/api/v1/chat", headers=headers, json={"message": "Over limit", "session_id": session_id})
    assert res_201.status_code == 429

def test_tenant_level_aggregate_rate_limit_across_parallel_sessions():
    """Opening many parallel sessions cannot bypass tenant-level cost protection."""
    comp_id = f"comp-agg-{int(time.time() * 1000)}"
    db.companies[comp_id] = {
        "id": comp_id,
        "name": "Aggregate Co",
        "planId": "starter", # starter tenant ceiling is 100 requests/minute aggregate
        "planStatus": "active",
        "isSuspended": False,
        "agent": {"name": "Bot", "status": "active"}
    }
    token = create_jwt_token("usr-owner", comp_id, "owner")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Simulate 50 different sessions sending 2 requests each = 100 requests total
    for s_idx in range(50):
        sid = f"parallel-sess-{s_idx}"
        # Each session sends 2 requests (well below per-session limit of 20)
        res1 = client.post("/api/v1/chat", headers=headers, json={"message": "msg1", "session_id": sid})
        res2 = client.post("/api/v1/chat", headers=headers, json={"message": "msg2", "session_id": sid})
        assert res1.status_code == 200
        assert res2.status_code == 200

    # 101st request on a brand new, unused session (sess-new) -> blocked by tenant-level circuit breaker
    res_101 = client.post("/api/v1/chat", headers=headers, json={"message": "msg101", "session_id": "brand-new-sess"})
    assert res_101.status_code == 429

def test_admin_list_all_tenants_masks_api_key():
    """Super Admin list_all_tenants endpoint masks apiKey and hides raw secrets."""
    comp_id = f"comp-mask-test-{int(time.time() * 1000)}"
    raw_api_key = f"aas_live_secretkey_{uuid.uuid4().hex[:16]}"
    db.companies[comp_id] = {
        "id": comp_id,
        "name": "Masked Test Co",
        "apiKey": raw_api_key,
        "planId": "growth",
        "isSuspended": False
    }

    admin_token = create_jwt_token("usr-super-admin", "comp-platform", "super_admin")
    res = client.get("/api/v1/admin/tenants", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200

    tenants = res.json()["data"]["companies"]
    target = next((t for t in tenants if t["id"] == comp_id), None)
    assert target is not None
    assert "apiKey" in target
    assert target["apiKey"] != raw_api_key
    assert "••••••••" in target["apiKey"]
    assert target["apiKey"].startswith(raw_api_key[:8])

def test_monthly_quota_date_filtering_across_periods():
    """Confirms UsageService.check_monthly_quota filters by current billing period."""
    comp_id = f"comp-quota-date-{int(time.time() * 1000)}"
    db.companies[comp_id] = {
        "id": comp_id,
        "name": "Quota Date Co",
        "planId": "starter" # Limit = 1000
    }

    # 1. Seed 1000 conversations in previous month (e.g. 2026-08)
    for i in range(1000):
        cid = f"conv-prev-{comp_id}-{i}"
        db.conversations[cid] = {
            "id": cid,
            "companyId": comp_id,
            "createdAt": "2026-08-15T10:00:00Z",
            "status": "active"
        }

    # 2. Check quota for current month (2026-09) -> should be 0 used, not exceeded
    quota_curr = UsageService.check_monthly_quota(comp_id, billing_period="2026-09")
    assert quota_curr["conversationsUsed"] == 0
    assert quota_curr["isExceeded"] is False

    # 3. Check quota for previous month (2026-08) -> should be 1000 used, exceeded
    quota_prev = UsageService.check_monthly_quota(comp_id, billing_period="2026-08")
    assert quota_prev["conversationsUsed"] == 1000
    assert quota_prev["isExceeded"] is True
