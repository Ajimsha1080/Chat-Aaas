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
  RotateCcw,
  X,
  ArrowLeft,
  Menu
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

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const currentNavTitle = navItems.find(n => n.id === currentDevTab)?.label || 'API Keys & Secrets';

  return (
    <div className="flex h-full w-full bg-slate-900 text-slate-100 overflow-hidden font-sans">
      {/* Mobile Sidebar Backdrop */}
      {isMobileNavOpen && (
        <div 
          onClick={() => setIsMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs md:hidden"
        />
      )}

      {/* 1. LEFT DEVELOPER SIDEBAR: Features on the SIDE */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 lg:w-72 bg-[#060911] text-slate-300 flex flex-col h-full shrink-0 border-r border-slate-800 select-none transition-transform duration-200 ${
        isMobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Brand Header */}
        <div className="p-4.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/30 shrink-0">
              <Code2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-bold text-white text-base tracking-tight block truncate">Dev Console</span>
              <span className="text-xs font-mono text-indigo-400 block truncate">{currentCompany.slug}</span>
            </div>
          </div>

          <button
            onClick={() => setIsMobileNavOpen(false)}
            className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feature Navigation List (On the SIDE) */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
          <div className="px-2.5 py-1 text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
            Developer APIs & Tools
          </div>
          {navItems.map(tab => {
            const Icon = tab.icon;
            const isActive = currentDevTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setCurrentDevTab(tab.id);
                  setIsMobileNavOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer group text-left ${
                  isActive 
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4.5 h-4.5 shrink-0 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'
                  }`} />
                  <span className="truncate">{tab.label}</span>
                </div>

                {tab.count !== undefined && (
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-md font-bold shrink-0 ml-1.5 ${
                    isActive ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div className="p-3.5 border-t border-slate-800 space-y-2.5 bg-[#04060c]">
          <button
            onClick={() => handleCopy(currentCompany.apiKey, 'sidebar-key')}
            className="w-full px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 rounded-xl text-xs font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {copiedKey === 'sidebar-key' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>Copy Live API Key</span>
          </button>

          <button
            onClick={() => window.location.reload()}
            className="w-full px-3.5 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 border border-indigo-500/30"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Workspace</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN RIGHT CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-900">
        {/* Top Header */}
        <header className="h-16 sm:h-18 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => setIsMobileNavOpen(true)}
              className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {currentNavTitle}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 hidden sm:block mt-0.5">
                Low-level REST endpoints, webhook callbacks, and runtime telemetry.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(currentCompany.apiKey, 'header-key')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs sm:text-sm font-mono flex items-center gap-2 transition-colors cursor-pointer"
            >
              {copiedKey === 'header-key' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>Copy API Key</span>
            </button>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* 1. API Keys Tab */}
      {currentDevTab === 'api-keys' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Live Production API Key</h3>
                <p className="text-xs sm:text-sm text-slate-500">Authenticate requests to the CoarAI REST API & Client Widget.</p>
              </div>
              <button
                onClick={regenerateApiKey}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Rotate Secret Key</span>
              </button>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 font-mono text-xs sm:text-sm space-y-4">
              <div>
                <span className="text-slate-500 text-xs font-bold block mb-1.5 uppercase tracking-wider">PUBLISHABLE CLIENT KEY</span>
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-800 font-medium">{currentCompany.apiKey}</span>
                  <button
                    onClick={() => handleCopy(currentCompany.apiKey, 'prod-pub-key')}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer"
                  >
                    {copiedKey === 'prod-pub-key' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-slate-500 text-xs font-bold block mb-1.5 uppercase tracking-wider">SECRET API TOKEN (KMS AES-256-GCM ENCRYPTED)</span>
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-medium">{currentCompany.apiSecretMasked}</span>
                  <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md font-bold uppercase">
                    Encrypted
                  </span>
                </div>
              </div>
            </div>

            {/* Scopes Table */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-2.5">Granted API Scopes</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { name: 'read:knowledge', desc: 'Query vector chunks & grounding docs', status: 'Allowed' },
                  { name: 'write:conversations', desc: 'Create sessions & send messages', status: 'Allowed' },
                  { name: 'execute:actions', desc: 'Trigger authorized business tools', status: 'Confirmation Gated' }
                ].map((s, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs sm:text-sm">
                    <div className="flex items-center justify-between font-mono font-bold text-indigo-600">
                      <span>{s.name}</span>
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{s.desc}</p>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Webhook Endpoints</h3>
              <p className="text-xs sm:text-sm text-slate-500">Receive real-time HTTPS POST callbacks when events occur in your tenant.</p>
            </div>
            <button
              onClick={() => setIsCreateWebhookOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Webhook Endpoint</span>
            </button>
          </div>

          <div className="space-y-3.5">
            {webhooks.map(wh => (
              <div key={wh.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-sm text-slate-900">{wh.url}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      {wh.status}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600">{wh.description}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {wh.events.map(ev => (
                      <span key={ev} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-mono font-medium">
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => handleTestWebhook(wh.id)}
                    disabled={testingWebhookId === wh.id}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Play className={`w-4 h-4 text-indigo-600 ${testingWebhookId === wh.id ? 'animate-spin' : ''}`} />
                    <span>{testingWebhookId === wh.id ? 'Sending...' : 'Test Ping'}</span>
                  </button>
                  <button
                    onClick={() => deleteWebhook(wh.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Create Webhook Modal */}
          {isCreateWebhookOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in">
                <h3 className="text-lg font-bold text-slate-900 mb-1">Add Webhook Endpoint</h3>
                <p className="text-sm text-slate-500 mb-5">Enter the HTTPS URL on your server where events should be sent.</p>
                <form onSubmit={handleCreateWebhookSubmit} className="space-y-4 text-sm">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Endpoint URL (HTTPS Required)</label>
                    <input
                      type="url"
                      required
                      value={newWebhookUrl}
                      onChange={e => setNewWebhookUrl(e.target.value)}
                      placeholder="https://api.yourdomain.com/webhooks/ai"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Description</label>
                    <input
                      type="text"
                      value={newWebhookDesc}
                      onChange={e => setNewWebhookDesc(e.target.value)}
                      placeholder="e.g. Sync live escalations with internal Slack"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setIsCreateWebhookOpen(false)}
                      className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer text-sm shadow-xs"
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
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Real-Time Request & Response Stream</h3>
                <p className="text-xs sm:text-sm text-slate-500">Live HTTP calls processed by the tenant runtime.</p>
              </div>
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Live Ingestion</span>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm font-mono">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase text-xs font-bold">
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Method</th>
                    <th className="pb-3">Endpoint</th>
                    <th className="pb-3">Latency</th>
                    <th className="pb-3">Source IP</th>
                    <th className="pb-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {apiLogs.map(log => (
                    <tr 
                      key={log.id} 
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                          log.statusCode === 200 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {log.statusCode}
                        </span>
                      </td>
                      <td className="py-3 font-bold text-slate-800">{log.method}</td>
                      <td className="py-3 text-slate-900 font-semibold truncate max-w-xs">{log.path}</td>
                      <td className="py-3 text-slate-600">{log.durationMs} ms</td>
                      <td className="py-3 text-slate-500">{log.ipAddress}</td>
                      <td className="py-3 text-right text-slate-500">{log.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Log Detail Inspector */}
            {selectedLog && (
              <div className="mt-5 p-5 bg-slate-900 text-slate-200 rounded-2xl font-mono text-xs sm:text-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="font-bold text-white text-sm sm:text-base">{selectedLog.method} {selectedLog.path}</span>
                  <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-white p-1 cursor-pointer">✕</button>
                </div>
                <div>
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">RESPONSE BODY:</span>
                  <pre className="mt-1.5 bg-slate-950 p-3.5 rounded-xl text-emerald-400 overflow-x-auto text-xs sm:text-sm">{selectedLog.responseBodyPreview}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Technical Integrations Tab */}
      {currentDevTab === 'integrations' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">Connected Data Connectors</h3>
            <p className="text-xs sm:text-sm text-slate-500 mb-5">Underlying authentication tokens and sync frequencies.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {integrations.map(intg => (
                <div key={intg.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-sm space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-base">{intg.name}</span>
                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                      intg.connected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {intg.connected ? 'Connected' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600">{intg.description}</p>
                  <div className="pt-2.5 border-t border-slate-200 font-mono text-xs text-slate-500 flex items-center justify-between">
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
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Immutable Version Snapshots & Rollback</h3>
                <p className="text-xs sm:text-sm text-slate-500">Every publish creates a freeze of prompts, actions, and knowledge grounding.</p>
              </div>
              <button
                onClick={() => publishAgentVersion('Manual Snapshot from Developer Console')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
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
                    className={`p-5 rounded-2xl border text-sm cursor-pointer transition-all ${
                      selectedVersion?.id === ver.id 
                        ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600' 
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="font-bold text-slate-900 text-base">{ver.versionLabel}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        isLive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isLive ? '● Production Live' : 'Archived'}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 line-clamp-2">{ver.description}</p>
                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 text-xs text-slate-500">
                      <span>Author: {ver.author}</span>
                    </div>

                    {!isLive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          rollbackAgentVersion(ver.id);
                        }}
                        className="w-full mt-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Rollback to v{ver.version}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected Version Inspector */}
            {selectedVersion && (
              <div className="mt-5 p-5 bg-slate-50 rounded-2xl border border-slate-200 text-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <h4 className="font-bold text-slate-900 text-base">Snapshot Diff: {selectedVersion.versionLabel}</h4>
                  <span className="text-xs text-slate-500 font-mono">ID: {selectedVersion.id}</span>
                </div>
                <div className="space-y-1.5">
                  {selectedVersion.diffSummary?.map((d: string, i: number) => (
                    <div key={i} className="font-mono text-xs sm:text-sm text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
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
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs max-w-3xl space-y-5 text-sm animate-in fade-in duration-150">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Low-Level AI Inference & Prompt Hyperparameters</h3>
            <p className="text-xs sm:text-sm text-slate-500">Fine-tune hallucination thresholds, temperature, and raw developer instructions.</p>
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-bold text-slate-800">Temperature / Sampling Variance ({currentCompany.agent.creativityLevel})</label>
                <span className="text-xs text-slate-500 font-mono">0.0 (Strict) - 1.0 (Creative)</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={currentCompany.agent.creativityLevel}
                onChange={e => updateAgentConfig({ creativityLevel: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1.5">Developer System Prompt Override</label>
              <textarea
                rows={4}
                value={currentCompany.agent.systemInstructions}
                onChange={e => updateAgentConfig({ systemInstructions: e.target.value })}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
              />
            </div>

            <div className="p-4.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-amber-900 text-xs sm:text-sm leading-relaxed">
                Changes to developer parameters apply immediately across all live production inference endpoints without requiring frontend restarts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 7. Developer SDK & Tools Tab */}
      {currentDevTab === 'dev-tools' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Code Generator & REST Snippets</h3>
                <p className="text-xs sm:text-sm text-slate-500">Query your AI employee programmatically from backend microservices.</p>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl">
                {(['curl', 'javascript', 'python'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setDevLanguage(lang)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold capitalize transition-all cursor-pointer ${
                      devLanguage === lang ? 'bg-white text-indigo-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-950 text-slate-200 p-5 rounded-2xl font-mono text-xs sm:text-sm relative">
              <button
                onClick={() => handleCopy(devLanguage === 'curl' ? `curl -X POST https://api.agentflow.ai/v1/chat/completions -H "Authorization: Bearer ${currentCompany.apiKey}" -d '{"messages":[{"role":"user","content":"Hello"}]}'` : 'code', 'snippet')}
                className="absolute top-3.5 right-3.5 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
              >
                {copiedKey === 'snippet' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
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
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Server-Sent Events (SSE) Live Stream Inspector</h3>
            <p className="text-xs sm:text-sm text-slate-500">Test real-time token streaming chunks directly in the browser.</p>
            <div className="flex items-center gap-2.5">
              <input
                type="text"
                value={sseTestInput}
                onChange={e => setSseTestInput(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
              />
              <button
                onClick={runSseSimulation}
                disabled={isSseStreaming}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Play className="w-4 h-4" />
                <span>{isSseStreaming ? 'Streaming...' : 'Run Stream'}</span>
              </button>
            </div>

            {sseOutput.length > 0 && (
              <div className="mt-4 p-5 bg-slate-900 text-slate-300 rounded-2xl font-mono text-xs sm:text-sm space-y-1.5">
                {sseOutput.map((c, i) => (
                  <div key={i} className="text-emerald-400">{c}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
          </div>
        </main>
      </div>
    </div>
  );
};
