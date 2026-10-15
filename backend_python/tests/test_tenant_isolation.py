import pytest
import hmac
import hashlib
import json
import time
from fastapi.testclient import TestClient
from sqlalchemy import text
from app.main import app
from app.db.database import db
from app.core.security import create_jwt_token
from app.services.storage_service import StorageService
from app.services.usage_service import UsageService
from app.services.payment_service import PaymentService
from app.services.email_service import EmailService

client = TestClient(app)

TENANT_A_ID = "comp_iso_tenant_a"
TENANT_B_ID = "comp_iso_tenant_b"
USER_A_ID = "usr_iso_user_a"
USER_B_ID = "usr_iso_user_b"


@pytest.fixture(autouse=True)
def setup_isolation_tenants():
    """Seeds two isolated tenant companies and test users."""
    now_str = "2026-09-01T00:00:00Z"
    
    # 1. Tenant A
    db.save_company({
        "id": TENANT_A_ID,
        "name": "Tenant Alpha Corp",
        "slug": "tenant-alpha",
        "planId": "starter",
        "planStatus": "active",
        "isSuspended": False,
        "createdAt": now_str
    })
    db.save_user({
        "id": USER_A_ID,
        "email": "owner@tenant-alpha.com",
        "fullName": "Alice Alpha",
        "passwordHash": "hash_a",
        "isEmailVerified": True,
        "createdAt": now_str
    })
    db.save_membership({
        "id": "mem_iso_a",
        "userId": USER_A_ID,
        "companyId": TENANT_A_ID,
        "role": "owner",
        "status": "active",
        "createdAt": now_str
    })
    db.save_agent({
        "id": "agent_iso_a",
        "companyId": TENANT_A_ID,
        "name": "AlphaBot",
        "status": "active",
        "createdAt": now_str
    })

    # 2. Tenant B
    db.save_company({
        "id": TENANT_B_ID,
        "name": "Tenant Beta Inc",
        "slug": "tenant-beta",
        "planId": "growth",
        "planStatus": "active",
        "isSuspended": False,
        "createdAt": now_str
    })
    db.save_user({
        "id": USER_B_ID,
        "email": "owner@tenant-beta.com",
        "fullName": "Bob Beta",
        "passwordHash": "hash_b",
        "isEmailVerified": True,
        "createdAt": now_str
    })
    db.save_membership({
        "id": "mem_iso_b",
        "userId": USER_B_ID,
        "companyId": TENANT_B_ID,
        "role": "owner",
        "status": "active",
        "createdAt": now_str
    })
    db.save_agent({
        "id": "agent_iso_b",
        "companyId": TENANT_B_ID,
        "name": "BetaBot",
        "status": "active",
        "createdAt": now_str
    })

    # Seed knowledge sources and conversations
    db.save_knowledge_source({
        "id": "ks_iso_a",
        "companyId": TENANT_A_ID,
        "title": "Alpha Confidential Roadmap",
        "sourceType": "document",
        "status": "ready",
        "createdAt": now_str
    })
    db.save_knowledge_source({
        "id": "ks_iso_b",
        "companyId": TENANT_B_ID,
        "title": "Beta Secret Financials",
        "sourceType": "document",
        "status": "ready",
        "createdAt": now_str
    })

    db.save_conversation({
        "id": "conv_iso_a",
        "companyId": TENANT_A_ID,
        "customerName": "Customer A",
        "status": "open",
        "startedAt": now_str
    })
    db.save_conversation({
        "id": "conv_iso_b",
        "companyId": TENANT_B_ID,
        "customerName": "Customer B",
        "status": "open",
        "startedAt": now_str
    })

    # Seed API keys
    db.api_keys["key_iso_a"] = {
        "id": "key_iso_a",
        "companyId": TENANT_A_ID,
        "name": "Alpha Production Key",
        "keyPrefix": "aas_live_alph",
        "keyHash": hashlib.sha256(b"secret_key_alpha").hexdigest(),
        "scopes": ["chat:read", "chat:write"],
        "status": "active"
    }
    db.api_keys["key_iso_b"] = {
        "id": "key_iso_b",
        "companyId": TENANT_B_ID,
        "name": "Beta Production Key",
        "keyPrefix": "aas_live_beta",
        "keyHash": hashlib.sha256(b"secret_key_beta").hexdigest(),
        "scopes": ["chat:read", "chat:write"],
        "status": "active"
    }


def _get_tenant_token(user_id: str, company_id: str, role: str = "owner") -> str:
    return create_jwt_token(
        user_id=user_id,
        company_id=company_id,
        role=role,
        extra_claims={
            "scopes": ["chat:read", "chat:write", "agents:read", "agents:write", "knowledge:read", "knowledge:write", "settings:read"]
        }
    )


