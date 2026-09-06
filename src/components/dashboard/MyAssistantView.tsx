import React, { useState } from 'react';
import { 
  Sparkles, 
  Play, 
  PauseCircle, 
  CheckCircle2, 
  Sliders, 
  BookOpen, 
  Layers, 
  Save, 
  RotateCcw, 
  ShieldAlert, 
  Check, 
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  UserCheck,
  Cpu,
  Mail,
  MessageSquare,
  Globe,
  Upload,
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
    agentVersions,
    rollbackAgentVersion,
    publishAgentVersion,
    showToast,
    setCurrentTab
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'identity' | 'messaging' | 'knowledge_summary' | 'versions'>('overview');

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
    setTimeout(() => {
      setIsSaving(false);
      showToast('Assistant Updated', 'Your assistant configuration and instructions have been saved.', 'success');
    }, 400);
  };

  const handlePublish = () => {
    updateAgentConfig(formState);
    publishAgentVersion('Published live assistant configuration updates');
    showToast('Published Live', 'New assistant version is now live across website and all deployment channels.', 'success');
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
              {formState.description || `Prebuilt AI Q&A Assistant trained on ${currentCompany.name}'s business knowledge.`}
            </p>

            <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 flex-wrap">
              <span>Tone: <strong className="text-slate-700 capitalize">{formState.tone}</strong></span>
              <span>·</span>
              <span>Knowledge: <strong className="text-slate-700">{indexedSourcesCount} Ready Sources</strong></span>
              <span>·</span>
              <span>Channel: <strong className="text-slate-700">Website Widget & API</strong></span>
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
            onClick={handlePublish}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Publish Live</span>
          </button>
        </div>
      </div>

      {/* 2. Primary Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { id: 'overview', label: 'Overview & Status', icon: Sparkles },
          { id: 'identity', label: 'Identity & Personality', icon: Sliders },
          { id: 'messaging', label: 'Welcome & Fallbacks', icon: MessageSquare },
          { id: 'knowledge_summary', label: 'Knowledge Summary', icon: BookOpen },
          { id: 'versions', label: 'Version & Rollback', icon: RotateCcw }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
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

      {/* TAB A: OVERVIEW & STATUS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assistant Status</span>
                <span className={`w-3 h-3 rounded-full ${isLive ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
              </div>
              <h3 className="text-xl font-black text-slate-900">{isLive ? 'Active & Ready' : 'Paused'}</h3>
              <p className="text-xs text-slate-500">
                {isLive 
                  ? 'Responding to incoming customer inquiries 24/7 across all active channels.' 
                  : 'Assistant is paused and will not respond to new messages.'}
              </p>
              <div className="pt-2">
                <button
                  onClick={toggleAgentStatus}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    isLive 
                      ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200' 
                      : 'bg-emerald-600 text-white hover:bg-emerald-500'
                  }`}
                >
                  {isLive ? 'Pause Assistant' : 'Activate Live'}
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Grounded Knowledge</span>
                <BookOpen className="w-4 h-4 text-indigo-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900">{indexedSourcesCount} Sources Indexed</h3>
              <p className="text-xs text-slate-500">
                Assistant generates grounded answers strictly from your uploaded files, FAQs, and synced websites.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setCurrentTab('knowledge')}
                  className="w-full py-2 px-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span>Manage Knowledge Base</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fast Testing</span>
                <Play className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Interactive Playground</h3>
              <p className="text-xs text-slate-500">
                Ask questions, inspect citation sources, and verify how your assistant responds before going live.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setIsQuickTestOpen(true)}
                  className="w-full py-2 px-3 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Open Test Playground</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Guidance Box */}
          <div className="bg-gradient-to-r from-indigo-50 via-white to-indigo-50/50 p-6 rounded-3xl border border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">How the Q&A Assistant Works</h4>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  When a customer asks a question, the assistant retrieves relevant content from your Knowledge Base, evaluates confidence, and produces an accurate, grounded answer with your preferred tone. If no verified information is found, it politely refers to fallback or human handoff.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB B: IDENTITY & PERSONALITY */}
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
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-[10px] text-slate-600 italic">
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
              <p className="text-[11px] text-slate-400 mt-1">Shown to customers in the website widget and chat window.</p>
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
              <p className="text-[11px] text-slate-400 mt-1">Displayed below the assistant's name in headers.</p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Business Context & Special Instructions
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Provide context about your company, special policies, hours of operation, or instructions on how to treat specific topics.
            </p>
            <textarea
              rows={5}
              value={formState.businessInstructions || ''}
              onChange={e => setFormState(prev => ({ ...prev, businessInstructions: e.target.value }))}
              placeholder="e.g. You represent Acme Cloud. Always answer questions based on the uploaded knowledge base. If asked about enterprise pricing above ₹100,000, encourage the visitor to schedule a personalized demo."
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
              <span>{isSaving ? 'Saving Changes...' : 'Save Identity'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB C: WELCOME & FALLBACKS */}
      {activeTab === 'messaging' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-8">
          <div>
            <h3 className="text-base font-bold text-slate-900">Welcome Greeting & Fallback Safety</h3>
            <p className="text-xs text-slate-500 mt-0.5">Control the initial message customers see and how unanswered queries are handled.</p>
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
              <p className="text-[11px] text-slate-400">Used whenever knowledge retrieval confidence is below threshold.</p>
            </div>
          </div>

          {/* Human Escalation Settings */}
          <div className="border-t border-slate-100 pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-600" />
              <h4 className="text-sm font-bold text-slate-900">Human Handoff & Escalation Routing</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Notification Email for Escalations
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
                <p className="text-[11px] text-slate-400 mt-1">Alerts are sent here when a visitor requests human assistance.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Escalation Trigger Keywords (Comma separated)
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
                <p className="text-[11px] text-slate-400 mt-1">Keywords that immediately trigger the human handover flow.</p>
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
              <span>{isSaving ? 'Saving Changes...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB D: KNOWLEDGE SUMMARY */}
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

      {/* TAB E: VERSION & ROLLBACK */}
      {activeTab === 'versions' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-indigo-600" />
                <span>Version History & Rollback</span>
              </h3>
              <p className="text-xs text-slate-500">Every published update creates an immutable snapshot for safe rollbacks.</p>
            </div>
            <button
              onClick={handlePublish}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Publish Current Draft</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
            {agentVersions.map(ver => (
              <div key={ver.id} className="p-4 sm:p-5 flex items-center justify-between text-xs hover:bg-slate-50/70 transition-colors gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-slate-900 text-sm">{ver.versionLabel}</span>
                    {ver.status === 'live' ? (
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                        ● Currently Live
                      </span>
                    ) : (
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                        Archived
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{ver.description}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Author: {ver.author} · {ver.createdAt}</p>
                </div>

                <div className="shrink-0">
                  {ver.status !== 'live' ? (
                    <button
                      onClick={() => {
                        rollbackAgentVersion(ver.id);
                        showToast('Version Restored', `Assistant configuration rolled back to ${ver.versionLabel}`, 'info');
                      }}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Rollback to this</span>
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Active
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
