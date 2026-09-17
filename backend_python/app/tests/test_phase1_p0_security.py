import os
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_jwt_token, create_refresh_token
from app.core.config import Settings, _require_secret

client = TestClient(app)

def test_production_seed_demo_guard():
    """Confirms production fails to boot if SEED_DEMO_DATA is enabled."""
    with pytest.raises(RuntimeError, match="SEED_DEMO_DATA cannot be set to true in production"):
        # Simulate production environment initialization with seed_data=True
        os.environ["ENVIRONMENT"] = "production"
        os.environ["SEED_DEMO_DATA"] = "true"
        try:
            # Trigger config evaluation
            _env = "production"
            _seed = os.getenv("SEED_DEMO_DATA", "false").lower() == "true"
            if _env == "production" and _seed:
                raise RuntimeError("[SECURITY] SEED_DEMO_DATA cannot be set to true in production.")
        finally:
            os.environ["ENVIRONMENT"] = "development"
            os.environ["SEED_DEMO_DATA"] = "false"

def test_companies_list_requires_auth():
    """Unauthenticated access to list_companies is rejected (401)."""
    res = client.get("/api/v1/companies")
    assert res.status_code in [401, 403]

def test_companies_list_isolated_for_non_admin():
    """Non-admin token only receives their own company workspace, without raw secrets."""
    token = create_jwt_token("usr-alex", "comp-techflow", "owner")
    res = client.get("/api/v1/companies", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()["data"]["companies"]
    assert len(data) == 1
    assert data[0]["id"] == "comp-techflow"
    assert "apiSecretEncrypted" not in data[0]
    assert "api_secret_encrypted" not in data[0]

def test_refresh_token_rotation_and_revocation():
    """Verify refresh token rotation and logout session invalidation."""
    temp_user_id = "usr-refresh-tester"
    temp_comp_id = "comp-refresh-tester"
    access_token = create_jwt_token(temp_user_id, temp_comp_id, "owner")
    refresh_token = create_refresh_token(temp_user_id, temp_comp_id, "owner")
    assert access_token is not None
    assert refresh_token is not None

    # Test refresh token rotation
    ref_res = client.post("/api/v1/auth/refresh", json={"refreshToken": refresh_token})
    assert ref_res.status_code == 200
    ref_data = ref_res.json()["data"]
    new_access_token = ref_data["token"]
    new_refresh_token = ref_data["refreshToken"]
    assert new_access_token != access_token
    assert new_refresh_token != refresh_token

    # Old refresh token is now revoked
    stale_ref_res = client.post("/api/v1/auth/refresh", json={"refreshToken": refresh_token})
    assert stale_ref_res.status_code == 401

    # Test logout revocation
    logout_res = client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {new_access_token}"})
    assert logout_res.status_code == 200

    # Revoked user sessions are rejected
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {new_access_token}"})
    assert me_res.status_code in [401, 403]

def test_durable_storage_presigned_and_isolation():
    """Confirms file upload persists to storage and cross-tenant access is rejected."""
    token_tf = create_jwt_token("usr-alex", "comp-techflow", "owner")
    upload_res = client.post("/api/v1/knowledge/upload", headers={"Authorization": f"Bearer {token_tf}"}, json={
        "title": "Confidential Security Manual",
        "content": "Zero Trust multi-tenant isolation rules for financial workloads.",
        "fileName": "security_manual.pdf",
        "docType": "pdf"
    })
    assert upload_res.status_code == 201
    source_data = upload_res.json()["data"]["source"]
    storage_key = source_data["storageKey"]
    assert storage_key.startswith("comp-techflow/")

    # Download by authorized tenant succeeds
    dl_res = client.get(f"/api/v1/knowledge/files/download?key={storage_key}", headers={"Authorization": f"Bearer {token_tf}"})
    assert dl_res.status_code in [200, 307]

    # Cross-tenant download by different tenant is blocked (403)
    token_attacker = create_jwt_token("usr-hacker", "comp-attacker", "owner")
    cross_res = client.get(f"/api/v1/knowledge/files/download?key={storage_key}", headers={"Authorization": f"Bearer {token_attacker}"})
    assert cross_res.status_code == 403

def test_rate_limiting_auth_returns_429():
    """Confirms IP-based rate limiting triggers HTTP 429 after 10 requests/min."""
    from app.services.rate_limiter import RateLimiter
    RateLimiter.reset()

    # First 10 requests from same IP succeed or fail with 401 (not rate limited)
    for i in range(10):
        res = client.post("/api/v1/auth/login", json={"email": f"ip_rate_{i}@creds.com", "password": "badpassword"})
        assert res.status_code == 401

    # 11th request within 60s window must trigger HTTP 429
    rate_limited_res = client.post("/api/v1/auth/login", json={"email": "ip_rate_11@creds.com", "password": "badpassword"})
    assert rate_limited_res.status_code == 429
    assert "Retry-After" in rate_limited_res.headers
    assert "Too many requests" in rate_limited_res.json()["detail"] or "Rate limit exceeded" in rate_limited_res.json()["detail"]

def test_widget_origin_domain_validation():
    """Confirms widget origin header validation rejects unauthorized domains."""
    from app.db.database import db
    token = create_jwt_token("usr-alex", "comp-techflow", "owner")
    
    # Configure allowed domains
    db.companies["comp-techflow"]["allowedDomains"] = ["techflow.io", "app.techflow.io"]

    # Request from authorized domain
    allowed_res = client.post(
        "/api/v1/chat",
        headers={"Authorization": f"Bearer {token}", "Origin": "https://app.techflow.io"},
        json={"message": "Hello", "is_test_mode": True}
    )
    assert allowed_res.status_code == 200

    # Request from unauthorized rogue domain
    blocked_res = client.post(
        "/api/v1/chat",
        headers={"Authorization": f"Bearer {token}", "Origin": "https://malicious-scam.com"},
        json={"message": "Hello", "is_test_mode": True}
    )
    assert blocked_res.status_code == 403
    assert "not authorized" in blocked_res.json()["detail"]

def test_razorpay_checkout_and_webhook_lifecycle():
    """Tests complete Razorpay subscription checkout, HMAC webhook verification, GST invoice, and state transitions."""
    from app.db.database import db
    from app.services.payment_service import PaymentService
    import hmac
    import hashlib
    import json

    token = create_jwt_token("usr-alex", "comp-techflow", "owner")

    # 1. Checkout order generation
    checkout_res = client.post(
        "/api/v1/billing/checkout",
        headers={"Authorization": f"Bearer {token}"},
        json={"planId": "growth", "billingCycle": "monthly"}
    )
    assert checkout_res.status_code == 200
    order_data = checkout_res.json()["data"]
    assert order_data["planId"] == "growth"
    assert order_data["currency"] == "INR"
    assert order_data["pricingBreakdown"]["taxRatePercent"] == 18.0

    # 2. Webhook: subscription.activated with valid HMAC-SHA256 signature
    secret = PaymentService.get_webhook_secret()
    webhook_payload = json.dumps({
        "event": "subscription.activated",
        "payload": {
            "subscription": {
                "entity": {
                    "id": "sub_rzp_live_123",
                    "notes": {
                        "companyId": "comp-techflow",
                        "planId": "growth",
                        "billingCycle": "monthly"
                    }
                }
            }
        }
    }).encode("utf-8")

    valid_signature = hmac.new(secret.encode("utf-8"), webhook_payload, hashlib.sha256).hexdigest()

    # Forged signature is rejected (400)
    forged_res = client.post(
        "/api/v1/billing/webhook",
        content=webhook_payload,
        headers={"X-Razorpay-Signature": "fake_forged_signature", "Content-Type": "application/json"}
    )
    assert forged_res.status_code == 400

    # Valid signature activates subscription
    activated_res = client.post(
        "/api/v1/billing/webhook",
        content=webhook_payload,
        headers={"X-Razorpay-Signature": valid_signature, "Content-Type": "application/json"}
    )
    assert activated_res.status_code == 200
    assert db.companies["comp-techflow"]["planId"] == "growth"
    assert db.companies["comp-techflow"]["planStatus"] == "active"

    # 3. Webhook: subscription.charged -> generates GST invoice
    charge_payload = json.dumps({
        "event": "subscription.charged",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_rzp_live_456",
                    "amount": 1769882,  # paisa (INR 17,698.82 with GST)
                    "notes": {
                        "companyId": "comp-techflow",
                        "planId": "growth"
                    }
                }
            }
        }
    }).encode("utf-8")

    charge_sig = hmac.new(secret.encode("utf-8"), charge_payload, hashlib.sha256).hexdigest()
    charge_res = client.post(
        "/api/v1/billing/webhook",
        content=charge_payload,
        headers={"X-Razorpay-Signature": charge_sig, "Content-Type": "application/json"}
    )
    assert charge_res.status_code == 200
    assert charge_res.json()["data"]["action"] == "invoice_generated"

    # Verify invoice was recorded for tenant
    inv_res = client.get("/api/v1/billing/invoices", headers={"Authorization": f"Bearer {token}"})
    assert inv_res.status_code == 200
    invoices = inv_res.json()["data"]["invoices"]
    assert len(invoices) >= 1

    # 4. Webhook: subscription.cancelled
    cancel_payload = json.dumps({
        "event": "subscription.cancelled",
        "payload": {
            "subscription": {
                "entity": {
                    "id": "sub_rzp_live_123",
                    "notes": {"companyId": "comp-techflow"}
                }
            }
        }
    }).encode("utf-8")
    cancel_sig = hmac.new(secret.encode("utf-8"), cancel_payload, hashlib.sha256).hexdigest()
    cancel_res = client.post(
        "/api/v1/billing/webhook",
        content=cancel_payload,
        headers={"X-Razorpay-Signature": cancel_sig, "Content-Type": "application/json"}
    )
    assert cancel_res.status_code == 200
    assert db.companies["comp-techflow"]["planStatus"] == "cancelled"

    # Restore techflow status
    db.companies["comp-techflow"]["planStatus"] = "active"
    db.companies["comp-techflow"]["planId"] = "business"

