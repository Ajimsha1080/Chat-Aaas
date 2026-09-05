import React, { useState } from 'react';
import { 
  Key, 
  Webhook, 
  Terminal, 
  Layers, 
  GitBranch, 
  Cpu, 
  Code2, 
  Copy, 
  Check, 
  RefreshCw, 
  Play, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { useApp } from '../../context';
import { DeveloperNavigationTab } from '../../types';

export const DeveloperConsole: React.FC = () => {
  const { 
    currentDevTab, 
    setCurrentDevTab, 
    currentCompany, 
    regenerateApiKey, 
    webhooks, 
    createWebhook, 
    deleteWebhook, 
    triggerTestWebhook, 
    apiLogs, 
    agentVersions, 
    rollbackAgentVersion, 
    publishAgentVersion,
    integrations, 
    updateAgentConfig
  } = useApp();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isCreateWebhookOpen, setIsCreateWebhookOpen] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookDesc, setNewWebhookDesc] = useState('');
  const [newWebhookEvents] = useState<string[]>(['conversation.started', 'handoff.triggered']);
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<any | null>(agentVersions[0] || null);
  const [devLanguage, setDevLanguage] = useState<'curl' | 'javascript' | 'python'>('curl');
  const [sseTestInput, setSseTestInput] = useState('How do I scale cluster pods?');
  const [sseOutput, setSseOutput] = useState<string[]>([]);
  const [isSseStreaming, setIsSseStreaming] = useState(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateWebhookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookUrl) return;
    createWebhook(newWebhookUrl, newWebhookDesc || 'Production webhook', newWebhookEvents);
    setIsCreateWebhookOpen(false);
    setNewWebhookUrl('');
    setNewWebhookDesc('');
  };

  const handleTestWebhook = async (id: string) => {
    setTestingWebhookId(id);
    await triggerTestWebhook(id);
    setTestingWebhookId(null);
  };

  const runSseSimulation = () => {
    setIsSseStreaming(true);
    setSseOutput([]);
    const chunks = [
      'data: {"id":"chat-1","object":"chat.completion.chunk","choices":[{"delta":{"role":"assistant"}}]}\n\n',
      'data: {"id":"chat-1","choices":[{"delta":{"content":"To scale your "}}]}\n\n',
      'data: {"id":"chat-1","choices":[{"delta":{"content":"Kubernetes cluster pods in "}}]}\n\n',
      'data: {"id":"chat-1","choices":[{"delta":{"content":"TechFlow Cloud, you can use "}}]}\n\n',
      'data: {"id":"chat-1","choices":[{"delta":{"content":"kubectl scale deployment or "}}]}\n\n',
      'data: {"id":"chat-1","choices":[{"delta":{"content":"enable Horizontal Pod Autoscaling (HPA)."}}]}\n\n',
      'data: [DONE]\n\n'
    ];
    let idx = 0;
    const interval = setInterval(() => {
      if (idx < chunks.length) {
        setSseOutput(prev => [...prev, chunks[idx]]);
        idx++;
      } else {
        clearInterval(interval);
        setIsSseStreaming(false);
      }
    }, 200);
  };

  const navItems: { id: DeveloperNavigationTab; label: string; icon: any; count?: number }[] = [
    { id: 'api-keys', label: 'API Keys & Secrets', icon: Key },
    { id: 'webhooks', label: 'Webhooks & Events', icon: Webhook, count: webhooks.length },
    { id: 'api-logs', label: 'Real-Time API Logs', icon: Terminal, count: apiLogs.length },
    { id: 'integrations', label: 'Technical Integrations', icon: Layers, count: integrations.length },
    { id: 'agent-versions', label: 'Agent Versioning & Diff', icon: GitBranch, count: agentVersions.length },
    { id: 'advanced-ai', label: 'Advanced AI Runtime', icon: Cpu },
    { id: 'dev-tools', label: 'Developer SDK & Tools', icon: Code2 }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Developer & Advanced Console
            </span>
            <span className="text-xs text-slate-400 font-mono">Workspace: {currentCompany.slug}</span>
          </div>
          <h1 className="text-xl font-black text-white">Technical Infrastructure Control</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage raw REST APIs, webhook payloads, immutable agent version rollback, and low-level AI inference parameters.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleCopy(currentCompany.apiKey, 'header-key')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedKey === 'header-key' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy API Key</span>
          </button>
        </div>
      </div>

      {/* Secondary Horizontal Nav Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
        {navItems.map(tab => {
          const Icon = tab.icon;
          const isActive = currentDevTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentDevTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 1. API Keys Tab */}
      {currentDevTab === 'api-keys' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Live Production API Key</h3>
                <p className="text-xs text-slate-500">Authenticate requests to the Chat-AaaS REST API & Client Widget.</p>
              </div>
              <button
                onClick={regenerateApiKey}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Rotate Secret Key</span>
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-xs space-y-3">
              <div>
                <span className="text-slate-400 text-[11px] block mb-1">PUBLISHABLE CLIENT KEY</span>
                <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-800">{currentCompany.apiKey}</span>
                  <button
                    onClick={() => handleCopy(currentCompany.apiKey, 'prod-pub-key')}
                    className="p-1 hover:bg-slate-100 rounded text-slate-500"
                  >
                    {copiedKey === 'prod-pub-key' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block mb-1">SECRET API TOKEN (KMS AES-256-GCM ENCRYPTED)</span>
                <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500">{currentCompany.apiSecretMasked}</span>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold">
                    Encrypted
                  </span>
                </div>
              </div>
            </div>

            {/* Scopes Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 mb-2">Granted API Scopes</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { name: 'read:knowledge', desc: 'Query vector chunks & grounding docs', status: 'Allowed' },
                  { name: 'write:conversations', desc: 'Create sessions & send messages', status: 'Allowed' },
                  { name: 'execute:actions', desc: 'Trigger authorized business tools', status: 'Confirmation Gated' }
                ].map((s, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div className="flex items-center justify-between font-mono font-bold text-indigo-600">
                      <span>{s.name}</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Webhooks Tab */}
      {currentDevTab === 'webhooks' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Webhook Endpoints</h3>
              <p className="text-xs text-slate-500">Receive real-time HTTPS POST callbacks when events occur in your tenant.</p>
            </div>
            <button
              onClick={() => setIsCreateWebhookOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Webhook Endpoint</span>
            </button>
          </div>

          <div className="space-y-3">
            {webhooks.map(wh => (
              <div key={wh.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-900">{wh.url}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {wh.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{wh.description}</p>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {wh.events.map(ev => (
                      <span key={ev} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-mono">
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleTestWebhook(wh.id)}
                    disabled={testingWebhookId === wh.id}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Play className={`w-3.5 h-3.5 text-indigo-600 ${testingWebhookId === wh.id ? 'animate-spin' : ''}`} />
                    <span>{testingWebhookId === wh.id ? 'Sending...' : 'Test Ping'}</span>
                  </button>
                  <button
                    onClick={() => deleteWebhook(wh.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Create Webhook Modal */}
          {isCreateWebhookOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in">
                <h3 className="text-base font-bold text-slate-900 mb-1">Add Webhook Endpoint</h3>
                <p className="text-xs text-slate-500 mb-4">Enter the HTTPS URL on your server where events should be sent.</p>
                <form onSubmit={handleCreateWebhookSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Endpoint URL (HTTPS Required)</label>
                    <input
                      type="url"
                      required
                      value={newWebhookUrl}
                      onChange={e => setNewWebhookUrl(e.target.value)}
                      placeholder="https://api.yourdomain.com/webhooks/ai"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={newWebhookDesc}
                      onChange={e => setNewWebhookDesc(e.target.value)}
                      placeholder="e.g. Sync live escalations with internal Slack"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setIsCreateWebhookOpen(false)}
                      className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer"
                    >
                      Save Webhook
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. API Logs Tab */}
      {currentDevTab === 'api-logs' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Real-Time Request & Response Stream</h3>
                <p className="text-xs text-slate-500">Live HTTP calls processed by the tenant runtime.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Live Ingestion</span>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px]">
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Method</th>
                    <th className="pb-2">Endpoint</th>
                    <th className="pb-2">Latency</th>
                    <th className="pb-2">Source IP</th>
                    <th className="pb-2 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {apiLogs.map(log => (
                    <tr 
                      key={log.id} 
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          log.statusCode === 200 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {log.statusCode}
                        </span>
                      </td>
                      <td className="py-2.5 font-bold text-slate-700">{log.method}</td>
                      <td className="py-2.5 text-slate-900 font-semibold truncate max-w-xs">{log.path}</td>
                      <td className="py-2.5 text-slate-500">{log.durationMs} ms</td>
                      <td className="py-2.5 text-slate-400">{log.ipAddress}</td>
                      <td className="py-2.5 text-right text-slate-400">{log.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Log Detail Inspector */}
            {selectedLog && (
              <div className="mt-4 p-4 bg-slate-900 text-slate-200 rounded-xl font-mono text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white">{selectedLog.method} {selectedLog.path}</span>
                  <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-white">✕</button>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">RESPONSE BODY:</span>
                  <pre className="mt-1 bg-slate-950 p-2.5 rounded text-emerald-400 overflow-x-auto">{selectedLog.responseBodyPreview}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Technical Integrations Tab */}
      {currentDevTab === 'integrations' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Connected Data Connectors</h3>
            <p className="text-xs text-slate-500 mb-4">Underlying authentication tokens and sync frequencies.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {integrations.map(intg => (
                <div key={intg.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{intg.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      intg.connected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {intg.connected ? 'Connected' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{intg.description}</p>
                  <div className="pt-2 border-t border-slate-200 font-mono text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Access: {intg.accessType}</span>
                    <span>Last Sync: {intg.lastSyncAt || 'Never'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. Agent Versioning Tab */}
      {currentDevTab === 'agent-versions' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Immutable Version Snapshots & Rollback</h3>
                <p className="text-xs text-slate-500">Every publish creates a freeze of prompts, actions, and knowledge grounding.</p>
              </div>
              <button
                onClick={() => publishAgentVersion('Manual Snapshot from Developer Console')}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Publish New Version Snapshot</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {agentVersions.map(ver => {
                const isLive = ver.status === 'live';
                return (
                  <div
                    key={ver.id}
                    onClick={() => setSelectedVersion(ver)}
                    className={`p-4 rounded-2xl border text-xs cursor-pointer transition-all ${
                      selectedVersion?.id === ver.id 
                        ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600' 
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-900 text-sm">{ver.versionLabel}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isLive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isLive ? '● Production Live' : 'Archived'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{ver.description}</p>
                    <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                      <span>Author: {ver.author}</span>
                    </div>

                    {!isLive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          rollbackAgentVersion(ver.id);
                        }}
                        className="w-full mt-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Rollback to v{ver.version}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected Version Inspector */}
            {selectedVersion && (
              <div className="mt-4 p-5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="font-bold text-slate-900">Snapshot Diff: {selectedVersion.versionLabel}</h4>
                  <span className="text-[11px] text-slate-400 font-mono">ID: {selectedVersion.id}</span>
                </div>
                <div className="space-y-1">
                  {selectedVersion.diffSummary?.map((d: string, i: number) => (
                    <div key={i} className="font-mono text-[11px] text-slate-700 bg-white p-2 rounded border border-slate-200">
                      {d}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Advanced AI Parameters Tab */}
      {currentDevTab === 'advanced-ai' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-3xl space-y-5 text-xs animate-in fade-in duration-150">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Low-Level AI Inference & Prompt Hyperparameters</h3>
            <p className="text-xs text-slate-500">Fine-tune hallucination thresholds, temperature, and raw developer instructions.</p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-700">Temperature / Sampling Variance ({currentCompany.agent.creativityLevel})</label>
                <span className="text-[10px] text-slate-400 font-mono">0.0 (Strict) - 1.0 (Creative)</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={currentCompany.agent.creativityLevel}
                onChange={e => updateAgentConfig({ creativityLevel: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Developer System Prompt Override</label>
              <textarea
                rows={4}
                value={currentCompany.agent.systemInstructions}
                onChange={e => updateAgentConfig({ systemInstructions: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white"
              />
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-amber-800 text-[11px] leading-relaxed">
                Changes to developer parameters apply immediately across all live production inference endpoints without requiring frontend restarts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 7. Developer SDK & Tools Tab */}
      {currentDevTab === 'dev-tools' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Code Generator & REST Snippets</h3>
                <p className="text-xs text-slate-500">Query your AI employee programmatically from backend microservices.</p>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {(['curl', 'javascript', 'python'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setDevLanguage(lang)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                      devLanguage === lang ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-950 text-slate-200 p-4 rounded-2xl font-mono text-xs relative">
              <button
                onClick={() => handleCopy(devLanguage === 'curl' ? `curl -X POST https://api.agentflow.ai/v1/chat/completions -H "Authorization: Bearer ${currentCompany.apiKey}" -d '{"messages":[{"role":"user","content":"Hello"}]}'` : 'code', 'snippet')}
                className="absolute top-3 right-3 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
              >
                {copiedKey === 'snippet' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              {devLanguage === 'curl' && (
                <pre className="text-emerald-400 overflow-x-auto whitespace-pre-wrap">{`curl -X POST https://api.agentflow.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${currentCompany.apiKey}" \\
  -d '{
    "model": "automatic",
    "stream": true,
    "messages": [
      { "role": "user", "content": "How do I upgrade my database plan?" }
    ]
  }'`}</pre>
              )}
              {devLanguage === 'javascript' && (
                <pre className="text-indigo-300 overflow-x-auto whitespace-pre-wrap">{`import { AgentClient } from '@aaas/node-sdk';

const client = new AgentClient({ apiKey: '${currentCompany.apiKey}' });

const response = await client.chat.create({
  messages: [{ role: 'user', content: 'How do I upgrade my database plan?' }]
});

console.log(response.choices[0].message.content);`}</pre>
              )}
              {devLanguage === 'python' && (
                <pre className="text-amber-300 overflow-x-auto whitespace-pre-wrap">{`import requests

url = "https://api.agentflow.ai/v1/chat/completions"
headers = {
    "Authorization": "Bearer ${currentCompany.apiKey}",
    "Content-Type": "application/json"
}
payload = {
    "messages": [{"role": "user", "content": "How do I upgrade my database plan?"}]
}

res = requests.post(url, json=payload, headers=headers)
print(res.json())`}</pre>
              )}
            </div>
          </div>

          {/* SSE Streaming Interactive Sandbox */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Server-Sent Events (SSE) Live Stream Inspector</h3>
            <p className="text-xs text-slate-500">Test real-time token streaming chunks directly in the browser.</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={sseTestInput}
                onChange={e => setSseTestInput(e.target.value)}
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
              <button
                onClick={runSseSimulation}
                disabled={isSseStreaming}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isSseStreaming ? 'Streaming...' : 'Run Stream'}</span>
              </button>
            </div>

            {sseOutput.length > 0 && (
              <div className="mt-3 p-4 bg-slate-900 text-slate-300 rounded-xl font-mono text-[11px] space-y-1">
                {sseOutput.map((c, i) => (
                  <div key={i} className="text-emerald-400">{c}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
