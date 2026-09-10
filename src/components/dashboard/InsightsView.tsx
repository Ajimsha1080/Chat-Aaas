import React, { useState } from 'react';
import { 
  Star, 
  Cpu, 
  ChevronDown, 
  ChevronUp,
  ArrowUpRight
} from 'lucide-react';
import { useApp } from '../../context';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid
} from 'recharts';

export const InsightsView: React.FC = () => {
  const { currentCompany } = useApp();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const stats = currentCompany.stats;
  const resolutionRate = stats.totalConversations > 0 
    ? Math.round((stats.resolvedConversations / stats.totalConversations) * 100) 
    : 94;

  const weeklyData = [
    { day: 'Mon', conversations: 142, resolved: 134, handoffs: 8 },
    { day: 'Tue', conversations: 185, resolved: 174, handoffs: 11 },
    { day: 'Wed', conversations: 168, resolved: 159, handoffs: 9 },
    { day: 'Thu', conversations: 210, resolved: 198, handoffs: 12 },
    { day: 'Fri', conversations: 245, resolved: 231, handoffs: 14 },
    { day: 'Sat', conversations: 130, resolved: 122, handoffs: 8 },
    { day: 'Sun', conversations: 190, resolved: 179, handoffs: 11 }
  ];

  const topQuestions = [
    { topic: 'Pricing & Subscription Plans', percentage: 32, count: 410 },
    { topic: 'Refund & Return Policy', percentage: 25, count: 320 },
    { topic: 'Product Specs & Compatibility', percentage: 18, count: 230 },
    { topic: 'API & Developer Integration', percentage: 15, count: 192 },
    { topic: 'Account & Team Management', percentage: 10, count: 128 }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Analytics & Insights</h1>
            <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              Live Aggregation
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Autonomous customer resolution rates, response latency, and staff time saved.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold px-3.5 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-700">
            Last 30 Days
          </span>
        </div>
      </div>

      {/* Outcome Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Conversations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Inquiries Handled
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">1,284</span>
            <span className="text-xs font-bold text-emerald-600 flex items-center">
              +18% <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Autonomous 24/7 coverage</p>
        </div>

        {/* Resolution Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Resolution Rate
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-600 tracking-tight">{resolutionRate}%</span>
            <span className="text-xs font-semibold text-slate-500">Target: 90%+</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Resolved without staff</p>
        </div>

        {/* Estimated Time Saved */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Time Saved
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">~86 hrs</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Equivalent to 2 full-time reps</p>
        </div>

        {/* CSAT Rating */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Satisfaction (CSAT)
          </span>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">4.7</span>
            <span className="text-sm text-slate-500 font-semibold">/ 5.0</span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-500 ml-1" />
          </div>
          <p className="text-xs text-slate-500 mt-1">Based on 320 customer ratings</p>
        </div>
      </div>

      {/* Primary Graphs & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Throughput Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Conversation & Resolution Volume</h3>
              <p className="text-sm text-slate-500">Daily incoming inquiries vs autonomous resolutions</p>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorConvsInsights" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorResInsights" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#090d16', borderRadius: '10px', border: '1px solid #1e293b', color: '#f8fafc', fontSize: '13px' }} />
                <Area type="monotone" dataKey="conversations" name="Total Inquiries" stroke="#0f172a" strokeWidth={2} fillOpacity={1} fill="url(#colorConvsInsights)" />
                <Area type="monotone" dataKey="resolved" name="AI Resolutions" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorResInsights)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Customer Topics */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Top Customer Topics</h3>
            <p className="text-sm text-slate-500">Most frequent inquiry categories</p>
          </div>

          <div className="space-y-3.5 pt-1">
            {topQuestions.map((q, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
                  <span className="truncate pr-2">{q.topic}</span>
                  <span className="text-slate-500 font-mono text-xs">{q.percentage}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-slate-900 h-full rounded-full transition-all"
                    style={{ width: `${q.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Progressive Disclosure: Advanced Developer & Telemetry Analytics */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-5 sm:p-6 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 border border-slate-200/60">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-slate-900">Developer Metrics & LLM Telemetry</h4>
              <p className="text-xs sm:text-sm text-slate-500">Token usage, retrieval latency, and model performance metrics</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <span>{showAdvanced ? 'Hide Telemetry' : 'Show Telemetry'}</span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {showAdvanced && (
          <div className="p-6 pt-0 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/50 animate-in fade-in duration-150">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
              <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">Token Consumption</span>
              <p className="text-xl font-bold text-slate-900">342,800 tokens</p>
              <p className="text-xs text-slate-500 font-mono">Prompt: 280k · Completion: 62.8k</p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
              <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">Embedding Latency</span>
              <p className="text-xl font-bold text-emerald-600">42 ms</p>
              <p className="text-xs text-slate-500 font-mono">Dense cosine similarity</p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
              <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">FastAPI p95 Latency</span>
              <p className="text-xl font-bold text-slate-900">1.18 s</p>
              <p className="text-xs text-slate-500 font-mono">Asynchronous streaming</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
