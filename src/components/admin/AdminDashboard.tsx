import React, { useState } from 'react';
import { 
  Building2, 
  Bot, 
  CreditCard, 
  TrendingUp, 
  Activity, 
  HelpCircle, 
  HeartPulse, 
  ShieldAlert, 
  FileText, 
  Settings, 
  Search, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink,
  Lock,
  DollarSign,
  Users,
  Zap,
  ArrowUpRight,
  Database,
  Cpu
} from 'lucide-react';
import { useApp } from '../../context';
import { AdminNavigationTab } from '../../types';

export const AdminDashboard: React.FC = () => {
  const { 
    companies, 
    allPlans, 
    adminToggleCompanySuspension, 
    adminUpdatePlanPrice,
    switchCompany,
    setCurrentExperience,
    systemHealth,
    securityEvents,
    auditLogs,
    currentAdminTab,
    setCurrentAdminTab,
    showToast
  } = useApp();

  const [searchOrg, setSearchOrg] = useState('');
  const [supportOrgId, setSupportOrgId] = useState(companies[0]?.id || '');
  const [supportQuery, setSupportQuery] = useState('');
  const [supportDiagnosticOutput, setSupportDiagnosticOutput] = useState<any | null>(null);

  const totalTenants = companies.length;
  const activeAgents = companies.filter(c => c.agent.status === 'active' && !c.isSuspended).length;
  const totalPlatformMessages = companies.reduce((acc, c) => acc + c.stats.totalMessages, 0);
  const totalMRR = companies.reduce((acc, c) => {
    const plan = allPlans.find(p => p.id === c.planId);
    return acc + (plan ? plan.priceMonthlyINR : 0);
  }, 0);

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchOrg.toLowerCase()) || 
    c.domain.toLowerCase().includes(searchOrg.toLowerCase())
  );

  const handleRunDiagnostic = () => {
    const targetComp = companies.find(c => c.id === supportOrgId);
    if (!targetComp) return;
    setSupportDiagnosticOutput({
      tenantId: targetComp.id,
      tenantName: targetComp.name,
      agentHealth: targetComp.isSuspended ? 'Suspended' : 'Healthy (99.9%)',
      knowledgeChunksIndexed: targetComp.stats.knowledgeChunksUsed || 24,
      totalConversations: targetComp.stats.totalConversations,
      escalationRate: '11.4%',
      kmsEncryptionStatus: 'AES-256-GCM Envelope Verified',
      lastActive: '3 minutes ago'
    });
    showToast('Diagnostic Complete', `Diagnostic inspection completed for ${targetComp.name}.`, 'info');
  };

  const adminNavs: { id: AdminNavigationTab; label: string; icon: any; badge?: string }[] = [
    { id: 'overview', label: 'Platform Overview', icon: TrendingUp },
    { id: 'organizations', label: 'Organizations', icon: Building2, badge: `${totalTenants}` },
    { id: 'agents', label: 'Agent Fleet', icon: Bot, badge: `${activeAgents}` },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'revenue', label: 'Revenue & MRR', icon: DollarSign },
    { id: 'usage', label: 'Global Usage', icon: Activity },
    { id: 'support', label: 'Support & Diagnostics', icon: HelpCircle },
    { id: 'health', label: 'System Health', icon: HeartPulse, badge: '99.99%' },
    { id: 'security', label: 'Security & SSRF', icon: ShieldAlert },
    { id: 'audit', label: 'Audit Logs', icon: FileText },
    { id: 'settings', label: 'Platform Settings', icon: Settings }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>Platform Super Admin</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">Multi-Tenant Fleet Control Plane</span>
          </div>
          <h1 className="text-xl font-black text-white">SaaS Operator Administration</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Global management of organizations, subscription billing, system health, threat monitoring, and diagnostics.
          </p>
        </div>

        <button
          onClick={() => setCurrentExperience('customer')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
        >
          Exit to Customer Workspace
        </button>
      </div>

      {/* Horizontal Admin Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
        {adminNavs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentAdminTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentAdminTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive 
                  ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/20' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-rose-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 1. Overview Tab */}
      {currentAdminTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total Organizations', value: '1,284', sub: '+18% this month', icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'Active AI Employees', value: '936', sub: '72.8% active fleet', icon: Bot, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Monthly Conversations', value: '2.4M', sub: '99.4% resolution', icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Platform MRR', value: `₹${(totalMRR * 12).toLocaleString('en-IN')}`, sub: '18% GST compliant', icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'System Health', value: '99.99%', sub: 'Zero active outages', icon: HeartPulse, color: 'text-rose-600', bg: 'bg-rose-50' },
              { label: 'Failed Background Jobs', value: '23', sub: 'Auto-retried in queue', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' }
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-slate-500 font-medium">{stat.label}</span>
                    <div className={`p-1.5 rounded-lg ${stat.bg}`}>
                      <Icon className={`w-3.5 h-3.5 ${stat.color}`} />
                    </div>
                  </div>
                  <div className="text-xl font-black text-slate-900">{stat.value}</div>
                  <span className="text-[10px] text-slate-400 mt-1 block">{stat.sub}</span>
                </div>
              );
            })}
          </div>

          {/* Quick Organizations & System Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Recent Organizations</h3>
                  <p className="text-xs text-slate-500">Live tenant instances deployed across Mumbai & Frankfurt.</p>
                </div>
                <button
                  onClick={() => setCurrentAdminTab('organizations')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>View All</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px]">
                      <th className="pb-2">Company</th>
                      <th className="pb-2">Plan</th>
                      <th className="pb-2">AI Employee</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {companies.slice(0, 4).map(c => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-3">
                          <div className="font-bold text-slate-900">{c.name}</div>
                          <span className="text-[10px] text-slate-400 font-mono">{c.domain}</span>
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 uppercase">
                            {c.planId}
                          </span>
                        </td>
                        <td className="py-3 text-slate-700 font-medium">{c.agent.name}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.isSuspended ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {c.isSuspended ? 'Suspended' : 'Active'}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => {
                              switchCompany(c.id);
                              setCurrentExperience('customer');
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            Impersonate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Health Feed */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Infrastructure Health</h3>
              <div className="space-y-2 text-xs">
                {systemHealth.slice(0, 4).map((h, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{h.service}</p>
                      <span className="text-[10px] text-slate-400 font-mono">{h.latencyMs}ms latency</span>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                      {h.uptimePercent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Organizations Tab */}
      {currentAdminTab === 'organizations' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Tenant Workspaces Directory</h3>
                <p className="text-xs text-slate-500">Manage tenant isolation, plan assignments, and operational suspension.</p>
              </div>
              <div className="relative w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search tenant..."
                  value={searchOrg}
                  onChange={e => setSearchOrg(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px]">
                    <th className="pb-2">Organization</th>
                    <th className="pb-2">Industry</th>
                    <th className="pb-2">Plan</th>
                    <th className="pb-2">Messages</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Admin Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCompanies.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-3.5">
                        <div className="font-bold text-slate-900">{c.name}</div>
                        <span className="text-[10px] text-slate-400 font-mono">{c.domain}</span>
                      </td>
                      <td className="py-3.5 text-slate-600">{c.industry}</td>
                      <td className="py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 uppercase">
                          {c.planId}
                        </span>
                      </td>
                      <td className="py-3.5 font-semibold text-slate-700">{c.stats.totalMessages.toLocaleString()}</td>
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.isSuspended ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {c.isSuspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="py-3.5 text-right space-x-2">
                        <button
                          onClick={() => adminToggleCompanySuspension(c.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                            c.isSuspended 
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' 
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                          }`}
                        >
                          {c.isSuspended ? 'Activate' : 'Suspend'}
                        </button>
                        <button
                          onClick={() => {
                            switchCompany(c.id);
                            setCurrentExperience('customer');
                          }}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Log in
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. Agent Fleet Tab */}
      {currentAdminTab === 'agents' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Global AI Employee Fleet</h3>
            <p className="text-xs text-slate-500 mb-4">Real-time health, model routing, and error rates of deployed agents.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {companies.map(c => (
                <div key={c.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{c.agent.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Live (v3)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{c.name} • {c.agent.role}</p>
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Model: {c.agent.modelTier || 'Automatic'}</span>
                    <span>Tokens: {c.stats.tokensThisMonth.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Subscriptions Tab */}
      {currentAdminTab === 'subscriptions' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Subscription Tier Manager</h3>
            <p className="text-xs text-slate-500 mb-4">Set pricing in INR and plan features across the platform.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {allPlans.map(plan => (
                <div key={plan.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{plan.name}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-bold uppercase">
                      {plan.id}
                    </span>
                  </div>
                  <div className="text-xl font-black text-slate-900">
                    ₹{plan.priceMonthlyINR.toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-500">/mo</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{plan.description}</p>
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Included Volume:</span>
                    <span className="font-bold text-slate-900">{plan.maxConversationsMonth.toLocaleString()} conv/mo</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. Revenue Tab */}
      {currentAdminTab === 'revenue' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 animate-in fade-in duration-150">
          <h3 className="text-sm font-bold text-slate-900">Revenue & Tax Ledger (18% GST)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
              <span className="text-xs text-indigo-700 font-bold uppercase">Net Monthly Revenue (MRR)</span>
              <div className="text-2xl font-black text-indigo-950 mt-1">₹{(totalMRR * 12).toLocaleString('en-IN')}</div>
              <span className="text-[11px] text-indigo-600 mt-1 block">+22% month-over-month</span>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <span className="text-xs text-emerald-700 font-bold uppercase">Annual Run Rate (ARR)</span>
              <div className="text-2xl font-black text-emerald-950 mt-1">₹{(totalMRR * 144).toLocaleString('en-IN')}</div>
              <span className="text-[11px] text-emerald-600 mt-1 block">Projected 2026</span>
            </div>
            <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
              <span className="text-xs text-purple-700 font-bold uppercase">GST Tax Remittance</span>
              <div className="text-2xl font-black text-purple-950 mt-1">₹{Math.round(totalMRR * 12 * 0.18).toLocaleString('en-IN')}</div>
              <span className="text-[11px] text-purple-600 mt-1 block">Quarterly GST filing</span>
            </div>
          </div>
        </div>
      )}

      {/* 6. Global Usage Tab */}
      {currentAdminTab === 'usage' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 animate-in fade-in duration-150">
          <h3 className="text-sm font-bold text-slate-900">Platform-Wide Consumption</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-slate-500">Total Conversations</span>
              <div className="text-xl font-black text-slate-900 mt-1">2,410,920</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-slate-500">LLM Inference Tokens</span>
              <div className="text-xl font-black text-slate-900 mt-1">1.84 Billion</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-slate-500">Vector Chunks Indexed</span>
              <div className="text-xl font-black text-slate-900 mt-1">428,500</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-slate-500">Total Storage Bandwidth</span>
              <div className="text-xl font-black text-slate-900 mt-1">14.2 TB</div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Support & Diagnostics Tab */}
      {currentAdminTab === 'support' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Tenant Cross-Support Diagnostics Console</h3>
              <p className="text-xs text-slate-500">Authorized diagnostic tool to inspect tenant inference health with full audit logging.</p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={supportOrgId}
                onChange={e => setSupportOrgId(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                ))}
              </select>
              <button
                onClick={handleRunDiagnostic}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Run Health Diagnostic
              </button>
            </div>

            {supportDiagnosticOutput && (
              <div className="p-4 bg-slate-900 text-slate-200 rounded-2xl font-mono text-xs space-y-2">
                <div className="text-emerald-400 font-bold border-b border-slate-800 pb-2">
                  DIAGNOSTIC REPORT FOR: {supportDiagnosticOutput.tenantName} ({supportDiagnosticOutput.tenantId})
                </div>
                <pre className="text-slate-300 overflow-x-auto">{JSON.stringify(supportDiagnosticOutput, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. System Health Tab */}
      {currentAdminTab === 'health' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 animate-in fade-in duration-150">
          <h3 className="text-sm font-bold text-slate-900">Microservice Runtime & Queue Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {systemHealth.map((item, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{item.service}</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                    {item.uptimePercent}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{item.details}</p>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Latency: {item.latencyMs}ms</span>
                  <span>Checked: {item.lastCheck}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 9. Security & SSRF Tab */}
      {currentAdminTab === 'security' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Security Threat Monitor & Firewall Logs</h3>
              <p className="text-xs text-slate-500">SSRF crawler interceptors, KMS key rotation tracking, and rate limiter enforcement.</p>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
              SSRF Firewall Active
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {securityEvents.map(evt => (
              <div key={evt.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      evt.severity === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {evt.severity}
                    </span>
                    <span className="font-mono font-bold text-slate-900">{evt.type}</span>
                    <span className="text-slate-400 text-[11px]">Source IP: {evt.sourceIp}</span>
                  </div>
                  <p className="text-slate-600">{evt.description}</p>
                  <p className="text-[11px] text-emerald-700 font-semibold">{evt.actionTaken}</p>
                </div>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">{evt.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 10. Audit Logs Tab */}
      {currentAdminTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 animate-in fade-in duration-150">
          <h3 className="text-sm font-bold text-slate-900">Immutable Platform Audit Ledger</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px]">
                  <th className="pb-2">Time</th>
                  <th className="pb-2">Actor</th>
                  <th className="pb-2">Action</th>
                  <th className="pb-2">Details</th>
                  <th className="pb-2">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2.5 text-slate-400">{log.timestamp}</td>
                    <td className="py-2.5 font-bold text-slate-800">{log.actor}</td>
                    <td className="py-2.5 text-indigo-600 font-semibold">{log.action}</td>
                    <td className="py-2.5 text-slate-600 max-w-sm truncate">{log.details}</td>
                    <td className="py-2.5">
                      <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold ${
                        log.severity === 'critical' ? 'bg-rose-100 text-rose-800' : log.severity === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {log.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 11. Platform Settings Tab */}
      {currentAdminTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-2xl space-y-4 text-xs animate-in fade-in duration-150">
          <h3 className="text-sm font-bold text-slate-900">Platform-Wide Default Fallbacks & Throttles</h3>
          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Global Rate Limit per Tenant (Req / min)</label>
              <input type="number" defaultValue={1200} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Default Fallback Transfer Message</label>
              <input type="text" defaultValue="I want to ensure you get the best support. Let me transfer you to our human team." className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
            </div>
            <button
              onClick={() => showToast('Platform Settings Saved', 'Global defaults applied across all tenant clusters.', 'success')}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition-colors"
            >
              Save Platform Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
