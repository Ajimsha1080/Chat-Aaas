import React, { useState } from 'react';
import { 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  UserX, 
  Star, 
  HelpCircle, 
  TrendingUp, 
  Cpu, 
  Sparkles, 
  ChevronDown, 
  ChevronUp,
  Activity,
  Layers,
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
  CartesianGrid, 
  BarChart, 
  Bar 
} from 'recharts';

export const InsightsView: React.FC = () => {
  const { currentCompany, analytics } = useApp();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const stats = currentCompany.stats;
  const resolutionRate = stats.totalConversations > 0 
    ? Math.round((stats.resolvedConversations / stats.totalConversations) * 100) 
    : 94;
  const escalationRate = stats.totalConversations > 0 
    ? Math.round((stats.escalatedConversations / stats.totalConversations) * 100) 
    : 6;

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
    { topic: 'Order Tracking & Status', percentage: 32, count: 410 },
    { topic: 'Refund & Return Policy', percentage: 21, count: 270 },
    { topic: 'Pricing & Subscription Plans', percentage: 17, count: 218 },
    { topic: 'Product Specs & Compatibility', percentage: 14, count: 180 },
    { topic: 'Account & Password Help', percentage: 16, count: 206 }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">Insights</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Understand business outcomes, automated customer resolution, and time saved.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 bg-slate-100 rounded-xl text-slate-700">
            Last 30 Days
          </span>
        </div>
      </div>

      {/* Outcome Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Conversations */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Conversations Handled
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">1,284</span>
            <span className="text-xs font-bold text-emerald-600 flex items-center">
              +18% <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Autonomous 24/7 coverage</p>
        </div>

        {/* Resolution Rate */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Resolution Rate
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600">{resolutionRate}%</span>
            <span className="text-xs font-bold text-emerald-600">High</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Resolved without human agent</p>
        </div>

        {/* Estimated Time Saved */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Estimated Time Saved
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-indigo-600">~86 hrs</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Equivalent to 2 full-time staff</p>
        </div>

        {/* CSAT Rating */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Customer Satisfaction
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-slate-900">4.7</span>
            <span className="text-xs text-slate-400 font-bold">/ 5.0</span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-500 ml-1" />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Based on 320 post-chat ratings</p>
        </div>
      </div>

      {/* Primary Graphs & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Throughput Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Conversation & Resolution Volume</h3>
              <p className="text-xs text-slate-500">Daily incoming questions vs autonomous resolutions</p>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorConvsInsights" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorResInsights" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }} />
                <Area type="monotone" dataKey="conversations" name="Total Inquiries" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorConvsInsights)" />
                <Area type="monotone" dataKey="resolved" name="AI Resolutions" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorResInsights)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Customer Topics */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">Top Customer Topics</h3>
            <p className="text-xs text-slate-500">Most frequent inquiry categories</p>
          </div>

          <div className="space-y-3.5 pt-2">
            {topQuestions.map((q, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span>{q.topic}</span>
                  <span className="text-slate-500">{q.percentage}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all"
                    style={{ width: `${q.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Progressive Disclosure: Advanced Developer & Telemetry Analytics */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-6 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Advanced Developer Analytics & Telemetry</h4>
              <p className="text-xs text-slate-500">Token usage, retrieval latency, and model metrics</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600">
            <span>{showAdvanced ? 'Hide Technical Details' : 'Show Technical Details'}</span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showAdvanced && (
          <div className="p-6 pt-0 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/50 animate-in fade-in duration-150">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Token Consumption</span>
              <p className="text-xl font-black text-slate-900">342,800 tokens</p>
              <p className="text-[11px] text-slate-500">Input: 280k · Output: 62.8k</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Embedding Vector Latency</span>
              <p className="text-xl font-black text-emerald-600">42 ms</p>
              <p className="text-[11px] text-slate-500">pgvector cosine similarity</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">FastAPI p95 Response Time</span>
              <p className="text-xl font-black text-blue-600">1.18 s</p>
              <p className="text-[11px] text-slate-500">Asynchronous streaming chunked</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
