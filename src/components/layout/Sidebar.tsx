import React from 'react';
import { 
  LayoutDashboard, 
  Bot, 
  BookOpen, 
  Puzzle, 
  Zap, 
  MessageSquare, 
  BarChart3, 
  Code2, 
  CreditCard, 
  Settings, 
  ShieldAlert, 
  PlaySquare, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  PauseCircle,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../../context';
import { NavigationTab } from '../../types';

export const Sidebar: React.FC = () => {
  const { 
    currentTab, 
    setCurrentTab, 
    isAdminMode, 
    setIsAdminMode, 
    currentCompany,
    setIsLiveSandboxOpen,
    setIsQuickTestOpen
  } = useApp();

  const navItems: { id: NavigationTab; label: string; icon: React.FC<{ className?: string }>; badge?: string }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'my-agent', label: 'My Agent', icon: Bot, badge: '1 Agent' },
    { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
    { id: 'integrations', label: 'Integrations', icon: Puzzle },
    { id: 'actions', label: 'Actions', icon: Zap },
    { id: 'conversations', label: 'Conversations', icon: MessageSquare },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'deploy', label: 'Deploy', icon: Code2 },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <aside className="w-64 bg-slate-950 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold text-lg tracking-wider">
            <Sparkles className="w-5 h-5 text-indigo-100" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-base tracking-tight">Agent-as-a-Service</span>
            </div>
            <span className="text-[11px] font-medium text-indigo-400 uppercase tracking-wider block">Single-Agent SaaS</span>
          </div>
        </div>
      </div>

      {/* Active Company Agent Quick Card */}
      <div className="px-3 pt-4 pb-2">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Assigned AI Agent</span>
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
              {currentCompany.agent.status === 'active' ? 'Active' : 'Paused'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <img 
              src={currentCompany.agent.avatarUrl} 
              alt={currentCompany.agent.name} 
              className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/40" 
            />
            <div className="overflow-hidden">
              <h4 className="text-xs font-semibold text-white truncate">{currentCompany.agent.name}</h4>
              <p className="text-[11px] text-slate-400 capitalize truncate">{currentCompany.agent.tone} Tone</p>
            </div>
          </div>

          <button
            onClick={() => setIsQuickTestOpen(true)}
            className="w-full mt-2.5 py-1.5 px-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all"
          >
            <PlaySquare className="w-3.5 h-3.5" />
            <span>Test Agent Sandbox</span>
          </button>
        </div>
      </div>

      {/* Primary Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1">
          Workspace Navigation
        </div>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = !isAdminMode && currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setIsAdminMode(false);
                setCurrentTab(item.id);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
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
                  isActive ? 'bg-indigo-700/80 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Client Website Sandbox & Admin Mode Controls */}
      <div className="p-3 border-t border-slate-800/80 space-y-2 bg-slate-950/80">
        <button
          onClick={() => setIsLiveSandboxOpen(true)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gradient-to-r from-emerald-600/20 to-teal-600/10 hover:from-emerald-600/30 hover:to-teal-600/20 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-medium transition-all"
        >
          <div className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            <span>Client Website Preview</span>
          </div>
          <ChevronRight className="w-3 h-3 text-emerald-400/70" />
        </button>

        <button
          onClick={() => setIsAdminMode(!isAdminMode)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
            isAdminMode
              ? 'bg-rose-600/20 text-rose-300 border-rose-500/40 shadow-sm'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-800 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className={`w-3.5 h-3.5 ${isAdminMode ? 'text-rose-400' : 'text-slate-400'}`} />
            <span>Platform Admin Panel</span>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${
            isAdminMode ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'
          }`}>
            {isAdminMode ? 'Live' : 'Super'}
          </span>
        </button>
      </div>
    </aside>
  );
};
