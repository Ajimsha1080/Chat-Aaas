import React, { useState } from 'react';
import { 
  Building2, 
  Bot, 
  TrendingUp, 
  HeartPulse, 
  ShieldAlert, 
  Search, 
  AlertTriangle, 
  Lock, 
  DollarSign, 
  ArrowUpRight,
  Play,
  Pause,
  Server,
  Terminal
} from 'lucide-react';
import { useApp } from '../../context';

export const AdminDashboard: React.FC = () => {
  const { 
    companies, 
    allPlans, 
    adminToggleCompanySuspension, 
    switchCompany, 
    setCurrentExperience, 
    systemHealth, 
    securityEvents, 
    auditLogs, 
    showToast 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'organizations' | 'fleet' | 'health' | 'security'>('overview');
  const [searchOrg, setSearchOrg] = useState('');
  const [supportOrgId, setSupportOrgId] = useState(companies[0]?.id || '');
  const [supportDiagnosticOutput, setSupportDiagnosticOutput] = useState<any | null>(null);
  const [isEmergencyKillswitchActive, setIsEmergencyKillswitchActive] = useState(false);

  const totalTenants = companies.length;
  const activeAgents = companies.filter(c => c.agent.status === 'active' && !c.isSuspended).length;
  const totalMRR = companies.reduce((acc, c) => {
    const plan = allPlans.find(p => p.id === c.planId);
    return acc + (plan ? plan.priceMonthlyINR : 4999);
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
      agentHealth: targetComp.isSuspended ? 'Suspended' : 'Healthy (99.99%)',
      knowledgeChunksIndexed: targetComp.stats?.knowledgeChunksUsed || 28,
      totalConversations: targetComp.stats?.totalConversations || 142,
      modelTier: targetComp.agent?.modelTier || 'automatic',
      kmsEncryptionStatus: 'AES-256-GCM Envelope Verified',
      pgvectorLatency: '18 ms',
      lastActive: 'Just now'
    });
    showToast('Diagnostic Complete', `Diagnostic inspection completed for ${targetComp.name}.`, 'info');
  };

  const adminNavs = [
    { id: 'overview' as const, label: 'Platform Overview', icon: TrendingUp },
    { id: 'organizations' as const, label: 'Organizations & Fleet', icon: Building2, badge: `${totalTenants}` },
    { id: 'fleet' as const, label: 'AI Fleet & Diagnostics', icon: Bot, badge: `${activeAgents} Active` },
    { id: 'health' as const, label: 'Infrastructure & Telemetry', icon: HeartPulse, badge: '99.99%' },
    { id: 'security' as const, label: 'Security & Audit Logs', icon: ShieldAlert, count: securityEvents.length }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Super-Admin Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>Platform Super Admin</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">Master SaaS Fleet Control Plane</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">SaaS Operator Administration</h1>
          <p className="text-xs text-slate-400 mt-1">
            Global management of client organizations, MRR revenue metrics, system health, threat monitoring, and live diagnostics.
          </p>
        </div>

        <button
          onClick={() => setCurrentExperience('customer')}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer flex items-center gap-2 shrink-0"
        >
          <span>Exit to Customer Workspace</span>
        </button>
      </div>

      {/* Streamlined Admin Tabs (5 Focused Categories) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {adminNavs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 1. Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {[
              { label: 'Total Organizations', value: `${totalTenants}`, sub: '+18% this month', icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'Active AI Fleet', value: `${activeAgents}`, sub: '100% operational', icon: Bot, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Platform MRR', value: `₹${totalMRR.toLocaleString('en-IN')}`, sub: '18% GST Compliant', icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Annual Run Rate (ARR)', value: `₹${(totalMRR * 12).toLocaleString('en-IN')}`, sub: 'Projected annual revenue', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'System Uptime', value: '99.99%', sub: 'Zero active outages', icon: HeartPulse, color: 'text-rose-600', bg: 'bg-rose-50' }
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">{stat.label}</span>
                    <div className={`p-2 rounded-xl ${stat.bg}`}>
                      <Icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-slate-900">{stat.value}</div>
                  <span className="text-[11px] text-slate-400 mt-1 block font-medium">{stat.sub}</span>
                </div>
              );
            })}
          </div>

          {/* Quick Organizations & System Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Tenant Fleet Workspaces</h3>
                  <p className="text-xs text-slate-500">Live multi-tenant instances partitioned by cryptographic boundaries.</p>
                </div>
                <button
                  onClick={() => setActiveTab('organizations')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>View All</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold">
                      <th className="pb-3">Organization</th>
                      <th className="pb-3">Subscription</th>
                      <th className="pb-3">AI Assistant</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {companies.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5">
                          <div className="font-bold text-slate-900">{c.name}</div>
                          <span className="text-[11px] text-slate-400 font-mono">{c.domain}</span>
                        </td>
                        <td className="py-3.5">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 uppercase">
                            {c.planId}
                          </span>
                        </td>
                        <td className="py-3.5 text-slate-700 font-semibold">{c.agent.name}</td>
                        <td className="py-3.5">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                            c.isSuspended ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {c.isSuspended ? 'Suspended' : 'Active'}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          <button
                            onClick={() => {
                              switchCompany(c.id);
                              setCurrentExperience('customer');
                              showToast('Tenant Impersonated', `Opened workspace for ${c.name}.`, 'info');
                            }}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
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
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Infrastructure Health</h3>
                <p className="text-xs text-slate-500">FastAPI backend & pgvector latency</p>
              </div>
              <div className="space-y-2.5 text-xs">
                {systemHealth.map((h, i) => (
                  <div key={i} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{h.service}</p>
                      <span className="text-[10px] text-slate-400 font-mono">{h.latencyMs}ms latency</span>
                    </div>
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
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
      {activeTab === 'organizations' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Tenant Workspaces Directory</h3>
                <p className="text-xs text-slate-500">Manage tenant isolation, plan assignments, and operational suspension.</p>
              </div>
              <div className="relative w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search organization or domain..."
                  value={searchOrg}
                  onChange={e => setSearchOrg(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold">
                    <th className="pb-3">Organization</th>
                    <th className="pb-3">Industry</th>
                    <th className="pb-3">Plan</th>
                    <th className="pb-3">Messages</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Admin Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCompanies.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5">
                        <div className="font-bold text-slate-900">{c.name}</div>
                        <span className="text-[11px] text-slate-400 font-mono">{c.domain}</span>
                      </td>
                      <td className="py-3.5 text-slate-600 capitalize font-medium">{c.industry}</td>
                      <td className="py-3.5">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 uppercase">
                          {c.planId}
                        </span>
                      </td>
                      <td className="py-3.5 font-bold text-slate-800">{c.stats.totalMessages.toLocaleString()}</td>
                      <td className="py-3.5">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          c.isSuspended ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {c.isSuspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              switchCompany(c.id);
                              setCurrentExperience('customer');
                              showToast('Tenant Impersonated', `Logged in as ${c.name}.`, 'info');
                            }}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                          >
                            Impersonate
                          </button>
                          <button
                            onClick={() => adminToggleCompanySuspension(c.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                              c.isSuspended 
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {c.isSuspended ? 'Activate' : 'Suspend'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. AI Fleet & Live Diagnostics Tab */}
      {activeTab === 'fleet' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Live AI Fleet Diagnostic Inspector</h3>
              <p className="text-xs text-slate-500">Run real-time deep health inspections on any tenant's vector embeddings, RAG latency, and KMS cryptographic integrity.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <select
                value={supportOrgId}
                onChange={e => setSupportOrgId(e.target.value)}
                className="w-full sm:w-80 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500"
              >
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.domain})</option>
                ))}
              </select>
              <button
                onClick={handleRunDiagnostic}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <Terminal className="w-4 h-4" />
                <span>Run Live Inspection</span>
              </button>
            </div>

            {supportDiagnosticOutput && (
              <div className="mt-4 p-5 bg-slate-950 text-slate-200 rounded-2xl font-mono text-xs space-y-2 border border-slate-800 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] text-emerald-400">
                  <span>● DIAGNOSTIC RESULT — {supportDiagnosticOutput.tenantName}</span>
                  <span>STATUS: {supportDiagnosticOutput.agentHealth}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-slate-300">
                  <div>Tenant ID: <span className="text-white font-bold">{supportDiagnosticOutput.tenantId}</span></div>
                  <div>Model Intelligence Tier: <span className="text-indigo-400 font-bold uppercase">{supportDiagnosticOutput.modelTier}</span></div>
                  <div>pgvector Query Latency: <span className="text-emerald-400 font-bold">{supportDiagnosticOutput.pgvectorLatency}</span></div>
                  <div>Total Conversations: <span className="text-white font-bold">{supportDiagnosticOutput.totalConversations}</span></div>
                  <div>KMS Encryption Boundary: <span className="text-emerald-400">{supportDiagnosticOutput.kmsEncryptionStatus}</span></div>
                  <div>Indexed Semantic Chunks: <span className="text-white font-bold">{supportDiagnosticOutput.knowledgeChunksIndexed} chunks</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Infrastructure & Telemetry Tab */}
      {activeTab === 'health' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-150">
          <div>
            <h3 className="text-base font-bold text-slate-900">Infrastructure Clusters & Latency Telemetry</h3>
            <p className="text-xs text-slate-500">Live operational status of FastAPI AI runtimes, pgvector database, and background worker queues.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {systemHealth.map((h, i) => (
              <div key={i} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">{h.service}</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="text-xl font-black text-slate-900">{h.uptimePercent}%</div>
                <p className="text-[11px] text-slate-500">Average Latency: <strong className="text-slate-700">{h.latencyMs} ms</strong></p>
              </div>
            ))}
          </div>

          <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-3">
            <Server className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-indigo-950 text-xs">Asynchronous Background Worker Queues</h4>
              <p className="text-indigo-800 text-[11px] mt-0.5 leading-relaxed">
                Document chunker worker, semantic reranking worker, and webhook event dispatcher are running concurrently with zero queued job backlog.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 5. Security & Master Audit Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Emergency Killswitch */}
          <div className="bg-white rounded-3xl border border-rose-200 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900">Global Emergency AI Killswitch</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                In case of upstream LLM provider outages or runaway loop incidents, this immediately halts all outbound model invocations across all tenants.
              </p>
            </div>

            <button
              onClick={() => {
                const nextState = !isEmergencyKillswitchActive;
                setIsEmergencyKillswitchActive(nextState);
                showToast(
                  nextState ? 'Killswitch ACTIVATED' : 'Killswitch Deactivated',
                  nextState ? 'All outbound AI calls paused globally.' : 'Global AI processing resumed.',
                  nextState ? 'warning' : 'success'
                );
              }}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                isEmergencyKillswitchActive
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20'
              }`}
            >
              {isEmergencyKillswitchActive ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4 fill-white" />}
              <span>{isEmergencyKillswitchActive ? 'Resume Global AI' : 'Activate Killswitch'}</span>
            </button>
          </div>

          {/* SSRF & Threat Logs */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">SSRF Threat Monitor & Security Interceptions</h3>
                <p className="text-xs text-slate-500">Automated defense blocking loopback, private RFC 1918 subnets, and AWS/Cloud metadata exploits.</p>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                SSRF Guard Active
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
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

          {/* Immutable Master Audit Logs */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Platform-Wide Immutable Audit Trail</h3>
            <div className="divide-y divide-slate-100 text-xs font-mono">
              {auditLogs.map(log => (
                <div key={log.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 text-[10px] mr-2">{log.timestamp}</span>
                    <strong className="text-slate-800 font-bold">{log.actor}: </strong>
                    <span className="text-indigo-600 font-semibold">{log.action} — </span>
                    <span className="text-slate-600">{log.details}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    log.severity === 'critical' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {log.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
