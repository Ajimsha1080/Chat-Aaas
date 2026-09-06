import React, { useState } from 'react';
import { 
  Sparkles, 
  Play, 
  PauseCircle, 
  CheckCircle2, 
  Sliders, 
  BookOpen, 
  Save, 
  Check, 
  UserCheck, 
  Mail, 
  MessageSquare, 
  ArrowRight,
  Info
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
      showToast('Changes Saved', 'Your assistant updates are now saved and active.', 'success');
    }, 400);
  };

  const indexedSourcesCount = knowledgeItems.filter(k => k.status === 'indexed').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Assistant Profile Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-5">
          <div className="relative shrink-0">
            <img 
              src={formState.avatarUrl || currentCompany.agent.avatarUrl} 
              alt={formState.name} 
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-4 ring-indigo-50 shadow-md" 
            />
            <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ring-3 ring-white flex items-center justify-center ${
              isLive ? 'bg-emerald-500' : 'bg-amber-500'
            }`} />
          </div>

          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">{formState.name}</h1>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
                isLive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {isLive ? '● Live & Answering Questions' : '● Paused'}
              </span>
            </div>

            <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
              {formState.description || `AI Q&A Assistant trained on ${currentCompany.name}'s business knowledge.`}
            </p>

            <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 flex-wrap">
              <span>Tone: <strong className="text-slate-700 capitalize">{formState.tone}</strong></span>
              <span>·</span>
              <span>Knowledge: <strong className="text-slate-700">{indexedSourcesCount} Sources Ready</strong></span>
              <span>·</span>
              <span>Channels: <strong className="text-slate-700">Website Widget & API</strong></span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            onClick={() => setIsQuickTestOpen(true)}
            className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-indigo-600 text-indigo-600" />
            <span>Test in Playground</span>
          </button>

          <button
            onClick={toggleAgentStatus}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
              isLive
                ? 'bg-white hover:bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-transparent shadow-xs'
            }`}
          >
            {isLive ? <PauseCircle className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isLive ? 'Pause Assistant' : 'Go Live'}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* 2. Simplified Primary Tabs Navigation (3 Core Tabs) */}
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
              className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Tab Contents */}

      {/* TAB 1: IDENTITY & PERSONALITY */}
      {activeTab === 'identity' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-8">
          <div>
            <h3 className="text-base font-bold text-slate-900">Assistant Identity & Tone</h3>
            <p className="text-xs text-slate-500 mt-0.5">Customize the name, role, and communication style of your assistant.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-5">
              {tones.map(t => (
                <button
                  key={t.id}
                  onClick={() => setFormState(prev => ({ ...prev, tone: t.id }))}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                    formState.tone === t.id
                      ? 'bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-slate-900">{t.label}</span>
                      {formState.tone === t.id && (
                        <Check className="w-4 h-4 text-indigo-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">{t.desc}</p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[10px] text-slate-600 italic">
                    {t.sample}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Assistant Display Name *
              </label>
              <input
                type="text"
                value={formState.name}
                onChange={e => setFormState(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                placeholder="e.g. Nova Support AI"
              />
              <p className="text-[11px] text-slate-400 mt-1">Shown to customers in the website chat header.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Role / Title
              </label>
              <input
                type="text"
                value={formState.role || ''}
                onChange={e => setFormState(prev => ({ ...prev, role: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                placeholder="e.g. Customer Support Specialist"
              />
              <p className="text-[11px] text-slate-400 mt-1">Displayed below the assistant's name.</p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Business Context & Special Instructions
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Tell your assistant about your company rules, hours, policies, or special guidance.
            </p>
            <textarea
              rows={5}
              value={formState.businessInstructions || ''}
              onChange={e => setFormState(prev => ({ ...prev, businessInstructions: e.target.value }))}
              placeholder="e.g. You represent Acme Cloud. Always answer questions based on the uploaded knowledge base. If asked about custom enterprise pricing, encourage the visitor to schedule a personalized demo."
              className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans leading-relaxed shadow-xs"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: WELCOME & FALLBACKS */}
      {activeTab === 'messaging' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-8">
          <div>
            <h3 className="text-base font-bold text-slate-900">Welcome Greeting & Fallback Messages</h3>
            <p className="text-xs text-slate-500 mt-0.5">Control the initial message visitors see and how missing information is handled.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-900">
                Welcome Greeting Message
              </label>
              <textarea
                rows={3}
                value={formState.greetingMessage || ''}
                onChange={e => setFormState(prev => ({ ...prev, greetingMessage: e.target.value }))}
                className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                placeholder="Hi there! 👋 How can I help you today?"
              />
              <p className="text-[11px] text-slate-400">Sent automatically when a visitor opens the chat widget.</p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-900">
                Fallback Refusal Message (Anti-Hallucination)
              </label>
              <textarea
                rows={3}
                value={formState.fallbackMessage || ''}
                onChange={e => setFormState(prev => ({ ...prev, fallbackMessage: e.target.value }))}
                className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                placeholder="I don't have that specific information in my knowledge base right now. Let me connect you with our support team."
              />
              <p className="text-[11px] text-slate-400">Used whenever the assistant cannot find verified facts in your knowledge base.</p>
            </div>
          </div>

          {/* Human Escalation Settings */}
          <div className="border-t border-slate-100 pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-600" />
              <h4 className="text-sm font-bold text-slate-900">Human Handoff & Escalation Alerts</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Notification Email for Human Requests
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
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
                    className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                    placeholder="support@yourcompany.com"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Email alerts are sent here when a visitor asks for human help.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Escalation Keywords (Comma separated)
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
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                  placeholder="agent, human, support, representative"
                />
                <p className="text-[11px] text-slate-400 mt-1">Keywords that immediately prompt the visitor to connect with live staff.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: KNOWLEDGE SUMMARY */}
      {activeTab === 'knowledge_summary' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Knowledge Base Summary</h3>
              <p className="text-xs text-slate-500">Your assistant grounds all answers in these verified business sources.</p>
            </div>
            <button
              onClick={() => setCurrentTab('knowledge')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Open Knowledge Base Manager</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {knowledgeItems.map(item => (
              <div key={item.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2 hover:border-indigo-200 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                    {item.type}
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-100">
                    ● Ready
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{item.title}</h4>
                <p className="text-[11px] text-slate-500 line-clamp-2">{item.content}</p>
                <div className="text-[10px] text-slate-400 pt-1 flex items-center justify-between">
                  <span>{item.chunksCount} parsed sections</span>
                  <span>{item.tokenCount ? `${item.tokenCount.toLocaleString()} tokens` : 'Indexed'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
