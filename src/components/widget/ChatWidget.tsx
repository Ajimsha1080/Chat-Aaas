import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Send, 
  Bot, 
  Sparkles,
  Headphones,
  Zap,
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
  const bottomPad = settings.bottomPadding !== undefined ? `${settings.bottomPadding}px` : undefined;
  const sidePad = settings.sidePadding !== undefined ? `${settings.sidePadding}px` : undefined;

  return (
    <div 
      style={!isInlinePreview ? {
        bottom: bottomPad,
        [isBottomLeft ? 'left' : 'right']: sidePad
      } : undefined}
      className={isInlinePreview ? 'w-full h-full' : `fixed ${!sidePad ? (isBottomLeft ? 'left-3 sm:left-6' : 'right-3 sm:right-6') : ''} ${!bottomPad ? 'bottom-3 sm:bottom-6' : ''} z-50 flex flex-col ${isBottomLeft ? 'items-start' : 'items-end'}`}
    >
      {/* Floating Chat Container */}
      {(isOpen || isInlinePreview) && (
        <div 
          className={`w-96 max-w-[calc(100vw-1.5rem)] h-[520px] sm:h-[580px] max-h-[calc(100vh-5rem)] bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden mb-2.5 sm:mb-3.5 animate-in slide-in-from-bottom-5 duration-200`}
        >
          {/* Widget Header */}
          <div 
            style={{ backgroundColor: settings.primaryColor }}
            className="p-4 text-white flex items-center justify-between shrink-0 shadow-md"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <img 
                  src={settings.botAvatar || currentCompany.agent.avatarUrl} 
                  alt="" 
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-white/30"
                />
                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white ${
                  currentCompany.agent.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400'
                }`} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base tracking-tight truncate">{settings.headerTitle}</h3>
                <p className="text-xs text-white/90 truncate">{settings.headerSubtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {!isInlinePreview && (
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/20 rounded-full text-white/90 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50 text-sm">
            {messages.map(msg => {
              const isUser = msg.sender === 'user';

              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-start gap-2.5 max-w-[85%]">
                    {!isUser && (
                      <img 
                        src={settings.botAvatar || currentCompany.agent.avatarUrl} 
                        alt="" 
                        className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5 ring-1 ring-slate-200" 
                      />
                    )}
                    <div>
                      <div
                        style={{
                          backgroundColor: isUser ? settings.primaryColor : '#ffffff',
                          color: isUser ? '#ffffff' : '#0f172a'
                        }}
                        className={`p-3.5 rounded-2xl leading-relaxed text-sm ${
                          isUser ? 'rounded-br-xs shadow-xs' : 'border border-slate-200/80 shadow-xs rounded-bl-xs'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                      </div>

                      {/* Pending Confirmation Box */}
                      {msg.isPendingConfirmation && msg.pendingActionData && (
                        <div className="mt-2.5 bg-amber-50 border border-amber-300 rounded-2xl p-4 text-sm text-amber-950 shadow-sm animate-in fade-in">
                          <div className="flex items-center gap-2 font-bold mb-1.5 text-amber-800">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <span>Confirmation Required</span>
                          </div>
                          <p className="mb-2.5 text-slate-700 text-sm">{msg.pendingActionData.prompt}</p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleConfirmAction(msg.id, true)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => handleConfirmAction(msg.id, false)}
                              className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Tool Execution Trace Badge */}
                      {msg.toolTraces && msg.toolTraces.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {msg.toolTraces.map((trace, tIdx) => (
                            <div key={tIdx} className="bg-slate-900 text-indigo-300 p-2.5 rounded-xl font-mono text-xs">
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
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-600 bg-white border border-slate-200 px-3.5 py-2.5 rounded-2xl w-fit">
                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                <span>Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-3.5 py-2 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
            <button
              onClick={() => { setInput('What is your SLA & refund policy?'); }}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-full shrink-0 transition-colors cursor-pointer"
            >
              SLA Policy
            </button>
            <button
              onClick={() => { setInput('Can I book a 30-min demo?'); }}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-full shrink-0 transition-colors cursor-pointer"
            >
              Book Demo
            </button>
            <button
              onClick={() => { setInput('Check status of cls-prod-9941'); }}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-full shrink-0 transition-colors cursor-pointer"
            >
              Check Status
            </button>
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSendMessage} className="p-3.5 bg-white border-t border-slate-200 flex items-center gap-2.5 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 px-4 py-2.5 text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
            <button
              type="submit"
              disabled={!input.trim() || isProcessing}
              style={{ backgroundColor: settings.primaryColor }}
              className="p-2.5 text-white rounded-xl disabled:opacity-50 transition-transform active:scale-95 shrink-0 cursor-pointer"
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          </form>

          {/* Powered by footer */}
          {settings.showPoweredBy && (
            <div className="py-1.5 bg-slate-100/80 text-center text-xs text-slate-500 font-medium">
              Powered by <strong>Agent-as-a-Service</strong>
            </div>
          )}
        </div>
      )}

      {/* Floating Launcher Button */}
      {!isInlinePreview && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{ 
            backgroundColor: settings.primaryColor,
            borderRadius: settings.launcherShape === 'teardrop'
              ? (isBottomLeft ? '50% 50% 50% 4px' : '50% 50% 4px 50%')
              : (settings.launcherShape === 'squircle' ? '18px' : (settings.launcherShape === 'circle' ? '9999px' : undefined))
          }}
          className={`flex items-center gap-3 ${settings.launcherShape === 'pill' ? 'px-6 py-4 rounded-full' : 'p-4 rounded-full'} text-white font-bold text-sm shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer`}
        >
          {(() => {
            switch (settings.launcherIcon) {
              case 'logo':
              case 'custom': {
                const logoUrl = settings.launcherLogoUrl || settings.botAvatar || currentCompany.agent.avatarUrl;
                return (
                  <img
                    src={logoUrl}
                    alt={currentCompany.name}
                    className="w-5 h-5 rounded-full object-cover border border-white/40 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                );
              }
              case 'swirl':
                return (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white shrink-0">
                    <path d="M6.5 9.8C6.5 7 9.2 5.5 12.5 5.5c4.6 0 8 3.2 8 7.5 0 4.4-3.6 7.8-8.2 7.8-4.3 0-7.2-3-7.2-6.6 0-3 2.3-5.2 5.2-5.2 2.3 0 4 1.4 4 3.2 0 1.4-1.1 2.4-2.4 2.4-1 0-1.7-.7-1.7-1.5 0-.5.4-.9.9-.9.3 0 .5.2.5.4 0 .3.2.4.5.4.4 0 .8-.5.8-1 0-1-.9-1.8-2.2-1.8-1.7 0-3 1.3-3 3 0 2.2 1.9 4 4.5 4 3.2 0 5.8-2.4 5.8-5.7 0-3.3-2.6-5.6-5.8-5.6-2.3 0-4.2 1.2-4.2 2.8 0 .4-.3.7-.7.7s-.7-.3-.7-.7z" />
                  </svg>
                );
              case 'chat_dots':
                return (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white shrink-0">
                    <path d="M12 2C6.477 2 2 6.03 2 11c0 2.68 1.31 5.09 3.4 6.69-.17 1.25-.8 2.82-1.92 3.86-.23.21-.11.6.2.62 2.37.13 4.67-.93 6.07-1.92.73.16 1.48.25 2.25.25 5.523 0 10-4.03 10-9s-4.477-9-10-9zm-4.5 10a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4.5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4.5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
                  </svg>
                );
              case 'chat_lines':
                return (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white shrink-0">
                    <path d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8.414l-4.707 4.707A1 1 0 0 1 2 22V5a2 2 0 0 1 2-2zm3 5a1 1 0 0 0 0 2h10a1 1 0 1 0 0-2H7zm0 4a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2H7z" />
                  </svg>
                );
              case 'help_filled':
              case 'help':
                return (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white shrink-0">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.88 15.75h-1.75v-1.75h1.75v1.75zm1.5-6.22l-.79.81c-.63.64-1.02 1.16-1.02 2.41h-1.5v-.5c0-.83.34-1.58.88-2.12l.93-.94c.28-.28.45-.66.45-1.09 0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5H8.38c0-1.99 1.62-3.62 3.62-3.62s3.62 1.62 3.62 3.62c0 .78-.31 1.49-.84 1.98z" />
                  </svg>
                );
              case 'chat_double':
                return (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white shrink-0">
                    <path d="M17 3H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h1v3.5a.5.5 0 0 0 .854.354L10.707 16H17a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" />
                    <path d="M13 18h2.293l3.853 3.854A.5.5 0 0 0 20 21.5V18h1a2 2 0 0 0 2-2v-7a2 2 0 0 0-1-1.732V14a3 3 0 0 1-3 3h-5.268A2 2 0 0 0 13 18z" opacity="0.9" />
                  </svg>
                );
              case 'bot': return <Bot className="w-5 h-5 text-white" />;
              case 'sparkles': return <Sparkles className="w-5 h-5 text-white" />;
              case 'support': return <Headphones className="w-5 h-5 text-white" />;
              case 'zap': return <Zap className="w-5 h-5 text-white" />;
              case 'chat':
              default:
                return (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white shrink-0">
                    <path d="M12 2C6.477 2 2 6.03 2 11c0 2.68 1.31 5.09 3.4 6.69-.17 1.25-.8 2.82-1.92 3.86-.23.21-.11.6.2.62 2.37.13 4.67-.93 6.07-1.92.73.16 1.48.25 2.25.25 5.523 0 10-4.03 10-9s-4.477-9-10-9zm-4.5 10a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4.5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4.5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
                  </svg>
                );
            }
          })()}
          {settings.launcherShape === 'pill' && (
            <span>{settings.launcherText}</span>
          )}
        </button>
      )}
    </div>
  );
};
