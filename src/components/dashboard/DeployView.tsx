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

  // Embed script snippet
  const scriptSnippet = `<!-- Agent-as-a-Service (AaaS) Widget for ${currentCompany.name} -->
<script
  src="https://cdn.agent-as-a-service.io/v1/widget.js"
  data-agent-key="${currentCompany.apiKey}"
  data-position="${localSettings.position}"
  data-primary-color="${localSettings.primaryColor}"
  defer>
</script>`;

  // React component snippet
  const reactSnippet = `import { AgentChatWidget } from '@aaas/react-sdk';

export default function App() {
  return (
    <div className="min-h-screen">
      {/* Your App Content */}
      <AgentChatWidget
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
  src="https://embed.agent-as-a-service.io/chat/${currentCompany.slug}?key=${currentCompany.apiKey}"
  width="400"
  height="620"
  frameborder="0"
  allow="microphone"
  style="border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.15);"
></iframe>`;

  // cURL REST API snippet
  const curlSnippet = `curl -X POST https://api.agent-as-a-service.io/v1/agent/chat \\
  -H "Authorization: Bearer ${currentCompany.apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Hello! What is your SLA policy?",
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

      {/* Grid: Visual Customizer & API Keys */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Widget Appearance & Positioning Customizer */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Paintbrush className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Branding & Chatbot Customizer</h3>
            </div>
            <button
              onClick={handleSaveBranding}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              {isSaved ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{isSaved ? 'Branding Saved' : 'Save Appearance'}</span>
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* Colors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Primary Theme Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={localSettings.primaryColor}
                    onChange={(e) => setLocalSettings({ ...localSettings, primaryColor: e.target.value })}
                    className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={localSettings.primaryColor}
                    onChange={(e) => setLocalSettings({ ...localSettings, primaryColor: e.target.value })}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Widget Position</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'bottom_right', label: 'Bottom Right' },
                    { id: 'bottom_left', label: 'Bottom Left' }
                  ].map(pos => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => setLocalSettings({ ...localSettings, position: pos.id as any })}
                      className={`p-2 rounded-lg border font-semibold text-center transition-all ${
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
                <label className="block font-bold text-slate-700 mb-1">Header Title</label>
                <input
                  type="text"
                  value={localSettings.headerTitle}
                  onChange={(e) => setLocalSettings({ ...localSettings, headerTitle: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Launcher Button Label</label>
                <input
                  type="text"
                  value={localSettings.launcherText}
                  onChange={(e) => setLocalSettings({ ...localSettings, launcherText: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Mobile Behavior & Toggles */}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sound-check"
                  checked={localSettings.enableSound}
                  onChange={(e) => setLocalSettings({ ...localSettings, enableSound: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="sound-check" className="font-semibold text-slate-700">Enable chime audio on message</label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="powered-check"
                  checked={localSettings.showPoweredBy}
                  onChange={(e) => setLocalSettings({ ...localSettings, showPoweredBy: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="powered-check" className="font-semibold text-slate-700">Display "Powered by Agent-as-a-Service"</label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: API Keys & Credentials */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">API Credentials</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Authenticate mobile apps and backend server endpoints with your single AI agent.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Publishable Client API Key</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={currentCompany.apiKey}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] text-slate-800"
                  />
                  <button
                    onClick={() => handleCopy(currentCompany.apiKey, 'apiKey')}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors shrink-0"
                    title="Copy API Key"
                  >
                    {copiedKey === 'apiKey' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Secret Key (Encrypted)</label>
                <input
                  type="text"
                  readOnly
                  value={currentCompany.apiSecretMasked}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] text-slate-400"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Webhook Dispatch URL</label>
                <input
                  type="text"
                  readOnly
                  value={currentCompany.webhookUrl || 'Not configured'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] text-slate-700"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={regenerateApiKey}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Rotate / Regenerate API Key</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
