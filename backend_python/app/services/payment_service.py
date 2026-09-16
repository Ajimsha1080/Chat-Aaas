import os
import hmac
import hashlib
import json
import time
import logging
from typing import Dict, Any, Optional, List
from app.db.database import db
from app.services.billing_service import BillingService

logger = logging.getLogger(__name__)

PLAN_ENTITLEMENTS = {
    "starter": {
        "max_conversations": 1000,
        "max_documents": 10,
        "max_team_members": 2,
        "custom_tools": False,
        "semantic_reranking": False,
        "human_handoff": False,
        "custom_models": False,
        "crm_integrations": False,
        "priority_support": False,
        "analytics_retention_days": 30
    },
    "growth": {
        "max_conversations": 5000,
        "max_documents": 100,
        "max_team_members": 10,
        "custom_tools": True,
        "semantic_reranking": True,
        "human_handoff": False,
        "custom_models": False,
        "crm_integrations": True,
        "priority_support": True,
        "analytics_retention_days": 90
    },
    "business": {
        "max_conversations": 25000,
        "max_documents": 500,
        "max_team_members": 50,
        "custom_tools": True,
        "semantic_reranking": True,
        "human_handoff": True,
        "custom_models": True,
        "crm_integrations": True,
        "priority_support": True,
        "analytics_retention_days": 365
    }
}

