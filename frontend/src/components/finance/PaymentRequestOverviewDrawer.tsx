import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Pencil, MoreVertical, CheckCircle2, ChevronDown, 
  Receipt, Download, Printer, Trash2, Check, Clock, AlertCircle
} from 'lucide-react';
import { PaymentRequestItem } from '../../views/AccountsFinanceView';

interface PaymentRequestOverviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  request: PaymentRequestItem | null;
  onStatusChange?: (id: string, newStatus: 'Unpaid' | 'Paid' | 'On Hold') => void;
  onRecordPayment?: (request: PaymentRequestItem) => void;
  onEdit?: (request: PaymentRequestItem) => void;
  onDelete?: (id: string) => void;
}

export const PaymentRequestOverviewDrawer: React.FC<PaymentRequestOverviewDrawerProps> = ({
  isOpen,
  onClose,
  request,
  onStatusChange,
  onRecordPayment,
  onEdit,
  onDelete
}) => {
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
        setIsStatusMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    if (isStatusMenuOpen || isMoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isStatusMenuOpen, isMoreMenuOpen]);

  if (!isOpen || !request) return null;

  // Format voucher code (e.g. "#-7" or "#7")
  const displayCode = request.requestCode.startsWith('#') 
    ? request.requestCode 
    : `#${request.requestCode}`;

  // Current normalized status
  const currentStatus: 'Unpaid' | 'Paid' | 'On Hold' = 
    request.status === 'Paid' ? 'Paid' :
    request.status === 'On Hold' ? 'On Hold' : 'Unpaid';

  const handleSelectStatus = (status: 'Unpaid' | 'Paid' | 'On Hold') => {
    setIsStatusMenuOpen(false);
    onStatusChange?.(request.id, status);
  };

  const handleRecordPayment = () => {
    if (onRecordPayment) {
      onRecordPayment(request);
    } else {
      onStatusChange?.(request.id, 'Paid');
    }
  };

  // Against string
  const againstText = request.category 
    ? (request.category.startsWith('Against') || request.category.startsWith('Payment against') || request.category.startsWith('Advance') 
        ? request.category 
        : `Against ${request.category}`)
    : (request.subProjectText || 'Against Petty Cash');

  // Due date display
  const dueDateDisplay = request.dueDate || request.date || '09 Oct, 2026';

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 rounded-l-3xl rounded-l-drawer overflow-y-auto overflow-x-hidden animate-in slide-in-from-right duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* TOP SECTION */}
        <div>
          {/* Header Bar matching Image 4 */}
          <div className="px-6 py-4 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={onClose}
                className="p-1 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
              <h2 className="text-xs font-bold tracking-wider text-slate-900 uppercase">
                PAYMENT REQUEST
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {/* Edit Button with pencil icon */}
              <button
                type="button"
                onClick={() => onEdit?.(request)}
                className="w-8 h-8 rounded-lg border border-slate-200 hover:border-red-400 hover:text-red-600 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                title="Edit Request"
              >
                <Pencil className="w-4 h-4 stroke-[2]" />
              </button>

              {/* More Actions Menu */}
              <div className="relative" ref={moreMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  className="w-8 h-8 rounded-lg border border-slate-200 hover:border-red-400 hover:text-red-600 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                  title="More actions"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {isMoreMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150">
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          window.print();
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-400" />
                        Print Request
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          // Trigger quick download
                          const content = `Payment Request: ${displayCode}\nParty: ${request.partyName}\nAmount: ₹${request.amount}\nStatus: ${currentStatus}\nProject: ${request.projectName}\nDue Date: ${dueDateDisplay}`;
                          const blob = new Blob([content], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `Payment_Request_${displayCode.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-400" />
                        Download Summary
                      </button>
                    </div>
                    {onDelete && (
                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsMoreMenuOpen(false);
                            if (confirm(`Delete payment request ${displayCode}?`)) {
                              onDelete(request.id);
                              onClose();
                            }
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer font-medium"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          Delete Request
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Accent Line under Header */}
          <div className="h-1 bg-red-600 w-full" />

          {/* Main Card Content */}
          <div className="p-6 space-y-5">
            {/* Voucher Code Header (matching Image 4: e.g. "#-7") */}
            <div className="pb-4 border-b border-slate-100">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
                {displayCode}
              </h1>
            </div>

            {/* Row 1: Amount with Interactive Status Badge & Dropdown (Image 4) */}
            <div className="pb-4 border-b border-slate-100 flex items-center justify-between relative" ref={statusMenuRef}>
              <div>
                <span className="text-xs text-slate-400 font-medium block">Amount</span>
                <span className="text-sm font-semibold text-slate-900 block mt-0.5">
                  ₹ {request.amount.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Status Badge Dropdown Trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase border flex items-center gap-1 transition-all cursor-pointer ${
                    currentStatus === 'Paid'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                      : currentStatus === 'On Hold'
                      ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                      : 'bg-rose-50 text-rose-600 border-rose-300 hover:bg-rose-100'
                  }`}
                >
                  <span>{currentStatus}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${isStatusMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Status Dropdown Menu (Exact match to Image 4) */}
                {isStatusMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-32 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100">
                    {(['Unpaid', 'Paid', 'On Hold'] as const).map((statusOption) => (
                      <button
                        key={statusOption}
                        type="button"
                        onClick={() => handleSelectStatus(statusOption)}
                        className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                          currentStatus === statusOption 
                            ? 'bg-red-50/70 text-red-600 font-bold' 
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{statusOption}</span>
                        {currentStatus === statusOption && (
                          <Check className="w-3.5 h-3.5 text-red-600" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Due Date (Image 4) */}
            <div className="pb-4 border-b border-slate-100">
              <span className="text-xs text-slate-400 font-medium block">Due Date</span>
              <span className="text-sm font-semibold text-slate-900 block mt-0.5">
                {dueDateDisplay}
              </span>
            </div>

            {/* Row 3: Party (Image 4) */}
            <div className="pb-4 border-b border-slate-100">
              <span className="text-xs text-slate-400 font-medium block">Party</span>
              <span className="text-sm font-semibold text-slate-900 block mt-0.5">
                {request.partyName}
              </span>
            </div>

            {/* Row 4: Against (Image 4) */}
            <div className="pb-4 border-b border-slate-100">
              <span className="text-xs text-slate-400 font-medium block">Against</span>
              <span className="text-sm font-semibold text-slate-900 block mt-0.5">
                {againstText}
              </span>
            </div>

            {/* Row 4.5: Approval Routing & Authorization */}
            <div className="pb-4 border-b border-slate-100">
              <span className="text-xs text-slate-400 font-medium block">Approval Routing</span>
              <div className="mt-1 flex items-center gap-2">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                  request.amount > 2000
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {request.amount > 2000 ? 'Admin & Super Admin (> ₹2,000)' : 'Admin Only (≤ ₹2,000)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {request.amount > 2000
                  ? 'High-value request automatically routed to both Admin and Super Admin for dual authorization.'
                  : 'Standard payment request routed only to Admin. Super Admin notification bypassed.'}
              </p>
            </div>

            {/* Row 5: Entry by Details (Image 4) */}
            <div className="pt-1 text-xs space-y-1">
              <div className="font-semibold text-slate-800">
                Entry by: {request.entryBy || 'Managing Director - 3 - Nivedhitha Arumugam'}
              </div>
              <div className="text-slate-500">
                Project: {request.projectName}
              </div>
              <div className="text-slate-500">
                Date: {request.date || '04 Oct, 2026'}
              </div>
              {request.notes && (
                <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-[11px] text-slate-600">
                  <span className="font-bold text-slate-700 block mb-0.5">Notes:</span>
                  {request.notes}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Sawtooth receipt tear effect + Action bar */}
        <div>
          {/* Sawtooth / Perforation SVG matching receipt edge in Image 4 */}
          <div className="w-full overflow-hidden leading-none select-none pointer-events-none">
            <svg 
              className="w-full h-3 text-slate-100 fill-current" 
              preserveAspectRatio="none" 
              viewBox="0 0 120 12"
            >
              <path d="M0 12 L6 0 L12 12 L18 0 L24 12 L30 0 L36 12 L42 0 L48 12 L54 0 L60 12 L66 0 L72 12 L78 0 L84 12 L90 0 L96 12 L102 0 L108 12 L114 0 L120 12 Z" />
            </svg>
          </div>

          {/* Action Footer (matching Image 4) */}
          <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-between">
            {/* Left: Approved / Status indicator */}
            <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold tracking-wide select-none">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>APPROVED</span>
            </div>

            {/* Right: Record Payment Button (Red Brand Theme) */}
            <button
              type="button"
              onClick={handleRecordPayment}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
