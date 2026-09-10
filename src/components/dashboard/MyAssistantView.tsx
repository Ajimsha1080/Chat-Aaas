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
  const [prevAgentState, setPrevAgentState] = useState(currentCompany.agent);
  if (prevAgentState !== currentCompany.agent) {
    setPrevAgentState(currentCompany.agent);
    setFormState({ ...currentCompany.agent });
  }
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
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Assistant Profile Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-5">
          <div className="relative shrink-0">
            <img 
              src={formState.avatarUrl || currentCompany.agent.avatarUrl} 
              alt={formState.name} 
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover border border-slate-200 shadow-sm" 
            />
            <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ring-2 ring-white ${
              isLive ? 'bg-emerald-500' : 'bg-amber-500'
            }`} />
          </div>

          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{formState.name}</h1>
              <span className={`inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold px-3 py-1 rounded-lg ${
                isLive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {isLive ? 'Live & Answering' : 'Paused'}
              </span>
            </div>

            <p className="text-slate-600 text-sm sm:text-base mt-1.5 max-w-3xl leading-relaxed">
              {formState.description || `AI Q&A Assistant trained on ${currentCompany.name}'s verified business knowledge.`}
            </p>

            <div className="flex items-center gap-3 mt-2.5 text-xs sm:text-sm text-slate-500 flex-wrap">
              <span>Tone: <strong className="text-slate-800 capitalize font-semibold">{formState.tone}</strong></span>
              <span>·</span>
              <span>Knowledge: <strong className="text-slate-800 font-semibold">{indexedSourcesCount} Sources Indexed</strong></span>
              <span>·</span>
              <span>Deployments: <strong className="text-slate-800 font-semibold">Website Widget & API</strong></span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            onClick={() => setIsQuickTestOpen(true)}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-800 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer border border-slate-200"
          >
            <Play className="w-4 h-4 text-slate-700" />
            <span>Playground</span>
          </button>

          <button
            onClick={toggleAgentStatus}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer border ${
              isLive
                ? 'bg-white hover:bg-amber-50 text-amber-800 border-amber-200 shadow-xs'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-transparent shadow-sm'
            }`}
          >
            {isLive ? <PauseCircle className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isLive ? 'Pause Assistant' : 'Activate Live'}</span>
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
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-slate-900' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Tab Contents */}

      {/* TAB 1: IDENTITY & PERSONALITY */}
      {activeTab === 'identity' && (
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-7">
          <div>
            <h3 className="text-base font-bold text-slate-900">Communication Tone</h3>
            <p className="text-sm text-slate-500 mt-1">Select how your AI assistant communicates with customers.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {tones.map(t => (
                <button
                  key={t.id}
                  onClick={() => setFormState(prev => ({ ...prev, tone: t.id }))}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                    formState.tone === t.id
                      ? 'bg-slate-50 border-slate-900 ring-1 ring-slate-900 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm text-slate-900">{t.label}</span>
                      {formState.tone === t.id && (
                        <Check className="w-4 h-4 text-slate-900" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 mb-3 leading-relaxed">{t.desc}</p>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 font-mono">
                    {t.sample}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                Role / Title
              </label>
              <input
                type="text"
                value={formState.role || ''}
                onChange={e => setFormState(prev => ({ ...prev, role: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 shadow-xs font-medium"
                placeholder="e.g. Customer Support Specialist"
              />
              <p className="text-xs text-slate-500 mt-1">Displayed below the assistant's name (Coar AI).</p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">
              Business Context & Directives
            </label>
            <p className="text-xs sm:text-sm text-slate-500 mb-2.5">
              Specific instructions for your assistant regarding policies, hours, or guidance.
            </p>
            <textarea
              rows={4}
              value={formState.businessInstructions || ''}
              onChange={e => setFormState(prev => ({ ...prev, businessInstructions: e.target.value }))}
              placeholder="e.g. You represent Acme Cloud. Always answer questions based on the uploaded knowledge base. If asked about custom enterprise pricing, guide visitors to schedule a demo."
              className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 font-sans leading-relaxed shadow-xs"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: WELCOME & FALLBACKS */}
      {activeTab === 'messaging' && (
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-7">
          <div>
            <h3 className="text-base font-bold text-slate-900">Welcome Greeting & Fallback Responses</h3>
            <p className="text-sm text-slate-500 mt-1">Control initial messages and grounding safeguards.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">
                Welcome Greeting Message
              </label>
              <textarea
                rows={3}
                value={formState.greetingMessage || ''}
                onChange={e => setFormState(prev => ({ ...prev, greetingMessage: e.target.value }))}
                className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 shadow-xs"
                placeholder="Hello! How can I assist you today?"
              />
              <p className="text-xs text-slate-500">Sent automatically when a visitor opens the chat widget.</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">
                Fallback Refusal Message (Anti-Hallucination)
              </label>
              <textarea
                rows={3}
                value={formState.fallbackMessage || ''}
                onChange={e => setFormState(prev => ({ ...prev, fallbackMessage: e.target.value }))}
                className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 shadow-xs"
                placeholder="I don't have that specific information in my verified knowledge base. Let me connect you with our support team."
              />
              <p className="text-xs text-slate-500">Used whenever facts are not present in the indexed knowledge base.</p>
            </div>
          </div>

          {/* Human Escalation Settings */}
          <div className="border-t border-slate-100 pt-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-5 h-5 text-slate-800" />
                <div>
                  <h4 className="text-base font-bold text-slate-900">Human Escalation Routing</h4>
                  <p className="text-xs text-slate-500">Automatically transfer chats to human operators upon request.</p>
                </div>
              </div>

              {/* Enable / Disable Toggle Switch */}
              <div className="flex items-center gap-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                  formState.escalationSettings?.enabled !== false
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {formState.escalationSettings?.enabled !== false ? '● Enabled' : '○ Disabled'}
                </span>

                <label className="relative inline-flex items-center cursor-pointer" title="Enable or disable human escalation routing">
                  <input
                    type="checkbox"
                    checked={formState.escalationSettings?.enabled !== false}
                    onChange={(e) => setFormState(prev => ({
                      ...prev,
                      escalationSettings: {
                        ...prev.escalationSettings,
                        enabled: e.target.checked
                      }
                    }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-5 transition-opacity duration-150 ${
              formState.escalationSettings?.enabled !== false ? 'opacity-100' : 'opacity-40 pointer-events-none'
            }`}>
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                  Notification Email for Escalations
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    disabled={formState.escalationSettings?.enabled === false}
                    value={formState.escalationSettings?.notifyEmail || ''}
                    onChange={e => setFormState(prev => ({
                      ...prev,
                      escalationSettings: {
                        ...prev.escalationSettings,
                        notifyEmail: e.target.value
                      }
                    }))}
                    className="w-full pl-9.5 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 shadow-xs font-medium"
                    placeholder="support@yourcompany.com"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Alerts are sent here when customer requests live staff.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                  Escalation Trigger Keywords
                </label>
                <input
                  type="text"
                  disabled={formState.escalationSettings?.enabled === false}
                  value={formState.escalationSettings?.triggerKeywords?.join(', ') || ''}
                  onChange={e => setFormState(prev => ({
                    ...prev,
                    escalationSettings: {
                      ...prev.escalationSettings,
                      triggerKeywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean)
                    }
                  }))}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 shadow-xs font-medium"
                  placeholder="agent, human, support, representative"
                />
                <p className="text-xs text-slate-500 mt-1">Comma-separated triggers for live handoff.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: KNOWLEDGE SUMMARY */}
      {activeTab === 'knowledge_summary' && (
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Indexed Knowledge Sources</h3>
              <p className="text-sm text-slate-500 mt-0.5">Your assistant grounds all answers in these verified business sources.</p>
            </div>
            <button
              onClick={() => setCurrentTab('knowledge')}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <BookOpen className="w-4 h-4" />
              <span>Manage Knowledge Base</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {knowledgeItems.map(item => (
              <div key={item.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-mono font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                    {item.type}
                  </span>
                  <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md font-semibold border border-emerald-200">
                    Indexed
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-900 line-clamp-1">{item.title}</h4>
                <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">{item.content}</p>
                <div className="text-xs text-slate-500 pt-1.5 flex items-center justify-between font-mono font-medium">
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
