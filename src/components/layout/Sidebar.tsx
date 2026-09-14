import React from 'react';
import { 
  LayoutDashboard, 
  Sparkles, 
  BookOpen, 
  PlayCircle, 
  Globe, 
  MessageSquare, 
  Settings, 
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
    conversations,
    currentUserProfile
  } = useApp();

  const unreadConversationsCount = conversations.filter(c => c.status === 'escalated_to_human' || c.status === 'flagged').length;

  const handleSelectTab = (tab: NavigationTab) => {
    setCurrentTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  const coreNavItems: { id: NavigationTab; label: string; icon: any; badge?: string }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'assistant', label: 'Assistant', icon: Sparkles },
    { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
    { id: 'test', label: 'Test', icon: PlayCircle },
    { id: 'deploy', label: 'Deploy', icon: Globe },
    { 
      id: 'conversations', 
      label: 'Conversations', 
      icon: MessageSquare, 
      badge: unreadConversationsCount > 0 ? `${unreadConversationsCount}` : undefined 
    }
  ];

  const secondaryNavItems: { id: NavigationTab; label: string; icon: any }[] = [
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const sidebarContent = (
    <div className="w-64 bg-[#090d16] text-slate-300 flex flex-col h-full shrink-0 border-r border-slate-800/70 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/70 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white font-bold text-base shrink-0">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-bold text-white text-sm tracking-tight block truncate">CoarAI</span>
            <span className="text-[11px] font-medium text-slate-400 block truncate">AI Assistant Platform</span>
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
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {coreNavItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id || (item.id === 'test' && currentTab === 'playground');
          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600/20 text-white font-semibold border-l-2 border-indigo-400 pl-2.5 shadow-xs'
                  : 'text-slate-400 hover:bg-slate-900/90 hover:text-slate-200 font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span className="tracking-tight">{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold font-mono ${
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

        {/* Visual Divider */}
        <div className="pt-3 pb-2">
          <div className="border-t border-slate-800/80" />
        </div>

        {/* Secondary Settings Item */}
        {secondaryNavItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600/20 text-white font-semibold border-l-2 border-indigo-400 pl-2.5 shadow-xs'
                  : 'text-slate-400 hover:bg-slate-900/90 hover:text-slate-200 font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span className="tracking-tight">{item.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* User Identity Footer */}
      <div className="p-3 border-t border-slate-800/80 mt-auto shrink-0 bg-[#070a12]">
        <button
          onClick={() => handleSelectTab('settings')}
          className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/70 transition-colors text-left cursor-pointer group"
          title="View profile & account settings"
        >
          <div className="w-8.5 h-8.5 rounded-xl bg-slate-800 border border-slate-700/80 overflow-hidden flex items-center justify-center shrink-0">
            {currentUserProfile?.avatarUrl ? (
              <img src={currentUserProfile.avatarUrl} alt={currentUserProfile.fullName} className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold text-slate-200 text-xs">{currentUserProfile?.fullName?.charAt(0) || 'U'}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-white text-xs block truncate group-hover:text-indigo-300 transition-colors">
              {currentUserProfile?.fullName || 'User Profile'}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tight truncate">
                {currentUserProfile?.role || 'owner'}
              </span>
            </div>
          </div>
        </button>
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
