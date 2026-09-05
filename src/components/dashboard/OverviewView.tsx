import React from 'react';
import { 
  MessageSquare, 
  CheckCircle2, 
  UserX, 
  Sparkles, 
  Play, 
  Zap, 
  BookOpen, 
  Globe, 
  ChevronRight,
  AlertTriangle,
  Star,
  Clock
} from 'lucide-react';
import { useApp } from '../../context';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const OverviewView: React.FC = () => {
  const { 
    currentCompany, 
    conversations, 
    knowledgeItems, 
    actions,
    setCurrentTab,
    setIsQuickTestOpen,
    setActiveConversationId,
    publishAgentVersion
  } = useApp();

  const stats = currentCompany.stats;
  const resolutionRate = stats.totalConversations > 0 
    ? Math.round((stats.resolvedConversations / stats.totalConversations) * 100) 
    : 87;
  const escalationRate = stats.totalConversations > 0 
    ? Math.round((stats.escalatedConversations / stats.totalConversations) * 100) 
    : 13;

  const chartData = [
    { name: 'Mon', conversations: 120, resolutions: 108 },
    { name: 'Tue', conversations: 145, resolutions: 132 },
    { name: 'Wed', conversations: 132, resolutions: 120 },
    { name: 'Thu', conversations: 180, resolutions: 162 },
    { name: 'Fri', conversations: 195, resolutions: 178 },
    { name: 'Sat', conversations: 110, resolutions: 98 },
    { name: 'Sun', conversations: 165, resolutions: 152 }
  ];

  const pendingAttentionConversations = conversations.filter(c => c.status === 'escalated_to_human');

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Hero Card: YOUR AI EMPLOYEE Status & Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-purple-500/10 to-transparent pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-5">
            <div className="relative shrink-0">
              <img 
                src={currentCompany.agent.avatarUrl} 
                alt={currentCompany.agent.name} 
                className="w-20 h-20 rounded-2xl object-cover ring-4 ring-indigo-500/30 shadow-2xl"
              />
              <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ring-3 ring-slate-900 ${
                currentCompany.agent.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`} />
            </div>

            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/20 px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                  YOUR AI EMPLOYEE
                </span>
                <h1 className="text-2xl font-black text-white">{currentCompany.agent.name}</h1>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {currentCompany.agent.role || 'Customer Support AI'}
                </span>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 ${
                  currentCompany.agent.status === 'active'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${currentCompany.agent.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  {currentCompany.agent.status === 'active' ? '● Live' : '● Paused'}
                </span>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed">
                {currentCompany.agent.description || 'Your dedicated AI Employee handling customer inquiries, order lookups, and meeting bookings.'}
              </p>
              
              <div className="flex items-center gap-5 mt-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <strong>{knowledgeItems.length}</strong> Knowledge Sources
                </span>
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <strong>{actions.filter(a => a.enabled).length}</strong> Active Actions
                </span>
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  <strong>Website Widget</strong> Live
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsQuickTestOpen(true)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border border-slate-700 cursor-pointer shadow-xs"
            >
              <Play className="w-3.5 h-3.5 text-indigo-400" />
              <span>Test Agent</span>
            </button>
            <button
              onClick={() => publishAgentVersion('Published from Overview Dashboard')}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Publish Changes</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Primary 5 Executive Business KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Conversations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Conversations</span>
            <MessageSquare className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{currentCompany.stats.totalConversations > 0 ? currentCompany.stats.totalConversations.toLocaleString() : '1,284'}</span>
            <span className="text-xs font-bold text-emerald-600">+12%</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Total inquiries handled</p>
        </div>

        {/* Automation Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Automation Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{resolutionRate}%</span>
            <span className="text-xs font-bold text-emerald-600">High</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Resolved without staff</p>
        </div>

        {/* Human Handoffs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Human Handoffs</span>
            <UserX className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{escalationRate}%</span>
            <span className="text-xs text-slate-500 font-semibold">13% Target</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Safely handed to team</p>
        </div>

        {/* Avg Response Time */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Avg Response Time</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">1.8s</span>
            <span className="text-xs text-emerald-600 font-bold">Fast</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Time to first response</p>
        </div>

        {/* Customer Satisfaction */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">CSAT Score</span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">4.7</span>
            <span className="text-xs text-slate-500 font-semibold">/ 5.0</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Positive customer feedback</p>
        </div>
      </div>

      {/* 3. Charts & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Activity Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Weekly Conversation Throughput</h3>
              <p className="text-xs text-slate-500">Autonomous resolutions vs total incoming inquiries</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700">
              Last 7 Days
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorConvs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '11px' }} />
                <Area type="monotone" dataKey="conversations" name="Total Inquiries" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorConvs)" />
                <Area type="monotone" dataKey="resolutions" name="AI Resolutions" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRes)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Col: Recent Activity & Needs Attention */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Needs Attention & Activity</h3>
            <p className="text-xs text-slate-500 mb-4">Live operational alerts</p>

            <div className="space-y-3 text-xs">
              {/* Needs Attention Alert */}
              <div 
                onClick={() => {
                  setCurrentTab('conversations');
                  if (pendingAttentionConversations.length > 0) {
                    setActiveConversationId(pendingAttentionConversations[0].id);
                  }
                }}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 cursor-pointer hover:bg-amber-100 transition-colors"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Needs Attention</p>
                  <p className="text-[11px] text-amber-800 font-medium">3 conversations require review</p>
                </div>
              </div>

              {/* Recent Activity items */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Knowledge synced</p>
                  <p className="text-[11px] text-emerald-700">{knowledgeItems.length} documents & FAQs indexed</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-900">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Agent published</p>
                  <p className="text-[11px] text-indigo-700">Latest immutable version active</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-purple-50 border border-purple-100 text-purple-900">
                <Globe className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Website connected</p>
                  <p className="text-[11px] text-purple-700">{currentCompany.domain} live on widget</p>
                </div>
              </div>
            </div>
          </div>

          {/* Direct link to Live Inbox */}
          <button
            onClick={() => setCurrentTab('conversations')}
            className="w-full mt-4 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span>Open Conversations Inbox</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. "What To Do Next" Quick Guide */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-1">What should I do next?</h3>
        <p className="text-xs text-slate-500 mb-4">Improve your AI Employee's capabilities and reach</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div 
            onClick={() => setCurrentTab('knowledge')}
            className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-all flex items-start gap-3"
          >
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">1. Add More Company FAQs</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Train your employee with return policies and common inquiries.</p>
            </div>
          </div>

          <div 
            onClick={() => setCurrentTab('actions')}
            className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-all flex items-start gap-3"
          >
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">2. Enable Business Actions</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Allow the employee to look up orders and capture leads.</p>
            </div>
          </div>

          <div 
            onClick={() => setCurrentTab('channels')}
            className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-all flex items-start gap-3"
          >
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">3. Deploy to Channels</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Install the 1-click script on your live store or mobile app.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
