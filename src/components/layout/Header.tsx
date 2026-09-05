import React, { useState } from 'react';
import { 
  Building, 
  ChevronDown, 
  Plus, 
  Play, 
  Pause, 
  Sparkles, 
  ExternalLink, 
  Check, 
  UserCircle,
  Settings,
  LogOut
} from 'lucide-react';
import { useApp } from '../../context';

interface HeaderProps {
  onOpenOnboarding: () => void;
  onOpenTestRunner?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenOnboarding }) => {
  const { 
    companies, 
    currentCompanyId, 
    currentCompany, 
    switchCompany, 
    currentPlan, 
    toggleAgentStatus,
    setCurrentTab,
    setIsLiveSandboxOpen,
    setIsQuickTestOpen
  } = useApp();

  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10 shrink-0 select-none">
      {/* Left: Workspace Selector & Status Toggle */}
      <div className="flex items-center gap-4">
        {/* Company Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 transition-colors shadow-xs cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
              <Building className="w-3.5 h-3.5" />
            </div>
            <span className="max-w-[180px] truncate">{currentCompany.name}</span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {isCompanyDropdownOpen && (
            <div className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3.5 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Select Workspace
              </div>
              {companies.map(comp => (
                <button
                  key={comp.id}
                  onClick={() => {
                    switchCompany(comp.id);
                    setIsCompanyDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2 text-left text-xs font-medium hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                >
                  <div className="overflow-hidden">
                    <p className="font-semibold text-slate-900 truncate">{comp.name}</p>
                    <p className="text-[11px] text-slate-500 capitalize">{comp.industry}</p>
                  </div>
                  {comp.id === currentCompanyId && (
                    <Check className="w-4 h-4 text-indigo-600 shrink-0 ml-2" />
                  )}
                </button>
              ))}
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={() => {
                    setIsCompanyDropdownOpen(false);
                    onOpenOnboarding();
                  }}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Workspace</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Live Status Indicator Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <span className="text-xs text-slate-500 font-medium hidden md:inline">AI Employee:</span>
          <button
            onClick={toggleAgentStatus}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              currentCompany.agent.status === 'active'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
            }`}
            title="Click to toggle agent status"
          >
            {currentCompany.agent.status === 'active' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="w-2 h-2 rounded-full bg-emerald-500 -ml-3.5" />
                <span>Live</span>
                <Pause className="w-3 h-3 ml-0.5 text-emerald-600" />
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Paused</span>
                <Play className="w-3 h-3 ml-0.5 text-amber-600" />
              </>
            )}
          </button>
        </div>

        {/* Subscription Plan Badge */}
        <span className="hidden lg:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Sparkles className="w-3 h-3" />
          <span className="capitalize">{currentPlan.name}</span>
        </span>
      </div>

      {/* Right: Quick actions & User profile */}
      <div className="flex items-center gap-3">
        {/* Quick Test Agent Sandbox */}
        <button
          onClick={() => setIsQuickTestOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 text-indigo-400" />
          <span>Test Employee</span>
        </button>

        {/* Client Website Sandbox */}
        <button
          onClick={() => setIsLiveSandboxOpen(true)}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Website Preview</span>
        </button>

        {/* Clean User Profile Dropdown */}
        <div className="relative border-l border-slate-200 pl-3">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 text-xs font-medium text-slate-700 hover:text-slate-900 py-1 px-2 rounded-xl hover:bg-slate-50 cursor-pointer"
          >
            <UserCircle className="w-5 h-5 text-slate-600" />
            <div className="text-left hidden md:block">
              <p className="font-semibold text-slate-800 leading-tight">Alex Vance</p>
              <p className="text-[10px] text-slate-400">Account Owner</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in duration-150">
              <div className="px-3.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                My Account
              </div>
              <button
                onClick={() => {
                  setCurrentTab('settings');
                  setIsUserMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium hover:bg-slate-50 text-slate-700 cursor-pointer"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span>Settings & Billing</span>
              </button>
              <div className="border-t border-slate-100 my-1"></div>
              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium hover:bg-rose-50 text-rose-600 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
