import React, { useState } from 'react';
import { 
  BookOpen, 
  Globe, 
  FileText, 
  HelpCircle, 
  AlignLeft, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Search, 
  Sparkles, 
  ExternalLink, 
  Layers, 
  UploadCloud,
  RefreshCw 
} from 'lucide-react';
import { useApp } from '../../context';
import { KnowledgeItem, KnowledgeType } from '../../types';

export const KnowledgeView: React.FC = () => {
  const { 
    knowledgeItems, 
    addKnowledgeItem, 
    deleteKnowledgeItem, 
    currentCompany 
  } = useApp();

  const [activeTab, setActiveTab] = useState<KnowledgeType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalType, setModalType] = useState<KnowledgeType>('url');

  // New item form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formCategory, setFormCategory] = useState('General');
  const [formFaqAnswer, setFormFaqAnswer] = useState('');
  const [formFileName, setFormFileName] = useState('');

  // Semantic Search Tester State
  const [testerQuery, setTesterQuery] = useState('');
  const [testerResults, setTesterResults] = useState<{ item: KnowledgeItem; score: number }[]>([]);
  const [isTestingSearch, setIsTestingSearch] = useState(false);

  const filteredItems = knowledgeItems.filter(item => {
    const matchesTab = activeTab === 'all' || item.type === activeTab;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleCreateKnowledge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    let contentToSave = formContent;
    if (modalType === 'faq') {
      contentToSave = `Question: ${formTitle}\nAnswer: ${formFaqAnswer}`;
    }

    addKnowledgeItem({
      type: modalType,
      title: formTitle,
      sourceUrl: modalType === 'url' ? formUrl : undefined,
      fileName: modalType === 'document' ? (formFileName || 'document.pdf') : undefined,
      content: contentToSave,
      category: formCategory,
      faqAnswer: modalType === 'faq' ? formFaqAnswer : undefined
    });

    setIsAddModalOpen(false);
    // Reset form
    setFormTitle('');
    setFormContent('');
    setFormUrl('');
    setFormFaqAnswer('');
    setFormFileName('');
  };

  const handleTestSemanticSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testerQuery.trim()) return;
    setIsTestingSearch(true);

    setTimeout(() => {
      const q = testerQuery.toLowerCase();
      const words = q.split(/\s+/).filter(w => w.length > 2);
      const results: { item: KnowledgeItem; score: number }[] = [];

      for (const item of knowledgeItems) {
        const text = `${item.title} ${item.content} ${item.faqAnswer || ''}`.toLowerCase();
        let matches = 0;
        for (const w of words) {
          if (text.includes(w)) matches++;
        }
        const score = words.length > 0 ? (matches / words.length) : 0;
        if (score > 0.1 || text.includes(q)) {
          results.push({ item, score: Math.min(0.98, Math.max(score, 0.72)) });
        }
      }

      results.sort((a, b) => b.score - a.score);
      setTesterResults(results);
      setIsTestingSearch(false);
    }, 300);
  };

  const totalChunks = knowledgeItems.reduce((acc, curr) => acc + curr.chunksCount, 0);
  const totalTokens = knowledgeItems.reduce((acc, curr) => acc + curr.tokenCount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Knowledge Base & RAG Engine</h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Hierarchy Level 3
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Feed company docs, website URLs, and FAQs so <strong>{currentCompany.agent.name}</strong> answers customer questions accurately without hallucination.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setModalType('url');
              setIsAddModalOpen(true);
            }}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Knowledge Source</span>
          </button>
        </div>
      </div>

      {/* Stats Meter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Indexed Sources</p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">{knowledgeItems.length} Sources</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Vector Chunks Created</p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">{totalChunks} Chunks</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Indexed Embeddings Tokens</p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">{totalTokens.toLocaleString()} Tokens</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tab Navigation & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'all', label: 'All Sources', count: knowledgeItems.length },
              { id: 'url', label: 'Website URLs', count: knowledgeItems.filter(k => k.type === 'url').length },
              { id: 'document', label: 'PDFs & Docs', count: knowledgeItems.filter(k => k.type === 'document').length },
              { id: 'faq', label: 'FAQs', count: knowledgeItems.filter(k => k.type === 'faq').length },
              { id: 'text', label: 'Text Notes', count: knowledgeItems.filter(k => k.type === 'text').length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === tab.id ? 'bg-indigo-800 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search indexed docs..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Knowledge Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Title & Type</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Vector Chunks</th>
                <th className="py-3 px-4">Tokens</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    <BookOpen className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No knowledge sources found</p>
                    <p className="text-xs text-slate-400">Add website links, manuals, or FAQs to train your single AI agent.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          item.type === 'url' ? 'bg-blue-50 text-blue-600' :
                          item.type === 'document' ? 'bg-rose-50 text-rose-600' :
                          item.type === 'faq' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {item.type === 'url' && <Globe className="w-3.5 h-3.5" />}
                          {item.type === 'document' && <FileText className="w-3.5 h-3.5" />}
                          {item.type === 'faq' && <HelpCircle className="w-3.5 h-3.5" />}
                          {item.type === 'text' && <AlignLeft className="w-3.5 h-3.5" />}
                        </div>
                        <div className="overflow-hidden max-w-xs sm:max-w-md">
                          <p className="font-semibold text-slate-900 truncate">{item.title}</p>
                          {item.sourceUrl && (
                            <a 
                              href={item.sourceUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-[11px] text-indigo-600 hover:underline flex items-center gap-0.5 truncate"
                            >
                              <span>{item.sourceUrl}</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            </a>
                          )}
                          {item.fileName && (
                            <span className="text-[11px] text-slate-400 font-mono">{item.fileName} ({item.fileSize})</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-600">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px]">{item.category || 'General'}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-600">
                      {item.chunksCount} chunks
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {item.tokenCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        Indexed
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => deleteKnowledgeItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete source"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Semantic Vector Search Testing Sandbox */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Semantic Knowledge Retrieval Tester</h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">RAG Vector Sandbox</span>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Test what chunks <strong>{currentCompany.agent.name}</strong> will retrieve when answering customer questions.
        </p>

        <form onSubmit={handleTestSemanticSearch} className="flex gap-2 mb-4">
          <input
            type="text"
            value={testerQuery}
            onChange={(e) => setTesterQuery(e.target.value)}
            placeholder="Type a customer question (e.g. 'What is the refund SLA?' or 'How do I scale Kubernetes?')"
            className="flex-1 px-3.5 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!testerQuery.trim() || isTestingSearch}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            {isTestingSearch ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Simulate Retrieval</span>
          </button>
        </form>

        {testerResults.length > 0 && (
          <div className="space-y-2.5 animate-in fade-in">
            <p className="text-xs font-bold text-indigo-300">Retrieved {testerResults.length} Relevant Knowledge Chunks:</p>
            {testerResults.map((res, i) => (
              <div key={i} className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-200">{res.item.title}</span>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                    Similarity: {(res.score * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-3">
                  {res.item.faqAnswer || res.item.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Knowledge Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add Knowledge Source</h3>
            <p className="text-xs text-slate-500 mb-4">Select the content type you want to index into your agent's vector database.</p>

            {/* Type Selector */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { id: 'url', label: 'Website URL', icon: Globe },
                { id: 'document', label: 'Document PDF', icon: FileText },
                { id: 'faq', label: 'FAQ Item', icon: HelpCircle },
                { id: 'text', label: 'Raw Text', icon: AlignLeft }
              ].map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setModalType(t.id as KnowledgeType)}
                    className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                      modalType === t.id
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold ring-1 ring-indigo-600'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px]">{t.label}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleCreateKnowledge} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {modalType === 'faq' ? 'Question' : 'Document / Source Title'}
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={modalType === 'faq' ? 'e.g. What is the return window?' : 'e.g. Cloud Security SLA Guide'}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {modalType === 'url' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Website URL to Crawl</label>
                  <input
                    type="url"
                    required
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://yourcompany.com/docs/pricing"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {modalType === 'document' && (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center bg-slate-50/50">
                  <UploadCloud className="w-8 h-8 mx-auto text-indigo-500 mb-1" />
                  <p className="text-xs font-semibold text-slate-700">Drag and drop your PDF / DOCX file</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Supports PDF, DOCX, TXT, CSV up to 25MB</p>
                  <input
                    type="text"
                    placeholder="or type simulated file name (e.g. Terms_of_service.pdf)"
                    value={formFileName}
                    onChange={(e) => setFormFileName(e.target.value)}
                    className="mt-2 w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded text-center"
                  />
                </div>
              )}

              {modalType === 'faq' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Verified Answer</label>
                  <textarea
                    rows={3}
                    required
                    value={formFaqAnswer}
                    onChange={(e) => setFormFaqAnswer(e.target.value)}
                    placeholder="Provide the exact answer the agent should deliver..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Content / Document Text</label>
                  <textarea
                    rows={4}
                    required
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="Paste the relevant knowledge, policy text, or documentation paragraphs..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category Tag</label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="e.g. Legal, Technical, Support, Pricing"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm"
                >
                  Index Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