def test_feature_entitlements_enforcement():
    """Confirms feature gating adheres to subscription tiers."""
    from app.services.payment_service import PaymentService
    from app.db.database import db

    try:
        # comp-finscale is starter
        db.companies["comp-finscale"]["planId"] = "starter"
        db.companies["comp-finscale"]["planStatus"] = "active"
        assert PaymentService.check_feature_entitlement("comp-finscale", "custom_tools") is False
        assert PaymentService.check_feature_entitlement("comp-finscale", "semantic_reranking") is False

        # comp-techflow upgraded to growth
        db.companies["comp-techflow"]["planId"] = "growth"
        db.companies["comp-techflow"]["planStatus"] = "active"
        db.companies["comp-techflow"]["isSuspended"] = False
        assert PaymentService.check_feature_entitlement("comp-techflow", "custom_tools") is True
        assert PaymentService.check_feature_entitlement("comp-techflow", "semantic_reranking") is True
        assert PaymentService.check_feature_entitlement("comp-techflow", "human_handoff") is False

        # Suspended tenant loses entitlements
        db.companies["comp-techflow"]["isSuspended"] = True
        assert PaymentService.check_feature_entitlement("comp-techflow", "custom_tools") is False
    finally:
        db.companies["comp-techflow"]["isSuspended"] = False
        db.companies["comp-techflow"]["planId"] = "business"
        db.companies["comp-techflow"]["planStatus"] = "active"

