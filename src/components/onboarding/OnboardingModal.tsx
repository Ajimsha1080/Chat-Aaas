import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  ArrowRight, 
  ArrowLeft 
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

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [companyName, setCompanyName] = useState('');
  const [domain, setDomain] = useState('');
  const [industry, setIndustry] = useState('SaaS & Software');
  const [agentName, setAgentName] = useState('');
  const [agentTone, setAgentTone] = useState<AgentTone>('professional');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanId>('growth');

  if (!isOpen) return null;

  const handleFinish = () => {
    const finalAgentName = agentName || `${companyName} AI Assistant`;
    createCompanyWorkspace(
      companyName,
      domain || `${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      industry,
      selectedPlan,
      finalAgentName,
      agentTone
    );

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    onClose();
    setCurrentTab('my-agent');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Modal Header & Progress */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Create Company Workspace</h3>
              <p className="text-xs text-slate-500">Rent and deploy exactly ONE production AI agent</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Dots */}
        <div className="px-6 pt-4 flex items-center justify-center gap-2">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                step === s ? 'w-8 bg-indigo-600' : step > s ? 'w-4 bg-emerald-500' : 'w-4 bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4 text-xs animate-in fade-in">
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">Step 1: Company Profile</h4>
                <p className="text-slate-500">Provide basic information about your company.</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Company Name</label>
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
                <label className="block font-bold text-slate-700 mb-1">Company Website Domain</label>
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
                <h4 className="text-sm font-bold text-slate-900 mb-1">Step 2: Single AI Agent Identity & Tone</h4>
                <p className="text-slate-500">Each company rents 1 pre-built agent. Set its persona.</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Agent Name</label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder={`e.g. ${companyName ? companyName.split(' ')[0] : 'Nova'} Assistant`}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-2">Persona & Tone Preset</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'professional', label: 'Professional', desc: 'Formal and corporate' },
                    { id: 'empathetic', label: 'Empathetic', desc: 'Warm and caring' },
                    { id: 'technical', label: 'Technical', desc: 'DevOps & developer-first' },
                    { id: 'friendly', label: 'Friendly', desc: 'Approachable retail tone' },
                    { id: 'direct', label: 'Direct', desc: 'Bullet points & speed' }
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
                <h4 className="text-sm font-bold text-slate-900 mb-1">Step 3: Choose Plan Tier</h4>
                <p className="text-slate-500">Includes 1 production agent with full knowledge indexing.</p>
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
                          <span className="text-[10px] px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded font-bold">
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

          {step < 3 ? (
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
              <span>Launch Workspace</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
