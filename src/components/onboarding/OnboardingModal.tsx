import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Globe, 
  Upload, 
  Play, 
  Rocket 
} from 'lucide-react';
import { useApp } from '../../context';
import { AgentTone } from '../../types';
import confetti from 'canvas-confetti';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const { createCompanyWorkspace, setCurrentTab, showToast } = useApp();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [businessName, setBusinessName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [industry, setIndustry] = useState('SaaS & Software');
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [tone, setTone] = useState<AgentTone>('professional');
  const [greetingMessage, setGreetingMessage] = useState('Hi there! 👋 How can I help you with our products and services today?');
  const [testQuestion, setTestQuestion] = useState('What are your pricing options and SLA?');
  const [testAnswer, setTestAnswer] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const tones: { id: AgentTone; label: string; desc: string }[] = [
    { id: 'professional', label: 'Professional', desc: 'Courteous, concise, and business-focused.' },
    { id: 'friendly', label: 'Friendly & Warm', desc: 'Approachable, warm, and conversational.' },
    { id: 'empathetic', label: 'Empathetic', desc: 'Supportive, patient, and understanding.' },
    { id: 'direct', label: 'Direct', desc: 'Short, precise answers with zero fluff.' }
  ];

  const handleSimulateTest = () => {
    setIsTesting(true);
    setTimeout(() => {
      setIsTesting(false);
      setTestAnswer(`Hello! We offer Starter, Growth, Business, and Enterprise plans tailored to your team size. All plans include 24/7 AI Q&A assistance, custom branding, and 99.9% uptime SLA.`);
    }, 600);
  };

  const handleComplete = () => {
    const finalName = 'Coar AI';
    const finalDomain = websiteUrl.trim() || `${(businessName || 'acme').toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;

    createCompanyWorkspace(
      businessName || 'My Business',
      finalDomain,
      industry,
      'growth',
      finalName,
      tone
    );

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 }
    });

    showToast('AI Assistant Ready', `Your Q&A Assistant ${finalName} is now active!`, 'success');
    onClose();
    setCurrentTab('home');
  };

  const progressPercent = Math.round((step / 5) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl sm:rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 sm:px-7 py-4 sm:py-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">Set up your AI Assistant</h3>
              <p className="text-xs sm:text-sm text-slate-500 truncate">
                Step {step} of 5 — {
                  step === 1 ? 'Business Information' :
                  step === 2 ? 'Add Knowledge' :
                  step === 3 ? 'Personality & Greeting' :
                  step === 4 ? 'Test Assistant' : 'Ready to Deploy'
                }
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 sm:px-7 pt-3.5 pb-1">
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1.5 font-semibold">
            <span>Progress: {progressPercent}%</span>
            <span>{step === 5 ? 'Launch Ready' : `${5 - step} steps remaining`}</span>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-7 text-sm space-y-5">
          {/* STEP 1: Business Profile */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h4 className="text-base font-bold text-slate-900 mb-1">Tell us about your business</h4>
                <p className="text-sm text-slate-500">Your AI Q&A assistant will represent your brand when answering customer questions.</p>
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1.5 text-sm">Business Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Cloud Systems"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-900 mb-1.5 text-sm">Industry</label>
                  <select
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                  >
                    <option value="SaaS & Software">SaaS & Software</option>
                    <option value="E-Commerce & Retail">E-Commerce & Retail</option>
                    <option value="Healthcare & Clinics">Healthcare & Clinics</option>
                    <option value="Financial Services">Financial Services</option>
                    <option value="Professional Services">Professional Services</option>
                    <option value="Education & EdTech">Education & EdTech</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1.5 text-sm">Primary Language</label>
                  <select
                    value={preferredLanguage}
                    onChange={e => setPreferredLanguage(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="Hindi">Hindi</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Knowledge Ingestion */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h4 className="text-base font-bold text-slate-900 mb-1">Add your business knowledge</h4>
                <p className="text-sm text-slate-500">Your assistant retrieves answers directly from your public website and uploaded files.</p>
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1.5 text-sm">Company Website URL</label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    placeholder="https://yourcompany.com"
                    value={websiteUrl}
                    onChange={e => setWebsiteUrl(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1.5">We will automatically index your homepage, FAQs, and help center.</p>
              </div>

              <div className="p-5 border-2 border-dashed border-indigo-200 rounded-2xl bg-indigo-50/30 text-center space-y-2.5">
                <Upload className="w-8 h-8 mx-auto text-indigo-600" />
                <p className="font-bold text-slate-900 text-sm">Upload Product Docs, Price Lists, or PDFs</p>
                <p className="text-xs text-slate-500">PDF, DOCX, TXT, CSV up to 25MB</p>
                <button
                  type="button"
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
                >
                  Browse Files
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Customize Q&A Assistant */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h4 className="text-base font-bold text-slate-900 mb-1">Customize Assistant Personality & Tone</h4>
                <p className="text-sm text-slate-500">Choose how your assistant speaks with visitors and what greeting it uses.</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-slate-900 text-sm">Assistant Name</label>
                  <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                    Predefined
                  </span>
                </div>
                <input
                  type="text"
                  readOnly
                  disabled
                  value="Coar AI"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 cursor-not-allowed shadow-xs select-none"
                />
                <p className="text-xs text-slate-500 mt-1">Predefined platform AI Assistant name.</p>
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1.5 text-sm">Tone of Voice</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {tones.map(t => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setTone(t.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        tone === t.id
                          ? 'bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-500/20 text-indigo-950 font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs sm:text-sm font-bold">{t.label}</span>
                        {tone === t.id && <Check className="w-4 h-4 text-indigo-600" />}
                      </div>
                      <p className="text-xs text-slate-500">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1.5 text-sm">Welcome Message</label>
                <input
                  type="text"
                  value={greetingMessage}
                  onChange={e => setGreetingMessage(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                />
              </div>
            </div>
          )}

          {/* STEP 4: Test Assistant */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h4 className="text-base font-bold text-slate-900 mb-1">Test your Q&A Assistant</h4>
                <p className="text-sm text-slate-500">Ask a question to see how your assistant formulates grounded responses.</p>
              </div>

              <div className="space-y-2">
                <label className="block font-bold text-slate-900 text-sm">Sample Customer Question</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testQuestion}
                    onChange={e => setTestQuestion(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleSimulateTest}
                    disabled={isTesting}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50 text-sm shadow-xs"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>{isTesting ? 'Thinking...' : 'Ask'}</span>
                  </button>
                </div>
              </div>

              {testAnswer && (
                <div className="p-5 bg-slate-900 text-white rounded-2xl space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-xs">
                        AI
                      </div>
                      <span className="font-bold text-sm">Coar AI</span>
                    </div>
                    <span className="text-xs text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800/60">
                      ● Grounded Answer
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
                    {testAnswer}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Launch Ready */}
          {step === 5 && (
            <div className="space-y-4 animate-in fade-in duration-150 text-center py-2">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                <Rocket className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-900">Your AI Q&A Assistant is Ready!</h4>
                <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
                  Your business workspace is initialized with prebuilt RAG retrieval, anti-hallucination refusal, and multi-channel embed code.
                </p>
              </div>

              <div className="p-5 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-left space-y-2.5 text-sm text-indigo-950">
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span><strong>{businessName || 'Business'}</strong> workspace configured</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Assistant: <strong>Coar AI</strong> ({tone} tone)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Website embed snippet & API keys generated</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Controls */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((step - 1) as any)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
              >
                Skip for now
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 5 ? (
              <button
                type="button"
                onClick={() => setStep((step + 1) as any)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Launch Assistant</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
