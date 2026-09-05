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
