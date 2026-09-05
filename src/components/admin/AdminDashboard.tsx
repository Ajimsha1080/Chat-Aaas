import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Building, 
  Activity, 
  CheckCircle2, 
  Cpu, 
  Search, 
  DollarSign 
} from 'lucide-react';
import { useApp } from '../../context';

export const AdminDashboard: React.FC = () => {
  const { 
    companies, 
    allPlans, 
    adminToggleCompanySuspension, 
    adminUpdatePlanPrice,
    setIsAdminMode,
    switchCompany
  } = useApp();

  const [activeAdminTab, setActiveAdminTab] = useState<'tenants' | 'subscriptions' | 'health' | 'safety' | 'llm'>('tenants');
  const [searchCompany, setSearchCompany] = useState('');

  // Calculate platform totals
  const totalTenants = companies.length;
  const activeAgents = companies.filter(c => c.agent.status === 'active' && !c.isSuspended).length;
  const totalPlatformMessages = companies.reduce((acc, c) => acc + c.stats.totalMessages, 0);
  const totalMRR = companies.reduce((acc, c) => {
    const plan = allPlans.find(p => p.id === c.planId);
    return acc + (plan ? plan.priceMonthlyINR : 0);
  }, 0);

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchCompany.toLowerCase()) || 
    c.domain.toLowerCase().includes(searchCompany.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner: Platform Super Admin Mode */}
      <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 rounded-2xl p-6 text-white border border-rose-900/50 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-600/30 text-rose-400 flex items-center justify-center border border-rose-500/40 shadow-lg">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white">Platform Super Admin Control Panel</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
                Global Operator View
              </span>
            </div>
            <p className="text-xs text-rose-200/70 mt-0.5">
              Manage platform tenants, global MRR subscriptions, system health, and safety guardrails.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAdminMode(false)}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
        >
          <span>Exit Admin View</span>
        </button>
      </div>

      {/* Global Platform KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Total Tenant Companies</span>
            <Building className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalTenants}</span>
            <span className="text-xs font-semibold text-emerald-600">Active Workspaces</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Multi-tenant cryptographic isolation</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Platform MRR</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">₹{totalMRR.toLocaleString()}</span>
            <span className="text-xs font-semibold text-emerald-600">/ mo</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">ARR Run-Rate: ₹{(totalMRR * 12).toLocaleString()}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Live Serving Agents</span>
            <Cpu className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{activeAgents} / {totalTenants}</span>
            <span className="text-xs font-semibold text-emerald-600">100% Single-Agent</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Dedicated agent runtime instances</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Platform Message Vol</span>
            <Activity className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalPlatformMessages.toLocaleString()}</span>
            <span className="text-xs font-semibold text-purple-600">Messages</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Average RAG latency: 142ms</p>
        </div>
      </div>

      {/* Admin Subtabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'tenants', label: 'Company Tenants & Status', count: companies.length },
          { id: 'subscriptions', label: 'Subscription Plans & Pricing' },
          { id: 'health', label: 'Platform Infrastructure Health' },
          { id: 'safety', label: 'Flagged Conversations & Guardrails' },
          { id: 'llm', label: 'Global LLM Engines' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveAdminTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeAdminTab === tab.id
                ? 'bg-rose-950 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="text-[10px] bg-rose-900 text-rose-200 px-1.5 py-0.2 rounded-full font-mono">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab 1: Tenant Companies Table */}
      {activeAdminTab === 'tenants' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Tenant Companies</h3>
              <p className="text-xs text-slate-500">Inspect company agent status and toggle platform suspension.</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchCompany}
                onChange={(e) => setSearchCompany(e.target.value)}
                placeholder="Search company or domain..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase">
                  <th className="pb-3">Company</th>
                  <th className="pb-3">Rented Agent</th>
                  <th className="pb-3">Plan Tier</th>
                  <th className="pb-3">Monthly Msgs</th>
                  <th className="pb-3">Tenant Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCompanies.map(comp => {
                  const plan = allPlans.find(p => p.id === comp.planId);
                  return (
                    <tr key={comp.id} className="hover:bg-slate-50">
                      <td className="py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center">
                            {comp.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{comp.name}</p>
                            <span className="text-[11px] text-slate-400">{comp.domain}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-1.5">
                          <img src={comp.agent.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                          <span className="font-medium text-slate-800">{comp.agent.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                            comp.agent.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {comp.agent.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 font-semibold capitalize text-slate-800">
                        {plan?.name || comp.planId} (₹{plan?.priceMonthlyINR.toLocaleString()}/mo)
                      </td>
                      <td className="py-3.5 font-mono text-slate-600">
                        {comp.stats.messagesThisMonth.toLocaleString()}
                      </td>
                      <td className="py-3.5">
                        {comp.isSuspended ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                            Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 text-right space-x-2">
                        <button
                          onClick={() => {
                            switchCompany(comp.id);
                            setIsAdminMode(false);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          Open Workspace
                        </button>
                        <button
                          onClick={() => adminToggleCompanySuspension(comp.id)}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors border ${
                            comp.isSuspended
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                          }`}
                        >
                          {comp.isSuspended ? 'Re-Activate' : 'Suspend'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Subscription Plans Management */}
      {activeAdminTab === 'subscriptions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Platform Pricing & Plan Tiers</h3>
          <p className="text-xs text-slate-500">Admin override for monthly rates and plan quota limits.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            {allPlans.map(plan => (
              <div key={plan.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900">{plan.name}</h4>
                  <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">1 Agent</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Monthly Rate (INR)</label>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-700">₹</span>
                    <input
                      type="number"
                      defaultValue={plan.priceMonthlyINR}
                      onBlur={(e) => adminUpdatePlanPrice(plan.id, Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-200">
                  <p>Max Inquiries: <strong>{plan.maxConversationsMonth.toLocaleString()}</strong></p>
                  <p>Max Knowledge Docs: <strong>{plan.maxKnowledgeDocs}</strong></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: System Health Monitor */}
      {activeAdminTab === 'health' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">Vector Search / RAG Engine</span>
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 99.99% Uptime
              </span>
            </div>
            <p className="text-slate-500 text-[11px]">Milvus Cluster (Dedicated VPC)</p>
            <div className="bg-slate-50 p-2 rounded-lg font-mono text-[10px] text-slate-700">
              Avg Embed Latency: 42ms • Index Shards: 24
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">LLM Inference Gateway</span>
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Operational
              </span>
            </div>
            <p className="text-slate-500 text-[11px]">Primary + Multi-Region Fallback Router</p>
            <div className="bg-slate-50 p-2 rounded-lg font-mono text-[10px] text-slate-700">
              Avg TTFT: 320ms • Failover Error Rate: 0.001%
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">Webhook Dispatch Queue</span>
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 0 Backlog
              </span>
            </div>
            <p className="text-slate-500 text-[11px]">Redis Queue + BullMQ Event Workers</p>
            <div className="bg-slate-50 p-2 rounded-lg font-mono text-[10px] text-slate-700">
              Queue Lag: 0.12s • Workers: 16 Active
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Safety & Flagged Guardrails */}
      {activeAdminTab === 'safety' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Platform Safety & Guardrail Alerts</h3>
              <p className="text-xs text-slate-500">
                Monitors prompt injections and hallucination triggers without exposing tenant proprietary files.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg">
              0 Critical Breaches
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2 font-mono text-slate-700">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-900">Recent Guardrail Evaluation:</span>
              <span className="text-emerald-600">Passed (Anti-Hallucination Enforced)</span>
            </div>
            <p className="text-[11px] font-sans text-slate-600">
              All active single-agent instances correctly rejected unverified questions and offered human operator handoff.
            </p>
          </div>
        </div>
      )}

      {/* Tab 5: Global LLM Settings */}
      {activeAdminTab === 'llm' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 max-w-xl text-xs">
          <h3 className="text-sm font-bold text-slate-900">Global AI Model Provider Router</h3>
          <p className="text-slate-500">Configure global model fallback chains for all rented single agents.</p>

          <div className="space-y-3 pt-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Primary LLM Provider</label>
              <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold">
                <option value="gpt4o">OpenAI GPT-4o Production</option>
                <option value="claude35">Anthropic Claude 3.5 Sonnet</option>
                <option value="gemini">Google Gemini 2.0 Flash</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">High-Availability Fallback Provider</label>
              <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold">
                <option value="claude35">Anthropic Claude 3.5 Sonnet</option>
                <option value="gemini">Google Gemini 2.0 Flash</option>
                <option value="ollama">Self-Hosted VPC Ollama (DeepSeek V3)</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
