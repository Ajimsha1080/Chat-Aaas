import React, { useState } from 'react';
import { 
  Building, 
  ChevronDown, 
  Plus, 
  Play, 
  Check, 
  HelpCircle, 
  ShieldAlert, 
  ArrowLeft, 
  Menu,
  Search
} from 'lucide-react';
import { useApp } from '../../context';

interface HeaderProps {
  onOpenOnboarding: () => void;
  onOpenHelp?: () => void;
  onOpenCommandPalette?: () => void;
  onToggleMobileNav?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onOpenOnboarding, 
  onOpenHelp, 
  onOpenCommandPalette,
  onToggleMobileNav
}) => {
  const { 
    companies, 
    currentCompanyId, 
    currentCompany, 
    switchCompany, 
    currentPlan, 
    setIsQuickTestOpen,
    currentExperience,
    setCurrentExperience,
    showToast
  } = useApp();

  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const usagePercent = Math.min(100, Math.round((currentCompany.stats.messagesThisMonth / currentPlan.maxConversationsMonth) * 100));

  return (
    <header className="h-14 sm:h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-6 flex items-center justify-between z-10 shrink-0 sticky top-0">
      {/* Left: Mobile Nav Toggle + Tenant Workspace Selector & Assistant Status */}
      <div className="flex items-center gap-2 sm:gap-3.5">
        {/* Mobile Hamburger Menu Toggle */}
        {onToggleMobileNav && (
          <button
            onClick={onToggleMobileNav}
            className="md:hidden p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Company Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
            className="flex items-center gap-2 sm:gap-2.5 px-3 py-1.5 bg-slate-50/80 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-sm font-bold text-slate-900 transition-all shadow-2xs hover:shadow-xs cursor-pointer tracking-tight"
          >
            <div className="w-5.5 h-5.5 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              <Building className="w-3.5 h-3.5" />
            </div>
            <span className="max-w-[120px] sm:max-w-[180px] truncate">{currentCompany.name}</span>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {isCompanyDropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Select Company Workspace
              </div>
              {companies.map(comp => (
                <button
                  key={comp.id}
                  onClick={() => {
                    switchCompany(comp.id);
                    setIsCompanyDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left text-sm font-medium hover:bg-slate-50 text-slate-800 transition-colors cursor-pointer"
                >
                  <div className="overflow-hidden">
                    <p className="font-semibold text-slate-900 truncate">{comp.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{comp.industry}</p>
                  </div>
                  {comp.id === currentCompanyId && (
                    <Check className="w-4.5 h-4.5 text-indigo-600 shrink-0 ml-2" />
                  )}
                </button>
              ))}
              <div className="border-t border-slate-100 mt-1.5 pt-1.5">
                <button
                  onClick={() => {
                    setIsCompanyDropdownOpen(false);
                    onOpenOnboarding();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Company Workspace</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Right: Quick actions, Quota meter, Test & Preview */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Search / Command Palette (⌘K) */}
        {onOpenCommandPalette && (
          <button
            onClick={onOpenCommandPalette}
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            title="Global Command Palette (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search...</span>
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-400 font-bold">⌘K</kbd>
          </button>
        )}

        {/* Usage Meter */}
        <div className="hidden xl:flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl text-sm">
          <span className="text-slate-500 font-medium">Quota:</span>
          <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${usagePercent > 85 ? 'bg-rose-500' : 'bg-indigo-600'}`} 
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <span className="font-semibold text-slate-800">{usagePercent}%</span>
        </div>

        {/* Quick Test Agent Sandbox */}
        <button
          onClick={() => setIsQuickTestOpen(true)}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Play className="w-4 h-4 fill-white text-white" />
          <span className="hidden sm:inline">Test Assistant</span>
        </button>

        {/* Direct 1-Click Super Admin / Customer Experience Switcher */}
        {currentExperience === 'admin' ? (
          <button
            onClick={() => {
              setCurrentExperience('customer');
              showToast('Customer Workspace', 'Returned to customer workspace.', 'info');
            }}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-bold transition-all shadow-xs cursor-pointer"
            title="Exit Super Admin and Return to Workspace"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Exit Admin</span>
          </button>
        ) : (
          <button
            onClick={() => {
              setCurrentExperience('admin');
              showToast('Super Admin Mode', 'Switched to SaaS Operator Master Admin.', 'info');
            }}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-all shadow-xs cursor-pointer border border-slate-700"
            title="Switch to SaaS Platform Super Admin"
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">Super Admin</span>
          </button>
        )}

        {/* Help Center */}
        {onOpenHelp && (
          <button
            onClick={onOpenHelp}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Help & Documentation"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        )}
      </div>
    </header>
  );
};