def test_postgresql_rls_session_isolation():
    """
    Asserts that PostgreSQL RLS session variables (app.current_tenant_id / app.is_super_admin)
    strictly isolate queries at the database engine level.
    """
    if db.engine.dialect.name != "postgresql":
        pytest.skip("Test requires PostgreSQL engine with RLS support")

    # 0. Ensure non-superuser test role exists and is granted access
    with db.get_session() as setup_session:
        setup_session.execute(text("DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'aaas_test_role') THEN CREATE ROLE aaas_test_role NOBYPASSRLS; END IF; END $$;"))
        setup_session.execute(text("GRANT ALL ON ALL TABLES IN SCHEMA public TO aaas_test_role;"))

    # 1. Tenant A session can only see Tenant A's rows
    with db.get_session(company_id=TENANT_A_ID, is_super_admin=False) as session:
        session.execute(text("SET LOCAL ROLE aaas_test_role;"))
        session.execute(text("SET LOCAL app.current_tenant_id = :cid;"), {"cid": TENANT_A_ID})
        session.execute(text("SET LOCAL app.is_super_admin = 'false';"))
        sources = session.execute(text("SELECT id, company_id FROM knowledge_sources")).fetchall()
        for s in sources:
            assert s[1] == TENANT_A_ID, f"RLS leak: Tenant A session saw row belonging to {s[1]}"

    # 2. Tenant B session can only see Tenant B's rows
    with db.get_session(company_id=TENANT_B_ID, is_super_admin=False) as session:
        session.execute(text("SET LOCAL ROLE aaas_test_role;"))
        session.execute(text("SET LOCAL app.current_tenant_id = :cid;"), {"cid": TENANT_B_ID})
        session.execute(text("SET LOCAL app.is_super_admin = 'false';"))
        sources = session.execute(text("SELECT id, company_id FROM knowledge_sources")).fetchall()
        for s in sources:
            assert s[1] == TENANT_B_ID, f"RLS leak: Tenant B session saw row belonging to {s[1]}"

    # 3. Super admin session can see both tenants
    with db.get_session(company_id=None, is_super_admin=True) as session:
        cids = {s[1] for s in session.execute(text("SELECT id, company_id FROM knowledge_sources")).fetchall()}
        assert TENANT_A_ID in cids
        assert TENANT_B_ID in cids


def test_endpoint_cross_tenant_isolation_agents():
    """Asserts Tenant A cannot see Tenant B's agents via GET /api/v1/agent."""
    token_a = _get_tenant_token(USER_A_ID, TENANT_A_ID)
    resp = client.get("/api/v1/agent", headers={"Authorization": f"Bearer {token_a}"})
    assert resp.status_code == 200
    agent_data = resp.json().get("data", {}).get("agent", {})
    assert agent_data.get("name") == "AlphaBot"
    assert agent_data.get("name") != "BetaBot"


def test_endpoint_cross_tenant_isolation_knowledge():
    """Asserts Tenant A cannot see Tenant B's knowledge documents."""
    token_a = _get_tenant_token(USER_A_ID, TENANT_A_ID)
    resp = client.get("/api/v1/knowledge", headers={"Authorization": f"Bearer {token_a}"})
    assert resp.status_code == 200
    sources = resp.json().get("data", {}).get("sources", [])
    titles = [s.get("title") for s in sources]
    assert "Alpha Confidential Roadmap" in titles
    assert "Beta Secret Financials" not in titles


def test_endpoint_cross_tenant_isolation_conversations():
    """Asserts Tenant A cannot access Tenant B's conversation by ID."""
    token_a = _get_tenant_token(USER_A_ID, TENANT_A_ID)
    # Attempt to read Tenant B's conversation using Tenant A token
    resp = client.get("/api/v1/conversations/conv_iso_b", headers={"Authorization": f"Bearer {token_a}"})
    assert resp.status_code in [403, 404], f"Expected 403 or 404, got {resp.status_code}"


def test_endpoint_cross_tenant_isolation_companies():
    """Asserts Tenant A cannot access Tenant B's company record."""
    token_a = _get_tenant_token(USER_A_ID, TENANT_A_ID)
    resp = client.get(f"/api/v1/companies/{TENANT_B_ID}", headers={"Authorization": f"Bearer {token_a}"})
    assert resp.status_code in [403, 404]


def test_endpoint_cross_tenant_isolation_developer_keys():
    """Asserts Tenant A cannot view Tenant B's API keys."""
    token_a = _get_tenant_token(USER_A_ID, TENANT_A_ID)
    resp = client.get("/api/v1/developer/api-keys", headers={"Authorization": f"Bearer {token_a}"})
    assert resp.status_code == 200
    keys = resp.json().get("data", {}).get("apiKeys", [])
    key_names = [k.get("name") for k in keys]
    assert "Alpha Production Key" in key_names
    assert "Beta Production Key" not in key_names


def test_storage_tenant_prefix_isolation():
    """Asserts Tenant A cannot generate a presigned download URL for Tenant B's files."""
    # Attempting to access Tenant B's file key using Tenant A's company context must return None
    cross_tenant_key = f"{TENANT_B_ID}/doc_financials/tax_return_2026.pdf"
    presigned = StorageService.generate_presigned_url(
        company_id=TENANT_A_ID,
        key=cross_tenant_key
    )
    assert presigned is None, "StorageService permitted cross-tenant file access!"


