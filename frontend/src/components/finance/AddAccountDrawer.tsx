import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export interface AccountFormData {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  bankAddress: string;
  ibanNumber: string;
  upiNumber: string;
  openingBalance: number;
  overdraftLimit: number;
}

interface AddAccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAccount: (account: AccountFormData) => void;
}

export const AddAccountDrawer: React.FC<AddAccountDrawerProps> = ({
  isOpen,
  onClose,
  onSaveAccount,
}) => {
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAddress, setBankAddress] = useState('');
  const [ibanNumber, setIbanNumber] = useState('');
  const [upiNumber, setUpiNumber] = useState('');
  const [openingBalance, setOpeningBalance] = useState<string>('');
  const [overdraftLimit, setOverdraftLimit] = useState<string>('');

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset form when drawer opens
  useEffect(() => {
    if (isOpen) {
      setAccountHolderName('');
      setAccountNumber('');
      setIfscCode('');
      setBankName('');
      setBankAddress('');
      setIbanNumber('');
      setUpiNumber('');
      setOpeningBalance('');
      setOverdraftLimit('');
      setErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!accountHolderName.trim()) {
      newErrors.accountHolderName = 'Account holder name is required';
    }

    if (!accountNumber.trim()) {
      newErrors.accountNumber = 'Account number is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload: AccountFormData = {
      accountHolderName: accountHolderName.trim(),
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.trim().toUpperCase(),
      bankName: bankName.trim(),
      bankAddress: bankAddress.trim(),
      ibanNumber: ibanNumber.trim(),
      upiNumber: upiNumber.trim(),
      openingBalance: parseFloat(openingBalance) || 0,
      overdraftLimit: parseFloat(overdraftLimit) || 0,
    };

    onSaveAccount(payload);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-in fade-in duration-200">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div className="relative w-full max-w-[480px] sm:max-w-[520px] bg-white shadow-2xl z-10 flex flex-col h-full transform transition-transform duration-200 ease-out border-l border-slate-200">
        
        {/* Top Header with increased height and comfortable breathing room */}
        <div className="px-6 sm:px-8 py-5 sm:py-6 bg-white flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <button
              type="button"
              onClick={onClose}
              className="text-slate-600 hover:text-slate-900 p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center shrink-0"
              title="Close"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-wider uppercase select-none">
              ADD NEW ACCOUNT
            </h2>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-6 py-2.5 text-xs sm:text-sm font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>

        {/* Accent Bar below header */}
        <div className="h-[3px] bg-red-600 w-full shrink-0" />

        {/* Form Body with Sleeker Box Heights and Generous Left Spacing */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 sm:px-8 pt-7 sm:pt-8 pb-12 space-y-5 text-xs sm:text-sm">

          {/* 1. ACCOUNT HOLDER NAME: */}
          <div>
            <div className={`relative border rounded-xl pl-5 pr-4 h-11 sm:h-[46px] flex items-center transition-all bg-white group ${
              errors.accountHolderName
                ? 'border-red-500 ring-1 ring-red-500'
                : 'border-slate-300 hover:border-slate-400 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500'
            }`}>
              <span className="absolute -top-2.5 left-5 bg-white px-2 text-[10px] sm:text-[11px] font-bold text-slate-400 group-focus-within:text-red-600 tracking-wider uppercase select-none transition-colors">
                ACCOUNT HOLDER NAME:
              </span>
              <input
                type="text"
                value={accountHolderName}
                onChange={e => {
                  setAccountHolderName(e.target.value);
                  if (errors.accountHolderName) setErrors(prev => ({ ...prev, accountHolderName: '' }));
                }}
                placeholder=""
                className="w-full text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none bg-transparent pl-1"
              />
            </div>
            {errors.accountHolderName && (
              <p className="text-[11px] text-red-500 mt-1.5 pl-3 font-medium">{errors.accountHolderName}</p>
            )}
          </div>

          {/* 2. ACCOUNT NUMBER: */}
          <div>
            <div className={`relative border rounded-xl pl-5 pr-4 h-11 sm:h-[46px] flex items-center transition-all bg-white group ${
              errors.accountNumber
                ? 'border-red-500 ring-1 ring-red-500'
                : 'border-slate-300 hover:border-slate-400 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500'
            }`}>
              <span className="absolute -top-2.5 left-5 bg-white px-2 text-[10px] sm:text-[11px] font-bold text-slate-400 group-focus-within:text-red-600 tracking-wider uppercase select-none transition-colors">
                ACCOUNT NUMBER:
              </span>
              <input
                type="text"
                value={accountNumber}
                onChange={e => {
                  setAccountNumber(e.target.value);
                  if (errors.accountNumber) setErrors(prev => ({ ...prev, accountNumber: '' }));
                }}
                placeholder=""
                className="w-full text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none bg-transparent pl-1 font-mono"
              />
            </div>
            {errors.accountNumber && (
              <p className="text-[11px] text-red-500 mt-1.5 pl-3 font-medium">{errors.accountNumber}</p>
            )}
          </div>

          {/* 3. IFSC CODE: */}
          <div className="relative border border-slate-300 hover:border-slate-400 rounded-xl pl-5 pr-4 h-11 sm:h-[46px] flex items-center focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500 transition-all bg-white group">
            <span className="absolute -top-2.5 left-5 bg-white px-2 text-[10px] sm:text-[11px] font-bold text-slate-400 group-focus-within:text-red-600 tracking-wider uppercase select-none transition-colors">
              IFSC CODE:
            </span>
            <input
              type="text"
              value={ifscCode}
              onChange={e => setIfscCode(e.target.value)}
              placeholder=""
              className="w-full text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none bg-transparent pl-1 uppercase font-mono"
            />
          </div>

          {/* 4. BANK NAME: */}
          <div className="relative border border-slate-300 hover:border-slate-400 rounded-xl pl-5 pr-4 h-11 sm:h-[46px] flex items-center focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500 transition-all bg-white group">
            <span className="absolute -top-2.5 left-5 bg-white px-2 text-[10px] sm:text-[11px] font-bold text-slate-400 group-focus-within:text-red-600 tracking-wider uppercase select-none transition-colors">
              BANK NAME:
            </span>
            <input
              type="text"
              value={bankName}
              onChange={e => setBankName(e.target.value)}
              placeholder=""
              className="w-full text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none bg-transparent pl-1"
            />
          </div>

          {/* 5. BANK ADDRESS: */}
          <div className="relative border border-slate-300 hover:border-slate-400 rounded-xl pl-5 pr-4 h-11 sm:h-[46px] flex items-center focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500 transition-all bg-white group">
            <span className="absolute -top-2.5 left-5 bg-white px-2 text-[10px] sm:text-[11px] font-bold text-slate-400 group-focus-within:text-red-600 tracking-wider uppercase select-none transition-colors">
              BANK ADDRESS:
            </span>
            <input
              type="text"
              value={bankAddress}
              onChange={e => setBankAddress(e.target.value)}
              placeholder=""
              className="w-full text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none bg-transparent pl-1"
            />
          </div>

          {/* 6. IBAN NUMBER: */}
          <div className="relative border border-slate-300 hover:border-slate-400 rounded-xl pl-5 pr-4 h-11 sm:h-[46px] flex items-center focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500 transition-all bg-white group">
            <span className="absolute -top-2.5 left-5 bg-white px-2 text-[10px] sm:text-[11px] font-bold text-slate-400 group-focus-within:text-red-600 tracking-wider uppercase select-none transition-colors">
              IBAN NUMBER:
            </span>
            <input
              type="text"
              value={ibanNumber}
              onChange={e => setIbanNumber(e.target.value)}
              placeholder=""
              className="w-full text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none bg-transparent pl-1 font-mono"
            />
          </div>

          {/* 7. UPI NUMBER: */}
          <div className="relative border border-slate-300 hover:border-slate-400 rounded-xl pl-5 pr-4 h-11 sm:h-[46px] flex items-center focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500 transition-all bg-white group">
            <span className="absolute -top-2.5 left-5 bg-white px-2 text-[10px] sm:text-[11px] font-bold text-slate-400 group-focus-within:text-red-600 tracking-wider uppercase select-none transition-colors">
              UPI NUMBER:
            </span>
            <input
              type="text"
              value={upiNumber}
              onChange={e => setUpiNumber(e.target.value)}
              placeholder=""
              className="w-full text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none bg-transparent pl-1"
            />
          </div>

          {/* 8. Opening Balance: */}
          <div className="pt-2 space-y-2.5">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 select-none">
              Opening Balance:
            </h3>
            <div className="relative border border-slate-300 hover:border-slate-400 rounded-xl pl-5 pr-4 h-11 sm:h-[46px] flex items-center focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500 transition-all bg-white group">
              <span className="absolute -top-2.5 left-5 bg-white px-2 text-[10px] sm:text-[11px] font-bold text-slate-400 group-focus-within:text-red-600 tracking-wider uppercase select-none transition-colors">
                AMOUNT
              </span>
              <input
                type="number"
                step="any"
                min="0"
                value={openingBalance}
                onChange={e => setOpeningBalance(e.target.value)}
                placeholder=""
                className="w-full text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none bg-transparent pl-1 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          {/* 9. Overdraft Limit: */}
          <div className="pt-2 space-y-2.5">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 select-none">
              Overdraft Limit:
            </h3>
            <div className="relative border border-slate-300 hover:border-slate-400 rounded-xl pl-5 pr-4 h-11 sm:h-[46px] flex items-center focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500 transition-all bg-white group">
              <span className="absolute -top-2.5 left-5 bg-white px-2 text-[10px] sm:text-[11px] font-bold text-slate-400 group-focus-within:text-red-600 tracking-wider uppercase select-none transition-colors">
                AMOUNT
              </span>
              <input
                type="number"
                step="any"
                min="0"
                value={overdraftLimit}
                onChange={e => setOverdraftLimit(e.target.value)}
                placeholder=""
                className="w-full text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none bg-transparent pl-1 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          <div className="h-6" />
        </form>
      </div>
    </div>
  );
};
