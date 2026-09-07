import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Sparkles, 
  MessageSquare, 
  BookOpen, 
  Layers, 
  Globe, 
  BarChart3, 
  CreditCard, 
  Settings, 
  Play, 
  Upload, 
  HelpCircle, 
  ArrowRight,
  Code2,
  ExternalLink,
  ShieldCheck,
  Building2,
  X
} from 'lucide-react';
import { useApp } from '../../context';
import { NavigationTab } from '../../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenHelp?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onOpenHelp }) => {
  const { 
    setCurrentTab, 
    setIsQuickTestOpen, 
    setIsLiveSandboxOpen, 
    knowledgeItems, 
    conversations,
    currentCompany,
    setCurrentExperience,
    showToast
  } = useApp();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by parent, or toggle
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickActions = [
    {
      id: 'switch-super-admin',
      title: 'Switch to Platform Super Admin Portal',
      subtitle: 'Multi-tenant fleet management, MRR & system diagnostics',
      icon: ShieldCheck,
      category: 'Experiences',
      action: () => {
        onClose();
        setCurrentExperience('admin');
        showToast('Super Admin Mode', 'Switched to SaaS Platform Master Admin.', 'info');
      }
    },
    {
      id: 'switch-customer-workspace',
      title: 'Switch to Customer Workspace',
      subtitle: 'Knowledge base, chat inbox, widget & settings',
      icon: Building2,
      category: 'Experiences',
      action: () => {
        onClose();
        setCurrentExperience('customer');
        showToast('Customer Workspace', 'Returned to customer workspace view.', 'info');
      }
    },
    {
      id: 'test-assistant',
      title: 'Test AI Assistant',
      subtitle: 'Open live interactive chat sandbox',
      icon: Play,
      category: 'Actions',
      action: () => {
        onClose();
        setIsQuickTestOpen(true);
      }
    },
    {
      id: 'website-preview',
      title: 'Preview Website Widget',
      subtitle: 'View live customer embed preview',
      icon: ExternalLink,
      category: 'Actions',
      action: () => {
        onClose();
        setIsLiveSandboxOpen(true);
      }
    },
    {
      id: 'upload-doc',
      title: 'Upload Knowledge Document',
      subtitle: 'Add PDF, DOCX, TXT to knowledge base',
      icon: Upload,
      category: 'Actions',
      action: () => {
        onClose();
        setCurrentTab('knowledge');
      }
    },
    {
      id: 'nav-home',
      title: 'Go to Home Command Center',
      subtitle: 'Overview & executive KPIs',
      icon: Sparkles,
      category: 'Navigation',
      action: () => {
        onClose();
        setCurrentTab('home');
      }
    },
    {
      id: 'nav-assistant',
      title: 'Configure My Assistant',
      subtitle: 'Behavior, tone, actions & appearance',
      icon: Sparkles,
      category: 'Navigation',
      action: () => {
        onClose();
        setCurrentTab('assistant');
      }
    },
    {
      id: 'nav-conversations',
      title: 'Open Customer Conversations Inbox',
      subtitle: `${conversations.length} total customer threads`,
      icon: MessageSquare,
      category: 'Navigation',
      action: () => {
        onClose();
        setCurrentTab('conversations');
      }
    },
    {
      id: 'nav-knowledge',
      title: 'Manage Knowledge Base',
      subtitle: `${knowledgeItems.length} indexed sources`,
      icon: BookOpen,
      category: 'Navigation',
      action: () => {
        onClose();
        setCurrentTab('knowledge');
      }
    },
    {
      id: 'nav-connections',
      title: 'Manage Connections & Tools',
      subtitle: 'WhatsApp, Slack, CRM & APIs',
      icon: Layers,
      category: 'Navigation',
      action: () => {
        onClose();
        setCurrentTab('connections');
      }
    },
    {
      id: 'nav-deploy',
      title: 'Deploy Assistant',
      subtitle: 'Website embed script, React & WhatsApp',
      icon: Globe,
      category: 'Navigation',
      action: () => {
        onClose();
        setCurrentTab('deploy');
      }
    },
    {
      id: 'nav-insights',
      title: 'View Insights & Analytics',
      subtitle: 'Resolution rates, CSAT & time saved',
      icon: BarChart3,
      category: 'Navigation',
      action: () => {
        onClose();
        setCurrentTab('insights');
      }
    },
    {
      id: 'nav-billing',
      title: 'Billing & Plan Limits',
      subtitle: 'Manage quotas, invoices & GST',
      icon: CreditCard,
      category: 'Navigation',
      action: () => {
        onClose();
        setCurrentTab('billing');
      }
    },
    {
      id: 'nav-settings',
      title: 'Workspace Settings & Team',
      subtitle: 'RBAC roles, API keys & audit logs',
      icon: Settings,
      category: 'Navigation',
      action: () => {
        onClose();
        setCurrentTab('settings');
      }
    },
    {
      id: 'nav-help',
      title: 'Help Center & Documentation',
      subtitle: 'Guides, FAQs and 24/7 support',
      icon: HelpCircle,
      category: 'Help',
      action: () => {
        onClose();
        onOpenHelp?.();
      }
    }
  ];

  const filtered = quickActions.filter(item => 
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.subtitle.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-20 px-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Search Bar Input */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0 ml-1" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or search..."
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm font-medium text-slate-900 focus:outline-none placeholder-slate-400"
          />
          <kbd className="px-2 py-0.5 bg-slate-200/70 border border-slate-300/80 rounded-md text-[10px] font-mono text-slate-600 font-semibold shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-50">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Search className="w-6 h-6 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600">No commands found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Try searching for "Knowledge", "Test", or "Deploy"</p>
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className={`w-full p-3 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer ${
                    idx === selectedIndex ? 'bg-indigo-50/80 text-indigo-950' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      idx === selectedIndex ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{item.title}</p>
                      <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-semibold font-mono">
                      {item.category}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 px-4">
          <div className="flex items-center gap-3">
            <span><strong>↑↓</strong> to navigate</span>
            <span><strong>↵</strong> to select</span>
          </div>
          <span>Workspace: <strong>{currentCompany.name}</strong></span>
        </div>
      </div>
    </div>
  );
};
