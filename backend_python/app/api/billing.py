from fastapi import APIRouter, HTTPException, Depends, Request, Header
from pydantic import BaseModel
from typing import Optional
from app.services.billing_service import BillingService
from app.services.payment_service import PaymentService
from app.services.usage_service import UsageService
from app.services.audit_service import AuditService
from app.core.tenant import TenantContext, get_tenant_context
from app.core.permissions import has_permission

router = APIRouter(prefix="/billing", tags=["Billing & Subscriptions"])

class UpgradePlanRequest(BaseModel):
    planId: str
    billingCycle: Optional[str] = "monthly"

class CheckoutRequest(BaseModel):
    planId: str
    billingCycle: Optional[str] = "monthly"
    customerEmail: Optional[str] = None

@router.get("/plans")
def get_plans():
    return {"status": 200, "data": {"plans": BillingService.get_plans()}}

@router.post("/checkout")
def create_subscription_checkout(req: CheckoutRequest, ctx: TenantContext = Depends(get_tenant_context)):
    """Creates a Razorpay Subscription order for tenant checkout."""
    if not has_permission(ctx.role, "billing:manage"):
        raise HTTPException(status_code=403, detail="Forbidden: Only owners/admins can change subscriptions.")

    try:
        order = PaymentService.create_subscription_order(
            company_id=ctx.company_id,
            plan_id=req.planId,
            billing_cycle=req.billingCycle or "monthly",
            customer_email=req.customerEmail
        )
        return {"status": 200, "data": order}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/webhook")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None, alias="X-Razorpay-Signature")
):
    """
    Handles Razorpay subscription lifecycle webhooks with HMAC-SHA256 signature verification.
    """
    if not x_razorpay_signature:
        raise HTTPException(status_code=400, detail="Missing X-Razorpay-Signature header.")

    payload_bytes = await request.body()
    try:
        res = PaymentService.process_webhook_event(payload_bytes, x_razorpay_signature)
        return {"status": 200, "data": res}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Webhook processing error: {str(e)}")

@router.get("/entitlements")
def get_entitlements(ctx: TenantContext = Depends(get_tenant_context)):
    """Retrieves tenant plan entitlements, limits, and feature access flags."""
    entitlements = PaymentService.get_tenant_entitlements(ctx.company_id)
    return {"status": 200, "data": entitlements}

@router.post("/upgrade")
def upgrade_plan(req: UpgradePlanRequest, ctx: TenantContext = Depends(get_tenant_context)):
    if not has_permission(ctx.role, "billing:manage"):
        raise HTTPException(status_code=403, detail="Forbidden: Only owners/admins can change subscriptions.")

    try:
        checkout_order = PaymentService.create_subscription_order(
            company_id=ctx.company_id,
            plan_id=req.planId,
            billing_cycle=req.billingCycle or "monthly"
        )
        AuditService.log(
            company_id=ctx.company_id,
            actor=ctx.user_id,
            actor_role=ctx.role,
            action="SUBSCRIPTION_CHECKOUT_INITIATED",
            details=f"Initiated checkout for {req.planId.upper()} ({req.billingCycle})"
        )
        return {"status": 200, "data": checkout_order}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/usage")
def get_usage(ctx: TenantContext = Depends(get_tenant_context)):
    summary = UsageService.get_tenant_summary(ctx.company_id)
    quota = UsageService.check_monthly_quota(ctx.company_id)
    return {
        "status": 200,
        "data": {
            "usage": summary,
            "quota": quota
        }
    }

@router.get("/invoices")
def get_invoices(ctx: TenantContext = Depends(get_tenant_context)):
    invoices = BillingService.get_invoices_for_company(ctx.company_id)
    return {"status": 200, "data": {"invoices": invoices}}


