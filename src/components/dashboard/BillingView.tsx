import React, { useState } from 'react';
import { 
  CreditCard, 
  Check, 
  Sparkles, 
  Download, 
  ArrowUpRight, 
  Clock, 
  ShieldCheck, 
  FileText, 
  ChevronRight,
  Zap,
  Building
} from 'lucide-react';
import { useApp } from '../../context';
import { InvoiceModal } from '../common/InvoiceModal';

export const BillingView: React.FC = () => {
  const { 
    currentCompany, 
    allPlans, 
    upgradeSubscription, 
    invoices, 
    showToast,
    conversations,
    knowledgeItems,
    teamMembers
  } = useApp();

  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly');

  const currentPlanTier = (currentCompany?.planId as any) || 'growth';
  const planInfo: any = allPlans?.find(p => p.id === currentPlanTier) || {
    id: 'growth',
    name: 'Growth Plan',
    priceMonthlyINR: 149,
    maxConversationsMonth: 5000,
    maxKnowledgeDocs: 100,
    features: ['5,000 monthly inquiries', '100 knowledge sources', 'Website widget & REST API', 'Priority email support', 'Custom brand styling']
  };

  const totalConvs = (conversations || []).length || 420;
  const totalDocs = (knowledgeItems || []).length || 8;
  const totalSeats = (teamMembers || []).length || 3;

  const maxConvs = planInfo.maxConversationsMonth || 5000;
  const maxDocs = planInfo.maxKnowledgeDocs || 100;

  const convPercent = Math.min(100, Math.round((totalConvs / maxConvs) * 100));
  const docPercent = Math.min(100, Math.round((totalDocs / maxDocs) * 100));

  const handleSelectPlan = (planId: string) => {
    if (planId === currentPlanTier) return;
    upgradeSubscription(planId as any, billingCycle === 'annually' ? 'annual' : 'monthly');
    showToast('Subscription Updated', `Switched to ${planId.toUpperCase()} plan.`, 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Billing & Plans</h1>
              <span className="text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Active Subscription
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage your company plan, usage quotas, payment method, and billing invoices.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Billing Cycle:</span>
          <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annually')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                billingCycle === 'annually' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500'
              }`}
            >
              Annually (Save 20%)
            </button>
          </div>
        </div>
      </div>

      {/* Usage Quotas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Conversations Meter */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Monthly Inquiries</span>
            <span className="text-xs font-bold text-indigo-600">{convPercent}% used</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalConvs.toLocaleString()}</span>
            <span className="text-xs text-slate-500 font-medium">/ {maxConvs.toLocaleString()} limit</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-full rounded-full transition-all"
              style={{ width: `${convPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500">Resets on the 1st of next month</p>
        </div>

        {/* Knowledge Sources Meter */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Knowledge Sources</span>
            <span className="text-xs font-bold text-indigo-600">{docPercent}% used</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalDocs}</span>
            <span className="text-xs text-slate-500 font-medium">/ {maxDocs} sources</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-full rounded-full transition-all"
              style={{ width: `${docPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500">Websites, documents, and FAQs</p>
        </div>

        {/* Team Seats */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Operator Seats</span>
            <span className="text-xs font-bold text-emerald-600">Active</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalSeats}</span>
            <span className="text-xs text-slate-500 font-medium">/ 10 seats included</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: `${(totalSeats / 10) * 100}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500">Invite additional operators anytime</p>
        </div>
      </div>

      {/* Subscription Plans Tier Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Available Subscription Plans</h3>
          <p className="text-xs sm:text-sm text-slate-500">Scale your assistant as your customer inquiry volume grows.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Starter Plan */}
          <div className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
            currentPlanTier === 'starter' 
              ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/20' 
              : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-base">Starter</h4>
                {currentPlanTier === 'starter' && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                    Current
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-slate-900">$49</span>
                <span className="text-xs text-slate-500">/ month</span>
              </div>
              <p className="text-xs text-slate-500">Ideal for early-stage companies and small service teams.</p>
              <ul className="space-y-2 text-xs text-slate-700 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> 1,000 monthly inquiries</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> 20 knowledge sources</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Embeddable website widget</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Standard response speeds</li>
              </ul>
            </div>

            <button
              onClick={() => handleSelectPlan('starter')}
              disabled={currentPlanTier === 'starter'}
              className={`w-full mt-6 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                currentPlanTier === 'starter'
                  ? 'bg-slate-100 text-slate-400 cursor-default'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {currentPlanTier === 'starter' ? 'Current Plan' : 'Downgrade to Starter'}
            </button>
          </div>

          {/* Growth Plan */}
          <div className={`p-6 rounded-2xl border transition-all flex flex-col justify-between relative ${
            currentPlanTier === 'growth' 
              ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/20' 
              : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
              Most Popular
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-base">Growth</h4>
                {currentPlanTier === 'growth' && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                    Current
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-slate-900">$149</span>
                <span className="text-xs text-slate-500">/ month</span>
              </div>
              <p className="text-xs text-slate-500">Comprehensive autonomous support for growing businesses.</p>
              <ul className="space-y-2 text-xs text-slate-700 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> 5,000 monthly inquiries</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> 100 knowledge sources</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Website, React, & REST API</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Human operator takeover inbox</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Custom branding & styling</li>
              </ul>
            </div>

            <button
              onClick={() => handleSelectPlan('growth')}
              disabled={currentPlanTier === 'growth'}
              className={`w-full mt-6 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                currentPlanTier === 'growth'
                  ? 'bg-indigo-600 text-white cursor-default'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {currentPlanTier === 'growth' ? 'Current Active Plan' : 'Select Growth'}
            </button>
          </div>

          {/* Enterprise Plan */}
          <div className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
            currentPlanTier === 'enterprise' 
              ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/20' 
              : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-base">Enterprise</h4>
                {currentPlanTier === 'enterprise' && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                    Current
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-slate-900">$399</span>
                <span className="text-xs text-slate-500">/ month</span>
              </div>
              <p className="text-xs text-slate-500">Dedicated capacity, custom SLA guarantees, and enterprise compliance.</p>
              <ul className="space-y-2 text-xs text-slate-700 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> 25,000 monthly inquiries</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Unlimited knowledge sources</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> 99.9% Uptime SLA commitment</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Dedicated account manager</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> SOC2 & HIPAA compliant storage</li>
              </ul>
            </div>

            <button
              onClick={() => handleSelectPlan('enterprise')}
              disabled={currentPlanTier === 'enterprise'}
              className={`w-full mt-6 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                currentPlanTier === 'enterprise'
                  ? 'bg-slate-100 text-slate-400 cursor-default'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {currentPlanTier === 'enterprise' ? 'Current Plan' : 'Upgrade to Enterprise'}
            </button>
          </div>
        </div>
      </div>

      {/* Payment Method & Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Method Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Payment Method</h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Default
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-7 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-[10px]">
                VISA
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Visa ending in 4242</p>
                <p className="text-[11px] text-slate-500">Expires 08 / 2028</p>
              </div>
            </div>
            <button
              onClick={() => showToast('Payment Details', 'Payment method is managed via Stripe Customer Portal.', 'info')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              Edit
            </button>
          </div>

          <p className="text-[11px] text-slate-500">
            Invoices are billed on the 1st of every month. All payments are secured via Stripe 256-bit encryption.
          </p>
        </div>

        {/* Invoices List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Billing History & Invoices</h3>
              <p className="text-xs text-slate-500">Download past tax receipts and PDF statements</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {(invoices || [
              { id: 'INV-2026-08', date: 'Aug 01, 2026', amount: 149, status: 'paid', description: 'Growth Plan — Monthly' },
              { id: 'INV-2026-07', date: 'Jul 01, 2026', amount: 149, status: 'paid', description: 'Growth Plan — Monthly' },
              { id: 'INV-2026-06', date: 'Jun 01, 2026', amount: 149, status: 'paid', description: 'Growth Plan — Monthly' }
            ]).map((inv: any) => (
              <div key={inv.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{inv.id}</p>
                    <p className="text-[11px] text-slate-500">{inv.date} · {inv.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-slate-900">${inv.amount}.00</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-200 uppercase">
                    Paid
                  </span>
                  <button
                    onClick={() => setSelectedInvoice(inv)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="View & Download Invoice"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      {selectedInvoice && (
        <InvoiceModal
          invoice={selectedInvoice}
          company={currentCompany}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
};
