import React, { useState } from 'react';
import { 
  Plug, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  X, 
  ExternalLink, 
  Key, 
  RefreshCw,
  MessageSquare,
  Layers,
  Sparkles,
  Lock
} from 'lucide-react';
import { useApp } from '../../context';
import { Integration } from '../../types';

export const ConnectionsView: React.FC = () => {
  const { integrations, updateIntegration, showToast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [configuringIntegration, setConfiguringIntegration] = useState<Integration | null>(null);

  const categories = [
    { id: 'all', label: 'All Connections' },
    { id: 'messaging', label: 'Messaging & Chat' },
    { id: 'crm', label: 'CRM & Customers' },
    { id: 'ecommerce', label: 'E-Commerce' },
    { id: 'support', label: 'Helpdesk & Ticketing' }
  ];

  // Enhanced marketplace metadata
  const connectionCards = [
    {
      id: 'int-whatsapp',
      name: 'WhatsApp Business',
      category: 'messaging',
      icon: '💬',
      description: 'Interact with customers directly via WhatsApp messages and voice notes 24/7.',
      connected: true,
      lastSync: '2 minutes ago',
      fields: ['Phone Number ID', 'Meta Business Access Token']
    },
    {
      id: 'int-slack',
      name: 'Slack',
      category: 'messaging',
      icon: '⚡',
      description: 'Receive escalation notifications and allow internal team members to chat with the AI.',
      connected: true,
      lastSync: '10 minutes ago',
      fields: ['Webhook URL', 'Bot Token']
    },
    {
      id: 'int-hubspot',
      name: 'HubSpot CRM',
      category: 'crm',
      icon: '🟠',
      description: 'Automatically sync captured customer contact info, leads, and chat transcripts.',
      connected: false,
      lastSync: 'Not connected',
      fields: ['HubSpot Private App Token']
    },
    {
      id: 'int-salesforce',
      name: 'Salesforce',
      category: 'crm',
      icon: '☁️',
      description: 'Enterprise CRM lead routing, contact creation, and account synchronization.',
      connected: false,
      lastSync: 'Not connected',
      fields: ['Consumer Key', 'Consumer Secret', 'Instance URL']
    },
    {
      id: 'int-shopify',
      name: 'Shopify Store',
      category: 'ecommerce',
      icon: '🛍️',
      description: 'Allow your AI assistant to check real-time order status, stock levels, and tracking.',
      connected: false,
      lastSync: 'Not connected',
      fields: ['Shop Domain', 'Storefront Access Token']
    },
    {
      id: 'int-gmail',
      name: 'Gmail & Email',
      category: 'support',
      icon: '✉️',
      description: 'Send customer inquiry summaries and automated follow-up emails via verified inbox.',
      connected: false,
      lastSync: 'Not connected',
      fields: ['Google Workspace Email', 'OAuth Client ID']
    }
  ];

  const filteredConnections = connectionCards.filter(c => {
    const matchesCat = selectedCategory === 'all' || c.category === selectedCategory;
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleToggleConnect = (card: typeof connectionCards[0]) => {
    if (card.connected) {
      showToast('Disconnected', `Disconnected ${card.name}`, 'info');
    } else {
      setConfiguringIntegration({
        id: card.id,
        name: card.name,
        provider: card.name.toLowerCase(),
        category: 'crm',
        iconName: 'Layers',
        description: card.description,
        connected: false,
        accessType: 'read_and_action',
        allowedReadScopes: [],
        allowedActionScopes: [],
        configFields: card.fields.map(f => ({ key: f.toLowerCase().replace(/\s+/g, '_'), label: f, type: 'password', required: true })),
        healthStatus: 'healthy'
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Plug className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">Connections</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Connect your assistant to the tools and platforms your business already uses.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 font-semibold">
            ● 2 Active Connections
          </span>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search connections..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Connections Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredConnections.map(item => (
          <div
            key={item.id}
            className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-2xl shadow-2xs">
                  {item.icon}
                </div>

                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                  item.connected
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${item.connected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  {item.connected ? 'Connected' : 'Available'}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-900">{item.name}</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {item.description}
              </p>
            </div>

            <div className="border-t border-slate-100 pt-4 mt-6 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400">
                {item.connected ? `Last sync: ${item.lastSync}` : 'Ready to connect'}
              </span>

              <button
                onClick={() => handleToggleConnect(item)}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  item.connected
                    ? 'bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs'
                }`}
              >
                {item.connected ? 'Manage' : 'Connect'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Setup Connection Credentials */}
      {configuringIntegration && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Plug className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Connect {configuringIntegration.name}</h3>
                  <p className="text-xs text-slate-500">Enter your secure API credentials</p>
                </div>
              </div>
              <button
                onClick={() => setConfiguringIntegration(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-indigo-900 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  All API keys are encrypted at rest with hardware security modules and never exposed in browser storage.
                </p>
              </div>

              {configuringIntegration.configFields.map(f => (
                <div key={f.key}>
                  <label className="block font-bold text-slate-900 mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={`Enter ${f.label}`}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setConfiguringIntegration(null)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  showToast('Connection Saved', `${configuringIntegration.name} connected successfully.`, 'success');
                  setConfiguringIntegration(null);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-indigo-500"
              >
                Verify & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
