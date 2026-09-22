import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  message: string;
  title?: string;
  type?: 'success' | 'warning' | 'error' | 'info';
  duration?: number;
}

export const GlobalToastNotification: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleToastEvent = (e: any) => {
      if (!e.detail) return;
      const detail = e.detail;
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      
      const newToast: ToastItem = typeof detail === 'string' 
        ? { id, message: detail, type: 'success' }
        : {
            id,
            message: detail.message || String(detail),
            title: detail.title,
            type: detail.type || 'success',
            duration: detail.duration || 4000
          };

      setToasts(prev => [...prev.slice(-3), newToast]); // Keep up to 4 toasts max

      const timer = setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, newToast.duration || 4000);

      return () => clearTimeout(timer);
    };

    window.addEventListener('siteops_toast', handleToastEvent);
    return () => window.removeEventListener('siteops_toast', handleToastEvent);
  }, []);

  const handleDismiss = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[99998] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        const type = toast.type || 'success';
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 p-4 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-700/80 transition-all transform animate-in slide-in-from-top-4 sm:slide-in-from-right-4 duration-200"
          >
            <div className="shrink-0 mt-0.5">
              {type === 'success' && (
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
              {type === 'warning' && (
                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              )}
              {type === 'error' && (
                <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
              )}
              {type === 'info' && (
                <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Info className="w-4 h-4" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              {toast.title && (
                <div className="text-xs font-bold text-white tracking-tight mb-0.5">
                  {toast.title}
                </div>
              )}
              <div className="text-xs font-medium text-slate-200 leading-snug">
                {toast.message}
              </div>
            </div>

            <button
              onClick={() => handleDismiss(toast.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer shrink-0 -mt-1 -mr-1"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