class PaymentService:
    @staticmethod
    def get_razorpay_key_id() -> str:
        return os.getenv("RAZORPAY_KEY_ID", "rzp_test_mock_key")

    @staticmethod
    def get_razorpay_key_secret() -> str:
        return os.getenv("RAZORPAY_KEY_SECRET", "mock_secret")

    @staticmethod
    def get_webhook_secret() -> str:
        return os.getenv("RAZORPAY_WEBHOOK_SECRET", "coarai_razorpay_secret_123")

    @classmethod
    def verify_webhook_signature(cls, payload_bytes: bytes, signature: str) -> bool:
        secret = cls.get_webhook_secret()
        if not secret or not signature:
            return False
        try:
            expected_signature = hmac.new(
                secret.encode("utf-8"),
                payload_bytes,
                hashlib.sha256
            ).hexdigest()
            return hmac.compare_digest(expected_signature, signature)
        except Exception as e:
            logger.error(f"Error computing webhook signature: {e}")
            return False

    @classmethod
    def create_subscription_order(
        cls,
        company_id: str,
        plan_id: str,
        billing_cycle: str = "monthly",
        customer_email: Optional[str] = None
    ) -> Dict[str, Any]:
        company = db.companies.get(company_id)
        if not company:
            raise ValueError(f"Tenant company {company_id} not found.")

        plans = BillingService.get_plans()
        selected_plan = next((p for p in plans if p["id"] == plan_id), None)
        if not selected_plan:
            raise ValueError(f"Invalid plan ID: {plan_id}")

        base_price_inr = selected_plan["priceMonthlyINR"] if billing_cycle == "monthly" else selected_plan["priceAnnualINR"]
        pricing = BillingService.calculate_gst_invoice(base_price_inr)

        sub_id = f"sub_rzp_{company_id[:8]}_{int(time.time())}"
        
        return {
            "subscriptionId": sub_id,
            "keyId": cls.get_razorpay_key_id(),
            "companyId": company_id,
            "planId": plan_id,
            "planName": selected_plan["name"],
            "billingCycle": billing_cycle,
            "amountINR": pricing["totalINR"],
            "currency": "INR",
            "pricingBreakdown": pricing,
            "customerEmail": customer_email or f"admin@{company.get('slug', 'tenant')}.com",
            "notes": {
                "companyId": company_id,
                "planId": plan_id,
                "billingCycle": billing_cycle
            }
        }

    @classmethod
    def process_webhook_event(cls, payload_bytes: bytes, signature: str) -> Dict[str, Any]:
        if not cls.verify_webhook_signature(payload_bytes, signature):
            logger.warning("Rejected invalid Razorpay webhook signature.")
            raise ValueError("Invalid Razorpay webhook signature.")

        event_data = json.loads(payload_bytes.decode("utf-8"))
        event_type = event_data.get("event")
        payload = event_data.get("payload", {})
        
        logger.info(f"Processing Razorpay webhook event: {event_type}")

        if event_type in ["subscription.authenticated", "subscription.activated"]:
            return cls._handle_subscription_activated(payload)
        elif event_type in ["subscription.charged", "payment.captured", "invoice.paid"]:
            return cls._handle_subscription_charged(payload)
        elif event_type in ["subscription.pending", "subscription.halted"]:
            return cls._handle_subscription_halted(payload)
        elif event_type in ["subscription.cancelled"]:
            return cls._handle_subscription_cancelled(payload)
        else:
            return {"status": "ignored", "event": event_type}

    @classmethod
    def _handle_subscription_activated(cls, payload: Dict[str, Any]) -> Dict[str, Any]:
        subscription = payload.get("subscription", {}).get("entity", {})
        notes = subscription.get("notes", {})
        company_id = notes.get("companyId")
        plan_id = notes.get("planId", "growth")
        billing_cycle = notes.get("billingCycle", "monthly")

        if company_id and company_id in db.companies:
            company = db.companies[company_id]
            company["planId"] = plan_id
            company["billingCycle"] = billing_cycle
            company["planStatus"] = "active"
            company["subscriptionId"] = subscription.get("id")
            db.flush_durable_storage()
            return {"status": "success", "action": "subscription_activated", "companyId": company_id, "planId": plan_id}

        return {"status": "company_not_found", "companyId": company_id}

    @classmethod
    def _handle_subscription_charged(cls, payload: Dict[str, Any]) -> Dict[str, Any]:
        payment = payload.get("payment", {}).get("entity", {})
        subscription = payload.get("subscription", {}).get("entity", {})
        notes = payment.get("notes", {}) or subscription.get("notes", {})
        
        company_id = notes.get("companyId")
        plan_id = notes.get("planId", "starter")
        amount_paisa = payment.get("amount", 0)
        amount_inr = (amount_paisa / 100.0) if amount_paisa else 4999.0

        if company_id and company_id in db.companies:
            company = db.companies[company_id]
            company["planStatus"] = "active"

            gst_details = BillingService.calculate_gst_invoice(amount_inr / 1.18)
            invoice_id = f"inv-rzp-{company_id}-{int(time.time())}"
            invoice = {
                "id": invoice_id,
                "companyId": company_id,
                "invoiceNumber": f"INV-{time.strftime('%Y%m')}-{int(time.time()) % 10000}",
                "date": time.strftime("%Y-%m-%d"),
                "planName": f"{plan_id.capitalize()} Plan",
                "subtotalINR": gst_details["subtotalINR"],
                "taxRatePercent": 18.0,
                "taxAmountINR": gst_details["taxAmountINR"],
                "totalINR": round(amount_inr, 2),
                "taxBreakdown": gst_details["taxBreakdown"],
                "status": "paid",
                "paymentId": payment.get("id"),
                "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            }
            db.invoices[invoice_id] = invoice
            db.flush_durable_storage()
            return {"status": "success", "action": "invoice_generated", "invoiceId": invoice_id}

        return {"status": "company_not_found", "companyId": company_id}

    @classmethod
    def _handle_subscription_halted(cls, payload: Dict[str, Any]) -> Dict[str, Any]:
        subscription = payload.get("subscription", {}).get("entity", {})
        notes = subscription.get("notes", {})
        company_id = notes.get("companyId")

        if company_id and company_id in db.companies:
            db.companies[company_id]["planStatus"] = "past_due"
            db.flush_durable_storage()
            return {"status": "success", "action": "subscription_halted", "companyId": company_id}

        return {"status": "company_not_found", "companyId": company_id}

    @classmethod
    def _handle_subscription_cancelled(cls, payload: Dict[str, Any]) -> Dict[str, Any]:
        subscription = payload.get("subscription", {}).get("entity", {})
        notes = subscription.get("notes", {})
        company_id = notes.get("companyId")

        if company_id and company_id in db.companies:
            db.companies[company_id]["planStatus"] = "cancelled"
            db.flush_durable_storage()
            return {"status": "success", "action": "subscription_cancelled", "companyId": company_id}

        return {"status": "company_not_found", "companyId": company_id}

    @classmethod
    def check_feature_entitlement(cls, company_id: str, feature_key: str) -> bool:
        company = db.companies.get(company_id)
        if not company:
            return False

        if company.get("isSuspended"):
            return False

        plan_status = company.get("planStatus", "active")
        if plan_status in ["suspended", "past_due", "cancelled"]:
            return False

        plan_id = company.get("planId", "starter")
        entitlements = PLAN_ENTITLEMENTS.get(plan_id, PLAN_ENTITLEMENTS["starter"])
        return entitlements.get(feature_key, False)

    @classmethod
    def get_tenant_entitlements(cls, company_id: str) -> Dict[str, Any]:
        company = db.companies.get(company_id, {})
        plan_id = company.get("planId", "starter")
        plan_status = company.get("planStatus", "active")
        base = dict(PLAN_ENTITLEMENTS.get(plan_id, PLAN_ENTITLEMENTS["starter"]))
        base["companyId"] = company_id
        base["planId"] = plan_id
        base["planStatus"] = plan_status
        return base
