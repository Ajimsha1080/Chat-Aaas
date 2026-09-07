import React, { useState } from 'react';
import { 
  Users, 
  CreditCard, 
  ShieldCheck, 
  Bot, 
  Check, 
  Copy, 
  UserPlus, 
  Download, 
  RefreshCw,
  Sparkles,
  Terminal,
  Lock,
  Eye,
  EyeOff,
  History
} from 'lucide-react';
import { useApp } from '../../context';
import { TeamMember } from '../../types';
import { InvoiceModal } from '../common/InvoiceModal';

export const SettingsView: React.FC = () => {
  const { 
    currentCompany, 
    teamMembers, 
    addTeamMember, 
    auditLogs,
    allPlans,
    upgradeSubscription,
    invoices,
    regenerateApiKey,
    updateAgentConfig,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<'assistant' | 'team' | 'billing' | 'developer'>('assistant');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamMember['role']>('support_agent');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  // Assistant Form State
  const [agentName, setAgentName] = useState(currentCompany.agent.name);
  const [agentRole, setAgentRole] = useState(currentCompany.agent.role || 'Customer Support Specialist');
  const [agentTone, setAgentTone] = useState(currentCompany.agent.tone);
  const [agentGreeting, setAgentGreeting] = useState(currentCompany.agent.greetingMessage);
  const [modelTier, setModelTier] = useState(currentCompany.agent.modelTier || 'automatic');

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSaveAssistant = (e: React.FormEvent) => {
    e.preventDefault();
    updateAgentConfig({
      name: agentName,
      role: agentRole,
      tone: agentTone,
      greetingMessage: agentGreeting,
      modelTier: modelTier as any
    });
    showToast('Assistant Updated', 'AI Assistant persona, role, model, and tone saved.', 'success');
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) return;
    addTeamMember(inviteName, inviteEmail, inviteRole);
    setIsInviteModalOpen(false);
    setInviteName('');
    setInviteEmail('');
    showToast('Member Invited', `Invited ${inviteName} as ${inviteRole.replace('_', ' ')}.`, 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Settings & Administration</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Configure assistant persona, team access control, billing subscription, and developer credentials.
          </p>
        </div>
      </div>

      {/* Streamlined Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { id: 'assistant', label: 'AI Assistant', icon: Bot },
          { id: 'team', label: 'Team & Access', icon: Users, count: teamMembers.length },
          { id: 'billing', label: 'Billing & Plans', icon: CreditCard },
          { id: 'developer', label: 'Developer & Security', icon: Terminal, count: auditLogs.length }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
                isActive
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-xs font-mono px-2 py-0.5 rounded-md font-semibold ${
                  isActive ? 'bg-slate-100 text-slate-900' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 1. AI Assistant Tab */}
      {activeTab === 'assistant' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-sm max-w-4xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Persona & Model Intelligence</h3>
            <p className="text-sm text-slate-500 mt-0.5">Configure how your AI Assistant introduces itself and reasons through answers.</p>
          </div>

          <form onSubmit={handleSaveAssistant} className="space-y-5 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-800 block mb-1.5">Assistant Name</label>
                <input
                  type="text"
                  required
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-900 focus:border-slate-900 text-slate-900 font-medium focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1.5">Assigned Role</label>
                <input
                  type="text"
                  required
                  value={agentRole}
                  onChange={(e) => setAgentRole(e.target.value)}
                  placeholder="e.g. Customer Support Specialist"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-900 focus:border-slate-900 text-slate-900 font-medium focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-800 block mb-1.5">Conversation Tone</label>
                <select
                  value={agentTone}
                  onChange={(e) => setAgentTone(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                >
                  <option value="professional">Professional & Helpful</option>
                  <option value="friendly">Friendly & Warm</option>
                  <option value="empathetic">Empathetic & Caring</option>
                  <option value="direct">Direct & Concise</option>
                  <option value="technical">Technical & Detailed</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1.5">Company Website Domain</label>
                <input
                  type="text"
                  disabled
                  value={currentCompany.domain}
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1.5">Default Greeting Message</label>
              <textarea
                rows={3}
                required
                value={agentGreeting}
                onChange={(e) => setAgentGreeting(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-900 focus:border-slate-900 text-slate-900 focus:outline-hidden leading-relaxed"
              />
            </div>

            {/* AI Intelligence & Speed Tier */}
            <div className="pt-3 border-t border-slate-100">
              <label className="font-bold text-base text-slate-900 block mb-1">Model Intelligence Tier</label>
              <p className="text-xs sm:text-sm text-slate-500 mb-4">Choose the balance between response speed and deep multi-step reasoning.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[
                  { id: 'automatic', name: 'Automatic (Recommended)', desc: 'Smart routing between fast embeddings and deep reasoning.', badge: 'Optimal' },
                  { id: 'fast', name: 'Fast & Lightweight', desc: 'Ultra-low latency (<300ms) for quick FAQs and greetings.', badge: '< 300ms' },
                  { id: 'balanced', name: 'Balanced', desc: 'High accuracy with low token consumption.', badge: 'Standard' },
                  { id: 'advanced', name: 'Advanced Deep Reasoning', desc: 'Maximum comprehension for complex technical troubleshooting.', badge: 'Deep Reasoning' }
                ].map(tier => {
                  const isSel = modelTier === tier.id;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setModelTier(tier.id as any)}
                      className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                        isSel ? 'bg-slate-50 border-slate-900 ring-1 ring-slate-900 shadow-xs' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-slate-900 text-sm">{tier.name}</span>
                        <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-md ${
                          isSel ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {tier.badge}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{tier.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex justify-start">
              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer shadow-sm flex items-center gap-2"
              >
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Team & Access Tab */}
      {activeTab === 'team' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Team Members & Access Control (RBAC)</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Manage staff members who can monitor conversations and take over chats live.</p>
            </div>
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-sm self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Member</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-sm">
            {teamMembers.map(member => (
              <div key={member.id} className="py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{member.name}</h4>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="capitalize font-mono px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                    {member.role.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    {member.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Billing & Plans Tab */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {allPlans.map(plan => {
              const isCurrent = plan.id === currentCompany.planId;
              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-2xl p-6 border flex flex-col justify-between transition-all ${
                    isCurrent ? 'border-slate-900 ring-1 ring-slate-900 shadow-sm' : 'border-slate-200/90 shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <h4 className="font-bold text-base text-slate-900 capitalize">{plan.name}</h4>
                      {isCurrent && (
                        <span className="text-xs font-mono font-semibold px-2.5 py-0.5 bg-slate-100 text-slate-800 rounded-md border border-slate-200">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="mt-2.5 flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-bold text-slate-900">₹{plan.priceMonthlyINR.toLocaleString()}</span>
                      <span className="text-xs font-medium text-slate-500">/mo</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{plan.description}</p>
                    <ul className="mt-4 space-y-2.5 text-sm text-slate-700">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span><strong>{plan.maxConversationsMonth.toLocaleString()}</strong> chats/mo</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span><strong>1 Dedicated</strong> AI Assistant</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Real-time Live Handoff</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => {
                      if (!isCurrent) upgradeSubscription(plan.id, currentCompany.billingCycle || 'monthly');
                    }}
                    disabled={isCurrent}
                    className={`w-full mt-6 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                      isCurrent 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                        : 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm'
                    }`}
                  >
                    {isCurrent ? 'Active Plan' : `Upgrade to ${plan.name}`}
                  </button>
                </div>
              );
            })}
          </div>

          {/* GST Invoices */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">GST Invoices (18% Tax Inclusive)</h3>
            <div className="divide-y divide-slate-100 text-sm">
              {invoices.map(inv => (
                <div key={inv.id} className="py-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900">{inv.number}</h4>
                    <span className="text-xs text-slate-500 font-mono">{inv.date} · {inv.planName}</span>
                  </div>
                  <div className="flex items-center gap-3.5">
                    <span className="font-bold text-base text-slate-900">₹{inv.amountINR.toLocaleString()}</span>
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-sm font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Download className="w-4 h-4 text-slate-600" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Developer & Logs Tab */}
      {activeTab === 'developer' && (
        <div className="space-y-6">
          {/* API Keys & Webhook Section */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">API Credentials & Webhooks</h3>
              <p className="text-sm text-slate-500 mt-0.5">Authenticate API and webhook requests from your backend servers.</p>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="font-semibold text-slate-800 block mb-1.5">Live Secret API Key</label>
                <div className="flex items-center gap-2.5">
                  <div className="relative flex-1">
                    <input
                      type={showApiKey ? "text" : "password"}
                      readOnly
                      value={currentCompany.apiKey}
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm text-slate-800 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      title={showApiKey ? "Hide Secret Key" : "Reveal Secret Key"}
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    onClick={() => handleCopy(currentCompany.apiKey, 'apiKey')}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
                  >
                    {copiedKey === 'apiKey' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedKey === 'apiKey' ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={regenerateApiKey}
                    className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-600" />
                    <span>Rotate Key</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1.5">Inbound Webhook URL</label>
                <input
                  type="text"
                  readOnly
                  value={`https://api.chat-aaas.com/api/v1/webhook/${currentCompany.id}`}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm text-slate-800 font-medium"
                />
              </div>
            </div>

            {/* Subtle Security Guarantees Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-sm text-slate-900">Row-Level Tenant Isolation</h5>
                  <p className="text-xs text-slate-500 mt-0.5">Partitioned vector embeddings & tables</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                <Lock className="w-5 h-5 text-slate-700 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-sm text-slate-900">AES-256 Encryption</h5>
                  <p className="text-xs text-slate-500 mt-0.5">Encrypted API tokens and connector keys</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-slate-700 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-sm text-slate-900">SSRF Crawler Protection</h5>
                  <p className="text-xs text-slate-500 mt-0.5">Blocks private subnets & metadata endpoints</p>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Logs Section */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-700" />
                  <span>Audit Trail</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Chronological logs of settings changes, team invites, and security events.</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200 self-start sm:self-auto">
                {auditLogs.length} Events Recorded
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/80">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4 text-right">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map(log => {
                    // Safe timestamp parsing
                    let dateStr = 'Recent';
                    let timeStr = '--:--';
                    if (log.timestamp) {
                      const d = new Date(log.timestamp);
                      if (!isNaN(d.getTime())) {
                        dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                        timeStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                      } else {
                        timeStr = log.timestamp;
                        dateStr = 'Today';
                      }
                    }

                    // Prettify Action Badge
                    let badgeLabel = log.action.replace(/_/g, ' ');
                    let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                    if (log.action === 'AGENT_VERSION_PUBLISHED') {
                      badgeLabel = 'Version Published';
                      badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                    } else if (log.action === 'AGENT_CONFIG_UPDATED') {
                      badgeLabel = 'Config Updated';
                      badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                    } else if (log.action === 'API_KEY_ROTATED') {
                      badgeLabel = 'API Key Rotated';
                      badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                    } else if (log.action === 'TENANT_SWITCH') {
                      badgeLabel = 'Workspace Switch';
                      badgeColor = 'bg-purple-50 text-purple-700 border-purple-200';
                    } else if (log.action === 'TOOL_EXECUTE') {
                      badgeLabel = 'Tool Execution';
                      badgeColor = 'bg-cyan-50 text-cyan-700 border-cyan-200';
                    } else if (log.action === 'HUMAN_ESCALATION_TRIGGERED') {
                      badgeLabel = 'Escalation';
                      badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                    } else if (log.action === 'HUMAN_TAKEOVER') {
                      badgeLabel = 'Human Takeover';
                      badgeColor = 'bg-orange-50 text-orange-700 border-orange-200';
                    } else if (log.action === 'KNOWLEDGE_INDEXED') {
                      badgeLabel = 'Knowledge Indexed';
                      badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    }

                    // Clean details message
                    let cleanMsg = log.details;
                    if (cleanMsg && cleanMsg.includes('Updated AI assistant configuration fields:')) {
                      const fieldsCount = cleanMsg.replace('Updated AI assistant configuration fields:', '').split(',').length;
                      cleanMsg = `Updated AI assistant configuration (${fieldsCount} settings updated)`;
                    }

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex flex-col font-mono text-xs">
                            <span className="font-semibold text-slate-800">{timeStr}</span>
                            <span className="text-slate-400 text-[11px]">{dateStr}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${badgeColor}`}>
                            {badgeLabel}
                          </span>
                        </td>
                        <td className="py-3 px-4 min-w-[240px]">
                          <p className="text-slate-700 text-xs sm:text-sm font-normal leading-relaxed">
                            {cleanMsg}
                          </p>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-600 font-medium">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80 font-mono text-[11px]">
                            {log.actor || 'Current User'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span className={`text-[11px] px-2.5 py-0.5 rounded-md font-mono font-bold uppercase border ${
                            log.severity === 'critical'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : log.severity === 'warning'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {log.severity}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Invite Team Member</h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold text-lg">✕</button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4 text-sm">
              <div>
                <label className="font-semibold text-slate-800 block mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-900 focus:outline-hidden text-sm"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-800 block mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="jane@company.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-900 focus:outline-hidden text-sm"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-800 block mb-1.5">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-900 focus:outline-hidden text-sm font-medium"
                >
                  <option value="support_agent">Support Agent (Can Take Over Live Chats)</option>
                  <option value="admin">Admin (Manage Knowledge & Settings)</option>
                  <option value="viewer">Viewer (Read Only)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2.5 pt-3.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold cursor-pointer shadow-sm text-sm"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {selectedInvoice && (
        <InvoiceModal
          invoice={selectedInvoice}
          company={currentCompany}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
};
