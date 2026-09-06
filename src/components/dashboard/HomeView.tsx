import React, { useState } from 'react';
import { 
  Sparkles, 
  Play, 
  CheckCircle2, 
  PauseCircle, 
  MessageSquare, 
  Clock, 
  UserX, 
  BookOpen, 
  Zap, 
  ArrowRight, 
  AlertTriangle, 
  TrendingUp, 
  ShieldCheck, 
  Activity, 
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  Bot,
  Copy,
  Check,
  Upload,
  ArrowUpRight,
  ListTodo
} from 'lucide-react';
import { useApp } from '../../context';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const HomeView: React.FC = () => {
  const { 
    currentCompany, 
    conversations, 
    knowledgeItems, 
    actions, 
    integrations,
    setCurrentTab, 
    setIsQuickTestOpen, 
    setActiveConversationId, 
    publishAgentVersion,
    setIsLiveSandboxOpen,
    showToast
  } = useApp();

  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const stats = currentCompany.stats;
  const resolutionRate = stats.totalConversations > 0 
    ? Math.round((stats.resolvedConversations / stats.totalConversations) * 100) 
    : 94;
  const escalationRate = stats.totalConversations > 0 
    ? Math.round((stats.escalatedConversations / stats.totalConversations) * 100) 
    : 6;

  const chartData = [
    { name: 'Mon', conversations: 142, resolutions: 134 },
    { name: 'Tue', conversations: 185, resolutions: 174 },
    { name: 'Wed', conversations: 168, resolutions: 159 },
    { name: 'Thu', conversations: 210, resolutions: 198 },
    { name: 'Fri', conversations: 245, resolutions: 231 },
    { name: 'Sat', conversations: 130, resolutions: 122 },
    { name: 'Sun', conversations: 190, resolutions: 179 }
  ];

  const pendingAttentionConversations = conversations.filter(c => c.status === 'escalated_to_human' || c.status === 'flagged');
  const activeConnectionsCount = integrations ? integrations.filter(i => i.connected).length : 2;
  const readyKnowledgeCount = knowledgeItems ? knowledgeItems.filter(k => k.status === 'indexed').length : 4;

  const isLive = currentCompany.agent.status === 'active';

  const handleCopyScript = () => {
    const snippet = `<script src="https://cdn.agent-as-a-service.io/v1/widget.js" data-agent-key="${currentCompany.apiKey}" defer></script>`;
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    showToast('Script Copied', 'Website widget embed snippet copied to clipboard.', 'success');
    setTimeout(() => setCopiedSnippet(false), 2500);
  };

  const checklistItems = [
    { id: 1, title: 'Company profile and tone configured', completed: true, tab: 'assistant' },
    { id: 2, title: `Knowledge base loaded (${readyKnowledgeCount} sources)`, completed: readyKnowledgeCount > 0, tab: 'knowledge' },
    { id: 3, title: 'Test welcoming inquiry with assistant', completed: true, tab: 'quicktest' },
    { id: 4, title: 'Embed widget on website or connect WhatsApp', completed: activeConnectionsCount > 0, tab: 'deploy' }
  ];

  const completedCount = checklistItems.filter(i => i.completed).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Hero Command Center */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/25 via-purple-500/10 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-5">
            <div className="relative shrink-0">
              <img 
                src={currentCompany.agent.avatarUrl} 
                alt={currentCompany.agent.name} 
                className="w-20 h-20 rounded-2xl object-cover ring-4 ring-indigo-500/30 shadow-2xl"
              />
              <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ring-3 ring-slate-900 flex items-center justify-center ${
                isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`} />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {currentCompany.name} 👋
                </h1>
              </div>

              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
                  isLive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                  {isLive ? 'Your AI Assistant is live ● Healthy' : 'Assistant is paused'}
                </span>

                <span className="text-xs text-slate-300 bg-slate-800/80 px-2.5 py-0.5 rounded-lg border border-slate-700/60 font-medium">
                  {currentCompany.agent.name} · {currentCompany.agent.role || 'Customer Specialist'}
                </span>
              </div>

              <p className="text-slate-300 text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed">
                Autonomous AI answering customer inquiries 24/7 across website, WhatsApp, and connected business tools.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              onClick={() => setIsQuickTestOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Test Assistant</span>
            </button>

            <button
              onClick={() => setCurrentTab('assistant')}
              className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-slate-700 cursor-pointer shadow-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              <span>Manage Assistant</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Instant Quick Actions Bar */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex items-center justify-between gap-3 overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2 hidden sm:inline">
            Quick Actions:
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setCurrentTab('knowledge')}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </button>

          <button
            onClick={handleCopyScript}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copiedSnippet ? 'Copied!' : 'Copy Widget Script'}</span>
          </button>

          <button
            onClick={() => setIsLiveSandboxOpen(true)}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Live Website Preview</span>
          </button>

          <button
            onClick={() => setCurrentTab('deploy')}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Deploy Channels</span>
          </button>
        </div>
      </div>

      {/* 3. Launch Checklist Card (YC-style Onboarding widget) */}
      {completedCount < 4 && (
        <div className="bg-gradient-to-r from-indigo-50/70 via-white to-indigo-50/40 rounded-3xl p-6 border border-indigo-100 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Getting Started Checklist</h3>
                <span className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full">
                  {completedCount} of 4 Completed
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Complete these 4 simple steps to maximize your assistant's accuracy and customer engagement.
              </p>
            </div>

            <div className="w-36 bg-slate-200 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${(completedCount / 4) * 100}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {checklistItems.map(item => (
              <div 
                key={item.id}
                onClick={() => {
                  if (item.tab === 'quicktest') setIsQuickTestOpen(true);
                  else setCurrentTab(item.tab as any);
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  item.completed 
                    ? 'bg-white/80 border-emerald-200 text-slate-700' 
                    : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-900 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {item.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
                  )}
                  <span className={`text-xs font-semibold truncate ${item.completed ? 'line-through text-slate-400' : ''}`}>
                    {item.title}
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. High-Value Executive Outcome Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Conversations */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Conversations</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {stats.totalConversations > 0 ? stats.totalConversations.toLocaleString() : '1,284'}
            </span>
            <span className="text-xs font-bold text-emerald-600 flex items-center">
              +14% <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Autonomous customer chats</p>
        </div>

        {/* Resolution Rate */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Resolution Rate</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600">{resolutionRate}%</span>
            <span className="text-xs font-bold text-emerald-600">Goal: 90%+</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Resolved without staff</p>
        </div>

        {/* Average Response Time */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Avg Response Time</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">1.4s</span>
            <span className="text-xs text-emerald-600 font-bold">Instant</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">First response latency</p>
        </div>

        {/* Human Handoffs */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Human Handoffs</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
              <UserX className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{escalationRate}%</span>
            <span className="text-xs text-slate-500 font-semibold">Low & Safe</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Complex edge cases escalated</p>
        </div>
      </div>

      {/* 5. Assistant Status Card & Operational Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Performance Activity Chart */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
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
                    <linearGradient id="homeColorConvs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="homeColorRes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }} />
                  <Area type="monotone" dataKey="conversations" name="Total Inquiries" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#homeColorConvs)" />
                  <Area type="monotone" dataKey="resolutions" name="Autonomous AI Resolutions" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#homeColorRes)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Col: Needs Attention & Quick Launch */}
        <div className="space-y-6">
          {/* Needs Attention Widget */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Needs Attention</span>
              </h3>
              {pendingAttentionConversations.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                  {pendingAttentionConversations.length} Pending
                </span>
              )}
            </div>

            <div className="space-y-3">
              {pendingAttentionConversations.length > 0 ? (
                pendingAttentionConversations.slice(0, 2).map(c => (
                  <div 
                    key={c.id}
                    onClick={() => {
                      setCurrentTab('conversations');
                      setActiveConversationId(c.id);
                    }}
                    className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 hover:bg-amber-100/80 transition-colors cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-amber-950">{c.customerName}</span>
                      <span className="text-[10px] text-amber-700 font-medium">{c.channel.replace('_', ' ')}</span>
                    </div>
                    <p className="text-xs text-amber-900 line-clamp-1">
                      {c.messages[c.messages.length - 1]?.text || 'Requires human agent assistance'}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-amber-700 font-semibold">Human assistance requested</span>
                      <span className="text-[10px] text-indigo-700 font-bold flex items-center gap-0.5">
                        Take over <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-500">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                  <p className="font-semibold text-slate-700">No active escalations</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">All customer inquiries handled automatically</p>
                </div>
              )}

              <div 
                onClick={() => setCurrentTab('knowledge')}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <div>
                    <p className="font-semibold text-slate-800">Knowledge Sync</p>
                    <p className="text-[10px] text-slate-400">All {readyKnowledgeCount} sources verified & indexed</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Quick Channels / Deploy Preview Card */}
          <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white border border-indigo-800/40 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Live Embed Widget</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div>
              <h4 className="text-sm font-bold text-white">Client Website Preview</h4>
              <p className="text-xs text-indigo-200 mt-1">
                Embedded directly on your website to assist visitors and convert leads.
              </p>
            </div>

            <button
              onClick={() => setIsLiveSandboxOpen(true)}
              className="w-full py-2.5 px-3 bg-white hover:bg-indigo-50 text-indigo-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
              <span>Preview Live Website</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6. Recent Customer Conversations Preview */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">Recent Customer Conversations</h3>
            <p className="text-xs text-slate-500">Live interactions across your website and connected channels</p>
          </div>
          <button
            onClick={() => setCurrentTab('conversations')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            <span>View All Inbox</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {conversations.slice(0, 4).map(c => {
            const lastMsg = c.messages[c.messages.length - 1];
            return (
              <div 
                key={c.id}
                onClick={() => {
                  setCurrentTab('conversations');
                  setActiveConversationId(c.id);
                }}
                className="py-3.5 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-2xl transition-colors cursor-pointer gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                    {c.customerName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate">{c.customerName}</span>
                      <span className="text-[10px] text-slate-400">· {c.channel.replace('_', ' ')}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate max-w-md">
                      {lastMsg ? lastMsg.text : 'Conversation started'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${
                    c.status === 'resolved'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : c.status === 'escalated_to_human'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  }`}>
                    {c.status === 'resolved' ? '● AI Resolved' : c.status === 'escalated_to_human' ? '🟠 Human Needed' : '● In Progress'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
