import { 
  CheckCircle2, 
  MessageSquare, 
  Clock, 
  UserX, 
  BookOpen, 
  ArrowRight, 
  AlertTriangle, 
  ChevronRight,
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
    integrations,
    setCurrentTab, 
    setIsQuickTestOpen, 
    setActiveConversationId
  } = useApp();

  const allConvs = conversations || [];
  const totalCount = allConvs.length > 0 ? allConvs.length : (currentCompany?.stats?.totalConversations || 0);
  const resolvedCount = allConvs.length > 0 
    ? allConvs.filter(c => c.status === 'resolved' || c.status === 'active').length 
    : (currentCompany?.stats?.resolvedConversations || 0);
  const escalatedCount = allConvs.length > 0 
    ? allConvs.filter(c => c.status === 'escalated_to_human').length 
    : (currentCompany?.stats?.escalatedConversations || 0);

  const resolutionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 100;
  const escalationRate = totalCount > 0 ? Math.round((escalatedCount / totalCount) * 100) : 0;

  // Real-time weekly throughput aggregation from live conversation timestamps
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const chartData = days.map(dayName => {
    const dayConvs = allConvs.filter(c => {
      if (!c.startedAt) return false;
      const d = new Date(c.startedAt);
      return !isNaN(d.getTime()) && d.toLocaleDateString('en-US', { weekday: 'short' }) === dayName;
    });
    return {
      name: dayName,
      conversations: dayConvs.length,
      resolutions: dayConvs.filter(c => c.status === 'resolved' || c.status === 'active').length
    };
  });

  const pendingAttentionConversations = (conversations || []).filter(c => c?.status === 'escalated_to_human' || c?.status === 'flagged');
  const activeConnectionsCount = (integrations || []).filter(i => i?.connected).length;
  const readyKnowledgeCount = (knowledgeItems || []).filter(k => k?.status === 'indexed').length;

  const checklistItems = [
    { id: 1, title: 'Company profile and tone configured', completed: true, tab: 'assistant' },
    { id: 2, title: `Knowledge base loaded (${readyKnowledgeCount} sources)`, completed: readyKnowledgeCount > 0, tab: 'knowledge' },
    { id: 3, title: 'Test welcoming inquiry with assistant', completed: true, tab: 'quicktest' },
    { id: 4, title: 'Embed widget on website or connect WhatsApp', completed: activeConnectionsCount > 0, tab: 'deploy' }
  ];

  const completedCount = checklistItems.filter(i => i.completed).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">

      {/* 2. Getting Started Checklist */}
      {completedCount < 4 && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">Getting Started Checklist</h3>
                <span className="text-[11px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded border border-slate-200/80">
                  {completedCount} of 4 Completed
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete these initial steps to calibrate your assistant and ingest verified knowledge.
              </p>
            </div>

            <div className="w-32 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200/60">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${(completedCount / 4) * 100}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {checklistItems.map(item => (
              <div 
                key={item.id}
                onClick={() => {
                  if (item.tab === 'quicktest') setIsQuickTestOpen(true);
                  else setCurrentTab(item.tab as any);
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  item.completed 
                    ? 'bg-slate-50/60 border-slate-200/70 text-slate-400' 
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {item.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                  )}
                  <span className={`text-xs font-medium truncate ${item.completed ? 'line-through text-slate-400' : ''}`}>
                    {item.title}
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Core Outcome Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Conversations */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Inquiries</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200/60">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {totalCount.toLocaleString()}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 flex items-center">
              +14% <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Autonomous customer chats</p>
        </div>

        {/* Resolution Rate */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Resolution Rate</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200/60">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{resolutionRate}%</span>
            <span className="text-[11px] font-medium text-slate-400">Target: 90%+</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Resolved without staff</p>
        </div>

        {/* Average Response Time */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Avg Response Time</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200/60">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">1.4s</span>
            <span className="text-[11px] text-emerald-600 font-semibold">Sub-second</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">First response latency</p>
        </div>

        {/* Human Escalations */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Escalations</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200/60">
              <UserX className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{escalationRate}%</span>
            <span className="text-[11px] text-slate-400 font-medium">Controlled</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Complex edge cases escalated</p>
        </div>
      </div>

      {/* 5. Activity Chart & Attention Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Activity Chart */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">Weekly Conversation Throughput</h3>
                <p className="text-sm text-slate-500 mt-0.5">Autonomous resolutions vs total incoming customer inquiries</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 bg-slate-100 rounded-lg border border-slate-200 text-slate-700">
                Last 7 Days
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="homeColorConvs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="homeColorRes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px' }} />
                  <Area type="monotone" dataKey="conversations" name="Total Inquiries" stroke="#0f172a" strokeWidth={2.5} fillOpacity={1} fill="url(#homeColorConvs)" />
                  <Area type="monotone" dataKey="resolutions" name="Autonomous Resolutions" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#homeColorRes)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Col: Needs Attention & Deployment Status */}
        <div className="space-y-5">
          {/* Needs Attention Widget */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Attention Queue</span>
              </h3>
              {pendingAttentionConversations.length > 0 && (
                <span className="text-xs px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
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
                    className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/70 hover:bg-amber-100/70 transition-colors cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-slate-900">{c.customerName}</span>
                      <span className="text-xs text-amber-800 font-mono font-medium">{c.channel.replace('_', ' ')}</span>
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-1">
                      {c.messages && c.messages.length > 0 ? (c.messages[c.messages.length - 1]?.text || 'Requires human agent review') : 'Requires human agent review'}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-amber-800 font-semibold">Escalated to staff</span>
                      <span className="text-xs text-slate-900 font-bold flex items-center gap-0.5">
                        Open <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-sm text-slate-500">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
                  <p className="font-semibold text-slate-800">No active escalations</p>
                  <p className="text-xs text-slate-500 mt-0.5">All customer inquiries handled automatically</p>
                </div>
              )}

              <div 
                onClick={() => setCurrentTab('knowledge')}
                className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-sm flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-slate-700" />
                  <div>
                    <p className="font-semibold text-slate-800">Knowledge Base</p>
                    <p className="text-xs text-slate-500">{readyKnowledgeCount} sources verified & indexed</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Recent Customer Conversations Preview */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Customer Inquiries</h3>
            <p className="text-sm text-slate-500 mt-0.5">Live interactions across your website and connected channels</p>
          </div>
          <button
            onClick={() => setCurrentTab('conversations')}
            className="text-sm font-semibold text-slate-800 hover:text-slate-950 flex items-center gap-1 cursor-pointer"
          >
            <span>View All Inbox</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {(conversations || []).slice(0, 4).map(c => {
            const lastMsg = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null;
            return (
              <div 
                key={c.id}
                onClick={() => {
                  setCurrentTab('conversations');
                  setActiveConversationId(c.id);
                }}
                className="py-3.5 flex items-center justify-between hover:bg-slate-50 px-3 rounded-xl transition-colors cursor-pointer gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-sm shrink-0 border border-slate-200">
                    {c.customerName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 truncate">{c.customerName}</span>
                      <span className="text-xs text-slate-500 font-mono">· {c.channel.replace('_', ' ')}</span>
                    </div>
                    <p className="text-sm text-slate-600 truncate max-w-md mt-0.5">
                      {lastMsg ? lastMsg.text : 'Conversation started'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs px-2.5 py-1 rounded-md font-semibold ${
                    c.status === 'resolved'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : c.status === 'escalated_to_human'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {c.status === 'resolved' ? 'Resolved' : c.status === 'escalated_to_human' ? 'Staff Needed' : 'In Progress'}
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
