import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Send, 
  Bot, 
  Sparkles,
  Headphones,
  HelpCircle,
  MessageCircle,
  Zap,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  Paperclip,
  ArrowUp
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
          className={`w-96 max-w-[calc(100vw-1.5rem)] h-[540px] sm:h-[600px] max-h-[calc(100vh-5rem)] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden mb-3 animate-in slide-in-from-bottom-5 duration-200`}
        >
          {/* Widget Header - Clean Minimalist Style */}
          <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {!isInlinePreview && (
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-full text-slate-700 transition-colors cursor-pointer"
                  title="Minimize chat"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <div className="relative shrink-0">
                <img 
                  src={settings.launcherLogoUrl || settings.botAvatar || currentCompany.agent.avatarUrl} 
                  alt="" 
                  className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200"
                />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 text-sm tracking-tight truncate">
                  {settings.headerTitle || currentCompany.name}
                </h3>
              </div>
            </div>

            {!isInlinePreview && (
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-white text-sm">
            {messages.map((msg, idx) => {
              const isUser = msg.sender === 'user';

              return (
                <div key={msg.id || idx} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] ${isUser ? 'ml-auto' : ''}`}>
                    <div
                      style={{
                        backgroundColor: isUser ? settings.primaryColor : '#f1f5f9',
                        color: isUser ? '#ffffff' : '#0f172a'
                      }}
                      className={`p-3.5 rounded-2xl leading-relaxed text-sm ${
                        isUser ? 'rounded-br-xs shadow-xs' : 'shadow-2xs rounded-tl-xs'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    </div>

                    {/* Timestamp / Subtitle */}
                    <div className={`text-[10px] text-slate-400 mt-1 font-medium ${isUser ? 'text-right pr-1' : 'pl-1'}`}>
                      {isUser ? 'You · Just now' : `${currentCompany.name} AI · Just now`}
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
              );
            })}

            {isProcessing && (
              <div className="flex items-center gap-2.5 text-xs text-slate-600 bg-slate-100 px-3.5 py-2.5 rounded-2xl w-fit">
                <div className="w-2 h-2 rounded-full bg-slate-600 animate-ping" />
                <span>Typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Starter Prompts Chips */}
          <div className="px-3.5 py-2 bg-white flex items-center gap-2 overflow-x-auto text-xs">
            <button
              onClick={() => { setInput('What is your pricing?'); }}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-full shrink-0 transition-colors cursor-pointer"
            >
              Pricing
            </button>
            <button
              onClick={() => { setInput('How do I get started?'); }}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-full shrink-0 transition-colors cursor-pointer"
            >
              Get Started
            </button>
            <button
              onClick={() => { setInput('Talk to human support'); }}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-full shrink-0 transition-colors cursor-pointer"
            >
              Support
            </button>
          </div>

          {/* Availability Notice Banner */}
          <div className="px-4 py-2 bg-white">
            <div className="bg-slate-100/80 rounded-2xl p-2.5 text-center text-xs text-slate-600 font-normal leading-relaxed">
              Our agents are not available right now, but you can still send messages, we'll reach out once we are back.
            </div>
          </div>

          {/* Sleek Input Bar with Paperclip & Circular Up-Arrow Button */}
          <div className="p-4 pt-1 bg-white">
            <form 
              onSubmit={handleSendMessage} 
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 rounded-2xl focus-within:border-slate-500 focus-within:ring-1 focus-within:ring-slate-400 transition-all shadow-2xs"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter your message"
                className="flex-1 text-xs sm:text-sm font-normal text-slate-800 bg-transparent focus:outline-hidden placeholder:text-slate-400"
              />
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="submit"
                disabled={!input.trim() || isProcessing}
                style={{ backgroundColor: input.trim() ? settings.primaryColor : '#94a3b8' }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 disabled:opacity-50 transition-all active:scale-95 cursor-pointer shadow-xs"
                title="Send message"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Teardrop / Curved Drop Launcher Button */}
      {!isInlinePreview && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{ backgroundColor: settings.primaryColor }}
          aria-label={isOpen ? "Close chat" : "Open chat"}
          className={`flex items-center justify-center text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer ${
            isBottomLeft 
              ? 'rounded-[24px_24px_24px_4px]' 
              : 'rounded-[24px_24px_4px_24px]'
          } ${
            isOpen 
              ? 'w-14 h-14' 
              : 'w-14 h-14 p-3'
          }`}
        >
          {isOpen ? (
            <ChevronDown className="w-6 h-6 text-white transition-transform duration-200 animate-in fade-in" />
          ) : (
            (() => {
              switch (settings.launcherIcon) {
                case 'logo':
                case 'custom': {
                  const logoUrl = settings.launcherLogoUrl || settings.botAvatar || currentCompany.agent.avatarUrl;
                  return (
                    <img
                      src={logoUrl}
                      alt={currentCompany.name}
                      className="w-7 h-7 rounded-full object-cover border border-white/40 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  );
                }
                case 'chat_dots':
                  return (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-white shrink-0">
                      <path d="M12 2C6.477 2 2 6.03 2 11c0 2.68 1.31 5.09 3.4 6.69-.17 1.25-.8 2.82-1.92 3.86-.23.21-.11.6.2.62 2.37.13 4.67-.93 6.07-1.92.73.16 1.48.25 2.25.25 5.523 0 10-4.03 10-9s-4.477-9-10-9zm-4.5 10a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4.5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4.5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
                    </svg>
                  );
                case 'chat_lines':
                  return (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-white shrink-0">
                      <path d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8.414l-4.707 4.707A1 1 0 0 1 2 22V5a2 2 0 0 1 2-2zm3 5a1 1 0 0 0 0 2h10a1 1 0 1 0 0-2H7zm0 4a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2H7z" />
                    </svg>
                  );
                case 'help_filled':
                case 'help':
                  return (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-white shrink-0">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.88 15.75h-1.75v-1.75h1.75v1.75zm1.5-6.22l-.79.81c-.63.64-1.02 1.16-1.02 2.41h-1.5v-.5c0-.83.34-1.58.88-2.12l.93-.94c.28-.28.45-.66.45-1.09 0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5H8.38c0-1.99 1.62-3.62 3.62-3.62s3.62 1.62 3.62 3.62c0 .78-.31 1.49-.84 1.98z" />
                    </svg>
                  );
                case 'chat_double':
                  return (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-white shrink-0">
                      <path d="M17 3H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h1v3.5a.5.5 0 0 0 .854.354L10.707 16H17a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" />
                      <path d="M13 18h2.293l3.853 3.854A.5.5 0 0 0 20 21.5V18h1a2 2 0 0 0 2-2v-7a2 2 0 0 0-1-1.732V14a3 3 0 0 1-3 3h-5.268A2 2 0 0 0 13 18z" opacity="0.9" />
                    </svg>
                  );
                case 'bot': return <Bot className="w-7 h-7 text-white shrink-0" />;
                case 'sparkles': return <Sparkles className="w-7 h-7 text-white shrink-0" />;
                case 'support': return <Headphones className="w-7 h-7 text-white shrink-0" />;
                case 'zap': return <Zap className="w-7 h-7 text-white shrink-0" />;
                case 'chat':
                default:
                  return (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-white shrink-0">
                      <path d="M12 2C6.477 2 2 6.03 2 11c0 2.68 1.31 5.09 3.4 6.69-.17 1.25-.8 2.82-1.92 3.86-.23.21-.11.6.2.62 2.37.13 4.67-.93 6.07-1.92.73.16 1.48.25 2.25.25 5.523 0 10-4.03 10-9s-4.477-9-10-9zm-4.5 10a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4.5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4.5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
                    </svg>
                  );
              }
            })()
          )}
        </button>
      )}
    </div>
  );
};
