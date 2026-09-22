import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Trash2, Info, CheckCircle2, ShieldAlert, X } from 'lucide-react';
import { ActiveDialogState } from '../lib/dialogService';

export const GlobalConfirmationModal: React.FC = () => {
  const [activeDialog, setActiveDialog] = useState<ActiveDialogState | null>(null);

  useEffect(() => {
    const handleShowDialog = (e: any) => {
      if (e.detail) {
        setActiveDialog(e.detail);
      }
    };

    window.addEventListener('siteops_show_confirm_dialog', handleShowDialog);
    return () => {
      window.removeEventListener('siteops_show_confirm_dialog', handleShowDialog);
    };
  }, []);

  const handleConfirm = useCallback(() => {
    if (activeDialog) {
      activeDialog.resolve(true);
      setActiveDialog(null);
    }
  }, [activeDialog]);

  const handleCancel = useCallback(() => {
    if (activeDialog) {
      activeDialog.resolve(false);
      setActiveDialog(null);
    }
  }, [activeDialog]);

  // Keyboard navigation (Enter to confirm, Escape to cancel)
  useEffect(() => {
    if (!activeDialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDialog, handleCancel, handleConfirm]);

  if (!activeDialog) return null;

  const variant = activeDialog.variant || (activeDialog.icon === 'trash' ? 'danger' : 'primary');
  const confirmText = activeDialog.confirmText || (variant === 'danger' ? 'Delete' : 'Confirm');
  const cancelText = activeDialog.cancelText !== undefined ? activeDialog.cancelText : 'Cancel';
  const showCancel = cancelText !== '';

  const getIcon = () => {
    if (activeDialog.icon === 'trash' || variant === 'danger') {
      return (
        <div className="w-12 h-12 rounded-2xl bg-rose-100/80 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 shadow-inner">
          <Trash2 className="w-6 h-6" />
        </div>
      );
    }
    if (variant === 'warning' || activeDialog.icon === 'alert') {
      return (
        <div className="w-12 h-12 rounded-2xl bg-amber-100/80 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 shadow-inner">
          <AlertTriangle className="w-6 h-6" />
        </div>
      );
    }
    if (variant === 'info' || activeDialog.icon === 'info') {
      return (
        <div className="w-12 h-12 rounded-2xl bg-sky-100/80 border border-sky-200 text-sky-600 flex items-center justify-center shrink-0 shadow-inner">
          <Info className="w-6 h-6" />
        </div>
      );
    }
    return (
      <div className="w-12 h-12 rounded-2xl bg-red-100/80 border border-red-200 text-brand flex items-center justify-center shrink-0 shadow-inner">
        <ShieldAlert className="w-6 h-6" />
      </div>
    );
  };

  const getConfirmButtonClasses = () => {
    if (variant === 'danger') {
      return 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-200 focus:ring-rose-500';
    }
    if (variant === 'warning') {
      return 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-200 focus:ring-amber-500';
    }
    if (variant === 'info') {
      return 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm shadow-sky-200 focus:ring-sky-500';
    }
    return 'bg-brand hover:bg-brand-dark text-white shadow-sm shadow-red-200 focus:ring-red-500';
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar Accent */}
        <div className={`h-1.5 w-full ${
          variant === 'danger' ? 'bg-rose-600' :
          variant === 'warning' ? 'bg-amber-500' :
          variant === 'info' ? 'bg-sky-500' :
          'bg-brand'
        }`} />

        <div className="p-6">
          <div className="flex items-start gap-4">
            {getIcon()}

            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                {activeDialog.title || (variant === 'danger' ? 'Confirm Action' : 'Notification')}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 whitespace-pre-line font-medium">
                {activeDialog.message}
              </p>
            </div>

            {showCancel && (
              <button
                onClick={handleCancel}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer -mt-1 -mr-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            {showCancel && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-slate-400"
              >
                {cancelText}
              </button>
            )}

            <button
              type="button"
              onClick={handleConfirm}
              autoFocus
              className={`px-5 py-2 text-xs font-semibold rounded-xl transition cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-offset-2 ${getConfirmButtonClasses()}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
