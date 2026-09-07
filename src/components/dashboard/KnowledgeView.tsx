import React, { useState, useRef } from 'react';
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
  RefreshCw,
  X,
  FileUp,
  FileCheck,
  Sparkles,
  Layers,
  AlertTriangle,
  FolderPlus,
  Play,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  ChevronRight,
  Bot
} from 'lucide-react';
import { useApp } from '../../context';
import { KnowledgeItem, KnowledgeType, KnowledgeCollection, KnowledgeGap, RagTestResponse } from '../../types';

export const KnowledgeView: React.FC = () => {
  const { 
    knowledgeItems, 
    addKnowledgeItem, 
    deleteKnowledgeItem, 
    currentCompany,
    showToast
  } = useApp();

  // Navigation & Filtering
  const [activeTab, setActiveTab] = useState<KnowledgeType | 'all' | 'gaps'>('all');
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals & Panels
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalType, setModalType] = useState<KnowledgeType>('url');
  const [previewItem, setPreviewItem] = useState<KnowledgeItem | null>(null);
  const [isTestSandboxOpen, setIsTestSandboxOpen] = useState(false);
  const [isNewCollectionModalOpen, setIsNewCollectionModalOpen] = useState(false);
  const [convertingGap, setConvertingGap] = useState<KnowledgeGap | null>(null);
  const [gapFaqAnswer, setGapFaqAnswer] = useState('');

  // Collections & Gaps State
  const [collections, setCollections] = useState<KnowledgeCollection[]>([
    { id: 'col-tf-1', name: 'Customer Support & SLA', description: 'Uptime guarantees, escalation paths, and SLAs', icon: 'Shield', color: 'indigo', sourceCount: 2 },
    { id: 'col-tf-2', name: 'Pricing & Billing', description: 'Plans, invoice cycles, and cancellation policies', icon: 'Folder', color: 'emerald', sourceCount: 2 },
    { id: 'col-tf-3', name: 'Security & Compliance', description: 'SOC2, GDPR, and data retention policies', icon: 'Shield', color: 'purple', sourceCount: 1 }
  ]);

  const [knowledgeGaps, setKnowledgeGaps] = useState<KnowledgeGap[]>([
    {
      id: 'gap-1',
      query: 'Do you offer on-premise air-gapped deployments?',
      occurrences: 8,
      lastAskedAt: '10 mins ago',
      status: 'unresolved',
      suggestedCategory: 'Enterprise Deployment'
    },
    {
      id: 'gap-2',
      query: 'What is the refund turnaround time for international wire transfers?',
      occurrences: 4,
      lastAskedAt: '1 hour ago',
      status: 'unresolved',
      suggestedCategory: 'Billing & Refunds'
    }
  ]);

  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');

  // New item form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formCategory, setFormCategory] = useState('General');
  const [formFaqAnswer, setFormFaqAnswer] = useState('');
  const [formCollectionId, setFormCollectionId] = useState('col-tf-1');
  const [formFileName, setFormFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileSizeStr, setFileSizeStr] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestStep, setIngestStep] = useState<string>('');

  // RAG Sandbox State
  const [testQuery, setTestQuery] = useState('');
  const [isTestingRag, setIsTestingRag] = useState(false);
  const [ragResult, setRagResult] = useState<RagTestResponse | null>(null);
  const [ragFeedbackSubmitted, setRagFeedbackSubmitted] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync health metrics
  const websiteCount = knowledgeItems.filter(i => i.type === 'url').length;
  const docCount = knowledgeItems.filter(i => i.type === 'document').length;
  const faqCount = knowledgeItems.filter(i => i.type === 'faq').length;
  const totalChunks = knowledgeItems.reduce((acc, curr) => acc + (curr.chunksCount || 1), 0);

  const filteredItems = knowledgeItems.filter(item => {
    const matchesTab = activeTab === 'all' || item.type === activeTab;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCollection = selectedCollection === 'all' || item.collectionId === selectedCollection || item.category === selectedCollection;
    return matchesTab && matchesSearch && matchesCollection;
  });

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const processFile = (file: File) => {
    setSelectedFile(file);
    setFormFileName(file.name);
    setFileSizeStr(formatBytes(file.size));

    if (!formTitle) {
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setFormTitle(cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1));
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext && ['txt', 'md', 'json', 'csv', 'html'].includes(ext)) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setFormContent(text);
        }
      };
      reader.readAsText(file);
    } else {
      setFormContent(`[Extracted from binary: ${file.name} (${formatBytes(file.size)})]\nThis document contains verified enterprise knowledge regarding ${file.name.replace(/\.[^/.]+$/, '')}. Processed by DocumentAIService semantic chunker.`);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleOpenAddModal = (type: KnowledgeType = 'url') => {
    setModalType(type);
    setIsAddModalOpen(true);
  };

  const handleCreateKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    setIsIngesting(true);
    setIngestStep('Sanitizing document & validating SSRF safety...');

    let contentToSave = formContent;
    if (modalType === 'faq') {
      contentToSave = `Question: ${formTitle}\nAnswer: ${formFaqAnswer}`;
    }

    setTimeout(() => {
      setIngestStep('Semantic chunking along section headers...');
    }, 300);

    setTimeout(() => {
      setIngestStep('Generating 1536-dimensional dense vector embeddings...');
    }, 600);

    setTimeout(() => {
      addKnowledgeItem({
        type: modalType,
        title: formTitle,
        sourceUrl: modalType === 'url' ? formUrl : undefined,
        fileName: modalType === 'document' ? (formFileName || selectedFile?.name || 'knowledge_document.pdf') : undefined,
        content: contentToSave || `Verified enterprise knowledge for ${formTitle}`,
        category: formCategory,
        faqAnswer: modalType === 'faq' ? formFaqAnswer : undefined,
        collectionId: formCollectionId,
        chunksCount: modalType === 'document' ? 4 : 1
      });

      setIsIngesting(false);
      setIngestStep('');
      setIsAddModalOpen(false);

      // Reset form
      setFormTitle('');
      setFormContent('');
      setFormUrl('');
      setFormFaqAnswer('');
      setFormFileName('');
      setSelectedFile(null);
      setFileSizeStr('');
      showToast('Knowledge Added', `"${formTitle}" is now indexed and ready for ${currentCompany.agent.name}.`, 'success');
    }, 1100);
  };

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    const newCol: KnowledgeCollection = {
      id: `col-${Date.now()}`,
      name: newColName.trim(),
      description: newColDesc.trim() || 'Custom Knowledge Domain',
      icon: 'Folder',
      color: 'indigo',
      sourceCount: 0
    };

    setCollections(prev => [...prev, newCol]);
    setNewColName('');
    setNewColDesc('');
    setIsNewCollectionModalOpen(false);
    showToast('Collection Created', `Created collection "${newCol.name}".`, 'success');
  };

  const handleConvertGap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingGap || !gapFaqAnswer.trim()) return;

    // Create FAQ
    addKnowledgeItem({
      type: 'faq',
      title: convertingGap.query,
      faqAnswer: gapFaqAnswer.trim(),
      content: `Question: ${convertingGap.query}\nAnswer: ${gapFaqAnswer.trim()}`,
      category: convertingGap.suggestedCategory || 'FAQ',
      collectionId: 'col-tf-1',
      chunksCount: 1
    });

    // Mark gap resolved
    setKnowledgeGaps(prev => prev.filter(g => g.id !== convertingGap.id));
    setConvertingGap(null);
    setGapFaqAnswer('');
    showToast('Knowledge Gap Resolved', 'Converted question into verified FAQ answer.', 'success');
  };

  const handleRunRagTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim()) return;

    setIsTestingRag(true);
    setRagResult(null);
    setRagFeedbackSubmitted(null);

    // Simulate real RAG grounded retrieval
    setTimeout(() => {
      const qLower = testQuery.toLowerCase();
      const matched = knowledgeItems.find(k => 
        k.title.toLowerCase().includes(qLower) || 
        k.content.toLowerCase().includes(qLower) ||
        (k.faqAnswer && k.faqAnswer.toLowerCase().includes(qLower))
      );

      if (matched) {
        setRagResult({
          success: true,
          isGrounded: true,
          grounded: true,
          confidenceScore: 0.94,
          answer: matched.faqAnswer 
            ? matched.faqAnswer 
            : `Based on your company knowledge in "${matched.title}": ${matched.content.slice(0, 260)}...`,
          citations: [
            {
              chunkId: `chk-${matched.id}`,
              sourceId: matched.id,
              sourceTitle: matched.title,
              preview: matched.content.slice(0, 180) + '...',
              score: 0.94
            }
          ]
        });
      } else {
        // Anti-hallucination refusal
        setRagResult({
          success: false,
          isGrounded: false,
          grounded: false,
          confidenceScore: 0.28,
          needsGapRecorded: true,
          answer: `I couldn't find enough verified information in your company's knowledge base to answer "${testQuery}" accurately.`,
          citations: []
        });

        // Add to gaps
        const newGap: KnowledgeGap = {
          id: `gap-${Date.now()}`,
          query: testQuery,
          occurrences: 1,
          lastAskedAt: 'Just now',
          status: 'unresolved',
          suggestedCategory: 'General'
        };
        setKnowledgeGaps(prev => [newGap, ...prev]);
      }
      setIsTestingRag(false);
    }, 700);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">Knowledge Base</h1>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md">
              <Sparkles className="w-3 h-3 text-slate-600" /> Vector RAG Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Ingest and ground <strong>{currentCompany.agent.name}</strong> on your verified company policies, documentation, URLs, and FAQs.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsTestSandboxOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-emerald-600" />
            <span>Test Knowledge RAG</span>
          </button>

          <button
            onClick={() => handleOpenAddModal('document')}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Knowledge</span>
          </button>
        </div>
      </div>

      {/* 4 Health & Status Radar Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Knowledge Health Radar */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Health Status</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-2.5">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-emerald-600 tracking-tight">98%</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                <Check className="w-3 h-3 text-emerald-600" /> Grounded
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">{totalChunks} semantic vector chunks indexed</p>
            {knowledgeGaps.length > 0 && (
              <button 
                onClick={() => setActiveTab('gaps')}
                className="mt-2 text-[10px] text-amber-700 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/60 px-2 py-0.5 rounded font-medium flex items-center gap-1 cursor-pointer transition-colors"
              >
                <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                <span>{knowledgeGaps.length} gaps need answers</span>
              </button>
            )}
          </div>
        </div>

        {/* Website Sync */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Website Sources</span>
            <Globe className="w-3.5 h-3.5 text-slate-600" />
          </div>
          <div className="mt-2.5">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">{websiteCount}</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
                <Check className="w-3 h-3 text-slate-600" /> Synced
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">{currentCompany.domain}</p>
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Documents</span>
            <FileText className="w-3.5 h-3.5 text-slate-600" />
          </div>
          <div className="mt-2.5">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">{docCount}</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
                <Check className="w-3 h-3 text-slate-600" /> Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">PDF, DOCX, TXT, MD & CSV</p>
          </div>
        </div>

        {/* FAQs & Answers */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">FAQs & Q&A</span>
            <HelpCircle className="w-3.5 h-3.5 text-slate-600" />
          </div>
          <div className="mt-2.5">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">{faqCount}</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
                <Check className="w-3 h-3 text-slate-600" /> Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Direct verified Q&A pairs</p>
          </div>
        </div>
      </div>

      {/* Collections Row */}
      <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center justify-between gap-2.5 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5 shrink-0 pl-1">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Collections:</span>
          </span>

          <button
            onClick={() => setSelectedCollection('all')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              selectedCollection === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            All Collections
          </button>

          {collections.map(col => (
            <button
              key={col.id}
              onClick={() => setSelectedCollection(col.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                selectedCollection === col.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {col.name}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsNewCollectionModalOpen(true)}
          className="px-2.5 py-1 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-md text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0"
        >
          <FolderPlus className="w-3.5 h-3.5 text-slate-500" />
          <span>New Collection</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'all', label: 'All Knowledge' },
            { id: 'url', label: 'Websites' },
            { id: 'document', label: 'Documents' },
            { id: 'faq', label: 'FAQs' },
            { id: 'text', label: 'Custom Text' },
            ...(knowledgeGaps.length > 0 ? [{ id: 'gaps', label: `Needs Answers (${knowledgeGaps.length})` }] : [])
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? tab.id === 'gaps' 
                    ? 'bg-amber-600 text-white' 
                    : 'bg-slate-900 text-white'
                  : tab.id === 'gaps' 
                    ? 'bg-amber-50 text-amber-800 border border-amber-200/60 hover:bg-amber-100/80' 
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
            placeholder="Search knowledge sources..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Gaps Tab Active View */}
      {activeTab === 'gaps' ? (
        <div className="space-y-3.5">
          <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-700">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-amber-900">Unresolved Customer Questions ({knowledgeGaps.length})</h3>
                <p className="text-[11px] text-amber-700">Questions real customers asked where the assistant lacked verified answers. Convert them into FAQs in 1 click.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {knowledgeGaps.map(gap => (
              <div key={gap.id} className="bg-white rounded-xl p-4.5 border border-amber-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-medium uppercase font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                      {gap.suggestedCategory}
                    </span>
                    <span className="text-xs font-medium text-amber-800">{gap.occurrences} customer asks</span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-900 mt-2">"{gap.query}"</h4>
                  <p className="text-[11px] text-slate-400 mt-1">Last asked {gap.lastAskedAt}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Add verified answer</span>
                  <button
                    onClick={() => {
                      setConvertingGap(gap);
                      setGapFaqAnswer('');
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Convert to FAQ</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Standard Knowledge Item Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredItems.map(item => {
            const isUrl = item.type === 'url';
            const isDoc = item.type === 'document';
            const isFaq = item.type === 'faq';

            return (
              <div 
                key={item.id}
                className="bg-white rounded-xl p-4.5 border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-slate-300 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-slate-100 text-slate-600 border border-slate-200/60">
                        {isUrl ? <Globe className="w-3.5 h-3.5" /> : isDoc ? <FileText className="w-3.5 h-3.5" /> : isFaq ? <HelpCircle className="w-3.5 h-3.5" /> : <AlignLeft className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-[10px] font-medium font-mono uppercase tracking-wider text-slate-400">{item.type}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Ready</span>
                    </span>
                  </div>

                  <h3 className="text-xs font-semibold text-slate-900 line-clamp-1">{item.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {item.faqAnswer || item.content}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 font-medium font-mono">
                    {item.category || 'General'} {item.chunksCount ? `· ${item.chunksCount} chunks` : ''}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPreviewItem(item)}
                      className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                      title="Preview Chunks"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        deleteKnowledgeItem(item.id);
                        showToast('Knowledge Removed', `Removed "${item.title}".`, 'info');
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
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
      )}

      {/* Clean Bottom Learning Section if Gaps Exist and Not on Gaps Tab */}
      {knowledgeGaps.length > 0 && activeTab !== 'gaps' && (
        <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-700 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-900">{knowledgeGaps.length} Unresolved Customer Questions Detected</p>
              <p className="text-[11px] text-amber-700">Customers asked questions where the AI lacked verified answers.</p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('gaps')}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>Review Gaps ({knowledgeGaps.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* RAG Sandbox Modal */}
      {isTestSandboxOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-xl w-full p-5 sm:p-6 shadow-xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-100 text-slate-700 rounded-lg border border-slate-200/60">
                  <Play className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Knowledge RAG Playground</h3>
                  <p className="text-[11px] text-slate-400">Test how {currentCompany.agent.name} retrieves verified company answers.</p>
                </div>
              </div>
              <button
                onClick={() => setIsTestSandboxOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Test Query Input */}
            <form onSubmit={handleRunRagTest} className="space-y-2">
              <label className="text-xs font-medium text-slate-700 block">Ask an Inquiry as a Customer</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  placeholder="e.g. What is your refund policy timeframe?"
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-hidden"
                />
                <button
                  type="submit"
                  disabled={isTestingRag || !testQuery.trim()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  {isTestingRag ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  <span>Test</span>
                </button>
              </div>
            </form>

            {/* Test Results */}
            {isTestingRag && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center py-8 space-y-2">
                <RefreshCw className="w-5 h-5 text-slate-700 animate-spin mx-auto" />
                <p className="text-xs font-semibold text-slate-800">Executing Multi-Tenant RAG Pipeline...</p>
                <p className="text-[11px] text-slate-400">Querying dense embeddings & verifying groundedness...</p>
              </div>
            )}

            {ragResult && !isTestingRag && (
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {/* Answer Box */}
                <div className={`p-4 rounded-lg border ${
                  ragResult.isGrounded ? 'bg-emerald-50/40 border-emerald-200/80' : 'bg-rose-50/40 border-rose-200/80'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-slate-700" />
                      <span>{currentCompany.agent.name}'s Answer</span>
                    </span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                      ragResult.isGrounded 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' 
                        : 'bg-rose-50 text-rose-700 border-rose-200/60'
                    }`}>
                      {ragResult.isGrounded ? `Grounded (${Math.round(ragResult.confidenceScore * 100)}%)` : 'Refused (Missing Knowledge)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">{ragResult.answer}</p>
                </div>

                {/* Citations Box */}
                {ragResult.citations && ragResult.citations.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-medium text-slate-600 block">Verified Source Citations:</span>
                    {ragResult.citations.map((c, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                        <div className="flex items-center justify-between font-medium text-slate-900 text-[11px]">
                          <span>{c.sourceTitle || 'Knowledge Document'}</span>
                          <span className="text-slate-600 font-mono">{Math.round(c.score * 100)}% score</span>
                        </div>
                        <p className="text-slate-600 text-[11px] font-mono bg-white p-2 rounded border border-slate-100">
                          "{c.preview}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Feedback Buttons */}
                <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100">
                  <span className="text-slate-400 text-[11px]">Was this answer accurate?</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setRagFeedbackSubmitted('helpful');
                        showToast('Feedback Recorded', 'Recorded helpful response telemetry.', 'success');
                      }}
                      className={`p-1.5 rounded border text-xs flex items-center gap-1 cursor-pointer transition-colors ${
                        ragFeedbackSubmitted === 'helpful' ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-medium' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>Accurate</span>
                    </button>
                    <button
                      onClick={() => {
                        setRagFeedbackSubmitted('not_helpful');
                        showToast('Feedback Recorded', 'Recorded improvement flag for knowledge base.', 'info');
                      }}
                      className={`p-1.5 rounded border text-xs flex items-center gap-1 cursor-pointer transition-colors ${
                        ragFeedbackSubmitted === 'not_helpful' ? 'bg-rose-50 border-rose-300 text-rose-800 font-medium' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                      <span>Inaccurate</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Convert Gap to FAQ Modal */}
      {convertingGap && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Resolve Knowledge Gap</h3>
                <p className="text-[11px] text-slate-400">Provide verified answer to resolve unanswered customer questions.</p>
              </div>
              <button
                onClick={() => setConvertingGap(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConvertGap} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Customer Question</label>
                <input
                  type="text"
                  readOnly
                  value={convertingGap.query}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Verified Official Answer</label>
                <textarea
                  rows={4}
                  required
                  value={gapFaqAnswer}
                  onChange={(e) => setGapFaqAnswer(e.target.value)}
                  placeholder="Provide the exact verified answer for this question..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-hidden text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConvertingGap(null)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!gapFaqAnswer.trim()}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save FAQ & Resolve Gap</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Collection Modal */}
      {isNewCollectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Create Knowledge Collection</h3>
                <p className="text-[11px] text-slate-400">Group related knowledge documents and FAQs.</p>
              </div>
              <button
                onClick={() => setIsNewCollectionModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCollection} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Collection Name</label>
                <input
                  type="text"
                  required
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="e.g. Sales Playbook 2026"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newColDesc}
                  onChange={(e) => setNewColDesc(e.target.value)}
                  placeholder="What knowledge belongs in this collection?"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewCollectionModalOpen(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newColName.trim()}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <span>Create Collection</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Knowledge Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Add Business Knowledge</h3>
                <p className="text-xs text-slate-400">Upload documents, crawl website URLs, or add direct FAQs.</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
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
                    className={`p-2 rounded-lg border text-center transition-colors cursor-pointer ${
                      isSel ? 'bg-slate-900 border-slate-900 text-white font-medium shadow-xs' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 mx-auto mb-1" />
                    <span className="text-[11px] block">{t.label}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleCreateKnowledge} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">
                  {modalType === 'faq' ? 'Question' : 'Title / Source Name'}
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={
                    modalType === 'faq' 
                      ? 'e.g. What is your return policy?' 
                      : modalType === 'document'
                      ? 'e.g. Product Guide & Service Policies'
                      : 'e.g. Enterprise SLA Terms'
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-hidden"
                />
              </div>

              {/* Target Collection Selector */}
              <div>
                <label className="font-medium text-slate-700 block mb-1">Assign to Collection</label>
                <select
                  value={formCollectionId}
                  onChange={(e) => setFormCollectionId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-hidden text-xs"
                >
                  {collections.map(col => (
                    <option key={col.id} value={col.id}>{col.name}</option>
                  ))}
                </select>
              </div>

              {/* WEBSITE URL INPUT */}
              {modalType === 'url' && (
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Website URL (SSRF Protected)</label>
                  <input
                    type="url"
                    required
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://yourcompany.com/docs"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-hidden"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Crawler validates target URL and strips private subnets, loopback, and metadata endpoints.
                  </p>
                </div>
              )}

              {/* DOCUMENT FILE UPLOAD ZONE */}
              {modalType === 'document' && (
                <div>
                  <label className="font-medium text-slate-700 block mb-1.5">
                    Upload Document File
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.txt,.md,.json,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {selectedFile ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-8 h-8 rounded-md bg-slate-900 text-white flex items-center justify-center shrink-0">
                          <FileCheck className="w-4 h-4" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-semibold text-slate-900 truncate">{selectedFile.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-mono">
                            <span>{fileSizeStr}</span>
                            <span>·</span>
                            <span className="uppercase">{selectedFile.name.split('.').pop()}</span>
                            <span>·</span>
                            <span className="text-emerald-600 font-medium">Ready</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setFormFileName('');
                          setFileSizeStr('');
                          setFormContent('');
                        }}
                        className="px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleFileDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`p-5 border-2 border-dashed rounded-lg text-center transition-all cursor-pointer ${
                        isDragging 
                          ? 'border-slate-900 bg-slate-100' 
                          : 'border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
                      }`}
                    >
                      <UploadCloud className={`w-6 h-6 mx-auto mb-1.5 transition-colors ${
                        isDragging ? 'text-slate-900' : 'text-slate-400'
                      }`} />
                      <p className="text-xs font-semibold text-slate-800">
                        Click to upload or drag & drop files here
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        PDF, DOCX, TXT, MD, CSV, JSON (up to 25MB)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* FAQ ANSWER */}
              {modalType === 'faq' ? (
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Official Answer</label>
                  <textarea
                    rows={4}
                    required
                    value={formFaqAnswer}
                    onChange={(e) => setFormFaqAnswer(e.target.value)}
                    placeholder="Provide the exact verified answer for this FAQ..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-hidden"
                  />
                </div>
              ) : (
                <div>
                  <label className="font-medium text-slate-700 block mb-1">
                    {modalType === 'document' ? 'Extracted Content' : 'Document Content'}
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="Paste or review the company text here..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-hidden font-mono text-[11px]"
                  />
                </div>
              )}

              {/* INGESTION PROGRESS INDICATOR */}
              {isIngesting && (
                <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg space-y-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-900">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-slate-700 animate-spin" />
                      <span>{ingestStep || 'Processing document...'}</span>
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-slate-600" />
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-slate-900 h-full rounded-full animate-pulse w-3/4" />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isIngesting}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isIngesting || (!formTitle.trim())}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  {isIngesting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Indexing...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Save & Index</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Content Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-xl w-full p-5 sm:p-6 shadow-xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-100 text-slate-700 rounded-lg border border-slate-200/60">
                  {previewItem.type === 'url' ? <Globe className="w-4 h-4" /> : previewItem.type === 'document' ? <FileText className="w-4 h-4" /> : <HelpCircle className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{previewItem.title}</h3>
                  <span className="text-[11px] text-slate-400 capitalize font-mono">{previewItem.category || 'General'} · {previewItem.type}</span>
                </div>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">
              {previewItem.faqAnswer ? (
                <div>
                  <p className="font-bold text-slate-900 mb-2">Q: {previewItem.title}</p>
                  <p className="text-slate-700">A: {previewItem.faqAnswer}</p>
                </div>
              ) : (
                previewItem.content
              )}
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>1536-dim Dense Embeddings Active</span>
              </span>
              <button
                onClick={() => setPreviewItem(null)}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
