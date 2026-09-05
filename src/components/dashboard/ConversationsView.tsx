import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  UserCheck, 
  CheckCircle2, 
  Send, 
  ShieldAlert, 
  Cpu, 
  Bot, 
  Zap, 
  Play 
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
    startNewCustomerChatSession
  } = useApp();

  const [filterStatus, setFilterStatus] = useState<ConversationStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [operatorInput, setOperatorInput] = useState('');
  const [simulateUserInput, setSimulateUserInput] = useState('');
  const [showReasoningMap, setShowReasoningMap] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentActiveConversation?.messages]);

  const filteredConversations = conversations.filter(conv => {
    const matchesStatus = filterStatus === 'all' || conv.status === filterStatus;
    const matchesSearch = conv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          conv.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const handleSendOperatorReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorInput.trim() || !currentActiveConversation) return;

    sendOperatorMessage(currentActiveConversation.id, operatorInput.trim());
    setOperatorInput('');
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
      {/* Left List: Conversations Inbox */}
      <div className="w-80 lg:w-96 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col shrink-0 overflow-hidden">
        {/* Inbox Header */}
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <h2 className="text-sm font-bold text-slate-900">Live Customer Inbox</h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  const convId = startNewCustomerChatSession(true);
                  const sampleQuestions = [
                    "Where is my order ORD-8821 right now?",
                    "What is your enterprise SLA and uptime guarantee?",
                    "Can you process a refund for my recent purchase?",
                    "I want to speak with a human support manager please."
                  ];
                  const q = sampleQuestions[Math.floor(Math.random() * sampleQuestions.length)];
                  setTimeout(() => {
                    sendMessageToAgent(convId, q);
                  }, 800);
                }}
                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold rounded-lg transition-colors flex items-center gap-1"
                title="Simulate a real-time customer conversation"
              >
                <Zap className="w-3 h-3 text-emerald-600" />
                <span>+ Live Customer</span>
              </button>
              <button
                onClick={() => startNewCustomerChatSession(true)}
                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors"
              >
                + New
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer or tag..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'active', label: 'Active' },
              { id: 'escalated_to_human', label: 'Escalated' },
              { id: 'resolved', label: 'Resolved' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id as any)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg whitespace-nowrap transition-colors ${
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
              No conversations found.
            </div>
          ) : (
            filteredConversations.map(conv => {
              const isActive = currentActiveConversation?.id === conv.id;
              const lastMsg = conv.messages[conv.messages.length - 1];

              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`p-3.5 cursor-pointer transition-colors ${
                    isActive ? 'bg-indigo-50/70 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900 truncate max-w-[140px]">
                      {conv.customerName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {lastMsg ? lastMsg.text : 'Session started'}
                  </p>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {conv.status === 'escalated_to_human' && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded">
                          Escalated
                        </span>
                      )}
                      {conv.status === 'resolved' && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                          Resolved
                        </span>
                      )}
                      {conv.status === 'active' && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded">
                          Active
                        </span>
                      )}
                    </div>

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

      {/* Right Area: Active Conversation Thread & Operator Controls */}
      {currentActiveConversation ? (
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          {/* Thread Header */}
          <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                {currentActiveConversation.customerName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{currentActiveConversation.customerName}</h3>
                  <span className="text-[11px] font-mono text-slate-500">({currentActiveConversation.customerEmail})</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                    currentActiveConversation.sentiment === 'urgent' ? 'bg-rose-100 text-rose-800' :
                    currentActiveConversation.sentiment === 'positive' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {currentActiveConversation.sentiment} Sentiment
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>Channel: <strong>{currentActiveConversation.channel}</strong></span>
                  <span>•</span>
                  <span>Tokens: <strong>{currentActiveConversation.totalTokensUsed}</strong></span>
                </div>
              </div>
            </div>

            {/* Operator Takeover & Resolve Controls */}
            <div className="flex items-center gap-2">
              {currentActiveConversation.status !== 'escalated_to_human' ? (
                <button
                  onClick={() => takeoverConversation(currentActiveConversation.id)}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Take Over Conversation</span>
                </button>
              ) : (
                <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Human Operator Active ({currentActiveConversation.assignedOperator})</span>
                </span>
              )}

              {currentActiveConversation.status !== 'resolved' && (
                <button
                  onClick={() => resolveConversation(currentActiveConversation.id)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Resolved</span>
                </button>
              )}
            </div>
          </div>

          {/* Messages Thread */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/40">
            {currentActiveConversation.messages.map((msg) => {
              const isUser = msg.sender === 'user';
              const isHumanOperator = msg.sender === 'human_agent';
              const showReasoning = showReasoningMap[msg.id];

              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-start gap-2.5 max-w-[80%]">
                    {!isUser && (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        isHumanOperator ? 'bg-amber-600 text-white font-bold text-xs' : 'bg-indigo-600 text-white'
                      }`}>
                        {isHumanOperator ? 'OP' : <Bot className="w-4 h-4" />}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[11px] font-bold text-slate-700">
                          {isUser ? currentActiveConversation.customerName : (isHumanOperator ? msg.senderName || 'Human Operator' : currentCompany.agent.name)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isHumanOperator && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-bold">
                            Live Staff Takeover
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
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                      </div>

                      {/* Tool Execution Record */}
                      {msg.toolTraces && msg.toolTraces.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {msg.toolTraces.map((trace, tIdx) => (
                            <div key={tIdx} className="bg-slate-900 text-slate-200 border border-slate-800 rounded-lg p-2.5 text-[11px] font-mono">
                              <div className="flex items-center justify-between text-indigo-400 font-bold mb-1">
                                <span className="flex items-center gap-1">
                                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                                  Tool Invoked: {trace.toolName}()
                                </span>
                                <span className="text-emerald-400 text-[10px] uppercase font-bold">{trace.status}</span>
                              </div>
                              <p className="text-slate-400 text-[10px]">Args: {JSON.stringify(trace.arguments)}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Internal Agent Reasoning Inspection */}
                      {msg.reasoningSteps && msg.reasoningSteps.length > 0 && (
                        <div className="mt-1.5">
                          <button
                            onClick={() => setShowReasoningMap(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                            className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                          >
                            <Cpu className="w-3 h-3" />
                            <span>{showReasoning ? 'Hide' : 'Inspect'} Internal Hierarchy Trace ({msg.reasoningSteps.length} steps)</span>
                          </button>

                          {showReasoning && (
                            <div className="mt-1 p-2.5 bg-slate-900 text-slate-300 rounded-xl text-[10px] font-mono space-y-1">
                              {msg.reasoningSteps.map((step, idx) => (
                                <p key={idx}>
                                  <span className="text-indigo-400">Step {idx + 1}:</span> {step}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Dual Bar: Human Operator Reply vs Simulate Customer Input */}
          <div className="border-t border-slate-200 bg-white p-3 space-y-2">
            {/* Operator Live Reply Form */}
            <form onSubmit={handleSendOperatorReply} className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-1 rounded shrink-0">
                Staff Reply:
              </span>
              <input
                type="text"
                value={operatorInput}
                onChange={(e) => setOperatorInput(e.target.value)}
                placeholder="Type reply to customer as live staff (agent remains paused)..."
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="submit"
                disabled={!operatorInput.trim()}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>

            {/* Customer Simulation Form */}
            <form onSubmit={handleSimulateUserMessage} className="flex items-center gap-2 pt-1 border-t border-slate-100">
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded shrink-0">
                Customer Sim:
              </span>
              <input
                type="text"
                value={simulateUserInput}
                onChange={(e) => setSimulateUserInput(e.target.value)}
                placeholder="Type as customer to trigger AI agent response & actions..."
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!simulateUserInput.trim()}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Trigger Agent</span>
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-center text-slate-400 text-xs">
          Select a conversation from the left to inspect transcripts or take over.
        </div>
      )}
    </div>
  );
};
