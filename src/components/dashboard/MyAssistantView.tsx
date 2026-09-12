import React, { useState, useEffect } from 'react';
import { 
  Play, 
  PauseCircle, 
  Sliders, 
  BookOpen, 
  Save, 
  Check, 
  MessageSquare,
  UploadCloud,
  FileText,
  Power,
  Archive,
  Trash2,
  AlertTriangle,
  GitBranch
} from 'lucide-react';
import { useApp } from '../../context';
import { AgentTone, AgentConfig } from '../../types';
import { GlobalActionMenu, ActionMenuItem } from '../common/GlobalActionMenu';
import { DeleteConfirmationModal } from '../common/DeleteConfirmationModal';
import { APIClient } from '../../api/apiClient';

export const MyAssistantView: React.FC = () => {
  const { 
    currentCompany, 
    updateAgentConfig, 
    toggleAgentStatus, 
    unpublishAgent,
    disableAgent,
    enableAgent,
    archiveAgent,
    deleteAgent,
    setIsQuickTestOpen, 
    knowledgeItems, 
    publishAgentVersion,
    showToast,
    setCurrentTab
  } = useApp();

  const [activeTab, setActiveTab] = useState<'identity' | 'messaging' | 'knowledge_summary'>('identity');

  // Local form state for draft edits
  const [editingCompanyId, setEditingCompanyId] = useState(currentCompany?.id);
  const [formState, setFormState] = useState<AgentConfig>(() => ({ ...(currentCompany?.agent || {}) } as AgentConfig));
  const [isSaving, setIsSaving] = useState(false);

  // Safety & Confirmation modal states
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [dependencies, setDependencies] = useState<string[]>([]);

  const isLive = currentCompany?.agent?.status === 'active';
  const lifecycle = currentCompany?.agent?.lifecycleStatus || 'published';
  const publishedVer = currentCompany?.agent?.publishedVersionNumber || 12;
  const draftVer = currentCompany?.agent?.draftVersionNumber || (publishedVer + 1);
  const hasUnpublishedChanges = lifecycle === 'draft' || draftVer > publishedVer;

  if (editingCompanyId !== currentCompany?.id) {
    setEditingCompanyId(currentCompany?.id);
    setFormState({ ...(currentCompany?.agent || {}) } as AgentConfig);
  }

  // Fetch live dependencies for safety checks
  useEffect(() => {
    const fetchDeps = async () => {
      try {
        const res = await APIClient.getAgentDependencies();
        if (res && res.dependencies) {
          const list: string[] = [];
          if (res.dependencies.deployments) {
            res.dependencies.deployments.forEach((d: any) => list.push(`${d.name} (${d.channel})`));
          }
          if (res.dependencies.integrations) {
            res.dependencies.integrations.forEach((i: any) => list.push(`${i.name} Integration`));
          }
          if (res.dependencies.apiKeys) {
            res.dependencies.apiKeys.forEach((k: any) => list.push(`API Key: ${k.name}`));
          }
          setDependencies(list.length > 0 ? list : ['Production Website Widget (https://techflow.io)', 'Mobile App REST API Integration', 'Active Customer Chat Sessions']);
        }
      } catch {
        setDependencies(['Production Website Widget (https://techflow.io)', 'Mobile App REST API Integration', 'Active Customer Chat Sessions']);
      }
    };
    fetchDeps();
  }, [currentCompany?.id]);

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

  const indexedSourcesCount = knowledgeItems.filter(k => k.status === 'indexed' && k.lifecycleState !== 'trash' && k.lifecycleState !== 'disabled').length;

  const actionMenuItems: ActionMenuItem[] = [
    {
      label: 'Test in Playground',
      icon: Play,
      onClick: () => setIsQuickTestOpen(true)
    },
    {
      label: 'Publish Changes to Live',
      icon: UploadCloud,
      disabled: lifecycle === 'published' && !hasUnpublishedChanges,
      onClick: () => publishAgentVersion('Published live production update')
    },
    {
      label: 'Unpublish to Draft',
      icon: FileText,
      disabled: lifecycle === 'draft',
      onClick: unpublishAgent
    },
    {
      label: lifecycle === 'disabled' ? 'Enable Assistant' : 'Disable Assistant',
      icon: Power,
      onClick: () => {
        if (lifecycle === 'disabled') {
          enableAgent();
        } else {
          setIsDisableModalOpen(true);
        }
      }
    },
    {
      label: 'Archive Assistant',
      icon: Archive,
      disabled: lifecycle === 'archived',
      onClick: archiveAgent
    },
    {
      label: 'Delete Assistant',
      icon: Trash2,
      variant: 'destructive',
      onClick: () => setIsDeleteModalOpen(true)
    }
  ];

  const renderLifecycleBadge = () => {
    switch (lifecycle) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Published (v{publishedVer})
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Draft (v{draftVer})
          </span>
        );
      case 'disabled':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Disabled
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Archived
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
            {lifecycle}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Version Comparison & Promotion Banner */}
      {hasUnpublishedChanges && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50/50 border border-blue-200/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-blue-950">Draft v{draftVer} has unreleased modifications</span>
                <span className="text-xs bg-white text-blue-800 border border-blue-200 font-mono font-semibold px-2 py-0.5 rounded-md">
                  Live: v{publishedVer}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-blue-800/80 mt-0.5">
                Modifications are isolated in draft mode. Test your draft before promoting it to production traffic.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsQuickTestOpen(true)}
              className="px-3.5 py-2 bg-white hover:bg-blue-50 text-blue-900 border border-blue-200 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Test Draft</span>
            </button>
            <button
              onClick={() => publishAgentVersion('Promoted draft to production')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Publish Changes</span>
            </button>
          </div>
        </div>
      )}

      {/* Disabled Banner */}
      {lifecycle === 'disabled' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-900 font-medium">
              This assistant is currently <strong>disabled</strong>. Active deployments return: <em>"The AI assistant is currently unavailable on this deployment."</em>
            </p>
          </div>
          <button
            onClick={enableAgent}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0"
          >
            Re-enable Now
          </button>
        </div>
      )}

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
              lifecycle === 'published' && isLive ? 'bg-emerald-500' : 'bg-amber-500'
            }`} />
          </div>

          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{formState.name}</h1>
              {renderLifecycleBadge()}
            </div>

            <p className="text-slate-600 text-sm sm:text-base mt-1.5 max-w-3xl leading-relaxed">
              {formState.description || `AI Q&A Assistant trained on ${currentCompany.name}'s verified business knowledge.`}
            </p>

            <div className="flex items-center gap-3 mt-2.5 text-xs sm:text-sm text-slate-500 flex-wrap">
              <span>Tone: <strong className="text-slate-800 capitalize font-semibold">{formState.tone}</strong></span>
              <span>·</span>
              <span>Knowledge: <strong className="text-slate-800 font-semibold">{indexedSourcesCount} Sources Active</strong></span>
              <span>·</span>
              <span>Deployments: <strong className="text-slate-800 font-semibold">Widget, React, API</strong></span>
            </div>
          </div>
        </div>

        {/* Action Controls & Enterprise 3-Dot Menu */}
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

          <GlobalActionMenu items={actionMenuItems} />
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
                  onClick={() => {
                    setFormState(prev => ({ ...prev, tone: t.id }));
                    updateAgentConfig({ tone: t.id });
                  }}
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

      {/* Disable Confirmation Modal with Dependency Warning */}
      <DeleteConfirmationModal
        isOpen={isDisableModalOpen}
        title={`Disable ${formState.name}?`}
        resourceName={formState.name}
        confirmText="DISABLE"
        destructiveActionLabel="Disable Assistant"
        dependencies={dependencies}
        consequences={[
          'AI responses will be paused immediately across all connected channels.',
          'Visitors calling the chat widget will receive an assistant unavailable notice.',
          'API integrations sending completion requests will return HTTP 403 or fallback refusal.',
          'No assistant data or configuration will be erased.'
        ]}
        onConfirm={async () => {
          await disableAgent();
          setIsDisableModalOpen(false);
        }}
        onClose={() => setIsDisableModalOpen(false)}
      />

      {/* Delete Confirmation Modal with Dependency Warning */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        title={`Permanently Delete ${formState.name}?`}
        resourceName={formState.name}
        confirmText="DELETE"
        isPermanent={true}
        destructiveActionLabel="Delete Assistant"
        dependencies={dependencies}
        consequences={[
          'All assistant prompts, configurations, and version history will be wiped permanently.',
          'Active deployments will be disconnected and cease functioning immediately.',
          'This action is irreversible and cannot be undone.'
        ]}
        onConfirm={async () => {
          await deleteAgent();
          setIsDeleteModalOpen(false);
        }}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
};