def test_monthly_token_and_cost_cap_enforcement():
    """Asserts that monthly token and cost caps are enforced and flag quota exceedance."""
    # Starter plan token cap is 2,000,000 tokens
    quota = UsageService.check_monthly_quota(TENANT_A_ID)
    assert quota["tokenCap"] == 2_000_000
    assert quota["costCapINR"] == 1500.0
    assert quota["isExceeded"] is False

    # Simulate token burn exceeding 2,000,000 tokens
    UsageService.record_event(TENANT_A_ID, "llm_tokens", 2_500_000, unit="tokens")
    quota_exceeded = UsageService.check_monthly_quota(TENANT_A_ID)
    assert quota_exceeded["isExceeded"] is True
    assert any("Monthly token cap reached" in r for r in quota_exceeded["exceededReasons"])


def test_razorpay_webhook_signature_and_idempotency():
    """Asserts Razorpay webhook HMAC-SHA256 verification and replay protection."""
    PaymentService.reset_processed_events()
    secret = PaymentService.get_webhook_secret()
    unique_event_id = f"evt_test_rzp_{int(time.time() * 1000)}"
    payload = json.dumps({
        "id": unique_event_id,
        "event": "subscription.activated",
        "payload": {
            "subscription": {
                "entity": {
                    "id": f"sub_test_{int(time.time() * 1000)}",
                    "notes": {
                        "companyId": TENANT_A_ID,
                        "planId": "growth",
                        "billingCycle": "monthly"
                    }
                }
            }
        }
    }).encode("utf-8")

    valid_signature = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    invalid_signature = "invalid_forged_signature_00000000000000000000000000000000"

    # 1. Invalid signature must raise ValueError
    with pytest.raises(ValueError, match="Invalid Razorpay webhook signature"):
        PaymentService.process_webhook_event(payload, invalid_signature)

    # 2. Valid signature must succeed
    result = PaymentService.process_webhook_event(payload, valid_signature)
    assert result["status"] == "success"
    assert result["planId"] == "growth"

    # 3. Duplicate event with same ID must be detected and safely ignored
    replay_result = PaymentService.process_webhook_event(payload, valid_signature)
    assert replay_result["status"] == "ignored"
    assert replay_result["reason"] == "duplicate_event"


def test_email_single_use_expiring_tokens():
    """Asserts transactional email tokens are single-use and expire correctly."""
    EmailService.reset_tokens()
    raw_token = EmailService.create_token(
        user_id=USER_A_ID,
        email="owner@tenant-alpha.com",
        token_type="password_reset",
        ttl_seconds=3600
    )

    # 1. Valid token consumption succeeds
    record = EmailService.verify_and_consume_token(raw_token, expected_type="password_reset")
    assert record is not None
    assert record["userId"] == USER_A_ID

    # 2. Replay of same token fails (single-use protection)
    replayed = EmailService.verify_and_consume_token(raw_token, expected_type="password_reset")
    assert replayed is None

    # 3. Expired token fails
    expired_token = EmailService.create_token(
        user_id=USER_A_ID,
        email="owner@tenant-alpha.com",
        token_type="verify_email",
        ttl_seconds=-10  # already expired
    )
    assert EmailService.verify_and_consume_token(expired_token, expected_type="verify_email") is None


def test_gdpr_data_export_and_right_to_erasure():
    """Asserts GDPR Art. 20 data export and Art. 17 right to erasure (data purge)."""
    token_a = _get_tenant_token(USER_A_ID, TENANT_A_ID, role="owner")
    token_b = _get_tenant_token(USER_B_ID, TENANT_B_ID, role="owner")

    # 1. Tenant B cannot export Tenant A's data (403)
    resp = client.get(f"/api/v1/companies/{TENANT_A_ID}/gdpr/export", headers={"Authorization": f"Bearer {token_b}"})
    assert resp.status_code == 403

    # 2. Tenant A can export their own data (200)
    resp = client.get(f"/api/v1/companies/{TENANT_A_ID}/gdpr/export", headers={"Authorization": f"Bearer {token_a}"})
    assert resp.status_code == 200
    assert resp.json()["compliance"] == "GDPR Article 20 - Data Portability"

    # 3. Right to erasure: delete tenant data
    del_resp = client.delete(f"/api/v1/companies/{TENANT_A_ID}/gdpr/delete", headers={"Authorization": f"Bearer {token_a}"})
    assert del_resp.status_code == 200
    assert del_resp.json()["compliance"] == "GDPR Article 17 - Right to Erasure"

    # 4. Verify tenant data is completely erased
    assert db.companies.get(TENANT_A_ID) is None
    assert not any(a.get("companyId") == TENANT_A_ID for a in db.agents.values())
    assert not any(s.get("companyId") == TENANT_A_ID for s in db.knowledge_sources.values())
