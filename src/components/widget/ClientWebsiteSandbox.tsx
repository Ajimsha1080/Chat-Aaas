import React from 'react';
import { 
  ArrowLeft, 
  Globe, 
  Sparkles, 
  ShieldCheck, 
  Server, 
  Layers 
} from 'lucide-react';
import { useApp } from '../../context';
import { ChatWidget } from './ChatWidget';

export const ClientWebsiteSandbox: React.FC = () => {
  const { 
    currentCompany, 
    setIsLiveSandboxOpen, 
    companies, 
    switchCompany 
  } = useApp();

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-in fade-in duration-200">
      {/* Top Browser Simulation Navigation Bar */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between text-white shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLiveSandboxOpen(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Workspace</span>
          </button>

          {/* Browser Address Bar */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 w-80">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400">https://</span>
            <span>{currentCompany.domain}</span>
          </div>
        </div>

        {/* Tenant Switcher in Sandbox */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden md:inline">Viewing Client Site:</span>
          <select
            value={currentCompany.id}
            onChange={(e) => switchCompany(e.target.value)}
            className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-white focus:ring-2 focus:ring-indigo-500"
          >
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.domain})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Simulated Client Website Body */}
      <div className="flex-1 bg-slate-900 text-slate-100 overflow-y-auto relative font-sans">
        {/* Mock Navigation of Client Site */}
        <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-10 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">
              {currentCompany.name.charAt(0)}
            </div>
            <span className="font-bold text-base text-white tracking-tight">{currentCompany.name}</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Platform</a>
            <a href="#solutions" className="hover:text-white transition-colors">Solutions</a>
            <a href="#docs" className="hover:text-white transition-colors">Documentation</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>

          <div className="flex items-center gap-3">
            <button className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors">
              Get Started
            </button>
          </div>
        </header>

        {/* Hero Section of Client Website */}
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Customer Agent Live on {currentCompany.domain}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
            Next-Generation {currentCompany.industry}
          </h1>

          <p className="text-base text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            Experience real-time automated support and actions powered by our dedicated single AI agent <strong>{currentCompany.agent.name}</strong>.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <button className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/30">
              Start 14-Day Free Trial
            </button>
            <button className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors">
              View Architecture Docs
            </button>
          </div>
        </div>

        {/* Features / Mock Service Blocks */}
        <div className="max-w-5xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
              <Server className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2">High Availability Infrastructure</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Global low-latency edge nodes with automated failover and 99.95% SLA guarantees.
            </p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2">Automated Business Actions</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Directly query account quotas, book technical reviews, and create support tickets.
            </p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2">Enterprise Security</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              KMS-encrypted credentials and least-privilege permission models for complete data peace of mind.
            </p>
          </div>
        </div>

        {/* The Live Embedded Chat Widget */}
        <ChatWidget />
      </div>
    </div>
  );
};
