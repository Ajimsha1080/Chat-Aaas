import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  ArrowRight, 
  ArrowLeft,
  Bot,
  Building2,
  BookOpen,
  Plug,
  Play,
  Rocket,
  CheckCircle2,
  Globe,
  Upload,
  MessageSquare
} from 'lucide-react';
import { useApp } from '../../context';
import { AgentTone, SubscriptionPlanId } from '../../types';
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
  const [helpGoals, setHelpGoals] = useState<string[]>([
    'Customer support',
    'Product questions'
  ]);
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [tone, setTone] = useState<AgentTone>('professional');
  const [assistantName, setAssistantName] = useState('');
  const [selectedTools, setSelectedTools] = useState<string[]>(['whatsapp', 'website']);

  if (!isOpen) return null;

  const toggleGoal = (goal: string) => {
    setHelpGoals(prev => 
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    );
  };

  const toggleTool = (tool: string) => {
    setSelectedTools(prev => 
      prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]
    );
  };

  const handleComplete = () => {
    const finalName = assistantName.trim() || `${businessName ? businessName.split(' ')[0] : 'Nova'} AI`;
    const finalDomain = websiteUrl.trim() || `${(businessName || 'acme').toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;

    createCompanyWorkspace(
      businessName || 'My Business',
      finalDomain,
      'SaaS & Cloud Software',
      'growth',
      finalName,
      tone
    );

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 }
    });

    showToast('Assistant Created', `Your AI Assistant ${finalName} is ready!`, 'success');
    onClose();
    setCurrentTab('home');
  };

  const progressPercent = Math.round((step / 5) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Let's set up your AI Assistant 🚀</h3>
              <p className="text-xs text-slate-500">Step {step} of 5 — {step === 1 ? 'Your business' : step === 2 ? 'Add knowledge' : step === 3 ? 'Connect tools' : step === 4 ? 'Test assistant' : 'Deploy'}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-3 pb-1">
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-semibold">
            <span>Progress: {progressPercent}%</span>
            <span>{step === 5 ? 'Ready to Deploy' : `${5 - step} steps remaining`}</span>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 text-xs space-y-4">
          {/* STEP 1: Business Profile */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-0.5">Tell us about your business</h4>
                <p className="text-slate-500">Your assistant will adapt its tone and answers for your customers.</p>
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">Business Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Innovations"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">What should your assistant help with?</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {[
                    'Customer support',
                    'Product questions',
                    'Sales inquiries',
                    'Lead qualification',
                    'Order tracking',
                    'Internal team help'
                  ].map(goal => (
                    <button
                      type="button"
                      key={goal}
                      onClick={() => toggleGoal(goal)}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        helpGoals.includes(goal)
                          ? 'bg-indigo-50/70 border-indigo-600 text-indigo-950 font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{goal}</span>
                      {helpGoals.includes(goal) && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-bold text-slate-900 mb-1">Preferred Language</label>
                  <select
                    value={preferredLanguage}
                    onChange={e => setPreferredLanguage(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Malayalam">Malayalam</option>
                    <option value="German">German</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">Tone of Voice</label>
                  <select
                    value={tone}
                    onChange={e => setTone(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly & Warm</option>
                    <option value="empathetic">Empathetic</option>
                    <option value="direct">Direct & Concise</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Knowledge Ingestion */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-0.5">Add your business knowledge</h4>
                <p className="text-slate-500">Your assistant uses this information to answer customer questions accurately.</p>
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">Website URL for Auto-Sync</label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    placeholder="https://yourcompany.com"
                    value={websiteUrl}
                    onChange={e => setWebsiteUrl(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">We will securely scan your public pages and FAQ.</p>
              </div>

              <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-center space-y-2">
                <Upload className="w-8 h-8 mx-auto text-indigo-600" />
                <p className="font-bold text-slate-800">Upload Product Catalogs or Policies</p>
                <p className="text-[11px] text-slate-400">PDF, DOCX, TXT, CSV up to 25MB</p>
                <span className="inline-block px-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700">
                  Select Files
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: Connect Tools */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-0.5">Connect your business channels</h4>
                <p className="text-slate-500">Choose where customers will chat with your AI assistant.</p>
              </div>

              <div className="space-y-2.5">
                {[
                  { id: 'website', name: 'Website Chat Widget', desc: 'Embed on your website in 2 minutes', icon: '🌐' },
                  { id: 'whatsapp', name: 'WhatsApp Business', desc: 'Message customers on WhatsApp', icon: '💬' },
                  { id: 'slack', name: 'Slack Integration', desc: 'Escalations to internal team channels', icon: '⚡' },
                  { id: 'shopify', name: 'Shopify Store', desc: 'Check order status and tracking live', icon: '🛍️' }
                ].map(tool => (
                  <button
                    type="button"
                    key={tool.id}
                    onClick={() => toggleTool(tool.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      selectedTools.includes(tool.id)
                        ? 'bg-indigo-50/70 border-indigo-600 ring-1 ring-indigo-500/20'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{tool.icon}</span>
                      <div>
                        <p className="font-bold text-slate-900">{tool.name}</p>
                        <p className="text-[11px] text-slate-500">{tool.desc}</p>
                      </div>
                    </div>
                    {selectedTools.includes(tool.id) && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Test Assistant */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-0.5">Test your AI Assistant</h4>
                <p className="text-slate-500">Give your assistant a name and preview its welcoming response.</p>
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">Assistant Name</label>
                <input
                  type="text"
                  placeholder="e.g. Nova Support AI"
                  value={assistantName}
                  onChange={e => setAssistantName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                />
              </div>

              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-[10px]">
                    AI
                  </div>
                  <span className="font-bold text-xs">{assistantName || 'Nova AI'}</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">● Ready</span>
                </div>
                <p className="text-xs text-slate-200 bg-slate-800/80 p-3 rounded-xl leading-relaxed">
                  "Hello! I am {assistantName || 'Nova AI'}, your assistant for {businessName || 'your business'}. How can I assist you with products, order details, or pricing today?"
                </p>
              </div>
            </div>
          )}

          {/* STEP 5: Deploy */}
          {step === 5 && (
            <div className="space-y-4 animate-in fade-in duration-150 text-center py-2">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                <Rocket className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900">Your AI Assistant is ready!</h4>
                <p className="text-slate-500 mt-1">
                  Click below to activate your assistant workspace and open the live command center.
                </p>
              </div>

              <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-left space-y-1.5 text-xs text-indigo-950">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-600" />
                  <span><strong>{businessName || 'Acme Workspace'}</strong> initialized</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-600" />
                  <span>AI assistant configured with <strong>{tone}</strong> tone</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-600" />
                  <span>Multi-channel website and WhatsApp integrations enabled</span>
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
