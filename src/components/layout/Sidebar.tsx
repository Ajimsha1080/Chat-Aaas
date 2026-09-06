import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  MessageSquare, 
  BarChart3, 
  Globe, 
  Settings, 
  PlaySquare, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  PauseCircle,
  CheckCircle2,
  CreditCard
} from 'lucide-react';
import { useApp } from '../../context';
import { NavigationTab } from '../../types';

export const Sidebar: React.FC = () => {
  const { 
    currentTab, 
    setCurrentTab, 
    currentCompany,
    conversations,
    setIsLiveSandboxOpen,
    setIsQuickTestOpen
  } = useApp();

  const unreadConversationsCount = conversations.filter(c => c.status === 'escalated_to_human' || c.status === 'flagged').length;
  const isLive = currentCompany.agent.status === 'active';

  const customerNavGroups: {
    groupName?: string;
    items: { id: NavigationTab; label: string; icon: any; badge?: string }[];
  }[] = [
    {
      items: [
        { id: 'home', label: 'Home', icon: LayoutDashboard }
      ]
    },
    {
      groupName: 'Assistant',
      items: [
        { id: 'assistant', label: 'My Assistant', icon: Sparkles },
        { 
          id: 'conversations', 
          label: 'Conversations', 
          icon: MessageSquare, 
          badge: unreadConversationsCount > 0 ? `${unreadConversationsCount}` : undefined 
        }
      ]
    },
    {
      groupName: 'Knowledge Base',
      items: [
        { id: 'knowledge', label: 'Knowledge', icon: BookOpen }
      ]
    },
    {
      groupName: 'Distribution',
      items: [
        { id: 'deploy', label: 'Deploy', icon: Globe }
      ]
    },
    {
      groupName: 'Analytics & Account',
      items: [
        { id: 'insights', label: 'Insights', icon: BarChart3 },
        { id: 'billing', label: 'Billing', icon: CreditCard }
      ]
    }
  ];

  return (
    <aside className="w-64 bg-slate-950 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold text-lg tracking-wider">
            <Sparkles className="w-5 h-5 text-indigo-100" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-bold text-white text-sm tracking-tight block truncate">Chat-AaaS</span>
            <span className="text-[10px] font-medium text-indigo-400 uppercase tracking-wider block">AI Q&A Platform</span>
          </div>
        </div>
      </div>

      {/* AI Assistant Profile Card */}
      <div className="px-3 pt-3 pb-2">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Your AI Assistant</span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              isLive 
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
            }`}>
              {isLive ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              ) : (
                <PauseCircle className="w-3 h-3 text-amber-400" />
              )}
              {isLive ? 'Live' : 'Paused'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <img 
              src={currentCompany.agent.avatarUrl} 
              alt={currentCompany.agent.name} 
              className="w-9 h-9 rounded-xl object-cover ring-2 ring-indigo-500/40" 
            />
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold text-white truncate">{currentCompany.agent.name}</h4>
              <p className="text-[11px] text-slate-400 truncate">{currentCompany.agent.role || 'Q&A Assistant'}</p>
            </div>
          </div>

          <button
            onClick={() => setIsQuickTestOpen(true)}
            className="w-full mt-2.5 py-1.5 px-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <PlaySquare className="w-3.5 h-3.5" />
            <span>Test Assistant</span>
          </button>
        </div>
      </div>

      {/* Primary Navigation Items */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {customerNavGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {group.groupName && (
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 pt-2 pb-0.5">
                {group.groupName}
              </div>
            )}
            {group.items.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-500/15 text-indigo-200 font-bold border-l-2 border-indigo-400 pl-2.5 shadow-2xs'
                      : 'text-slate-300 hover:bg-slate-900/80 hover:text-white font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono ${
                      isActive 
                        ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-500/40' 
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* Customer Settings Divider */}
        <div className="pt-2 border-t border-slate-800/80 space-y-1">
          <button
            onClick={() => setCurrentTab('settings')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              currentTab === 'settings'
                ? 'bg-indigo-500/15 text-indigo-200 font-bold border-l-2 border-indigo-400 pl-2.5 shadow-2xs'
                : 'text-slate-300 hover:bg-slate-900/80 hover:text-white font-medium'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Settings className={`w-4 h-4 ${currentTab === 'settings' ? 'text-indigo-400' : 'text-slate-400'}`} />
              <span>Settings</span>
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Website Preview Link */}
      <div className="p-3 border-t border-slate-800/80 space-y-2 bg-slate-950/80">
        <button
          onClick={() => setIsLiveSandboxOpen(true)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gradient-to-r from-emerald-600/20 to-teal-600/10 hover:from-emerald-600/30 hover:to-teal-600/20 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-medium transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            <span>Client Website Preview</span>
          </div>
          <ChevronRight className="w-3 h-3 text-emerald-400/70" />
        </button>
      </div>
    </aside>
  );
};
