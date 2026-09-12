import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from app.main import app
from app.services.billing_service import BillingService

client = TestClient(app)

def test_gst_intrastate_calculation():
    # Base amount = Rs. 10,000
    # CGST (9%) = 900, SGST (9%) = 900, Total = 11,800
    invoice = BillingService.calculate_gst_invoice(10000.0, is_interstate=False)
    assert invoice["subtotalINR"] == 10000.0
    assert invoice["taxRatePercent"] == 18.0
    assert invoice["taxAmountINR"] == 1800.0
    assert invoice["totalINR"] == 11800.0
    assert invoice["taxBreakdown"]["cgst"] == 900.0
    assert invoice["taxBreakdown"]["sgst"] == 900.0
    assert invoice["taxBreakdown"]["igst"] == 0.0

def test_gst_interstate_calculation():
    # Base amount = Rs. 10,000
    # IGST (18%) = 1800, Total = 11,800
    invoice = BillingService.calculate_gst_invoice(10000.0, is_interstate=True)
    assert invoice["taxBreakdown"]["cgst"] == 0.0
    assert invoice["taxBreakdown"]["sgst"] == 0.0
    assert invoice["taxBreakdown"]["igst"] == 1800.0
    assert invoice["totalINR"] == 11800.0

def test_billing_plans_endpoint():
    res = client.get("/api/v1/billing/plans")
    assert res.status_code == 200
    data = res.json()["data"]
    assert "plans" in data
    assert len(data["plans"]) >= 3
    plan_ids = [p["id"] for p in data["plans"]]
    assert "starter" in plan_ids
    assert "growth" in plan_ids
    assert "business" in plan_ids

def test_billing_upgrade_and_invoices_tenant_isolation():
    from app.core.security import create_jwt_token
    from app.db.database import db

    # Seed two tenant companies
    db.companies["comp-tenant-a"] = {"id": "comp-tenant-a", "name": "Tenant A Corp", "planId": "starter"}
    db.companies["comp-tenant-b"] = {"id": "comp-tenant-b", "name": "Tenant B Corp", "planId": "starter"}

    token_a = create_jwt_token("usr-a", "comp-tenant-a", "owner")
    token_b = create_jwt_token("usr-b", "comp-tenant-b", "owner")

    headers_a = {"Authorization": f"Bearer {token_a}", "X-Company-ID": "comp-tenant-a"}
    headers_b = {"Authorization": f"Bearer {token_b}", "X-Company-ID": "comp-tenant-b"}

    # Upgrade Tenant A to Growth
    up_res = client.post(
        "/api/v1/billing/upgrade",
        json={"planId": "growth", "billingCycle": "monthly"},
        headers=headers_a
    )
    assert up_res.status_code == 200
    up_data = up_res.json()["data"]
    assert up_data["success"] is True
    assert "invoice" in up_data
    invoice_id = up_data["invoice"]["id"]

    # Verify Tenant A invoices contains the generated invoice
    inv_res_a = client.get("/api/v1/billing/invoices", headers=headers_a)
    assert inv_res_a.status_code == 200
    invoices_a = inv_res_a.json()["data"]["invoices"]
    assert any(inv["id"] == invoice_id for inv in invoices_a)

    # Multi-tenant isolation: Tenant B should NOT see Tenant A's invoice
    inv_res_b = client.get("/api/v1/billing/invoices", headers=headers_b)
    assert inv_res_b.status_code == 200
    invoices_b = inv_res_b.json()["data"]["invoices"]
    assert not any(inv["id"] == invoice_id for inv in invoices_b)

