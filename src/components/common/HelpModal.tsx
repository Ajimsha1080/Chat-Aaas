import React, { useState } from 'react';
import { 
  X, 
  HelpCircle, 
  Sparkles, 
  ChevronRight,
  FileQuestion,
  Headphones,
  Search
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTestAssistant?: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, onOpenTestAssistant }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!isOpen) return null;

  const faqs = [
    {
      category: 'getting-started',
      q: 'How does my AI Assistant learn about my business?',
      a: 'Go to Knowledge and upload your product catalogs, policy PDFs, FAQs, or enter your website URL. Your assistant reads and organizes this information automatically to answer customer questions accurately.'
    },
    {
      category: 'deployment',
      q: 'How do I add the AI assistant to my website?',
      a: 'Navigate to Deploy, copy the 1-line HTML snippet, and paste it before the </body> tag of your website. You can also preview and customize the widget colors in My Assistant > Appearance.'
    },
    {
      category: 'behavior',
      q: 'What happens if a customer asks something the assistant does not know?',
      a: 'The assistant will politely state that it does not have that specific information and can automatically escalate the conversation to a human team member if escalation is enabled.'
    },
    {
      category: 'connections',
      q: 'Can my assistant check orders or take actions safely?',
      a: 'Yes! In My Assistant > Actions, you can enable specific capabilities (like "Check Order Status"). Sensitive actions like "Refunds" require your staff\'s manual confirmation before executing.'
    },
    {
      category: 'billing',
      q: 'How does conversation usage and billing work?',
      a: 'Each plan includes a monthly conversation quota with clear progress tracking in Billing. Indian GST (18%) is itemized on every invoice with downloadable receipts.'
    }
  ];

  const filteredFaqs = faqs.filter(f => {
    const matchesCat = selectedCategory === 'all' || f.category === selectedCategory;
    const matchesSearch = f.q.toLowerCase().includes(searchQuery.toLowerCase()) || f.a.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl sm:rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5 text-indigo-300" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white truncate">Help & Resource Center</h3>
              <p className="text-[11px] sm:text-xs text-slate-300 truncate">Quick answers, setup guides, and dedicated support</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search help articles, guides, and FAQs..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'all', label: 'All Topics' },
              { id: 'getting-started', label: 'Getting Started' },
              { id: 'deployment', label: 'Deploying Widget' },
              { id: 'behavior', label: 'Assistant Behavior' },
              { id: 'connections', label: 'Tools & Actions' },
              { id: 'billing', label: 'Billing & GST' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all cursor-pointer text-xs ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Quick Action Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div 
              onClick={() => {
                onClose();
                onOpenTestAssistant?.();
              }}
              className="p-3.5 sm:p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 hover:bg-indigo-100/60 transition-colors cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-indigo-950">Test Your Assistant</h4>
                  <p className="text-[11px] text-indigo-700">Open interactive sandbox</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-indigo-400" />
            </div>

            <div 
              onClick={() => {
                onClose();
              }}
              className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 hover:bg-emerald-100/60 transition-colors cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Headphones className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">Contact 24/7 Support</h4>
                  <p className="text-[11px] text-emerald-700">support@coarai.com</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Frequently Asked Questions</h4>

          {filteredFaqs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileQuestion className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold">No help articles match your search.</p>
              <p className="text-[11px] text-slate-400 mt-1">Try different keywords or browse all topics.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFaqs.map((faq, idx) => (
                <div key={idx} className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                  <h5 className="text-xs sm:text-sm font-bold text-slate-900 flex items-start gap-2">
                    <span className="text-indigo-600 font-black">Q:</span>
                    {faq.q}
                  </h5>
                  <p className="text-xs text-slate-600 leading-relaxed pl-5">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span className="text-[11px] sm:text-xs">Enterprise SLA: 99.9%</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
