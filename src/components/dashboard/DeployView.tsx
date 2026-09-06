import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  Sparkles, 
  ExternalLink, 
  Key, 
  RefreshCw, 
  Paintbrush, 
  Terminal, 
  CheckCircle2 
} from 'lucide-react';
import { useApp } from '../../context';
import { WidgetCustomization } from '../../types';

export const DeployView: React.FC = () => {
  const { 
    currentCompany, 
    updateWidgetSettings, 
    regenerateApiKey, 
    setIsLiveSandboxOpen,
    setIsQuickTestOpen
  } = useApp();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeSnippetTab, setActiveSnippetTab] = useState<'script' | 'react' | 'iframe' | 'api'>('script');
  const [localSettings, setLocalSettings] = useState<WidgetCustomization>({ ...currentCompany.widgetSettings });
  const [isSaved, setIsSaved] = useState(false);

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
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Deploy your Assistant</h1>
          <p className="text-xs text-slate-500 mt-1">
            Choose where customers will interact with <strong>{currentCompany.agent.name}</strong>: Website widget, WhatsApp, or custom API.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsQuickTestOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Test Agent First</span>
          </button>

          <button
            onClick={() => setIsLiveSandboxOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Live Website Preview</span>
          </button>
        </div>
      </div>

      {/* Embed Code Snippet Card */}
      <div className="bg-slate-950 text-slate-200 rounded-2xl p-6 border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Embed Installation Code</h3>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'script', label: 'HTML <script>' },
              { id: 'react', label: 'React SDK' },
              { id: 'iframe', label: 'Iframe Embed' },
              { id: 'api', label: 'REST API' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSnippetTab(tab.id as any)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  activeSnippetTab === tab.id
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Code View Area */}
        <div className="relative bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs text-indigo-200 overflow-x-auto">
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
            className="absolute top-3 right-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-sans font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            {copiedKey === 'snippet' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey === 'snippet' ? 'Copied to Clipboard!' : 'Copy Code'}</span>
          </button>

          <pre className="pr-24 leading-relaxed">
            {activeSnippetTab === 'script' && scriptSnippet}
            {activeSnippetTab === 'react' && reactSnippet}
            {activeSnippetTab === 'iframe' && iframeSnippet}
            {activeSnippetTab === 'api' && curlSnippet}
          </pre>
        </div>
      </div>

      {/* Visual Customizer & Live Mini-Preview */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Paintbrush className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Branding & Widget Customizer</h3>
              <p className="text-xs text-slate-500">Personalize how the floating chat widget looks and behaves on your website.</p>
            </div>
          </div>

          <button
            onClick={handleSaveBranding}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            {isSaved ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>{isSaved ? 'Branding Saved!' : 'Save Appearance'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Form (7 cols) */}
          <div className="lg:col-span-7 space-y-5 text-xs">
            {/* Colors & Position */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Primary Theme Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={localSettings.primaryColor}
                    onChange={(e) => setLocalSettings({ ...localSettings, primaryColor: e.target.value })}
                    className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={localSettings.primaryColor}
                    onChange={(e) => setLocalSettings({ ...localSettings, primaryColor: e.target.value })}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Widget Screen Position</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'bottom_right', label: 'Bottom Right' },
                    { id: 'bottom_left', label: 'Bottom Left' }
                  ].map(pos => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => setLocalSettings({ ...localSettings, position: pos.id as any })}
                      className={`py-2 px-3 rounded-xl border font-semibold text-center transition-all cursor-pointer ${
                        localSettings.position === pos.id
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-600'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Titles & Launcher Text */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Header Title</label>
                <input
                  type="text"
                  value={localSettings.headerTitle}
                  onChange={(e) => setLocalSettings({ ...localSettings, headerTitle: e.target.value })}
                  placeholder="e.g. UrbanCraft Concierge"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Floating Button Label</label>
                <input
                  type="text"
                  value={localSettings.launcherText}
                  onChange={(e) => setLocalSettings({ ...localSettings, launcherText: e.target.value })}
                  placeholder="e.g. Chat with Us"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.enableSound}
                  onChange={(e) => setLocalSettings({ ...localSettings, enableSound: e.target.checked })}
                  className="rounded text-indigo-600 w-4 h-4 cursor-pointer"
                />
                <span className="font-semibold text-slate-700">Play subtle chime audio on new message</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.showPoweredBy}
                  onChange={(e) => setLocalSettings({ ...localSettings, showPoweredBy: e.target.checked })}
                  className="rounded text-indigo-600 w-4 h-4 cursor-pointer"
                />
                <span className="font-semibold text-slate-700">Display "Powered by Chat-AaaS" badge</span>
              </label>
            </div>
          </div>

          {/* Right Live Visual Mockup (5 cols) */}
          <div className="lg:col-span-5 bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-3">Live Appearance Preview</span>
              
              {/* Mini Widget Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden max-w-xs mx-auto">
                <div 
                  className="p-3 text-white flex items-center justify-between"
                  style={{ backgroundColor: localSettings.primaryColor }}
                >
                  <div>
                    <h5 className="font-bold text-xs">{localSettings.headerTitle || currentCompany.name}</h5>
                    <p className="text-[10px] opacity-80">● Ready to answer questions</p>
                  </div>
                  <span className="text-xs opacity-75">✕</span>
                </div>

                <div className="p-3 space-y-2 bg-slate-50 min-h-[120px] text-[11px]">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-slate-700 max-w-[85%] shadow-2xs">
                    Hi there! 👋 How can I help you today?
                  </div>
                  <div 
                    className="p-2.5 rounded-xl text-white max-w-[85%] ml-auto"
                    style={{ backgroundColor: localSettings.primaryColor }}
                  >
                    What is your warranty policy?
                  </div>
                </div>

                <div className="p-2 bg-white border-t border-slate-100 flex items-center gap-1.5">
                  <div className="flex-1 bg-slate-100 rounded-lg px-2.5 py-1 text-[10px] text-slate-400">
                    Ask a question...
                  </div>
                  <div 
                    className="px-2.5 py-1 rounded-lg text-white font-bold text-[10px]"
                    style={{ backgroundColor: localSettings.primaryColor }}
                  >
                    Send
                  </div>
                </div>
              </div>
            </div>

            {/* Mini Floating Button Preview */}
            <div className="mt-4 pt-4 border-t border-slate-200/60 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">Floating Button Preview:</span>
              <div 
                className="px-3 py-1.5 rounded-full text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                style={{ backgroundColor: localSettings.primaryColor }}
              >
                <span>💬</span>
                <span>{localSettings.launcherText || 'Chat with Us'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clean Developer & API Settings Link at Bottom */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-slate-200 text-slate-700 rounded-lg">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-slate-800">Need Backend REST API Keys, Webhooks, or Secret Tokens?</p>
            <p className="text-slate-500 text-[11px]">Manage private keys, rotated tokens, and webhook dispatch in developer settings.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono bg-white px-2 py-1 rounded-md border border-slate-200 text-slate-600">
            {currentCompany.apiKey.slice(0, 14)}...
          </span>
          <button
            onClick={() => handleCopy(currentCompany.apiKey, 'apiKey')}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-semibold transition-colors flex items-center gap-1 cursor-pointer"
          >
            {copiedKey === 'apiKey' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey === 'apiKey' ? 'Copied' : 'Copy Key'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
