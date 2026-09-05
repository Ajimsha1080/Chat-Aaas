import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from app.main import app
from app.core.security import create_jwt_token

client = TestClient(app)

def test_read_only_tool_execution():
    token = create_jwt_token("usr-alex", "comp-techflow", "owner")
    res = client.post(
        "/api/v1/tools/execute",
        json={"toolCode": "check_order_status", "args": {"order_id": "ORD-5541"}},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    assert res.json()["data"]["status"] == "success"

def test_high_risk_tool_blocked_without_confirmation():
    token = create_jwt_token("usr-alex", "comp-techflow", "owner")
    res = client.post(
        "/api/v1/tools/execute",
        json={"toolCode": "execute_refund", "args": {"order_id": "ORD-5541", "amount": "Rs. 1000"}, "userConfirmed": False},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["status"] == "requires_confirmation"
    assert "confirmationPrompt" in data

def test_high_risk_tool_executed_with_confirmation():
    token = create_jwt_token("usr-alex", "comp-techflow", "owner")
    res = client.post(
        "/api/v1/tools/execute",
        json={"toolCode": "execute_refund", "args": {"order_id": "ORD-5541", "amount": "Rs. 1000"}, "userConfirmed": True},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["status"] == "success"
    assert "refund_id" in str(data["result"])
