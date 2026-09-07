import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  MessageSquare, 
  BarChart3, 
  Globe, 
  Settings, 
  Sparkles,
  X
} from 'lucide-react';
import { useApp } from '../../context';
import { NavigationTab } from '../../types';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen = false, onCloseMobile }) => {
  const { 
    currentTab, 
    setCurrentTab, 
    conversations
  } = useApp();

  const unreadConversationsCount = conversations.filter(c => c.status === 'escalated_to_human' || c.status === 'flagged').length;

  const handleSelectTab = (tab: NavigationTab) => {
    setCurrentTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

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
      groupName: 'Distribution & Analytics',
      items: [
        { id: 'deploy', label: 'Deploy', icon: Globe },
        { id: 'insights', label: 'Analytics', icon: BarChart3 }
      ]
    }
  ];

  const sidebarContent = (
    <div className="w-64 bg-[#090d16] text-slate-300 flex flex-col h-full shrink-0 border-r border-slate-800/70 select-none">
      {/* Brand Header */}
      <div className="p-4.5 border-b border-slate-800/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 text-white font-bold text-lg tracking-tight shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-bold text-white text-base tracking-tight block truncate">Chat-AaaS</span>
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block">AI Q&A Platform</span>
          </div>
        </div>
        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Primary Navigation Items */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3">
        {customerNavGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {group.groupName && (
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 pt-2.5 pb-1">
                {group.groupName}
              </div>
            )}
            {group.items.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600/25 text-white font-bold border-l-2 border-indigo-400 pl-3 shadow-xs'
                      : 'text-slate-300 hover:bg-slate-900/80 hover:text-white font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4.5 h-4.5 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span className="tracking-tight">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold font-mono ${
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
        <div className="pt-2.5 border-t border-slate-800/60 space-y-1">
          <button
            onClick={() => handleSelectTab('settings')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm transition-all cursor-pointer ${
              currentTab === 'settings'
                ? 'bg-indigo-600/25 text-white font-bold border-l-2 border-indigo-400 pl-3 shadow-xs'
                : 'text-slate-300 hover:bg-slate-900/80 hover:text-white font-medium'
            }`}
          >
            <div className="flex items-center gap-3">
              <Settings className={`w-4.5 h-4.5 ${currentTab === 'settings' ? 'text-indigo-400' : 'text-slate-400'}`} />
              <span className="tracking-tight">Settings</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Static Sidebar */}
      <aside className="hidden md:flex h-full shrink-0">
        {sidebarContent}
      </aside>

      {/* 2. Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs" 
            onClick={onCloseMobile} 
          />
          <div className="relative flex-1 max-w-[280px] w-full bg-[#090d16] shadow-2xl h-full animate-in slide-in-from-left duration-200 z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
