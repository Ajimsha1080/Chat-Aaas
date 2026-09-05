import React, { useState } from 'react';
import { 
  CreditCard, 
  Check, 
  Download, 
  CheckCircle2 
} from 'lucide-react';
import { useApp } from '../../context';
import { SubscriptionPlanId, Invoice } from '../../types';
import confetti from 'canvas-confetti';
import { InvoiceModal } from '../common/InvoiceModal';

export const BillingView: React.FC = () => {
  const { 
    currentCompany, 
    allPlans, 
    currentPlan, 
    upgradeSubscription, 
    invoices 
  } = useApp();

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(currentCompany.billingCycle || 'monthly');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const stats = currentCompany.stats;
  const messagesUsage = Math.min(100, Math.round((stats.messagesThisMonth / currentPlan.maxConversationsMonth) * 100));
  const docsUsage = Math.min(100, Math.round((stats.knowledgeChunksUsed / currentPlan.maxKnowledgeDocs) * 100));

  const handlePlanUpgrade = (planId: SubscriptionPlanId) => {
    upgradeSubscription(planId, billingCycle);
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Subscription & Usage Billing</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your company's rented single AI agent subscription tier, live limits, and billing invoices.
          </p>
        </div>

        {/* Monthly / Annual Billing Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              billingCycle === 'annual' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Annual (Save 20%)</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full">
              -20%
            </span>
          </button>
        </div>
      </div>

      {/* Current Subscription Status & Usage Meters */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Current Active Plan</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                Active & In Good Standing
              </span>
            </div>
            <h2 className="text-2xl font-black text-white mt-1 flex items-center gap-3">
              <span>{currentPlan.name} Plan</span>
              <span className="text-sm font-normal text-slate-400">
                (₹{billingCycle === 'annual' ? currentPlan.priceAnnualINR.toLocaleString() : currentPlan.priceMonthlyINR.toLocaleString()} / month)
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              {currentPlan.description}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[11px] text-slate-400">Next Renewal Date</p>
              <p className="text-xs font-bold text-white">30 Sep 2026</p>
            </div>
          </div>
        </div>

        {/* Live Usage Breakdown Meters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
          {/* Meter 1: Monthly Messages */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 font-medium">Monthly Conversations / Usage:</span>
              <span className="font-bold text-white font-mono">
                {stats.messagesThisMonth.toLocaleString()} / {currentPlan.maxConversationsMonth.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${messagesUsage > 80 ? 'bg-rose-500' : 'bg-indigo-500'}`} 
                style={{ width: `${messagesUsage}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">{100 - messagesUsage}% quota remaining</span>
          </div>

          {/* Meter 2: Knowledge Base Chunks */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 font-medium">Knowledge Docs Limit:</span>
              <span className="font-bold text-white font-mono">
                {stats.knowledgeChunksUsed} / {currentPlan.maxKnowledgeDocs} docs
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full bg-blue-500 transition-all" 
                style={{ width: `${docsUsage}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Vector chunk indexing capacity</span>
          </div>

          {/* Meter 3: Production Agents */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 font-medium">Rented AI Agents:</span>
              <span className="font-bold text-emerald-400 font-mono">1 / 1 Dedicated</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: '100%' }} />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Strict single-agent deployment</span>
          </div>
        </div>
      </div>

      {/* Subscription Plans Pricing Matrix */}
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-4">Choose Your Rented Agent Plan</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {allPlans.map(plan => {
            const isCurrent = plan.id === currentCompany.planId;
            const price = billingCycle === 'annual' ? plan.priceAnnualINR : plan.priceMonthlyINR;

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'border-indigo-600 ring-2 ring-indigo-600 shadow-md'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-slate-900">{plan.name}</h3>
                    {plan.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                        {plan.badge}
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                        Current
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 mb-4 leading-relaxed min-h-[32px]">
                    {plan.description}
                  </p>

                  <div className="mb-4">
                    <div className="flex items-baseline">
                      <span className="text-2xl font-black text-slate-900">₹{price.toLocaleString()}</span>
                      <span className="text-xs text-slate-500 ml-1">/ month</span>
                    </div>
                    {billingCycle === 'annual' && (
                      <span className="text-[10px] text-emerald-600 font-semibold">Billed annually (₹{(price * 12).toLocaleString()}/yr)</span>
                    )}
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-2 text-xs border-t border-slate-100 pt-4 mb-6">
                    {plan.features.map((f, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2 text-slate-700">
                        <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                        <span className="text-[11px] leading-snug">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handlePlanUpgrade(plan.id)}
                  disabled={isCurrent}
                  className={`w-full py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                    isCurrent
                      ? 'bg-slate-100 text-slate-400 cursor-default'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {isCurrent ? 'Current Plan' : `Switch to ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoices History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-bold text-slate-900">Billing History & GST Invoices</h3>
          </div>
          <span className="text-xs text-slate-500">Auto-generated receipts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase">
                <th className="pb-3">Invoice ID</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Plan Details</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="py-3 font-mono font-semibold text-slate-900">{inv.number}</td>
                  <td className="py-3 text-slate-500">{inv.date}</td>
                  <td className="py-3 font-medium text-slate-800">{inv.planName}</td>
                  <td className="py-3 font-bold font-mono">₹{inv.amountINR.toLocaleString()}</td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Paid
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>PDF Receipt</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Printable GST Tax Invoice Receipt Modal */}
      <InvoiceModal 
        invoice={selectedInvoice} 
        company={currentCompany} 
        onClose={() => setSelectedInvoice(null)} 
      />
    </div>
  );
};
