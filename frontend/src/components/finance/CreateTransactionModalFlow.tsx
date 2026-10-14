import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, Search, Calendar, Pencil, ChevronDown, ChevronUp, 
  Upload, Check, Building2, Plus, ArrowLeftRight, FileText,
  Boxes, CreditCard, DollarSign, ArrowUpRight, ArrowDownRight,
  ShieldCheck, AlertCircle, Sparkles, User, Clock
} from 'lucide-react';
import { Project } from '../../types';
import { PartyRecord, BankAccountRecord, getFinanceParties } from '../../lib/financeSyncService';
import { getCurrentUploadTimestamp } from '../../lib/timestampUtils';

// All Transaction Option definitions matching Image 1
export interface TransactionTypeOption {
  id: string;
  name: string;
  group: 'Payment' | 'Sales' | 'Expense';
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

export const TRANSACTION_OPTIONS: TransactionTypeOption[] = [
  // Payment Group
  { id: 'payment_in', name: 'Payment In', group: 'Payment', type: 'INCOME', colorClass: 'text-emerald-700', bgClass: 'bg-[#eaf8ef] hover:bg-[#d8f2e2]', borderClass: 'border-emerald-200' },
  { id: 'payment_out', name: 'Payment Out', group: 'Payment', type: 'EXPENSE', colorClass: 'text-rose-600', bgClass: 'bg-[#fef2f2] hover:bg-[#fee2e2]', borderClass: 'border-rose-200' },
  { id: 'debit_note', name: 'Debit Note', group: 'Payment', type: 'INCOME', colorClass: 'text-indigo-900', bgClass: 'bg-[#ede9fe] hover:bg-[#e0e7ff]', borderClass: 'border-indigo-100' },
  { id: 'credit_note', name: 'Credit Note', group: 'Payment', type: 'EXPENSE', colorClass: 'text-indigo-900', bgClass: 'bg-[#ede9fe] hover:bg-[#e0e7ff]', borderClass: 'border-indigo-100' },
  { id: 'party_to_party', name: 'Party to Party Payment', group: 'Payment', type: 'TRANSFER', colorClass: 'text-indigo-900', bgClass: 'bg-[#ede9fe] hover:bg-[#e0e7ff]', borderClass: 'border-indigo-100' },
  { id: 'internal_transfer', name: 'Internal Transfer', group: 'Payment', type: 'TRANSFER', colorClass: 'text-indigo-900', bgClass: 'bg-[#ede9fe] hover:bg-[#e0e7ff]', borderClass: 'border-indigo-100' },
  { id: 'upload_payments', name: 'Upload Payments', group: 'Payment', type: 'INCOME', colorClass: 'text-indigo-900', bgClass: 'bg-[#ede9fe] hover:bg-[#e0e7ff]', borderClass: 'border-indigo-100' },

  // Sales Group
  { id: 'sales_invoice', name: 'Sales Invoice', group: 'Sales', type: 'INCOME', colorClass: 'text-indigo-900', bgClass: 'bg-[#ede9fe] hover:bg-[#e0e7ff]', borderClass: 'border-indigo-100' },
  { id: 'material_sales', name: 'Material Sales', group: 'Sales', type: 'INCOME', colorClass: 'text-indigo-900', bgClass: 'bg-[#ede9fe] hover:bg-[#e0e7ff]', borderClass: 'border-indigo-100' },

  // Expense Group
  { id: 'material_purchase', name: 'Material Purchase', group: 'Expense', type: 'EXPENSE', colorClass: 'text-indigo-900', bgClass: 'bg-[#ede9fe] hover:bg-[#e0e7ff]', borderClass: 'border-indigo-100' },
  { id: 'material_return', name: 'Material Return', group: 'Expense', type: 'INCOME', colorClass: 'text-indigo-900', bgClass: 'bg-[#ede9fe] hover:bg-[#e0e7ff]', borderClass: 'border-indigo-100' },
  { id: 'material_transfer', name: 'Material Transfer', group: 'Expense', type: 'EXPENSE', colorClass: 'text-indigo-900', bgClass: 'bg-[#ede9fe] hover:bg-[#e0e7ff]', borderClass: 'border-indigo-100' },
  { id: 'sub_con_bill', name: 'Sub Con Bill', group: 'Expense', type: 'EXPENSE', colorClass: 'text-indigo-900', bgClass: 'bg-[#ede9fe] hover:bg-[#e0e7ff]', borderClass: 'border-indigo-100' },
  { id: 'other_expense', name: 'Other Expense', group: 'Expense', type: 'EXPENSE', colorClass: 'text-indigo-900', bgClass: 'bg-[#ede9fe] hover:bg-[#e0e7ff]', borderClass: 'border-indigo-100' },
  { id: 'equipment_expense', name: 'Equipment Expense', group: 'Expense', type: 'EXPENSE', colorClass: 'text-indigo-900', bgClass: 'bg-[#ede9fe] hover:bg-[#e0e7ff]', borderClass: 'border-indigo-100' },
];

export const COST_CODE_OPTIONS = [
  'Civil Works & Foundation',
  'Concrete & RCC Structural',
  'Masonry & Brickwork',
  'MEP - Electrical Installations',
  'MEP - Plumbing & Drainage',
  'Plastering & Waterproofing',
  'Flooring & Tile Work',
  'Painting & Finishing',
  'Fabrication & Metal Work',
  'Doors, Windows & Carpentry',
  'Machinery & Equipment Hire',
  'Fuel & Generator Charges',
  'Labour Wages & Daily Subcon',
  'Site Safety & Security',
  'Permits, Inspection & Admin',
  'General Operational Overhead'
];

interface CreateTransactionModalFlowProps {
  isOpen: boolean;
  currentStep?: 'menu' | 'select_project' | 'drawer';
  onClose: () => void;
  projects: Project[];
  parties: PartyRecord[];
  bankAccounts?: BankAccountRecord[];
  existingTransactionsCount?: number;
  onSaveSuccess: (transactionData: {
    transactionType: string;
    subType: string;
    projectName: string;
    projectId?: string;
    voucherNo: string;
    date: string;
    partyName: string;
    partyId?: string;
    amount: number;
    paymentMethod: 'Cash' | 'Bank Transfer' | 'Cheque';
    bankAccountId?: string;
    bankAccountName?: string;
    costCode?: string;
    referenceNo?: string;
    category?: string;
    notes?: string;
    files?: File[];
    fileUploadTimestamps?: string[];
    fileAttachments?: Array<{ name: string; size: string; uploadedAt: string }>;
  }) => void;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
}

export const CreateTransactionModalFlow: React.FC<CreateTransactionModalFlowProps> = ({
  isOpen,
  currentStep: externalStep,
  onClose,
  projects = [],
  parties = [],
  bankAccounts = [],
  existingTransactionsCount = 0,
  onSaveSuccess,
  buttonRef
}) => {
  // Step state: 'menu' (Image 1) -> 'select_project' (Image 2) -> 'drawer' (Image 3)
  const [step, setStep] = useState<'menu' | 'select_project' | 'drawer'>(externalStep || 'menu');
  const [selectedOption, setSelectedOption] = useState<TransactionTypeOption>(TRANSACTION_OPTIONS[0]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Step 2 selection mode ('party' by default, or 'project') and search query
  const [selectMode, setSelectMode] = useState<'party' | 'project'>('party');
  const [step2SearchQuery, setStep2SearchQuery] = useState('');
  const [projectSearchQuery, setProjectSearchQuery] = useState('');

  // Form Fields in Step 3 (Image 3)
  const [voucherNo, setVoucherNo] = useState('');
  const [isEditingVoucher, setIsEditingVoucher] = useState(false);
  const [paymentDate, setPaymentDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [partyName, setPartyName] = useState('');
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const [partySearchQuery, setPartySearchQuery] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Cheque'>('Bank Transfer');
  const [selectedBankId, setSelectedBankId] = useState<string>(() => {
    return bankAccounts.find(b => b.isPrimary)?.id || bankAccounts[0]?.id || '';
  });
  const [costCode, setCostCode] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [isMoreDetailsOpen, setIsMoreDetailsOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [fileTimestamps, setFileTimestamps] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<{ party?: string; amount?: string }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const partyDropdownRef = useRef<HTMLDivElement>(null);
  const menuCardRef = useRef<HTMLDivElement>(null);
  const prevIsOpenRef = useRef(false);

  // Complete reset function ensuring no stale data remains on new transactions
  const resetAllFields = () => {
    const nextNum = 350 + (existingTransactionsCount || 1);
    setVoucherNo(`#CB-${nextNum}`);
    setIsEditingVoucher(false);
    const today = new Date();
    setPaymentDate(today.toISOString().split('T')[0]);
    setPartyName('');
    setIsPartyDropdownOpen(false);
    setPartySearchQuery('');
    setAmount('');
    setPaymentMethod('Bank Transfer');
    setSelectedBankId(bankAccounts.find(b => b.isPrimary)?.id || bankAccounts[0]?.id || '');
    setCostCode('');
    setReferenceNo('');
    setIsMoreDetailsOpen(false);
    setNotes('');
    setUploadedFiles([]);
    setFileTimestamps([]);
    setFormErrors({});
    setSelectedProject(null);
    setProjectSearchQuery('');
    setStep2SearchQuery('');
    setSelectMode('party');
    setSelectedOption(TRANSACTION_OPTIONS[0]);
    setStep(externalStep || 'menu');
  };

  // Reset form whenever modal opens or closes
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      resetAllFields();
    } else if (!isOpen && prevIsOpenRef.current) {
      resetAllFields();
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, existingTransactionsCount, externalStep]);

  const handleClose = () => {
    resetAllFields();
    onClose();
  };

  useEffect(() => {
    if (externalStep) {
      setStep(externalStep);
    }
  }, [externalStep]);

  // Click outside listener for party dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(e.target as Node)) {
        setIsPartyDropdownOpen(false);
      }
    };
    if (isPartyDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isPartyDropdownOpen]);

  // Fallback demo projects if none passed
  const availableProjects = useMemo(() => {
    if (projects && projects.length > 0) return projects;
    try {
      const stored = localStorage.getItem('booshnam_projects_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    // Default sample projects matching the user's reference screenshot
    return [
      { id: 'p-1', code: 'RA11-A-1802', name: 'RA11-A-1802-(2026-2027)-Arun kodam...', initials: 'Rk', client_name: 'Arun Kodambakkam' },
      { id: 'p-2', code: 'RA11-BAGJ-2571', name: 'RA11-BAGJ-2571-(2026-2027)-Sathya ...', initials: 'RV', client_name: 'Sathya Builders' },
      { id: 'p-3', code: 'RA11-BAGJ-2570', name: 'RA11-BAGJ-2570-(2026-2027)-Jd Subak...', initials: 'RS', client_name: 'Jd Subak Constructions' },
      { id: 'p-4', code: 'LO14-BAGJ-2569', name: 'LO14-BAGJ-2569-(2026-2027)-Zahur Gu...', initials: 'LG', client_name: 'Zahur Guntur Project' }
    ] as Project[];
  }, [projects]);

  // Filter projects by search query
  const filteredProjects = useMemo(() => {
    if (!projectSearchQuery.trim()) return availableProjects;
    const q = projectSearchQuery.toLowerCase().trim();
    return availableProjects.filter(p => 
      (p.name && p.name.toLowerCase().includes(q)) || 
      (p.code && p.code.toLowerCase().includes(q)) ||
      (p.client_name && p.client_name.toLowerCase().includes(q))
    );
  }, [availableProjects, projectSearchQuery]);

  // Compute initials for project avatar
  const getProjectInitials = (p: Project) => {
    if (p.initials) return p.initials;
    if (p.code) {
      const parts = p.code.split(/[-_ ]/);
      if (parts.length >= 2 && parts[0] && parts[1]) {
        return (parts[0].slice(0, 1) + parts[1].slice(0, 1)).toUpperCase();
      }
      return p.code.slice(0, 2).toUpperCase();
    }
    if (p.name) {
      const words = p.name.trim().split(/\s+/);
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
      }
      return p.name.slice(0, 2).toUpperCase();
    }
    return 'PR';
  };

  // Directory parties strictly from Party page (parties prop or getFinanceParties())
  const directoryParties = useMemo(() => {
    return (parties && parties.length > 0) ? parties : getFinanceParties();
  }, [parties]);

  // Filter parties strictly from the Party page directory for Step 2
  const filteredStep2Parties = useMemo(() => {
    if (!step2SearchQuery.trim()) return directoryParties;
    const q = step2SearchQuery.toLowerCase().trim();
    return directoryParties.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.type && p.type.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q)) ||
      (p.contactPerson && p.contactPerson.toLowerCase().includes(q))
    );
  }, [directoryParties, step2SearchQuery]);

  // Filter parties by search query for Step 3 drawer
  const filteredParties = useMemo(() => {
    const q = (partySearchQuery || partyName).toLowerCase().trim();
    if (!q) return directoryParties;
    return directoryParties.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.type && p.type.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q))
    );
  }, [directoryParties, partySearchQuery, partyName]);

  // Handlers for Flow Navigation
  const handleSelectOption = (opt: TransactionTypeOption) => {
    setSelectedOption(opt);
    setStep('select_project');
  };

  const handleSelectParty = (pty: PartyRecord) => {
    setPartyName(pty.name);
    // Associate active project if party has one
    const matchedProj = availableProjects.find(pr => pty.activeProjects?.includes(pr.name));
    if (matchedProj) {
      setSelectedProject(matchedProj);
    }
    setStep('drawer');
  };

  const handleSelectProject = (proj: Project) => {
    setSelectedProject(proj);
    setStep('drawer');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const nowTs = getCurrentUploadTimestamp();
      const newTimestamps = filesArray.map(() => nowTs);
      setUploadedFiles(prev => [...prev, ...filesArray]);
      setFileTimestamps(prev => [...prev, ...newTimestamps]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setFileTimestamps(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { party?: string; amount?: string } = {};

    if (!partyName.trim()) {
      errors.party = 'Party Name is required';
    }

    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      errors.amount = 'Please enter a valid amount greater than 0';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const finalBankId = selectedBankId || bankAccounts.find(b => b.isPrimary)?.id || bankAccounts[0]?.id || '';
    const matchedParty = parties.find(p => p.name.trim().toLowerCase() === partyName.trim().toLowerCase());
    const matchedAccount = bankAccounts.find(b => b.id === finalBankId);

    onSaveSuccess({
      transactionType: selectedOption.name,
      subType: selectedOption.id,
      projectName: selectedProject?.name || availableProjects[0]?.name || 'Booshnam Project',
      projectId: selectedProject?.id,
      voucherNo: voucherNo || `#CB-${Date.now().toString().slice(-3)}`,
      date: paymentDate,
      partyName: partyName.trim(),
      partyId: matchedParty?.id,
      amount: numAmt,
      paymentMethod,
      bankAccountId: finalBankId,
      bankAccountName: matchedAccount?.accountName || (finalBankId === 'cash' ? 'Cash Account' : 'Company Account'),
      costCode: costCode || undefined,
      referenceNo: referenceNo.trim() || undefined,
      category: selectedOption.group,
      notes: notes.trim() || undefined,
      files: uploadedFiles,
      fileUploadTimestamps: fileTimestamps,
      fileAttachments: uploadedFiles.map((f, idx) => ({
        name: f.name,
        size: `${(f.size / 1024).toFixed(0)} KB`,
        uploadedAt: fileTimestamps[idx] || getCurrentUploadTimestamp()
      }))
    });

    resetAllFields();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          IMAGE 1: POPUP MENU - "CREATE TRANSACTION +"
      ───────────────────────────────────────────────────────────── */}
      {step === 'menu' && (
        <div 
          className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6 bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={handleClose}
        >
          <div 
            ref={menuCardRef}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-[390px] bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 mt-14 sm:mt-16 mr-2 sm:mr-6 animate-in zoom-in-95 duration-150 space-y-4"
          >
            {/* Top Close icon for convenience */}
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">Select Transaction Type</span>
              <button 
                type="button" 
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. PAYMENT SECTION */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Payment
              </span>
              <div className="grid grid-cols-2 gap-2">
                {TRANSACTION_OPTIONS.filter(o => o.group === 'Payment').map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectOption(opt)}
                    className={`py-2.5 px-3 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer shadow-2xs border ${opt.bgClass} ${opt.colorClass} ${opt.borderClass} hover:scale-[1.01] active:scale-[0.99]`}
                  >
                    + {opt.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Dashed Separator */}
            <div className="border-b border-dashed border-slate-200" />

            {/* 2. SALES SECTION */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Sales
              </span>
              <div className="grid grid-cols-2 gap-2">
                {TRANSACTION_OPTIONS.filter(o => o.group === 'Sales').map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectOption(opt)}
                    className={`py-2.5 px-3 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer shadow-2xs border ${opt.bgClass} ${opt.colorClass} ${opt.borderClass} hover:scale-[1.01] active:scale-[0.99]`}
                  >
                    + {opt.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Dashed Separator */}
            <div className="border-b border-dashed border-slate-200" />

            {/* 3. EXPENSE SECTION */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Expense
              </span>
              <div className="grid grid-cols-2 gap-2">
                {TRANSACTION_OPTIONS.filter(o => o.group === 'Expense').map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectOption(opt)}
                    className={`py-2.5 px-3 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer shadow-2xs border ${opt.bgClass} ${opt.colorClass} ${opt.borderClass} hover:scale-[1.01] active:scale-[0.99]`}
                  >
                    + {opt.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          IMAGE 2: MODAL - "SELECT PARTY" (Default) or "SELECT PROJECT"
      ───────────────────────────────────────────────────────────── */}
      {step === 'select_project' && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={handleClose}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 animate-in zoom-in-95 duration-150 flex flex-col space-y-4 max-h-[90vh]"
          >
            {/* Header: Title + Close Button */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${selectedOption.type === 'INCOME' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <h3 className="text-base font-bold text-slate-900">
                  {selectMode === 'party' ? 'Select Party' : 'Select Project'}
                </h3>
                <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                  {selectedOption.name}
                </span>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switcher: Parties (default) vs Projects */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setSelectMode('party')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  selectMode === 'party'
                    ? 'bg-white text-red-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Parties ({directoryParties.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectMode('project')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  selectMode === 'project'
                    ? 'bg-white text-red-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Projects ({availableProjects.length})
              </button>
            </div>

            {/* Floating Search Input */}
            {selectMode === 'party' ? (
              <div className="relative pt-2">
                <div className="relative border border-slate-300 rounded-xl px-3.5 h-12 flex items-center bg-white group focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500 transition-all">
                  <span className="absolute -top-2.5 left-4 bg-white px-1.5 text-[10px] font-bold text-slate-500 group-focus-within:text-red-600 tracking-wider uppercase transition-colors">
                    PARTY NAME <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Type to search party from Party directory..."
                    value={step2SearchQuery}
                    onChange={e => setStep2SearchQuery(e.target.value)}
                    className="w-full text-xs sm:text-sm font-medium text-slate-800 focus:outline-none bg-transparent pr-6"
                  />
                  {step2SearchQuery && (
                    <button
                      type="button"
                      onClick={() => setStep2SearchQuery('')}
                      className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer absolute right-3"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative pt-2">
                <div className="relative border border-slate-300 rounded-xl px-3.5 h-12 flex items-center bg-white group focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500 transition-all">
                  <span className="absolute -top-2.5 left-4 bg-white px-1.5 text-[10px] font-bold text-slate-500 group-focus-within:text-red-600 tracking-wider uppercase transition-colors">
                    PROJECT NAME <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Type to search project..."
                    value={projectSearchQuery}
                    onChange={e => setProjectSearchQuery(e.target.value)}
                    className="w-full text-xs sm:text-sm font-medium text-slate-800 focus:outline-none bg-transparent pr-6"
                  />
                  {projectSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setProjectSearchQuery('')}
                      className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer absolute right-3"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* List of Parties or Projects (Scrollable) */}
            <div className="overflow-y-auto max-h-[340px] space-y-1.5 pr-1 divide-y divide-slate-50">
              {selectMode === 'party' ? (
                filteredStep2Parties.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <User className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-600">No matching parties found in Party directory</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Only active parties registered in the Party page are listed.
                    </p>
                    {step2SearchQuery.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          setPartyName(step2SearchQuery.trim());
                          setStep('drawer');
                        }}
                        className="mt-3 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors cursor-pointer"
                      >
                        + Use "{step2SearchQuery.trim()}" as Party
                      </button>
                    )}
                  </div>
                ) : (
                  filteredStep2Parties.map((pty, idx) => {
                    const initials = pty.avatarText || pty.name.slice(0, 2).toUpperCase();
                    return (
                      <div
                        key={pty.id || idx}
                        onClick={() => handleSelectParty(pty)}
                        className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-red-50/70 border border-transparent hover:border-red-200 transition-all cursor-pointer"
                      >
                        {/* Initials Avatar Box */}
                        <div className="w-9 h-9 rounded-xl bg-red-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                          {initials}
                        </div>

                        {/* Party Text */}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-800 group-hover:text-red-600 truncate transition-colors flex items-center gap-2">
                            <span>{pty.name}</span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                              {pty.type}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate flex items-center gap-2 mt-0.5">
                            {pty.phone && <span>📞 {pty.phone}</span>}
                            {pty.activeProjects && pty.activeProjects[0] && (
                              <span>• Proj: {pty.activeProjects[0]}</span>
                            )}
                          </div>
                        </div>

                        <ChevronDown className="w-4 h-4 text-slate-300 -rotate-90 group-hover:text-red-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    );
                  })
                )
              ) : (
                filteredProjects.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-600">No matching projects found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try searching with a different project code or name</p>
                  </div>
                ) : (
                  filteredProjects.map((p, idx) => {
                    const initials = getProjectInitials(p);
                    return (
                      <div
                        key={p.id || idx}
                        onClick={() => handleSelectProject(p)}
                        className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-red-50/70 border border-transparent hover:border-red-200 transition-all cursor-pointer"
                      >
                        {/* Initials Avatar Box */}
                        <div className="w-9 h-9 rounded-xl bg-red-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                          {initials}
                        </div>

                        {/* Project Text */}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-800 group-hover:text-red-600 truncate transition-colors">
                            {p.name}
                          </div>
                          {p.client_name && (
                            <div className="text-[11px] text-slate-400 truncate">
                              Client: {p.client_name} {p.code ? `• ${p.code}` : ''}
                            </div>
                          )}
                        </div>

                        <ChevronDown className="w-4 h-4 text-slate-300 -rotate-90 group-hover:text-red-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    );
                  })
                )
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setStep('menu')}
                className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          IMAGE 3: SLIDE-BAR (RIGHT DRAWER) - "PAYMENT IN / TRANSACTION"
      ───────────────────────────────────────────────────────────── */}
      {step === 'drawer' && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-in fade-in duration-200">
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
            onClick={handleClose}
          />

          {/* Slide-over Drawer Panel */}
          <div className="relative w-full max-w-[480px] sm:max-w-[540px] bg-white shadow-2xl z-10 flex flex-col h-full transform transition-transform duration-200 ease-out border-l border-slate-200">
            
            {/* 1. Header with Mode and Project Name, Cancel & Save */}
            <div className="px-6 py-4 bg-white flex items-center justify-between border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-slate-600 hover:text-slate-900 p-1 -ml-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                  title="Close"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>

                <div className="flex flex-col">
                  <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-wider uppercase select-none">
                    {selectedOption.name.toUpperCase()}
                  </h2>
                  <span className="text-[11px] font-bold text-slate-500 truncate max-w-[200px] uppercase">
                    {selectedProject ? selectedProject.name : (availableProjects[0]?.name || 'Booshnam Project')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-5 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Red Accent Line below header */}
            <div className="h-[3px] bg-red-600 w-full shrink-0" />

            {/* 2. Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-4 text-xs">
              
              {/* Row: PAYMENT NUMBER * and PAYMENT DATE * */}
              <div className="grid grid-cols-2 gap-3">
                {/* PAYMENT NUMBER * */}
                <div className="relative pt-1.5">
                  <div className="relative border border-slate-300 rounded-xl px-3.5 h-12 flex items-center bg-white group focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500 transition-all">
                    <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-slate-400 group-focus-within:text-red-600 tracking-wider uppercase transition-colors select-none">
                      PAYMENT NUMBER <span className="text-red-500">*</span>
                    </span>
                    {isEditingVoucher ? (
                      <input
                        type="text"
                        value={voucherNo}
                        onChange={e => setVoucherNo(e.target.value)}
                        onBlur={() => setIsEditingVoucher(false)}
                        autoFocus
                        className="w-full text-xs font-mono font-bold text-slate-800 focus:outline-none bg-transparent"
                      />
                    ) : (
                      <div className="w-full flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-slate-800">{voucherNo}</span>
                        <button
                          type="button"
                          onClick={() => setIsEditingVoucher(true)}
                          className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                          title="Edit Voucher Number"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* PAYMENT DATE * */}
                <div className="relative pt-1.5">
                  <div className="relative border border-slate-300 rounded-xl px-3.5 h-12 flex items-center bg-white group focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500 transition-all">
                    <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-slate-400 group-focus-within:text-red-600 tracking-wider uppercase transition-colors select-none">
                      PAYMENT DATE <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={e => setPaymentDate(e.target.value)}
                      className="w-full text-xs font-medium text-slate-800 focus:outline-none bg-transparent cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* PARTY NAME with Search Icon & Interactive Dropdown */}
              <div className="relative pt-1.5" ref={partyDropdownRef}>
                <div className={`relative border rounded-xl px-3.5 h-12 flex items-center bg-white group transition-all ${
                  formErrors.party ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500'
                }`}>
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-slate-400 group-focus-within:text-red-600 tracking-wider uppercase transition-colors select-none">
                    PARTY NAME <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Search or enter party name..."
                    value={partyName}
                    onChange={e => {
                      setPartyName(e.target.value);
                      setPartySearchQuery(e.target.value);
                      setIsPartyDropdownOpen(true);
                      if (formErrors.party) setFormErrors(prev => ({ ...prev, party: undefined }));
                    }}
                    onFocus={() => setIsPartyDropdownOpen(true)}
                    className="w-full text-xs font-semibold text-slate-800 focus:outline-none bg-transparent pr-6"
                  />
                  <Search className="w-4 h-4 text-slate-400 cursor-pointer absolute right-3.5" onClick={() => setIsPartyDropdownOpen(!isPartyDropdownOpen)} />
                </div>
                {formErrors.party && (
                  <p className="text-[10px] text-red-500 mt-1 font-medium">{formErrors.party}</p>
                )}

                {/* Dropdown list of Parties from Accounts & Finance */}
                {isPartyDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {filteredParties.length === 0 ? (
                      <div className="p-3 text-center">
                        <p className="text-xs text-slate-500">No matching parties found</p>
                        {partyName.trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsPartyDropdownOpen(false);
                            }}
                            className="mt-1 text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                          >
                            + Use "{partyName.trim()}" as party
                          </button>
                        )}
                      </div>
                    ) : (
                      filteredParties.map(p => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setPartyName(p.name);
                            setIsPartyDropdownOpen(false);
                            if (formErrors.party) setFormErrors(prev => ({ ...prev, party: undefined }));
                          }}
                          className="p-2.5 hover:bg-red-50/60 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-red-100 text-red-600 font-bold text-[11px] flex items-center justify-center shrink-0">
                              {p.avatarText || p.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-800 truncate">{p.name}</div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {p.type} {p.phone ? `• ${p.phone}` : ''}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-mono font-bold text-slate-700">
                              ₹{p.balanceDue?.toLocaleString('en-IN') || 0}
                            </span>
                            <span className={`block text-[9px] font-semibold ${
                              p.status === 'To Receive' ? 'text-emerald-600' : p.status === 'To Pay' ? 'text-rose-600' : 'text-slate-400'
                            }`}>
                              {p.status || 'Settled'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* AMOUNT */}
              <div className="relative pt-1.5">
                <div className={`relative border rounded-xl px-3.5 h-12 flex items-center bg-white group transition-all ${
                  formErrors.amount ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500'
                }`}>
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-slate-400 group-focus-within:text-red-600 tracking-wider uppercase transition-colors select-none">
                    AMOUNT <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="0"
                    value={amount}
                    onChange={e => {
                      let val = e.target.value;
                      // Strip leading zeros (e.g. typing 1000 when 0 was entered doesn't become 01000)
                      if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) {
                        val = val.replace(/^0+/, '');
                      }
                      setAmount(val);
                      if (formErrors.amount) setFormErrors(prev => ({ ...prev, amount: undefined }));
                    }}
                    onFocus={() => {
                      if (amount === '0') setAmount('');
                    }}
                    className="w-full text-sm font-mono font-bold text-slate-800 focus:outline-none bg-transparent"
                  />
                </div>
                {formErrors.amount && (
                  <p className="text-[10px] text-red-500 mt-1 font-medium">{formErrors.amount}</p>
                )}
              </div>

              {/* Payment Method Card */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/40 space-y-2.5">
                <span className="text-[11px] font-bold text-slate-700 block">
                  Payment Method:
                </span>
                <div className="flex items-center gap-6">
                  {(['Cash', 'Bank Transfer', 'Cheque'] as const).map(mode => (
                    <label key={mode} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="payment_method"
                        checked={paymentMethod === mode}
                        onChange={() => setPaymentMethod(mode)}
                        className="w-4 h-4 text-red-600 border-slate-300 focus:ring-red-500 cursor-pointer"
                      />
                      <span className={`text-xs font-semibold ${paymentMethod === mode ? 'text-red-600' : 'text-slate-600'}`}>
                        {mode}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Bank / Cash Account Selector */}
                {bankAccounts.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <label className="text-[10px] font-bold text-slate-700 block mb-1 uppercase tracking-wider">
                      {selectedOption.type === 'INCOME' ? 'Deposit Into Account *' : 'Pay / Deduct From Account *'}
                    </label>
                    <select
                      value={selectedBankId}
                      onChange={e => setSelectedBankId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-500 cursor-pointer"
                    >
                      {bankAccounts.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.accountName} {b.isPrimary ? '(PRIMARY)' : ''} - {b.accountNumber ? `••••${b.accountNumber.slice(-4)}` : ''} (Balance: ₹{b.balance?.toLocaleString('en-IN')})
                        </option>
                      ))}
                      <option value="cash">Cash Account / Petty Cash</option>
                    </select>
                  </div>
                )}
              </div>

              {/* ADD COST CODE */}
              <div className="relative pt-1.5">
                <div className="relative border border-slate-300 rounded-xl px-3.5 h-12 flex items-center bg-white group focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500 transition-all">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-slate-400 group-focus-within:text-red-600 tracking-wider uppercase transition-colors select-none">
                    ADD COST CODE
                  </span>
                  <select
                    value={costCode}
                    onChange={e => setCostCode(e.target.value)}
                    className="w-full text-xs font-medium text-slate-700 focus:outline-none bg-transparent cursor-pointer"
                  >
                    <option value="">Select Cost Code</option>
                    {COST_CODE_OPTIONS.map(code => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* REFERENCE NO. */}
              <div className="relative pt-1.5">
                <div className="relative border border-slate-300 rounded-xl px-3.5 h-12 flex items-center bg-white group focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-500 transition-all">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-slate-400 group-focus-within:text-red-600 tracking-wider uppercase transition-colors select-none">
                    REFERENCE NO.
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. UTR / Cheque / Bill reference"
                    value={referenceNo}
                    onChange={e => setReferenceNo(e.target.value)}
                    className="w-full text-xs font-medium text-slate-800 focus:outline-none bg-transparent"
                  />
                </div>
              </div>

              {/* More Details (Optional) - Accordion */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsMoreDetailsOpen(!isMoreDetailsOpen)}
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                >
                  <span>More Details (Optional)</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isMoreDetailsOpen ? 'rotate-180' : ''}`} />
                </button>
                {isMoreDetailsOpen && (
                  <div className="p-4 bg-white border-t border-slate-200 space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Notes / Remarks
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Add internal transaction remarks..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-red-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Files */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-red-600 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-50/50 hover:bg-red-50/30 transition-all text-center"
                >
                  <Upload className="w-5 h-5 text-red-600" />
                  <span className="text-xs font-semibold text-slate-700">Upload Files</span>
                  <span className="text-[10px] text-slate-400">PDF, JPG, PNG up to 10MB</span>
                </div>

                {/* Uploaded files preview with date & time */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-2.5 space-y-2">
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 shadow-2xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <span className="truncate block font-semibold text-slate-800 text-[11px] max-w-[220px] sm:max-w-[260px]">{file.name}</span>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium mt-0.5">
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>Uploaded: <strong className="text-slate-700">{fileTimestamps[idx] || getCurrentUploadTimestamp()}</strong></span>
                              <span>• {(file.size / 1024).toFixed(0)} KB</span>
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors shrink-0"
                          title="Remove file"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 pb-4">
                <button
                  type="submit"
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Save {selectedOption.name}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </>
  );
};
