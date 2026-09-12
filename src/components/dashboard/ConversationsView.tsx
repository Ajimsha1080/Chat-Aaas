import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  UserCheck, 
  Send, 
  ShieldAlert, 
  User, 
  Mail, 
  Globe, 
  Check, 
  CheckCircle,
  ArrowLeft,
  Info,
  X,
  Archive,
  Trash2,
  FileText,
  CheckSquare,
  Square,
  AlertTriangle,
  Plus,
  HelpCircle,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { useApp } from '../../context';
import { ConversationStatus, Conversation } from '../../types';
import { GlobalActionMenu } from '../common/GlobalActionMenu';
import { DeleteConfirmationModal } from '../common/DeleteConfirmationModal';

export const ConversationsView: React.FC = () => {
  const { 
    conversations, 
    setActiveConversationId, 
    currentActiveConversation,
    currentCompany,
    takeoverConversation,
    sendOperatorMessage,
    resolveConversation,
    archiveConversation,
    deleteConversation,
    bulkArchiveConversations,
    bulkDeleteConversations,
    addKnowledgeItem,
    showToast
  } = useApp();

  const [inboxTab, setInboxTab] = useState<'all' | 'unanswered'>('all');
  const [filterStatus, setFilterStatus] = useState<ConversationStatus | 'all' | 'needs_attention'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [operatorInput, setOperatorInput] = useState('');
  const [isNoteMode, setIsNoteMode] = useState(false);
  const [isMobileProfileOpen, setIsMobileProfileOpen] = useState(false);

  // Teach / Answer Modal state
  const [teachModalOpen, setTeachModalOpen] = useState(false);
  const [teachQuestion, setTeachQuestion] = useState('');
  const [teachAnswer, setTeachAnswer] = useState('');
  const [teachCategory, setTeachCategory] = useState('Customer Inquiries');
  const [teachConversationId, setTeachConversationId] = useState<string | null>(null);
  const [isSavingAnswer, setIsSavingAnswer] = useState(false);

  const unansweredList = (conversations || []).filter(
    c => c.status === 'escalated_to_human' || c.status === 'flagged'
  );

  const handleOpenTeach = (conv: Conversation) => {
    const userMessages = (conv.messages || []).filter(m => m.sender === 'user');
    const q = userMessages.length > 0 ? userMessages[userMessages.length - 1].text : '';
    setTeachQuestion(q);
    setTeachAnswer('');
    setTeachConversationId(conv.id);
    setTeachModalOpen(true);
  };

  const handleSaveTeach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teachQuestion.trim() || !teachAnswer.trim()) return;
    setIsSavingAnswer(true);
    try {
      await addKnowledgeItem({
        type: 'faq',
        title: `FAQ: ${teachQuestion.substring(0, 45)}...`,
        category: teachCategory,
        content: `Question: ${teachQuestion}\nAnswer: ${teachAnswer}`,
        faqAnswer: teachAnswer
      });
      if (teachConversationId) {
        resolveConversation(teachConversationId);
      }
      showToast('Knowledge Updated & Resolved', 'Official answer saved. The assistant can now answer this question.', 'success');
      setTeachModalOpen(false);
      setTeachQuestion('');
      setTeachAnswer('');
      setTeachConversationId(null);
    } catch {
      showToast('Error', 'Failed to save answer to knowledge.', 'error');
    } finally {
      setIsSavingAnswer(false);
    }
  };

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [convToDelete, setConvToDelete] = useState<Conversation | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentActiveConversation?.messages]);

  const filteredConversations = (conversations || []).filter(conv => {
    let matchesStatus = true;
    if (filterStatus === 'needs_attention') {
      matchesStatus = conv.status === 'escalated_to_human';
    } else if (filterStatus !== 'all') {
      matchesStatus = conv.status === filterStatus;
    }
    const matchesSearch = (conv.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (conv.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredConversations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredConversations.map(c => c.id));
    }
  };

  const handleSendOperatorReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorInput.trim() || !currentActiveConversation) return;

    if (isNoteMode) {
      takeoverConversation(currentActiveConversation.id, 'Support Operator (You)', operatorInput.trim());
      setOperatorInput('');
      setIsNoteMode(false);
      showToast('Internal Note Added', 'Saved private note visible only to team.', 'info');
    } else {
      sendOperatorMessage(currentActiveConversation.id, operatorInput.trim());
      setOperatorInput('');
      showToast('Reply Sent', 'Live staff message delivered to customer.', 'success');
    }
  };

  // Customer Profile Component (used in desktop right pane and mobile drawer)
  const renderCustomerProfile = () => {
    if (!currentActiveConversation) return null;
    return (
      <div className="flex flex-col justify-between h-full space-y-5">
        <div className="space-y-5">
          <div className="pb-4 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Customer Profile</h3>
            <div className="mt-3 text-sm space-y-2">
              <div className="flex items-center gap-2.5 text-slate-800">
                <User className="w-4 h-4 text-slate-500" />
                <span className="font-bold truncate">{currentActiveConversation.customerName}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-600 font-mono text-xs">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="truncate">{currentActiveConversation.customerEmail || 'visitor@guest.io'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-600 text-xs">
                <Globe className="w-4 h-4 text-slate-400" />
                <span className="capitalize font-medium">{currentActiveConversation.channel.replace('_', ' ')}</span>
              </div>
            </div>
          </div>

          {/* AI Status & Takeover */}
          <div className="pb-4 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Handoff Status</h3>
            <div className="mt-3">
              {currentActiveConversation.status === 'escalated_to_human' ? (
                <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 text-rose-950 text-sm space-y-1.5">
                  <div className="flex items-center gap-2 font-bold">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>Staff Takeover Active</span>
                  </div>
                  <p className="text-xs text-rose-800 leading-relaxed">AI Agent is silenced so you can assist directly.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-sm">
                    <div className="flex items-center gap-2 font-semibold">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>AI Autonomously Serving</span>
                    </div>
                  </div>
                  <button
                    onClick={() => takeoverConversation(currentActiveConversation.id)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-800 border border-slate-200 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4 text-slate-700" />
                    <span>Take Over Chat</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* AI Knowledge Grounding Note */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Grounding Context</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
              All replies in this thread are strictly referenced against <strong>{currentCompany.name}</strong> verified knowledge sources and company documents.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 text-xs text-slate-400 font-mono text-center">
          Session ID: {currentActiveConversation.id}
        </div>
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-7.5rem)] sm:h-[calc(100vh-8.5rem)] flex gap-4 animate-in fade-in duration-150 relative">
      {/* 1. LEFT PANE: Conversation List (Hidden on mobile when conversation is selected) */}
      <div className={`w-full md:w-80 lg:w-96 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col shrink-0 overflow-hidden ${
        currentActiveConversation ? 'hidden md:flex' : 'flex'
      }`}>
        {/* Inbox Header */}
        <div className="p-4 border-b border-slate-200/90 space-y-3">
          {/* Sub-tab Navigation */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setInboxTab('all')}
              className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                inboxTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Inquiries ({conversations.length})
            </button>
            <button
              onClick={() => setInboxTab('unanswered')}
              className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                inboxTab === 'unanswered'
                  ? 'bg-white text-amber-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Unanswered</span>
              {unansweredList.length > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">
                  {unansweredList.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${inboxTab === 'unanswered' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              <h2 className="text-base font-bold text-slate-900">
                {inboxTab === 'unanswered' ? 'Unanswered Questions' : 'Conversations Inbox'}
              </h2>
            </div>

            {inboxTab === 'all' && filteredConversations.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {selectedIds.length === filteredConversations.length && filteredConversations.length > 0 ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Deselect All</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                    <span>Select All</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer or tag..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-hidden font-medium"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'needs_attention', label: 'Attention' },
              { id: 'active', label: 'Open' },
              { id: 'resolved', label: 'Resolved' },
              { id: 'archived', label: 'Archived' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  filterStatus === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Bulk Action Bar */}
          {selectedIds.length > 0 && (
            <div className="p-2.5 bg-slate-900 text-white flex items-center justify-between gap-2 px-3.5 rounded-xl animate-in fade-in">
              <span className="text-xs font-semibold">{selectedIds.length} selected</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    await bulkArchiveConversations(selectedIds);
                    setSelectedIds([]);
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Archive selected conversations"
                >
                  <Archive className="w-3.5 h-3.5 text-amber-400" />
                  <span>Archive</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsBulkDeleting(true)}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Delete selected conversations"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer ml-1"
                  title="Clear selection"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Conversation List Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {inboxTab === 'unanswered' ? (
            unansweredList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
                <p className="font-semibold text-slate-700">All questions answered!</p>
                <p className="text-xs text-slate-400">Your AI assistant resolved all customer inquiries with high confidence.</p>
              </div>
            ) : (
              unansweredList.map(conv => {
                const userMsgs = (conv.messages || []).filter(m => m.sender === 'user');
                const lastQuestion = userMsgs.length > 0 ? userMsgs[userMsgs.length - 1].text : 'Unspecified inquiry';

                return (
                  <div key={conv.id} className="p-4 space-y-2.5 hover:bg-amber-50/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {conv.customerName || 'Visitor'}
                      </span>
                      <span className="text-[10px] font-mono text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-semibold">
                        Needs Answer
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-800 line-clamp-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                      "{lastQuestion}"
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-400 font-mono capitalize">
                        {conv.channel.replace('_', ' ')}
                      </span>
                      <button
                        onClick={() => handleOpenTeach(conv)}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3 h-3" />
                        Teach Answer
                      </button>
                    </div>
                  </div>
                );
              })
            )
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No conversations in this filter.
            </div>
          ) : (
            filteredConversations.map(conv => {
              const isActive = currentActiveConversation?.id === conv.id;
              const isSelected = selectedIds.includes(conv.id);
              const msgs = conv.messages || [];
              const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;

              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`p-3.5 cursor-pointer transition-colors flex items-start gap-2.5 ${
                    isActive 
                      ? 'bg-slate-100/90 border-l-4 border-l-slate-900' 
                      : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Row Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleSelect(conv.id, e)}
                    className="mt-0.5 text-slate-400 hover:text-slate-800 cursor-pointer shrink-0"
                    title={isSelected ? 'Deselect' : 'Select'}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-slate-900 truncate max-w-[130px]">
                        {conv.customerName || 'Customer'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono shrink-0">
                        {conv.startedAt || ''}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 truncate mb-2">
                      {lastMsg ? lastMsg.text : 'New session started'}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${
                        conv.status === 'escalated_to_human'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : conv.status === 'archived'
                          ? 'bg-slate-200 text-slate-700 border border-slate-300'
                          : conv.status === 'resolved'
                          ? 'bg-slate-100 text-slate-700 border border-slate-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        {conv.status === 'escalated_to_human' ? 'Handoff' : conv.status === 'archived' ? 'Archived' : conv.status === 'resolved' ? 'Resolved' : 'Active'}
                      </span>

                      <span className="text-[11px] text-slate-400 font-mono">
                        {msgs.length} msgs
                      </span>
                    </div>
                  </div>

                  {/* 3-dot GlobalActionMenu */}
                  <div onClick={e => e.stopPropagation()} className="shrink-0">
                    <GlobalActionMenu
                      items={[
                        {
                          label: 'View Transcript',
                          icon: FileText,
                          onClick: () => setActiveConversationId(conv.id)
                        },
                        {
                          label: conv.status === 'archived' ? 'Unarchive Thread' : 'Archive Thread',
                          icon: Archive,
                          onClick: () => archiveConversation(conv.id)
                        },
                        {
                          label: 'Delete Thread',
                          icon: Trash2,
                          variant: 'destructive',
                          onClick: () => setConvToDelete(conv)
                        }
                      ]}
                      size="sm"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. MIDDLE PANE: Live Conversation Transcript (Full width on mobile when active) */}
      {currentActiveConversation ? (
        <div className="flex-1 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col overflow-hidden min-w-0">
          {/* Active Conversation Header */}
          <div className="p-4 border-b border-slate-200/90 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-3 min-w-0">
              {/* Back button on mobile to return to conversation list */}
              <button
                onClick={() => setActiveConversationId(null as any)}
                className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors mr-1 cursor-pointer"
                title="Back to inbox list"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-sm border border-slate-200 shrink-0">
                {currentActiveConversation.customerName.charAt(0)}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-base text-slate-900 truncate">{currentActiveConversation.customerName}</h3>
                <span className="text-xs text-slate-500 font-mono block truncate">Channel: {currentActiveConversation.channel}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Mobile Profile Drawer Toggle */}
              <button
                onClick={() => setIsMobileProfileOpen(!isMobileProfileOpen)}
                className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
                title="Customer details"
              >
                <Info className="w-5 h-5" />
              </button>

              <button
                onClick={() => resolveConversation(currentActiveConversation.id)}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Mark Resolved</span>
                <span className="sm:hidden">Resolve</span>
              </button>
            </div>
          </div>

          {/* Archived Banner if Thread is Archived */}
          {currentActiveConversation.status === 'archived' && (
            <div className="p-3 bg-amber-50/90 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between px-5 font-medium animate-in fade-in">
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-amber-700 shrink-0" />
                <span>This conversation thread is archived and read-only.</span>
              </div>
              <button
                type="button"
                onClick={() => archiveConversation(currentActiveConversation.id)}
                className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Restore to Active
              </button>
            </div>
          )}

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/30">
            {(currentActiveConversation?.messages || []).map(msg => {
              const isUser = msg.sender === 'user';
              const isHumanOperator = msg.sender === 'human_agent';
              const isSystemNote = msg.sender === 'system';

              if (isSystemNote) {
                return (
                  <div key={msg.id} className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs sm:text-sm text-amber-950 font-mono">
                    {msg.text}
                  </div>
                );
              }

              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] sm:max-w-lg ${isUser ? 'order-1' : 'order-2'}`}>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-xs sm:text-sm font-bold text-slate-800">
                          {isUser ? currentActiveConversation.customerName : (isHumanOperator ? msg.senderName || 'Staff Support' : currentCompany.agent.name)}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isHumanOperator && (
                          <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-md font-semibold">
                            Staff
                          </span>
                        )}
                      </div>

                      <div
                        className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                          isUser
                            ? 'bg-slate-900 text-white rounded-tr-xs shadow-sm'
                            : isHumanOperator
                            ? 'bg-amber-50 text-slate-900 border border-amber-200 rounded-tl-xs shadow-xs'
                            : 'bg-white text-slate-900 border border-slate-200/90 rounded-tl-xs shadow-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Operator Reply & Internal Note Bar */}
          <div className="p-3.5 sm:p-4 border-t border-slate-200/90 bg-white space-y-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsNoteMode(false)}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                  !isNoteMode ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Reply to Customer
              </button>
              <button
                type="button"
                onClick={() => setIsNoteMode(true)}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                  isNoteMode ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                + Internal Note
              </button>
            </div>

            {currentActiveConversation.status === 'archived' ? (
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 text-center font-medium">
                This conversation is archived and read-only. Restore it to resume messaging.
              </div>
            ) : (
              <form onSubmit={handleSendOperatorReply} className="flex items-center gap-2.5">
                <input
                  type="text"
                  value={operatorInput}
                  onChange={(e) => setOperatorInput(e.target.value)}
                  placeholder={isNoteMode ? "Write private note..." : "Reply as human operator..."}
                  className={`flex-1 text-sm px-4 py-2.5 border rounded-xl focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-hidden ${
                    isNoteMode ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-200'
                  }`}
                />
                <button
                  type="submit"
                  disabled={!operatorInput.trim()}
                  className={`px-4 sm:px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm ${
                    isNoteMode 
                      ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                      : 'bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden xs:inline">{isNoteMode ? 'Save Note' : 'Send'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 bg-white rounded-2xl border border-slate-200/90 shadow-sm items-center justify-center p-8 text-center text-slate-400 text-sm">
          Select a conversation from the left to view messages and customer context.
        </div>
      )}

      {/* 3. RIGHT PANE: Customer / AI Context (Desktop Sidebar) */}
      {currentActiveConversation && (
        <div className="hidden lg:flex w-72 lg:w-80 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex-col justify-between shrink-0 overflow-y-auto space-y-4">
          {renderCustomerProfile()}
        </div>
      )}

      {/* 4. MOBILE CUSTOMER PROFILE DRAWER / MODAL */}
      {isMobileProfileOpen && currentActiveConversation && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end animate-in fade-in duration-150">
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" 
            onClick={() => setIsMobileProfileOpen(false)} 
          />
          <div className="relative w-full max-w-sm bg-white shadow-2xl h-full p-6 flex flex-col justify-between z-10 animate-in slide-in-from-right duration-200 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Customer Details</h3>
              <button 
                onClick={() => setIsMobileProfileOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 py-4">
              {renderCustomerProfile()}
            </div>
          </div>
        </div>
      )}

      {/* DELETE SINGLE CONVERSATION MODAL */}
      <DeleteConfirmationModal
        isOpen={Boolean(convToDelete)}
        onClose={() => setConvToDelete(null)}
        onConfirm={async () => {
          if (convToDelete) {
            await deleteConversation(convToDelete.id);
            setConvToDelete(null);
          }
        }}
        title="Delete Conversation"
        resourceName={convToDelete?.customerName ? `${convToDelete.customerName}'s thread` : 'this conversation'}
        confirmText="DELETE"
        isPermanent={true}
        destructiveActionLabel="Delete Conversation"
        dependencies={[
          `Customer: ${convToDelete?.customerName || 'Customer'}`,
          `Channel: ${convToDelete?.channel || 'chat'}`,
          `Messages: ${(convToDelete?.messages || []).length} items`
        ]}
        consequences={[
          'All messages, customer details, and telemetry for this session will be permanently deleted.',
          'This action is irreversible and cannot be undone.'
        ]}
      />

      {/* BULK DELETE CONVERSATIONS MODAL */}
      <DeleteConfirmationModal
        isOpen={isBulkDeleting}
        onClose={() => setIsBulkDeleting(false)}
        onConfirm={async () => {
          await bulkDeleteConversations(selectedIds);
          setSelectedIds([]);
          setIsBulkDeleting(false);
        }}
        title="Delete Multiple Conversations"
        resourceName={`${selectedIds.length} conversations`}
        confirmText="DELETE"
        isPermanent={true}
        destructiveActionLabel="Delete Selected Conversations"
        dependencies={[
          `Total Selected: ${selectedIds.length} conversation threads`
        ]}
        consequences={[
          'All selected conversations and their message history will be permanently wiped.',
          'This action is irreversible and cannot be restored.'
        ]}
      />

      {/* TEACH ANSWER MODAL */}
      {teachModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add Answer to Knowledge</h3>
                  <p className="text-xs text-slate-500">Teach your assistant how to resolve this customer question</p>
                </div>
              </div>
              <button 
                onClick={() => setTeachModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTeach} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  Customer Question *
                </label>
                <input
                  type="text"
                  value={teachQuestion}
                  onChange={e => setTeachQuestion(e.target.value)}
                  placeholder="e.g. Do you support international wire transfers?"
                  required
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  Official Verified Answer *
                </label>
                <textarea
                  rows={4}
                  value={teachAnswer}
                  onChange={e => setTeachAnswer(e.target.value)}
                  placeholder="Enter the official approved answer..."
                  required
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  Category
                </label>
                <select
                  value={teachCategory}
                  onChange={e => setTeachCategory(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Customer Inquiries">Customer Inquiries</option>
                  <option value="Product Knowledge">Product Knowledge</option>
                  <option value="Pricing & Billing">Pricing & Billing</option>
                  <option value="Policies & SLA">Policies & SLA</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setTeachModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAnswer || !teachQuestion.trim() || !teachAnswer.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSavingAnswer ? 'Saving & Resolving...' : 'Save & Resolve Inquiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
