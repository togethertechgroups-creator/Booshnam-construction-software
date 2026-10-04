import React from 'react';
import { Home, ArrowLeft, RefreshCw, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { Http404Details } from '../../lib/errorService';
import notFoundIllustration from '../../assets/404-error.png';

interface NotFound404ViewProps {
  errorDetails?: Http404Details | null;
  onClearError?: () => void;
  onNavigateHome?: () => void;
  isOverlay?: boolean;
}

export const NotFound404View: React.FC<NotFound404ViewProps> = ({
  errorDetails,
  onClearError,
  onNavigateHome,
  isOverlay = false
}) => {
  const handleClear = () => {
    if (onClearError) {
      onClearError();
    }
  };

  const handleHome = () => {
    if (onClearError) onClearError();
    if (onNavigateHome) onNavigateHome();
  };

  const handleReload = () => {
    window.location.reload();
  };

  const content = (
    <div className="flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto animate-in fade-in zoom-in-95 duration-200">
      {/* 404 Illustration from user upload */}
      <div className="relative mb-6 max-w-md w-full overflow-hidden rounded-2xl">
        <img 
          src={notFoundIllustration || "/404-error.png"} 
          alt="404 Not Found" 
          className="w-full h-auto object-contain mx-auto max-h-[340px] drop-shadow-sm select-none pointer-events-none"
          onError={(e) => {
            // Fallback if asset isn't resolved
            const target = e.currentTarget;
            target.src = '/404-error.png';
          }}
        />
      </div>

      {/* Contextual Description */}
      <div className="space-y-2 mb-6">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Page or Resource Not Found
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          The requested page, link, or site resource does not exist or has been temporarily disconnected.
        </p>

        {errorDetails && (
          <div className="mt-3 p-3 bg-red-50/80 border border-red-100 rounded-xl text-left inline-block text-xs text-red-800 max-w-lg">
            <div className="flex items-center gap-2 font-bold mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>404 Error Diagnostics:</span>
            </div>
            {errorDetails.resourceName && (
              <p className="truncate text-[11px] text-red-700">
                <span className="font-semibold text-slate-700">Target:</span> {errorDetails.resourceName}
              </p>
            )}
            {errorDetails.message && (
              <p className="text-[11px] text-red-600 mt-0.5 break-all">
                {errorDetails.message}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons in Red & White Theme */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        {/* Clear Error Button */}
        <button
          type="button"
          onClick={handleClear}
          className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4 stroke-[2.5]" />
          <span>Clear Error & Continue</span>
        </button>

        {/* Home / Dashboard Button */}
        <button
          type="button"
          onClick={handleHome}
          className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 active:scale-95 text-slate-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-2xs"
        >
          <Home className="w-4 h-4 text-slate-600" />
          <span>Go to Dashboard</span>
        </button>

        {/* Reload Button */}
        <button
          type="button"
          onClick={handleReload}
          className="p-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 active:scale-95 text-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
          title="Reload Page"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  if (isOverlay) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden py-4">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full min-h-[80vh] flex items-center justify-center bg-[#f8fafc]">
      {content}
    </div>
  );
};
