import React from 'react';
import { X, Printer, Sparkles, CheckCircle2 } from 'lucide-react';
import { Invoice, Company } from '../../types';

interface InvoiceModalProps {
  invoice: Invoice | null;
  company: Company;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ invoice, company, onClose }) => {
  if (!invoice) return null;

  const gstAmount = Math.round(invoice.amountINR * 0.18);
  const netAmount = invoice.amountINR - gstAmount;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-8 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 sm:pb-6 border-b border-slate-200">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Tax Invoice Receipt</h3>
              <p className="text-[11px] sm:text-xs text-slate-500">Agent-as-a-Service Platform (India) Pvt Ltd</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Meta */}
        <div className="py-6 space-y-4 text-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Billed To</p>
              <h4 className="font-bold text-slate-900 text-sm">{company.name}</h4>
              <p className="text-slate-500">{company.domain}</p>
              <p className="text-slate-400 font-mono text-[11px]">GSTIN: 27AABCT8842K1ZM</p>
            </div>

            <div className="text-right">
              <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Invoice No.</p>
              <p className="font-mono font-bold text-slate-900">{invoice.number}</p>
              <p className="text-slate-500 mt-1">Date: {invoice.date}</p>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-1">
                <CheckCircle2 className="w-3 h-3" /> Paid in Full
              </span>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5">
            <div className="flex justify-between font-bold text-slate-700 pb-2 border-b border-slate-200">
              <span>Description</span>
              <span>Amount (INR)</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>{invoice.planName} (Single Production Agent)</span>
              <span className="font-mono">₹{netAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>Integrated GST (18%)</span>
              <span className="font-mono">₹{gstAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200 text-sm">
              <span>Total Paid</span>
              <span className="font-mono text-indigo-600">₹{invoice.amountINR.toLocaleString()}</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 space-y-0.5">
            <p>Payment Method: Pre-authorized Corporate Card (•••• 4242)</p>
            <p>SAC Code: 998314 (Information Technology Software Services)</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
