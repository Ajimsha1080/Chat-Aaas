import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Send, 
  Bot, 
  AlertTriangle 
} from 'lucide-react';
import { useApp } from '../../context';
import { Message, ToolExecutionTrace } from '../../types';
import { AIAgentEngine } from '../../services/aiEngine';

interface ChatWidgetProps {
  isInlinePreview?: boolean;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ isInlinePreview = false }) => {
  const { 
    currentCompany, 
    knowledgeItems, 
    integrations, 
    actions 
  } = useApp();

  const [isOpen, setIsOpen] = useState(isInlinePreview);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 'w-greeting',
      sender: 'agent',
      senderName: currentCompany.agent.name,
      text: currentCompany.agent.greetingMessage,
      timestamp: new Date().toISOString()
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);

  const settings = currentCompany.widgetSettings;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isProcessing]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userText = input.trim();
    setInput('');

    const userMsg: Message = {
      id: `w-u-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

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
        id: `w-a-${Date.now()}`,
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
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAction = (msgId: string, confirmed: boolean) => {
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

    const confMsgId = `w-conf-${msgId}`;
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

  const isBottomLeft = settings.position === 'bottom_left';

  return (
    <div className={isInlinePreview ? 'w-full h-full' : `fixed ${isBottomLeft ? 'left-3 sm:left-6' : 'right-3 sm:right-6'} bottom-3 sm:bottom-6 z-50 flex flex-col ${isBottomLeft ? 'items-start' : 'items-end'}`}>
      {/* Floating Chat Container */}
      {(isOpen || isInlinePreview) && (
        <div 
          className={`w-96 max-w-[calc(100vw-1.5rem)] h-[520px] sm:h-[580px] max-h-[calc(100vh-5rem)] bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden mb-2.5 sm:mb-3.5 animate-in slide-in-from-bottom-5 duration-200`}
        >
          {/* Widget Header */}
          <div 
            style={{ backgroundColor: settings.primaryColor }}
            className="p-3.5 sm:p-4 text-white flex items-center justify-between shrink-0 shadow-md"
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="relative shrink-0">
                <img 
                  src={settings.botAvatar || currentCompany.agent.avatarUrl} 
                  alt="" 
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-white/30"
                />
                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ring-2 ring-white ${
                  currentCompany.agent.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400'
                }`} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-xs sm:text-sm tracking-tight truncate">{settings.headerTitle}</h3>
                <p className="text-[10px] sm:text-[11px] text-white/80 truncate">{settings.headerSubtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {!isInlinePreview && (
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/20 rounded-full text-white/90 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50 text-xs">
            {messages.map(msg => {
              const isUser = msg.sender === 'user';

              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-start gap-2 max-w-[85%]">
                    {!isUser && (
                      <img 
                        src={settings.botAvatar || currentCompany.agent.avatarUrl} 
                        alt="" 
                        className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5" 
                      />
                    )}
                    <div>
                      <div
                        style={{
                          backgroundColor: isUser ? settings.primaryColor : '#ffffff',
                          color: isUser ? '#ffffff' : '#0f172a'
                        }}
                        className={`p-3 rounded-2xl leading-relaxed ${
                          isUser ? 'rounded-br-xs shadow-xs' : 'border border-slate-200/80 shadow-xs rounded-bl-xs'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                      </div>

                      {/* Pending Confirmation Box */}
                      {msg.isPendingConfirmation && msg.pendingActionData && (
                        <div className="mt-2 bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-950 shadow-sm animate-in fade-in">
                          <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-800">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Confirmation Required</span>
                          </div>
                          <p className="mb-2 text-slate-700">{msg.pendingActionData.prompt}</p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleConfirmAction(msg.id, true)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => handleConfirmAction(msg.id, false)}
                              className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium text-xs transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Tool Execution Trace Badge */}
                      {msg.toolTraces && msg.toolTraces.length > 0 && (
                        <div className="mt-1.5 space-y-1">
                          {msg.toolTraces.map((trace, tIdx) => (
                            <div key={tIdx} className="bg-slate-900 text-indigo-300 p-2 rounded-lg font-mono text-[10px]">
                              <span className="text-amber-400 font-bold">⚡ {trace.toolName}()</span>: {trace.status}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isProcessing && (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 px-3 py-2 rounded-2xl w-fit">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
                <span>Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-1.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px]">
            <button
              onClick={() => { setInput('What is your SLA & refund policy?'); }}
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full shrink-0"
            >
              SLA Policy
            </button>
            <button
              onClick={() => { setInput('Can I book a 30-min demo?'); }}
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full shrink-0"
            >
              Book Demo
            </button>
            <button
              onClick={() => { setInput('Check status of cls-prod-9941'); }}
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full shrink-0"
            >
              Check Status
            </button>
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
            <button
              type="submit"
              disabled={!input.trim() || isProcessing}
              style={{ backgroundColor: settings.primaryColor }}
              className="p-2 text-white rounded-xl disabled:opacity-50 transition-transform active:scale-95 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Powered by footer */}
          {settings.showPoweredBy && (
            <div className="py-1 bg-slate-100/70 text-center text-[10px] text-slate-400 font-medium">
              Powered by <strong>Agent-as-a-Service</strong>
            </div>
          )}
        </div>
      )}

      {/* Floating Launcher Button */}
      {!isInlinePreview && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{ backgroundColor: settings.primaryColor }}
          className="flex items-center gap-2.5 px-5 py-3.5 rounded-full text-white font-bold text-xs shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105 active:scale-95"
        >
          <Bot className="w-5 h-5 text-white" />
          <span>{settings.launcherText}</span>
        </button>
      )}
    </div>
  );
};
