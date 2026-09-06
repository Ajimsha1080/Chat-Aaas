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
  Lock
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
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Settings & Administration</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure your AI assistant persona, team access control, billing subscription, and developer credentials.
          </p>
        </div>
      </div>

      {/* Streamlined Tabs (4 Essential Categories) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'assistant', label: 'AI Assistant', icon: Bot },
          { id: 'team', label: 'Team & Access', icon: Users, count: teamMembers.length },
          { id: 'billing', label: 'Billing & Plans', icon: CreditCard },
          { id: 'developer', label: 'Developer & Logs', icon: Terminal, count: auditLogs.length }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 1. AI Assistant Tab (Includes Persona + Model Routing) */}
      {activeTab === 'assistant' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs max-w-4xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">AI Assistant Persona & Intelligence</h3>
            <p className="text-xs text-slate-500">Configure how your AI Assistant introduces itself, represents your brand, and reasons through answers.</p>
          </div>

          <form onSubmit={handleSaveAssistant} className="space-y-6 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">Assistant Name</label>
                <input
                  type="text"
                  required
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">Assigned Role</label>
                <input
                  type="text"
                  required
                  value={agentRole}
                  onChange={(e) => setAgentRole(e.target.value)}
                  placeholder="e.g. Customer Support Specialist"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">Conversation Tone</label>
                <select
                  value={agentTone}
                  onChange={(e) => setAgentTone(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                >
                  <option value="professional">Professional & Helpful</option>
                  <option value="friendly">Friendly & Warm</option>
                  <option value="empathetic">Empathetic & Caring</option>
                  <option value="direct">Direct & Concise</option>
                  <option value="technical">Technical & Detailed</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">Company Website Domain</label>
                <input
                  type="text"
                  disabled
                  value={currentCompany.domain}
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1.5">Default Welcome / Greeting Message</label>
              <textarea
                rows={3}
                required
                value={agentGreeting}
                onChange={(e) => setAgentGreeting(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium"
              />
            </div>

            {/* AI Intelligence & Speed Tier */}
            <div className="pt-2 border-t border-slate-100">
              <label className="font-bold text-slate-800 block mb-1">AI Model Intelligence Tier</label>
              <p className="text-[11px] text-slate-500 mb-3">Choose the balance between response speed and deep multi-step reasoning.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: 'automatic', name: 'Automatic (Recommended)', desc: 'Smart routing between fast embeddings and deep reasoning.', badge: 'Best Performance' },
                  { id: 'fast', name: 'Fast & Lightweight', desc: 'Ultra-low latency (<300ms) for quick FAQs and greetings.', badge: '< 300ms TTFT' },
                  { id: 'balanced', name: 'Balanced', desc: 'High accuracy with low token consumption.', badge: 'Standard' },
                  { id: 'advanced', name: 'Advanced Deep Reasoning', desc: 'Maximum comprehension for complex technical troubleshooting.', badge: 'Highest Accuracy' }
                ].map(tier => {
                  const isSel = modelTier === tier.id;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setModelTier(tier.id as any)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSel ? 'bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900 text-xs">{tier.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSel ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
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
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Save Assistant Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Team & Access Tab */}
      {activeTab === 'team' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Team Members & Access Control (RBAC)</h3>
              <p className="text-xs text-slate-500">Manage support agents who can monitor conversations and take over chats live.</p>
            </div>
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Team Member</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {teamMembers.map(member => (
              <div key={member.id} className="py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{member.name}</h4>
                    <p className="text-[11px] text-slate-400 font-mono">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="capitalize font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs">
                    {member.role.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg">
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
                  className={`bg-white rounded-3xl p-6 border flex flex-col justify-between transition-all ${
                    isCurrent ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-sm text-slate-900 capitalize">{plan.name}</h4>
                      {isCurrent && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">₹{plan.priceMonthlyINR.toLocaleString()}</span>
                      <span className="text-xs text-slate-500">/mo</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{plan.description}</p>
                    <ul className="mt-4 space-y-2.5 text-xs text-slate-600">
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span><strong>{plan.maxConversationsMonth.toLocaleString()}</strong> conversations/mo</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span><strong>1 Dedicated</strong> AI Assistant</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Real-time Human Handoff</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => {
                      if (!isCurrent) upgradeSubscription(plan.id, currentCompany.billingCycle || 'monthly');
                    }}
                    disabled={isCurrent}
                    className={`w-full mt-6 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      isCurrent 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    {isCurrent ? 'Active Plan' : `Upgrade to ${plan.name}`}
                  </button>
                </div>
              );
            })}
          </div>

          {/* GST Invoices */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">GST Tax Invoices (18% GST Included)</h3>
            <div className="divide-y divide-slate-100 text-xs">
              {invoices.map(inv => (
                <div key={inv.id} className="py-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900">{inv.number}</h4>
                    <span className="text-[11px] text-slate-400 font-mono">{inv.date} · {inv.planName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900">₹{inv.amountINR.toLocaleString()}</span>
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Invoice</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Developer & Logs Tab (API Keys, Webhooks, Security Guarantees, Audit Logs) */}
      {activeTab === 'developer' && (
        <div className="space-y-6">
          {/* API Keys & Webhook Section */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">API Credentials & Webhooks</h3>
              <p className="text-xs text-slate-500">Authenticate API and webhook requests from your backend servers.</p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">Live Secret API Key</label>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    readOnly
                    value={currentCompany.apiKey}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-700"
                  />
                  <button
                    onClick={() => handleCopy(currentCompany.apiKey, 'apiKey')}
                    className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedKey === 'apiKey' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'apiKey' ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={regenerateApiKey}
                    className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Rotate Key</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">Inbound Webhook URL</label>
                <input
                  type="text"
                  readOnly
                  value={`https://api.chat-aaas.com/api/v1/webhook/${currentCompany.id}`}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-700"
                />
              </div>
            </div>

            {/* Subtle Security Guarantees Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-xs text-emerald-950">Tenant Row-Level Isolation</h5>
                  <p className="text-[10px] text-emerald-800 mt-0.5">Partitioned pgvector embeddings & tables</p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-xs text-slate-900">AES-256 KMS Encryption</h5>
                  <p className="text-[10px] text-slate-500 mt-0.5">Encrypted API tokens and connector keys</p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-xs text-slate-900">SSRF Crawler Protection</h5>
                  <p className="text-[10px] text-slate-500 mt-0.5">Blocks private IP & cloud metadata</p>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Logs Section */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Security & Administration Audit Trail</h3>
                <p className="text-xs text-slate-500">Live chronological logs of settings changes, team invites, and security events.</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {auditLogs.map(log => (
                <div key={log.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-400 text-[10px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <div>
                      <strong className="text-slate-800 font-bold">{log.action}: </strong>
                      <span className="text-slate-600">{log.details}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                    log.severity === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
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
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Invite Team Member</h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleInvite} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="jane@company.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
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
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold cursor-pointer shadow-xs"
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
