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
  EyeOff
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
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">Settings & Administration</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure assistant persona, team access control, billing subscription, and developer credentials.
          </p>
        </div>
      </div>

      {/* Streamlined Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px">
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
              className={`px-3.5 py-2.5 text-xs font-medium flex items-center gap-2 whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
                isActive
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                  isActive ? 'bg-slate-100 text-slate-800' : 'bg-slate-100 text-slate-500'
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
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] max-w-4xl space-y-5">
          <div>
            <h3 className="text-xs font-semibold text-slate-900">Persona & Model Intelligence</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Configure how your AI Assistant introduces itself and reasons through answers.</p>
          </div>

          <form onSubmit={handleSaveAssistant} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Assistant Name</label>
                <input
                  type="text"
                  required
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 focus:border-slate-900 text-slate-900 font-medium focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Assigned Role</label>
                <input
                  type="text"
                  required
                  value={agentRole}
                  onChange={(e) => setAgentRole(e.target.value)}
                  placeholder="e.g. Customer Support Specialist"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 focus:border-slate-900 text-slate-900 font-medium focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Conversation Tone</label>
                <select
                  value={agentTone}
                  onChange={(e) => setAgentTone(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                >
                  <option value="professional">Professional & Helpful</option>
                  <option value="friendly">Friendly & Warm</option>
                  <option value="empathetic">Empathetic & Caring</option>
                  <option value="direct">Direct & Concise</option>
                  <option value="technical">Technical & Detailed</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Company Website Domain</label>
                <input
                  type="text"
                  disabled
                  value={currentCompany.domain}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="font-medium text-slate-700 block mb-1">Default Greeting Message</label>
              <textarea
                rows={3}
                required
                value={agentGreeting}
                onChange={(e) => setAgentGreeting(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 focus:border-slate-900 text-slate-900 focus:outline-hidden"
              />
            </div>

            {/* AI Intelligence & Speed Tier */}
            <div className="pt-2 border-t border-slate-100">
              <label className="font-medium text-slate-900 block mb-0.5">Model Intelligence Tier</label>
              <p className="text-[11px] text-slate-400 mb-3">Choose the balance between response speed and deep multi-step reasoning.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                      className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                        isSel ? 'bg-slate-50 border-slate-900 ring-1 ring-slate-900/10' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-900 text-xs">{tier.name}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                          isSel ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {tier.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{tier.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex justify-start">
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-2"
              >
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Team & Access Tab */}
      {activeTab === 'team' && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-semibold text-slate-900">Team Members & Access Control (RBAC)</h3>
              <p className="text-[11px] text-slate-400">Manage staff members who can monitor conversations and take over chats live.</p>
            </div>
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite Member</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {teamMembers.map(member => (
              <div key={member.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/60 flex items-center justify-center font-semibold text-slate-700 text-xs">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">{member.name}</h4>
                    <p className="text-[11px] text-slate-400 font-mono">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="capitalize font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] border border-slate-200/60">
                    {member.role.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
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
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
            {allPlans.map(plan => {
              const isCurrent = plan.id === currentCompany.planId;
              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-xl p-5 border flex flex-col justify-between transition-all ${
                    isCurrent ? 'border-slate-900 ring-1 ring-slate-900/10 shadow-xs' : 'border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-xs text-slate-900 capitalize">{plan.name}</h4>
                      {isCurrent && (
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-xl font-bold text-slate-900">₹{plan.priceMonthlyINR.toLocaleString()}</span>
                      <span className="text-xs text-slate-400">/mo</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{plan.description}</p>
                    <ul className="mt-3.5 space-y-2 text-xs text-slate-600">
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span><strong>{plan.maxConversationsMonth.toLocaleString()}</strong> chats/mo</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span><strong>1 Dedicated</strong> AI Assistant</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Real-time Live Handoff</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => {
                      if (!isCurrent) upgradeSubscription(plan.id, currentCompany.billingCycle || 'monthly');
                    }}
                    disabled={isCurrent}
                    className={`w-full mt-5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      isCurrent 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                        : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                    }`}
                  >
                    {isCurrent ? 'Active Plan' : `Upgrade to ${plan.name}`}
                  </button>
                </div>
              );
            })}
          </div>

          {/* GST Invoices */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-3.5">
            <h3 className="text-xs font-semibold text-slate-900">GST Invoices (18% Tax Inclusive)</h3>
            <div className="divide-y divide-slate-100 text-xs">
              {invoices.map(inv => (
                <div key={inv.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900">{inv.number}</h4>
                    <span className="text-[11px] text-slate-400 font-mono">{inv.date} · {inv.planName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-900">₹{inv.amountINR.toLocaleString()}</span>
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-md text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3 h-3 text-slate-500" />
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
        <div className="space-y-5">
          {/* API Keys & Webhook Section */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-slate-900">API Credentials & Webhooks</h3>
              <p className="text-[11px] text-slate-400">Authenticate API and webhook requests from your backend servers.</p>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Live Secret API Key</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showApiKey ? "text" : "password"}
                      readOnly
                      value={currentCompany.apiKey}
                      className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      title={showApiKey ? "Hide Secret Key" : "Reveal Secret Key"}
                    >
                      {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <button
                    onClick={() => handleCopy(currentCompany.apiKey, 'apiKey')}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                  >
                    {copiedKey === 'apiKey' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'apiKey' ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={regenerateApiKey}
                    className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3 h-3 text-slate-500" />
                    <span>Rotate Key</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Inbound Webhook URL</label>
                <input
                  type="text"
                  readOnly
                  value={`https://api.chat-aaas.com/api/v1/webhook/${currentCompany.id}`}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-700"
                />
              </div>
            </div>

            {/* Subtle Security Guarantees Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-xs text-slate-900">Row-Level Tenant Isolation</h5>
                  <p className="text-[10px] text-slate-400 mt-0.5">Partitioned vector embeddings & tables</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-xs text-slate-900">AES-256 Encryption</h5>
                  <p className="text-[10px] text-slate-400 mt-0.5">Encrypted API tokens and connector keys</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-xs text-slate-900">SSRF Crawler Protection</h5>
                  <p className="text-[10px] text-slate-400 mt-0.5">Blocks private subnets & metadata endpoints</p>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Logs Section */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-3.5">
            <div>
              <h3 className="text-xs font-semibold text-slate-900">Audit Trail</h3>
              <p className="text-[11px] text-slate-400">Chronological logs of settings changes, team invites, and security events.</p>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {auditLogs.map(log => (
                <div key={log.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-slate-400 text-[10px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <div>
                      <strong className="text-slate-800 font-medium">{log.action}: </strong>
                      <span className="text-slate-500">{log.details}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase ${
                    log.severity === 'warning' ? 'bg-amber-50 text-amber-800 border border-amber-200/60' : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                  }`}>
                    {log.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Invite Team Member</h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleInvite} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="font-medium text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="jane@company.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="font-medium text-slate-700 block mb-1">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                >
                  <option value="support_agent">Support Agent (Can Take Over Live Chats)</option>
                  <option value="admin">Admin (Manage Knowledge & Settings)</option>
                  <option value="viewer">Viewer (Read Only)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium cursor-pointer shadow-xs"
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
