import React from 'react';
import { 
  Bot, 
  MessageSquare, 
  CheckCircle2, 
  UserX, 
  Activity, 
  Sparkles, 
  TrendingUp, 
  ArrowRight, 
  Play, 
  Pause, 
  Zap, 
  BookOpen, 
  Puzzle, 
  Code2, 
  ChevronRight 
} from 'lucide-react';
import { useApp } from '../../context';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const OverviewView: React.FC = () => {
  const { 
    currentCompany, 
    currentPlan, 
    toggleAgentStatus, 
    conversations, 
    knowledgeItems, 
    integrations, 
    actions,
    setCurrentTab,
    setIsQuickTestOpen,
    setActiveConversationId
  } = useApp();

  const stats = currentCompany.stats;
  const resolutionRate = stats.totalConversations > 0 
    ? Math.round((stats.resolvedConversations / stats.totalConversations) * 100) 
    : 88;
  const escalationRate = stats.totalConversations > 0 
    ? Math.round((stats.escalatedConversations / stats.totalConversations) * 100) 
    : 12;

  const usagePercent = Math.min(100, Math.round((stats.messagesThisMonth / currentPlan.maxConversationsMonth) * 100));

  const chartData = [
    { name: 'Mon', conversations: 120, resolutions: 108 },
    { name: 'Tue', conversations: 145, resolutions: 132 },
    { name: 'Wed', conversations: 132, resolutions: 120 },
    { name: 'Thu', conversations: 180, resolutions: 162 },
    { name: 'Fri', conversations: 195, resolutions: 178 },
    { name: 'Sat', conversations: 110, resolutions: 98 },
    { name: 'Sun', conversations: 165, resolutions: 152 }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner: Single Production Agent Status & Identity */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-purple-500/10 to-transparent pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative shrink-0">
              <img 
                src={currentCompany.agent.avatarUrl} 
                alt={currentCompany.agent.name} 
                className="w-16 h-16 rounded-2xl object-cover ring-4 ring-indigo-500/30 shadow-lg"
              />
              <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ring-2 ring-slate-900 ${
                currentCompany.agent.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-white">{currentCompany.agent.name}</h1>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Rented Production Agent (1/1)
                </span>
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                  currentCompany.agent.status === 'active'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${currentCompany.agent.status === 'active' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                  {currentCompany.agent.status === 'active' ? 'Live & Serving Traffic' : 'Temporarily Paused'}
                </span>
              </div>
              <p className="text-slate-300 text-xs mt-1 max-w-2xl leading-relaxed">
                {currentCompany.agent.description}
              </p>
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <strong>{knowledgeItems.length}</strong> Knowledge Docs
                </span>
                <span className="flex items-center gap-1.5">
                  <Puzzle className="w-3.5 h-3.5 text-indigo-400" />
                  <strong>{integrations.filter(i => i.connected).length}</strong> Connected APIs
                </span>
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <strong>{actions.filter(a => a.enabled).length}</strong> Active Actions
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={toggleAgentStatus}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm ${
                currentCompany.agent.status === 'active'
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
              }`}
            >
              {currentCompany.agent.status === 'active' ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause Agent</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Activate Agent</span>
                </>
              )}
            </button>

            <button
              onClick={() => setIsQuickTestOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Test Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Conversations */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-indigo-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Conversations</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.totalConversations.toLocaleString()}</span>
            <span className="text-xs font-medium text-emerald-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" /> +14%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{stats.totalMessages.toLocaleString()} total messages processed</p>
        </div>

        {/* Card 2: Resolution Rate */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-emerald-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resolution Rate</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{resolutionRate}%</span>
            <span className="text-xs font-medium text-emerald-600">Strict Knowledge</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{stats.resolvedConversations.toLocaleString()} resolved without escalation</p>
        </div>

        {/* Card 3: Human Escalations */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-amber-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Human Escalations</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{escalationRate}%</span>
            <span className="text-xs font-medium text-slate-500">({stats.escalatedConversations})</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Safely routed to human on-call support</p>
        </div>

        {/* Card 4: Usage & Plan Limit */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-indigo-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan Usage</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{usagePercent}%</span>
            <span className="text-xs font-medium text-slate-500">
              {stats.messagesThisMonth.toLocaleString()} / {currentPlan.maxConversationsMonth.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${usagePercent > 80 ? 'bg-rose-500' : 'bg-indigo-600'}`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Live Conversations Chart + Quick Setup Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Activity Trends */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Conversation Throughput & Resolutions</h3>
              <p className="text-xs text-slate-500">Daily message volume processed by single AI agent</p>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
              Last 7 Days
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorConvs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="conversations" name="Total Inquiries" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorConvs)" />
                <Area type="monotone" dataKey="resolutions" name="Resolved" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRes)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Col: Quick Customization Shortcuts */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Agent Customization Hub</h3>
            <p className="text-xs text-slate-500 mb-4">Shape how your single AI agent speaks, learns, and performs actions</p>

            <div className="space-y-2.5">
              <button
                onClick={() => setCurrentTab('my-agent')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Customize Tone & Instructions</h4>
                    <p className="text-[11px] text-slate-500">Tune personality & safety rules</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </button>

              <button
                onClick={() => setCurrentTab('knowledge')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Add URLs, PDFs & FAQs</h4>
                    <p className="text-[11px] text-slate-500">{knowledgeItems.length} knowledge sources indexed</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </button>

              <button
                onClick={() => setCurrentTab('actions')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Enable Approved Actions</h4>
                    <p className="text-[11px] text-slate-500">Tickets, Lookups, Bookings</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
              </button>

              <button
                onClick={() => setCurrentTab('deploy')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Get Embed Code & API</h4>
                    <p className="text-[11px] text-slate-500">Deploy widget to website in 2 mins</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Current Plan: <strong>{currentPlan.name} (₹{currentPlan.priceMonthlyINR.toLocaleString()}/mo)</strong></span>
            <button
              onClick={() => setCurrentTab('billing')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Upgrade
            </button>
          </div>
        </div>
      </div>

      {/* Recent Live Conversations Feed */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Customer Sessions</h3>
            <p className="text-xs text-slate-500">Real-time interactions handled by {currentCompany.agent.name}</p>
          </div>
          <button
            onClick={() => setCurrentTab('conversations')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>View All Conversations</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {conversations.slice(0, 4).map(conv => {
            const lastMsg = conv.messages[conv.messages.length - 1];
            return (
              <div 
                key={conv.id} 
                onClick={() => {
                  setActiveConversationId(conv.id);
                  setCurrentTab('conversations');
                }}
                className="py-3.5 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-xl transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                    {conv.customerName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-800">{conv.customerName}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">({conv.channel})</span>
                      {conv.status === 'escalated_to_human' && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-rose-50 text-rose-700 border border-rose-200 rounded font-semibold">
                          Human Escalated
                        </span>
                      )}
                      {conv.status === 'resolved' && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-semibold">
                          Resolved
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate max-w-md mt-0.5">
                      {lastMsg ? lastMsg.text : 'Session initiated'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="hidden sm:inline font-mono">{conv.messages.length} msgs</span>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
