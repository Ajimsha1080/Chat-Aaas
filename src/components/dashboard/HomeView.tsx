import React, { useState } from 'react';
import { 
  Play, 
  CheckCircle2, 
  MessageSquare, 
  Clock, 
  UserX, 
  BookOpen, 
  Zap, 
  ArrowRight, 
  AlertTriangle, 
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
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
    integrations,
    setCurrentTab, 
    setIsQuickTestOpen, 
    setActiveConversationId, 
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
    const snippet = `<script src="https://cdn.chat-aaas.com/v1/widget.js" data-agent-key="${currentCompany.apiKey}" defer></script>`;
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
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* 1. Header Command Center */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative shrink-0">
              <img 
                src={currentCompany.agent.avatarUrl} 
                alt={currentCompany.agent.name} 
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-slate-200"
              />
              <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-white ${
                isLive ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">
                  {currentCompany.name} Overview
                </h1>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-md ${
                  isLive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                    : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {isLive ? 'Active & Answering' : 'Paused'}
                </span>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60 font-mono">
                  {currentCompany.agent.name} · {currentCompany.agent.role || 'Customer Specialist'}
                </span>
              </div>

              <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                Autonomous AI resolution engine for customer inquiries across website, WhatsApp, and API integrations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => setIsQuickTestOpen(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Test Assistant</span>
            </button>

            <button
              onClick={() => setCurrentTab('assistant')}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors border border-slate-200 cursor-pointer shadow-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Configure Persona</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Quick Actions Strip */}
      <div className="bg-white rounded-lg p-2.5 border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3 overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0 pl-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:inline">
            Quick Actions
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setCurrentTab('knowledge')}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/70 text-slate-700 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200/60"
          >
            <Upload className="w-3.5 h-3.5 text-slate-600" />
            <span>Upload Document</span>
          </button>

          <button
            onClick={handleCopyScript}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/70 text-slate-700 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200/60"
          >
            {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copiedSnippet ? 'Copied' : 'Copy Embed Code'}</span>
          </button>

          <button
            onClick={() => setIsLiveSandboxOpen(true)}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/70 text-slate-700 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200/60"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
            <span>Live Web Preview</span>
          </button>

          <button
            onClick={() => setCurrentTab('deploy')}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/70 text-slate-700 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200/60"
          >
            <Zap className="w-3.5 h-3.5 text-amber-600" />
            <span>Channels & API</span>
          </button>
        </div>
      </div>

      {/* 3. Getting Started Checklist */}
      {completedCount < 4 && (
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
            <div>
              <div className="flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-semibold text-slate-900">Setup Checklist</h3>
                <span className="text-[11px] bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded border border-slate-200">
                  {completedCount} of 4 Completed
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete these initial steps to calibrate your assistant and ingest verified knowledge.
              </p>
            </div>

            <div className="w-32 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200/60">
              <div 
                className="bg-slate-900 h-full rounded-full transition-all duration-300"
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
                className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                  item.completed 
                    ? 'bg-slate-50/60 border-slate-200 text-slate-600' 
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {item.completed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
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

      {/* 4. Core Outcome Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Total Conversations */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Total Inquiries</span>
            <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200/50">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {stats.totalConversations > 0 ? stats.totalConversations.toLocaleString() : '1,284'}
            </span>
            <span className="text-[11px] font-medium text-emerald-600 flex items-center">
              +14% <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Autonomous customer chats</p>
        </div>

        {/* Resolution Rate */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Resolution Rate</span>
            <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 tracking-tight">{resolutionRate}%</span>
            <span className="text-[11px] font-medium text-slate-400">Target: 90%+</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Resolved without staff</p>
        </div>

        {/* Average Response Time */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Avg Response Time</span>
            <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">1.4s</span>
            <span className="text-[11px] text-emerald-600 font-medium">Sub-second</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">First response latency</p>
        </div>

        {/* Human Handoffs */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Escalations</span>
            <div className="w-7 h-7 rounded-md bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
              <UserX className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">{escalationRate}%</span>
            <span className="text-[11px] text-slate-400 font-medium">Controlled</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Complex edge cases escalated</p>
        </div>
      </div>

      {/* 5. Activity Chart & Attention Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Activity Chart */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-semibold text-slate-900">Weekly Conversation Throughput</h3>
                <p className="text-[11px] text-slate-400">Autonomous resolutions vs total incoming customer inquiries</p>
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 bg-slate-100 rounded border border-slate-200 text-slate-600">
                Last 7 Days
              </span>
            </div>

            <div className="h-60 w-full">
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
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#090d16', borderRadius: '8px', border: '1px solid #1e293b', color: '#f8fafc', fontSize: '11px' }} />
                  <Area type="monotone" dataKey="conversations" name="Total Inquiries" stroke="#0f172a" strokeWidth={2} fillOpacity={1} fill="url(#homeColorConvs)" />
                  <Area type="monotone" dataKey="resolutions" name="Autonomous Resolutions" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#homeColorRes)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Col: Needs Attention & Deployment Status */}
        <div className="space-y-4">
          {/* Needs Attention Widget */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Attention Queue</span>
              </h3>
              {pendingAttentionConversations.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60 font-medium">
                  {pendingAttentionConversations.length} Pending
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {pendingAttentionConversations.length > 0 ? (
                pendingAttentionConversations.slice(0, 2).map(c => (
                  <div 
                    key={c.id}
                    onClick={() => {
                      setCurrentTab('conversations');
                      setActiveConversationId(c.id);
                    }}
                    className="p-3 rounded-lg bg-amber-50/50 border border-amber-200/60 hover:bg-amber-100/60 transition-colors cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900">{c.customerName}</span>
                      <span className="text-[10px] text-amber-700 font-mono">{c.channel.replace('_', ' ')}</span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-1">
                      {c.messages[c.messages.length - 1]?.text || 'Requires human agent review'}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-amber-700 font-medium">Escalated to staff</span>
                      <span className="text-[10px] text-slate-900 font-semibold flex items-center gap-0.5">
                        Open <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 text-center text-xs text-slate-500">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                  <p className="font-medium text-slate-700">No active escalations</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">All customer inquiries handled automatically</p>
                </div>
              )}

              <div 
                onClick={() => setCurrentTab('knowledge')}
                className="p-3 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 text-xs flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-3.5 h-3.5 text-slate-600" />
                  <div>
                    <p className="font-medium text-slate-800">Knowledge Base</p>
                    <p className="text-[10px] text-slate-400">{readyKnowledgeCount} sources verified & indexed</p>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Quick Channels / Deploy Preview Card */}
          <div className="bg-slate-900 rounded-xl p-4.5 text-white border border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.05)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Website Widget</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>

            <div>
              <h4 className="text-xs font-semibold text-white">Live Customer Preview</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Test your assistant on a simulated live website before embedding.
              </p>
            </div>

            <button
              onClick={() => setIsLiveSandboxOpen(true)}
              className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-900 font-medium rounded-lg text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-700" />
              <span>Launch Live Preview</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6. Recent Customer Conversations Preview */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h3 className="text-xs font-semibold text-slate-900">Recent Customer Inquiries</h3>
            <p className="text-[11px] text-slate-400">Live interactions across your website and connected channels</p>
          </div>
          <button
            onClick={() => setCurrentTab('conversations')}
            className="text-xs font-medium text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
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
                className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition-colors cursor-pointer gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-semibold text-slate-700 text-xs shrink-0 border border-slate-200/60">
                    {c.customerName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900 truncate">{c.customerName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">· {c.channel.replace('_', ' ')}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate max-w-md">
                      {lastMsg ? lastMsg.text : 'Conversation started'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                    c.status === 'resolved'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      : c.status === 'escalated_to_human'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                      : 'bg-slate-100 text-slate-700 border border-slate-200/60'
                  }`}>
                    {c.status === 'resolved' ? 'Resolved' : c.status === 'escalated_to_human' ? 'Staff Needed' : 'In Progress'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
