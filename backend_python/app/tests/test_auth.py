import os
import sys
import pytest
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
    assert data["agent"]["name"] == "Quantum AI Systems AI Employee"
