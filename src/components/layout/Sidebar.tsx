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
    <div className="w-64 bg-slate-50/80 text-slate-700 flex flex-col h-full shrink-0 border-r border-slate-200/80 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-white/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs text-base shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-bold text-slate-900 text-sm tracking-tight block truncate">Chat-AaaS</span>
            <span className="text-[11px] font-medium text-slate-500 block truncate">AI Assistant Platform</span>
          </div>
        </div>
        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Primary Navigation Items */}
      <div className="flex-1 overflow-y-auto px-3 py-3.5 space-y-3.5">
        {customerNavGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {group.groupName && (
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 pt-2 pb-1">
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
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 font-semibold shadow-xs border border-slate-200/90'
                      : 'text-slate-600 hover:bg-slate-100/90 hover:text-slate-900 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="tracking-tight text-sm">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-bold font-mono bg-amber-50 text-amber-700 border border-amber-200">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* Customer Settings Divider */}
        <div className="pt-2 border-t border-slate-200/80 space-y-1">
          <button
            onClick={() => handleSelectTab('settings')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all cursor-pointer ${
              currentTab === 'settings'
                ? 'bg-white text-slate-900 font-semibold shadow-xs border border-slate-200/90'
                : 'text-slate-600 hover:bg-slate-100/90 hover:text-slate-900 font-medium'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Settings className={`w-4 h-4 ${currentTab === 'settings' ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span className="tracking-tight text-sm">Settings</span>
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
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs" 
            onClick={onCloseMobile} 
          />
          <div className="relative flex-1 max-w-[280px] w-full bg-white shadow-2xl h-full animate-in slide-in-from-left duration-200 z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
