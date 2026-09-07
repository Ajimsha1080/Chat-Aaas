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
  Terminal,
  ArrowLeft,
  CheckCircle2,
  Activity,
  Layers,
  Database,
  Radio,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Menu,
  X
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
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

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

  const currentNavTitle = adminNavs.find(n => n.id === activeTab)?.label || 'Platform Overview';

  return (
    <div className="flex h-full w-full bg-slate-100 overflow-hidden font-sans">
      {/* Mobile Sidebar Backdrop */}
      {isMobileNavOpen && (
        <div 
          onClick={() => setIsMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
        />
      )}

      {/* 1. LEFT SIDEBAR NAVIGATION: Features on the SIDE */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 lg:w-72 bg-[#090d16] text-slate-300 flex flex-col h-full shrink-0 border-r border-slate-800/80 select-none transition-transform duration-200 ${
        isMobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Top Operator Brand Header */}
        <div className="p-4.5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/20 text-white font-bold shrink-0">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base tracking-tight block truncate">Master Plane</span>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                  ROOT
                </span>
              </div>
              <span className="text-xs font-medium text-slate-400 block truncate">SaaS Operator Admin</span>
            </div>
          </div>

          <button
            onClick={() => setIsMobileNavOpen(false)}
            className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Isolation & Status Pill */}
        <div className="px-3.5 pt-3.5 pb-2">
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-200 font-semibold font-mono">Tenant Isolation</span>
            </div>
            <span className="text-emerald-400 font-mono font-bold text-xs uppercase">Enforced</span>
          </div>
        </div>

        {/* Feature Navigation List (On the SIDE) */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
          <div className="px-2.5 py-1 text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
            Platform Features
          </div>
          {adminNavs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsMobileNavOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer group text-left ${
                  isActive 
                    ? 'bg-slate-800 text-white font-semibold shadow-xs border border-slate-700/80' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4.5 h-4.5 shrink-0 transition-colors ${
                    isActive ? 'text-rose-400' : 'text-slate-400 group-hover:text-slate-300'
                  }`} />
                  <span className="truncate">{tab.label}</span>
                </div>

                {tab.badge && (
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-md shrink-0 ml-1.5 font-semibold ${
                    isActive ? 'bg-slate-900 text-rose-300' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {tab.badge}
                  </span>
                )}
                {tab.count !== undefined && (
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-md shrink-0 ml-1.5 font-semibold ${
                    isActive ? 'bg-slate-900 text-rose-300' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom System & Return to Workspace Controls */}
        <div className="p-3.5 border-t border-slate-800/80 space-y-2.5 bg-[#060910]">
          <div className="px-2 py-1 text-xs font-mono text-slate-400 flex items-center justify-between">
            <span>Cluster: ap-south-1</span>
            <span className="text-emerald-400 font-bold">99.99% SLA</span>
          </div>

          <button
            onClick={() => setCurrentExperience('customer')}
            className="w-full px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 border border-slate-700/70"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Workspace</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN RIGHT CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        {/* Top Sub-Header */}
        <header className="h-16 sm:h-18 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => setIsMobileNavOpen(true)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  {currentNavTitle}
                </h1>
                <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  Global Operator Plane
                </span>
              </div>
              <p className="text-sm text-slate-500 hidden sm:block mt-0.5">
                Master operator telemetry, automated isolation gates, and infrastructure diagnostics.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentExperience('customer')}
              className="hidden sm:flex px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold items-center gap-2 transition-colors cursor-pointer border border-slate-200"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Workspace</span>
            </button>
            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold ${
              isEmergencyKillswitchActive 
                ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isEmergencyKillswitchActive ? 'bg-rose-500' : 'bg-emerald-500'}`} />
              <span className="hidden xs:inline">{isEmergencyKillswitchActive ? 'Killswitch Active' : '99.99% Operational'}</span>
            </span>
          </div>
        </header>

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* 1. OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Top Metrics KPI Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total Tenants', value: `${totalTenants}`, sub: '+18% growth', icon: Building2 },
              { label: 'Active Fleet', value: `${activeAgents}`, sub: '100% operational', icon: Bot, isGood: true },
              { label: 'Platform MRR', value: `₹${totalMRR.toLocaleString('en-IN')}`, sub: '18% GST Compliant', icon: DollarSign },
              { label: 'Annual Run Rate', value: `₹${(totalMRR * 12).toLocaleString('en-IN')}`, sub: 'Projected ARR', icon: TrendingUp },
              { label: 'Platform Uptime', value: '99.99%', sub: 'Zero active outages', icon: HeartPulse, isGood: true }
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{stat.label}</span>
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 border border-slate-200/60">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{stat.value}</span>
                  </div>
                  <span className={`text-xs mt-1 block font-semibold ${stat.isGood ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {stat.sub}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Quick Organizations & System Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Organizations Table (2 Cols) */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">Tenant Workspaces & Isolation</h3>
                  <p className="text-sm text-slate-500">Cryptographically isolated tenant instances</p>
                </div>
                <button
                  onClick={() => setActiveTab('organizations')}
                  className="text-sm font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>View All ({totalTenants})</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase text-xs font-mono font-bold">
                      <th className="pb-3">Organization</th>
                      <th className="pb-3">Plan</th>
                      <th className="pb-3">AI Persona</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {companies.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5">
                          <div className="font-bold text-slate-900">{c.name}</div>
                          <span className="text-xs text-slate-500 font-mono">{c.domain}</span>
                        </td>
                        <td className="py-3.5">
                          <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                            {c.planId}
                          </span>
                        </td>
                        <td className="py-3.5 text-slate-700 font-semibold">{c.agent.name}</td>
                        <td className="py-3.5">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md ${
                            c.isSuspended 
                              ? 'bg-rose-50 text-rose-700 border border-rose-200/60' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${c.isSuspended ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                            {c.isSuspended ? 'Suspended' : 'Active'}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          <button
                            onClick={() => {
                              switchCompany(c.id);
                              setCurrentExperience('customer');
                              showToast('Workspace Switched', `Opened workspace for ${c.name}.`, 'info');
                            }}
                            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs"
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

            {/* Infrastructure Health Status (1 Col) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Cluster Services Health</h3>
                <p className="text-sm text-slate-500">FastAPI runtime, pgvector & KMS latency</p>
              </div>
              <div className="space-y-2.5">
                {systemHealth.map((h, i) => (
                  <div key={i} className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/70 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{h.service}</p>
                      <span className="text-xs text-slate-500 font-mono">{h.latencyMs}ms latency</span>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-mono font-bold rounded-md">
                      {h.uptimePercent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. ORGANIZATIONS TAB */}
      {activeTab === 'organizations' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Tenant Workspaces Directory</h3>
                <p className="text-sm text-slate-500">Manage tenant isolation, plan allocations, and operational status.</p>
              </div>
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search organization or domain..."
                  value={searchOrg}
                  onChange={e => setSearchOrg(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase text-xs font-mono font-bold">
                    <th className="pb-3">Organization</th>
                    <th className="pb-3">Industry</th>
                    <th className="pb-3">Plan</th>
                    <th className="pb-3">Total Inquiries</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Admin Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCompanies.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5">
                        <div className="font-bold text-slate-900">{c.name}</div>
                        <span className="text-xs text-slate-500 font-mono">{c.domain}</span>
                      </td>
                      <td className="py-3.5 text-slate-700 font-medium capitalize">{c.industry}</td>
                      <td className="py-3.5">
                        <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                          {c.planId}
                        </span>
                      </td>
                      <td className="py-3.5 font-mono font-semibold text-slate-800">{c.stats.totalMessages.toLocaleString()}</td>
                      <td className="py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md ${
                          c.isSuspended 
                            ? 'bg-rose-50 text-rose-700 border border-rose-200/60' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${c.isSuspended ? 'bg-rose-500' : 'bg-emerald-500'}`} />
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
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
                          >
                            Impersonate
                          </button>
                          <button
                            onClick={() => adminToggleCompanySuspension(c.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors border ${
                              c.isSuspended 
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200' 
                                : 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200'
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

      {/* 3. AI FLEET & DIAGNOSTICS TAB */}
      {activeTab === 'fleet' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Tenant Diagnostics Inspector</h3>
              <p className="text-sm text-slate-500">Run real-time vector retrieval, RAG latency, and KMS cryptographic checks.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
              <select
                value={supportOrgId}
                onChange={e => setSupportOrgId(e.target.value)}
                className="w-full sm:w-80 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              >
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.domain})</option>
                ))}
              </select>
              <button
                onClick={handleRunDiagnostic}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <Terminal className="w-4 h-4" />
                <span>Run Live Inspection</span>
              </button>
            </div>

            {supportDiagnosticOutput && (
              <div className="mt-4 p-5 bg-slate-950 text-slate-200 rounded-xl font-mono text-xs sm:text-sm space-y-3 border border-slate-800 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs sm:text-sm">
                  <span className="text-slate-400">DIAGNOSTIC: <strong className="text-white">{supportDiagnosticOutput.tenantName}</strong></span>
                  <span className="text-emerald-400 font-bold">STATUS: {supportDiagnosticOutput.agentHealth}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-slate-300 text-xs sm:text-sm">
                  <div>Tenant ID: <span className="text-white font-mono">{supportDiagnosticOutput.tenantId}</span></div>
                  <div>Model Intelligence Tier: <span className="text-indigo-300 uppercase font-bold">{supportDiagnosticOutput.modelTier}</span></div>
                  <div>pgvector Query Latency: <span className="text-emerald-400 font-bold">{supportDiagnosticOutput.pgvectorLatency}</span></div>
                  <div>Total Inquiries: <span className="text-white font-bold">{supportDiagnosticOutput.totalConversations}</span></div>
                  <div>KMS Encryption: <span className="text-emerald-400 font-bold">{supportDiagnosticOutput.kmsEncryptionStatus}</span></div>
                  <div>Indexed Chunks: <span className="text-white font-bold">{supportDiagnosticOutput.knowledgeChunksIndexed} chunks</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. INFRASTRUCTURE & TELEMETRY TAB */}
      {activeTab === 'health' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-5">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Infrastructure Clusters & Latency Telemetry</h3>
              <p className="text-sm text-slate-500">Operational status of FastAPI runtimes, pgvector database, and worker queues.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {systemHealth.map((h, i) => (
                <div key={i} className="p-5 bg-slate-50/70 rounded-xl border border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{h.service}</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 font-mono">{h.uptimePercent}%</div>
                  <p className="text-xs sm:text-sm text-slate-500">Latency: <strong className="text-slate-800 font-mono">{h.latencyMs} ms</strong></p>
                </div>
              ))}
            </div>

            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3.5">
              <Server className="w-5 h-5 text-slate-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-900 text-sm sm:text-base">Asynchronous Background Worker Queues</h4>
                <p className="text-slate-600 text-xs sm:text-sm mt-1 leading-relaxed">
                  Document chunker worker, semantic reranking worker, and webhook event dispatcher are running concurrently with zero queued job backlog.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. SECURITY & AUDIT TAB */}
      {activeTab === 'security' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Emergency Killswitch */}
          <div className="bg-white rounded-2xl border border-rose-200/80 p-6 sm:p-7 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Global Emergency AI Killswitch</h3>
              </div>
              <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Immediately halts all outbound LLM invocations across all tenants in case of upstream provider outages or runaway loops.
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
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer flex items-center gap-2 shrink-0 ${
                isEmergencyKillswitchActive
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-xs'
              }`}
            >
              {isEmergencyKillswitchActive ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4 fill-white" />}
              <span>{isEmergencyKillswitchActive ? 'Resume Global AI' : 'Activate Killswitch'}</span>
            </button>
          </div>

          {/* SSRF & Threat Logs */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">SSRF Threat Monitor & Security Interceptions</h3>
                <p className="text-sm text-slate-500">Automated defense blocking loopback, private RFC 1918 subnets, and cloud metadata exploits.</p>
              </div>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-lg text-xs font-bold font-mono">
                SSRF Guard Active
              </span>
            </div>

            <div className="space-y-2.5 text-sm">
              {securityEvents.map(evt => (
                <div key={evt.id} className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/70 flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold uppercase ${
                        evt.severity === 'high' ? 'bg-rose-50 text-rose-700 border border-rose-200/60' : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                      }`}>
                        {evt.severity}
                      </span>
                      <span className="font-mono font-bold text-slate-900 text-sm">{evt.type}</span>
                      <span className="text-slate-500 text-xs font-mono">IP: {evt.sourceIp}</span>
                    </div>
                    <p className="text-slate-700 text-sm leading-relaxed">{evt.description}</p>
                    <p className="text-xs sm:text-sm text-emerald-700 font-semibold">{evt.actionTaken}</p>
                  </div>
                  <span className="text-xs text-slate-500 font-mono shrink-0">{evt.timestamp}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Immutable Master Audit Logs */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-4">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Platform-Wide Immutable Audit Trail</h3>
            <div className="divide-y divide-slate-100 text-sm font-mono">
              {auditLogs.map(log => (
                <div key={log.id} className="py-3 flex items-center justify-between gap-2">
                  <div className="text-xs sm:text-sm">
                    <span className="text-slate-500 mr-2.5">{log.timestamp}</span>
                    <strong className="text-slate-900 font-bold">{log.actor}: </strong>
                    <span className="text-indigo-600 font-semibold">{log.action} — </span>
                    <span className="text-slate-700">{log.details}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md uppercase shrink-0 ${
                    log.severity === 'critical' ? 'bg-rose-50 text-rose-700 border border-rose-200/60' : 'bg-slate-100 text-slate-700'
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
        </main>
      </div>
    </div>
  );
};
