import React, { useState, useRef, useEffect } from 'react';
import { 
  Copy, 
  Check, 
  Sparkles, 
  Terminal, 
  CheckCircle2,
  Plus,
  Trash2,
  HelpCircle,
  Bot,
  Headphones,
  Zap,
  Upload,
  Info,
  Pencil,
  Send,
  X,
  ChevronDown
} from 'lucide-react';
import { useApp } from '../../context';
import { WidgetCustomization } from '../../types';
import { soundService } from '../../services/soundService';

export const DeployView: React.FC = () => {
  const { 
    currentCompany, 
    updateCompany,
    updateWidgetSettings, 
    updateAgentConfig,
    setIsQuickTestOpen
  } = useApp();

  const [brandName, setBrandName] = useState(currentCompany.name || '');
  const [greetingMessage, setGreetingMessage] = useState(currentCompany.agent.greetingMessage || 'Hello! How can I assist you today?');
  const [fallbackMessage, setFallbackMessage] = useState(currentCompany.agent.fallbackMessage || 'I do not have specific verified information regarding that in our official documentation. Would you like me to transfer this session to our 24/7 support team?');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const brandLogoInputRef = useRef<HTMLInputElement>(null);
  const iconPickerRef = useRef<HTMLDivElement>(null);

  const [activeMainTab, setActiveMainTab] = useState<'general' | 'content' | 'appearance' | 'install'>('appearance');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeSnippetTab, setActiveSnippetTab] = useState<'script' | 'react' | 'iframe' | 'api'>('script');
  const [localSettings, setLocalSettings] = useState<WidgetCustomization>({ 
    themeMode: 'dark',
    headerTextColor: 'white',
    backgroundAnimation: true,
    bottomPadding: 20,
    sidePadding: 20,
    ...currentCompany.widgetSettings 
  });
  const [isSaved, setIsSaved] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (iconPickerRef.current && !iconPickerRef.current.contains(event.target as Node)) {
        setIsIconPickerOpen(false);
      }
    };
    if (isIconPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isIconPickerOpen]);

  const COLOR_PRESETS = [
    { name: 'Teal', hex: '#007074' },
    { name: 'Royal Blue', hex: '#4f46e5' },
    { name: 'Indigo', hex: '#4338ca' },
    { name: 'Violet', hex: '#7c3aed' },
    { name: 'Emerald', hex: '#059669' },
    { name: 'Sky Blue', hex: '#0284c7' },
    { name: 'Rose', hex: '#e11d48' },
    { name: 'Obsidian', hex: '#0f172a' }
  ];

  const [launcherStyle, setLauncherStyle] = useState<'teardrop' | 'bubble' | 'squircle' | 'pill'>((currentCompany.widgetSettings?.launcherShape as any) || 'teardrop');
  const [starterQuestions, setStarterQuestions] = useState<string[]>(() => 
    currentCompany.widgetSettings?.starterQuestions || [
      'What are your pricing plans?',
      'How do I get started?',
      'Talk to human support'
    ]
  );
  const [newQuestionInput, setNewQuestionInput] = useState('');
  const [previewChat, setPreviewChat] = useState<{ sender: 'agent' | 'user'; text: string }[]>([
    { sender: 'agent', text: currentCompany.agent.greetingMessage || 'Hello! How can I assist you today?' }
  ]);

  const [prevCompanyId, setPrevCompanyId] = useState(currentCompany.id);
  if (prevCompanyId !== currentCompany.id) {
    setPrevCompanyId(currentCompany.id);
    setBrandName(currentCompany.name || '');
    setLocalSettings({
      themeMode: 'dark',
      headerTextColor: 'white',
      backgroundAnimation: true,
      bottomPadding: 20,
      sidePadding: 20,
      ...currentCompany.widgetSettings
    });
    setGreetingMessage(currentCompany.agent.greetingMessage || 'Hello! How can I assist you today?');
    setFallbackMessage(currentCompany.agent.fallbackMessage || 'I do not have specific verified information regarding that in our official documentation. Would you like me to transfer this session to our 24/7 support team?');
    if (currentCompany.widgetSettings?.starterQuestions) {
      setStarterQuestions(currentCompany.widgetSettings.starterQuestions);
    }
    setPreviewChat([
      { sender: 'agent', text: currentCompany.agent.greetingMessage || 'Hello! How can I assist you today?' }
    ]);
  }

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Icon file size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setLocalSettings(prev => ({ 
          ...prev, 
          launcherIcon: 'logo',
          launcherLogoUrl: result 
        }));
        updateWidgetSettings({ launcherIcon: 'logo', launcherLogoUrl: result });
        setIsIconPickerOpen(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleBrandLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Logo file size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setLocalSettings(prev => ({ 
          ...prev, 
          botAvatar: result,
          launcherLogoUrl: result
        }));
        updateWidgetSettings({ botAvatar: result, launcherLogoUrl: result });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddStarterQuestion = () => {
    if (!newQuestionInput.trim() || starterQuestions.length >= 4) return;
    const updated = [...starterQuestions, newQuestionInput.trim()];
    setStarterQuestions(updated);
    setLocalSettings(prev => ({ ...prev, starterQuestions: updated }));
    setNewQuestionInput('');
  };

  const handleRemoveStarterQuestion = (idx: number) => {
    const updated = starterQuestions.filter((_, i) => i !== idx);
    setStarterQuestions(updated);
    setLocalSettings(prev => ({ ...prev, starterQuestions: updated }));
  };

  const handlePreviewStarterClick = (question: string) => {
    setPreviewChat(prev => [
      ...prev,
      { sender: 'user', text: question },
      { sender: 'agent', text: `Here is information regarding "${question}" based on ${brandName || currentCompany.name}'s verified knowledge base.` }
    ]);
    if (localSettings.enableSound) {
      setTimeout(() => {
        soundService.playMessageSound();
      }, 150);
    }
  };

  const handleResetPreview = () => {
    setPreviewChat([
      { sender: 'agent', text: currentCompany.agent.greetingMessage || 'Hello! How can I assist you today?' }
    ]);
  };

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSaveBranding = () => {
    if (brandName.trim()) {
      updateCompany({ name: brandName.trim() });
    }
    updateWidgetSettings({ ...localSettings, starterQuestions });
    updateAgentConfig({ greetingMessage, fallbackMessage });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const companyLogoUrl = localSettings.launcherLogoUrl || localSettings.botAvatar || currentCompany.widgetSettings?.launcherLogoUrl || currentCompany.agent.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80';

// Custom Solid Icons matching exact UI design
const ChatDotsIcon: React.FC<{ className?: string }> = ({ className = "w-4.5 h-4.5" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C6.477 2 2 6.03 2 11c0 2.68 1.31 5.09 3.4 6.69-.17 1.25-.8 2.82-1.92 3.86-.23.21-.11.6.2.62 2.37.13 4.67-.93 6.07-1.92.73.16 1.48.25 2.25.25 5.523 0 10-4.03 10-9s-4.477-9-10-9zm-4.5 10a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4.5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4.5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
  </svg>
);

const ChatLinesIcon: React.FC<{ className?: string }> = ({ className = "w-4.5 h-4.5" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8.414l-4.707 4.707A1 1 0 0 1 2 22V5a2 2 0 0 1 2-2zm3 5a1 1 0 0 0 0 2h10a1 1 0 1 0 0-2H7zm0 4a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2H7z" />
  </svg>
);

const HelpFilledIcon: React.FC<{ className?: string }> = ({ className = "w-4.5 h-4.5" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.88 15.75h-1.75v-1.75h1.75v1.75zm1.5-6.22l-.79.81c-.63.64-1.02 1.16-1.02 2.41h-1.5v-.5c0-.83.34-1.58.88-2.12l.93-.94c.28-.28.45-.66.45-1.09 0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5H8.38c0-1.99 1.62-3.62 3.62-3.62s3.62 1.62 3.62 3.62c0 .78-.31 1.49-.84 1.98z" />
  </svg>
);

const ChatDoubleIcon: React.FC<{ className?: string }> = ({ className = "w-4.5 h-4.5" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17 3H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h1v3.5a.5.5 0 0 0 .854.354L10.707 16H17a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" />
    <path d="M13 18h2.293l3.853 3.854A.5.5 0 0 0 20 21.5V18h1a2 2 0 0 0 2-2v-7a2 2 0 0 0-1-1.732V14a3 3 0 0 1-3 3h-5.268A2 2 0 0 0 13 18z" opacity="0.9" />
  </svg>
);

const SwirlIcon: React.FC<{ className?: string }> = ({ className = "w-4.5 h-4.5" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M6.5 9.8C6.5 7 9.2 5.5 12.5 5.5c4.6 0 8 3.2 8 7.5 0 4.4-3.6 7.8-8.2 7.8-4.3 0-7.2-3-7.2-6.6 0-3 2.3-5.2 5.2-5.2 2.3 0 4 1.4 4 3.2 0 1.4-1.1 2.4-2.4 2.4-1 0-1.7-.7-1.7-1.5 0-.5.4-.9.9-.9.3 0 .5.2.5.4 0 .3.2.4.5.4.4 0 .8-.5.8-1 0-1-.9-1.8-2.2-1.8-1.7 0-3 1.3-3 3 0 2.2 1.9 4 4.5 4 3.2 0 5.8-2.4 5.8-5.7 0-3.3-2.6-5.6-5.8-5.6-2.3 0-4.2 1.2-4.2 2.8 0 .4-.3.7-.7.7s-.7-.3-.7-.7z" />
  </svg>
);

  const renderLauncherIcon = (iconType: string = 'chat_dots', className = "w-4 h-4") => {
    switch (iconType) {
      case 'logo':
      case 'custom':
        return (
          <img 
            src={companyLogoUrl} 
            alt={currentCompany.name} 
            className="w-full h-full object-cover rounded-full"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        );
      case 'swirl': return <SwirlIcon className={className} />;
      case 'chat_dots': return <ChatDotsIcon className={className} />;
      case 'chat_lines': return <ChatLinesIcon className={className} />;
      case 'help_filled': return <HelpFilledIcon className={className} />;
      case 'chat_double': return <ChatDoubleIcon className={className} />;
      case 'bot': return <Bot className={className} />;
      case 'sparkles': return <Sparkles className={className} />;
      case 'support': return <Headphones className={className} />;
      case 'help': return <HelpFilledIcon className={className} />;
      case 'zap': return <Zap className={className} />;
      case 'chat':
      default: return <ChatDotsIcon className={className} />;
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://cdn.coarai.com';
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const widgetScriptSrc = isLocal ? `${origin}/widget.js` : 'https://cdn.coarai.com/v1/widget.js';
  const apiEndpointUrl = isLocal ? 'http://127.0.0.1:8001/api/v1/chat' : 'https://api.coarai.com/api/v1/chat';

  const isLogoSelected = localSettings.launcherIcon === 'logo' || localSettings.launcherIcon === 'custom';
  const scriptSnippet = `<!-- CoarAI AI Assistant Widget for ${currentCompany.name} -->
<script
  src="${widgetScriptSrc}"
  data-agent-key="${currentCompany.apiKey}"
  data-position="${localSettings.position}"
  data-primary-color="${localSettings.primaryColor}"
  data-bottom-padding="${localSettings.bottomPadding ?? 20}"
  data-side-padding="${localSettings.sidePadding ?? 20}"
  data-launcher-icon="${localSettings.launcherIcon || 'chat'}"${isLogoSelected ? `\n  data-launcher-logo-url="${companyLogoUrl}"` : ''}
  defer>
</script>`;

  const reactSnippet = `import { AssistantChatWidget } from '@coarai/react-sdk';

export default function App() {
  return (
    <div className="min-h-screen">
      {/* Your App Content */}
      <AssistantChatWidget
        apiKey="${currentCompany.apiKey}"
        primaryColor="${localSettings.primaryColor}"
        position="${localSettings.position}"
        bottomPadding={${localSettings.bottomPadding ?? 20}}
        sidePadding={${localSettings.sidePadding ?? 20}}
        launcherIcon="${localSettings.launcherIcon || 'chat'}"${isLogoSelected ? `\n        launcherLogoUrl="${companyLogoUrl}"` : ''}
        welcomeMessage="${currentCompany.agent.greetingMessage}"
      />
    </div>
  );
}`;

  const iframeSnippet = `<iframe
  src="https://embed.coarai.com/chat/${currentCompany.slug}?key=${currentCompany.apiKey}"
  width="400"
  height="620"
  frameborder="0"
  allow="microphone"
  style="border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.15);"
></iframe>`;

  const curlSnippet = `curl -X POST ${apiEndpointUrl} \\
  -H "Authorization: Bearer ${currentCompany.apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Hello! What is your return policy?",
    "customerId": "usr_9941",
    "customerEmail": "alex@enterprise.com"
  }'`;

  const isDarkMode = (localSettings.themeMode || 'dark') === 'dark';

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Hidden File Inputs */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        onChange={handleLogoFileUpload} 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={brandLogoInputRef} 
        accept="image/*" 
        onChange={handleBrandLogoUpload} 
        className="hidden" 
      />

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
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span>Test Assistant</span>
          </button>
        </div>
      </div>

      {/* Main Card with Navigation Tabs */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 mb-6 pb-2">
          <div className="flex items-center gap-8">
            {[
              { id: 'general', label: 'General' },
              { id: 'content', label: 'Content' },
              { id: 'appearance', label: 'Appearance' },
              { id: 'install', label: 'Install' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveMainTab(tab.id as any)}
                className={`pb-3 font-semibold text-sm transition-all relative cursor-pointer ${
                  activeMainTab === tab.id
                    ? 'text-pink-600 font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab.label}
                {activeMainTab === tab.id && (
                  <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-pink-500 rounded-full" />
                )}
              </button>
            ))}
          </div>

          <button
            onClick={handleSaveBranding}
            className="px-5 py-2.5 bg-[#007074] hover:bg-[#005a5d] text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            {isSaved ? <Check className="w-4 h-4 text-emerald-300 stroke-[3]" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{isSaved ? 'Saved' : 'Save Changes'}</span>
          </button>
        </div>

        {/* 2-Column Grid: Form Left, Simulation Mockup Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Form Area (7 Cols) */}
          <div className="lg:col-span-7 space-y-6 text-sm">
            
            {/* TAB: APPEARANCE */}
            {activeMainTab === 'appearance' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* 1. Dark / Light Theme Mode Selector */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Dark Mode Card */}
                  <button
                    type="button"
                    onClick={() => {
                      setLocalSettings(prev => ({ ...prev, themeMode: 'dark' }));
                      updateWidgetSettings({ themeMode: 'dark' });
                    }}
                    className={`p-4 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-3 ${
                      isDarkMode
                        ? 'border-indigo-600 bg-indigo-50/20 ring-2 ring-indigo-600 ring-offset-1 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="w-full h-24 rounded-xl bg-slate-900 p-2.5 flex flex-col justify-between overflow-hidden shadow-inner border border-slate-800">
                      <div className="w-8 h-2 rounded-full bg-slate-700" />
                      <div className="space-y-1">
                        <div className="w-12 h-2 rounded-full bg-slate-800" />
                        <div className="w-16 h-2 rounded-full bg-white ml-auto" />
                        <div className="w-20 h-3 rounded-lg bg-slate-800" />
                      </div>
                    </div>
                    <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-900' : 'text-slate-600'}`}>
                      Dark
                    </span>
                  </button>

                  {/* Light Mode Card */}
                  <button
                    type="button"
                    onClick={() => {
                      setLocalSettings(prev => ({ ...prev, themeMode: 'light' }));
                      updateWidgetSettings({ themeMode: 'light' });
                    }}
                    className={`p-4 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-3 ${
                      !isDarkMode
                        ? 'border-indigo-600 bg-indigo-50/20 ring-2 ring-indigo-600 ring-offset-1 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="w-full h-24 rounded-xl bg-slate-100 p-2.5 flex flex-col justify-between overflow-hidden shadow-inner border border-slate-200">
                      <div className="w-8 h-2 rounded-full bg-slate-300" />
                      <div className="space-y-1">
                        <div className="w-12 h-2 rounded-full bg-slate-200" />
                        <div className="w-16 h-2 rounded-full bg-slate-900 ml-auto" />
                        <div className="w-20 h-3 rounded-lg bg-slate-200" />
                      </div>
                    </div>
                    <span className={`text-xs font-bold ${!isDarkMode ? 'text-slate-900' : 'text-slate-600'}`}>
                      Light
                    </span>
                  </button>
                </div>

                {/* 2. Branding Section */}
                <div className="space-y-4 pt-2">
                  <h4 className="font-bold text-slate-900 text-sm">Branding</h4>

                  {/* Brand Name Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-800 text-xs sm:text-sm">Brand Name</label>
                      <span className="text-[11px] text-slate-400">Used across widget header & messages</span>
                    </div>
                    <input
                      type="text"
                      value={brandName}
                      onChange={(e) => {
                        setBrandName(e.target.value);
                        updateCompany({ name: e.target.value });
                      }}
                      placeholder="e.g. TechFlow Cloud Infrastructure"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                    />
                  </div>

                  {/* Brand Logo Row */}
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800 text-xs sm:text-sm">Brand Logo</span>
                      </div>
                      <p className="text-xs text-slate-400">Will be used to send first message</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => brandLogoInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200/80 text-slate-800 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs group"
                        title="Click to upload logo image"
                      >
                        <img 
                          src={companyLogoUrl} 
                          alt="Logo" 
                          className="w-4 h-4 rounded-md object-cover ring-1 ring-slate-200"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80';
                          }}
                        />
                        <span className="font-bold text-slate-800">{brandName || currentCompany.name}</span>
                        <div className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center group-hover:bg-slate-900 transition-colors ml-1 shadow-2xs">
                          <Pencil className="w-2.5 h-2.5" />
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => brandLogoInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>Upload Logo</span>
                      </button>
                    </div>
                  </div>

                  {/* Header Color Row */}
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-800 text-xs sm:text-sm">Header Color:</span>
                      <Info className="w-3.5 h-3.5 text-slate-400" />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
                        <input
                          type="color"
                          value={localSettings.primaryColor}
                          onChange={(e) => setLocalSettings({ ...localSettings, primaryColor: e.target.value })}
                          className="w-5 h-5 rounded-full border-0 cursor-pointer p-0"
                        />
                        <span className="font-mono text-xs font-bold text-slate-800 uppercase">
                          # {localSettings.primaryColor.replace('#', '')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Color Presets */}
                  <div className="flex items-center justify-end gap-1.5 pt-0.5">
                    {COLOR_PRESETS.map(preset => {
                      const isSelected = localSettings.primaryColor.toLowerCase() === preset.hex.toLowerCase();
                      return (
                        <button
                          key={preset.hex}
                          type="button"
                          onClick={() => setLocalSettings(prev => ({ ...prev, primaryColor: preset.hex }))}
                          title={preset.name}
                          style={{ backgroundColor: preset.hex }}
                          className={`w-5 h-5 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                            isSelected ? 'scale-120 ring-2 ring-slate-900 ring-offset-1' : 'hover:scale-110 opacity-90'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Header Text Color Row */}
                  <div className="flex items-center justify-between py-1">
                    <span className="font-semibold text-slate-800 text-xs sm:text-sm">Header Text Color:</span>
                    <select
                      value={localSettings.headerTextColor || 'white'}
                      onChange={(e) => setLocalSettings({ ...localSettings, headerTextColor: e.target.value as any })}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs cursor-pointer focus:outline-hidden"
                    >
                      <option value="white">⚪ White</option>
                      <option value="black">⚫ Black</option>
                    </select>
                  </div>

                  {/* Background Animation Row */}
                  <div className="flex items-center justify-between py-1">
                    <span className="font-semibold text-slate-800 text-xs sm:text-sm">Background Animation</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={localSettings.backgroundAnimation !== false}
                        onChange={(e) => setLocalSettings({ ...localSettings, backgroundAnimation: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {/* Bottom Padding & Side Padding Row */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block font-semibold text-slate-800 text-xs mb-1">Bottom Padding</label>
                      <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs focus-within:ring-1 focus-within:ring-slate-900">
                        <span className="text-slate-400 text-xs font-mono mr-1">⎕</span>
                        <input
                          type="number"
                          value={localSettings.bottomPadding || 20}
                          onChange={(e) => setLocalSettings({ ...localSettings, bottomPadding: parseInt(e.target.value) || 0 })}
                          className="w-full text-xs font-semibold text-slate-900 focus:outline-hidden"
                        />
                        <span className="text-slate-400 text-xs font-mono">px</span>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-800 text-xs mb-1">Side Padding</label>
                      <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs focus-within:ring-1 focus-within:ring-slate-900">
                        <span className="text-slate-400 text-xs font-mono mr-1">⎕</span>
                        <input
                          type="number"
                          value={localSettings.sidePadding || 20}
                          onChange={(e) => setLocalSettings({ ...localSettings, sidePadding: parseInt(e.target.value) || 0 })}
                          className="w-full text-xs font-semibold text-slate-900 focus:outline-hidden"
                        />
                        <span className="text-slate-400 text-xs font-mono">px</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Launcher Icon with Popover Selector (Exact Match to Screenshot) */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="relative">
                    <div className="flex items-center justify-between py-1">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">Launcher icon</h4>
                        <p className="text-xs text-slate-400">Shown as the chat launcher icon.</p>
                      </div>

                      {/* Clickable Badge Trigger */}
                      <div className="relative inline-flex items-center">
                        <button
                          type="button"
                          onClick={() => setIsIconPickerOpen(!isIconPickerOpen)}
                          title="Click to change launcher icon"
                          className="w-12 h-12 flex items-center justify-center text-white relative shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-all p-1.5 group"
                          style={{ 
                            backgroundColor: localSettings.primaryColor,
                            borderRadius: launcherStyle === 'teardrop' 
                              ? (localSettings.position === 'bottom_left' ? '50% 50% 50% 4px' : '50% 50% 4px 50%')
                              : (launcherStyle === 'squircle' ? '14px' : '9999px')
                          }}
                        >
                          <div className="w-6 h-6 flex items-center justify-center pointer-events-none">
                            {renderLauncherIcon(localSettings.launcherIcon || 'chat_dots', "w-5 h-5")}
                          </div>

                          {/* Pencil Edit Badge in corner - fully visible and unclipped */}
                          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-900 group-hover:bg-slate-950 text-white flex items-center justify-center shadow-md border-2 border-white transition-colors">
                            <Pencil className="w-2.5 h-2.5" />
                          </div>
                        </button>

                        {/* Popover Card (Exact match to screenshot) */}
                        {isIconPickerOpen && (
                          <div 
                            ref={iconPickerRef}
                            className="absolute right-0 bottom-full mb-3 w-72 bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-bold text-slate-700">Choose your launcher icon</span>
                              <button
                                type="button"
                                onClick={() => setIsIconPickerOpen(false)}
                                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Icon Presets Row */}
                            <div className="flex items-center justify-between gap-1.5 mb-3">
                              {[
                                { id: 'logo', icon: null, isLogo: true, title: 'Company Logo' },
                                { id: 'swirl', icon: SwirlIcon, title: 'Swirl Droplet' },
                                { id: 'chat_dots', icon: ChatDotsIcon, title: 'Chat Bubble' },
                                { id: 'chat_lines', icon: ChatLinesIcon, title: 'Chat Box' },
                                { id: 'help_filled', icon: HelpFilledIcon, title: 'Help & FAQ' },
                                { id: 'chat_double', icon: ChatDoubleIcon, title: 'Multi Chat' },
                                { id: 'bot', icon: Bot, title: 'AI Bot' },
                                { id: 'sparkles', icon: Sparkles, title: 'Magic AI' }
                              ].map(item => {
                                const IconComp = item.icon;
                                const isSelected = (localSettings.launcherIcon || 'chat_dots') === item.id;
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    title={item.title}
                                    onClick={() => {
                                      setLocalSettings(prev => ({ ...prev, launcherIcon: item.id as any }));
                                      updateWidgetSettings({ launcherIcon: item.id as any });
                                      setIsIconPickerOpen(false);
                                    }}
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                                      isSelected
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
                                    }`}
                                  >
                                    {item.isLogo ? (
                                      <img 
                                        src={companyLogoUrl} 
                                        alt="Logo" 
                                        className="w-5 h-5 rounded-md object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80';
                                        }}
                                      />
                                    ) : (
                                      IconComp && <IconComp className="w-4.5 h-4.5" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Divider with OR */}
                            <div className="relative my-3">
                              <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200"></div>
                              </div>
                              <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400">
                                <span className="bg-white px-2">OR</span>
                              </div>
                            </div>

                            {/* Upload Icon Button */}
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100/90 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
                            >
                              <Upload className="w-3.5 h-3.5 text-slate-600" />
                              <span>Upload icon</span>
                            </button>

                            <p className="text-[10px] text-slate-400 text-center mt-2 leading-relaxed">
                              Upload a transparent PNG icon<br />
                              64×64px recommended
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Launcher Style / Shape Toggle */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 text-xs sm:text-sm">Launcher Shape</span>
                      <span className="text-[11px] text-slate-400 font-medium">Button geometry</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setLauncherStyle('teardrop');
                          setLocalSettings(prev => ({ ...prev, launcherShape: 'teardrop' }));
                        }}
                        className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          launcherStyle === 'teardrop' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                        }`}
                        title="Teardrop Chat Droplet Shape"
                      >
                        <span className="w-3 h-3 bg-current inline-block rounded-tl-full rounded-tr-full rounded-bl-full rounded-br-xs"></span>
                        <span>Droplet</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLauncherStyle('bubble');
                          setLocalSettings(prev => ({ ...prev, launcherShape: 'circle' }));
                        }}
                        className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          launcherStyle === 'bubble' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                        }`}
                        title="Circular Round Bubble"
                      >
                        <span className="w-3 h-3 bg-current inline-block rounded-full"></span>
                        <span>Circle</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLauncherStyle('squircle');
                          setLocalSettings(prev => ({ ...prev, launcherShape: 'squircle' }));
                        }}
                        className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          launcherStyle === 'squircle' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                        }`}
                        title="Rounded Square"
                      >
                        <span className="w-3 h-3 bg-current inline-block rounded-sm"></span>
                        <span>Square</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLauncherStyle('pill');
                          setLocalSettings(prev => ({ ...prev, launcherShape: 'pill' }));
                        }}
                        className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          launcherStyle === 'pill' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                        }`}
                        title="Pill with Text"
                      >
                        <span className="w-3.5 h-2 bg-current inline-block rounded-full"></span>
                        <span>Pill</span>
                      </button>
                    </div>
                  </div>

                  {launcherStyle === 'pill' && (
                    <div>
                      <label className="block font-semibold text-slate-800 text-xs mb-1">Launcher Button Text</label>
                      <input
                        type="text"
                        value={localSettings.launcherText}
                        onChange={(e) => setLocalSettings({ ...localSettings, launcherText: e.target.value })}
                        placeholder="e.g. Chat with Us"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                      />
                    </div>
                  )}
                </div>

                {/* Save Changes Bottom Button */}
                <div className="pt-4 border-t border-slate-100 flex justify-start">
                  <button
                    type="button"
                    onClick={handleSaveBranding}
                    className="px-6 py-2.5 bg-[#007074] hover:bg-[#005a5d] text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    {isSaved ? <Check className="w-4 h-4 text-emerald-300 stroke-[3]" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>{isSaved ? 'Saved' : 'Save Changes'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB: CONTENT */}
            {activeMainTab === 'content' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="space-y-5">
                  {/* 1. Header Title & Subtitle */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-800 text-xs sm:text-sm mb-1.5">Header Title</label>
                      <input
                        type="text"
                        value={localSettings.headerTitle}
                        onChange={(e) => setLocalSettings({ ...localSettings, headerTitle: e.target.value })}
                        placeholder="e.g. ACME Support"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-800 text-xs sm:text-sm mb-1.5">Header Subtitle</label>
                      <input
                        type="text"
                        value={localSettings.headerSubtitle || ''}
                        onChange={(e) => setLocalSettings({ ...localSettings, headerSubtitle: e.target.value })}
                        placeholder="e.g. Ask us anything or share your feedback"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* 2. Welcome Greeting & Fallback Responses (Exact Match to Requirement) */}
                  <div className="pt-4 border-t border-slate-100 space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base">Welcome Greeting & Fallback Responses</h4>
                      <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Control initial messages and grounding safeguards.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Welcome Greeting Message */}
                      <div className="space-y-1.5">
                        <label className="block font-semibold text-slate-800 text-xs sm:text-sm">Welcome Greeting Message</label>
                        <textarea
                          rows={3}
                          value={greetingMessage}
                          onChange={(e) => {
                            const val = e.target.value;
                            setGreetingMessage(val);
                            setPreviewChat(prev => {
                              if (prev.length === 1 && prev[0].sender === 'agent') {
                                return [{ sender: 'agent', text: val }];
                              }
                              return prev;
                            });
                          }}
                          placeholder="Hello! How can I assist you today?"
                          className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium leading-relaxed focus:bg-white focus:ring-1 focus:ring-slate-900 focus:outline-hidden resize-none shadow-2xs"
                        />
                        <p className="text-[11px] text-slate-400">Sent automatically when a visitor opens the chat widget.</p>
                      </div>

                      {/* Fallback Refusal Message */}
                      <div className="space-y-1.5">
                        <label className="block font-semibold text-slate-800 text-xs sm:text-sm">Fallback Refusal Message (Anti-Hallucination)</label>
                        <textarea
                          rows={3}
                          value={fallbackMessage}
                          onChange={(e) => setFallbackMessage(e.target.value)}
                          placeholder="I do not have specific verified information regarding that in our official documentation. Would you like me to transfer this session to our 24/7 support team?"
                          className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium leading-relaxed focus:bg-white focus:ring-1 focus:ring-slate-900 focus:outline-hidden resize-none shadow-2xs"
                        />
                        <p className="text-[11px] text-slate-400">Used whenever facts are not present in the indexed knowledge base.</p>
                      </div>
                    </div>
                  </div>

                  {/* 3. Starter Question Chips */}
                  <div className="pt-4 border-t border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="block font-semibold text-slate-800 text-xs sm:text-sm">
                        Starter Prompt Chips <span className="text-xs font-normal text-slate-500">(1-click prompt chips)</span>
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
                </div>

                {/* Save Changes Bottom Button */}
                <div className="pt-4 border-t border-slate-100 flex justify-start">
                  <button
                    type="button"
                    onClick={handleSaveBranding}
                    className="px-6 py-2.5 bg-[#007074] hover:bg-[#005a5d] text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    {isSaved ? <Check className="w-4 h-4 text-emerald-300 stroke-[3]" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>{isSaved ? 'Saved' : 'Save Changes'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB: GENERAL */}
            {activeMainTab === 'general' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="space-y-4">
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

                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={localSettings.showPoweredBy}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setLocalSettings(prev => ({ ...prev, showPoweredBy: isChecked }));
                          updateWidgetSettings({ showPoweredBy: isChecked });
                        }}
                        className="rounded text-slate-900 w-4 h-4 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-800 text-sm">Display "Powered by CoarAI" badge</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: INSTALL */}
            {activeMainTab === 'install' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="bg-slate-950 text-slate-200 rounded-2xl p-5 border border-slate-800 shadow-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-slate-400" />
                      <h4 className="text-sm font-bold text-white">Embed Installation Snippet</h4>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                      {[
                        { id: 'script', label: 'HTML <script>' },
                        { id: 'react', label: 'React SDK' },
                        { id: 'iframe', label: 'Iframe' },
                        { id: 'api', label: 'REST API' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveSnippetTab(tab.id as any)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
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

                  <div className="relative bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-slate-200 overflow-x-auto">
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
                      className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg text-[11px] font-sans font-semibold flex items-center gap-1 transition-colors border border-slate-700 cursor-pointer"
                    >
                      {copiedKey === 'snippet' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'snippet' ? 'Copied' : 'Copy'}</span>
                    </button>

                    <pre className="pr-16 leading-relaxed font-mono">
                      {activeSnippetTab === 'script' && scriptSnippet}
                      {activeSnippetTab === 'react' && reactSnippet}
                      {activeSnippetTab === 'iframe' && iframeSnippet}
                      {activeSnippetTab === 'api' && curlSnippet}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Live Visual Mockup Area (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-400">Live Preview</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Interactive
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetPreview}
                className="text-[11px] text-slate-500 hover:text-slate-800 font-medium underline cursor-pointer"
              >
                Reset Chat
              </button>
            </div>

            {/* Realistic Stage Canvas */}
            <div 
              className="rounded-3xl border border-slate-200/90 bg-gradient-to-b from-slate-100/80 via-slate-50 to-slate-200/50 p-4 sm:p-6 min-h-[660px] flex flex-col justify-between relative overflow-hidden shadow-inner"
            >
              {/* Top simulation canvas bar */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pb-2 border-b border-slate-200/60 mb-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                  <span className="ml-1 text-slate-400">your-website.com</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  {isPreviewOpen ? 'Click launcher or chevron to minimize' : 'Click launcher to expand'}
                </span>
              </div>

              {/* Floating Widget Card Container */}
              <div className="flex-1 flex flex-col justify-end">
                {isPreviewOpen ? (
                  <div 
                    className={`rounded-3xl border shadow-2xl overflow-hidden flex flex-col justify-between relative transition-all duration-300 animate-in fade-in zoom-in-95 ${
                      isDarkMode 
                        ? 'bg-[#090d16] text-white border-slate-800/80 shadow-slate-950/60' 
                        : 'bg-white text-slate-900 border-slate-200 shadow-slate-300/60'
                    }`}
                    style={{
                      height: '550px',
                      maxHeight: '560px'
                    }}
                  >
                    {/* Background ambient gradient glow if animation enabled */}
                    {localSettings.backgroundAnimation !== false && (
                      <div 
                        className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-20 blur-3xl pointer-events-none"
                        style={{ backgroundColor: localSettings.primaryColor }}
                      />
                    )}

                    {/* Mockup Top Brand Header */}
                    <div className="p-5 pb-3 z-10 flex items-start justify-between">
                      <div>
                        {/* Brand Badge Pill */}
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold mb-3 shadow-2xs ${
                          isDarkMode ? 'bg-white/10 backdrop-blur-md border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'
                        }`}>
                          <img 
                            src={companyLogoUrl} 
                            alt="Brand" 
                            className="w-4 h-4 rounded-md object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80';
                            }}
                          />
                          <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>{currentCompany.name}</span>
                        </div>

                        {/* Big Prominent Title & Subtitle */}
                        <div className="space-y-1">
                          {localSettings.headerTitle ? (
                            <h3 
                              className="text-2xl font-extrabold tracking-tight"
                              style={{ color: localSettings.primaryColor }}
                            >
                              {localSettings.headerTitle}
                            </h3>
                          ) : null}
                          {localSettings.headerSubtitle ? (
                            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              {localSettings.headerSubtitle}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {/* Minimize / Close button on header */}
                      <button
                        type="button"
                        onClick={() => setIsPreviewOpen(false)}
                        title="Minimize Widget"
                        className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                          isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Chat Message Stream & Starter Prompts */}
                    <div className="px-5 py-2 flex-1 space-y-2.5 overflow-y-auto max-h-[290px] text-xs z-10 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                      {previewChat.map((msg, mIdx) => (
                        <div 
                          key={mIdx}
                          style={{
                            backgroundColor: msg.sender === 'user' ? localSettings.primaryColor : (isDarkMode ? '#1e293b' : '#f1f5f9'),
                            color: msg.sender === 'user' ? '#ffffff' : (isDarkMode ? '#f8fafc' : '#0f172a')
                          }}
                          className={`p-2.5 rounded-2xl max-w-[88%] font-medium leading-relaxed shadow-xs ${
                            msg.sender === 'user' ? 'ml-auto border-transparent' : 'border border-white/5 text-left'
                          }`}
                        >
                          {msg.text}
                        </div>
                      ))}

                      {/* Starter Questions Chips */}
                      {starterQuestions.length > 0 && (
                        <div className="pt-2 space-y-1.5">
                          <p className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            Suggested Questions:
                          </p>
                          <div className="flex flex-col gap-1.5">
                            {starterQuestions.map((q, qIdx) => (
                              <button
                                key={qIdx}
                                type="button"
                                onClick={() => handlePreviewStarterClick(q)}
                                className={`text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer border ${
                                  isDarkMode 
                                    ? 'bg-slate-900/90 hover:bg-slate-800/90 text-slate-200 border-slate-800' 
                                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                💬 {q}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom "Send us a message" input pill */}
                    <div className="p-4 pt-2 z-10 space-y-2">
                      <div className={`p-1.5 rounded-2xl flex items-center justify-between border shadow-xs ${
                        isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        <span className={`text-xs font-medium px-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          Send us a message...
                        </span>
                        <div 
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                          style={{ backgroundColor: localSettings.primaryColor }}
                        >
                          <Send className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      {/* Powered By Footer */}
                      {localSettings.showPoweredBy !== false && (
                        <p className="text-center text-[10px] text-slate-400 font-medium">
                          Powered by <strong className="font-semibold text-slate-500">CoarAI</strong>
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                    <p className="text-xs font-medium mb-2">Widget minimized on page</p>
                    <p className="text-[11px] text-slate-400">Click the floating launcher button below to open</p>
                  </div>
                )}
              </div>

              {/* Bottom Floating Launcher Button inside Canvas */}
              <div 
                className={`mt-4 flex ${localSettings.position === 'bottom_left' ? 'justify-start' : 'justify-end'}`}
                style={{
                  paddingBottom: Math.min(localSettings.bottomPadding || 20, 40),
                  paddingLeft: localSettings.position === 'bottom_left' ? Math.min(localSettings.sidePadding || 20, 30) : 0,
                  paddingRight: localSettings.position !== 'bottom_left' ? Math.min(localSettings.sidePadding || 20, 30) : 0
                }}
              >
                {launcherStyle === 'pill' ? (
                  <button
                    type="button"
                    onClick={() => setIsPreviewOpen(prev => !prev)}
                    className="px-5 py-3 rounded-full text-white text-xs font-bold flex items-center gap-2.5 shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer"
                    style={{ backgroundColor: localSettings.primaryColor }}
                    title={isPreviewOpen ? "Click to minimize widget" : "Click to expand widget"}
                  >
                    <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                      {isPreviewOpen ? (
                        <ChevronDown className="w-4 h-4 text-white animate-bounce" />
                      ) : (
                        renderLauncherIcon(localSettings.launcherIcon || 'chat_dots', "w-4 h-4")
                      )}
                    </div>
                    <span>{localSettings.launcherText || 'Chat with Us'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsPreviewOpen(prev => !prev)}
                    className="w-14 h-14 text-white flex items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer overflow-hidden p-3"
                    style={{ 
                      backgroundColor: localSettings.primaryColor,
                      borderRadius: launcherStyle === 'teardrop'
                        ? (localSettings.position === 'bottom_left' ? '50% 50% 50% 4px' : '50% 50% 4px 50%')
                        : (launcherStyle === 'squircle' ? '18px' : '9999px')
                    }}
                    title={isPreviewOpen ? "Click to minimize widget" : "Click to expand widget"}
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      {isPreviewOpen ? (
                        <ChevronDown className="w-6 h-6 text-white" />
                      ) : (
                        renderLauncherIcon(localSettings.launcherIcon || 'chat_dots', "w-6 h-6")
                      )}
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden File Inputs for Logo & Custom Icon Uploads */}
      <input 
        type="file" 
        ref={brandLogoInputRef} 
        onChange={handleBrandLogoUpload} 
        accept="image/*" 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleLogoFileUpload} 
        accept="image/*" 
        className="hidden" 
      />
    </div>
  );
};
