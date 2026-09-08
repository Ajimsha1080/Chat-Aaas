import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  Sparkles, 
  ExternalLink, 
  Paintbrush, 
  Terminal, 
  CheckCircle2,
  MessageCircle,
  Plus,
  Trash2,
  HelpCircle,
  Clock
} from 'lucide-react';
import { useApp } from '../../context';
import { WidgetCustomization } from '../../types';

export const DeployView: React.FC = () => {
  const { 
    currentCompany, 
    updateWidgetSettings, 
    setIsLiveSandboxOpen,
    setIsQuickTestOpen
  } = useApp();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeSnippetTab, setActiveSnippetTab] = useState<'script' | 'react' | 'iframe' | 'api'>('script');
  const [localSettings, setLocalSettings] = useState<WidgetCustomization>({ ...currentCompany.widgetSettings });
  const [isSaved, setIsSaved] = useState(false);
  const COLOR_PRESETS = [
    { name: 'Indigo', hex: '#4f46e5' },
    { name: 'Violet', hex: '#7c3aed' },
    { name: 'Emerald', hex: '#059669' },
    { name: 'Sky Blue', hex: '#0284c7' },
    { name: 'Rose', hex: '#e11d48' },
    { name: 'Amber', hex: '#d97706' },
    { name: 'Obsidian', hex: '#0f172a' }
  ];

  const [launcherStyle, setLauncherStyle] = useState<'pill' | 'bubble'>('pill');
  const [starterQuestions, setStarterQuestions] = useState<string[]>([
    'What are your pricing plans?',
    'How do I get started?',
    'Talk to human support'
  ]);
  const [newQuestionInput, setNewQuestionInput] = useState('');
  const [previewChat, setPreviewChat] = useState<{ sender: 'agent' | 'user'; text: string }[]>([
    { sender: 'agent', text: currentCompany.agent.greetingMessage || 'Hello! How can I help you today?' }
  ]);

  const handleAddStarterQuestion = () => {
    if (!newQuestionInput.trim() || starterQuestions.length >= 4) return;
    setStarterQuestions(prev => [...prev, newQuestionInput.trim()]);
    setNewQuestionInput('');
  };

  const handleRemoveStarterQuestion = (idx: number) => {
    setStarterQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handlePreviewStarterClick = (question: string) => {
    setPreviewChat(prev => [
      ...prev,
      { sender: 'user', text: question },
      { sender: 'agent', text: `Here is information regarding "${question}" based on ${currentCompany.name}'s verified knowledge base.` }
    ]);
  };

  const handleResetPreview = () => {
    setPreviewChat([
      { sender: 'agent', text: currentCompany.agent.greetingMessage || 'Hello! How can I help you today?' }
    ]);
  };

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSaveBranding = () => {
    updateWidgetSettings(localSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://cdn.chat-aaas.com';
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const widgetScriptSrc = isLocal ? `${origin}/widget.js` : 'https://cdn.chat-aaas.com/v1/widget.js';
  const apiEndpointUrl = isLocal ? 'http://127.0.0.1:8001/api/v1/chat' : 'https://api.chat-aaas.com/api/v1/chat';

  // Embed script snippet
  const scriptSnippet = `<!-- Chat-AaaS AI Assistant Widget for ${currentCompany.name} -->
<script
  src="${widgetScriptSrc}"
  data-agent-key="${currentCompany.apiKey}"
  data-position="${localSettings.position}"
  data-primary-color="${localSettings.primaryColor}"
  defer>
</script>`;

  // React component snippet
  const reactSnippet = `import { AssistantChatWidget } from '@chat-aaas/react-sdk';

export default function App() {
  return (
    <div className="min-h-screen">
      {/* Your App Content */}
      <AssistantChatWidget
        apiKey="${currentCompany.apiKey}"
        primaryColor="${localSettings.primaryColor}"
        position="${localSettings.position}"
        welcomeMessage="${currentCompany.agent.greetingMessage}"
      />
    </div>
  );
}`;

  // Iframe snippet
  const iframeSnippet = `<iframe
  src="https://embed.chat-aaas.com/chat/${currentCompany.slug}?key=${currentCompany.apiKey}"
  width="400"
  height="620"
  frameborder="0"
  allow="microphone"
  style="border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.15);"
></iframe>`;

  // cURL REST API snippet
  const curlSnippet = `curl -X POST https://api.chat-aaas.com/api/v1/chat \\
  -H "Authorization: Bearer ${currentCompany.apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Hello! What is your return policy?",
    "customerId": "usr_9941",
    "customerEmail": "alex@enterprise.com"
  }'`;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Deploy Assistant</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Embed <strong>{currentCompany.agent.name}</strong> on your website via JavaScript widget, React SDK, or REST API.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsQuickTestOpen(true)}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-800 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors border border-slate-200 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-slate-700" />
            <span>Test Assistant</span>
          </button>

          <button
            onClick={() => setIsLiveSandboxOpen(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Live Web Preview</span>
          </button>
        </div>
      </div>

      {/* Embed Code Snippet Card */}
      <div className="bg-slate-950 text-slate-200 rounded-2xl p-6 border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-slate-400" />
            <h3 className="text-base font-bold text-white">Embed Installation Snippet</h3>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'script', label: 'HTML <script>' },
              { id: 'react', label: 'React SDK' },
              { id: 'iframe', label: 'Iframe Embed' },
              { id: 'api', label: 'REST API' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSnippetTab(tab.id as any)}
                className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeSnippetTab === tab.id
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Code View Area */}
        <div className="relative bg-slate-900/90 border border-slate-800 rounded-xl p-4 font-mono text-xs sm:text-sm text-slate-200 overflow-x-auto">
          <button
            onClick={() => {
              const codeMap = {
                script: scriptSnippet,
                react: reactSnippet,
                iframe: iframeSnippet,
                api: curlSnippet
              };
              handleCopy(codeMap[activeSnippetTab], 'snippet');
            }}
            className="absolute top-3 right-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg text-xs font-sans font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
          >
            {copiedKey === 'snippet' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey === 'snippet' ? 'Copied' : 'Copy Code'}</span>
          </button>

          <pre className="pr-24 leading-relaxed font-mono">
            {activeSnippetTab === 'script' && scriptSnippet}
            {activeSnippetTab === 'react' && reactSnippet}
            {activeSnippetTab === 'iframe' && iframeSnippet}
            {activeSnippetTab === 'api' && curlSnippet}
          </pre>
        </div>
      </div>

      {/* Visual Customizer & Live Mini-Preview */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 text-slate-800 rounded-xl border border-slate-200">
              <Paintbrush className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Appearance & Behavior</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Configure theme colors, header subtitle, launcher style, and starter questions.</p>
            </div>
          </div>

          <button
            onClick={handleSaveBranding}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            {isSaved ? <Check className="w-4 h-4 text-emerald-400" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{isSaved ? 'Saved' : 'Save Appearance'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
          {/* Left Form (7 cols) */}
          <div className="lg:col-span-7 space-y-5 text-sm">
            {/* 1. Theme Color & Presets */}
            <div className="space-y-2.5">
              <label className="block font-semibold text-slate-800">Theme Accent Color</label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLOR_PRESETS.map(preset => {
                  const isSelected = localSettings.primaryColor.toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setLocalSettings(prev => ({ ...prev, primaryColor: preset.hex }))}
                      title={preset.name}
                      style={{ backgroundColor: preset.hex }}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                        isSelected ? 'scale-115 ring-2 ring-slate-900 ring-offset-2' : 'hover:scale-105 opacity-90'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="color"
                  value={localSettings.primaryColor}
                  onChange={(e) => setLocalSettings({ ...localSettings, primaryColor: e.target.value })}
                  className="w-9 h-9 rounded-xl border border-slate-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={localSettings.primaryColor}
                  onChange={(e) => setLocalSettings({ ...localSettings, primaryColor: e.target.value })}
                  className="flex-1 max-w-[160px] px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 font-medium"
                />
              </div>
            </div>

            {/* 2. Titles & Subtitle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">Header Title</label>
                <input
                  type="text"
                  value={localSettings.headerTitle}
                  onChange={(e) => setLocalSettings({ ...localSettings, headerTitle: e.target.value })}
                  placeholder="e.g. Acme Support AI"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">Header Subtitle</label>
                <input
                  type="text"
                  value={localSettings.headerSubtitle || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, headerSubtitle: e.target.value })}
                  placeholder="e.g. Typically replies in seconds"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-hidden font-medium"
                />
              </div>
            </div>

            {/* 3. Launcher Button Configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">Launcher Style</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLauncherStyle('pill')}
                    className={`py-2 px-3 rounded-xl border font-semibold text-center transition-colors cursor-pointer text-xs ${
                      launcherStyle === 'pill'
                        ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Pill with Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setLauncherStyle('bubble')}
                    className={`py-2 px-3 rounded-xl border font-semibold text-center transition-colors cursor-pointer text-xs ${
                      launcherStyle === 'bubble'
                        ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Circle Bubble
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">Launcher Text (for Pill)</label>
                <input
                  type="text"
                  disabled={launcherStyle === 'bubble'}
                  value={localSettings.launcherText}
                  onChange={(e) => setLocalSettings({ ...localSettings, launcherText: e.target.value })}
                  placeholder="e.g. Chat with Us"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-hidden font-medium disabled:opacity-50"
                />
              </div>
            </div>

            {/* 4. Screen Position */}
            <div>
              <label className="block font-semibold text-slate-800 mb-1.5">Screen Position</label>
              <div className="grid grid-cols-2 gap-2.5 max-w-xs">
                {[
                  { id: 'bottom_right', label: 'Bottom Right' },
                  { id: 'bottom_left', label: 'Bottom Left' }
                ].map(pos => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => setLocalSettings({ ...localSettings, position: pos.id as any })}
                    className={`py-2 px-3 rounded-xl border font-semibold text-center transition-colors cursor-pointer text-sm ${
                      localSettings.position === pos.id
                        ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Starter Question Chips Manager */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block font-semibold text-slate-800">
                  Starter Question Chips <span className="text-xs font-normal text-slate-500">(1-click prompt chips)</span>
                </label>
                <span className="text-xs text-slate-400 font-mono">{starterQuestions.length}/4</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {starterQuestions.map((q, idx) => (
                  <span 
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 text-slate-800 rounded-lg text-xs font-medium"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                    <span>{q}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveStarterQuestion(idx)}
                      className="text-slate-400 hover:text-rose-600 transition-colors ml-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              {starterQuestions.length < 4 && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newQuestionInput}
                    onChange={(e) => setNewQuestionInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddStarterQuestion(); } }}
                    placeholder="Type a starter question and click Add..."
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAddStarterQuestion}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Chip</span>
                  </button>
                </div>
              )}
            </div>

            {/* 6. Toggles */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.enableSound}
                  onChange={(e) => setLocalSettings({ ...localSettings, enableSound: e.target.checked })}
                  className="rounded text-slate-900 w-4 h-4 cursor-pointer"
                />
                <span className="font-semibold text-slate-800 text-sm">Play subtle notification audio on message</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.showPoweredBy}
                  onChange={(e) => setLocalSettings({ ...localSettings, showPoweredBy: e.target.checked })}
                  className="rounded text-slate-900 w-4 h-4 cursor-pointer"
                />
                <span className="font-semibold text-slate-800 text-sm">Display "Powered by Chat-AaaS" badge</span>
              </label>
            </div>
          </div>

          {/* Right Live Visual Mockup (5 cols) */}
          <div className="lg:col-span-5 bg-slate-50/70 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500">Live Simulation Preview</span>
                <button
                  type="button"
                  onClick={handleResetPreview}
                  className="text-[11px] text-slate-500 hover:text-slate-800 font-medium underline cursor-pointer"
                >
                  Reset Chat
                </button>
              </div>
              
              {/* Mini Widget Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden max-w-xs mx-auto">
                <div 
                  className="p-3 text-white flex items-center justify-between"
                  style={{ backgroundColor: localSettings.primaryColor }}
                >
                  <div className="min-w-0 pr-2">
                    <h5 className="font-bold text-sm truncate">{localSettings.headerTitle || currentCompany.name}</h5>
                    <p className="text-[11px] opacity-90 truncate">{localSettings.headerSubtitle || 'Active & Answering'}</p>
                  </div>
                  <span className="text-sm opacity-80 cursor-pointer shrink-0">✕</span>
                </div>

                <div className="p-3 space-y-2 bg-slate-50 min-h-[160px] max-h-[220px] overflow-y-auto text-xs">
                  {previewChat.map((msg, mIdx) => (
                    <div 
                      key={mIdx}
                      style={{
                        backgroundColor: msg.sender === 'user' ? localSettings.primaryColor : '#ffffff',
                        color: msg.sender === 'user' ? '#ffffff' : '#0f172a'
                      }}
                      className={`p-2.5 rounded-xl border max-w-[85%] font-medium leading-relaxed ${
                        msg.sender === 'user' ? 'ml-auto border-transparent shadow-xs' : 'border-slate-200 text-slate-800 shadow-2xs'
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}

                  {/* Clickable Starter Question Chips in Preview */}
                  {starterQuestions.length > 0 && (
                    <div className="pt-2 space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Suggested Questions:</p>
                      <div className="flex flex-col gap-1.5">
                        {starterQuestions.map((q, qIdx) => (
                          <button
                            key={qIdx}
                            type="button"
                            onClick={() => handlePreviewStarterClick(q)}
                            className="text-left px-2.5 py-1.5 bg-white hover:bg-slate-100/90 border border-slate-200 rounded-lg text-[11px] text-slate-700 font-medium transition-colors cursor-pointer shadow-2xs"
                          >
                            💬 {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 font-medium">
                    Type a message...
                  </div>
                  <div 
                    className="px-3 py-1.5 rounded-lg text-white font-semibold text-xs"
                    style={{ backgroundColor: localSettings.primaryColor }}
                  >
                    Send
                  </div>
                </div>
              </div>
            </div>

            {/* Mini Floating Button Preview */}
            <div className="mt-4 pt-3.5 border-t border-slate-200/80 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">Launcher Preview:</span>
              {launcherStyle === 'pill' ? (
                <div 
                  className="px-4 py-2 rounded-full text-white text-xs font-bold flex items-center gap-2 shadow-sm"
                  style={{ backgroundColor: localSettings.primaryColor }}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{localSettings.launcherText || 'Chat with Us'}</span>
                </div>
              ) : (
                <div 
                  className="w-10 h-10 rounded-full text-white flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: localSettings.primaryColor }}
                >
                  <MessageCircle className="w-5 h-5" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
