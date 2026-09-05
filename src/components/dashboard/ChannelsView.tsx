import React, { useState } from 'react';
import { 
  Globe, 
  MessageSquare, 
  Mail, 
  Smartphone, 
  Code2, 
  Copy, 
  Check, 
  ExternalLink, 
  Paintbrush, 
  CheckCircle2, 
  ChevronRight,
  ShieldCheck,
  Zap,
  Sliders
} from 'lucide-react';
import { useApp } from '../../context';
import { WidgetCustomization } from '../../types';

export const ChannelsView: React.FC = () => {
  const { 
    currentCompany, 
    updateWidgetSettings, 
    setIsLiveSandboxOpen,
    setIsQuickTestOpen
  } = useApp();

  const [activeChannel, setActiveChannel] = useState<'website' | 'whatsapp' | 'email' | 'mobile' | 'api'>('website');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [localSettings, setLocalSettings] = useState<WidgetCustomization>({ ...currentCompany.widgetSettings });
  const [isSaved, setIsSaved] = useState(false);
  const [activeSnippetTab, setActiveSnippetTab] = useState<'script' | 'react' | 'iframe' | 'api'>('script');

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

  const scriptSnippet = `<!-- Agent-as-a-Service (AaaS) Widget for ${currentCompany.name} -->
<script
  src="https://cdn.agentflow.ai/widget.js"
  data-agent-key="${currentCompany.apiKey}"
  data-position="${localSettings.position}"
  data-primary-color="${localSettings.primaryColor}"
  defer>
</script>`;

  const reactSnippet = `import { AgentChatWidget } from '@aaas/react';

export default function App() {
  return (
    <AgentChatWidget
      apiKey="${currentCompany.apiKey}"
      primaryColor="${localSettings.primaryColor}"
      position="${localSettings.position}"
      welcomeMessage="${currentCompany.agent.greetingMessage}"
    />
  );
}`;

  const curlSnippet = `curl -X POST https://api.agentflow.ai/api/v1/chat \\
  -H "Authorization: Bearer ${currentCompany.apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Hello! What is your pricing and SLA?",
    "customer_id": "cust_1092"
  }'`;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Deployment Channels</h1>
          <p className="text-xs text-slate-500 mt-1">
            Deploy your AI Employee <strong>{currentCompany.agent.name}</strong> across website, mobile, WhatsApp, email, and APIs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsLiveSandboxOpen(true)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Test on Website</span>
          </button>
        </div>
      </div>

      {/* Channel Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { id: 'website', label: 'Website Widget', icon: Globe, status: 'Live & Active', active: true },
          { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, status: 'Connected', active: false },
          { id: 'email', label: 'Email Support', icon: Mail, status: 'Available', active: false },
          { id: 'mobile', label: 'Mobile SDK', icon: Smartphone, status: 'Ready', active: false },
          { id: 'api', label: 'REST API', icon: Code2, status: 'Live Endpoint', active: true }
        ].map(ch => {
          const Icon = ch.icon;
          const isSelected = activeChannel === ch.id;
          return (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch.id as any)}
              className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                isSelected 
                  ? 'bg-white border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm' 
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-xl ${isSelected ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-600'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`w-2 h-2 rounded-full ${ch.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              </div>
              <div className="mt-3">
                <h3 className="text-xs font-bold text-slate-900">{ch.label}</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">{ch.status}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Channel Details */}
      {activeChannel === 'website' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Installation Snippet */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">1-Click Website Installation</h3>
                  <p className="text-xs text-slate-500">Copy and paste this script right before the closing &lt;/body&gt; tag on your website.</p>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {(['script', 'react', 'api'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveSnippetTab(tab)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all capitalize ${
                        activeSnippetTab === tab ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {tab === 'script' ? 'HTML / Web' : tab === 'react' ? 'React / Next.js' : 'cURL API'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Box */}
              <div className="relative bg-slate-950 rounded-xl p-4 font-mono text-xs text-slate-200 overflow-x-auto border border-slate-800">
                <button
                  onClick={() => handleCopy(
                    activeSnippetTab === 'script' ? scriptSnippet : activeSnippetTab === 'react' ? reactSnippet : curlSnippet,
                    'embedCode'
                  )}
                  className="absolute right-3 top-3 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs flex items-center gap-1 transition-colors"
                >
                  {copiedKey === 'embedCode' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'embedCode' ? 'Copied' : 'Copy'}</span>
                </button>
                <pre className="pr-16 text-slate-300">
                  {activeSnippetTab === 'script' ? scriptSnippet : activeSnippetTab === 'react' ? reactSnippet : curlSnippet}
                </pre>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Zero configuration required. All company knowledge, business rules, and actions are automatically synced from your dashboard.</span>
              </div>
            </div>

            {/* Customization Settings */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Paintbrush className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">Widget Appearance & Position</h3>
                </div>
                <button
                  onClick={handleSaveBranding}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  {isSaved ? <Check className="w-3.5 h-3.5 text-white" /> : <Sliders className="w-3.5 h-3.5" />}
                  <span>{isSaved ? 'Saved!' : 'Save Appearance'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Launcher Button Text</label>
                  <input
                    type="text"
                    value={localSettings.launcherText}
                    onChange={(e) => setLocalSettings({ ...localSettings, launcherText: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Header Title</label>
                  <input
                    type="text"
                    value={localSettings.headerTitle}
                    onChange={(e) => setLocalSettings({ ...localSettings, headerTitle: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Primary Brand Color</label>
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
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Screen Position</label>
                  <select
                    value={localSettings.position}
                    onChange={(e) => setLocalSettings({ ...localSettings, position: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="bottom_right">Bottom Right</option>
                    <option value="bottom_left">Bottom Left</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: Live Interactive Widget Preview */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl p-6 text-white border border-slate-800 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300">Live Preview</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  ? Ready
                </span>
              </div>

              {/* Simulated Floating Chat Window */}
              <div className="mt-4 bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 max-w-sm mx-auto">
                <div 
                  className="p-4 text-white flex items-center justify-between"
                  style={{ backgroundColor: localSettings.primaryColor }}
                >
                  <div className="flex items-center gap-2.5">
                    <img 
                      src={currentCompany.agent.avatarUrl} 
                      alt={currentCompany.agent.name} 
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-white/30" 
                    />
                    <div>
                      <h4 className="text-xs font-bold leading-tight">{localSettings.headerTitle}</h4>
                      <p className="text-[10px] text-white/80">{localSettings.headerSubtitle}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3 h-48 bg-slate-50 flex flex-col justify-end text-xs">
                  <div className="flex items-start gap-2">
                    <img 
                      src={currentCompany.agent.avatarUrl} 
                      alt={currentCompany.agent.name} 
                      className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5" 
                    />
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-3 text-slate-800 shadow-2xs max-w-[85%] text-[11px] leading-relaxed">
                      {currentCompany.agent.greetingMessage}
                    </div>
                  </div>
                </div>

                <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
                  <input
                    type="text"
                    disabled
                    placeholder="Type a message..."
                    className="flex-1 text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-slate-400"
                  />
                  <div 
                    className="w-7 h-7 rounded-xl flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: localSettings.primaryColor }}
                  >
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsLiveSandboxOpen(true)}
              className="w-full mt-4 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Full Screen Store Sandbox</span>
            </button>
          </div>
        </div>
      )}

      {/* WhatsApp / Email / Mobile / API Placeholders */}
      {activeChannel !== 'website' && (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xs text-center space-y-4 max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            {activeChannel === 'whatsapp' ? <MessageSquare className="w-6 h-6" /> : activeChannel === 'email' ? <Mail className="w-6 h-6" /> : activeChannel === 'mobile' ? <Smartphone className="w-6 h-6" /> : <Code2 className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 capitalize">{activeChannel} Channel Setup</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Your AI Employee ({currentCompany.agent.name}) uses the same unified knowledge base and business actions across all channels.
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left font-mono text-xs text-slate-700">
            <span className="text-slate-400 block mb-1">REST API / Webhook Endpoint:</span>
            https://api.agentflow.ai/api/v1/channels/{activeChannel}/webhook
          </div>
        </div>
      )}
    </div>
  );
};
