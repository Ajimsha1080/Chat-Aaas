import React, { useState } from 'react';
import { 
  Building, 
  Users, 
  CreditCard, 
  Cpu, 
  ShieldCheck, 
  Key, 
  History, 
  Bot, 
  Check, 
  Copy, 
  UserPlus, 
  Download, 
  Sparkles,
  RefreshCw,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { useApp } from '../../context';
import { TeamMember, SubscriptionPlanId } from '../../types';
import { InvoiceModal } from '../common/InvoiceModal';

export const SettingsView: React.FC = () => {
  const { 
    currentCompany, 
    teamMembers, 
    addTeamMember, 
    auditLogs,
    allPlans,
    currentPlan,
    upgradeSubscription,
    invoices,
    regenerateApiKey,
    updateAgentConfig,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<'employee' | 'team' | 'billing' | 'models' | 'security' | 'api' | 'audit'>('employee');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamMember['role']>('support_agent');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Employee Form State
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

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    updateAgentConfig({
      name: agentName,
      role: agentRole,
      tone: agentTone,
      greetingMessage: agentGreeting,
      modelTier: modelTier as any
    });
    showToast('Employee Updated', 'AI Employee persona, role, and tone saved.', 'success');
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
      <div>
        <h1 className="text-xl font-bold text-slate-900">Settings & Administration</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure your AI Employee, team roles, billing plans, AI model routing, and enterprise security.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'employee', label: 'AI Employee', icon: Bot },
          { id: 'team', label: 'Team & RBAC', icon: Users, count: teamMembers.length },
          { id: 'billing', label: 'Billing & Plans', icon: CreditCard },
          { id: 'models', label: 'AI Model', icon: Cpu },
          { id: 'security', label: 'Security & Compliance', icon: ShieldCheck },
          { id: 'api', label: 'API & Webhooks', icon: Key },
          { id: 'audit', label: 'Audit Logs', icon: History, count: auditLogs.length }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 1. AI Employee Tab */}
      {activeTab === 'employee' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-3xl space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900">AI Employee Identity & Goals</h3>
            <p className="text-xs text-slate-500">Configure how your AI Employee introduces itself and represents your brand.</p>
          </div>

          <form onSubmit={handleSaveEmployee} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Employee Name</label>
                <input
                  type="text"
                  required
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Assigned Role</label>
                <input
                  type="text"
                  required
                  value={agentRole}
                  onChange={(e) => setAgentRole(e.target.value)}
                  placeholder="e.g. Customer Support Specialist"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Conversation Tone</label>
                <select
                  value={agentTone}
                  onChange={(e) => setAgentTone(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="professional">Professional & Helpful</option>
                  <option value="friendly">Friendly & Warm</option>
                  <option value="empathetic">Empathetic & Caring</option>
                  <option value="direct">Direct & Concise</option>
                  <option value="technical">Technical & Detailed</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Company Website</label>
                <input
                  type="text"
                  disabled
                  value={currentCompany.domain}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Default Welcome / Greeting Message</label>
              <textarea
                rows={3}
                required
                value={agentGreeting}
                onChange={(e) => setAgentGreeting(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
            >
              Save Employee Changes
            </button>
          </form>
        </div>
      )}

      {/* 2. Team & RBAC Tab */}
      {activeTab === 'team' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Team Members & Access Control</h3>
              <p className="text-xs text-slate-500">Manage who can take over live conversations and manage settings.</p>
            </div>
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite Team Member</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {teamMembers.map(member => (
              <div key={member.id} className="py-3 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">{member.name}</h4>
                  <p className="text-[11px] text-slate-400 font-mono">{member.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="capitalize font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {member.role.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
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
                  className={`bg-white rounded-2xl p-5 border flex flex-col justify-between transition-all ${
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
                    <ul className="mt-4 space-y-2 text-xs text-slate-600">
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span><strong>{plan.maxConversationsMonth.toLocaleString()}</strong> conversations/mo</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span><strong>1 Dedicated</strong> AI Employee</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => {
                      if (!isCurrent) upgradeSubscription(plan.id, currentCompany.billingCycle || 'monthly');
                    }}
                    disabled={isCurrent}
                    className={`w-full mt-5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
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

          {/* Invoices */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">GST Tax Invoices (18% GST Included)</h3>
            <div className="divide-y divide-slate-100 text-xs">
              {invoices.map(inv => (
                <div key={inv.id} className="py-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900">{inv.number}</h4>
                    <span className="text-[11px] text-slate-400 font-mono">{inv.date} � {inv.planName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900">₹{inv.amountINR.toLocaleString()}</span>
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Invoice</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. AI Model Selection Tab */}
      {activeTab === 'models' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-3xl space-y-4 text-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-900">AI Intelligence & Model Routing</h3>
            <p className="text-xs text-slate-500">The platform automatically routes tasks to the optimal model based on latency, complexity, and accuracy.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {[
              { id: 'automatic', name: 'Automatic (Recommended)', desc: 'Smart routing between fast and deep reasoning models.', badge: 'Best Performance' },
              { id: 'fast', name: 'Fast & Lightweight', desc: 'Ultra-low latency for instant greeting and basic FAQs.', badge: '< 300ms TTFT' },
              { id: 'balanced', name: 'Balanced', desc: 'Solid reasoning with high throughput and low token cost.', badge: 'Standard' },
              { id: 'advanced', name: 'Advanced Deep Reasoning', desc: 'Maximum policy comprehension for complex customer issues.', badge: 'Highest Accuracy' }
            ].map(tier => {
              const isSel = modelTier === tier.id;
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => {
                    setModelTier(tier.id as any);
                    updateAgentConfig({ modelTier: tier.id as any });
                    showToast('Model Tier Updated', `Switched to ${tier.name}.`, 'success');
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSel ? 'bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 text-xs">{tier.name}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {tier.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{tier.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Security & Compliance Tab */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-3xl space-y-4 text-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Enterprise Security & Compliance</h3>
            <p className="text-xs text-slate-500">Zero-trust cryptographic isolation and automated threat protection.</p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-emerald-950">Tenant Row-Level Cryptographic Boundary</h4>
                <p className="text-emerald-800 text-[11px] mt-0.5">
                  All 22 relational entities and pgvector embeddings are partitioned by your tenant ID (<code>{currentCompany.id}</code>). Cross-tenant retrieval is strictly blocked.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-900">SSRF Crawler Protection</h4>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  Website crawler automatically blocks loopback (127.0.0.1), RFC 1918 private subnets, and AWS/Cloud metadata endpoints.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-900">KMS AES-256-GCM Encryption at Rest</h4>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  Sensitive connector credentials, webhook secrets, and API tokens are encrypted with KMS master keys.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. API Keys & Webhooks Tab */}
      {activeTab === 'api' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-3xl space-y-4 text-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Live API Key & Webhook Endpoint</h3>
            <p className="text-xs text-slate-500">Authenticate API and webhook requests from your servers to your AI Employee.</p>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Live Secret Key</label>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  readOnly
                  value={currentCompany.apiKey}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-700"
                />
                <button
                  onClick={() => handleCopy(currentCompany.apiKey, 'apiKey')}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKey === 'apiKey' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'apiKey' ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={regenerateApiKey}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Rotate</span>
                </button>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Inbound Webhook URL</label>
              <input
                type="text"
                readOnly
                value={`https://api.agentflow.ai/api/v1/webhook/${currentCompany.id}`}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-700"
              />
            </div>
          </div>
        </div>
      )}

      {/* 7. Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Security Audit Trail</h3>
          <div className="divide-y divide-slate-100 text-xs">
            {auditLogs.map(log => (
              <div key={log.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-mono text-slate-400 text-[10px] mr-2">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <strong className="text-slate-800 font-bold">{log.action}:</strong> <span className="text-slate-600">{log.details}</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  log.severity === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {log.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Invite Team Member</h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-slate-400 font-bold cursor-pointer">?</button>
            </div>
            <form onSubmit={handleInvite} className="space-y-3 text-xs">
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
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold cursor-pointer"
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
