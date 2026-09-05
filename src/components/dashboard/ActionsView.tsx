import React, { useState } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Play, 
  Settings2, 
  Sparkles 
} from 'lucide-react';
import { useApp } from '../../context';
import { ActionDefinition, ActionRiskLevel } from '../../types';

export const ActionsView: React.FC = () => {
  const { 
    actions, 
    toggleAction, 
    updateAction, 
    currentCompany, 
    setIsQuickTestOpen
  } = useApp();

  const [selectedAction, setSelectedAction] = useState<ActionDefinition | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [testExecutionResult, setTestExecutionResult] = useState<{ id: string; msg: string } | null>(null);

  const handleToggle = (id: string) => {
    toggleAction(id);
  };

  const handleTestSimulate = (action: ActionDefinition) => {
    setTestExecutionResult({
      id: action.id,
      msg: `Simulation Succeeded: ${action.successMessageTemplate.replace('{clusterId}', 'cls-prod-9941').replace('{email}', 'test@company.io').replace('{preferredDate}', 'Tomorrow 3 PM').replace('{randomId}', '9401').replace('{name}', 'Demo User')}`
    });
    setTimeout(() => setTestExecutionResult(null), 5000);
  };

  const handleSaveAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAction) return;
    updateAction(selectedAction.id, selectedAction);
    setIsEditModalOpen(false);
  };

  const enabledCount = actions.filter(a => a.enabled).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Approved Agent Actions Catalog</h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Hierarchy Level 5
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pre-built, permission-checked tools <strong>{currentCompany.agent.name}</strong> can execute during customer conversations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsQuickTestOpen(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Test Actions in Sandbox</span>
          </button>
        </div>
      </div>

      {/* High-Risk Action Guardrails Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-amber-950">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 border border-amber-300">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-amber-950">Interactive Action Confirmation Guards</h4>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Actions marked as <strong>High Risk</strong> or <strong>Requires Confirmation</strong> will always render an interactive approval card before making account changes.
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-amber-200/70 text-amber-900 rounded-lg shrink-0">
          {enabledCount} of {actions.length} Tools Enabled
        </span>
      </div>

      {/* Actions Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {actions.map(action => {
          const isSimulating = testExecutionResult?.id === action.id;

          return (
            <div
              key={action.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                action.enabled 
                  ? 'border-slate-300 ring-1 ring-slate-200' 
                  : 'border-slate-200 opacity-70 hover:opacity-100'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900">{action.name}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        action.riskLevel === 'high' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        action.riskLevel === 'medium' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {action.riskLevel} Risk
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 mt-0.5 block">{action.code}()</span>
                  </div>

                  <button
                    onClick={() => handleToggle(action.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                      action.enabled
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {action.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                  {action.description}
                </p>

                {/* Schema & Confirmation Details */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-[11px] space-y-2 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Confirmation Guard:</span>
                    <span className={`font-semibold ${action.requiresUserConfirmation ? 'text-amber-700 flex items-center gap-1' : 'text-slate-600'}`}>
                      {action.requiresUserConfirmation ? (
                        <>
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>Explicit User Confirmation</span>
                        </>
                      ) : (
                        'Autonomous Execution'
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Provider Service:</span>
                    <span className="font-semibold text-slate-700">{action.integrationProvider || 'AaaS Engine'}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-medium block mb-1">Required Parameters ({action.parameters.length}):</span>
                    <div className="flex flex-wrap gap-1">
                      {action.parameters.map((p, pIdx) => (
                        <span key={pIdx} className="font-mono text-[10px] px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-700">
                          {p.name}: <i>{p.type}</i> {p.required && <strong className="text-rose-500">*</strong>}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {isSimulating && testExecutionResult && (
                  <div className="p-2.5 mb-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 animate-in fade-in">
                    {testExecutionResult.msg}
                  </div>
                )}
              </div>

              {/* Bottom bar */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 font-mono">
                  Executed <strong>{action.executionCount}</strong> times
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTestSimulate(action)}
                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Play className="w-3 h-3" />
                    <span>Simulate</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedAction(action);
                      setIsEditModalOpen(true);
                    }}
                    className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span>Edit Schema</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Action Modal */}
      {isEditModalOpen && selectedAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">Edit Action: {selectedAction.name}</h3>
            <p className="text-xs text-slate-500 mb-4">Configure execution permissions and user confirmation prompts.</p>

            <form onSubmit={handleSaveAction} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Action Name</label>
                <input
                  type="text"
                  value={selectedAction.name}
                  onChange={(e) => setSelectedAction({ ...selectedAction, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description for AI Tool Selector</label>
                <textarea
                  rows={2}
                  value={selectedAction.description}
                  onChange={(e) => setSelectedAction({ ...selectedAction, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>

              {/* Risk & Confirmation */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Risk Level</label>
                  <select
                    value={selectedAction.riskLevel}
                    onChange={(e) => setSelectedAction({ ...selectedAction, riskLevel: e.target.value as ActionRiskLevel })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Risk</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Confirmation Requirement</label>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="conf-check"
                      checked={selectedAction.requiresUserConfirmation}
                      onChange={(e) => setSelectedAction({ ...selectedAction, requiresUserConfirmation: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <label htmlFor="conf-check" className="text-xs font-semibold text-slate-700">Require User Approval</label>
                  </div>
                </div>
              </div>

              {selectedAction.requiresUserConfirmation && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Confirmation Prompt Template</label>
                  <input
                    type="text"
                    value={selectedAction.confirmationPrompt || ''}
                    onChange={(e) => setSelectedAction({ ...selectedAction, confirmationPrompt: e.target.value })}
                    placeholder="e.g. Would you like me to book {service} for {email}?"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Success Response Template</label>
                <input
                  type="text"
                  value={selectedAction.successMessageTemplate}
                  onChange={(e) => setSelectedAction({ ...selectedAction, successMessageTemplate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                />
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
                  Save Action Schema
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
