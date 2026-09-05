import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  UserCheck, 
  CheckCircle2, 
  Send, 
  ShieldAlert, 
  Bot, 
  Zap, 
  BookOpen, 
  User, 
  Mail, 
  Globe, 
  Clock, 
  Check, 
  Sparkles,
  ChevronRight,
  AlertTriangle,
  FileText,
  CheckCircle
} from 'lucide-react';
import { useApp } from '../../context';
import { ConversationStatus } from '../../types';

export const ConversationsView: React.FC = () => {
  const { 
    conversations, 
    setActiveConversationId, 
    currentActiveConversation,
    currentCompany,
    takeoverConversation,
    sendOperatorMessage,
    resolveConversation,
    sendMessageToAgent,
    startNewCustomerChatSession,
    showToast
  } = useApp();

  const [filterStatus, setFilterStatus] = useState<ConversationStatus | 'all' | 'needs_attention'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [operatorInput, setOperatorInput] = useState('');
  const [internalNoteInput, setInternalNoteInput] = useState('');
  const [isNoteMode, setIsNoteMode] = useState(false);
  const [simulateUserInput, setSimulateUserInput] = useState('');
  const [showReasoningMap, setShowReasoningMap] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentActiveConversation?.messages]);

  const filteredConversations = conversations.filter(conv => {
    let matchesStatus = true;
    if (filterStatus === 'needs_attention') {
      matchesStatus = conv.status === 'escalated_to_human';
    } else if (filterStatus !== 'all') {
      matchesStatus = conv.status === filterStatus;
    }
    const matchesSearch = conv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          conv.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

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

  const handleSimulateUserMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulateUserInput.trim() || !currentActiveConversation) return;

    const text = simulateUserInput.trim();
    setSimulateUserInput('');
    await sendMessageToAgent(currentActiveConversation.id, text);
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] flex gap-4 animate-in fade-in duration-200">
      {/* 1. LEFT PANE: Conversation List */}
      <div className="w-72 sm:w-80 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col shrink-0 overflow-hidden">
        {/* Inbox Header */}
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <h2 className="text-sm font-bold text-slate-900">Conversations Inbox</h2>
            </div>
            <button
              onClick={() => {
                const convId = startNewCustomerChatSession(true);
                const sampleQuestions = [
                  "Where is my order ORD-8821 right now?",
                  "What is your enterprise SLA and refund policy?",
                  "Can you help me book an appointment for tomorrow?",
                  "I would like to speak with a human support agent please."
                ];
                const q = sampleQuestions[Math.floor(Math.random() * sampleQuestions.length)];
                setTimeout(() => {
                  sendMessageToAgent(convId, q);
                }, 600);
              }}
              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Zap className="w-3 h-3 text-emerald-600" />
              <span>+ Live Inquiry</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer or tag..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'needs_attention', label: 'Needs Attention' },
              { id: 'active', label: 'AI Serving' },
              { id: 'resolved', label: 'Resolved' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id as any)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  filterStatus === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No conversations in this filter.
            </div>
          ) : (
            filteredConversations.map(conv => {
              const isActive = currentActiveConversation?.id === conv.id;
              const lastMsg = conv.messages[conv.messages.length - 1];

              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`p-3.5 cursor-pointer transition-all ${
                    isActive 
                      ? 'bg-indigo-50/70 border-l-4 border-l-indigo-600' 
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900 truncate max-w-[150px]">
                      {conv.customerName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {conv.startedAt}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 truncate mb-2">
                    {lastMsg ? lastMsg.text : 'New session started'}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      conv.status === 'escalated_to_human'
                        ? 'bg-amber-100 text-amber-800'
                        : conv.status === 'resolved'
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {conv.status === 'escalated_to_human' ? 'Handoff' : conv.status}
                    </span>

                    <span className="text-[10px] text-slate-400 font-mono">
                      {conv.messages.length} msgs
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. MIDDLE PANE: Live Conversation Transcript */}
      {currentActiveConversation ? (
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          {/* Active Conversation Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                {currentActiveConversation.customerName.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-xs text-slate-900">{currentActiveConversation.customerName}</h3>
                <span className="text-[10px] text-slate-500 font-mono">Channel: {currentActiveConversation.channel}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => resolveConversation(currentActiveConversation.id)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Mark Resolved</span>
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
            {currentActiveConversation.messages.map(msg => {
              const isUser = msg.sender === 'user';
              const isHumanOperator = msg.sender === 'human_agent';
              const isSystemNote = msg.sender === 'system';

              if (isSystemNote) {
                return (
                  <div key={msg.id} className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-mono">
                    {msg.text}
                  </div>
                );
              }

              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-lg ${isUser ? 'order-1' : 'order-2'}`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-[11px] font-bold text-slate-700">
                          {isUser ? currentActiveConversation.customerName : (isHumanOperator ? msg.senderName || 'Staff Support' : currentCompany.agent.name)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isHumanOperator && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-bold">
                            Live Staff Reply
                          </span>
                        )}
                      </div>

                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                          isUser
                            ? 'bg-indigo-600 text-white rounded-tr-xs'
                            : isHumanOperator
                            ? 'bg-amber-50 text-slate-900 border border-amber-300 rounded-tl-xs shadow-xs'
                            : 'bg-white text-slate-800 border border-slate-200 shadow-xs rounded-tl-xs'
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
          <div className="p-3 border-t border-slate-200 bg-white space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsNoteMode(false)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  !isNoteMode ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                Reply to Customer
              </button>
              <button
                type="button"
                onClick={() => setIsNoteMode(true)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  isNoteMode ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                + Internal Staff Note
              </button>
            </div>

            <form onSubmit={handleSendOperatorReply} className="flex items-center gap-2">
              <input
                type="text"
                value={operatorInput}
                onChange={(e) => setOperatorInput(e.target.value)}
                placeholder={isNoteMode ? "Write private internal note (visible only to staff)..." : "Reply directly to customer as human operator..."}
                className={`flex-1 text-xs px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 ${
                  isNoteMode ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-200'
                }`}
              />
              <button
                type="submit"
                disabled={!operatorInput.trim()}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isNoteMode 
                    ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isNoteMode ? 'Save Note' : 'Send'}</span>
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-center p-8 text-center text-slate-400 text-xs">
          Select a conversation from the left to view messages and customer context.
        </div>
      )}

      {/* 3. RIGHT PANE: Customer / AI Context */}
      {currentActiveConversation && (
        <div className="w-64 lg:w-72 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between shrink-0 overflow-y-auto space-y-4">
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Customer Profile</h3>
              <div className="mt-2 text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-slate-700">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold truncate">{currentActiveConversation.customerName}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{currentActiveConversation.customerEmail || 'visitor@guest.io'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span className="capitalize">{currentActiveConversation.channel.replace('_', ' ')}</span>
                </div>
              </div>
            </div>

            {/* AI Status & Takeover */}
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Handoff Status</h3>
              <div className="mt-2">
                {currentActiveConversation.status === 'escalated_to_human' ? (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      <span>Human Takeover Active</span>
                    </div>
                    <p className="text-[11px] text-rose-700">AI Agent is silenced so you can assist directly.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>AI Autonomously Serving</span>
                      </div>
                    </div>
                    <button
                      onClick={() => takeoverConversation(currentActiveConversation.id)}
                      className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-amber-700" />
                      <span>Take Over Chat</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* AI Knowledge Grounding Note */}
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Grounding Context</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                All replies in this thread are strictly referenced against <strong>{currentCompany.name}</strong> verified knowledge base chunks.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-mono text-center">
            Session ID: {currentActiveConversation.id}
          </div>
        </div>
      )}
    </div>
  );
};
