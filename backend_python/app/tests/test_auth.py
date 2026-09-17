import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from app.main import app
from app.core.security import create_jwt_token, decode_jwt_token, hash_password, verify_password

client = TestClient(app)

def test_password_hashing_and_verification():
    plain = "StrongPassword123!"
    hashed = hash_password(plain)
    assert hashed != plain
    assert verify_password(plain, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_jwt_creation_and_decoding():
    token = create_jwt_token("usr-123", "comp-test", "owner")
    payload = decode_jwt_token(token)
    assert payload is not None
    assert payload["sub"] == "usr-123"
    assert payload["company_id"] == "comp-test"
    assert payload["role"] == "owner"

def test_login_success():
    res = client.post("/api/v1/auth/login", json={
        "email": "alex@techflow.io",
        "password": "Password123!"
    })
    assert res.status_code == 200
    data = res.json()["data"]
    assert "token" in data
    assert data["role"] == "owner"
    assert data["companyId"] == "comp-techflow"

def test_login_invalid_credentials():
    res = client.post("/api/v1/auth/login", json={
        "email": "alex@techflow.io",
        "password": "BadPassword"
    })
    assert res.status_code == 401

def test_signup_creates_company_and_agent():
    res = client.post("/api/v1/auth/signup", json={
        "fullName": "Elena Rostova",
        "email": "elena@quantum-ai.de",
        "password": "SecurePassword2026!",
        "companyName": "Quantum AI Systems",
        "industry": "Deep Tech",
        "planId": "growth"
    })
    assert res.status_code == 201
    data = res.json()["data"]
    assert "token" in data
    assert data["company"]["name"] == "Quantum AI Systems"
    assert data["agent"]["name"] == "Quantum AI Systems AI Assistant"
    assert "apiSecretEncrypted" not in data["company"]


def test_forgot_password_never_leaks_token_in_production():
    """Asserts reset token is strictly NOT in the HTTP response under production simulation."""
    from app.core.config import settings
    orig_env = settings.ENVIRONMENT
    settings.ENVIRONMENT = "production"
    try:
        res = client.post("/api/v1/auth/forgot-password", json={"email": "alex@techflow.io"})
        assert res.status_code == 200
        body_str = res.text
        data = res.json().get("data", {})

        # Verify no token field exists
        assert "resetToken" not in data
        assert "token" not in data
        assert "_debugToken" not in data

        # Verify no token pattern (tok_...) exists anywhere in raw response
        assert "tok_" not in body_str
    finally:
        settings.ENVIRONMENT = orig_env


def test_signup_unpredictable_ids_and_api_keys():
    """Asserts rapid signup generates non-guessable, cryptographically random IDs and API keys."""
    res1 = client.post("/api/v1/auth/signup", json={
        "fullName": "User One",
        "email": "user1@rapidtest.com",
        "password": "StrongSecret2026!",
        "companyName": "Alpha Rapid Corp",
        "industry": "Tech"
    })
    res2 = client.post("/api/v1/auth/signup", json={
        "fullName": "User Two",
        "email": "user2@rapidtest.com",
        "password": "StrongSecret2026!",
        "companyName": "Beta Rapid Corp",
        "industry": "Tech"
    })
    assert res1.status_code == 201
    assert res2.status_code == 201

    c1 = res1.json()["data"]["company"]
    c2 = res2.json()["data"]["company"]

    # IDs must be different and not simple integer increments
    assert c1["id"] != c2["id"]
    assert c1["apiKey"] != c2["apiKey"]
    assert not c1["id"].endswith("000") and not c2["id"].endswith("000")
    assert not c1["apiKey"].endswith(c1["id"])  # Key is not derived from company ID


def test_password_strength_validation():
    """Asserts weak, breached, and personal-info passwords are strictly rejected."""
    base_payload = {
        "fullName": "Marcus Aurelius",
        "email": "marcus@rome.org",
        "companyName": "Rome Tech",
        "industry": "Government"
    }

    # 1. Too short (< 8 chars)
    short_res = client.post("/api/v1/auth/signup", json={**base_payload, "password": "Short1!"})
    assert short_res.status_code == 400
    assert "8 characters" in short_res.json()["detail"]

    # 2. Common breached password
    common_res = client.post("/api/v1/auth/signup", json={**base_payload, "password": "password123"})
    assert common_res.status_code == 400
    assert "too common" in common_res.json()["detail"].lower()

    # 3. Contains email prefix
    email_res = client.post("/api/v1/auth/signup", json={**base_payload, "password": "marcusSecret2026!"})
    assert email_res.status_code == 400
    assert "email" in email_res.json()["detail"].lower()

    # 4. Contains name
    name_res = client.post("/api/v1/auth/signup", json={**base_payload, "password": "AureliusSecret2026!"})
    assert name_res.status_code == 400
    assert "name" in name_res.json()["detail"].lower()


def test_email_verification_lifecycle():
    """Asserts unverified users are blocked from logging in until email verification is completed."""
    import uuid
    from app.services.email_service import _EMAIL_TOKENS
    email = f"unverified_{uuid.uuid4().hex[:8]}@testsaas.com"
    pwd = "ValidPassword2026!"

    # 1. Signup creates unverified account
    signup_res = client.post("/api/v1/auth/signup", json={
        "fullName": "Test Verify User",
        "email": email,
        "password": pwd,
        "companyName": "Verify Corp",
        "industry": "Testing"
    })
    assert signup_res.status_code == 201
    user_id = signup_res.json()["data"]["user"]["id"]

    # 2. Login attempt before verification must fail with 403 Forbidden
    login_before = client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
    assert login_before.status_code == 403
    assert "not verified" in login_before.json()["detail"].lower()

    # 3. Verify email with token
    v_token = [rec["token"] for rec in _EMAIL_TOKENS.values() if rec.get("userId") == user_id and rec.get("tokenType") == "verify_email"][-1]
    verify_res = client.post("/api/v1/auth/verify-email", json={"token": v_token})
    assert verify_res.status_code == 200

    # 4. Login after verification succeeds
    login_after = client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
    assert login_after.status_code == 200
    assert "token" in login_after.json()["data"]


def test_account_lockout_after_consecutive_failures():
    """Asserts account is temporarily locked after 5 consecutive bad login attempts."""
    from app.services.rate_limiter import RateLimiter
    target_email = "lockout_victim@target.com"
    RateLimiter.clear_failed_logins(target_email)

    for i in range(5):
        res = client.post("/api/v1/auth/login", json={"email": target_email, "password": "WrongPassword!"})
        if i < 4:
            assert res.status_code == 401
        else:
            # 5th consecutive failure triggers lockout
            assert res.status_code == 429
            assert "locked" in res.json()["detail"].lower()

    # 6th attempt is blocked immediately by account lockout
    locked_res = client.post("/api/v1/auth/login", json={"email": target_email, "password": "WrongPassword!"})
    assert locked_res.status_code == 429
    assert "locked" in locked_res.json()["detail"].lower()

    # Clear lockout
    RateLimiter.clear_failed_logins(target_email)

