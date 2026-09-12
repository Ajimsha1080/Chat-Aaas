import time
from typing import Dict, Any, List, Optional
from app.db.database import db

PLANS_CATALOG = [
    {
        "id": "starter",
        "name": "Starter AI Assistant",
        "priceMonthlyINR": 4999,
        "priceAnnualINR": 49990,
        "maxConversationsMonth": 1000,
        "features": ["1 AI Assistant", "Standard Knowledge", "Email Support", "Web Widget"]
    },
    {
        "id": "growth",
        "name": "Growth Automation",
        "priceMonthlyINR": 14999,
        "priceAnnualINR": 149990,
        "maxConversationsMonth": 5000,
        "features": ["Custom Actions", "Semantic Reranking", "CRM Integrations", "Priority Support"]
    },
    {
        "id": "business",
        "name": "Enterprise Business",
        "priceMonthlyINR": 39999,
        "priceAnnualINR": 399990,
        "maxConversationsMonth": 25000,
        "features": ["Unlimited Chunks", "Human Handoff Inbox", "Custom Models", "Dedicated Account Manager"]
    }
]

class BillingService:
    @staticmethod
    def get_plans() -> List[Dict[str, Any]]:
        return PLANS_CATALOG

    @staticmethod
    def calculate_gst_invoice(amount_inr: float, is_interstate: bool = False) -> Dict[str, Any]:
        """
        Calculates 18% Indian GST:
        Intrastate: 9% CGST + 9% SGST
        Interstate: 18% IGST
        """
        gst_rate = 0.18
        tax_amount = round(amount_inr * gst_rate, 2)
        total_inr = round(amount_inr + tax_amount, 2)

        if is_interstate:
            tax_breakdown = {"igst": tax_amount, "cgst": 0.0, "sgst": 0.0}
        else:
            tax_breakdown = {
                "cgst": round(tax_amount / 2, 2),
                "sgst": round(tax_amount / 2, 2),
                "igst": 0.0
            }

        return {
            "subtotalINR": amount_inr,
            "taxRatePercent": 18.0,
            "taxAmountINR": tax_amount,
            "totalINR": total_inr,
            "taxBreakdown": tax_breakdown
        }

    @staticmethod
    def change_plan(company_id: str, plan_id: str, billing_cycle: str = "monthly") -> Dict[str, Any]:
        company = db.companies.get(company_id)
        if not company:
            raise ValueError(f"Company {company_id} not found")

        plan = next((p for p in PLANS_CATALOG if p["id"] == plan_id), None)
        if not plan:
            raise ValueError(f"Plan {plan_id} not recognized")

        base_price = plan["priceMonthlyINR"] if billing_cycle == "monthly" else plan["priceAnnualINR"]
        invoice_calc = BillingService.calculate_gst_invoice(base_price)

        company["planId"] = plan_id
        company["billingCycle"] = billing_cycle

        # Generate Invoice record
        invoice_id = f"inv-{company_id}-{int(time.time())}"
        new_invoice = {
            "id": invoice_id,
            "companyId": company_id,
            "invoiceNumber": f"INV-{time.strftime('%Y%m')}-{int(time.time()) % 10000}",
            "date": time.strftime("%Y-%m-%d"),
            "amountINR": invoice_calc["totalINR"],
            "planName": plan["name"],
            "status": "paid",
            "taxAmountINR": invoice_calc["taxAmountINR"],
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }
        db.invoices[invoice_id] = new_invoice

        return {
            "success": True,
            "company": company,
            "invoice": new_invoice,
            "pricing": invoice_calc
        }

    @staticmethod
    def get_invoices_for_company(company_id: str) -> List[Dict[str, Any]]:
        """Returns all invoices associated with a tenant company, sorted newest first."""
        invoices = [inv for inv in db.invoices.values() if inv.get("companyId") == company_id]
        invoices.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
        return invoices
