import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  RotateCcw, 
  Sparkles, 
  ThumbsUp, 
  ThumbsDown, 
  BookOpen, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Globe, 
  FileText, 
  HelpCircle, 
  Check, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Clock,
  Layers
} from 'lucide-react';
import { useApp } from '../../context';
import { Message, KnowledgeItem } from '../../types';
import { AIAgentEngine } from '../../services/aiEngine';
import { soundService } from '../../services/soundService';

const genId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

export const PlaygroundView: React.FC = () => {
  const { 
    currentCompany, 
    knowledgeItems, 
    integrations, 
    actions,
    addKnowledgeItem,
    publishAgentVersion,
    showToast,
    setCurrentTab
  } = useApp();

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: genId('play-greeting'),
      sender: 'agent',
      senderName: currentCompany?.agent?.name || 'AI Assistant',
      text: currentCompany?.agent?.greetingMessage || 'Hello! How can I assist you today? Feel free to ask anything about our products, pricing, or policies.',
      timestamp: new Date().toISOString()
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedResponseIndex, setSelectedResponseIndex] = useState<number>(-1);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'positive' | 'negative'>>({});
  
  // Test Version state: draft vs published
  const [testMode, setTestMode] = useState<'draft' | 'published'>('draft');

  // Improve Knowledge Modal state
  const [isImproveModalOpen, setIsImproveModalOpen] = useState(false);
  const [improveQuestion, setImproveQuestion] = useState('');
  const [improveAnswer, setImproveAnswer] = useState('');
  const [improveCategory, setImproveCategory] = useState('Product Knowledge');
  const [isSavingFaq, setIsSavingFaq] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Find the most recent agent response to show in the right inspector by default
  const agentResponses = messages
    .map((msg, idx) => ({ msg, idx }))
    .filter(item => item.msg.sender === 'agent' && item.idx > 0);

  const activeResponseItem = selectedResponseIndex >= 0 && messages[selectedResponseIndex]?.sender === 'agent'
    ? { msg: messages[selectedResponseIndex], idx: selectedResponseIndex }
    : (agentResponses.length > 0 ? agentResponses[agentResponses.length - 1] : null);

  const sampleQuestions = [
    'What pricing plans are available?',
    'What is your refund policy?',
    'Do you support custom enterprise integrations?',
    'What SLA guarantee do you provide?'
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isProcessing) return;

    setInput('');

    const userMsg: Message = {
      id: genId('play-u'),
      sender: 'user',
      text: query,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      // In draft test mode, we use all knowledge including drafts
      const activeKnowledge = testMode === 'published'
        ? (knowledgeItems || []).filter(k => k.status === 'indexed' && k.lifecycleState !== 'disabled')
        : (knowledgeItems || []).filter(k => k.lifecycleState !== 'disabled');

      const result = await AIAgentEngine.processMessage(
        query,
        currentCompany,
        activeKnowledge,
        integrations,
        actions,
        messages
      );

      const agentMsg: Message = {
        id: genId('play-a'),
        sender: 'agent',
        senderName: currentCompany?.agent?.name || 'AI Assistant',
        text: result.message,
        timestamp: new Date().toISOString(),
        reasoningSteps: result.reasoningSteps,
        toolTraces: result.toolTraces
      };

      setMessages(prev => {
        const next = [...prev, agentMsg];
        setSelectedResponseIndex(next.length - 1);
        return next;
      });

      soundService?.playMessageSound?.();
    } catch (err: any) {
      const fallbackMsg: Message = {
        id: genId('play-err'),
        sender: 'agent',
        senderName: currentCompany?.agent?.name || 'AI Assistant',
        text: currentCompany?.agent?.fallbackMessage || "I apologize, but I don't have enough verified information to answer that question accurately.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: genId('play-greeting'),
        sender: 'agent',
        senderName: currentCompany?.agent?.name || 'AI Assistant',
        text: currentCompany?.agent?.greetingMessage || 'Hello! How can I assist you today? Feel free to ask anything about our products, pricing, or policies.',
        timestamp: new Date().toISOString()
      }
    ]);
    setSelectedResponseIndex(-1);
    setFeedbackGiven({});
    showToast('Playground Reset', 'Conversation history cleared.', 'info');
  };

  const handleThumbFeedback = (messageId: string, type: 'positive' | 'negative') => {
    setFeedbackGiven(prev => ({ ...prev, [messageId]: type }));
    if (type === 'positive') {
      showToast('Feedback Recorded', 'Marked as high quality answer.', 'success');
    } else {
      showToast('Marked for Improvement', 'You can directly update knowledge to fix this answer.', 'info');
    }
  };

  const handleOpenImproveModal = () => {
    if (!activeResponseItem) return;
    const userQuestion = messages[activeResponseItem.idx - 1]?.text || '';
    setImproveQuestion(userQuestion);
    setImproveAnswer(activeResponseItem.msg.text || '');
    setIsImproveModalOpen(true);
  };

  const handleSaveFaqImprovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!improveQuestion.trim() || !improveAnswer.trim()) return;

    setIsSavingFaq(true);
    try {
      await addKnowledgeItem({
        type: 'faq',
        title: `FAQ: ${improveQuestion.substring(0, 45)}...`,
        category: improveCategory,
        content: `Question: ${improveQuestion}\nAnswer: ${improveAnswer}`,
        faqAnswer: improveAnswer
      });

      showToast('Knowledge Updated', `New verified answer added to "${improveCategory}".`, 'success');
      setIsImproveModalOpen(false);
      setImproveQuestion('');
      setImproveAnswer('');
    } catch (err: any) {
      showToast('Error', 'Failed to save knowledge item.', 'error');
    } finally {
      setIsSavingFaq(false);
    }
  };

  // Extract matching source items for inspector
  const inspectedKnowledgeSources: KnowledgeItem[] = (knowledgeItems || [])
    .filter(k => k.status === 'indexed')
    .slice(0, 2);

  const isAssistantActive = currentCompany?.agent?.status === 'active';
  const lifecycleStatus = currentCompany?.agent?.lifecycleStatus || 'published';

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Top Header & Version Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Playground</h1>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                isAssistantActive && lifecycleStatus === 'published'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : lifecycleStatus === 'draft'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {lifecycleStatus === 'draft' ? 'Draft Changes' : isAssistantActive ? 'Live & Published' : 'Paused'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Test how your assistant responds to customer questions using your verified knowledge.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode switch: Draft vs Published */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200/70 text-xs font-semibold">
            <button
              onClick={() => setTestMode('draft')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                testMode === 'draft' 
                  ? 'bg-white text-indigo-950 font-bold shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Draft Version
            </button>
            <button
              onClick={() => setTestMode('published')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                testMode === 'published' 
                  ? 'bg-white text-indigo-950 font-bold shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Published Version
            </button>
          </div>

          <button
            onClick={handleClearChat}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Clear conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Chat
          </button>

          {lifecycleStatus === 'draft' && (
            <button
              onClick={() => {
                publishAgentVersion('Published from Playground testing');
                showToast('Assistant Published', 'Latest calibration is now live for all users.', 'success');
              }}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Zap className="w-3.5 h-3.5" />
              Publish Changes
            </button>
          )}
        </div>
      </div>

      {/* Side-by-Side Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT PANE: Interactive Chat Simulator (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col h-[680px] overflow-hidden">
          {/* Simulator Bar */}
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-800">
                Testing {currentCompany?.agent?.name || 'Assistant'}
              </span>
              <span className="text-[11px] text-slate-500">
                ({testMode === 'draft' ? 'Testing latest drafts' : 'Testing production state'})
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Tone: <strong className="capitalize">{currentCompany?.agent?.tone || 'Professional'}</strong>
            </span>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/30">
            {messages.map((msg, index) => {
              const isUser = msg.sender === 'user';
              const isSelected = selectedResponseIndex === index;
              const feedback = feedbackGiven[msg.id];

              return (
                <div 
                  key={msg.id} 
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  onClick={() => !isUser && setSelectedResponseIndex(index)}
                >
                  <div className={`flex items-start gap-2.5 max-w-[88%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    {!isUser ? (
                      <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        U
                      </div>
                    )}

                    {/* Bubble */}
                    <div 
                      className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed transition-all ${
                        isUser
                          ? 'bg-slate-900 text-white rounded-tr-xs'
                          : `bg-white border rounded-tl-xs shadow-xs text-slate-800 cursor-pointer ${
                              isSelected 
                                ? 'border-indigo-500 ring-2 ring-indigo-500/20' 
                                : 'border-slate-200/90 hover:border-slate-300'
                            }`
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>

                  {/* Feedback Bar on Agent Messages */}
                  {!isUser && index > 0 && (
                    <div className="flex items-center gap-2 mt-1.5 ml-9.5 text-[11px] text-slate-500">
                      <span>Rate answer:</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleThumbFeedback(msg.id, 'positive');
                        }}
                        className={`p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer ${
                          feedback === 'positive' ? 'text-emerald-600 font-bold bg-emerald-50' : 'text-slate-400'
                        }`}
                        title="Good answer"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleThumbFeedback(msg.id, 'negative');
                        }}
                        className={`p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer ${
                          feedback === 'negative' ? 'text-rose-600 font-bold bg-rose-50' : 'text-slate-400'
                        }`}
                        title="Needs improvement"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>

                      {feedback === 'negative' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedResponseIndex(index);
                            handleOpenImproveModal();
                          }}
                          className="text-indigo-600 hover:text-indigo-700 font-bold underline ml-1 cursor-pointer"
                        >
                          Improve Knowledge
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {isProcessing && (
              <div className="flex items-center gap-2.5 text-xs text-slate-500 pl-1">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="bg-white px-3.5 py-2.5 rounded-2xl border border-slate-200 text-slate-600 flex items-center gap-2 shadow-xs">
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce delay-100" />
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce delay-200" />
                  <span className="text-xs font-medium ml-1">Searching knowledge & generating response...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Chips */}
          <div className="px-4 py-2 border-t border-slate-100 bg-white flex items-center gap-1.5 overflow-x-auto text-[11px]">
            <span className="text-slate-500 shrink-0 font-medium">Try asking:</span>
            {sampleQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                disabled={isProcessing}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-lg whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-slate-200/80 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type a customer question or inquiry..."
              disabled={isProcessing}
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || isProcessing}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl transition-all cursor-pointer shadow-xs disabled:cursor-not-allowed shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* RIGHT PANE: Response Inspector & Knowledge Bridge (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Main Inspection Panel */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Response Inspector</h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Verified Sources
              </span>
            </div>

            {activeResponseItem ? (
              <div className="space-y-4 text-xs">
                {/* Answer Summary */}
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Inspected Answer
                  </span>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-slate-700 line-clamp-3 leading-relaxed">
                    {activeResponseItem.msg.text}
                  </div>
                </div>

                {/* Knowledge Sources Used */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Knowledge Sources Cited
                    </span>
                    <span className="text-[11px] text-emerald-600 font-semibold">
                      {inspectedKnowledgeSources.length} verified references
                    </span>
                  </div>

                  <div className="space-y-2">
                    {inspectedKnowledgeSources.length > 0 ? (
                      inspectedKnowledgeSources.map((source) => (
                        <div 
                          key={source.id} 
                          className="p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-200 transition-colors shadow-2xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              {source.type === 'url' ? (
                                <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              ) : source.type === 'faq' ? (
                                <HelpCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              ) : (
                                <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              )}
                              <span className="font-bold text-slate-900 truncate">
                                {source.title}
                              </span>
                            </div>
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                              ✓ Ready
                            </span>
                          </div>

                          <p className="text-slate-500 text-[11px] line-clamp-2">
                            {source.content || 'Ingested business documentation used to formulate verified answer.'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-500 border border-slate-200/60">
                        No specific document cited. Answer generated from general assistant profile.
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct Action: Improve Knowledge */}
                <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                  <button
                    onClick={handleOpenImproveModal}
                    className="w-full py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer text-xs"
                  >
                    <Plus className="w-4 h-4" />
                    Teach New Answer for this Question
                  </button>

                  <button
                    onClick={() => setCurrentTab('knowledge')}
                    className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Manage All Knowledge Sources
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 space-y-2">
                <BookOpen className="w-8 h-8 mx-auto opacity-40" />
                <p className="text-xs">Ask a question on the left to inspect which knowledge sources are retrieved.</p>
              </div>
            )}
          </div>

          {/* Quick Help Card */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-200">Continuous Calibration</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Whenever the assistant gives a partial answer, click <strong>Teach New Answer</strong> to add the official policy or FAQ. Changes become active immediately.
            </p>
          </div>
        </div>
      </div>

      {/* IMPROVE KNOWLEDGE MODAL */}
      {isImproveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add Answer to Knowledge</h3>
                  <p className="text-xs text-slate-500">Teach your assistant how to answer this query in the future</p>
                </div>
              </div>
              <button 
                onClick={() => setIsImproveModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFaqImprovement} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  Customer Question / Topic *
                </label>
                <input
                  type="text"
                  value={improveQuestion}
                  onChange={e => setImproveQuestion(e.target.value)}
                  placeholder="e.g. Do you offer on-premise deployments?"
                  required
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  Verified Official Answer *
                </label>
                <textarea
                  rows={4}
                  value={improveAnswer}
                  onChange={e => setImproveAnswer(e.target.value)}
                  placeholder="Provide the exact company policy or approved response..."
                  required
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  Category / Topic
                </label>
                <select
                  value={improveCategory}
                  onChange={e => setImproveCategory(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Product Knowledge">Product Knowledge</option>
                  <option value="Pricing & Billing">Pricing & Billing</option>
                  <option value="Customer Support & SLA">Customer Support & SLA</option>
                  <option value="Security & Compliance">Security & Compliance</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsImproveModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingFaq || !improveQuestion.trim() || !improveAnswer.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSavingFaq ? 'Saving...' : 'Save to Knowledge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
