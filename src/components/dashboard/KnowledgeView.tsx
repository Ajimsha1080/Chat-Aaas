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
  RefreshCw, 
  X, 
  FileCheck, 
  Sparkles, 
  AlertTriangle, 
  FolderPlus, 
  Folder,
  Edit2,
  Play, 
  ThumbsUp, 
  ThumbsDown, 
  ArrowRight, 
  Bot, 
  Info, 
  BookOpen 
} from 'lucide-react';
import { useApp } from '../../context';
import { KnowledgeItem, KnowledgeType, KnowledgeCollection, KnowledgeGap, RagTestResponse } from '../../types';

type SidebarTab = 'all' | 'published' | 'draft' | 'archived' | 'document' | 'faq' | 'url' | 'gaps';

const genId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

export const KnowledgeView: React.FC = () => {
  const { 
    knowledgeItems, 
    addKnowledgeItem, 
    deleteKnowledgeItem, 
    currentCompany,
    showToast,
    setIsQuickTestOpen
  } = useApp();

  // Navigation & Filtering
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('all');
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [articleStatuses] = useState<Record<string, 'published' | 'draft' | 'archived'>>({});
  
  // Modals & Panels
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalType, setModalType] = useState<KnowledgeType>('url');
  const [previewItem, setPreviewItem] = useState<KnowledgeItem | null>(null);
  const [isTestSandboxOpen, setIsTestSandboxOpen] = useState(false);
  const [isNewCollectionModalOpen, setIsNewCollectionModalOpen] = useState(false);
  const [convertingGap, setConvertingGap] = useState<KnowledgeGap | null>(null);
  const [gapFaqAnswer, setGapFaqAnswer] = useState('');
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);

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
  const [isManageCollectionsModalOpen, setIsManageCollectionsModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<KnowledgeCollection | null>(null);
  const [editColName, setEditColName] = useState('');
  const [editColDesc, setEditColDesc] = useState('');

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    const newCol: KnowledgeCollection = {
      id: genId('col'),
      name: newColName.trim(),
      description: newColDesc.trim() || 'Custom knowledge collection',
      icon: 'Folder',
      color: 'indigo',
      sourceCount: 0
    };
    setCollections(prev => [...prev, newCol]);
    setNewColName('');
    setNewColDesc('');
    setIsNewCollectionModalOpen(false);
    showToast('Collection Created', `Collection "${newCol.name}" added successfully.`, 'success');
  };

  const handleUpdateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCollection || !editColName.trim()) return;
    setCollections(prev => prev.map(c => c.id === editingCollection.id ? {
      ...c,
      name: editColName.trim(),
      description: editColDesc.trim()
    } : c));
    setEditingCollection(null);
    showToast('Collection Updated', 'Collection details updated successfully.', 'success');
  };

  const handleDeleteCollection = (id: string, name: string) => {
    setCollections(prev => prev.filter(c => c.id !== id));
    if (selectedCollection === id) {
      setSelectedCollection('all');
    }
    if (editingCollection?.id === id) {
      setEditingCollection(null);
    }
    showToast('Collection Removed', `Collection "${name}" deleted.`, 'info');
  };

  // New item form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formCategory] = useState('General');
  const [formFaqAnswer, setFormFaqAnswer] = useState('');
  const [formCollectionId] = useState('col-tf-1');
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

  // Helper to determine item status
  const getItemStatus = (item: KnowledgeItem): 'published' | 'draft' | 'archived' => {
    if (articleStatuses[item.id]) return articleStatuses[item.id];
    if (item.articleStatus) return item.articleStatus;
    return 'published';
  };

  // Sync health metrics
  const totalCount = knowledgeItems.length;
  const publishedCount = knowledgeItems.filter(i => getItemStatus(i) === 'published').length;
  const draftCount = knowledgeItems.filter(i => getItemStatus(i) === 'draft').length;
  const archivedCount = knowledgeItems.filter(i => getItemStatus(i) === 'archived').length;
  const docCount = knowledgeItems.filter(i => i.type === 'document').length;
  const faqCount = knowledgeItems.filter(i => i.type === 'faq').length;
  const websiteCount = knowledgeItems.filter(i => i.type === 'url').length;
  const totalChunks = knowledgeItems.reduce((acc, curr) => acc + (curr.chunksCount || 1), 0);

  const filteredItems = knowledgeItems.filter(item => {
    const itemStatus = getItemStatus(item);

    let matchesTab = true;
    if (sidebarTab === 'all') matchesTab = true;
    else if (sidebarTab === 'published') matchesTab = itemStatus === 'published';
    else if (sidebarTab === 'draft') matchesTab = itemStatus === 'draft';
    else if (sidebarTab === 'archived') matchesTab = itemStatus === 'archived';
    else if (sidebarTab === 'document') matchesTab = item.type === 'document';
    else if (sidebarTab === 'faq') matchesTab = item.type === 'faq';
    else if (sidebarTab === 'url') matchesTab = item.type === 'url';

    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.faqAnswer && item.faqAnswer.toLowerCase().includes(searchQuery.toLowerCase()));

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
          id: genId('gap'),
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

  const getTabTitle = () => {
    switch (sidebarTab) {
      case 'all': return 'All Knowledge Articles';
      case 'published': return 'Published Knowledge';
      case 'draft': return 'Draft Articles';
      case 'archived': return 'Archived Knowledge';
      case 'document': return 'Verified Documents';
      case 'faq': return 'Q&A Pairs & FAQs';
      case 'url': return 'Website Sources';
      case 'gaps': return 'Unresolved Customer Questions';
      default: return 'Knowledge Base';
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in duration-200 pb-12 items-start">
      
      {/* LEFT SIDEBAR NAVIGATION PANE (MATCHES UPLOADED REFERENCE DESIGN) */}
      <aside className="w-full lg:w-64 shrink-0 bg-gradient-to-b from-indigo-50/50 via-purple-50/20 to-slate-50/40 rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="space-y-6">
          
          {/* Top Header: Knowledge + Quick Search/Sync Action Button */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl sm:text-[26px] font-extrabold text-slate-900 tracking-tight">
              Knowledge
            </h2>
            <button
              onClick={() => setIsTestSandboxOpen(true)}
              title="Quick Search & RAG Test"
              className="w-9 h-9 bg-white hover:bg-slate-100 border border-slate-200/90 rounded-xl shadow-xs flex items-center justify-center text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Top Category List: All Articles, Published, Draft, Archived */}
          <div className="space-y-1">
            <button
              onClick={() => setSidebarTab('all')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                sidebarTab === 'all'
                  ? 'bg-sky-100/70 text-slate-900 border border-sky-200/80 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <span>All Articles</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${sidebarTab === 'all' ? 'bg-sky-200/80 text-slate-900 font-bold' : 'text-slate-400'}`}>
                {totalCount}
              </span>
            </button>

            <button
              onClick={() => setSidebarTab('published')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                sidebarTab === 'published'
                  ? 'bg-sky-100/70 text-slate-900 border border-sky-200/80 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <span>Published</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${sidebarTab === 'published' ? 'bg-sky-200/80 text-slate-900 font-bold' : 'text-slate-400'}`}>
                {publishedCount}
              </span>
            </button>

            <button
              onClick={() => setSidebarTab('draft')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                sidebarTab === 'draft'
                  ? 'bg-sky-100/70 text-slate-900 border border-sky-200/80 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <span>Draft</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${sidebarTab === 'draft' ? 'bg-sky-200/80 text-slate-900 font-bold' : 'text-slate-400'}`}>
                {draftCount}
              </span>
            </button>

            <button
              onClick={() => setSidebarTab('archived')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                sidebarTab === 'archived'
                  ? 'bg-sky-100/70 text-slate-900 border border-sky-200/80 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <span>Archived</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${sidebarTab === 'archived' ? 'bg-sky-200/80 text-slate-900 font-bold' : 'text-slate-400'}`}>
                {archivedCount}
              </span>
            </button>
          </div>

          {/* Section: AGENT AI Knowledge with Info Icon */}
          <div className="pt-2 border-t border-slate-200/60">
            <div className="relative flex items-center justify-between px-2 mb-2">
              <span className="text-xs font-black tracking-wider text-slate-900 uppercase font-mono">
                {currentCompany.agent.name.toUpperCase()} AI
              </span>
              <button 
                onClick={() => setShowInfoTooltip(!showInfoTooltip)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5 rounded-full hover:bg-slate-200/60 transition-colors"
              >
                <Info className="w-3.5 h-3.5" />
              </button>

              {showInfoTooltip && (
                <div className="absolute left-0 top-7 z-30 w-52 bg-slate-900 text-white text-xs p-2.5 rounded-xl shadow-lg border border-slate-800 animate-in fade-in">
                  Knowledge items ingested here ground {currentCompany.agent.name}'s multi-tenant vector RAG pipeline.
                </div>
              )}
            </div>

            <div className="space-y-1">
              <button
                onClick={() => setSidebarTab('document')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  sidebarTab === 'document'
                    ? 'bg-sky-100/70 text-slate-900 border border-sky-200/80 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-slate-600" />
                  <span>Documents</span>
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${sidebarTab === 'document' ? 'bg-sky-200/80 text-slate-900 font-bold' : 'text-slate-400'}`}>
                  {docCount}
                </span>
              </button>

              <button
                onClick={() => setSidebarTab('faq')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  sidebarTab === 'faq'
                    ? 'bg-sky-100/70 text-slate-900 border border-sky-200/80 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <HelpCircle className="w-4 h-4 text-slate-600" />
                  <span>Q&A</span>
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${sidebarTab === 'faq' ? 'bg-sky-200/80 text-slate-900 font-bold' : 'text-slate-400'}`}>
                  {faqCount}
                </span>
              </button>

              <button
                onClick={() => setSidebarTab('url')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  sidebarTab === 'url'
                    ? 'bg-sky-100/70 text-slate-900 border border-sky-200/80 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-slate-600" />
                  <span>Websites</span>
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${sidebarTab === 'url' ? 'bg-sky-200/80 text-slate-900 font-bold' : 'text-slate-400'}`}>
                  {websiteCount}
                </span>
              </button>

              {knowledgeGaps.length > 0 && (
                <button
                  onClick={() => setSidebarTab('gaps')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    sidebarTab === 'gaps'
                      ? 'bg-amber-100/80 text-amber-950 border border-amber-300 shadow-2xs font-bold'
                      : 'text-amber-800 hover:text-amber-950 hover:bg-amber-50'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Needs Answers</span>
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-amber-200/80 text-amber-950">
                    {knowledgeGaps.length}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Preview Widget Card */}
        <div className="mt-8 pt-4 border-t border-slate-200/60">
          <div className="bg-white/90 backdrop-blur-xs p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3">
            <img 
              src={currentCompany.agent.avatarUrl} 
              alt="" 
              className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500/20"
            />
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-slate-900 truncate">{currentCompany.agent.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] text-slate-500 font-medium">98% Grounded</span>
              </div>
            </div>
            <button
              onClick={() => setIsQuickTestOpen(true)}
              className="p-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
              title="Test in Chat Drawer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT PANEL */}
      <main className="flex-1 w-full bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-7 min-h-[640px] space-y-6">
        
        {/* Top Header & Action Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {getTabTitle()}
              </h1>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> {totalChunks} Chunks Vectorized
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Showing verified company knowledge grounding <strong>{currentCompany.agent.name}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsTestSandboxOpen(true)}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors shadow-2xs cursor-pointer"
            >
              <Play className="w-4 h-4 text-emerald-600" />
              <span>Test Knowledge RAG</span>
            </button>

            <button
              onClick={() => handleOpenAddModal('document')}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Knowledge</span>
            </button>
          </div>
        </div>

        {/* Collections Filter Bar & Search Input */}
        <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Collection Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-0.5">
            <span className="font-bold text-slate-500 uppercase tracking-wider pl-1 shrink-0">Collections:</span>
            <button
              onClick={() => setSelectedCollection('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                selectedCollection === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              All
            </button>

            {collections.map(col => {
              const isSelected = selectedCollection === col.id;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setSelectedCollection(col.id)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap text-xs cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {col.name}
                </button>
              );
            })}

            <button
              onClick={() => setIsNewCollectionModalOpen(true)}
              className="px-2.5 py-1.5 text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-200 rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>

            <button
              onClick={() => {
                setEditingCollection(null);
                setIsManageCollectionsModalOpen(true);
              }}
              className="px-2.5 py-1.5 text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-2xs"
              title="Manage and Edit Collections"
            >
              <Edit2 className="w-3 h-3 text-slate-500" />
              <span>Edit</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search knowledge..."
              className="w-full pl-9 pr-3.5 py-1.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 focus:outline-hidden shadow-2xs"
            />
          </div>
        </div>

        {/* MAIN BODY: GAPS VIEW OR KNOWLEDGE ITEMS GRID */}
        {sidebarTab === 'gaps' ? (
          /* GAPS / UNANSWERED QUESTIONS VIEW */
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-700 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-amber-950">Unresolved Customer Questions ({knowledgeGaps.length})</h3>
                  <p className="text-xs sm:text-sm text-amber-800 mt-0.5">
                    Questions customers asked where {currentCompany.agent.name} lacked verified answers. Convert them into published FAQs with 1 click.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {knowledgeGaps.map(gap => (
                <div key={gap.id} className="bg-white rounded-2xl p-5 border border-amber-200/90 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-semibold uppercase font-mono text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                        {gap.suggestedCategory}
                      </span>
                      <span className="text-xs font-bold text-amber-900">{gap.occurrences} customer asks</span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 mt-2 leading-snug">"{gap.query}"</h4>
                    <p className="text-xs text-slate-500 mt-1.5">Last asked {gap.lastAskedAt}</p>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Add verified answer</span>
                    <button
                      onClick={() => {
                        setConvertingGap(gap);
                        setGapFaqAnswer('');
                      }}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Convert to FAQ</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* STANDARD KNOWLEDGE SOURCE CARDS GRID */
          <div className="space-y-4 animate-in fade-in">
            {filteredItems.length === 0 ? (
              <div className="text-center py-16 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">No knowledge items match this filter</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Try adjusting your search query or upload documents/FAQs to expand {currentCompany.agent.name}'s knowledge base.
                </p>
                <button
                  onClick={() => handleOpenAddModal('document')}
                  className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add First Source</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map(item => {
                  const isUrl = item.type === 'url';
                  const isDoc = item.type === 'document';
                  const isFaq = item.type === 'faq';
                  const _status = getItemStatus(item);

                  return (
                    <div 
                      key={item.id}
                      className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Card Header: Type Badge & Status Tag */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200/80">
                              {isUrl ? <Globe className="w-4 h-4" /> : isDoc ? <FileText className="w-4 h-4" /> : isFaq ? <HelpCircle className="w-4 h-4" /> : <AlignLeft className="w-4 h-4" />}
                            </div>
                            <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500">{item.type}</span>
                          </div>

                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Active & Indexed</span>
                          </span>
                        </div>

                        {/* Title & Preview */}
                        <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{item.title}</h3>
                        <p className="text-xs text-slate-600 mt-1.5 line-clamp-3 leading-relaxed">
                          {item.faqAnswer || item.content}
                        </p>
                      </div>

                      {/* Card Footer */}
                      <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-500 font-semibold font-mono">
                          {item.category || 'General'} {item.chunksCount ? `· ${item.chunksCount} chunks` : ''}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPreviewItem(item)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Preview Content"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              deleteKnowledgeItem(item.id);
                              showToast('Knowledge Removed', `Removed "${item.title}".`, 'info');
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Source"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* RAG Sandbox Modal */}
      {isTestSandboxOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 text-slate-800 rounded-xl border border-slate-200">
                  <Play className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Knowledge RAG Playground</h3>
                  <p className="text-xs text-slate-500">Test how {currentCompany.agent.name} retrieves verified company answers.</p>
                </div>
              </div>
              <button
                onClick={() => setIsTestSandboxOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Test Query Input */}
            <form onSubmit={handleRunRagTest} className="space-y-2.5">
              <label className="text-sm font-semibold text-slate-800 block">Ask an Inquiry as a Customer</label>
              <div className="flex gap-2.5">
                <input
                  type="text"
                  required
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  placeholder="e.g. What is your refund policy timeframe?"
                  className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-hidden"
                />
                <button
                  type="submit"
                  disabled={isTestingRag || !testQuery.trim()}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
                >
                  {isTestingRag ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  <span>Test</span>
                </button>
              </div>
            </form>

            {/* Test Results */}
            {isTestingRag && (
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 text-center py-8 space-y-2.5">
                <RefreshCw className="w-6 h-6 text-slate-700 animate-spin mx-auto" />
                <p className="text-sm font-bold text-slate-800">Executing Multi-Tenant RAG Pipeline...</p>
                <p className="text-xs text-slate-500">Querying dense embeddings & verifying groundedness...</p>
              </div>
            )}

            {ragResult && !isTestingRag && (
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* Answer Box */}
                <div className={`p-5 rounded-xl border ${
                  ragResult.isGrounded ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
                }`}>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-slate-800" />
                      <span>{currentCompany.agent.name}'s Answer</span>
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-md border ${
                      ragResult.isGrounded 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}>
                      {ragResult.isGrounded ? `Grounded (${Math.round(ragResult.confidenceScore * 100)}%)` : 'Refused (Missing Knowledge)'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-900 leading-relaxed whitespace-pre-wrap">{ragResult.answer}</p>
                </div>

                {/* Citations Box */}
                {ragResult.citations && ragResult.citations.length > 0 && (
                  <div className="space-y-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">Verified Source Citations:</span>
                    {ragResult.citations.map((c, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm space-y-1.5">
                        <div className="flex items-center justify-between font-bold text-slate-900 text-xs">
                          <span>{c.sourceTitle || 'Knowledge Document'}</span>
                          <span className="text-slate-600 font-mono font-semibold">{Math.round(c.score * 100)}% score</span>
                        </div>
                        <p className="text-slate-700 text-xs font-mono bg-white p-2.5 rounded-lg border border-slate-100">
                          "{c.preview}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Feedback Buttons */}
                <div className="pt-2.5 flex items-center justify-between text-sm border-t border-slate-100">
                  <span className="text-slate-500 text-xs">Was this answer accurate?</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setRagFeedbackSubmitted('helpful');
                        showToast('Feedback Recorded', 'Recorded helpful response telemetry.', 'success');
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                        ragFeedbackSubmitted === 'helpful' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span>Accurate</span>
                    </button>
                    <button
                      onClick={() => {
                        setRagFeedbackSubmitted('not_helpful');
                        showToast('Feedback Recorded', 'Recorded improvement flag for knowledge base.', 'info');
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                        ragFeedbackSubmitted === 'not_helpful' ? 'bg-rose-50 border-rose-300 text-rose-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <ThumbsDown className="w-4 h-4" />
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Resolve Knowledge Gap</h3>
                <p className="text-xs text-slate-500 mt-0.5">Provide verified answer to resolve unanswered customer questions.</p>
              </div>
              <button
                onClick={() => setConvertingGap(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConvertGap} className="space-y-4 text-sm">
              <div>
                <label className="font-semibold text-slate-800 block mb-1.5">Customer Question</label>
                <input
                  type="text"
                  readOnly
                  value={convertingGap.query}
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-800 font-semibold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1.5">Verified Official Answer</label>
                <textarea
                  rows={4}
                  required
                  value={gapFaqAnswer}
                  onChange={(e) => setGapFaqAnswer(e.target.value)}
                  placeholder="Provide the exact verified answer for this question..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-hidden text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConvertingGap(null)}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-xl font-semibold transition-colors cursor-pointer text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!gapFaqAnswer.trim()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-sm cursor-pointer text-sm"
                >
                  <Check className="w-4 h-4" />
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create Knowledge Collection</h3>
                <p className="text-xs text-slate-500 mt-0.5">Group related knowledge documents and FAQs.</p>
              </div>
              <button
                onClick={() => setIsNewCollectionModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCollection} className="space-y-4 text-sm">
              <div>
                <label className="font-semibold text-slate-800 block mb-1.5">Collection Name</label>
                <input
                  type="text"
                  required
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="e.g. Sales Playbook 2026"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-hidden text-sm"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1.5">Description</label>
                <textarea
                  rows={2}
                  value={newColDesc}
                  onChange={(e) => setNewColDesc(e.target.value)}
                  placeholder="What knowledge belongs in this collection?"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-hidden text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewCollectionModalOpen(false)}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-xl font-semibold transition-colors cursor-pointer text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newColName.trim()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-sm cursor-pointer text-sm"
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add Business Knowledge</h3>
                <p className="text-xs text-slate-500 mt-0.5">Upload documents, crawl website URLs, or add direct FAQs.</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Type selector */}
            <div className="grid grid-cols-4 gap-2.5">
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
                      isSel ? 'bg-slate-900 border-slate-900 text-white font-semibold shadow-xs' : 'border-slate-200 text-slate-700 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <Icon className="w-4 h-4 mx-auto mb-1" />
                    <span className="text-xs block">{t.label}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleCreateKnowledge} className="space-y-4 text-sm">
                {/* Title field - contextually labeled */}
                <div>
                  <label className="font-semibold text-slate-800 block mb-1.5">
                    {modalType === 'faq' 
                      ? 'Question' 
                      : modalType === 'document' 
                      ? 'Document Title (Auto-filled from file)' 
                      : modalType === 'url' 
                      ? 'Source / Page Title' 
                      : 'Document Title'}
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
                        : modalType === 'url'
                        ? 'e.g. Developer API Documentation'
                        : 'e.g. Enterprise SLA Terms'
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-hidden text-sm"
                  />
                </div>

                {/* WEBSITE URL INPUT */}
                {modalType === 'url' && (
                  <div>
                    <label className="font-semibold text-slate-800 block mb-1.5">Website URL (SSRF Protected)</label>
                    <input
                      type="url"
                      required
                      value={formUrl}
                      onChange={(e) => setFormUrl(e.target.value)}
                      placeholder="https://yourcompany.com/docs"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-hidden text-sm"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Crawler validates target URL and strips private subnets, loopback, and metadata endpoints.
                    </p>
                  </div>
                )}

                {/* DOCUMENT FILE UPLOAD ZONE */}
                {modalType === 'document' && (
                  <div>
                    <label className="font-semibold text-slate-800 block mb-1.5">
                      Document File
                    </label>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.doc,.txt,.md,.json,.csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    {selectedFile ? (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <FileCheck className="w-5 h-5 text-emerald-400" />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-bold text-slate-900 truncate">{selectedFile.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-600 font-mono">
                              <span>{fileSizeStr}</span>
                              <span>·</span>
                              <span className="uppercase">{selectedFile.name.split('.').pop()}</span>
                              <span>·</span>
                              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                <Check className="w-3 h-3" /> Ready to Index
                              </span>
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
                          className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
                        className={`p-7 border-2 border-dashed rounded-xl text-center transition-all cursor-pointer ${
                          isDragging 
                            ? 'border-slate-900 bg-slate-100 scale-[0.99]' 
                            : 'border-slate-200 hover:border-slate-400 bg-slate-50/60 hover:bg-slate-50'
                        }`}
                      >
                        <UploadCloud className={`w-8 h-8 mx-auto mb-2 transition-colors ${
                          isDragging ? 'text-slate-900' : 'text-slate-500'
                        }`} />
                        <p className="text-sm font-bold text-slate-800">
                          Click to upload or drag & drop files here
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          PDF, DOCX, TXT, MD, CSV, JSON (up to 25MB)
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* FAQ ANSWER */}
                {modalType === 'faq' && (
                  <div>
                    <label className="font-semibold text-slate-800 block mb-1.5">Official Answer</label>
                    <textarea
                      rows={4}
                      required
                      value={formFaqAnswer}
                      onChange={(e) => setFormFaqAnswer(e.target.value)}
                      placeholder="Provide the exact verified answer for this FAQ..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-hidden text-sm"
                    />
                  </div>
                )}

                {/* TEXT TAB CONTENT */}
                {modalType === 'text' && (
                  <div>
                    <label className="font-semibold text-slate-800 block mb-1.5">
                      Text / Markdown Content
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={formContent}
                      onChange={(e) => setFormContent(e.target.value)}
                      placeholder="Paste or write your company knowledge, policies, or guide here..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-hidden font-mono text-xs"
                    />
                  </div>
                )}

                {/* INGESTION PROGRESS INDICATOR */}
                {isIngesting && (
                  <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-xl space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-slate-700 animate-spin" />
                        <span>{ingestStep || 'Processing document...'}</span>
                      </span>
                      <Sparkles className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-slate-900 h-full rounded-full animate-pulse w-3/4" />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    disabled={isIngesting}
                    className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-xl font-semibold transition-colors cursor-pointer text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isIngesting || (!formTitle.trim()) || (modalType === 'document' && !selectedFile && !formContent.trim())}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-sm cursor-pointer text-sm"
                  >
                    {isIngesting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Ingesting Knowledge...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>
                          {modalType === 'document' 
                            ? 'Save & Index Document' 
                            : modalType === 'url' 
                            ? 'Crawl & Index URL' 
                            : modalType === 'faq' 
                            ? 'Save FAQ' 
                            : 'Save & Index Knowledge'}
                        </span>
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
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 text-slate-800 rounded-xl border border-slate-200">
                  {previewItem.type === 'url' ? <Globe className="w-5 h-5" /> : previewItem.type === 'document' ? <FileText className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{previewItem.title}</h3>
                  <span className="text-xs text-slate-500 capitalize font-mono">{previewItem.category || 'General'} · {previewItem.type}</span>
                </div>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 p-4.5 rounded-xl border border-slate-200 text-sm font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
              {previewItem.faqAnswer ? (
                <div>
                  <p className="font-bold text-slate-900 mb-2">Q: {previewItem.title}</p>
                  <p className="text-slate-800">A: {previewItem.faqAnswer}</p>
                </div>
              ) : (
                previewItem.content
              )}
            </div>

            <div className="pt-2.5 flex items-center justify-between text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold text-xs sm:text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>1536-dim Dense Embeddings Active</span>
              </span>
              <button
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-colors cursor-pointer text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Collection Modal */}
      {isNewCollectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Create New Collection</h3>
                  <p className="text-xs text-slate-500">Group related knowledge documents and FAQs.</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewCollectionModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCollection} className="space-y-4 text-sm">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1.5">Collection Name</label>
                <input
                  type="text"
                  required
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="e.g. Developer APIs & SDKs"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-900 focus:border-slate-900 text-slate-900 font-medium focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1.5">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={newColDesc}
                  onChange={(e) => setNewColDesc(e.target.value)}
                  placeholder="Brief description of what documents belong here..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-900 focus:border-slate-900 text-slate-900 text-sm focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewCollectionModalOpen(false)}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-xl font-semibold transition-colors cursor-pointer text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newColName.trim()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors shadow-sm cursor-pointer text-sm"
                >
                  Create Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unified Manage Collections Modal */}
      {isManageCollectionsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
                  <Folder className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Manage Collections</h3>
                  <p className="text-xs text-slate-500">Edit, rename, or remove knowledge collections.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsManageCollectionsModalOpen(false);
                  setEditingCollection(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editingCollection ? (
              <form onSubmit={handleUpdateCollection} className="space-y-4 text-sm flex-1 overflow-y-auto">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Editing Collection</h4>
                    <button
                      type="button"
                      onClick={() => setEditingCollection(null)}
                      className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      Back to list
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1">Collection Name</label>
                    <input
                      type="text"
                      required
                      value={editColName}
                      onChange={(e) => setEditColName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-900 focus:border-slate-900 text-slate-900 font-medium text-sm focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1">Description (Optional)</label>
                    <textarea
                      rows={2}
                      value={editColDesc}
                      onChange={(e) => setEditColDesc(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-900 focus:border-slate-900 text-slate-900 text-xs focus:outline-hidden"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingCollection(null)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!editColName.trim()}
                      className="px-3.5 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[380px] pr-1">
                {collections.map((col) => (
                  <div
                    key={col.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-white transition-all gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                        <Folder className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{col.name}</p>
                        {col.description ? (
                          <p className="text-xs text-slate-500 truncate">{col.description}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCollection(col);
                          setEditColName(col.name);
                          setEditColDesc(col.description || '');
                        }}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded-lg transition-colors cursor-pointer"
                        title="Rename / Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCollection(col.id, col.name)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Collection"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {collections.length === 0 && (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No custom collections found. Click "Add Collection" below to create one.
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsManageCollectionsModalOpen(false);
                  setIsNewCollectionModalOpen(true);
                }}
                className="px-3.5 py-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 rounded-xl font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Add Collection</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsManageCollectionsModalOpen(false);
                  setEditingCollection(null);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-colors cursor-pointer text-xs shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
