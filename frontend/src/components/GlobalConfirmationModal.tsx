import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Trash2, Info, CheckCircle2, ShieldAlert, X, LogOut, HelpCircle } from 'lucide-react';
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

  const variant = activeDialog.variant || (activeDialog.icon === 'trash' ? 'danger' : activeDialog.icon === 'logout' ? 'auth' : 'primary');
  const confirmText = activeDialog.confirmText || (variant === 'danger' ? 'Delete' : variant === 'auth' ? 'Sign Out' : 'Confirm');
  const cancelText = activeDialog.cancelText !== undefined ? activeDialog.cancelText : 'Cancel';
  const showCancel = cancelText !== '';

  const getIcon = () => {
    if (activeDialog.icon === 'logout' || variant === 'auth') {
      return (
        <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100/80 text-[#C61D45] flex items-center justify-center shrink-0 shadow-xs">
          <LogOut className="w-5 h-5 ml-0.5 stroke-[2.2]" />
        </div>
      );
    }
    if (activeDialog.icon === 'trash' || variant === 'danger') {
      return (
        <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-100/80 text-red-600 flex items-center justify-center shrink-0 shadow-xs">
          <Trash2 className="w-5 h-5 stroke-[2.2]" />
        </div>
      );
    }
    if (variant === 'warning' || activeDialog.icon === 'alert') {
      return (
        <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100/80 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
          <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
        </div>
      );
    }
    if (activeDialog.icon === 'check') {
      return (
        <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100/80 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
          <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
        </div>
      );
    }
    if (variant === 'info' || activeDialog.icon === 'info') {
      return (
        <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-100/80 text-sky-600 flex items-center justify-center shrink-0 shadow-xs">
          <Info className="w-5 h-5 stroke-[2.2]" />
        </div>
      );
    }
    if (activeDialog.icon === 'help') {
      return (
        <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100/80 text-indigo-600 flex items-center justify-center shrink-0 shadow-xs">
          <HelpCircle className="w-5 h-5 stroke-[2.2]" />
        </div>
      );
    }
    return (
      <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-700 flex items-center justify-center shrink-0 shadow-xs">
        <ShieldAlert className="w-5 h-5 stroke-[2.2]" />
      </div>
    );
  };

  const getConfirmButtonClasses = () => {
    if (variant === 'auth') {
      return 'bg-[#C61D45] hover:bg-[#B0183C] active:bg-[#991434] text-white shadow-xs focus:ring-[#C61D45]';
    }
    if (variant === 'danger') {
      return 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs focus:ring-rose-500';
    }
    if (variant === 'warning') {
      return 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-xs focus:ring-amber-500';
    }
    if (variant === 'info') {
      return 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white shadow-xs focus:ring-sky-500';
    }
    return 'bg-[#C61D45] hover:bg-[#B0183C] text-white shadow-xs focus:ring-[#C61D45]';
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-[420px] bg-white rounded-2xl shadow-xl border border-slate-200/80 p-5 sm:p-6 overflow-hidden transform transition-all animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          {getIcon()}

          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">
              {activeDialog.title || (variant === 'danger' ? 'Confirm Action' : variant === 'auth' ? 'Sign Out' : 'Notification')}
            </h3>
            <p className="mt-1 text-xs sm:text-[13px] leading-relaxed text-slate-500 whitespace-pre-line font-normal">
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
              className="px-4 py-2 text-xs sm:text-[13px] font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 rounded-xl transition cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-slate-300"
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            autoFocus
            className={`px-4.5 py-2 text-xs sm:text-[13px] font-semibold rounded-xl transition cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-offset-2 active:scale-[0.98] inline-flex items-center gap-1.5 ${getConfirmButtonClasses()}`}
          >
            {variant === 'auth' && <LogOut className="w-3.5 h-3.5 ml-0.5 stroke-[2.2]" />}
            {variant === 'danger' && activeDialog.icon === 'trash' && <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
