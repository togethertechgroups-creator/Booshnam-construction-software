import React from 'react';
import { Home, CheckCircle } from 'lucide-react';
import { Http404Details } from '../../lib/errorService';
import notFoundIllustration from '../../assets/404-error.png';

interface NotFound404ViewProps {
  errorDetails?: Http404Details | null;
  onClearError?: () => void;
  onNavigateHome?: () => void;
  isOverlay?: boolean;
}

export const NotFound404View: React.FC<NotFound404ViewProps> = ({
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

  const content = (
    <div className="flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto animate-in fade-in zoom-in-95 duration-200">
      {/* 404 Illustration - seamless blend with no white block borders */}
      <div className="relative mb-6 max-w-md w-full flex items-center justify-center">
        <img 
          src={notFoundIllustration || "/404-error.png"} 
          alt="404 Not Found" 
          className="w-full h-auto object-contain mx-auto max-h-[340px] select-none pointer-events-none mix-blend-multiply"
          onError={(e) => {
            const target = e.currentTarget;
            target.src = '/404-error.png';
          }}
        />
      </div>

      {/* Title & Subtitle */}
      <div className="space-y-2 mb-8">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Page or Resource Not Found
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          The requested page, link, or site resource does not exist or has been temporarily disconnected.
        </p>
      </div>

      {/* Action Buttons: Only Clear Error & Continue and Go to Dashboard */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        {/* Clear Error & Continue Button */}
        <button
          type="button"
          onClick={handleClear}
          className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4 stroke-[2.5]" />
          <span>Clear Error & Continue</span>
        </button>

        {/* Go to Dashboard Button */}
        <button
          type="button"
          onClick={handleHome}
          className="px-6 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 active:scale-95 text-slate-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-2xs"
        >
          <Home className="w-4 h-4 text-slate-600" />
          <span>Go to Dashboard</span>
        </button>
      </div>
    </div>
  );

  if (isOverlay) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden py-8">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full min-h-[80vh] flex items-center justify-center bg-white">
      {content}
    </div>
  );
};
