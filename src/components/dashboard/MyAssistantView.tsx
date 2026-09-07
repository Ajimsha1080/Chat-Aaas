import React, { useState } from 'react';
import { 
  Play, 
  PauseCircle, 
  Sliders, 
  BookOpen, 
  Save, 
  Check, 
  UserCheck, 
  Mail, 
  MessageSquare
} from 'lucide-react';
import { useApp } from '../../context';
import { AgentTone, AgentConfig } from '../../types';

export const MyAssistantView: React.FC = () => {
  const { 
    currentCompany, 
    updateAgentConfig, 
    toggleAgentStatus, 
    setIsQuickTestOpen, 
    knowledgeItems, 
    publishAgentVersion,
    showToast,
    setCurrentTab
  } = useApp();

  const [activeTab, setActiveTab] = useState<'identity' | 'messaging' | 'knowledge_summary'>('identity');

  // Local form state for draft edits
  const [formState, setFormState] = useState<AgentConfig>({ ...currentCompany.agent });
  const [isSaving, setIsSaving] = useState(false);
  const isLive = currentCompany.agent.status === 'active';

  const tones: { id: AgentTone; label: string; desc: string; sample: string }[] = [
    { 
      id: 'professional', 
      label: 'Professional', 
      desc: 'Courteous, precise, and business-focused.',
      sample: '"Certainly. According to our policy, enterprise subscriptions include 99.9% uptime SLA and dedicated support."'
    },
    { 
      id: 'friendly', 
      label: 'Friendly & Warm', 
      desc: 'Approachable, enthusiastic, and conversational.',
      sample: '"Hey there! Happy to help you with that. Yes, all our plans come with 24/7 assistant access!"'
    },
    { 
      id: 'empathetic', 
      label: 'Empathetic', 
      desc: 'Supportive, understanding, and patient with customer concerns.',
      sample: '"I completely understand how important that is for your team. Let me walk you through the steps."'
    },
    { 
      id: 'direct', 
      label: 'Direct & Concise', 
      desc: 'To the point and immediately answers without extra filler.',
      sample: '"Yes. You can cancel anytime from Settings > Billing. No cancellation fees apply."'
    },
    { 
      id: 'technical', 
      label: 'Technical & Precise', 
      desc: 'Detailed, structured, and developer-oriented.',
      sample: '"The REST API accepts JSON payloads with Bearer token authentication and returns standard 200 OK responses."'
    }
  ];

  const handleSave = () => {
    setIsSaving(true);
    updateAgentConfig(formState);
    publishAgentVersion('Saved assistant updates');
    setTimeout(() => {
      setIsSaving(false);
      showToast('Changes Saved', 'Your assistant configuration has been saved.', 'success');
    }, 300);
  };

  const indexedSourcesCount = knowledgeItems.filter(k => k.status === 'indexed').length;

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* 1. Assistant Profile Header */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-start sm:items-center gap-4">
          <div className="relative shrink-0">
            <img 
              src={formState.avatarUrl || currentCompany.agent.avatarUrl} 
              alt={formState.name} 
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-slate-200" 
            />
            <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-white ${
              isLive ? 'bg-emerald-500' : 'bg-amber-500'
            }`} />
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">{formState.name}</h1>
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-md ${
                isLive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                  : 'bg-amber-50 text-amber-700 border border-amber-200/60'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {isLive ? 'Live & Answering' : 'Paused'}
              </span>
            </div>

            <p className="text-slate-500 text-xs sm:text-sm mt-0.5 max-w-2xl">
              {formState.description || `AI Q&A Assistant trained on ${currentCompany.name}'s verified business knowledge.`}
            </p>

            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
              <span>Tone: <strong className="text-slate-700 capitalize font-medium">{formState.tone}</strong></span>
              <span>·</span>
              <span>Knowledge: <strong className="text-slate-700 font-medium">{indexedSourcesCount} Sources Indexed</strong></span>
              <span>·</span>
              <span>Deployments: <strong className="text-slate-700 font-medium">Website Widget & API</strong></span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => setIsQuickTestOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200/70 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer border border-slate-200/60"
          >
            <Play className="w-3.5 h-3.5 text-slate-600" />
            <span>Playground</span>
          </button>

          <button
            onClick={toggleAgentStatus}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer border ${
              isLive
                ? 'bg-white hover:bg-amber-50 text-amber-700 border-amber-200/80'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-transparent shadow-2xs'
            }`}
          >
            {isLive ? <PauseCircle className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isLive ? 'Pause Assistant' : 'Activate Live'}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* 2. Simplified Primary Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { id: 'identity', label: 'Identity & Personality', icon: Sliders },
          { id: 'messaging', label: 'Welcome & Fallbacks', icon: MessageSquare },
          { id: 'knowledge_summary', label: 'Knowledge Summary', icon: BookOpen }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-900' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Tab Contents */}

      {/* TAB 1: IDENTITY & PERSONALITY */}
      {activeTab === 'identity' && (
        <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-slate-900">Communication Tone</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Select how your AI assistant communicates with customers.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3.5">
              {tones.map(t => (
                <button
                  key={t.id}
                  onClick={() => setFormState(prev => ({ ...prev, tone: t.id }))}
                  className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                    formState.tone === t.id
                      ? 'bg-slate-50 border-slate-900 ring-1 ring-slate-900/10'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-slate-900">{t.label}</span>
                      {formState.tone === t.id && (
                        <Check className="w-3.5 h-3.5 text-slate-900" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">{t.desc}</p>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200/70 text-[10px] text-slate-600 font-mono">
                    {t.sample}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-900 mb-1">
                Assistant Display Name *
              </label>
              <input
                type="text"
                value={formState.name}
                onChange={e => setFormState(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 shadow-2xs"
                placeholder="e.g. Acme Support Assistant"
              />
              <p className="text-[11px] text-slate-400 mt-1">Shown to visitors in the website chat header.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-900 mb-1">
                Role / Title
              </label>
              <input
                type="text"
                value={formState.role || ''}
                onChange={e => setFormState(prev => ({ ...prev, role: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 shadow-2xs"
                placeholder="e.g. Customer Support Specialist"
              />
              <p className="text-[11px] text-slate-400 mt-1">Displayed below the assistant's name.</p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <label className="block text-xs font-medium text-slate-900 mb-1">
              Business Context & Directives
            </label>
            <p className="text-[11px] text-slate-400 mb-2">
              Specific instructions for your assistant regarding policies, hours, or guidance.
            </p>
            <textarea
              rows={4}
              value={formState.businessInstructions || ''}
              onChange={e => setFormState(prev => ({ ...prev, businessInstructions: e.target.value }))}
              placeholder="e.g. You represent Acme Cloud. Always answer questions based on the uploaded knowledge base. If asked about custom enterprise pricing, guide visitors to schedule a demo."
              className="w-full p-3 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 font-sans leading-relaxed shadow-2xs"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: WELCOME & FALLBACKS */}
      {activeTab === 'messaging' && (
        <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-slate-900">Welcome Greeting & Fallback Responses</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Control initial messages and grounding safeguards.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-900">
                Welcome Greeting Message
              </label>
              <textarea
                rows={3}
                value={formState.greetingMessage || ''}
                onChange={e => setFormState(prev => ({ ...prev, greetingMessage: e.target.value }))}
                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 shadow-2xs"
                placeholder="Hello! How can I assist you today?"
              />
              <p className="text-[11px] text-slate-400">Sent automatically when a visitor opens the chat widget.</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-900">
                Fallback Refusal Message (Anti-Hallucination)
              </label>
              <textarea
                rows={3}
                value={formState.fallbackMessage || ''}
                onChange={e => setFormState(prev => ({ ...prev, fallbackMessage: e.target.value }))}
                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 shadow-2xs"
                placeholder="I don't have that specific information in my verified knowledge base. Let me connect you with our support team."
              />
              <p className="text-[11px] text-slate-400">Used whenever facts are not present in the indexed knowledge base.</p>
            </div>
          </div>

          {/* Human Escalation Settings */}
          <div className="border-t border-slate-100 pt-5 space-y-3.5">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-slate-700" />
              <h4 className="text-xs font-semibold text-slate-900">Human Escalation Routing</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-900 mb-1">
                  Notification Email for Escalations
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={formState.escalationSettings?.notifyEmail || 'support@enterprise.com'}
                    onChange={e => setFormState(prev => ({
                      ...prev,
                      escalationSettings: {
                        ...prev.escalationSettings,
                        notifyEmail: e.target.value
                      }
                    }))}
                    className="w-full pl-8.5 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 shadow-2xs"
                    placeholder="support@yourcompany.com"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Alerts are sent here when customer requests live staff.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-900 mb-1">
                  Escalation Trigger Keywords
                </label>
                <input
                  type="text"
                  value={formState.escalationSettings?.triggerKeywords?.join(', ') || 'human, agent, representative, speak with someone'}
                  onChange={e => setFormState(prev => ({
                    ...prev,
                    escalationSettings: {
                      ...prev.escalationSettings,
                      triggerKeywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean)
                    }
                  }))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 shadow-2xs"
                  placeholder="agent, human, support, representative"
                />
                <p className="text-[11px] text-slate-400 mt-1">Comma-separated triggers for live handoff.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: KNOWLEDGE SUMMARY */}
      {activeTab === 'knowledge_summary' && (
        <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-xs font-semibold text-slate-900">Indexed Knowledge Sources</h3>
              <p className="text-[11px] text-slate-400">Your assistant grounds all answers in these verified business sources.</p>
            </div>
            <button
              onClick={() => setCurrentTab('knowledge')}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Manage Knowledge Base</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {knowledgeItems.map(item => (
              <div key={item.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/40 space-y-1.5 hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {item.type}
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200/60">
                    Indexed
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-slate-900 line-clamp-1">{item.title}</h4>
                <p className="text-[11px] text-slate-500 line-clamp-2">{item.content}</p>
                <div className="text-[10px] text-slate-400 pt-1 flex items-center justify-between font-mono">
                  <span>{item.chunksCount} chunks</span>
                  <span>{item.tokenCount ? `${item.tokenCount.toLocaleString()} tokens` : 'Ready'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
