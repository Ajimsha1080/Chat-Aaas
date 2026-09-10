import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Send, 
  Zap, 
  Check, 
  AlertTriangle, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  Cpu 
} from 'lucide-react';
import { useApp } from '../../context';
import { Message, ToolExecutionTrace } from '../../types';
import { AIAgentEngine } from '../../services/aiEngine';

const genId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

export const TestAgentDrawer: React.FC = () => {
  const { 
    isQuickTestOpen, 
    setIsQuickTestOpen, 
    currentCompany,
    knowledgeItems,
    integrations,
    actions
  } = useApp();

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: genId('test-greeting'),
      sender: 'agent',
      senderName: currentCompany.agent.name,
      text: currentCompany.agent.greetingMessage,
      timestamp: new Date().toISOString()
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReasoningMap, setShowReasoningMap] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  if (!isQuickTestOpen) return null;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userText = input.trim();
    setInput('');

    const userMsg: Message = {
      id: genId('test-u'),
      sender: 'user',
      text: userText,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    // Call AI Engine
    try {
      const result = await AIAgentEngine.processMessage(
        userText,
        currentCompany,
        knowledgeItems,
        integrations,
        actions,
        messages
      );

      const agentMsg: Message = {
        id: genId('test-a'),
        sender: 'agent',
        senderName: currentCompany.agent.name,
        text: result.message,
        timestamp: new Date().toISOString(),
        reasoningSteps: result.reasoningSteps,
        toolTraces: result.toolTraces,
        isPendingConfirmation: result.isPendingConfirmation,
        pendingActionData: result.pendingActionData
      };

      setMessages(prev => [...prev, agentMsg]);
      if (result.reasoningSteps && result.reasoningSteps.length > 0) {
        setShowReasoningMap(prev => ({ ...prev, [agentMsg.id]: true }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmation = (msgId: string, confirmed: boolean) => {
    const target = messages.find(m => m.id === msgId);
    if (!target || !target.pendingActionData) return;

    const actionDef = actions.find(a => a.id === target.pendingActionData?.actionId);
    let replyText = '';
    let trace: ToolExecutionTrace | undefined = undefined;

    if (confirmed && actionDef) {
      trace = {
        toolName: actionDef.code,
        arguments: target.pendingActionData.params,
        result: { status: 'success', confirmationId: `CONF-${msgId.replace(/[^a-zA-Z0-9]/g, '').slice(-8)}` },
        status: 'confirmed',
        executedAt: new Date().toISOString()
      };
      replyText = `✅ **Action Confirmed**: ${actionDef.name} processed successfully.`;
    } else {
      replyText = `❌ **Action Cancelled**: Operation cancelled by user.`;
    }

    const confMsgId = `test-conf-${msgId}`;
    const confTimestamp = new Date().toISOString();

    setMessages(prev => [
      ...prev.map(m => m.id === msgId ? { ...m, isPendingConfirmation: false } : m),
      {
        id: confMsgId,
        sender: 'agent',
        senderName: currentCompany.agent.name,
        text: replyText,
        timestamp: confTimestamp,
        toolTraces: trace ? [trace] : undefined
      }
    ]);
  };

  const resetChat = () => {
    setMessages([
      {
        id: genId('test-init'),
        sender: 'agent',
        senderName: currentCompany.agent.name,
        text: currentCompany.agent.greetingMessage,
        timestamp: new Date().toISOString()
      }
    ]);
  };

  const primaryColor = currentCompany.widgetSettings?.primaryColor || '#4f46e5';
  const isDarkMode = currentCompany.widgetSettings?.themeMode === 'dark';
  const companyLogo = currentCompany.widgetSettings?.launcherLogoUrl || currentCompany.agent.avatarUrl;
  const headerTitle = currentCompany.widgetSettings?.headerTitle || currentCompany.name + ' Support';
  const headerSubtitle = currentCompany.widgetSettings?.headerSubtitle || 'Instant answers & server actions';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
        onClick={() => setIsQuickTestOpen(false)} 
      />
      <div 
        className={`relative w-full max-w-lg h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300 z-10 ${
          isDarkMode ? 'bg-[#090d16] text-white border-slate-800' : 'bg-white text-slate-900'
        }`}
      >
        {/* Background ambient gradient glow */}
        <div 
          className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ backgroundColor: primaryColor }}
        />

        {/* Drawer Unified Brand Header */}
        <div className={`p-5 pb-4 border-b z-10 flex flex-col gap-3 ${
          isDarkMode ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-100 bg-slate-50/70'
        }`}>
          <div className="flex items-center justify-between">
            {/* Brand Badge Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-xs font-bold shadow-2xs">
              <img 
                src={companyLogo} 
                alt="Brand" 
                className="w-4 h-4 rounded-md object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80';
                }}
              />
              <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>{currentCompany.name}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase ml-1">
                Live Test
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={resetChat}
                title="Reset Test Conversation"
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsQuickTestOpen(false)}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Big Prominent Title & Subtitle */}
          <div className="space-y-0.5">
            <h3 
              className="text-2xl font-extrabold tracking-tight"
              style={{ color: primaryColor }}
            >
              {headerTitle}
            </h3>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {headerSubtitle}
            </p>
          </div>
        </div>

        {/* Chat History */}
        <div className={`flex-1 overflow-y-auto p-5 space-y-4 z-10 ${
          isDarkMode ? 'bg-[#090d16]' : 'bg-slate-50/40'
        }`}>
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const showReasoning = showReasoningMap[msg.id];

            return (
              <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                <div className="flex items-start gap-2.5 max-w-[88%]">
                  {!isUser && (
                    <img 
                      src={currentCompany.agent.avatarUrl} 
                      alt="Avatar" 
                      className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5 ring-2 ring-white/10 shadow-xs" 
                    />
                  )}
                  <div className="flex flex-col">
                    <div
                      style={{
                        backgroundColor: isUser ? primaryColor : (isDarkMode ? '#1e293b' : '#ffffff'),
                        color: isUser ? '#ffffff' : (isDarkMode ? '#f8fafc' : '#0f172a')
                      }}
                      className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        isUser
                          ? 'rounded-br-xs shadow-xs'
                          : 'border border-slate-200/80 shadow-xs rounded-bl-xs'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    </div>

                    {/* Pending Confirmation UI for High Risk Actions */}
                    {msg.isPendingConfirmation && msg.pendingActionData && (
                      <div className="mt-2.5 bg-amber-50 border border-amber-300 rounded-2xl p-4 text-sm text-amber-900 shadow-sm animate-in fade-in">
                        <div className="flex items-center gap-2 font-bold mb-1.5 text-amber-800">
                          <AlertTriangle className="w-4.5 h-4.5 text-amber-600" />
                          <span>Confirmation Required</span>
                        </div>
                        <p className="mb-3 text-slate-700 text-sm">{msg.pendingActionData.prompt}</p>
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() => handleConfirmation(msg.id, true)}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            Confirm & Execute
                          </button>
                          <button
                            onClick={() => handleConfirmation(msg.id, false)}
                            className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Tool Execution Traces Badge */}
                    {msg.toolTraces && msg.toolTraces.length > 0 && (
                      <div className="mt-2.5 space-y-1.5">
                        {msg.toolTraces.map((trace, idx) => (
                          <div key={idx} className="bg-slate-900 text-slate-200 border border-slate-800 rounded-xl p-3 text-xs font-mono">
                            <div className="flex items-center justify-between text-indigo-400 font-bold mb-1">
                              <span className="flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5 text-amber-400" />
                                {trace.toolName}()
                              </span>
                              <span className="text-xs text-emerald-400 uppercase font-bold">{trace.status}</span>
                            </div>
                            <div className="text-slate-400 text-xs truncate">
                              args: {JSON.stringify(trace.arguments)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Step-by-Step Hierarchical Reasoning Inspector */}
                    {msg.reasoningSteps && msg.reasoningSteps.length > 0 && (
                      <div className="mt-2">
                        <button
                          onClick={() => setShowReasoningMap(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                          className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                        >
                          <Cpu className="w-3.5 h-3.5" />
                          <span>{showReasoning ? 'Hide' : 'Inspect'} AI Reasoning Hierarchy ({msg.reasoningSteps.length} steps)</span>
                          {showReasoning ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {showReasoning && (
                          <div className="mt-2 p-3 bg-slate-900 text-slate-300 rounded-xl border border-slate-800 text-xs font-mono space-y-1.5 animate-in fade-in">
                            {msg.reasoningSteps.map((step, sIdx) => (
                              <div key={sIdx} className="flex items-start gap-2">
                                <span className="text-indigo-400 shrink-0 font-bold">#{sIdx + 1}</span>
                                <span className="leading-relaxed">{step}</span>
                              </div>
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

          {isProcessing && (
            <div className={`flex items-center gap-2.5 text-xs sm:text-sm p-3 rounded-2xl w-fit ${
              isDarkMode ? 'bg-slate-800 border border-slate-700 text-slate-300' : 'bg-white border border-slate-200 text-slate-600 shadow-xs'
            }`}>
              <div 
                className="w-2.5 h-2.5 rounded-full animate-pulse" 
                style={{ backgroundColor: primaryColor }}
              />
              <span>{currentCompany.agent.name} is reasoning & querying knowledge base...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Prompts synchronized with Deploy Settings */}
        {currentCompany.widgetSettings?.starterQuestions && currentCompany.widgetSettings.starterQuestions.length > 0 && (
          <div className={`px-4 py-2.5 border-t flex items-center gap-2 overflow-x-auto text-xs no-scrollbar ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <span className={`font-semibold shrink-0 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Try:</span>
            {currentCompany.widgetSettings.starterQuestions.map((q, qIdx) => (
              <button
                key={qIdx}
                type="button"
                onClick={() => { setInput(q); }}
                className={`px-3 py-1 font-medium rounded-full shrink-0 transition-colors cursor-pointer whitespace-nowrap ${
                  isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSend} className={`p-3.5 border-t flex items-center gap-2.5 ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${currentCompany.agent.name}...`}
            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
              isDarkMode 
                ? 'bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:bg-slate-800' 
                : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white'
            }`}
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            style={{ backgroundColor: primaryColor }}
            className="p-2.5 text-white rounded-xl shadow-xs transition-transform active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
          >
            <Send className="w-4.5 h-4.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
