import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Zap, 
  MessageSquare, 
  BarChart3, 
  Globe, 
  Settings, 
  ShieldAlert, 
  PlaySquare, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  PauseCircle,
  CheckCircle2,
  Bot,
  Key,
  Webhook,
  Terminal,
  Layers,
  GitBranch,
  Cpu,
  Code2,
  Building2,
  CreditCard,
  TrendingUp,
  HeartPulse,
  FileText,
  HelpCircle,
  Activity,
  DollarSign,
  ChevronDown
} from 'lucide-react';
import { useApp } from '../../context';
import { NavigationTab, AdminNavigationTab, DeveloperNavigationTab, ProductExperience } from '../../types';

export const Sidebar: React.FC = () => {
  const { 
    currentExperience,
    setCurrentExperience,
    currentTab, 
    setCurrentTab, 
    currentAdminTab,
    setCurrentAdminTab,
    currentDevTab,
    setCurrentDevTab,
    currentCompany,
    currentUserRole,
    setIsLiveSandboxOpen,
    setIsQuickTestOpen
  } = useApp();

  const [isExpDropdownOpen, setIsExpDropdownOpen] = useState(false);

  // Customer experience navigation
  const customerNavItems: { id: NavigationTab; label: string; icon: any; badge?: string }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
    { id: 'actions', label: 'Actions', icon: Zap },
    { id: 'conversations', label: 'Conversations', icon: MessageSquare, badge: 'Live' },
    { id: 'channels', label: 'Channels', icon: Globe },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  // Developer console navigation
  const developerNavItems: { id: DeveloperNavigationTab; label: string; icon: any }[] = [
    { id: 'api-keys', label: 'API Keys', icon: Key },
    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
    { id: 'api-logs', label: 'API Logs', icon: Terminal },
    { id: 'integrations', label: 'Integrations', icon: Layers },
    { id: 'agent-versions', label: 'Agent Versions', icon: GitBranch },
    { id: 'advanced-ai', label: 'Advanced AI', icon: Cpu },
    { id: 'dev-tools', label: 'Developer Tools', icon: Code2 }
  ];

  // Admin console navigation
  const adminNavItems: { id: AdminNavigationTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'organizations', label: 'Organizations', icon: Building2 },
    { id: 'agents', label: 'Agent Fleet', icon: Bot },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'revenue', label: 'Revenue', icon: DollarSign },
    { id: 'usage', label: 'Global Usage', icon: Activity },
    { id: 'support', label: 'Support Diagnostics', icon: HelpCircle },
    { id: 'health', label: 'System Health', icon: HeartPulse },
    { id: 'security', label: 'Security & SSRF', icon: ShieldAlert },
    { id: 'audit', label: 'Audit Logs', icon: FileText },
    { id: 'settings', label: 'Platform Settings', icon: Settings }
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
            <span className="font-bold text-white text-sm tracking-tight block truncate">Agent-as-a-Service</span>
            <span className="text-[10px] font-medium text-indigo-400 uppercase tracking-wider block">Enterprise AI</span>
          </div>
        </div>

        {/* Experience Switcher Pill */}
        <div className="relative mt-3">
          <button
            onClick={() => setIsExpDropdownOpen(!isExpDropdownOpen)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate">
              {currentExperience === 'customer' && <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
              {currentExperience === 'developer' && <Code2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
              {currentExperience === 'admin' && <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
              <span className="truncate">
                {currentExperience === 'customer' ? 'Company App' : currentExperience === 'developer' ? 'Developer Console' : 'Platform Admin'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          </button>

          {isExpDropdownOpen && (
            <div className="absolute left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in duration-150">
              <div className="px-3 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Product Experience
              </div>
              <button
                onClick={() => {
                  setCurrentExperience('customer');
                  setIsExpDropdownOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-medium hover:bg-slate-800 transition-colors ${
                  currentExperience === 'customer' ? 'text-indigo-400 font-bold bg-slate-800/50' : 'text-slate-300'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <div>
                  <p className="leading-tight">Company Workspace</p>
                  <p className="text-[10px] text-slate-500 font-normal">Business & AI employee</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setCurrentExperience('developer');
                  setIsExpDropdownOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-medium hover:bg-slate-800 transition-colors ${
                  currentExperience === 'developer' ? 'text-emerald-400 font-bold bg-slate-800/50' : 'text-slate-300'
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                <div>
                  <p className="leading-tight">Developer Console</p>
                  <p className="text-[10px] text-slate-500 font-normal">APIs, webhooks & SDK</p>
                </div>
              </button>

              {(currentUserRole === 'platform_super_admin' || currentUserRole === 'platform_admin' || currentUserRole === 'owner') && (
                <button
                  onClick={() => {
                    setCurrentExperience('admin');
                    setIsExpDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-medium hover:bg-slate-800 transition-colors ${
                    currentExperience === 'admin' ? 'text-rose-400 font-bold bg-slate-800/50' : 'text-slate-300'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <div>
                    <p className="leading-tight">Platform Admin</p>
                    <p className="text-[10px] text-slate-500 font-normal">Fleet & tenant operator</p>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* AI Employee Profile Card (Shown in Customer & Developer mode) */}
      {currentExperience !== 'admin' && (
        <div className="px-3 pt-3 pb-2">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Your AI Employee</span>
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
                className="w-9 h-9 rounded-xl object-cover ring-2 ring-indigo-500/40" 
              />
              <div className="overflow-hidden">
                <h4 className="text-xs font-bold text-white truncate">{currentCompany.agent.name}</h4>
                <p className="text-[11px] text-slate-400 truncate">{currentCompany.agent.role || 'Customer Specialist'}</p>
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
        </div>
      )}

      {/* Primary Navigation Items for current experience */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1">
          {currentExperience === 'customer' ? 'Company Menu' : currentExperience === 'developer' ? 'Developer Tools' : 'Operator Menu'}
        </div>

        {/* Customer App Navigation */}
        {currentExperience === 'customer' && customerNavItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
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

        {/* Developer Console Navigation */}
        {currentExperience === 'developer' && developerNavItems.map(item => {
          const Icon = item.icon;
          const isActive = currentDevTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentDevTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-600/30'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
            </button>
          );
        })}

        {/* Admin Console Navigation */}
        {currentExperience === 'admin' && adminNavItems.map(item => {
          const Icon = item.icon;
          const isActive = currentAdminTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentAdminTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-rose-600 text-white font-semibold shadow-md shadow-rose-600/30'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Sandbox Link */}
      <div className="p-3 border-t border-slate-800/80 space-y-2 bg-slate-950/80">
        <button
          onClick={() => setIsLiveSandboxOpen(true)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gradient-to-r from-emerald-600/20 to-teal-600/10 hover:from-emerald-600/30 hover:to-teal-600/20 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-medium transition-all cursor-pointer"
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
