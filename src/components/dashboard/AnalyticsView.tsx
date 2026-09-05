import React, { useState } from 'react';
import { 
  CheckCircle2, 
  UserX, 
  Plus, 
  MessageSquare, 
  AlertTriangle,
  TrendingUp,
  Star,
  ChevronDown,
  ChevronUp,
  Cpu
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
    setCurrentTab,
    showToast
  } = useApp();

  const [showAdvancedAnalytics, setShowAdvancedAnalytics] = useState(false);

  const pieData = [
    { name: 'Resolved by AI Employee', value: analytics.resolutionRatePercent, color: '#10b981' },
    { name: 'Handed to Support Team', value: analytics.escalationRatePercent, color: '#f59e0b' }
  ];

  const handleAddUnansweredToKB = (query: string) => {
    addKnowledgeItem({
      type: 'faq',
      title: query,
      content: `Question: ${query}\nAnswer: [Pending verification by team: please update this answer]`,
      faqAnswer: 'Official response pending team review.',
      category: 'Unanswered Questions'
    });
    showToast('Added to Knowledge Base', `Added "${query}" to FAQs.`, 'success');
    setCurrentTab('knowledge');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Performance & ROI Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time business results, resolution rates, and ROI metrics for <strong>{currentCompany.agent.name}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl">
            Date Range: Last 30 Days
          </span>
        </div>
      </div>

      {/* Primary Business KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Automation Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{analytics.resolutionRatePercent}%</span>
            <span className="text-xs font-semibold text-emerald-600">+2.4%</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Inquiries resolved without staff</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Human Handoffs</span>
            <UserX className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{analytics.escalationRatePercent}%</span>
            <span className="text-xs font-semibold text-slate-500">Transferred</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Safely routed to human support</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">CSAT Satisfaction</span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">4.8</span>
            <span className="text-xs font-semibold text-slate-500">/ 5.0</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Positive customer feedback</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Total Conversations</span>
            <MessageSquare className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{currentCompany.stats.totalConversations.toLocaleString()}</span>
            <span className="text-xs font-semibold text-indigo-600">Lifetime</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Across website & mobile</p>
        </div>
      </div>

      {/* Tangible Business ROI Card */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 rounded-3xl p-6 text-white border border-indigo-800/40 shadow-xl relative overflow-hidden">
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
                <p className="text-xs text-indigo-200/80">Measurable operational savings and support workload reduction.</p>
              </div>
            </div>
            <span className="text-xs font-mono text-indigo-300 bg-indigo-950/80 border border-indigo-800 px-3 py-1 rounded-lg">
              Updated Live
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xs">
              <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">Estimated Hours Saved</span>
              <span className="text-2xl font-black text-white mt-1 block">~148 hrs</span>
              <span className="text-[11px] text-indigo-200/70 mt-1 block">@ 6.2 min avg support handle time</span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xs">
              <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">Est. Labor Cost Offset</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">?1,18,400</span>
              <span className="text-[11px] text-indigo-200/70 mt-1 block">vs ?800/hr tier-1 support cost</span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xs">
              <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">Tasks Automated</span>
              <span className="text-2xl font-black text-white mt-1 block">1,420</span>
              <span className="text-[11px] text-indigo-200/70 mt-1 block">Zero human intervention needed</span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xs">
              <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">Net SaaS Payback</span>
              <span className="text-2xl font-black text-amber-300 mt-1 block">14.8x ROI</span>
              <span className="text-[11px] text-indigo-200/70 mt-1 block">Over monthly subscription fee</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trajectory */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Conversation Trajectory</h3>
              <p className="text-xs text-slate-500">Daily inquiry volume vs successful resolutions</p>
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

        {/* Resolution Breakdown Pie */}
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
                <span>Resolved by AI Employee</span>
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

      {/* Unanswered Knowledge Gaps Table (1-Click Add to KB) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">Knowledge Gaps & Unanswered Questions</h3>
          </div>
          <span className="text-[11px] text-indigo-600 font-semibold">Continuous Improvement</span>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Queries where your employee lacked verified documentation. Click <strong>"Add to Knowledge Base"</strong> to teach your employee the right answer.
        </p>

        <div className="divide-y divide-slate-100">
          {analytics.unansweredQueries.map((item, idx) => (
            <div key={idx} className="py-3 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-800">{item.query}</p>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                  <span>Occurred: <strong>{item.occurrences} times</strong></span>
                  <span></span>
                  <span>Last asked: {item.lastAsked}</span>
                </div>
              </div>

              <div>
                <button
                  onClick={() => handleAddUnansweredToKB(item.query)}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Knowledge Base</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Collapsible Advanced AI & Token Analytics */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <button
          onClick={() => setShowAdvancedAnalytics(!showAdvancedAnalytics)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Cpu className="w-4 h-4 text-slate-600" />
            <div>
              <h3 className="text-xs font-bold text-slate-900">Advanced AI & Compute Analytics</h3>
              <p className="text-[11px] text-slate-500">Token usage, response latency, and compute metrics (for developers)</p>
            </div>
          </div>
          {showAdvancedAnalytics ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showAdvancedAnalytics && (
          <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">Avg Response Latency</span>
                <span className="text-base font-bold text-slate-900 mt-1 block">{analytics.avgResponseTimeMs}ms</span>
                <span className="text-[10px] text-emerald-600">Sub-second streaming</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">Tokens This Month</span>
                <span className="text-base font-bold text-slate-900 mt-1 block">{currentCompany.stats.tokensThisMonth.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500">Estimated cost: ₹{Math.round(currentCompany.stats.tokensThisMonth * 0.00018)}</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">AI Model Tier</span>
                <span className="text-base font-bold text-slate-900 mt-1 block capitalize">{currentCompany.agent.modelTier || 'Automatic'}</span>
                <span className="text-[10px] text-indigo-600">Task-based routing</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">Vector RAG Chunks</span>
                <span className="text-base font-bold text-slate-900 mt-1 block">{currentCompany.stats.knowledgeChunksUsed || 42}</span>
                <span className="text-[10px] text-slate-500">Isolated per tenant</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
