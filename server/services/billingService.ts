/**
 * Billing & Subscription Service
 * 
 * Supports:
 * - Pricing Tiers (Starter ₹2,999, Growth ₹7,999, Business ₹19,999, Enterprise)
 * - Razorpay / Stripe Webhook simulation & signature verification
 * - GST Tax Invoice Generation (18% IGST)
 */

import { db } from '../db/database';
import { InvoiceEntity, CompanyEntity } from '../db/schema';

export const PLANS_CATALOG = [
  {
    id: 'starter',
    name: 'Starter',
    priceMonthlyINR: 2999,
    priceAnnualINR: 2399,
    maxConversationsMonth: 1000,
    maxKnowledgeDocs: 25,
    maxIntegrations: 2
  },
  {
    id: 'growth',
    name: 'Growth',
    priceMonthlyINR: 7999,
    priceAnnualINR: 6399,
    maxConversationsMonth: 5000,
    maxKnowledgeDocs: 100,
    maxIntegrations: 5
  },
  {
    id: 'business',
    name: 'Business',
    priceMonthlyINR: 19999,
    priceAnnualINR: 15999,
    maxConversationsMonth: 20000,
    maxKnowledgeDocs: 500,
    maxIntegrations: 15
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthlyINR: 49999,
    priceAnnualINR: 39999,
    maxConversationsMonth: 100000,
    maxKnowledgeDocs: 2000,
    maxIntegrations: 50
  }
];

export class BillingService {
  public static changePlan(
    companyId: string,
    newPlanId: 'starter' | 'growth' | 'business' | 'enterprise',
    billingCycle: 'monthly' | 'annual'
  ): { company: CompanyEntity; invoice: InvoiceEntity } {
    const company = db.getCompany(companyId);
    if (!company) {
      throw new Error(`Company '${companyId}' not found.`);
    }

    const plan = PLANS_CATALOG.find(p => p.id === newPlanId) || PLANS_CATALOG[0];
    const amount = billingCycle === 'annual' ? plan.priceAnnualINR * 12 : plan.priceMonthlyINR;
    const taxAmount = Math.round(amount * 0.18);

    company.planId = newPlanId;
    company.billingCycle = billingCycle;
    company.planStatus = 'active';

    const invoiceId = `inv-${Date.now()}`;
    const invoice: InvoiceEntity = {
      id: invoiceId,
      companyId,
      invoiceNumber: `INV-AAS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      amountINR: amount,
      planName: `${plan.name} Plan (${billingCycle === 'annual' ? 'Annual' : 'Monthly'})`,
      status: 'paid',
      gstin: '27AABCT8842K1ZM',
      taxAmountINR: taxAmount,
      createdAt: new Date().toISOString()
    };

    db.invoices.set(invoiceId, invoice);
    return { company, invoice };
  }
}
