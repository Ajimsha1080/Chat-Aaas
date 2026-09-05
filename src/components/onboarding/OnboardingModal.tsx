import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  ArrowRight, 
  ArrowLeft,
  Bot,
  Building2,
  Zap,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../../context';
import { AgentTone, SubscriptionPlanId } from '../../types';
import confetti from 'canvas-confetti';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const { createCompanyWorkspace, allPlans, setCurrentTab } = useApp();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [companyName, setCompanyName] = useState('');
  const [domain, setDomain] = useState('');
  const [industry, setIndustry] = useState('SaaS & Cloud Software');
  const [agentName, setAgentName] = useState('');
  const [agentRole, setAgentRole] = useState('Customer Support Specialist');
  const [agentTone, setAgentTone] = useState<AgentTone>('professional');
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([
    'faq_answers',
    'lead_qualification',
    'order_lookup',
    'human_handoff'
  ]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanId>('growth');

  if (!isOpen) return null;

  const toggleCapability = (capId: string) => {
    setSelectedCapabilities(prev => 
      prev.includes(capId) ? prev.filter(c => c !== capId) : [...prev, capId]
    );
  };

  const handleFinish = () => {
    const finalAgentName = agentName || `${companyName ? companyName.split(' ')[0] : 'Nova'} AI`;
    createCompanyWorkspace(
      companyName || 'Acme Global Corp',
      domain || `${(companyName || 'acme').toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      industry,
      selectedPlan,
      finalAgentName,
      agentTone
    );

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 }
    });

    onClose();
    setCurrentTab('overview');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Hire Your AI Employee</h3>
              <p className="text-xs text-slate-500">Deploy a production-ready AI employee in 4 easy steps</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="px-6 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  step === s ? 'w-8 bg-indigo-600' : step > s ? 'w-4 bg-emerald-500' : 'w-4 bg-slate-200'
                }`}
              />
            ))}
          </div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Step {step} of 4
          </span>
        </div>

        {/* Step Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4 text-xs animate-in fade-in">
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">Tell us about your company</h4>
                <p className="text-slate-500">Your AI employee will use this context for grounded answers.</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Cloud Corp"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Company Website</label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="e.g. acmecloud.io"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Industry Sector</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="SaaS & Cloud Software">SaaS & Cloud Software</option>
                  <option value="Healthcare & Diagnostics">Healthcare & Diagnostics</option>
                  <option value="E-commerce & Retail">E-commerce & Retail</option>
                  <option value="Fintech & Banking">Fintech & Banking</option>
                  <option value="Logistics & Supply Chain">Logistics & Supply Chain</option>
                  <option value="Professional Services">Professional Services</option>
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 text-xs animate-in fade-in">
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">Give your AI Employee an Identity</h4>
                <p className="text-slate-500">Define their name, job role, and customer-facing persona.</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">AI Employee Name</label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder={`e.g. ${companyName ? companyName.split(' ')[0] : 'Nova'} Support`}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Job Role</label>
                <select
                  value={agentRole}
                  onChange={(e) => setAgentRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                >
                  <option value="Customer Support Specialist">Customer Support Specialist (24/7 resolution & ticket routing)</option>
                  <option value="Sales & Lead Concierge">Sales & Lead Concierge (Product recommendations & booking)</option>
                  <option value="Technical Operations Assistant">Technical Operations Assistant (Troubleshooting & docs)</option>
                  <option value="Executive Concierge">Executive Concierge (General inquiry management)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Communication Tone</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'professional', label: 'Professional', desc: 'Formal, precise, corporate' },
                    { id: 'empathetic', label: 'Empathetic', desc: 'Warm, supportive, reassuring' },
                    { id: 'technical', label: 'Technical', desc: 'Concise, code & logs ready' },
                    { id: 'friendly', label: 'Friendly', desc: 'Approachable and upbeat' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setAgentTone(t.id as AgentTone)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        agentTone === t.id
                          ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600 font-bold'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-xs text-slate-900">{t.label}</p>
                      <p className="text-[10px] text-slate-500 font-normal">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 text-xs animate-in fade-in">
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">Select Capabilities</h4>
                <p className="text-slate-500">Choose what your AI employee is authorized to handle autonomously.</p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {[
                  {
                    id: 'faq_answers',
                    title: 'Answer FAQs & Knowledge Queries',
                    desc: 'Instantly answer customer questions with strict hallucination safeguards.',
                    icon: Sparkles
                  },
                  {
                    id: 'lead_qualification',
                    title: 'Qualify Leads & Capture Contact Info',
                    desc: 'Collect email, phone number, and intent before escalating or booking.',
                    icon: Zap
                  },
                  {
                    id: 'order_lookup',
                    title: 'Order & Account Status Lookup',
                    desc: 'Fetch live customer order and shipment status via connected tools.',
                    icon: Building2
                  },
                  {
                    id: 'human_handoff',
                    title: 'Human Escalation & Live Transfer',
                    desc: 'Seamlessly transfer complex inquiries to human agents in the Inbox.',
                    icon: ShieldCheck
                  }
                ].map(cap => {
                  const Icon = cap.icon;
                  const isSelected = selectedCapabilities.includes(cap.id);
                  return (
                    <button
                      key={cap.id}
                      type="button"
                      onClick={() => toggleCapability(cap.id)}
                      className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600' 
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-900 text-xs">{cap.title}</p>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 ml-2" />}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{cap.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 text-xs animate-in fade-in">
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">Choose Subscription Tier</h4>
                <p className="text-slate-500">All plans include 1 AI Employee with full knowledge indexing.</p>
              </div>

              <div className="space-y-2.5">
                {allPlans.slice(0, 3).map(p => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlan(p.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                      selectedPlan === p.id
                        ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{p.name}</span>
                        {p.badge && (
                          <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full font-bold">
                            {p.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{p.description}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-slate-900">₹{p.priceMonthlyINR.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400 block">/ month</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep((step - 1) as any)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={() => {
                if (!companyName.trim()) {
                  setCompanyName('New Horizon Technologies');
                }
                setStep((step + 1) as any);
              }}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Deploy AI Employee</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
