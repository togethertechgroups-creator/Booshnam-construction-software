import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import notFoundIllustration from '../assets/404-error.png';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
          {/* 404 / Error Illustration matching template */}
          <div className="max-w-md w-full mb-3 overflow-hidden">
            <img 
              src={notFoundIllustration} 
              alt="Oops... 404 Not Found" 
              className="w-full h-auto object-contain mx-auto max-h-[340px] drop-shadow-sm select-none pointer-events-none"
              onError={(e) => {
                const target = e.currentTarget;
                target.src = '/404-error.png';
              }}
            />
          </div>

          {/* Contextual Description */}
          <div className="space-y-2 mb-6 max-w-lg">
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              The requested page, link, or site resource encountered an unexpected error or has been disconnected.
            </p>

            {this.state.error?.message && (
              <div className="mt-3 p-3 bg-red-50/80 border border-red-100 rounded-xl text-left inline-block text-xs text-red-800 max-w-lg">
                <div className="flex items-center gap-1.5 font-bold mb-1 text-red-700">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>Error Diagnostics:</span>
                </div>
                <p className="text-[11px] text-red-600 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons in Red & White Theme */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Page</span>
            </button>

            <button
              type="button"
              onClick={this.handleGoHome}
              className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 active:scale-95 text-slate-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-2xs"
            >
              <Home className="w-4 h-4 text-slate-600" />
              <span>Go to Dashboard</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
