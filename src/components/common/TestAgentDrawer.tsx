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
  Cpu, 
  Layers 
} from 'lucide-react';
import { useApp } from '../../context';
import { Message, ToolExecutionTrace } from '../../types';
import { AIAgentEngine } from '../../services/aiEngine';

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
      id: 'test-greeting',
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
      id: `test-u-${Date.now()}`,
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
        id: `test-a-${Date.now()}`,
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
        id: `test-init-${Date.now()}`,
        sender: 'agent',
        senderName: currentCompany.agent.name,
        text: currentCompany.agent.greetingMessage,
        timestamp: new Date().toISOString()
      }
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" 
        onClick={() => setIsQuickTestOpen(false)} 
      />
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300 z-10">
        {/* Drawer Header */}
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="relative shrink-0">
              <img 
                src={currentCompany.agent.avatarUrl} 
                alt={currentCompany.agent.name} 
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-indigo-500/30"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{currentCompany.agent.name}</h3>
                <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-700 font-mono rounded font-medium border border-indigo-200 shrink-0">
                  Single Agent
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">Live Workspace Test & Hierarchy Inspector</p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              onClick={resetChat}
              title="Reset Test Conversation"
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsQuickTestOpen(false)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Grounded Q&A Context Badge */}
        <div className="bg-slate-900 text-indigo-100 px-3.5 sm:px-4 py-2 text-[10px] sm:text-[11px] flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-1.5 sm:gap-2 truncate mr-2">
            <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">Grounded Q&A: <strong>Knowledge ({knowledgeItems.length} sources)</strong></span>
          </div>
          <span className="text-emerald-400 font-mono text-[10px] font-semibold shrink-0">● Anti-Hallucination</span>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const showReasoning = showReasoningMap[msg.id];

            return (
              <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                <div className="flex items-start gap-2 max-w-[88%]">
                  {!isUser && (
                    <img 
                      src={currentCompany.agent.avatarUrl} 
                      alt="Avatar" 
                      className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5 ring-1 ring-slate-200" 
                    />
                  )}
                  <div className="flex flex-col">
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                        isUser
                          ? 'bg-indigo-600 text-white rounded-br-xs'
                          : 'bg-white text-slate-800 border border-slate-200 shadow-xs rounded-bl-xs'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    </div>

                    {/* Pending Confirmation UI for High Risk Actions */}
                    {msg.isPendingConfirmation && msg.pendingActionData && (
                      <div className="mt-2 bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-900 shadow-sm animate-in fade-in">
                        <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-800">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span>Confirmation Required</span>
                        </div>
                        <p className="mb-2 text-slate-700">{msg.pendingActionData.prompt}</p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleConfirmation(msg.id, true)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs flex items-center gap-1 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Confirm & Execute
                          </button>
                          <button
                            onClick={() => handleConfirmation(msg.id, false)}
                            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium text-xs transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Tool Execution Traces Badge */}
                    {msg.toolTraces && msg.toolTraces.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.toolTraces.map((trace, idx) => (
                          <div key={idx} className="bg-slate-900 text-slate-200 border border-slate-800 rounded-lg p-2 text-[11px] font-mono">
                            <div className="flex items-center justify-between text-indigo-400 font-bold mb-1">
                              <span className="flex items-center gap-1">
                                <Zap className="w-3 h-3 text-amber-400" />
                                {trace.toolName}()
                              </span>
                              <span className="text-[10px] text-emerald-400 uppercase">{trace.status}</span>
                            </div>
                            <div className="text-slate-400 text-[10px] truncate">
                              args: {JSON.stringify(trace.arguments)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Step-by-Step Hierarchical Reasoning Inspector */}
                    {msg.reasoningSteps && msg.reasoningSteps.length > 0 && (
                      <div className="mt-1.5">
                        <button
                          onClick={() => setShowReasoningMap(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                          className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          <Cpu className="w-3 h-3" />
                          <span>{showReasoning ? 'Hide' : 'Inspect'} AI Reasoning Hierarchy ({msg.reasoningSteps.length} steps)</span>
                          {showReasoning ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        {showReasoning && (
                          <div className="mt-1 p-2 bg-slate-900 text-slate-300 rounded-lg border border-slate-800 text-[10px] font-mono space-y-1 animate-in fade-in">
                            {msg.reasoningSteps.map((step, sIdx) => (
                              <div key={sIdx} className="flex items-start gap-1.5">
                                <span className="text-indigo-400 shrink-0">#{sIdx + 1}</span>
                                <span>{step}</span>
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
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 p-2.5 rounded-2xl w-fit">
              <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              <span>{currentCompany.agent.name} is reasoning & querying knowledge base...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Prompts */}
        <div className="px-4 py-2 border-t border-slate-200 bg-white flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <span className="text-slate-400 font-medium shrink-0">Try:</span>
          <button
            onClick={() => { setInput('What is your SLA and uptime credit policy?'); }}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full shrink-0 transition-colors"
          >
            SLA policy
          </button>
          <button
            onClick={() => { setInput('Check node count and spend for cls-prod-9941'); }}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full shrink-0 transition-colors"
          >
            Check Cluster Quota
          </button>
          <button
            onClick={() => { setInput('Can we book a 30-min architecture demo?'); }}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full shrink-0 transition-colors"
          >
            Book Demo (Action)
          </button>
          <button
            onClick={() => { setInput('Rotate sandbox API access token'); }}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-full shrink-0 border border-amber-200 transition-colors"
          >
            Rotate Key (High Risk)
          </button>
          <button
            onClick={() => { setInput('URGENT: Production outage 502 gateway error!'); }}
            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-full shrink-0 border border-rose-200 transition-colors"
          >
            Trigger Human Handoff
          </button>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${currentCompany.agent.name}...`}
            className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
