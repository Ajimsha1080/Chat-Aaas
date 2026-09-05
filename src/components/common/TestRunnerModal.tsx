/**
 * Automated Test Suite Runner Modal
 * 
 * Runs end-to-end backend tests for multi-tenancy isolation, SSRF crawler protection,
 * prompt injection defense, agent version rollback, tool execution confirmation guards,
 * and anti-hallucination policies.
 */

import React, { useState } from 'react';
import { 
  X, 
  Play, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Terminal, 
  ShieldCheck, 
  Sparkles,
  Clock
} from 'lucide-react';
import { APIClient, TestResult } from '../../api/apiClient';

interface TestRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestRunnerModal: React.FC<TestRunnerModalProps> = ({ isOpen, onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<{ total: number; passed: number; failed: number; durationMs: number } | null>(null);

  if (!isOpen) return null;

  const handleRunTests = async () => {
    setIsRunning(true);
    try {
      const data = await APIClient.runAutomatedTests();
      setResults(data.results);
      setSummary(data.summary);
    } catch (err) {
      console.error('Test execution failed:', err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-slate-950 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-800 text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Automated Backend Test Suite</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Production Test Runner
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Executes multi-tenancy isolation, SSRF security, prompt injection, and agent reasoning tests.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action & Status Bar */}
        <div className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs font-mono">
            {summary ? (
              <>
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" /> {summary.passed} Passed
                </span>
                {summary.failed > 0 && (
                  <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                    <XCircle className="w-4 h-4" /> {summary.failed} Failed
                  </span>
                )}
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {summary.durationMs}ms
                </span>
              </>
            ) : (
              <span className="text-slate-400">Click "Run Test Suite" to execute all tests.</span>
            )}
          </div>

          <button
            onClick={handleRunTests}
            disabled={isRunning}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/30"
          >
            {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>{isRunning ? 'Running Tests...' : 'Run Test Suite'}</span>
          </button>
        </div>

        {/* Test Results Output */}
        <div className="flex-1 overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl p-4 font-mono text-xs space-y-2">
          {results.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <ShieldCheck className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p>No tests executed yet.</p>
              <p className="text-[11px] text-slate-600">Run tests to verify tenant isolation, SSRF guards, and anti-hallucination policies.</p>
            </div>
          ) : (
            results.map((r, idx) => (
              <div 
                key={idx} 
                className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                  r.status === 'passed' 
                    ? 'bg-slate-950/60 border-emerald-900/40 text-slate-200' 
                    : 'bg-rose-950/40 border-rose-900/60 text-rose-200'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {r.status === 'passed' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="text-[10px] text-indigo-400 font-bold uppercase">{r.suite}</span>
                    <p className="font-semibold text-xs mt-0.5 text-white">{r.testName}</p>
                    {r.error && (
                      <p className="text-[11px] text-rose-400 mt-1 bg-rose-950/80 p-2 rounded border border-rose-800">
                        {r.error}
                      </p>
                    )}
                  </div>
                </div>

                <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                  {r.durationMs}ms
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Strict Single-Agent Security Enforcement Engine</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
