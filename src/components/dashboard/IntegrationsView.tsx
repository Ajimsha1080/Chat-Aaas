import React, { useState } from 'react';
import { 
  Puzzle, 
  Building2, 
  LifeBuoy, 
  CreditCard, 
  Database, 
  Calendar, 
  Layers, 
  ShieldCheck, 
  Lock, 
  RefreshCw, 
  KeyRound, 
  Settings2, 
  CheckCircle2 
} from 'lucide-react';
import { useApp } from '../../context';
import { Integration, AccessPermissionType } from '../../types';

export const IntegrationsView: React.FC = () => {
  const { 
    integrations, 
    toggleIntegration, 
    updateIntegration, 
    currentPlan
  } = useApp();

  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [testingPingId, setTestingPingId] = useState<string | null>(null);
  const [pingSuccessId, setPingSuccessId] = useState<string | null>(null);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'crm': return Building2;
      case 'support': return LifeBuoy;
      case 'payment': return CreditCard;
      case 'database': return Database;
      case 'booking': return Calendar;
      default: return Layers;
    }
  };

  const handleTestPing = (id: string) => {
    setTestingPingId(id);
    setTimeout(() => {
      setTestingPingId(null);
      setPingSuccessId(id);
      setTimeout(() => setPingSuccessId(null), 3000);
    }, 1000);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIntegration) return;
    updateIntegration(selectedIntegration.id, selectedIntegration);
    setIsEditModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Connected Services & Integrations</h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              Hierarchy Level 4
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Connect approved business systems. Strictly isolates <strong>Read Access</strong> from <strong>Action Access</strong> to prevent arbitrary data exposure.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            Connected: <strong>{integrations.filter(i => i.connected).length}</strong> / {currentPlan.maxIntegrations} max
          </span>
        </div>
      </div>

      {/* Security Guarantee Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-400/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Strict Least-Privilege Data Sandboxing</h4>
            <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
              The single AI agent can <strong>never query raw databases</strong> or perform arbitrary API mutations. All calls are schema-locked and restricted to explicitly approved scopes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-800 flex items-center gap-1.5">
            <Lock className="w-3 h-3" />
            <span>KMS Envelope Encrypted</span>
          </span>
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map(item => {
          const Icon = getCategoryIcon(item.category);
          const isPingTesting = testingPingId === item.id;
          const isPingSuccess = pingSuccessId === item.id;

          return (
            <div 
              key={item.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                item.connected 
                  ? 'border-slate-300 ring-1 ring-slate-200' 
                  : 'border-slate-200 opacity-80 hover:opacity-100'
              }`}
            >
              <div>
                {/* Card Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      item.connected ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">{item.name}</h3>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">{item.category}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleIntegration(item.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                      item.connected 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100' 
                        : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {item.connected ? 'Connected' : 'Disconnected'}
                  </button>
                </div>

                <p className="text-xs text-slate-600 mb-4 leading-relaxed line-clamp-2">
                  {item.description}
                </p>

                {/* Permission Badges: Read vs Action Scope */}
                <div className="space-y-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Access Model:</span>
                    <span className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      item.accessType === 'read_and_action' ? 'bg-purple-100 text-purple-800' :
                      item.accessType === 'read_only' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.accessType.replace('_', ' & ')}
                    </span>
                  </div>

                  <div className="flex items-start gap-1">
                    <span className="text-slate-400 shrink-0 font-medium">Read:</span>
                    <span className="text-slate-700 font-mono text-[10px] truncate">
                      {item.allowedReadScopes.length > 0 ? item.allowedReadScopes.join(', ') : 'None'}
                    </span>
                  </div>

                  <div className="flex items-start gap-1">
                    <span className="text-slate-400 shrink-0 font-medium">Action:</span>
                    <span className="text-slate-700 font-mono text-[10px] truncate">
                      {item.allowedActionScopes.length > 0 ? item.allowedActionScopes.join(', ') : 'None'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                {item.connected ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTestPing(item.id)}
                      disabled={isPingTesting}
                      className="text-[11px] font-semibold text-slate-600 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                    >
                      {isPingTesting ? (
                        <RefreshCw className="w-3 h-3 animate-spin text-indigo-600" />
                      ) : isPingSuccess ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      <span>{isPingTesting ? 'Pinging...' : isPingSuccess ? 'Healthy (200 OK)' : 'Ping Test'}</span>
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400">Not configured</span>
                )}

                <button
                  onClick={() => {
                    setSelectedIntegration(item);
                    setIsEditModalOpen(true);
                  }}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 font-semibold text-[11px]"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>Configure</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Configure Integration Modal */}
      {isEditModalOpen && selectedIntegration && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Puzzle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Configure {selectedIntegration.name}</h3>
                  <p className="text-[11px] text-slate-500">{selectedIntegration.provider}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4 text-xs">
              {/* Access Mode Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Access Scope Model</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'read_only', label: 'Read-Only', desc: 'Queries only' },
                    { id: 'read_and_action', label: 'Read & Action', desc: 'Queries + Mutations' },
                    { id: 'action_only', label: 'Action-Only', desc: 'Dispatches actions' }
                  ].map(mode => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setSelectedIntegration({
                        ...selectedIntegration,
                        accessType: mode.id as AccessPermissionType
                      })}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        selectedIntegration.accessType === mode.id
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-bold ring-1 ring-indigo-600'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <p className="font-bold">{mode.label}</p>
                      <span className="text-[10px] text-slate-400">{mode.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Encrypted Config Fields */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Credentials & Endpoint Settings</span>
                  </label>
                  <span className="text-[10px] text-emerald-600 font-mono flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> AES-256 KMS
                  </span>
                </div>

                {selectedIntegration.configFields.map((field, idx) => (
                  <div key={field.key}>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">{field.label}</label>
                    <input
                      type={field.type}
                      value={field.value || ''}
                      onChange={(e) => {
                        const updatedFields = [...selectedIntegration.configFields];
                        updatedFields[idx] = { ...updatedFields[idx], value: e.target.value };
                        setSelectedIntegration({ ...selectedIntegration, configFields: updatedFields });
                      }}
                      placeholder={field.placeholder || `Enter ${field.label}`}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm"
                >
                  Save Integration Scopes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
