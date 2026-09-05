import React, { useState } from 'react';
import { 
  Zap, 
  ShieldAlert, 
  CheckCircle2, 
  Play, 
  Check, 
  Sparkles,
  Layers,
  Database,
  Calendar,
  DollarSign,
  Mail,
  UserCheck
} from 'lucide-react';
import { useApp } from '../../context';
import { ActionDefinition } from '../../types';

export const ActionsView: React.FC = () => {
  const { 
    actions, 
    toggleAction, 
    currentCompany, 
    setIsQuickTestOpen,
    showToast
  } = useApp();

  const [testResult, setTestResult] = useState<{ id: string; msg: string } | null>(null);

  const handleTestSimulate = (action: ActionDefinition) => {
    const simulatedMsg = action.successMessageTemplate
      .replace('{orderId}', 'ORD-8821')
      .replace('{status}', 'In Transit via BlueDart Express')
      .replace('{email}', 'customer@enterprise.com')
      .replace('{preferredDate}', 'Tomorrow at 2:00 PM')
      .replace('{randomId}', '9401')
      .replace('{name}', 'Alex Johnson');

    setTestResult({
      id: action.id,
      msg: `? Executed: ${simulatedMsg}`
    });
    showToast('Action Simulated', `Tested "${action.name}" successfully.`, 'info');
    setTimeout(() => setTestResult(null), 4000);
  };

  const enabledCount = actions.filter(a => a.enabled).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Business Actions</h1>
          <p className="text-xs text-slate-500 mt-1">
            Authorize what <strong>{currentCompany.agent.name}</strong> can do for your customers (track orders, book meetings, process refunds).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsQuickTestOpen(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Test Actions in Sandbox</span>
          </button>
        </div>
      </div>

      {/* Safety & Confirmation Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-amber-950">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 border border-amber-300">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-amber-950">Customer Confirmation Guardrails</h4>
            <p className="text-[11px] text-amber-800 mt-0.5">
              High-impact actions (like Refunds or Order Cancellations) require explicit customer confirmation before executing.
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-amber-200/70 text-amber-900 rounded-lg shrink-0">
          {enabledCount} of {actions.length} Actions Active
        </span>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {actions.map(action => {
          const isSimulating = testResult?.id === action.id;
          const isHighRisk = action.riskLevel === 'high';

          return (
            <div
              key={action.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                action.enabled 
                  ? 'border-slate-200 hover:border-slate-300' 
                  : 'border-slate-200/60 opacity-60 bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl ${
                      action.enabled ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{action.name}</h3>
                      <span className="text-[10px] text-slate-400 font-medium">Connected to Business Backend</span>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={action.enabled}
                      onChange={() => toggleAction(action.id)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {action.description}
                </p>

                {/* Risk and Confirmation Tags */}
                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                  <span className={`px-2 py-0.5 rounded-md font-semibold border ${
                    isHighRisk 
                      ? 'bg-rose-50 text-rose-700 border-rose-200' 
                      : action.riskLevel === 'low'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {isHighRisk ? 'High Risk' : action.riskLevel === 'low' ? 'Low Risk' : 'Read-Only'}
                  </span>

                  {action.requiresUserConfirmation && (
                    <span className="px-2 py-0.5 rounded-md font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-indigo-600" />
                      <span>Confirmation Required</span>
                    </span>
                  )}

                  <span className="px-2 py-0.5 rounded-md text-slate-500 bg-slate-50 border border-slate-200">
                    {action.executionCount} executions
                  </span>
                </div>
              </div>

              {/* Simulation Box / Test Bar */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleTestSimulate(action)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Play className="w-3 h-3 text-indigo-600" />
                  <span>Simulate Action</span>
                </button>

                {isSimulating && (
                  <span className="text-[11px] font-semibold text-emerald-600 animate-in fade-in truncate max-w-[220px]">
                    {testResult?.msg}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
