import os
import sys
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
    import hmac
    import hashlib
    import json
    from app.core.security import create_jwt_token
    from app.db.database import db
    from app.services.payment_service import PaymentService

    PaymentService.reset_processed_events()

    # Seed two tenant companies and clean any test invoices
    db.companies["comp-tenant-a"] = {"id": "comp-tenant-a", "name": "Tenant A Corp", "planId": "starter", "planStatus": "active"}
    db.companies["comp-tenant-b"] = {"id": "comp-tenant-b", "name": "Tenant B Corp", "planId": "starter", "planStatus": "active"}
    db.invoices = {k: v for k, v in db.invoices.items() if v.get("companyId") not in ["comp-tenant-a", "comp-tenant-b"]}

    token_a = create_jwt_token("usr-a", "comp-tenant-a", "owner")
    token_b = create_jwt_token("usr-b", "comp-tenant-b", "owner")

    headers_a = {"Authorization": f"Bearer {token_a}", "X-Company-ID": "comp-tenant-a"}
    headers_b = {"Authorization": f"Bearer {token_b}", "X-Company-ID": "comp-tenant-b"}

    # 1. POST /billing/upgrade initiates checkout order but DOES NOT upgrade plan or create paid invoice
    up_res = client.post(
        "/api/v1/billing/upgrade",
        json={"planId": "growth", "billingCycle": "monthly"},
        headers=headers_a
    )
    assert up_res.status_code == 200
    up_data = up_res.json()["data"]
    assert "subscriptionId" in up_data
    assert up_data["planId"] == "growth"
    assert "invoice" not in up_data

    # Confirm company plan is STILL starter (not upgraded for free)
    assert db.companies["comp-tenant-a"]["planId"] == "starter"

    # Confirm no paid invoice exists yet
    inv_res_pre = client.get("/api/v1/billing/invoices", headers=headers_a)
    assert inv_res_pre.status_code == 200
    assert len(inv_res_pre.json()["data"]["invoices"]) == 0

    # 2. Simulate verified Razorpay webhook: subscription.activated
    secret = PaymentService.get_webhook_secret()
    sub_payload = json.dumps({
        "id": "evt_sub_act_123",
        "event": "subscription.activated",
        "payload": {
            "subscription": {
                "entity": {
                    "id": up_data["subscriptionId"],
                    "notes": {
                        "companyId": "comp-tenant-a",
                        "planId": "growth",
                        "billingCycle": "monthly"
                    }
                }
            }
        }
    }).encode("utf-8")
    sig_act = hmac.new(secret.encode("utf-8"), sub_payload, hashlib.sha256).hexdigest()

    res_webhook_act = client.post(
        "/api/v1/billing/webhook",
        content=sub_payload,
        headers={"X-Razorpay-Signature": sig_act, "Content-Type": "application/json"}
    )
    assert res_webhook_act.status_code == 200
    assert db.companies["comp-tenant-a"]["planId"] == "growth"

    # 3. Simulate verified Razorpay webhook: subscription.charged (generates paid invoice)
    charge_payload = json.dumps({
        "id": "evt_sub_charge_456",
        "event": "subscription.charged",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_rzp_test_789",
                    "amount": 1769882, # Rs 14,999 + 18% GST in paise
                    "notes": {
                        "companyId": "comp-tenant-a",
                        "planId": "growth"
                    }
                }
            }
        }
    }).encode("utf-8")
    sig_charge = hmac.new(secret.encode("utf-8"), charge_payload, hashlib.sha256).hexdigest()

    res_webhook_charge = client.post(
        "/api/v1/billing/webhook",
        content=charge_payload,
        headers={"X-Razorpay-Signature": sig_charge, "Content-Type": "application/json"}
    )
    assert res_webhook_charge.status_code == 200
    charge_data = res_webhook_charge.json()["data"]
    assert charge_data["action"] == "invoice_generated"
    invoice_id = charge_data["invoiceId"]

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

def test_webhook_replay_protection():
    import hmac
    import hashlib
    import json
    from app.services.payment_service import PaymentService

    PaymentService.reset_processed_events()
    secret = PaymentService.get_webhook_secret()

    event_payload = json.dumps({
        "id": "evt_replay_test_999",
        "event": "subscription.activated",
        "payload": {
            "subscription": {
                "entity": {
                    "id": "sub_rzp_replay",
                    "notes": {"companyId": "comp-tenant-a", "planId": "growth"}
                }
            }
        }
    }).encode("utf-8")
    sig = hmac.new(secret.encode("utf-8"), event_payload, hashlib.sha256).hexdigest()

    # First dispatch succeeds
    res1 = client.post("/api/v1/billing/webhook", content=event_payload, headers={"X-Razorpay-Signature": sig})
    assert res1.status_code == 200
    assert res1.json()["data"]["status"] == "success"

    # Replay attempt is ignored / deduplicated
    res2 = client.post("/api/v1/billing/webhook", content=event_payload, headers={"X-Razorpay-Signature": sig})
    assert res2.status_code == 200
    assert res2.json()["data"]["status"] == "ignored"
    assert res2.json()["data"]["reason"] == "duplicate_event"

def test_invoice_number_durability_and_format():
    """Confirms invoice numbers follow INV-YYYYMM-XXXX format and are monotonically increasing."""
    inv1 = BillingService.generate_invoice_number()
    inv2 = BillingService.generate_invoice_number()
    assert inv1.startswith("INV-")
    assert inv2.startswith("INV-")
    seq1 = int(inv1.split("-")[-1])
    seq2 = int(inv2.split("-")[-1])
    assert seq2 == seq1 + 1

