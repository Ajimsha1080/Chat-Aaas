import React, { useState } from 'react';
import { 
  Globe, 
  FileText, 
  HelpCircle, 
  AlignLeft, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Search, 
  UploadCloud,
  Eye,
  Check,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../../context';
import { KnowledgeItem, KnowledgeType } from '../../types';

export const KnowledgeView: React.FC = () => {
  const { 
    knowledgeItems, 
    addKnowledgeItem, 
    deleteKnowledgeItem, 
    currentCompany,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<KnowledgeType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalType, setModalType] = useState<KnowledgeType>('url');
  const [previewItem, setPreviewItem] = useState<KnowledgeItem | null>(null);

  // New item form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formCategory] = useState('General');
  const [formFaqAnswer, setFormFaqAnswer] = useState('');
  const [formFileName, setFormFileName] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);

  const filteredItems = knowledgeItems.filter(item => {
    const matchesTab = activeTab === 'all' || item.type === activeTab;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const websiteCount = knowledgeItems.filter(i => i.type === 'url').length;
  const docCount = knowledgeItems.filter(i => i.type === 'document').length;
  const faqCount = knowledgeItems.filter(i => i.type === 'faq').length;

  const handleCreateKnowledge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    setIsIngesting(true);
    let contentToSave = formContent;
    if (modalType === 'faq') {
      contentToSave = `Question: ${formTitle}\nAnswer: ${formFaqAnswer}`;
    }

    setTimeout(() => {
      addKnowledgeItem({
        type: modalType,
        title: formTitle,
        sourceUrl: modalType === 'url' ? formUrl : undefined,
        fileName: modalType === 'document' ? (formFileName || 'knowledge_document.pdf') : undefined,
        content: contentToSave,
        category: formCategory,
        faqAnswer: modalType === 'faq' ? formFaqAnswer : undefined
      });

      setIsIngesting(false);
      setIsAddModalOpen(false);
      // Reset form
      setFormTitle('');
      setFormContent('');
      setFormUrl('');
      setFormFaqAnswer('');
      setFormFileName('');
      showToast('Knowledge Added', `"${formTitle}" is now indexed and ready for your AI Employee.`, 'success');
    }, 800);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Knowledge Center</h1>
          <p className="text-xs text-slate-500 mt-1">
            Teach <strong>{currentCompany.agent.name}</strong> your company documents, website content, and FAQs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Teach New Knowledge</span>
          </button>
        </div>
      </div>

      {/* 4 Knowledge Health & Source Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Website Sync */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Website Sync</span>
            <Globe className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-slate-900">{websiteCount}</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <Check className="w-3 h-3 text-emerald-600" /> Synced
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 truncate">{currentCompany.domain}</p>
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Documents</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-slate-900">{docCount}</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                <Check className="w-3 h-3 text-blue-600" /> Indexed
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">PDFs, DOCX & Policies</p>
          </div>
        </div>

        {/* FAQs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">FAQs & Answers</span>
            <HelpCircle className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-slate-900">{faqCount}</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                <Check className="w-3 h-3 text-purple-600" /> Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Direct Q&A pairs</p>
          </div>
        </div>

        {/* Knowledge Health */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Knowledge Health</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-emerald-600">98%</span>
              <span className="text-xs font-bold text-emerald-700">Excellent</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">High answer accuracy</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'all', label: 'All Knowledge' },
            { id: 'url', label: 'Websites' },
            { id: 'document', label: 'Documents' },
            { id: 'faq', label: 'FAQs' },
            { id: 'text', label: 'Custom Text' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search knowledge..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Knowledge Item Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map(item => {
          const isUrl = item.type === 'url';
          const isDoc = item.type === 'document';
          const isFaq = item.type === 'faq';

          return (
            <div 
              key={item.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${
                      isUrl ? 'bg-indigo-50 text-indigo-600' : isDoc ? 'bg-blue-50 text-blue-600' : isFaq ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {isUrl ? <Globe className="w-3.5 h-3.5" /> : isDoc ? <FileText className="w-3.5 h-3.5" /> : isFaq ? <HelpCircle className="w-3.5 h-3.5" /> : <AlignLeft className="w-3.5 h-3.5" />}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.type}</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Ready</span>
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{item.title}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {item.faqAnswer || item.content}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 font-medium">{item.category}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPreviewItem(item)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Preview Content"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      deleteKnowledgeItem(item.id);
                      showToast('Knowledge Removed', `Removed "${item.title}".`, 'info');
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Knowledge Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Teach Your AI Employee</h3>
                <p className="text-xs text-slate-500">Add documents, website URLs, or FAQs.</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
              >
                ?
              </button>
            </div>

            {/* Type selector */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'url', label: 'Website', icon: Globe },
                { id: 'document', label: 'Document', icon: FileText },
                { id: 'faq', label: 'FAQ', icon: HelpCircle },
                { id: 'text', label: 'Text', icon: AlignLeft }
              ].map(t => {
                const Icon = t.icon;
                const isSel = modalType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setModalType(t.id as any)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      isSel ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 mx-auto mb-1" />
                    <span className="text-[11px] block">{t.label}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleCreateKnowledge} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {modalType === 'faq' ? 'Question' : 'Title / Source Name'}
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={modalType === 'faq' ? 'e.g. What is your return policy?' : 'e.g. Enterprise SLA Terms'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {modalType === 'url' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Website URL (SSRF Protected)</label>
                  <input
                    type="url"
                    required
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://yourcompany.com/docs"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {modalType === 'document' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">File Name</label>
                  <input
                    type="text"
                    value={formFileName}
                    onChange={(e) => setFormFileName(e.target.value)}
                    placeholder="company_handbook.pdf"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {modalType === 'faq' ? (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Official Answer</label>
                  <textarea
                    rows={4}
                    required
                    value={formFaqAnswer}
                    onChange={(e) => setFormFaqAnswer(e.target.value)}
                    placeholder="Provide the exact verified answer..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Document Content / Text</label>
                  <textarea
                    rows={4}
                    required
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="Paste or write company text here..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isIngesting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {isIngesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                  <span>{isIngesting ? 'Indexing...' : 'Save & Index Knowledge'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">{previewItem.title}</h3>
              <button onClick={() => setPreviewItem(null)} className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer">?</button>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-800 max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {previewItem.faqAnswer || previewItem.content}
            </div>
            <button
              onClick={() => setPreviewItem(null)}
              className="w-full py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
