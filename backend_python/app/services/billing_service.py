import re
import time
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.db.database import db
from app.services.storage_service import StorageService

GSTIN_REGEX = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")

# Indian State & Union Territory GST Codes
INDIAN_GST_STATE_CODES = {
    "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
    "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan",
    "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
    "13": "Nagaland", "14": "Manipur", "15": "Mizoram", "16": "Tripura",
    "17": "Meghalaya", "18": "Assam", "19": "West Bengal", "20": "Jharkhand",
    "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
    "26": "Dadra and Nagar Haveli and Daman and Diu", "27": "Maharashtra", "28": "Andhra Pradesh (Old)",
    "29": "Karnataka", "30": "Goa", "31": "Lakshadweep", "32": "Kerala",
    "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman and Nicobar Islands",
    "36": "Telangana", "37": "Andhra Pradesh (New)", "38": "Ladakh"
}

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

_INVOICE_SEQUENCE_COUNTER = 1001

class BillingService:
    @staticmethod
    def validate_gstin(gstin: Optional[str]) -> bool:
        """Validates 15-character Indian Goods and Services Tax Identification Number."""
        if not gstin or not isinstance(gstin, str):
            return False
        gstin_clean = gstin.strip().upper()
        if not GSTIN_REGEX.match(gstin_clean):
            return False
        state_code = gstin_clean[:2]
        return state_code in INDIAN_GST_STATE_CODES

    @staticmethod
    def extract_state_code(gstin: Optional[str]) -> Optional[str]:
        """Extracts the 2-digit state code from a valid GSTIN."""
        if gstin and BillingService.validate_gstin(gstin):
            return gstin.strip()[:2]
        return None

    @staticmethod
    def generate_invoice_number() -> str:
        """Generates a monotonically increasing sequence number formatted as INV-YYYYMM-XXXX."""
        global _INVOICE_SEQUENCE_COUNTER
        month_str = time.strftime("%Y%m")
        seq = _INVOICE_SEQUENCE_COUNTER
        _INVOICE_SEQUENCE_COUNTER += 1
        return f"INV-{month_str}-{seq:04d}"

    @staticmethod
    def get_plans() -> List[Dict[str, Any]]:
        plans_map = getattr(db, "subscription_plans", None)
        if plans_map and len(plans_map) > 0:
            return list(plans_map.values())
        return PLANS_CATALOG

    @staticmethod
    def update_plan_price(plan_id: str, price_monthly_inr: int, price_annual_inr: Optional[int] = None) -> Dict[str, Any]:
        if not getattr(db, "subscription_plans", None):
            db.subscription_plans = {p["id"]: dict(p) for p in PLANS_CATALOG}
        if plan_id not in db.subscription_plans:
            raise ValueError(f"Plan '{plan_id}' not found.")
        
        plan = db.subscription_plans[plan_id]
        plan["priceMonthlyINR"] = price_monthly_inr
        if price_annual_inr is not None:
            plan["priceAnnualINR"] = price_annual_inr
        else:
            plan["priceAnnualINR"] = price_monthly_inr * 10
        
        for p in PLANS_CATALOG:
            if p["id"] == plan_id:
                p["priceMonthlyINR"] = plan["priceMonthlyINR"]
                p["priceAnnualINR"] = plan["priceAnnualINR"]
                break
        
        db.save_state()
        return plan

    @staticmethod
    def calculate_gst_invoice(
        amount_inr: float,
        is_interstate: bool = False,
        buyer_gstin: Optional[str] = None,
        buyer_state_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calculates statutory 18% Indian GST for IT Software Services (SAC 998313):
        - Intrastate (Karnataka -> Karnataka): 9% CGST + 9% SGST
        - Interstate (Karnataka -> Other States/UTs): 18% IGST
        """
        supplier_state = getattr(settings, "SUPPLIER_STATE_CODE", "29")
        
        # If buyer state or GSTIN is supplied, resolve interstate dynamically
        if buyer_gstin and BillingService.validate_gstin(buyer_gstin):
            resolved_buyer_state = buyer_gstin.strip()[:2]
            is_interstate = (resolved_buyer_state != supplier_state)
        elif buyer_state_code:
            is_interstate = (str(buyer_state_code).zfill(2) != supplier_state)

        gst_rate = 0.18
        tax_amount = round(amount_inr * gst_rate, 2)
        total_inr = round(amount_inr + tax_amount, 2)

        if is_interstate:
            tax_breakdown = {
                "igstRatePercent": 18.0,
                "igstAmountINR": tax_amount,
                "cgstRatePercent": 0.0,
                "cgstAmountINR": 0.0,
                "sgstRatePercent": 0.0,
                "sgstAmountINR": 0.0,
                "igst": tax_amount,
                "cgst": 0.0,
                "sgst": 0.0
            }
        else:
            half_tax = round(tax_amount / 2, 2)
            tax_breakdown = {
                "igstRatePercent": 0.0,
                "igstAmountINR": 0.0,
                "cgstRatePercent": 9.0,
                "cgstAmountINR": half_tax,
                "sgstRatePercent": 9.0,
                "sgstAmountINR": half_tax,
                "cgst": half_tax,
                "sgst": half_tax,
                "igst": 0.0
            }

        return {
            "subtotalINR": amount_inr,
            "taxRatePercent": 18.0,
            "taxAmountINR": tax_amount,
            "totalINR": total_inr,
            "sacCode": getattr(settings, "DEFAULT_SAC_CODE", "998313"),
            "supplierGstin": getattr(settings, "SUPPLIER_GSTIN", "29AABCU9603R1ZM"),
            "supplierLegalName": getattr(settings, "SUPPLIER_LEGAL_NAME", "CoarAI Technologies Private Limited"),
            "supplierStateCode": supplier_state,
            "buyerGstin": buyer_gstin,
            "isInterstate": is_interstate,
            "taxBreakdown": tax_breakdown
        }

    @staticmethod
    def change_plan(
        company_id: str,
        plan_id: str,
        billing_cycle: str = "monthly",
        buyer_gstin: Optional[str] = None
    ) -> Dict[str, Any]:
        company = db.companies.get(company_id)
        if not company:
            raise ValueError(f"Company {company_id} not found")

        plan = next((p for p in PLANS_CATALOG if p["id"] == plan_id), None)
        if not plan:
            raise ValueError(f"Plan {plan_id} not recognized")

        base_price = plan["priceMonthlyINR"] if billing_cycle == "monthly" else plan["priceAnnualINR"]
        
        # Determine buyer GSTIN from argument or company settings
        company_settings = company.get("settings", {})
        effective_gstin = buyer_gstin or company_settings.get("gstin")
        invoice_calc = BillingService.calculate_gst_invoice(base_price, buyer_gstin=effective_gstin)

        company["planId"] = plan_id
        company["billingCycle"] = billing_cycle

        # Generate Invoice record
        invoice_id = f"inv-{company_id}-{int(time.time() * 1000)}"
        invoice_number = BillingService.generate_invoice_number()
        
        new_invoice = {
            "id": invoice_id,
            "companyId": company_id,
            "invoiceNumber": invoice_number,
            "date": time.strftime("%Y-%m-%d"),
            "amountINR": invoice_calc["totalINR"],
            "subtotalINR": invoice_calc["subtotalINR"],
            "taxAmountINR": invoice_calc["taxAmountINR"],
            "planName": plan["name"],
            "status": "paid",
            "sacCode": invoice_calc["sacCode"],
            "supplierGstin": invoice_calc["supplierGstin"],
            "buyerGstin": effective_gstin,
            "taxBreakdown": invoice_calc["taxBreakdown"],
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }
        db.invoices[invoice_id] = new_invoice

        # Durable snapshot
        try:
            snapshot_key = f"invoices/{invoice_id}.json"
            StorageService.upload_file(
                company_id=company_id,
                file_name=snapshot_key,
                content=str(new_invoice).encode("utf-8"),
                content_type="application/json"
            )
        except Exception:
            pass

        db.save_state()

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