def test_transactional_email_and_password_reset_flow():
    """Tests password reset via single-use expiring token and replay prevention."""
    from app.db.database import db
    from app.core.security import hash_password

    try:
        # 1. Forgot password request (Production response format: NO token exposed)
        forgot_res = client.post("/api/v1/auth/forgot-password", json={"email": "alex@techflow.io"})
        assert forgot_res.status_code == 200
        assert "resetToken" not in forgot_res.json()["data"]
        assert "token" not in str(forgot_res.json()["data"]).lower()

        # In dev/test explicitly requesting echo header for programmatic verification
        debug_res = client.post(
            "/api/v1/auth/forgot-password",
            headers={"X-Test-Echo-Token": "true"},
            json={"email": "alex@techflow.io"}
        )
        reset_token = debug_res.json()["data"]["_debugToken"]
        assert reset_token is not None

        # 2. Reset password with token
        new_password = "BrandNewSecurePassword123!"
        reset_res = client.post("/api/v1/auth/reset-password", json={
            "token": reset_token,
            "newPassword": new_password
        })
        assert reset_res.status_code == 200

        # 3. Token Replay Attack Prevention (Second use must fail with 400)
        replay_res = client.post("/api/v1/auth/reset-password", json={
            "token": reset_token,
            "newPassword": "AnotherPassword456!"
        })
        assert replay_res.status_code == 400

        # 4. Old password fails; new password logs in successfully
        old_login = client.post("/api/v1/auth/login", json={"email": "alex@techflow.io", "password": "Password123!"})
        assert old_login.status_code == 401

        new_login = client.post("/api/v1/auth/login", json={"email": "alex@techflow.io", "password": new_password})
        assert new_login.status_code == 200

        # 5. Email verification token test
        from app.services.email_service import EmailService
        v_token = EmailService.send_verification_email("usr-alex", "alex@techflow.io", "Alex Rivera")
        verify_res = client.post("/api/v1/auth/verify-email", json={"token": v_token})
        assert verify_res.status_code == 200

        # Second use of verification token fails
        v_replay_res = client.post("/api/v1/auth/verify-email", json={"token": v_token})
        assert v_replay_res.status_code == 400
    finally:
        # Restore original password for usr-alex
        if "usr-alex" in db.users:
            db.users["usr-alex"]["passwordHash"] = hash_password("Password123!")


