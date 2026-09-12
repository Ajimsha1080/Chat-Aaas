import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react';

export interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  resourceName: string;
  resourceType?: string;
  isPermanent?: boolean;
  consequences?: string[];
  dependencies?: string[];
  confirmText?: string;
  destructiveActionLabel?: string;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  resourceName,
  resourceType = 'resource',
  isPermanent = false,
  consequences = [
    'Remove it from AI retrieval',
    'Remove associated vector chunks & embeddings',
    isPermanent ? 'Permanently purge all data from storage' : 'Move it to Trash with 30-day retention'
  ],
  dependencies = [],
  confirmText = isPermanent ? 'DELETE PERMANENTLY' : 'DELETE',
  destructiveActionLabel = isPermanent ? 'Delete Permanently' : 'Move to Trash'
}) => {
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const isConfirmed = typedConfirmation.trim() === confirmText;

  const handleConfirm = async () => {
    if (!isConfirmed || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm();
      setTypedConfirmation('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isPermanent ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'
            }`}>
              {isPermanent ? <Trash2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h3 id="modal-title" className="text-lg font-bold text-slate-900 tracking-tight">
                {title}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5 truncate max-w-sm">
                {resourceName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5 text-sm">
          {/* Active Dependencies Warning if any */}
          {dependencies.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Active Dependencies Detected</span>
              </div>
              <p className="text-xs text-amber-800">
                This {resourceType} is currently active and serving:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs text-amber-900 font-medium pl-1">
                {dependencies.map((dep, idx) => (
                  <li key={idx}>{dep}</li>
                ))}
              </ul>
              <p className="text-xs text-amber-800 pt-1 font-medium">
                Disabling or deleting this resource will immediately stop responses on these connected channels.
              </p>
            </div>
          )}

          {/* Consequences List */}
          <div>
            <p className="text-slate-700 font-semibold mb-2 text-xs uppercase tracking-wider">
              {isPermanent ? 'Irreversible Action Consequences:' : 'Deleting this resource will:'}
            </p>
            <ul className="space-y-2 text-slate-600 text-xs sm:text-sm">
              {consequences.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-slate-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Confirmation Input */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Type <strong className="text-slate-900 font-mono font-bold select-all bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{confirmText}</strong> to confirm:
            </label>
            <input
              type="text"
              value={typedConfirmation}
              onChange={e => setTypedConfirmation(e.target.value)}
              placeholder={`Type "${confirmText}"`}
              className="w-full p-2.5 sm:p-3 border border-slate-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isConfirmed || isSubmitting}
            className={`px-4.5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${
              isPermanent
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Processing...' : destructiveActionLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
