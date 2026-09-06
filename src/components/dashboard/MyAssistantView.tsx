import React, { useState } from 'react';
import { 
  Bot, 
  Sparkles, 
  Play, 
  PauseCircle, 
  CheckCircle2, 
  Sliders, 
  BookOpen, 
  Zap, 
  Layers, 
  Palette, 
  Code2, 
  Save, 
  RotateCcw, 
  ShieldAlert, 
  Check, 
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowRight
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
    actions, 
    integrations,
    agentVersions,
    rollbackAgentVersion,
    publishAgentVersion,
    showToast,
    setCurrentTab
  } = useApp();

  const [activeTab, setActiveTab] = useState<'behavior' | 'knowledge' | 'actions' | 'connections' | 'appearance' | 'advanced'>('behavior');

  // Local form state for draft edits
  const [formState, setFormState] = useState<AgentConfig>({ ...currentCompany.agent });
  const [isSaving, setIsSaving] = useState(false);
  const isLive = currentCompany.agent.status === 'active';

  const tones: { id: AgentTone; label: string; desc: string }[] = [
    { id: 'professional', label: 'Professional', desc: 'Courteous, precise, and business-focused.' },
    { id: 'friendly', label: 'Friendly', desc: 'Warm, approachable, and encouraging.' },
    { id: 'empathetic', label: 'Empathetic', desc: 'Supportive, understanding, and patient with customer concerns.' },
    { id: 'direct', label: 'Direct', desc: 'Concise and immediately answers without extra filler.' },
    { id: 'technical', label: 'Technical', desc: 'Detailed, structured, and developer/engineer oriented.' }
  ];

  const handleSave = () => {
    setIsSaving(true);
    updateAgentConfig(formState);
    setTimeout(() => {
      setIsSaving(false);
      showToast('Assistant Updated', 'Your assistant instructions and configuration have been saved.', 'success');
    }, 400);
  };

  const handlePublish = () => {
    updateAgentConfig(formState);
    publishAgentVersion('Published live version updates');
    showToast('Published Live', 'New assistant version is now live across all channels.', 'success');
  };

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
            <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ring-3 ring-white ${
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
                <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {isLive ? '● Live on Website' : '● Paused'}
              </span>
            </div>

            <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
              {formState.description || 'Dedicated AI assistant handling customer support, sales inquiries, and bookings.'}
            </p>

            <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
              <span>Tone: <strong className="text-slate-700 capitalize">{formState.tone}</strong></span>
              <span>·</span>
              <span>Knowledge: <strong className="text-slate-700">{knowledgeItems.length} Sources</strong></span>
              <span>·</span>
              <span>Actions: <strong className="text-slate-700">{actions.filter(a => a.enabled).length} Enabled</strong></span>
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
            <span>Test Assistant</span>
          </button>

          <button
            onClick={toggleAgentStatus}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
              isLive
                ? 'bg-white hover:bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-transparent'
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
            <span>Publish Changes</span>
          </button>
        </div>
      </div>

      {/* 2. Primary Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { id: 'behavior', label: 'Behavior & Tone', icon: Sliders },
          { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
          { id: 'actions', label: 'Capabilities & Actions', icon: Zap },
          { id: 'connections', label: 'Connections', icon: Layers },
          { id: 'appearance', label: 'Appearance', icon: Palette },
          { id: 'advanced', label: 'Advanced Settings', icon: Code2 }
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
      {/* A. Behavior & Tone Tab */}
      {activeTab === 'behavior' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-8">
          <div>
            <h3 className="text-base font-bold text-slate-900">How should your assistant communicate?</h3>
            <p className="text-xs text-slate-500 mt-0.5">Select the tone and personality that best matches your brand.</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
              {tones.map(t => (
                <button
                  key={t.id}
                  onClick={() => setFormState(prev => ({ ...prev, tone: t.id }))}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                    formState.tone === t.id
                      ? 'bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-slate-900">{t.label}</span>
                    {formState.tone === t.id && (
                      <Check className="w-4 h-4 text-indigo-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Assistant Name
              </label>
              <input
                type="text"
                value={formState.name}
                onChange={e => setFormState(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                placeholder="e.g. Nova Support AI"
              />
              <p className="text-[11px] text-slate-400 mt-1">Displayed to customers in the chat header.</p>
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
              <p className="text-[11px] text-slate-400 mt-1">Shown below the assistant's name.</p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Business Instructions (Guidance in Plain English)
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Tell your assistant about your company rules, policies, hours, or what questions to avoid.
            </p>
            <textarea
              rows={5}
              value={formState.businessInstructions || ''}
              onChange={e => setFormState(prev => ({ ...prev, businessInstructions: e.target.value }))}
              placeholder="e.g. You represent Acme SaaS. Always answer questions based on the uploaded knowledge base. If an inquiry is about custom enterprise pricing above ₹100,000, ask for their work email and phone number."
              className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans leading-relaxed shadow-xs"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Welcome Greeting Message
              </label>
              <input
                type="text"
                value={formState.greetingMessage || ''}
                onChange={e => setFormState(prev => ({ ...prev, greetingMessage: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                placeholder="Hi there! How can I help you today?"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Fallback Message (When information is missing)
              </label>
              <input
                type="text"
                value={formState.fallbackMessage || ''}
                onChange={e => setFormState(prev => ({ ...prev, fallbackMessage: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                placeholder="I don't have that information right now. Let me connect you with a team member."
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
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

      {/* B. Knowledge Tab */}
      {activeTab === 'knowledge' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Knowledge Sources</h3>
              <p className="text-xs text-slate-500">Your assistant learns from these documents, websites, and FAQs.</p>
            </div>
            <button
              onClick={() => setCurrentTab('knowledge')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Manage Full Knowledge Base</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {knowledgeItems.map(item => (
              <div key={item.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    {item.type}
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold">
                    ● Ready
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{item.title}</h4>
                <p className="text-[11px] text-slate-500 line-clamp-2">{item.content}</p>
                <div className="text-[10px] text-slate-400 pt-1">
                  {item.chunksCount} parsed sections · Updated recently
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* C. Capabilities & Actions Tab */}
      {activeTab === 'actions' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">What can your assistant do?</h3>
            <p className="text-xs text-slate-500">
              Enable business actions with built-in safety confirmation gates.
            </p>
          </div>

          <div className="space-y-3">
            {actions.map(action => (
              <div 
                key={action.id}
                className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-200 transition-all flex items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    action.enabled ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">{action.name}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        action.riskLevel === 'high' 
                          ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                          : action.riskLevel === 'medium'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {action.riskLevel.toUpperCase()} RISK
                      </span>
                      {action.requiresUserConfirmation && (
                        <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full font-semibold border border-amber-200">
                          Requires Approval Gate
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{action.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs font-semibold ${action.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {action.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* D. Connections Tab */}
      {activeTab === 'connections' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Connected Tools & Channels</h3>
              <p className="text-xs text-slate-500">Connect your assistant to the apps your business already uses.</p>
            </div>
            <button
              onClick={() => setCurrentTab('connections')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Browse Connections Marketplace
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map(int => (
              <div key={int.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">{int.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    int.connected ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {int.connected ? '● Connected' : 'Not Connected'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{int.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* E. Appearance Tab */}
      {activeTab === 'appearance' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Widget Appearance & Branding</h3>
            <p className="text-xs text-slate-500">Customize how the chat widget looks on your website.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Header Title
              </label>
              <input
                type="text"
                value={currentCompany.widgetSettings.headerTitle || formState.name}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Launcher Button Text
              </label>
              <input
                type="text"
                value={currentCompany.widgetSettings.launcherText || 'Need help? Chat with us'}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Primary Brand Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={currentCompany.widgetSettings.primaryColor || '#4f46e5'}
                  className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer"
                />
                <span className="font-mono text-xs text-slate-700">{currentCompany.widgetSettings.primaryColor || '#4f46e5'}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Position
              </label>
              <select
                value={currentCompany.widgetSettings.position}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
              >
                <option value="bottom_right">Bottom Right (Recommended)</option>
                <option value="bottom_left">Bottom Left</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* F. Advanced Settings Tab (Progressive Disclosure) */}
      {activeTab === 'advanced' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Code2 className="w-5 h-5 text-indigo-600" />
                <span>Advanced AI & Developer Controls</span>
              </h3>
              <p className="text-xs text-slate-500">Fine-tune model routing, temperature parameters, and version history.</p>
            </div>
            <span className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-bold">
              Progressive Disclosure Mode
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                AI Model Routing Tier
              </label>
              <select
                value={formState.modelTier || 'automatic'}
                onChange={e => setFormState(prev => ({ ...prev, modelTier: e.target.value as any }))}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
              >
                <option value="automatic">Automatic Smart Router (Best latency & quality)</option>
                <option value="fast">Fast Tier (Sub-second response time)</option>
                <option value="balanced">Balanced Tier (High reasoning + speed)</option>
                <option value="advanced">Advanced Tier (Complex multi-hop reasoning)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Creativity & Temperature: {formState.creativityLevel ?? 0.3}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={formState.creativityLevel ?? 0.3}
                onChange={e => setFormState(prev => ({ ...prev, creativityLevel: parseFloat(e.target.value) }))}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>0.0 (Strict Facts)</span>
                <span>0.3 (Default)</span>
                <span>1.0 (High Creativity)</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h4 className="text-xs font-bold text-slate-900 mb-3">Version History & Safe Rollback</h4>
            <div className="divide-y divide-slate-100">
              {agentVersions.slice(0, 3).map(ver => (
                <div key={ver.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{ver.versionLabel}</span>
                      {ver.status === 'live' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                          Active Live
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{ver.description} · By {ver.author}</p>
                  </div>

                  {ver.status !== 'live' && (
                    <button
                      onClick={() => {
                        rollbackAgentVersion(ver.id);
                        showToast('Version Restored', `Rolled back to ${ver.versionLabel}`, 'info');
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Rollback</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
