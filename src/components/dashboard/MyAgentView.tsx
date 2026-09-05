import React, { useState } from 'react';
import { 
  Sparkles, 
  Save, 
  Check, 
  Play, 
  Pause, 
  Sliders, 
  ShieldAlert, 
  Zap, 
  Layers,
  History,
  ArrowUpRight,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../../context';
import { AgentTone, AgentConfig } from '../../types';

export const MyAgentView: React.FC = () => {
  const { 
    currentCompany, 
    updateAgentConfig, 
    toggleAgentStatus, 
    actions, 
    setCurrentTab,
    setIsQuickTestOpen,
    showToast
  } = useApp();

  const agent = currentCompany.agent;

  // Local draft state for smooth editing
  const [formData, setFormData] = useState<AgentConfig>({ ...agent });
  const [isSaved, setIsSaved] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  
  // Versioning state
  const [currentVersionNumber, setCurrentVersionNumber] = useState(2);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [changeSummary, setChangeSummary] = useState('');
  const [versionHistory, setVersionHistory] = useState([
    {
      id: 'ver-2',
      versionNumber: 2,
      publishedAt: '20 Aug 2026, 02:10 PM',
      summary: 'Added Kubernetes rolling restart tool and enhanced SLA anti-hallucination prompts.',
      status: 'active'
    },
    {
      id: 'ver-1',
      versionNumber: 1,
      publishedAt: '15 Jan 2026, 08:15 AM',
      summary: 'Initial production release for TechFlow Cloud single AI agent.',
      status: 'archived'
    }
  ]);

  const toneOptions: { id: AgentTone; label: string; desc: string }[] = [
    { id: 'professional', label: 'Professional', desc: 'Formal, polite, and corporate enterprise tone' },
    { id: 'empathetic', label: 'Empathetic', desc: 'Warm, supportive, and understanding for healthcare & customer care' },
    { id: 'technical', label: 'Technical / DevOps', desc: 'Precise, code-first, and concise for developers' },
    { id: 'friendly', label: 'Friendly & Casual', desc: 'Approachable and conversational for retail & D2C' },
    { id: 'direct', label: 'Direct & Concise', desc: 'High-speed, bulleted responses without fluff' }
  ];

  const handleSaveDraft = () => {
    updateAgentConfig(formData);
    setIsSaved(true);
    showToast('Draft Saved', 'Draft configuration updated. Publish to deploy changes to live traffic.', 'info');
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handlePublishVersion = () => {
    const nextVer = currentVersionNumber + 1;
    setCurrentVersionNumber(nextVer);
    updateAgentConfig(formData);

    const newHistItem = {
      id: `ver-${nextVer}`,
      versionNumber: nextVer,
      publishedAt: 'Just now',
      summary: changeSummary || `Published Version ${nextVer}.0 updates.`,
      status: 'active'
    };

    setVersionHistory(prev => [
      newHistItem,
      ...prev.map(v => ({ ...v, status: 'archived' }))
    ]);

    setIsPublishModalOpen(false);
    setChangeSummary('');
    showToast('Version Published!', `Configuration Version ${nextVer}.0 is now live on all website widgets.`, 'success');
  };

  const handleRollback = (verNum: number) => {
    setCurrentVersionNumber(verNum);
    setVersionHistory(prev => prev.map(v => ({
      ...v,
      status: v.versionNumber === verNum ? 'active' : 'archived'
    })));
    setIsHistoryModalOpen(false);
    showToast('Configuration Rolled Back', `Restored production configuration to Version ${verNum}.0.`, 'warning');
  };

  const handleAddKeyword = () => {
    if (!keywordInput.trim()) return;
    if (!formData.escalationSettings.triggerKeywords.includes(keywordInput.trim())) {
      setFormData(prev => ({
        ...prev,
        escalationSettings: {
          ...prev.escalationSettings,
          triggerKeywords: [...prev.escalationSettings.triggerKeywords, keywordInput.trim()]
        }
      }));
    }
    setKeywordInput('');
  };

  const handleRemoveKeyword = (kw: string) => {
    setFormData(prev => ({
      ...prev,
      escalationSettings: {
        ...prev.escalationSettings,
        triggerKeywords: prev.escalationSettings.triggerKeywords.filter(k => k !== kw)
      }
    }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Strict Single Agent Notice Banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
            1/1
          </div>
          <div>
            <h4 className="text-xs font-bold text-indigo-950">Single Production AI Agent Architecture</h4>
            <p className="text-[11px] text-indigo-800">
              Each company rents exactly <strong>one</strong> production-ready AI agent. Customize its knowledge, tone, allowed tools, and escalation rules below.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsQuickTestOpen(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Open Test Drawer</span>
          </button>
        </div>
      </div>

      {/* Main Agent Configuration Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header with Save Button & Status */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img 
              src={formData.avatarUrl} 
              alt={formData.name} 
              className="w-12 h-12 rounded-2xl object-cover ring-2 ring-indigo-500/30"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{formData.name}</h2>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  agent.status === 'active' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {agent.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-500">Official Rented Agent for {currentCompany.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Version Badge & History */}
            <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl">
              <span className="text-[11px] font-mono font-bold text-indigo-700">v{currentVersionNumber}.0 Live</span>
              <button
                onClick={() => setIsHistoryModalOpen(true)}
                className="text-[11px] text-indigo-600 hover:text-indigo-900 font-semibold underline ml-1 flex items-center gap-0.5"
              >
                <History className="w-3 h-3" />
                <span>History</span>
              </button>
            </div>

            <button
              onClick={toggleAgentStatus}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                agent.status === 'active'
                  ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
              }`}
            >
              {agent.status === 'active' ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause Agent</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Activate Agent</span>
                </>
              )}
            </button>

            <button
              onClick={handleSaveDraft}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-300"
            >
              {isSaved ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Draft</span>
            </button>

            <button
              onClick={() => setIsPublishModalOpen(true)}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Publish v{currentVersionNumber + 1}.0</span>
            </button>
          </div>
        </div>

        {/* Configuration Sections */}
        <div className="p-6 space-y-6">
          {/* Section 1: Identity & Avatar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Agent Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Aura Cloud Assistant"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Avatar Image URL</label>
              <input
                type="text"
                value={formData.avatarUrl}
                onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                placeholder="https://..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Public Agent Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              placeholder="Brief summary of what this agent does for your customers..."
            />
          </div>

          {/* Section 2: Tone & Personality Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                <span>Agent Personality & Tone</span>
              </label>
              <span className="text-[11px] text-slate-500 capitalize">Active: <strong>{formData.tone}</strong></span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {toneOptions.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, tone: opt.id })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    formData.tone === opt.id
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-600'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{opt.label}</span>
                    {formData.tone === opt.id && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Hierarchical Prompt Instructions */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Hierarchy Level 2: Company Business Instructions</span>
                </label>
                <span className="text-[11px] text-indigo-600 font-mono">Custom Rules</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">
                Specify business policies, domain nuances, how to greet VIP accounts, and specific product guidelines.
              </p>
              <textarea
                rows={3}
                value={formData.businessInstructions}
                onChange={(e) => setFormData({ ...formData, businessInstructions: e.target.value })}
                className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                placeholder="Instruct your agent on company-specific business workflows..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-600" />
                  <span>Hierarchy Level 1: Platform System Instructions & Guardrails</span>
                </label>
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-mono">Managed Guardrails</span>
              </div>
              <textarea
                rows={2}
                value={formData.systemInstructions}
                onChange={(e) => setFormData({ ...formData, systemInstructions: e.target.value })}
                className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-700"
              />
            </div>
          </div>

          {/* Section 4: Greetings & Grounded Fallback */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Welcome Greeting Message</label>
              <textarea
                rows={2}
                value={formData.greetingMessage}
                onChange={(e) => setFormData({ ...formData, greetingMessage: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Strict Fallback Message</label>
                <span className="text-[10px] text-indigo-600 font-semibold">Anti-Hallucination</span>
              </div>
              <textarea
                rows={2}
                value={formData.fallbackMessage}
                onChange={(e) => setFormData({ ...formData, fallbackMessage: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Section 5: Allowed Business Actions */}
          <div className="border-t border-slate-200 pt-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Hierarchy Level 5: Allowed Predefined Actions ({formData.allowedActions.length} enabled)</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  The agent can only invoke tools explicitly enabled in your company action catalog.
                </p>
              </div>
              <button
                onClick={() => setCurrentTab('actions')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Configure Action Schemas →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {actions.map(act => {
                const isAllowed = formData.allowedActions.includes(act.id);
                return (
                  <div
                    key={act.id}
                    onClick={() => {
                      const nextAllowed = isAllowed
                        ? formData.allowedActions.filter(id => id !== act.id)
                        : [...formData.allowedActions, act.id];
                      setFormData({ ...formData, allowedActions: nextAllowed });
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                      isAllowed 
                        ? 'border-indigo-300 bg-indigo-50/40 text-slate-900' 
                        : 'border-slate-200 bg-slate-50/50 text-slate-400 opacity-60'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold truncate">{act.name}</p>
                      <span className="text-[10px] font-mono text-slate-500">{act.code}</span>
                    </div>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                      isAllowed ? 'bg-indigo-600 text-white' : 'border border-slate-300'
                    }`}>
                      {isAllowed && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 6: Human Escalation Triggers */}
          <div className="border-t border-slate-200 pt-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                  <span>Human Escalation & Safe Handoff Triggers</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  When triggered, automated AI responses pause and your support staff is notified immediately.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="esc-toggle"
                  checked={formData.escalationSettings.enabled}
                  onChange={(e) => setFormData({
                    ...formData,
                    escalationSettings: { ...formData.escalationSettings, enabled: e.target.checked }
                  })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="esc-toggle" className="text-xs font-semibold text-slate-700">Enable Escalation</label>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Trigger Keywords</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {formData.escalationSettings.triggerKeywords.map((kw, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 bg-white border border-slate-300 rounded-md text-slate-700">
                      <span>{kw}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(kw)}
                        className="hover:text-rose-600 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddKeyword(); } }}
                    placeholder="Type keyword (e.g. lawsuit, supervisor, bug) and press Enter"
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddKeyword}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-medium"
                  >
                    Add Keyword
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">On-Call Escalation Email</label>
                  <input
                    type="email"
                    value={formData.escalationSettings.notifyEmail}
                    onChange={(e) => setFormData({
                      ...formData,
                      escalationSettings: { ...formData.escalationSettings, notifyEmail: e.target.value }
                    })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Escalation Handover Message</label>
                  <input
                    type="text"
                    value={formData.escalationSettings.escalationMessage}
                    onChange={(e) => setFormData({
                      ...formData,
                      escalationSettings: { ...formData.escalationSettings, escalationMessage: e.target.value }
                    })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer save bar */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Active Production Version: <strong>v{currentVersionNumber}.0</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveDraft}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              {isSaved ? <Check className="w-4 h-4 text-emerald-600" /> : <Save className="w-4 h-4" />}
              <span>{isSaved ? 'Draft Saved' : 'Save Draft'}</span>
            </button>
            <button
              onClick={() => setIsPublishModalOpen(true)}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Publish as Version {currentVersionNumber + 1}.0</span>
            </button>
          </div>
        </div>
      </div>

      {/* Publish Version Modal */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">Publish Agent Version {currentVersionNumber + 1}.0</h3>
            <p className="text-xs text-slate-500 mb-4">
              Deploy your draft configuration directly to live traffic on your website widget and mobile apps.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Changelog / Release Summary</label>
                <textarea
                  rows={3}
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                  placeholder="Describe what changed (e.g. Updated tone, added support action tool, refined SLA rules)..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>Publishing replaces the active live production version. You can rollback to version {currentVersionNumber}.0 at any time.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-slate-100">
              <button
                onClick={() => setIsPublishModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handlePublishVersion}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm"
              >
                Deploy Version {currentVersionNumber + 1}.0 Live
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History & Rollback Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Agent Version History</h3>
                <p className="text-xs text-slate-500">Inspect historical configurations or instantly rollback.</p>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {versionHistory.map(v => (
                <div 
                  key={v.id} 
                  className={`p-4 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                    v.status === 'active' ? 'bg-indigo-50/50 border-indigo-200 ring-1 ring-indigo-500' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">Version {v.versionNumber}.0</span>
                      {v.status === 'active' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Active Live
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-400">
                          Archived
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">Published on: {v.publishedAt}</p>
                    <p className="text-slate-700 text-xs mt-1.5 leading-relaxed">{v.summary}</p>
                  </div>

                  {v.status !== 'active' && (
                    <button
                      onClick={() => handleRollback(v.versionNumber)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Rollback</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 text-right">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
