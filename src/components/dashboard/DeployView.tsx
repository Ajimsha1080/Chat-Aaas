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
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">Deploy Assistant</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Embed <strong>{currentCompany.agent.name}</strong> on your website via JavaScript widget, React SDK, or REST API.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsQuickTestOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200/70 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-200/60"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-500" />
            <span>Test Assistant</span>
          </button>

          <button
            onClick={() => setIsLiveSandboxOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Live Web Preview</span>
          </button>
        </div>
      </div>

      {/* Embed Code Snippet Card */}
      <div className="bg-slate-950 text-slate-200 rounded-xl p-5 border border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-semibold text-white">Embed Installation Snippet</h3>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            {[
              { id: 'script', label: 'HTML <script>' },
              { id: 'react', label: 'React SDK' },
              { id: 'iframe', label: 'Iframe Embed' },
              { id: 'api', label: 'REST API' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSnippetTab(tab.id as any)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeSnippetTab === tab.id
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Code View Area */}
        <div className="relative bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 font-mono text-xs text-slate-300 overflow-x-auto">
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
            className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-sans font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            {copiedKey === 'snippet' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedKey === 'snippet' ? 'Copied' : 'Copy'}</span>
          </button>

          <pre className="pr-20 leading-relaxed font-mono">
            {activeSnippetTab === 'script' && scriptSnippet}
            {activeSnippetTab === 'react' && reactSnippet}
            {activeSnippetTab === 'iframe' && iframeSnippet}
            {activeSnippetTab === 'api' && curlSnippet}
          </pre>
        </div>
      </div>

      {/* Visual Customizer & Live Mini-Preview */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg border border-slate-200/60">
              <Paintbrush className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-900">Appearance & Behavior</h3>
              <p className="text-[11px] text-slate-400">Configure how the chat widget displays on your website.</p>
            </div>
          </div>

          <button
            onClick={handleSaveBranding}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            {isSaved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>{isSaved ? 'Saved' : 'Save Appearance'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form (7 cols) */}
          <div className="lg:col-span-7 space-y-4 text-xs">
            {/* Colors & Position */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Theme Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={localSettings.primaryColor}
                    onChange={(e) => setLocalSettings({ ...localSettings, primaryColor: e.target.value })}
                    className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={localSettings.primaryColor}
                    onChange={(e) => setLocalSettings({ ...localSettings, primaryColor: e.target.value })}
                    className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Screen Position</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'bottom_right', label: 'Bottom Right' },
                    { id: 'bottom_left', label: 'Bottom Left' }
                  ].map(pos => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => setLocalSettings({ ...localSettings, position: pos.id as any })}
                      className={`py-1.5 px-2.5 rounded-lg border font-medium text-center transition-colors cursor-pointer text-xs ${
                        localSettings.position === pos.id
                          ? 'border-slate-900 bg-slate-900 text-white'
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Header Title</label>
                <input
                  type="text"
                  value={localSettings.headerTitle}
                  onChange={(e) => setLocalSettings({ ...localSettings, headerTitle: e.target.value })}
                  placeholder="e.g. Acme Support AI"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Launcher Button Text</label>
                <input
                  type="text"
                  value={localSettings.launcherText}
                  onChange={(e) => setLocalSettings({ ...localSettings, launcherText: e.target.value })}
                  placeholder="e.g. Chat with Us"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.enableSound}
                  onChange={(e) => setLocalSettings({ ...localSettings, enableSound: e.target.checked })}
                  className="rounded text-slate-900 w-3.5 h-3.5 cursor-pointer"
                />
                <span className="font-medium text-slate-700">Play subtle notification audio on message</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.showPoweredBy}
                  onChange={(e) => setLocalSettings({ ...localSettings, showPoweredBy: e.target.checked })}
                  className="rounded text-slate-900 w-3.5 h-3.5 cursor-pointer"
                />
                <span className="font-medium text-slate-700">Display "Powered by Chat-AaaS" badge</span>
              </label>
            </div>
          </div>

          {/* Right Live Visual Mockup (5 cols) */}
          <div className="lg:col-span-5 bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
            <div>
              <span className="text-[10px] font-medium font-mono uppercase tracking-wider text-slate-400 block mb-2.5">Preview</span>
              
              {/* Mini Widget Card */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden max-w-xs mx-auto">
                <div 
                  className="p-2.5 text-white flex items-center justify-between"
                  style={{ backgroundColor: localSettings.primaryColor }}
                >
                  <div>
                    <h5 className="font-medium text-xs">{localSettings.headerTitle || currentCompany.name}</h5>
                    <p className="text-[10px] opacity-80">● Active</p>
                  </div>
                  <span className="text-xs opacity-75">✕</span>
                </div>

                <div className="p-2.5 space-y-2 bg-slate-50 min-h-[110px] text-[11px]">
                  <div className="bg-white p-2 rounded border border-slate-200 text-slate-700 max-w-[85%] shadow-2xs">
                    Hello! How can I help you today?
                  </div>
                  <div 
                    className="p-2 rounded text-white max-w-[85%] ml-auto"
                    style={{ backgroundColor: localSettings.primaryColor }}
                  >
                    What is your return policy?
                  </div>
                </div>

                <div className="p-2 bg-white border-t border-slate-100 flex items-center gap-1.5">
                  <div className="flex-1 bg-slate-100 rounded px-2 py-1 text-[10px] text-slate-400">
                    Type a message...
                  </div>
                  <div 
                    className="px-2 py-1 rounded text-white font-medium text-[10px]"
                    style={{ backgroundColor: localSettings.primaryColor }}
                  >
                    Send
                  </div>
                </div>
              </div>
            </div>

            {/* Mini Floating Button Preview */}
            <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Launcher:</span>
              <div 
                className="px-3 py-1.5 rounded-full text-white text-xs font-medium flex items-center gap-1.5 shadow-xs"
                style={{ backgroundColor: localSettings.primaryColor }}
              >
                <span>{localSettings.launcherText || 'Chat with Us'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clean Developer & API Settings Link at Bottom */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200/60">
            <Key className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="font-medium text-slate-800">REST API Key & Access Tokens</p>
            <p className="text-slate-400 text-[11px]">Authorize programmatic chat requests and webhook events.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono bg-slate-100 px-2 py-1 rounded border border-slate-200 text-slate-600">
            {currentCompany.apiKey.slice(0, 14)}...
          </span>
          <button
            onClick={() => handleCopy(currentCompany.apiKey, 'apiKey')}
            className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-md font-medium transition-colors flex items-center gap-1 cursor-pointer"
          >
            {copiedKey === 'apiKey' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span>{copiedKey === 'apiKey' ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
