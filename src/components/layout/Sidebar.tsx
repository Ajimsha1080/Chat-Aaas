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
    <aside className="w-64 bg-[#090d16] text-slate-300 flex flex-col shrink-0 border-r border-slate-800/70 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 text-white font-bold text-lg tracking-tight">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-bold text-white text-sm tracking-tight block truncate">Chat-AaaS</span>
            <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest block">AI Q&A Platform</span>
          </div>
        </div>
      </div>

      {/* AI Assistant Profile Card */}
      <div className="px-3 pt-3.5 pb-2">
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Your Assistant</span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              isLive 
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>{isLive ? 'Live' : 'Paused'}</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <img 
              src={currentCompany.agent.avatarUrl} 
              alt={currentCompany.agent.name} 
              className="w-9 h-9 rounded-xl object-cover ring-2 ring-indigo-500/30 shadow-md" 
            />
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold text-white truncate tracking-tight">{currentCompany.agent.name}</h4>
              <p className="text-[11px] text-slate-400 truncate">{currentCompany.agent.role || 'Q&A Assistant'}</p>
            </div>
          </div>

          <button
            onClick={() => setIsQuickTestOpen(true)}
            className="w-full mt-2.5 py-1.5 px-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-200 hover:text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-[0.99]"
          >
            <PlaySquare className="w-3.5 h-3.5 text-indigo-400" />
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
                      ? 'bg-indigo-600/20 text-white font-bold border-l-2 border-indigo-400 pl-2.5 shadow-sm shadow-indigo-600/10'
                      : 'text-slate-300 hover:bg-slate-900/80 hover:text-white font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span className="tracking-tight">{item.label}</span>
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
        <div className="pt-2 border-t border-slate-800/60 space-y-1">
          <button
            onClick={() => setCurrentTab('settings')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              currentTab === 'settings'
                ? 'bg-indigo-600/20 text-white font-bold border-l-2 border-indigo-400 pl-2.5 shadow-sm shadow-indigo-600/10'
                : 'text-slate-300 hover:bg-slate-900/80 hover:text-white font-medium'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Settings className={`w-4 h-4 ${currentTab === 'settings' ? 'text-indigo-400' : 'text-slate-400'}`} />
              <span className="tracking-tight">Settings</span>
            </div>
          </button>
        </div>
      </div>
    </aside>
  );
};
