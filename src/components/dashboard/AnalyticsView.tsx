import React from 'react';
import { 
  CheckCircle2, 
  UserX, 
  Plus, 
  Clock, 
  MessageSquare, 
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { useApp } from '../../context';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

export const AnalyticsView: React.FC = () => {
  const { 
    analytics, 
    currentCompany, 
    addKnowledgeItem, 
    setCurrentTab 
  } = useApp();

  const pieData = [
    { name: 'Resolved by AI', value: analytics.resolutionRatePercent, color: '#10b981' },
    { name: 'Escalated to Human', value: analytics.escalationRatePercent, color: '#f59e0b' }
  ];

  const handleAddUnansweredToKB = (query: string) => {
    addKnowledgeItem({
      type: 'faq',
      title: query,
      content: `Question: ${query}\nAnswer: [Pending verification by team: please update this answer]`,
      faqAnswer: 'Official response pending team review.',
      category: 'Unanswered Questions'
    });
    setCurrentTab('knowledge');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Analytics & Resolution Metrics</h1>
          <p className="text-xs text-slate-500 mt-1">
            Performance analytics, resolution trends, and knowledge gaps for <strong>{currentCompany.agent.name}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg">
            Date Range: Last 30 Days
          </span>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">AI Resolution Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{analytics.resolutionRatePercent}%</span>
            <span className="text-xs font-semibold text-emerald-600">+2.4%</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Customer inquiries resolved without human staff</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Human Escalation Rate</span>
            <UserX className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{analytics.escalationRatePercent}%</span>
            <span className="text-xs font-semibold text-slate-500">Safely transferred</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Handoffs triggered by keywords or missing knowledge</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Avg Response Latency</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{analytics.avgResponseTimeMs}ms</span>
            <span className="text-xs font-semibold text-indigo-600">Sub-second</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Streaming TTFT across all website widgets</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Total Messages</span>
            <MessageSquare className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{currentCompany.stats.totalMessages.toLocaleString()}</span>
            <span className="text-xs font-semibold text-purple-600">Lifetime</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{currentCompany.stats.tokensThisMonth.toLocaleString()} tokens used this month</p>
        </div>
      </div>

      {/* Tangible Business ROI & Labor Savings Card */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white border border-indigo-800/40 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 to-transparent pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-indigo-800/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl">
                <TrendingUp className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Tangible Business ROI & Labor Savings</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    High ROI
                  </span>
                </h3>
                <p className="text-xs text-indigo-200/80">Quantifiable operational hours, support workload reduction, and cost savings.</p>
              </div>
            </div>
            <span className="text-xs font-mono text-indigo-300 bg-indigo-950/80 border border-indigo-800 px-3 py-1 rounded-lg">
              Updated Live
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-xs">
              <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">Estimated Hours Saved</span>
              <span className="text-2xl font-black text-white mt-1 block">~148 hrs</span>
              <span className="text-[11px] text-indigo-200/70 mt-1 block">@ 6.2 min avg support handle time</span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-xs">
              <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">Est. Labor Cost Offset</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">₹1,18,400</span>
              <span className="text-[11px] text-indigo-200/70 mt-1 block">vs ₹800/hr tier-1 support cost</span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-xs">
              <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">Tasks Automated</span>
              <span className="text-2xl font-black text-white mt-1 block">1,420</span>
              <span className="text-[11px] text-indigo-200/70 mt-1 block">Zero human intervention required</span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-xs">
              <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">Net SaaS Payback</span>
              <span className="text-2xl font-black text-amber-300 mt-1 block">14.8x ROI</span>
              <span className="text-[11px] text-indigo-200/70 mt-1 block">Over monthly subscription fee</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Daily Conversation Volume */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Conversation & Resolution Trajectory</h3>
              <p className="text-xs text-slate-500">Daily message throughput vs successful resolutions</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.dailyConversations} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorConvsAna" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorResAna" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '11px' }} />
                <Area type="monotone" dataKey="conversations" name="Inquiries" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorConvsAna)" />
                <Area type="monotone" dataKey="resolutions" name="Resolutions" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorResAna)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Col: Resolution Breakdown Pie */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Resolution Breakdown</h3>
            <p className="text-xs text-slate-500 mb-4">Autonomous AI vs Human Support</p>

            <div className="h-44 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Resolved by AI Agent</span>
              </span>
              <span className="font-bold text-slate-900">{analytics.resolutionRatePercent}%</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Human Escalations</span>
              </span>
              <span className="font-bold text-slate-900">{analytics.escalationRatePercent}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Most Common Customer Questions & Action Success Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Common Questions */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Top Inquired Topics</h3>
            <span className="text-[11px] text-slate-500 font-mono">By Frequency</span>
          </div>

          <div className="space-y-3">
            {analytics.topQueries.map((q, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <div>
                  <p className="font-bold text-slate-800">{q.query}</p>
                  <span className="text-[10px] text-indigo-600 font-semibold">{q.category}</span>
                </div>
                <span className="font-mono font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  {q.count} times
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Trigger Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Tool & Action Execution Health</h3>
            <span className="text-[11px] text-emerald-600 font-bold">98.4% Success</span>
          </div>

          <div className="space-y-3">
            {analytics.actionUsageStats.map((act, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-800">{act.actionName}</span>
                  <span className="font-mono text-slate-600">{act.executions} calls</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${act.successRate}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 font-mono">{act.successRate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Unanswered / Missing Knowledge Gaps Table (1-Click Add to KB) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">Unanswered Questions & Knowledge Gaps</h3>
          </div>
          <span className="text-[11px] text-indigo-600 font-semibold">Continuous Training</span>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Queries where the agent strictly refused to hallucinate due to missing documentation. Click <strong>"Add to Knowledge Base"</strong> to train your agent.
        </p>

        <div className="divide-y divide-slate-100">
          {analytics.unansweredQueries.map((item, idx) => (
            <div key={idx} className="py-3 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-800">{item.query}</p>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                  <span>Occurred: <strong>{item.occurrences} times</strong></span>
                  <span>•</span>
                  <span>Last asked: {item.lastAsked}</span>
                </div>
              </div>

              <div>
                {item.status === 'added_to_kb' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Added to KB</span>
                  </span>
                ) : (
                  <button
                    onClick={() => handleAddUnansweredToKB(item.query)}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Knowledge Base</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
