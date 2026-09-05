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
  Terminal
} from 'lucide-react';
import { useApp } from '../../context';
import { UserRole } from '../../types';

interface HeaderProps {
  onOpenOnboarding: () => void;
  onOpenTestRunner: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenOnboarding, onOpenTestRunner }) => {
  const { 
    companies, 
    currentCompanyId, 
    currentCompany, 
    switchCompany, 
    currentPlan, 
    toggleAgentStatus,
    currentUserRole,
    setCurrentUserRole,
    setCurrentExperience,
    setCurrentTab,
    setIsLiveSandboxOpen,
    setIsQuickTestOpen
  } = useApp();

  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  const usagePercent = Math.min(100, Math.round((currentCompany.stats.messagesThisMonth / currentPlan.maxConversationsMonth) * 100));

  const allRoles: { id: UserRole; label: string; desc: string; defaultExp: 'customer' | 'developer' | 'admin' }[] = [
    { id: 'platform_super_admin', label: 'Super Admin', desc: 'Full SaaS platform operator', defaultExp: 'admin' },
    { id: 'owner', label: 'Company Owner', desc: 'Organization executive & billing', defaultExp: 'customer' },
    { id: 'staff', label: 'Support Specialist', desc: 'Live chat & human takeover', defaultExp: 'customer' },
    { id: 'viewer', label: 'Viewer', desc: 'Read-only analytics access', defaultExp: 'customer' }
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10 shrink-0">
      {/* Left: Tenant Workspace Selector & Agent Status */}
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
                Select Company Workspace
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
                  <span>Create Company Workspace</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Agent Status Toggle Pill */}
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
                <span>Active</span>
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
          <span className="capitalize">{currentPlan.name} Plan</span>
        </span>
      </div>

      {/* Right: Quick actions, Usage meter, Role Switcher */}
      <div className="flex items-center gap-3">
        {/* Usage Meter */}
        <div className="hidden xl:flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
          <span className="text-slate-500 font-medium">Quota:</span>
          <div className="w-20 bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${usagePercent > 85 ? 'bg-rose-500' : 'bg-indigo-600'}`} 
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <span className="font-semibold text-slate-700">{usagePercent}%</span>
        </div>

        {/* Backend Test Runner Suite */}
        <button
          onClick={onOpenTestRunner}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors border border-slate-200 cursor-pointer"
          title="Run Automated Backend Test Suite (Multi-Tenancy, SSRF, Injection)"
        >
          <Terminal className="w-3.5 h-3.5 text-indigo-600" />
          <span>Run Tests</span>
        </button>

        {/* Quick Test Agent Sandbox */}
        <button
          onClick={() => setIsQuickTestOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Test Employee</span>
        </button>

        {/* Client Website Sandbox */}
        <button
          onClick={() => setIsLiveSandboxOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Website Sandbox</span>
        </button>

        {/* Role Switcher */}
        <div className="relative border-l border-slate-200 pl-3">
          <button
            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
            className="flex items-center gap-2 text-xs font-medium text-slate-700 hover:text-slate-900 py-1 px-2 rounded-xl hover:bg-slate-50 cursor-pointer"
          >
            <UserCircle className="w-5 h-5 text-slate-600" />
            <div className="text-left hidden md:block">
              <p className="font-semibold text-slate-800 capitalize leading-tight">{currentUserRole.replace(/_/g, ' ')}</p>
              <p className="text-[10px] text-slate-400">Switch RBAC</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isRoleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in duration-150">
              <div className="px-3.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Simulate RBAC Role
              </div>
              {allRoles.map(r => (
                <button
                  key={r.id}
                  onClick={() => {
                    setCurrentUserRole(r.id);
                    setCurrentExperience(r.defaultExp);
                    if (r.id === 'staff' || r.id === 'manager') {
                      setCurrentTab('conversations');
                    }
                    setIsRoleDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-1.5 text-xs font-medium text-left hover:bg-slate-50 cursor-pointer ${
                    currentUserRole === r.id ? 'text-indigo-600 font-semibold bg-indigo-50/50' : 'text-slate-700'
                  }`}
                >
                  <div>
                    <span className="block font-semibold">{r.label}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{r.desc}</span>
                  </div>
                  {currentUserRole === r.id && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
