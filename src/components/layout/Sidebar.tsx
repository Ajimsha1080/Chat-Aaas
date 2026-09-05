import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Zap, 
  MessageSquare, 
  BarChart3, 
  Globe, 
  Settings, 
  Sparkles,
  ExternalLink,
  Bot,
  PlaySquare,
  CheckCircle2,
  PauseCircle
} from 'lucide-react';
import { useApp } from '../../context';
import { NavigationTab } from '../../types';

export const Sidebar: React.FC = () => {
  const { 
    currentTab, 
    setCurrentTab, 
    currentCompany,
    setIsLiveSandboxOpen,
    setIsQuickTestOpen
  } = useApp();

  const primaryNavItems: { id: NavigationTab; label: string; icon: any; badge?: string }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'my_agent', label: 'My AI Employee', icon: Bot },
    { id: 'conversations', label: 'Support Inbox', icon: MessageSquare, badge: 'Live' },
    { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
    { id: 'actions', label: 'Actions & Tools', icon: Zap },
    { id: 'channels', label: 'Widget & Deploy', icon: Globe },
    { id: 'analytics', label: 'Analytics & ROI', icon: BarChart3 },
    { id: 'settings', label: 'Settings & Billing', icon: Settings }
  ];

  return (
    <aside className="w-64 bg-slate-950 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Clean Brand Header */}
      <div className="p-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold text-lg tracking-wider">
            <Sparkles className="w-5 h-5 text-indigo-100" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-bold text-white text-sm tracking-tight block truncate">Chat-AaaS</span>
            <span className="text-[10px] font-medium text-indigo-400 uppercase tracking-wider block">AI Employee Platform</span>
          </div>
        </div>
      </div>

      {/* Primary Navigation Menu */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-1.5">
          Workspace
        </div>

        {primaryNavItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  isActive ? 'bg-indigo-700/80 text-white' : 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* AI Employee Snapshot Card & Quick Test */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/90 space-y-2">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">AI Employee</span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              currentCompany.agent.status === 'active' 
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
            }`}>
              {currentCompany.agent.status === 'active' ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              ) : (
                <PauseCircle className="w-3 h-3 text-amber-400" />
              )}
              {currentCompany.agent.status === 'active' ? 'Live' : 'Paused'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <img 
              src={currentCompany.agent.avatarUrl} 
              alt={currentCompany.agent.name} 
              className="w-8 h-8 rounded-xl object-cover ring-2 ring-indigo-500/40" 
            />
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold text-white truncate">{currentCompany.agent.name}</h4>
              <p className="text-[10px] text-slate-400 truncate">{currentCompany.agent.role || 'Customer Specialist'}</p>
            </div>
          </div>

          <button
            onClick={() => setIsQuickTestOpen(true)}
            className="w-full mt-2.5 py-1.5 px-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <PlaySquare className="w-3.5 h-3.5" />
            <span>Test Employee</span>
          </button>
        </div>

        {/* Website Sandbox Preview Button */}
        <button
          onClick={() => setIsLiveSandboxOpen(true)}
          className="w-full flex items-center justify-between px-3 py-2 bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-medium transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            <span>Website Preview</span>
          </div>
          <span className="text-[10px] text-slate-500">Live</span>
        </button>
      </div>
    </aside>
  );
};
