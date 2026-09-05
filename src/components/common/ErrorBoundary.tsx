import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-slate-100">
          <div className="max-w-xl w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="flex items-center space-x-3 text-red-400">
              <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Something went wrong</h1>
                <p className="text-sm text-slate-400">An unexpected application error occurred.</p>
              </div>
            </div>

            {this.state.error && (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-red-300 overflow-x-auto max-h-48">
                <p className="font-semibold">{this.state.error.toString()}</p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="mt-2 text-slate-500 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex items-center space-x-4">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>
              <button
                onClick={() => {
                  window.location.href = '/';
                }}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-xl transition cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Go to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
