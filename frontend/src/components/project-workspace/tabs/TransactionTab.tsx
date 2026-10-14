import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  DollarSign, Plus, ArrowUpRight, ArrowDownRight, Search, 
  Filter, Check, X, FileText, Calendar, Wallet, SlidersHorizontal,
  Truck, ThumbsUp, Download, ChevronDown, ChevronUp, TrendingUp,
  Coins, Edit3, MoreVertical, UploadCloud, Info, Percent, User,
  Pencil, Building2, Clock
} from 'lucide-react';
import { Project, ProjectTransaction, PaymentRequest } from '../../../types';
import { addNotification } from '../../../lib/notificationService';
import { 
  getFinanceParties, 
  syncProjectTransactionToFinance, 
  syncProjectPaymentRequestToFinance, 
  PartyRecord 
} from '../../../lib/financeSyncService';
import { syncProjectFinancialsToStorage } from '../../../lib/projectFinanceUtils';
import { formatUploadTimestamp, getCurrentUploadTimestamp } from '../../../lib/timestampUtils';

interface TransactionTabProps {
  project: Project;
  onShowToast?: (msg: string) => void;
}

export const PAYMENT_REQUEST_TYPES = [
  'Advance against PO',
  'Advance against Subcon Work Order',
  'Advance against BOQ',
  'Payment against Material Purchase',
  'Payment against Subcon Expense',
  'Payment against Other Expense',
  'Payment against Equipment Expense',
  'Advance for Labour',
  'Petty Cash',
  'Other'
];

export interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  branch: string;
  account_type: string;
}

const DEFAULT_BANKS: BankAccount[] = [];

// Convert numbers to Indian English Words (e.g. 50,000 -> Fifty Thousand Only)
export function numberToIndianWords(num: number): string {
  if (!num || num === 0) return 'Zero Only';
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    if (n === 0) return '';
    if (n < 20) return a[n] + ' ';
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '') + ' ';
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred ' + inWords(n % 100);
    if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + inWords(n % 1000);
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + inWords(n % 100000);
    return inWords(Math.floor(n / 10000000)) + 'Crore ' + inWords(n % 10000000);
  }

  const res = inWords(Math.round(num)).trim();
  return (res ? res : 'Zero') + ' Only';
}

const DEFAULT_TRANSACTIONS: ProjectTransaction[] = [];

export const TransactionTab: React.FC<TransactionTabProps> = ({ project, onShowToast }) => {
  const projectIdKey = project.id || project.code || 'default';
  const storageKey = `siteops_project_transactions_${projectIdKey}`;

  // Persisted Transactions State
  const [transactions, setTransactions] = useState<ProjectTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_TRANSACTIONS;
  });

  // Bank Accounts state (persisted across transactions)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    try {
      const saved = localStorage.getItem('siteops_company_banks_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_BANKS;
  });

  const [selectedBankId, setSelectedBankId] = useState<string>(() => bankAccounts[0]?.id || '');
  const [isAddingNewBank, setIsAddingNewBank] = useState(false);
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
  const bankDropdownRef = useRef<HTMLDivElement>(null);

  const [isCostCodeDropdownOpen, setIsCostCodeDropdownOpen] = useState(false);
  const costCodeDropdownRef = useRef<HTMLDivElement>(null);

  const [newBankName, setNewBankName] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newIfscCode, setNewIfscCode] = useState('');
  const [newBranch, setNewBranch] = useState('');

  // Navigation Sub-Tabs: 'transactions' | 'payment_requests'
  const [activeSubTab, setActiveSubTab] = useState<'transactions' | 'payment_requests'>('transactions');

  // Search & Filter
  const [search, setSearch] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState('');

  // Dropdown Menu State (+ Transaction ▾)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Transaction Creation Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSubtype, setSelectedSubtype] = useState<string>('Payment In');
  const [txFlowType, setTxFlowType] = useState<'IN' | 'OUT'>('IN');

  // Form Fields (Matching Image 3)
  const [formPaymentNumber, setFormPaymentNumber] = useState('#CB-99');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formPartyName, setFormPartyName] = useState('');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Cheque'>('Cash');
  const [formCostCode, setFormCostCode] = useState('Select Cost Code');
  const [formReferenceNo, setFormReferenceNo] = useState('');
  const [isMoreDetailsOpen, setIsMoreDetailsOpen] = useState(false);
  const [formNotes, setFormNotes] = useState('');
  const [formMediaUrl, setFormMediaUrl] = useState<string | null>(null);
  const [formMediaUploadedAt, setFormMediaUploadedAt] = useState<string | null>(null);

  // Transaction Detail Overview Modal / Drawer (Matching Image 5)
  const [selectedTxForOverview, setSelectedTxForOverview] = useState<ProjectTransaction | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ==============================================================
  // Payment Requests State & Persistence (Matching Image 1 & 2)
  // ==============================================================
  const prStorageKey = `siteops_payment_requests_${projectIdKey}`;
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>(() => {
    try {
      const saved = localStorage.getItem(`siteops_payment_requests_${projectIdKey}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Payment Request Modal & Overview States
  const [isPaymentRequestModalOpen, setIsPaymentRequestModalOpen] = useState(false);
  const [selectedPRForOverview, setSelectedPRForOverview] = useState<PaymentRequest | null>(null);

  // Form Fields for Payment Request (Image 2)
  const [prNumber, setPrNumber] = useState('#7');
  const [prDate, setPrDate] = useState(new Date().toISOString().split('T')[0]);
  const [prPartyName, setPrPartyName] = useState('');
  const [prType, setPrType] = useState('Select Request Type');
  const [isPrTypeDropdownOpen, setIsPrTypeDropdownOpen] = useState(false);
  const prTypeDropdownRef = useRef<HTMLDivElement>(null);
  const [prAmount, setPrAmount] = useState<number | ''>('');
  const [prCurrency, setPrCurrency] = useState('₹');
  const [prDueDate, setPrDueDate] = useState('');
  const [prNotes, setPrNotes] = useState('');
  const [prMediaUrl, setPrMediaUrl] = useState<string | null>(null);
  const [prMediaName, setPrMediaName] = useState<string | null>(null);
  const [prMediaUploadedAt, setPrMediaUploadedAt] = useState<string | null>(null);
  const prFileInputRef = useRef<HTMLInputElement>(null);

  // Parties from Accounts & Finance
  const [financeParties, setFinanceParties] = useState<PartyRecord[]>(() => getFinanceParties());
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const partyDropdownRef = useRef<HTMLDivElement>(null);

  const [isPrPartyDropdownOpen, setIsPrPartyDropdownOpen] = useState(false);
  const prPartyDropdownRef = useRef<HTMLDivElement>(null);

  // All party options combining Accounts & Finance and current Project Client
  const allPartyOptions = useMemo(() => {
    const list = [...financeParties];
    if (project.client_name && !list.some(p => p.name.trim().toLowerCase() === project.client_name.trim().toLowerCase())) {
      list.unshift({
        id: `pty-client-${project.id || 'default'}`,
        name: project.client_name.trim(),
        type: 'Client',
        avatarText: project.client_name.trim().slice(0, 2).toUpperCase(),
        avatarColor: 'bg-[#1E40AF]',
        balanceDue: 0,
        status: 'To Receive',
        activeProjects: [project.name]
      });
    }
    return list;
  }, [financeParties, project.client_name, project.name, project.id]);

  // Filtered Parties matching Transaction party input
  const filteredTxPartyOptions = useMemo(() => {
    const q = (formPartyName || '').trim().toLowerCase();
    if (!q) return allPartyOptions;
    return allPartyOptions.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.phone && p.phone.toLowerCase().includes(q)) ||
      (p.type && p.type.toLowerCase().includes(q)) ||
      (p.partyId && p.partyId.toLowerCase().includes(q))
    );
  }, [allPartyOptions, formPartyName]);

  // Filtered Parties matching PR party input
  const filteredPrPartyOptions = useMemo(() => {
    const q = (prPartyName || '').trim().toLowerCase();
    if (!q) return allPartyOptions;
    return allPartyOptions.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.phone && p.phone.toLowerCase().includes(q)) ||
      (p.type && p.type.toLowerCase().includes(q)) ||
      (p.partyId && p.partyId.toLowerCase().includes(q))
    );
  }, [allPartyOptions, prPartyName]);

  const selectedPartyRecord = useMemo(() => {
    if (!formPartyName.trim()) return null;
    return allPartyOptions.find(p => p.name.trim().toLowerCase() === formPartyName.trim().toLowerCase()) || null;
  }, [allPartyOptions, formPartyName]);

  const selectedPrPartyRecord = useMemo(() => {
    if (!prPartyName.trim()) return null;
    return allPartyOptions.find(p => p.name.trim().toLowerCase() === prPartyName.trim().toLowerCase()) || null;
  }, [allPartyOptions, prPartyName]);

  // Sync state when project changes & listen for finance sync updates
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`siteops_project_transactions_${projectIdKey}`);
      const txs = saved ? JSON.parse(saved) : DEFAULT_TRANSACTIONS;
      setTransactions(txs);
      syncProjectFinancialsToStorage(project.id, project.code, project.name);
    } catch (e) {}
    try {
      const savedPR = localStorage.getItem(`siteops_payment_requests_${projectIdKey}`);
      setPaymentRequests(savedPR ? JSON.parse(savedPR) : []);
    } catch (e) {}
  }, [projectIdKey, project.id, project.code, project.name]);

  useEffect(() => {
    const refreshFinanceParties = () => {
      setFinanceParties(getFinanceParties());
    };
    window.addEventListener('storage', refreshFinanceParties);
    window.addEventListener('booshnam_finance_updated', refreshFinanceParties);
    return () => {
      window.removeEventListener('storage', refreshFinanceParties);
      window.removeEventListener('booshnam_finance_updated', refreshFinanceParties);
    };
  }, []);

  // Persist transactions helper
  const persistTransactions = (newTxList: ProjectTransaction[]) => {
    setTransactions(newTxList);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newTxList));
      if (project.id && project.id !== projectIdKey) {
        localStorage.setItem(`siteops_project_transactions_${project.id}`, JSON.stringify(newTxList));
      }
      if (project.code && project.code !== projectIdKey) {
        localStorage.setItem(`siteops_project_transactions_${project.code}`, JSON.stringify(newTxList));
      }
      syncProjectFinancialsToStorage(project.id, project.code, project.name);
    } catch (e) {}
  };

  // Persist payment requests helper
  const persistPaymentRequests = (newList: PaymentRequest[]) => {
    setPaymentRequests(newList);
    try {
      localStorage.setItem(prStorageKey, JSON.stringify(newList));
      if (project.id && project.id !== projectIdKey) {
        localStorage.setItem(`siteops_payment_requests_${project.id}`, JSON.stringify(newList));
      }
      if (project.code && project.code !== projectIdKey) {
        localStorage.setItem(`siteops_payment_requests_${project.code}`, JSON.stringify(newList));
      }
      syncProjectFinancialsToStorage(project.id, project.code, project.name);
    } catch (e) {}
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (bankDropdownRef.current && !bankDropdownRef.current.contains(event.target as Node)) {
        setIsBankDropdownOpen(false);
      }
      if (costCodeDropdownRef.current && !costCodeDropdownRef.current.contains(event.target as Node)) {
        setIsCostCodeDropdownOpen(false);
      }
      if (prTypeDropdownRef.current && !prTypeDropdownRef.current.contains(event.target as Node)) {
        setIsPrTypeDropdownOpen(false);
      }
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(event.target as Node)) {
        setIsPartyDropdownOpen(false);
      }
      if (prPartyDropdownRef.current && !prPartyDropdownRef.current.contains(event.target as Node)) {
        setIsPrPartyDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute Totals
  const totalIn = transactions
    .filter(t => t.type === 'IN')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalOut = transactions
    .filter(t => t.type === 'OUT')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const projectBalance = totalIn - totalOut;

  // Margin calculation (Sales vs Expense)
  const totalSales = transactions
    .filter(t => t.transaction_sub_type === 'Sales Invoice' || t.transaction_sub_type === 'Material Sales')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalExpense = transactions
    .filter(t => t.type === 'OUT')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const margin = totalSales - totalExpense;

  // Filtered List
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.party_name.toLowerCase().includes(search.toLowerCase()) ||
      t.transaction_number.toLowerCase().includes(search.toLowerCase()) ||
      (t.transaction_sub_type && t.transaction_sub_type.toLowerCase().includes(search.toLowerCase()));
    const matchesDate = !dateFilter || t.date === dateFilter;
    return matchesSearch && matchesDate;
  });

  // Handle Opening Create Modal from specific Dropdown Item
  const handleOpenCreateModal = (subtype: string, defaultFlow: 'IN' | 'OUT' = 'IN') => {
    setFinanceParties(getFinanceParties());
    setIsPartyDropdownOpen(false);
    setSelectedSubtype(subtype);
    setTxFlowType(defaultFlow);
    setFormPaymentNumber(`#CB-${String(transactions.length + 98)}`);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormPartyName('');
    setFormAmount('');
    setFormPaymentMethod('Cash');
    setFormCostCode('Select Cost Code');
    setFormReferenceNo('');
    setFormNotes('');
    setFormMediaUrl(null);
    setIsMoreDetailsOpen(false);
    setIsAddingNewBank(false);
    setIsBankDropdownOpen(false);
    setIsCostCodeDropdownOpen(false);
    setSelectedBankId(bankAccounts[0]?.id || '');
    setIsDropdownOpen(false);
    setIsCreateModalOpen(true);
  };

  // Handle Add New Bank
  const handleAddNewBank = () => {
    if (!newBankName.trim() || !newAccountNumber.trim()) {
      onShowToast?.('Please enter bank name and account number');
      return;
    }
    const newBank: BankAccount = {
      id: `bank-${Date.now()}`,
      bank_name: newBankName.trim(),
      account_number: newAccountNumber.trim(),
      ifsc_code: newIfscCode.trim() || 'HDFC0001234',
      branch: newBranch.trim() || 'Chennai Main',
      account_type: 'Current Account'
    };
    const updated = [...bankAccounts, newBank];
    setBankAccounts(updated);
    try {
      localStorage.setItem('siteops_company_banks_v2', JSON.stringify(updated));
    } catch (e) {}
    setSelectedBankId(newBank.id);
    setIsAddingNewBank(false);
    setNewBankName('');
    setNewAccountNumber('');
    setNewIfscCode('');
    setNewBranch('');
    onShowToast?.(`Bank account "${newBank.bank_name}" added and selected!`);
  };

  // Get current selected bank object
  const currentSelectedBank = bankAccounts.find(b => b.id === selectedBankId) || bankAccounts[0] || null;

  // Handle Form Submit (Matching Image 3 -> Image 4)
  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPartyName.trim()) {
      onShowToast?.('Please enter party name');
      return;
    }
    const finalAmount = Number(formAmount) || 0;
    if (finalAmount <= 0) {
      onShowToast?.('Please enter a valid amount');
      return;
    }

    const now = new Date();
    const formattedTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const chosenBank = (formPaymentMethod === 'Bank Transfer' || formPaymentMethod === 'Cheque') 
      ? currentSelectedBank 
      : undefined;

    const newTx: ProjectTransaction = {
      id: `tx-${Date.now()}`,
      transaction_number: formPaymentNumber.trim() || `#CB-${Date.now().toString().slice(-3)}`,
      date: formDate,
      time: formattedTime,
      type: txFlowType,
      party_name: formPartyName.trim(),
      category: 'Client Billing',
      transaction_sub_type: selectedSubtype,
      amount: finalAmount,
      payment_mode: formPaymentMethod,
      reference_no: formReferenceNo.trim() || formPaymentNumber,
      cost_code: formCostCode !== 'Select Cost Code' ? formCostCode : undefined,
      bank_name: chosenBank?.bank_name,
      bank_account: chosenBank?.account_number,
      status: 'APPROVED',
      notes: formNotes.trim() || '-',
      entry_by: 'Priya',
      paid_to: chosenBank ? `Booshnam Associates Pvt Ltd (${chosenBank.bank_name})` : 'Booshnam Associates Pvt Ltd',
      media_url: formMediaUrl || undefined
    };

    const updated = [newTx, ...transactions];
    persistTransactions(updated);

    // Synchronize transaction into Accounts & Finance
    syncProjectTransactionToFinance(project, newTx);

    onShowToast?.(`${selectedSubtype} of ₹${finalAmount.toLocaleString('en-IN')} saved & synced to Accounts & Finance under "${newTx.party_name}"!`);
    setIsCreateModalOpen(false);
  };

  // Handle File Input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ts = getCurrentUploadTimestamp();
    setFormMediaUploadedAt(ts);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setFormMediaUrl(reader.result);
          onShowToast?.(`Receipt attached on ${ts}`);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setFormMediaUrl('https://images.unsplash.com/photo-1541888946425-d0fbb186156a?w=800&auto=format&fit=crop&q=80');
      onShowToast?.(`Document attached on ${ts}`);
    }
  };

  // Filtered Payment Requests List
  const filteredPaymentRequests = paymentRequests.filter(pr => {
    const matchesSearch = 
      pr.party_name.toLowerCase().includes(search.toLowerCase()) ||
      pr.request_number.toLowerCase().includes(search.toLowerCase()) ||
      pr.request_type.toLowerCase().includes(search.toLowerCase());
    const matchesDate = !dateFilter || pr.payment_date === dateFilter;
    return matchesSearch && matchesDate;
  });

  // Open Payment Request Modal (Matching Image 2)
  const handleOpenPaymentRequestModal = () => {
    setFinanceParties(getFinanceParties());
    setIsPrPartyDropdownOpen(false);
    setPrNumber(`#${paymentRequests.length + 7}`);
    setPrDate(new Date().toISOString().split('T')[0]);
    setPrPartyName('');
    setPrType('Select Request Type');
    setIsPrTypeDropdownOpen(false);
    setPrAmount('');
    setPrCurrency('₹');
    setPrDueDate('');
    setPrNotes('');
    setPrMediaUrl(null);
    setPrMediaName(null);
    setIsPaymentRequestModalOpen(true);
  };

  // Save Payment Request (Matching Image 2)
  const handleSavePaymentRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prPartyName.trim()) {
      onShowToast?.('Please enter party name');
      return;
    }
    const finalAmount = Number(prAmount) || 0;
    if (finalAmount <= 0) {
      onShowToast?.('Please enter a valid amount');
      return;
    }

    const newPr: PaymentRequest = {
      id: `pr-${Date.now()}`,
      request_number: prNumber.trim() || `#${Date.now().toString().slice(-3)}`,
      payment_date: prDate,
      party_name: prPartyName.trim(),
      request_type: prType !== 'Select Request Type' ? prType : 'General Request',
      amount: finalAmount,
      currency: prCurrency,
      due_date: prDueDate || prDate,
      notes: prNotes.trim() || undefined,
      status: 'PENDING',
      media_url: prMediaUrl || undefined,
      media_name: prMediaName || undefined,
      created_at: new Date().toISOString()
    };

    const updated = [newPr, ...paymentRequests];
    persistPaymentRequests(updated);

    // Synchronize Payment Request into Accounts & Finance
    syncProjectPaymentRequestToFinance(project, newPr);

    // Notify Admin & Accounts
    let senderName = 'Site Staff';
    try {
      const stored = localStorage.getItem('siteops_user');
      if (stored) {
        const u = JSON.parse(stored);
        senderName = u.first_name || u.username || 'Site Staff';
      }
    } catch (e) {}

    addNotification({
      title: `Payment Request: ${newPr.request_number}`,
      message: `${senderName} submitted payment request of ₹${finalAmount.toLocaleString('en-IN')} for "${prPartyName.trim()}" (${newPr.request_type}) in project "${project.name}".`,
      type: 'PAYMENT_REQUEST',
      recipient: 'ADMIN',
      sender: senderName,
      projectName: project.name,
      projectId: project.id,
      amount: finalAmount,
      requestCode: newPr.request_number
    });

    onShowToast?.(`Payment Request ${newPr.request_number} of ₹${finalAmount.toLocaleString('en-IN')} created & synced to Accounts & Finance!`);
    setIsPaymentRequestModalOpen(false);
  };

  // Handle Payment Request File Upload
  const handlePrFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ts = getCurrentUploadTimestamp();
      setPrMediaName(file.name);
      setPrMediaUploadedAt(ts);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPrMediaUrl(reader.result);
          onShowToast?.(`File "${file.name}" attached on ${ts}`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Status handlers
  const handleApprovePaymentRequest = (prId: string) => {
    const updated = paymentRequests.map(pr => pr.id === prId ? { ...pr, status: 'APPROVED' as const } : pr);
    persistPaymentRequests(updated);
    if (selectedPRForOverview?.id === prId) {
      setSelectedPRForOverview({ ...selectedPRForOverview, status: 'APPROVED' });
    }
    onShowToast?.('Payment Request approved');
  };

  const handleRejectPaymentRequest = (prId: string) => {
    const updated = paymentRequests.map(pr => pr.id === prId ? { ...pr, status: 'REJECTED' as const } : pr);
    persistPaymentRequests(updated);
    if (selectedPRForOverview?.id === prId) {
      setSelectedPRForOverview({ ...selectedPRForOverview, status: 'REJECTED' });
    }
    onShowToast?.('Payment Request rejected');
  };

  const handlePayPaymentRequest = (pr: PaymentRequest) => {
    setSelectedPRForOverview(null);
    handleOpenCreateModal('Payment Out', 'OUT');
    setFormPartyName(pr.party_name);
    setFormAmount(pr.amount);
    setFormNotes(`Settlement for ${pr.request_number} (${pr.request_type})`);
    const updated = paymentRequests.map(p => p.id === pr.id ? { ...p, status: 'PAID' as const } : p);
    persistPaymentRequests(updated);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      
      {/* ============================================================== */}
      {/* 1. TOP CONTROL BAR (Matching Image 1 & 4)                      */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        
        {/* Left: Tab Switcher (Transactions / Payment Requests) & Icons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Transactions Pill */}
          <button
            type="button"
            onClick={() => setActiveSubTab('transactions')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'transactions'
                ? 'border border-red-600 bg-white text-red-600 shadow-2xs'
                : 'border border-slate-200 bg-white text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            Transactions
          </button>

          {/* Payment Requests Pill */}
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('payment_requests');
              onShowToast?.('Payment Requests view active');
            }}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'payment_requests'
                ? 'border border-red-600 bg-white text-red-600 shadow-2xs'
                : 'border border-slate-200 bg-white text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            Payment Requests
          </button>

          {/* Filter & Calendar Icons (when in Transactions tab) */}
          {activeSubTab === 'transactions' && (
            <>
              {/* Filter Icon Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsFilterModalOpen(!isFilterModalOpen)}
                  className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-red-600 hover:border-red-200 transition-all cursor-pointer flex items-center justify-center"
                  title="Filter transactions"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>

                {/* Quick Filter Popover */}
                {isFilterModalOpen && (
                  <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-40 animate-in fade-in">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-900">Filter Records</span>
                      <button 
                        onClick={() => setIsFilterModalOpen(false)}
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="pt-2 space-y-2 text-xs">
                      <input
                        type="text"
                        placeholder="Search party or #..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-red-600"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSearch('');
                          setDateFilter('');
                          setIsFilterModalOpen(false);
                        }}
                        className="w-full py-1 text-center text-xs text-red-600 hover:underline font-semibold cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Calendar Icon Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                    dateFilter 
                      ? 'border-red-600 text-red-600 bg-red-50' 
                      : 'border-slate-200 bg-white text-slate-600 hover:text-red-600 hover:border-red-200'
                  }`}
                  title="Filter by date"
                >
                  <Calendar className="w-3.5 h-3.5" />
                </button>

                {isCalendarOpen && (
                  <div className="absolute left-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-40 animate-in fade-in">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Date</label>
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => {
                        setDateFilter(e.target.value);
                        setIsCalendarOpen(false);
                      }}
                      className="w-full text-xs p-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-red-600"
                    />
                    {dateFilter && (
                      <button
                        type="button"
                        onClick={() => {
                          setDateFilter('');
                          setIsCalendarOpen(false);
                        }}
                        className="mt-2 w-full text-center text-xs text-red-600 hover:underline font-semibold"
                      >
                        Clear Date Filter
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Action Icons & Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          {activeSubTab === 'transactions' ? (
            <>
              {/* Logistics Truck Icon */}
              <button
                type="button"
                onClick={() => onShowToast?.('Logistics & Delivery tracking status active')}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                title="Logistics & Delivery"
              >
                <Truck className="w-4 h-4" />
              </button>

              {/* Feedback Thumbs Up Icon with Badge 0 */}
              <button
                type="button"
                onClick={() => onShowToast?.('Feedback & Approvals: 0 pending')}
                className="relative p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                title="Feedback & Approvals"
              >
                <ThumbsUp className="w-4 h-4" />
                <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-black rounded-md px-1 py-0.2 shadow-xs">
                  0
                </span>
              </button>

              {/* Download Export Icon */}
              <button
                type="button"
                onClick={() => onShowToast?.('Exporting transactions to Excel/PDF...')}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                title="Download Reports"
              >
                <Download className="w-4 h-4" />
              </button>

              {/* Primary '+ Transaction ▾' Button (Red & White Theme per User Instruction) */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  id="add-transaction-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDropdownOpen(!isDropdownOpen);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer select-none"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Transaction</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

            {/* ============================================================== */}
            {/* 2. SIDE POPUP / DROPDOWN MENU (Exact Match to Image 2)         */}
            {/* ============================================================== */}
            {isDropdownOpen && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-2 w-[340px] sm:w-[390px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-5 z-50 animate-in fade-in zoom-in-95 duration-150 select-none space-y-4 max-h-[85vh] overflow-y-auto"
              >
                {/* Section 1: Payment */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 pb-2 border-b border-dashed border-slate-200 tracking-wide">
                    Payment
                  </h4>
                  <div className="grid grid-cols-2 gap-2.5 pt-2.5">
                    <button
                      type="button"
                      onClick={() => handleOpenCreateModal('Payment In', 'IN')}
                      className="py-2.5 px-3 rounded-xl text-xs font-semibold text-[#1e8349] bg-[#eafaf1] hover:bg-[#d8f5e5] border border-[#d1f2de] transition-all cursor-pointer text-center active:scale-98 shadow-2xs"
                    >
                      + Payment In
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenCreateModal('Payment Out', 'OUT')}
                      className="py-2.5 px-3 rounded-xl text-xs font-semibold text-[#d9383a] bg-[#fdeeed] hover:bg-[#fbd9d7] border border-[#fad2d0] transition-all cursor-pointer text-center active:scale-98 shadow-2xs"
                    >
                      + Payment Out
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenCreateModal('Debit Note', 'OUT')}
                      className="py-2.5 px-3 rounded-xl text-xs font-semibold text-[#4a55a2] bg-[#eef0fc] hover:bg-[#e2e6fa] border border-[#dfe3fa] transition-all cursor-pointer text-center active:scale-98 shadow-2xs"
                    >
                      + Debit Note
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenCreateModal('Credit Note', 'IN')}
                      className="py-2.5 px-3 rounded-xl text-xs font-semibold text-[#4a55a2] bg-[#eef0fc] hover:bg-[#e2e6fa] border border-[#dfe3fa] transition-all cursor-pointer text-center active:scale-98 shadow-2xs"
                    >
                      + Credit Note
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenCreateModal('Party to Party Payment', 'OUT')}
                      className="col-span-2 py-2.5 px-3 rounded-xl text-xs font-semibold text-[#4a55a2] bg-[#eef0fc] hover:bg-[#e2e6fa] border border-[#dfe3fa] transition-all cursor-pointer text-center active:scale-98 shadow-2xs"
                    >
                      + Party to Party Payment
                    </button>
                  </div>
                </div>

                {/* Section 2: Sales */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 pb-2 border-b border-dashed border-slate-200 tracking-wide">
                    Sales
                  </h4>
                  <div className="grid grid-cols-2 gap-2.5 pt-2.5">
                    <button
                      type="button"
                      onClick={() => handleOpenCreateModal('Sales Invoice', 'IN')}
                      className="py-2.5 px-3 rounded-xl text-xs font-semibold text-[#4a55a2] bg-[#eef0fc] hover:bg-[#e2e6fa] border border-[#dfe3fa] transition-all cursor-pointer text-center active:scale-98 shadow-2xs"
                    >
                      + Sales Invoice
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenCreateModal('Material Sales', 'IN')}
                      className="py-2.5 px-3 rounded-xl text-xs font-semibold text-[#4a55a2] bg-[#eef0fc] hover:bg-[#e2e6fa] border border-[#dfe3fa] transition-all cursor-pointer text-center active:scale-98 shadow-2xs"
                    >
                      + Material Sales
                    </button>
                  </div>
                </div>

                {/* Section 3: Expense */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 pb-2 border-b border-dashed border-slate-200 tracking-wide">
                    Expense
                  </h4>
                  <div className="grid grid-cols-2 gap-2.5 pt-2.5">
                    <button
                      type="button"
                      onClick={() => handleOpenCreateModal('Material Purchase', 'OUT')}
                      className="py-2.5 px-3 rounded-xl text-xs font-semibold text-[#4a55a2] bg-[#eef0fc] hover:bg-[#e2e6fa] border border-[#dfe3fa] transition-all cursor-pointer text-center active:scale-98 shadow-2xs"
                    >
                      + Material Purchase
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenCreateModal('Material Return', 'IN')}
                      className="py-2.5 px-3 rounded-xl text-xs font-semibold text-[#4a55a2] bg-[#eef0fc] hover:bg-[#e2e6fa] border border-[#dfe3fa] transition-all cursor-pointer text-center active:scale-98 shadow-2xs"
                    >
                      + Material Return
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenCreateModal('Material Transfer', 'OUT')}
                      className="py-2.5 px-3 rounded-xl text-xs font-semibold text-[#4a55a2] bg-[#eef0fc] hover:bg-[#e2e6fa] border border-[#dfe3fa] transition-all cursor-pointer text-center active:scale-98 shadow-2xs"
                    >
                      + Material Transfer
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenCreateModal('Sub Con Bill', 'OUT')}
                      className="py-2.5 px-3 rounded-xl text-xs font-semibold text-[#4a55a2] bg-[#eef0fc] hover:bg-[#e2e6fa] border border-[#dfe3fa] transition-all cursor-pointer text-center active:scale-98 shadow-2xs"
                    >
                      + Sub Con Bill
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenCreateModal('Other Expense', 'OUT')}
                      className="py-2.5 px-3 rounded-xl text-xs font-semibold text-[#4a55a2] bg-[#eef0fc] hover:bg-[#e2e6fa] border border-[#dfe3fa] transition-all cursor-pointer text-center active:scale-98 shadow-2xs"
                    >
                      + Other Expense
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenCreateModal('Equipment Expense', 'OUT')}
                      className="py-2.5 px-3 rounded-xl text-xs font-semibold text-[#4a55a2] bg-[#eef0fc] hover:bg-[#e2e6fa] border border-[#dfe3fa] transition-all cursor-pointer text-center active:scale-98 shadow-2xs"
                    >
                      + Equipment Expense
                    </button>
                  </div>
                </div>

                {/* Section 4: My Account */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 pb-2 border-b border-dashed border-slate-200 tracking-wide">
                    My Account
                  </h4>
                  <div className="grid grid-cols-2 gap-2.5 pt-2.5">
                    <button
                      type="button"
                      onClick={() => handleOpenCreateModal('I Paid', 'OUT')}
                      className="py-2.5 px-3 rounded-xl text-xs font-semibold text-[#d9383a] bg-[#fdeeed] hover:bg-[#fbd9d7] border border-[#fad2d0] transition-all cursor-pointer text-center active:scale-98 shadow-2xs"
                    >
                      + I Paid
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenCreateModal('I Received', 'IN')}
                      className="py-2.5 px-3 rounded-xl text-xs font-semibold text-[#1e8349] bg-[#eafaf1] hover:bg-[#d8f5e5] border border-[#d1f2de] transition-all cursor-pointer text-center active:scale-98 shadow-2xs"
                    >
                      + I Received
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
            </>
          ) : (
            /* Payment Requests Mode (Matching Image 1) */
            <>
              {/* Download Export Icon */}
              <button
                type="button"
                onClick={() => onShowToast?.('Exporting payment requests to Excel/PDF...')}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                title="Download Reports"
              >
                <Download className="w-4 h-4" />
              </button>

              {/* Primary '+ Payment Request' Button (Matching Image 1 & 2 in Red & White) */}
              <button
                type="button"
                id="add-payment-request-btn"
                onClick={handleOpenPaymentRequestModal}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer select-none"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Payment Request</span>
              </button>
            </>
          )}
        </div>

      </div>

      {/* ============================================================== */}
      {/* 3. TWO METRIC CARDS: Project Balance & Margin (Image 1 & 4)    */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Card 1: Project Balance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-600 block">Project Balance</span>
            <div className="text-2xl font-black text-slate-900 tracking-tight tracking-tight">
              ₹ {projectBalance.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 pt-0.5">
              <span>In: ₹ {totalIn.toLocaleString('en-IN')}</span>
              <Info className="w-3 h-3 text-slate-400 inline" />
              <span className="text-slate-300">|</span>
              <span>Out: ₹ {totalOut.toLocaleString('en-IN')}</span>
              <Info className="w-3 h-3 text-slate-400 inline" />
            </div>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 border border-amber-100/80 flex items-center justify-center shrink-0 shadow-2xs">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Margin */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-slate-600">Margin</span>
              <Info className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight tracking-tight">
              ₹ {margin.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 pt-0.5">
              <span>Sales: ₹ {totalSales.toLocaleString('en-IN')}</span>
              <Info className="w-3 h-3 text-slate-400 inline" />
              <span className="text-slate-300">|</span>
              <span>Expense: ₹ {totalExpense.toLocaleString('en-IN')}</span>
              <Info className="w-3 h-3 text-slate-400 inline" />
            </div>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-100/80 flex items-center justify-center shrink-0 font-bold text-lg shadow-2xs">
            <Percent className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* ============================================================== */}
      {/* 4. TRANSACTIONS TABLE / LIST (Matching Image 1 & 4)            */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        {/* Table Header matching Image 1 & 4: Party Name, Details, Amount */}
        <div className="grid grid-cols-12 px-5 py-3 border-b border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-700">
          <div className="col-span-6">Party Name</div>
          <div className="col-span-3 text-center">Details</div>
          <div className="col-span-3 text-right">Amount</div>
        </div>

        {activeSubTab === 'transactions' ? (
          /* Transactions List */
          filteredTransactions.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-2xs">
                <TrendingUp className="w-7 h-7" />
              </div>
              <h4 className="text-xs font-bold text-slate-700">No Data Transaction</h4>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                No transactions recorded for this project yet. Click "+ Transaction" to record payment in, payment out, or expense.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleOpenCreateModal('Payment In', 'IN')}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record First Transaction</span>
                </button>
              </div>
            </div>
          ) : (
            /* Populated Rows (Matching Image 4) */
            <div className="divide-y divide-slate-100">
              {filteredTransactions.map((tx) => {
                // Parse date for green chip (e.g. "17 Sep 26")
                let dateBadge = '17 Sep 26';
                try {
                  const d = new Date(tx.date);
                  if (!isNaN(d.getTime())) {
                    dateBadge = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
                  }
                } catch (e) {}

                const isPaymentIn = tx.type === 'IN';

                return (
                  <div
                    key={tx.id}
                    onClick={() => setSelectedTxForOverview(tx)}
                    className="grid grid-cols-12 px-5 py-4 items-center hover:bg-red-50/20 transition-colors cursor-pointer group select-none"
                  >
                    {/* Left Column: Date & Icon Badge + Party Name & Subtitle */}
                    <div className="col-span-6 flex items-center gap-3 min-w-0">
                      {/* Green/Rose Date Badge matching Image 4 */}
                      <div className="flex flex-col items-center shrink-0 w-12 rounded-lg overflow-hidden border border-slate-200/80 shadow-2xs">
                        <div className={`w-full text-center text-[9px] font-bold py-0.5 text-white ${
                          isPaymentIn ? 'bg-emerald-700' : 'bg-rose-600'
                        }`}>
                          {dateBadge}
                        </div>
                        <div className={`w-full py-1 flex items-center justify-center ${
                          isPaymentIn ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {isPaymentIn ? <Coins className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                      </div>

                      {/* Party Name & Subtitle */}
                      <div className="min-w-0 truncate">
                        <h4 className="font-bold text-xs text-slate-900 group-hover:text-red-600 transition-colors truncate">
                          {tx.party_name}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                          {tx.transaction_sub_type || (isPaymentIn ? 'Payment In' : 'Payment Out')} | {tx.transaction_number}
                        </p>
                      </div>
                    </div>

                    {/* Center Column: Details */}
                    <div className="col-span-3 text-center">
                      <span className="text-xs text-slate-400 tracking-tight">
                        {tx.notes && tx.notes !== '-' ? tx.notes : '-'}
                      </span>
                    </div>

                    {/* Right Column: Amount & Payment Method Pill */}
                    <div className="col-span-3 text-right">
                      <div className="tracking-tight font-bold text-xs text-slate-900">
                        ₹ {Number(tx.amount).toLocaleString('en-IN')}
                      </div>
                      <div className="mt-1 flex items-center justify-end gap-1.5 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200/80">
                          {tx.payment_mode || 'Cash'}
                        </span>
                        {tx.bank_name && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-medium bg-red-50 text-red-600 border border-red-100">
                            {tx.bank_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Payment Requests List (Exact match to Image 1) */
          filteredPaymentRequests.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-2xs">
                <TrendingUp className="w-7 h-7" />
              </div>
              <h4 className="text-xs font-bold text-slate-700">No Data Payment Requests</h4>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                No payment requests created for this project yet. Click "+ Payment Request" to raise a new request.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOpenPaymentRequestModal}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Payment Request</span>
                </button>
              </div>
            </div>
          ) : (
            /* Populated Payment Request Rows */
            <div className="divide-y divide-slate-100">
              {filteredPaymentRequests.map((pr) => {
                let dateBadge = '17 Sep 26';
                try {
                  const d = new Date(pr.payment_date);
                  if (!isNaN(d.getTime())) {
                    dateBadge = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
                  }
                } catch (e) {}

                return (
                  <div
                    key={pr.id}
                    onClick={() => setSelectedPRForOverview(pr)}
                    className="grid grid-cols-12 px-5 py-4 items-center hover:bg-red-50/20 transition-colors cursor-pointer group select-none"
                  >
                    {/* Left Column: Date & Icon Badge + Party Name & Subtitle */}
                    <div className="col-span-6 flex items-center gap-3 min-w-0">
                      <div className="flex flex-col items-center shrink-0 w-12 rounded-lg overflow-hidden border border-slate-200/80 shadow-2xs">
                        <div className="w-full text-center text-[9px] font-bold py-0.5 text-white bg-amber-600">
                          {dateBadge}
                        </div>
                        <div className="w-full py-1 flex items-center justify-center bg-amber-50 text-amber-600">
                          <FileText className="w-4 h-4" />
                        </div>
                      </div>

                      <div className="min-w-0 truncate">
                        <h4 className="font-bold text-xs text-slate-900 group-hover:text-red-600 transition-colors truncate">
                          {pr.party_name}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                          {pr.request_type} | {pr.request_number}
                        </p>
                      </div>
                    </div>

                    {/* Center Column: Details / Due Date */}
                    <div className="col-span-3 text-center">
                      <span className="text-xs text-slate-500 tracking-tight">
                        {pr.due_date ? `Due: ${pr.due_date}` : (pr.notes || '-')}
                      </span>
                    </div>

                    {/* Right Column: Amount & Status Badge */}
                    <div className="col-span-3 text-right">
                      <div className="tracking-tight font-bold text-xs text-slate-900">
                        ₹ {Number(pr.amount).toLocaleString('en-IN')}
                      </div>
                      <div className="mt-1 flex items-center justify-end gap-1.5">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                          pr.status === 'APPROVED' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : pr.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : pr.status === 'PAID'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {pr.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* ============================================================== */}
      {/* 5. CREATE TRANSACTION MODAL (Exact Match to Image 3)          */}
      {/* ============================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-150 animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm tracking-wide uppercase">
                    {selectedSubtype.toUpperCase()}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">
                    {project.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTransaction}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Red Theme Stripe below header */}
            <div className="h-1 bg-red-600 w-full shrink-0" />

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveTransaction} className="p-6 space-y-4 overflow-y-auto flex-1">
              
              {/* Row 1: Payment Number & Payment Date */}
              <div className="grid grid-cols-2 gap-3">
                {/* Payment Number with Edit Pencil */}
                <div className="relative border border-slate-200 rounded-xl px-3.5 pt-2.5 pb-2 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all">
                  <label className="absolute -top-2 left-2.5 bg-white px-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    PAYMENT NUMBER <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      required
                      value={formPaymentNumber}
                      onChange={(e) => setFormPaymentNumber(e.target.value)}
                      className="w-full text-xs font-bold text-slate-900 bg-transparent focus:outline-none"
                    />
                    <Pencil className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                  </div>
                </div>

                {/* Payment Date with Calendar Icon */}
                <div className="relative border border-slate-200 rounded-xl px-3.5 pt-2.5 pb-2 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all">
                  <label className="absolute -top-2 left-2.5 bg-white px-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    PAYMENT DATE <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full text-xs font-bold text-slate-900 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Party Name with Accounts & Finance Selector Dropdown */}
              <div ref={partyDropdownRef} className="relative">
                <div 
                  onClick={() => setIsPartyDropdownOpen(true)}
                  className={`relative border rounded-xl px-3.5 pt-2.5 pb-2 transition-all cursor-text ${
                    isPartyDropdownOpen 
                      ? 'border-red-600 ring-2 ring-red-100 shadow-xs' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <label className="absolute -top-2 left-2.5 bg-white px-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider pointer-events-none">
                    PARTY NAME <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Select party from Accounts & Finance or type..."
                      value={formPartyName}
                      onFocus={() => setIsPartyDropdownOpen(true)}
                      onChange={(e) => {
                        setFormPartyName(e.target.value);
                        setIsPartyDropdownOpen(true);
                      }}
                      className="w-full text-xs font-semibold text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-300"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      {formPartyName && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormPartyName('');
                          }}
                          className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsPartyDropdownOpen(!isPartyDropdownOpen);
                        }}
                        className="p-0.5 text-red-600 hover:text-red-700 cursor-pointer"
                        title="Browse Accounts & Finance Parties"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isPartyDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Selected Party Badge Info if matched with Accounts & Finance */}
                {selectedPartyRecord && (
                  <div className="mt-1.5 flex items-center justify-between px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-lg text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className={`w-4 h-4 rounded-full ${selectedPartyRecord.avatarColor || 'bg-[#1E40AF]'} text-white text-[8px] font-bold flex items-center justify-center shrink-0`}>
                        {selectedPartyRecord.avatarText || selectedPartyRecord.name.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-700 truncate">{selectedPartyRecord.name}</span>
                    </div>
                    <span className="font-medium text-slate-500 text-[10px] shrink-0">
                      Balance: ₹ {(selectedPartyRecord.balanceDue || 0).toLocaleString('en-IN')} ({selectedPartyRecord.status})
                    </span>
                  </div>
                )}

                {/* Dropdown Menu of Accounts & Finance Parties */}
                {isPartyDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-2xl border border-red-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1 max-h-64 overflow-y-auto">
                    <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                      <span>Accounts & Finance Parties ({allPartyOptions.length})</span>
                      <span className="text-[9px] text-red-600 font-semibold lowercase">click to select</span>
                    </div>

                    {filteredTxPartyOptions.length === 0 ? (
                      <div className="p-3 text-center">
                        <p className="text-xs text-slate-500">
                          {formPartyName.trim() 
                            ? `No party matches "${formPartyName}".`
                            : 'No parties added in Accounts & Finance yet.'}
                        </p>
                        {formPartyName.trim() && (
                          <button
                            type="button"
                            onClick={() => setIsPartyDropdownOpen(false)}
                            className="mt-2 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add & Sync "{formPartyName.trim()}"</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      filteredTxPartyOptions.map((p) => {
                        const isSelected = formPartyName.trim().toLowerCase() === p.name.trim().toLowerCase();
                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              setFormPartyName(p.name);
                              setIsPartyDropdownOpen(false);
                            }}
                            className={`px-3 py-2 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-between group ${
                              isSelected
                                ? 'bg-red-50 text-red-900 font-bold border border-red-200 shadow-2xs'
                                : 'hover:bg-red-50/50 hover:text-red-700 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-7 h-7 rounded-full ${p.avatarColor || 'bg-[#1E40AF]'} text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-2xs`}>
                                {p.avatarText || p.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-xs truncate text-slate-900 group-hover:text-red-700">
                                  {p.name}
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-2 truncate">
                                  <span>ID: {p.partyId || 'N/A'}</span>
                                  {p.phone && <span>• {p.phone}</span>}
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0 flex items-center gap-2">
                              <div className="text-[10px] font-semibold text-slate-600 font-mono">
                                ₹ {(p.balanceDue || 0).toLocaleString('en-IN')}
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-red-600 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })
                    )}

                    {/* Quick option to use custom typed party name */}
                    {formPartyName.trim() && !filteredTxPartyOptions.some(p => p.name.trim().toLowerCase() === formPartyName.trim().toLowerCase()) && (
                      <div
                        onClick={() => setIsPartyDropdownOpen(false)}
                        className="p-2 border-t border-dashed border-slate-200 text-center"
                      >
                        <div className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer flex items-center justify-center gap-1">
                          <Plus className="w-3.5 h-3.5" />
                          <span>Use "{formPartyName.trim()}" (Will be created in Accounts & Finance)</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Row 3: Amount */}
              <div className="relative border border-slate-200 rounded-xl px-3.5 pt-2.5 pb-2 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all">
                <label className="absolute -top-2 left-2.5 bg-white px-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  AMOUNT
                </label>
                <input
                  type="number"
                  required
                  placeholder="0"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full text-xs tracking-tight font-bold text-slate-900 bg-transparent focus:outline-none"
                />
              </div>

              {/* Row 4: Payment Method Radio Options */}
              <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
                <label className="text-xs font-semibold text-slate-700 block">
                  Payment Method:
                </label>
                <div className="flex items-center gap-6">
                  {(['Cash', 'Bank Transfer', 'Cheque'] as const).map((method) => (
                    <label key={method} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="payment_method"
                        checked={formPaymentMethod === method}
                        onChange={() => setFormPaymentMethod(method)}
                        className="w-4 h-4 text-red-600 focus:ring-red-500 accent-red-600"
                      />
                      <span className="font-medium">{method}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Dynamic Bank Selection & Add Bank Column when Bank Transfer or Cheque is selected */}
              {(formPaymentMethod === 'Bank Transfer' || formPaymentMethod === 'Cheque') && (
                <div className="space-y-3 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-red-600" />
                      <span>Select Bank Account</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewBank(!isAddingNewBank)}
                      className="px-2.5 py-1 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3 stroke-[3]" />
                      <span>Add Bank</span>
                    </button>
                  </div>

                  {/* Custom Stylish Bank Select Dropdown (Zero Native Blue, 100% Red & White) */}
                  <div ref={bankDropdownRef} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsBankDropdownOpen(!isBankDropdownOpen);
                        setIsCostCodeDropdownOpen(false);
                      }}
                      className={`w-full text-left relative border rounded-xl px-3.5 pt-2.5 pb-2 bg-white transition-all cursor-pointer flex items-center justify-between group ${
                        isBankDropdownOpen 
                          ? 'border-red-600 ring-2 ring-red-100 shadow-xs' 
                          : 'border-slate-200 hover:border-red-400'
                      }`}
                    >
                      <label className="absolute -top-2 left-2.5 bg-white px-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider pointer-events-none">
                        COMPANY BANK ACCOUNT <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isBankDropdownOpen ? 'bg-red-600 text-white shadow-xs' : 'bg-red-50 text-red-600 border border-red-100'
                        }`}>
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {currentSelectedBank ? currentSelectedBank.bank_name : 'Select Bank Account'}
                            </span>
                            {currentSelectedBank && (
                              <span className="px-1.5 py-0.2 bg-red-50 text-red-600 border border-red-100 rounded text-[9px] font-bold shrink-0">
                                {currentSelectedBank.account_type}
                              </span>
                            )}
                          </div>
                          {currentSelectedBank && (
                            <p className="text-[11px] text-slate-500 tracking-tight truncate mt-0.5">
                              A/c: •••• {currentSelectedBank.account_number.slice(-4)} <span className="text-slate-300">•</span> {currentSelectedBank.branch}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <ChevronDown className={`w-4 h-4 text-red-600 transition-transform duration-200 ${isBankDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {/* Custom Styled Red & White Dropdown Popover */}
                    {isBankDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-2xl border border-red-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
                        <div className="px-2.5 py-1.5 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                          <span>SELECT COMPANY BANK</span>
                          <span className="text-red-600 font-bold lowercase">({bankAccounts.length} accounts)</span>
                        </div>

                        <div className="max-h-56 overflow-y-auto space-y-1 pr-0.5">
                          {bankAccounts.length === 0 ? (
                            <div className="py-6 text-center text-xs text-slate-400">
                              No bank accounts registered yet.
                            </div>
                          ) : (
                            bankAccounts.map((b) => {
                              const isSelected = b.id === selectedBankId;
                              return (
                                <div
                                  key={b.id}
                                  onClick={() => {
                                    setSelectedBankId(b.id);
                                    setIsBankDropdownOpen(false);
                                  }}
                                  className={`w-full p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between text-left group ${
                                    isSelected 
                                      ? 'bg-red-50/90 border border-red-200 shadow-2xs' 
                                      : 'hover:bg-red-50/50 border border-transparent hover:border-red-100'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                      isSelected 
                                        ? 'bg-red-600 text-white shadow-xs' 
                                        : 'bg-slate-100 text-slate-600 group-hover:bg-red-100 group-hover:text-red-600'
                                    }`}>
                                      <Building2 className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className={`text-xs font-bold truncate ${
                                          isSelected ? 'text-red-700' : 'text-slate-900 group-hover:text-red-600'
                                        }`}>
                                          {b.bank_name}
                                        </span>
                                        <span className={`px-1.5 py-0.2 text-[9px] font-semibold rounded border ${
                                          isSelected 
                                            ? 'bg-white text-red-700 border-red-200' 
                                            : 'bg-slate-100 text-slate-600 border-slate-200/60'
                                        }`}>
                                          {b.account_type}
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-slate-500 tracking-tight flex items-center gap-1.5 mt-0.5">
                                        <span className={isSelected ? 'text-red-600 font-semibold' : ''}>
                                          A/c: •••• {b.account_number.slice(-4)}
                                        </span>
                                        <span className="text-slate-300">•</span>
                                        <span className="text-slate-400 truncate text-[10px]">{b.branch}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {isSelected && (
                                    <div className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                                      <Check className="w-3 h-3 stroke-[3]" />
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Footer Quick Add Button in Dropdown */}
                        <div className="pt-1.5 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => {
                              setIsBankDropdownOpen(false);
                              setIsAddingNewBank(true);
                            }}
                            className="w-full py-2 px-3 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Add New Bank Account</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Selected Bank Details Card */}
                  {currentSelectedBank && !isAddingNewBank && (
                    <div className="p-3 bg-white rounded-xl border border-red-100 text-[11px] text-slate-600 space-y-1 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          {currentSelectedBank.bank_name}
                        </span>
                        <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[9px] font-bold rounded-full border border-red-200">
                          {currentSelectedBank.account_type}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 tracking-tight text-[10px] pt-0.5">
                        <span>A/c: <strong className="text-slate-700">{currentSelectedBank.account_number}</strong></span>
                        <span>IFSC: <strong className="text-slate-700">{currentSelectedBank.ifsc_code}</strong></span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Branch: {currentSelectedBank.branch}
                      </div>
                    </div>
                  )}

                  {/* Inline Add New Bank Form */}
                  {isAddingNewBank && (
                    <div className="p-3.5 bg-white rounded-xl border border-red-200 shadow-sm space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-red-600" />
                          <span>Add New Bank Account</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsAddingNewBank(false)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Bank Name *</label>
                          <input
                            type="text"
                            placeholder="e.g. Axis Bank / Kotak"
                            value={newBankName}
                            onChange={(e) => setNewBankName(e.target.value)}
                            className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-red-600"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Account Number *</label>
                          <input
                            type="text"
                            placeholder="e.g. 91802004819201"
                            value={newAccountNumber}
                            onChange={(e) => setNewAccountNumber(e.target.value)}
                            className="w-full text-xs p-2 border border-slate-200 rounded-lg tracking-tight focus:outline-none focus:border-red-600"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">IFSC Code</label>
                          <input
                            type="text"
                            placeholder="e.g. UTIB0000123"
                            value={newIfscCode}
                            onChange={(e) => setNewIfscCode(e.target.value)}
                            className="w-full text-xs p-2 border border-slate-200 rounded-lg tracking-tight uppercase focus:outline-none focus:border-red-600"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Branch</label>
                          <input
                            type="text"
                            placeholder="e.g. T. Nagar, Chennai"
                            value={newBranch}
                            onChange={(e) => setNewBranch(e.target.value)}
                            className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-red-600"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsAddingNewBank(false)}
                          className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleAddNewBank}
                          className="px-3.5 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs cursor-pointer active:scale-95 transition-all"
                        >
                          Save Bank
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Row 5: Add Cost Code (Custom Styled Red & White Dropdown) */}
              <div ref={costCodeDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsCostCodeDropdownOpen(!isCostCodeDropdownOpen);
                    setIsBankDropdownOpen(false);
                  }}
                  className={`w-full text-left relative border rounded-xl px-3.5 pt-2.5 pb-2 bg-white transition-all cursor-pointer flex items-center justify-between group ${
                    isCostCodeDropdownOpen
                      ? 'border-red-600 ring-2 ring-red-100 shadow-xs'
                      : 'border-slate-200 hover:border-red-400'
                  }`}
                >
                  <label className="absolute -top-2 left-2.5 bg-white px-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider pointer-events-none">
                    ADD COST CODE
                  </label>
                  <span className={`text-xs truncate ${
                    formCostCode !== 'Select Cost Code' ? 'text-slate-900 font-semibold' : 'text-slate-400 font-normal'
                  }`}>
                    {formCostCode}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-red-600 shrink-0 ml-1 transition-transform duration-200 ${
                    isCostCodeDropdownOpen ? 'rotate-180' : ''
                  }`} />
                </button>

                {isCostCodeDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-2xl border border-red-100 p-2 z-40 animate-in fade-in zoom-in-95 duration-150 space-y-1 max-h-56 overflow-y-auto">
                    {[
                      'Select Cost Code',
                      '01 - Foundation & Earthwork',
                      '02 - RCC Structural Framing',
                      '03 - Masonry & Plastering',
                      '04 - MEP & Electrical',
                      '05 - Flooring & Tiles',
                      '06 - Finishing & Painting',
                      '07 - Miscellaneous / Site'
                    ].map((code) => {
                      const isSelected = formCostCode === code;
                      return (
                        <div
                          key={code}
                          onClick={() => {
                            setFormCostCode(code);
                            setIsCostCodeDropdownOpen(false);
                          }}
                          className={`px-3 py-2 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-between group ${
                            isSelected
                              ? 'bg-red-50 text-red-700 font-bold border border-red-200 shadow-2xs'
                              : 'text-slate-700 hover:bg-red-50/50 hover:text-red-700 border border-transparent font-medium'
                          }`}
                        >
                          <span className={isSelected ? 'text-red-700' : 'group-hover:text-red-700'}>{code}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-red-600 stroke-[3]" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Row 6: Reference No. */}
              <div className="relative border border-slate-200 rounded-xl px-3.5 pt-2.5 pb-2 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all">
                <label className="absolute -top-2 left-2.5 bg-white px-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  REFERENCE NO.
                </label>
                <input
                  type="text"
                  placeholder="Optional reference, UTR, or receipt #"
                  value={formReferenceNo}
                  onChange={(e) => setFormReferenceNo(e.target.value)}
                  className="w-full text-xs font-medium text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-300"
                />
              </div>

              {/* Row 7: More Details (Optional Accordion) */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsMoreDetailsOpen(!isMoreDetailsOpen)}
                  className="w-full px-3.5 py-2.5 bg-slate-50/50 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span>More Details (Optional)</span>
                  {isMoreDetailsOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {isMoreDetailsOpen && (
                  <div className="p-3.5 space-y-3 bg-white border-t border-slate-100 animate-in fade-in">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Notes / Remarks
                      </label>
                      <input
                        type="text"
                        placeholder="Purpose of payment or transaction notes..."
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-red-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Row 8: Upload Files Dropzone */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,application/pdf"
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    formMediaUrl
                      ? 'border-red-400 bg-red-50/20'
                      : 'border-slate-200 hover:border-red-500 hover:bg-slate-50'
                  }`}
                >
                  {formMediaUrl ? (
                    <div className="space-y-2">
                      <img
                        src={formMediaUrl}
                        alt="Receipt preview"
                        className="max-h-24 mx-auto rounded-lg border border-slate-200 object-contain shadow-2xs"
                      />
                      <div className="text-[11px] font-semibold text-emerald-700 flex items-center justify-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Receipt attached</span>
                        <span className="text-[10px] text-slate-500 font-medium">({formMediaUploadedAt || getCurrentUploadTimestamp()})</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-slate-600 hover:text-red-600 transition-colors">
                      <span className="text-xs font-semibold">Upload Files</span>
                      <UploadCloud className="w-4 h-4 text-red-600" />
                    </div>
                  )}
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. PAYMENT IN OVERVIEW MODAL / DRAWER (Exact Match to Image 5) */}
      {/* ============================================================== */}
      {selectedTxForOverview && (
        <div 
          onClick={() => setSelectedTxForOverview(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-150 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-150 cursor-default animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedTxForOverview(null)}
                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm tracking-wide uppercase">
                    {selectedTxForOverview.transaction_sub_type ? selectedTxForOverview.transaction_sub_type.toUpperCase() : 'PAYMENT IN'}
                  </h3>
                  <p className="text-[11px] font-medium text-slate-500">
                    entry by {selectedTxForOverview.entry_by || 'Priya'}
                  </p>
                </div>
              </div>

              {/* Right utility buttons: Edit, Download, More */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onShowToast?.(`Editing ${selectedTxForOverview.transaction_number}`)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  title="Edit entry"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onShowToast?.(`Downloading receipt voucher ${selectedTxForOverview.transaction_number}...`)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  title="Download Voucher"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onShowToast?.('Options menu')}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Red Theme Stripe */}
            <div className="h-1 bg-red-600 w-full shrink-0" />

            {/* Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              
              {/* Voucher Card Container (Matching Image 5) */}
              <div className="bg-slate-50/40 rounded-2xl border border-slate-200/90 p-5 space-y-5">
                {/* Header line of voucher */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-400 tracking-wider uppercase text-[11px]">
                    {selectedTxForOverview.transaction_sub_type ? selectedTxForOverview.transaction_sub_type.toUpperCase() : 'PAYMENT IN'}
                  </span>
                  <span className="tracking-tight font-bold text-slate-700 text-xs">
                    No. {selectedTxForOverview.transaction_number.replace('#', '')}
                  </span>
                </div>

                {/* Amount Paid section */}
                <div className="text-center space-y-1 py-1">
                  <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase block">
                    AMOUNT PAID
                  </span>
                  <div className="text-3xl font-black text-slate-900 tracking-tight tracking-tight">
                    ₹ {Number(selectedTxForOverview.amount).toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-slate-500 font-medium pt-0.5">
                    {numberToIndianWords(selectedTxForOverview.amount)}
                  </div>
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                      <Check className="w-3.5 h-3.5" />
                      <span>Approved</span>
                    </span>
                  </div>
                </div>

                {/* Transfer Diagram: PAID BY (Left) ➔ PAID TO (Right) */}
                <div className="flex items-center justify-between gap-2 pt-2">
                  {/* Paid By Box */}
                  <div className="flex-1 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">
                      PAID BY
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {selectedTxForOverview.party_name}
                      </span>
                    </div>
                  </div>

                  {/* Dotted Arrow Connector */}
                  <div className="flex items-center px-1 text-slate-400 shrink-0">
                    <span className="text-red-500 font-bold tracking-widest text-xs select-none">••••</span>
                    <span className="text-red-300 font-bold tracking-widest text-xs select-none">•••</span>
                    <span className="text-red-600 font-bold text-xs select-none ml-0.5">►</span>
                  </div>

                  {/* Paid To Box */}
                  <div className="flex-1 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">
                      PAID TO
                    </span>
                    <div className="flex items-center gap-2">
                      {/* Red Booshnam Badge */}
                      <div className="w-7 h-7 rounded-full bg-red-600 text-white font-black text-[7px] flex items-center justify-center shrink-0 shadow-2xs tracking-tighter">
                        BOOSHNAM
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 truncate leading-tight">
                          Booshnam Associates Pvt...
                        </div>
                        {selectedTxForOverview.bank_name && (
                          <div className="text-[9px] text-slate-400 font-medium truncate">
                            {selectedTxForOverview.bank_name} •••• {selectedTxForOverview.bank_account ? selectedTxForOverview.bank_account.slice(-4) : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metadata Details Table List matching Image 5 */}
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">DATE & TIME</span>
                  <span className="font-semibold text-slate-800">
                    {selectedTxForOverview.date} {selectedTxForOverview.time ? `, ${selectedTxForOverview.time}` : ', 10:50 AM'}
                  </span>
                </div>

                <div className="py-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">PAYMENT METHOD</span>
                  <span className="font-semibold text-slate-800">
                    {selectedTxForOverview.payment_mode || 'Cash'}
                    {selectedTxForOverview.bank_name && (
                      <span className="text-slate-500 font-normal ml-1">
                        ({selectedTxForOverview.bank_name} •••• {selectedTxForOverview.bank_account ? selectedTxForOverview.bank_account.slice(-4) : ''})
                      </span>
                    )}
                  </span>
                </div>

                <div className="py-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">PROJECT</span>
                  <span className="font-semibold text-slate-800">
                    {project.name}
                  </span>
                </div>

                <div className="py-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">RECORDED BY</span>
                  <span className="font-semibold text-slate-800">
                    {selectedTxForOverview.entry_by || 'Priya'}
                  </span>
                </div>

                {/* Media Attachment section */}
                <div className="pt-3 pb-1 space-y-2">
                  <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider block">
                    Media (1 Images, 0 File)
                  </span>
                  <div className="w-20 h-20 rounded-xl border border-slate-200 bg-white p-2 flex flex-col items-center justify-center shadow-2xs">
                    <div className="text-[9px] font-black text-red-600 tracking-tighter uppercase text-center">
                      BOOSHNAM
                      <div className="text-[6px] font-medium text-slate-400">ASSOCIATES</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer: APPROVED Status Badge */}
            <div className="p-4 bg-slate-50/60 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-emerald-700">
              <Check className="w-4 h-4" />
              <span>APPROVED</span>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. PAYMENT REQUESTS CREATION MODAL (Exact Match to Image 2)   */}
      {/* ============================================================== */}
      {isPaymentRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-150 animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            
            {/* Modal Header matching Image 2 */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsPaymentRequestModalOpen(false)}
                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="font-bold text-slate-900 text-sm tracking-wide uppercase">
                  PAYMENT REQUESTS
                </h3>
              </div>

              <button
                type="button"
                onClick={handleSavePaymentRequest}
                className="px-5 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer lowercase"
              >
                save
              </button>
            </div>

            {/* Red Theme Stripe below header */}
            <div className="h-1 bg-red-600 w-full shrink-0" />

            {/* Scrollable Form Body */}
            <form onSubmit={handleSavePaymentRequest} className="p-6 space-y-4 overflow-y-auto flex-1">
              
              {/* Row 1: REQUEST NUMBER & PAYMENT DATE */}
              <div className="grid grid-cols-2 gap-3">
                {/* REQUEST NUMBER with Edit Pencil */}
                <div className="relative border border-slate-200 rounded-xl px-3.5 pt-2.5 pb-2 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all">
                  <label className="absolute -top-2 left-2.5 bg-white px-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    REQUEST NUMBER <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      required
                      value={prNumber}
                      onChange={(e) => setPrNumber(e.target.value)}
                      className="w-full text-xs font-bold text-slate-900 bg-transparent focus:outline-none"
                    />
                    <Pencil className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                  </div>
                </div>

                {/* PAYMENT DATE with Calendar Icon */}
                <div className="relative border border-slate-200 rounded-xl px-3.5 pt-2.5 pb-2 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all">
                  <label className="absolute -top-2 left-2.5 bg-white px-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    PAYMENT DATE <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="date"
                      required
                      value={prDate}
                      onChange={(e) => setPrDate(e.target.value)}
                      className="w-full text-xs font-bold text-slate-900 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: PARTY NAME with Accounts & Finance Selector Dropdown */}
              <div ref={prPartyDropdownRef} className="relative">
                <div 
                  onClick={() => setIsPrPartyDropdownOpen(true)}
                  className={`relative border rounded-xl px-3.5 pt-2.5 pb-2 transition-all cursor-text ${
                    isPrPartyDropdownOpen 
                      ? 'border-red-600 ring-2 ring-red-100 shadow-xs' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <label className="absolute -top-2 left-2.5 bg-white px-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider pointer-events-none">
                    PARTY NAME <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Select party from Accounts & Finance or type..."
                      value={prPartyName}
                      onFocus={() => setIsPrPartyDropdownOpen(true)}
                      onChange={(e) => {
                        setPrPartyName(e.target.value);
                        setIsPrPartyDropdownOpen(true);
                      }}
                      className="w-full text-xs font-semibold text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-300"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      {prPartyName && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrPartyName('');
                          }}
                          className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsPrPartyDropdownOpen(!isPrPartyDropdownOpen);
                        }}
                        className="p-0.5 text-red-600 hover:text-red-700 cursor-pointer"
                        title="Browse Accounts & Finance Parties"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isPrPartyDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Selected Party Badge Info if matched with Accounts & Finance */}
                {selectedPrPartyRecord && (
                  <div className="mt-1.5 flex items-center justify-between px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-lg text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className={`w-4 h-4 rounded-full ${selectedPrPartyRecord.avatarColor || 'bg-[#1E40AF]'} text-white text-[8px] font-bold flex items-center justify-center shrink-0`}>
                        {selectedPrPartyRecord.avatarText || selectedPrPartyRecord.name.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-700 truncate">{selectedPrPartyRecord.name}</span>
                    </div>
                    <span className="font-medium text-slate-500 text-[10px] shrink-0">
                      Balance: ₹ {(selectedPrPartyRecord.balanceDue || 0).toLocaleString('en-IN')} ({selectedPrPartyRecord.status})
                    </span>
                  </div>
                )}

                {/* Dropdown Menu of Accounts & Finance Parties */}
                {isPrPartyDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-2xl border border-red-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1 max-h-64 overflow-y-auto">
                    <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                      <span>Accounts & Finance Parties ({allPartyOptions.length})</span>
                      <span className="text-[9px] text-red-600 font-semibold lowercase">click to select</span>
                    </div>

                    {filteredPrPartyOptions.length === 0 ? (
                      <div className="p-3 text-center">
                        <p className="text-xs text-slate-500">
                          {prPartyName.trim() 
                            ? `No party matches "${prPartyName}".`
                            : 'No parties added in Accounts & Finance yet.'}
                        </p>
                        {prPartyName.trim() && (
                          <button
                            type="button"
                            onClick={() => setIsPrPartyDropdownOpen(false)}
                            className="mt-2 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add & Sync "{prPartyName.trim()}"</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      filteredPrPartyOptions.map((p) => {
                        const isSelected = prPartyName.trim().toLowerCase() === p.name.trim().toLowerCase();
                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              setPrPartyName(p.name);
                              setIsPrPartyDropdownOpen(false);
                            }}
                            className={`px-3 py-2 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-between group ${
                              isSelected
                                ? 'bg-red-50 text-red-900 font-bold border border-red-200 shadow-2xs'
                                : 'hover:bg-red-50/50 hover:text-red-700 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-7 h-7 rounded-full ${p.avatarColor || 'bg-[#1E40AF]'} text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-2xs`}>
                                {p.avatarText || p.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-xs truncate text-slate-900 group-hover:text-red-700">
                                  {p.name}
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-2 truncate">
                                  <span>ID: {p.partyId || 'N/A'}</span>
                                  {p.phone && <span>• {p.phone}</span>}
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0 flex items-center gap-2">
                              <div className="text-[10px] font-semibold text-slate-600 font-mono">
                                ₹ {(p.balanceDue || 0).toLocaleString('en-IN')}
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-red-600 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })
                    )}

                    {/* Quick option to use custom typed party name */}
                    {prPartyName.trim() && !filteredPrPartyOptions.some(p => p.name.trim().toLowerCase() === prPartyName.trim().toLowerCase()) && (
                      <div
                        onClick={() => setIsPrPartyDropdownOpen(false)}
                        className="p-2 border-t border-dashed border-slate-200 text-center"
                      >
                        <div className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer flex items-center justify-center gap-1">
                          <Plus className="w-3.5 h-3.5" />
                          <span>Use "{prPartyName.trim()}" (Will be created in Accounts & Finance)</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Row 3: TYPE with Custom Red & White Dropdown */}
              <div ref={prTypeDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsPrTypeDropdownOpen(!isPrTypeDropdownOpen)}
                  className={`w-full text-left relative border rounded-xl px-3.5 pt-2.5 pb-2 bg-white transition-all cursor-pointer flex items-center justify-between group ${
                    isPrTypeDropdownOpen
                      ? 'border-red-600 ring-2 ring-red-100 shadow-xs'
                      : 'border-slate-200 hover:border-red-400'
                  }`}
                >
                  <label className="absolute -top-2 left-2.5 bg-white px-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider pointer-events-none">
                    TYPE<span className="text-red-500">*</span>
                  </label>
                  <span className={`text-xs truncate ${
                    prType !== 'Select Request Type' ? 'text-slate-900 font-semibold' : 'text-slate-400 font-normal'
                  }`}>
                    {prType}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-red-600 shrink-0 ml-1 transition-transform duration-200 ${
                    isPrTypeDropdownOpen ? 'rotate-180' : ''
                  }`} />
                </button>

                {isPrTypeDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-2xl border border-red-100 p-2 z-40 animate-in fade-in zoom-in-95 duration-150 space-y-1 max-h-56 overflow-y-auto">
                    {PAYMENT_REQUEST_TYPES.map((type) => {
                      const isSelected = prType === type;
                      return (
                        <div
                          key={type}
                          onClick={() => {
                            setPrType(type);
                            setIsPrTypeDropdownOpen(false);
                          }}
                          className={`px-3 py-2 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-between group ${
                            isSelected
                              ? 'bg-red-50 text-red-700 font-bold border border-red-200 shadow-2xs'
                              : 'text-slate-700 hover:bg-red-50/50 hover:text-red-700 border border-transparent font-medium'
                          }`}
                        >
                          <span className={isSelected ? 'text-red-700' : 'group-hover:text-red-700'}>{type}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-red-600 stroke-[3]" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Row 4: AMOUNT & DUE DATE */}
              <div className="grid grid-cols-2 gap-3">
                {/* AMOUNT with Currency Pill */}
                <div className="relative border border-slate-200 rounded-xl px-3.5 pt-2.5 pb-2 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all">
                  <label className="absolute -top-2 left-2.5 bg-white px-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    AMOUNT<span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center justify-between">
                    <input
                      type="number"
                      required
                      placeholder="0"
                      value={prAmount}
                      onChange={(e) => setPrAmount(e.target.value ? Number(e.target.value) : '')}
                      className="w-full text-xs tracking-tight font-bold text-slate-900 bg-transparent focus:outline-none"
                    />
                    <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold shrink-0 ml-1 select-none">
                      ₹ ▾
                    </span>
                  </div>
                </div>

                {/* DUE DATE with Calendar Icon */}
                <div className="relative border border-slate-200 rounded-xl px-3.5 pt-2.5 pb-2 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all">
                  <label className="absolute -top-2 left-2.5 bg-white px-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    DUE DATE<span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="date"
                      required
                      value={prDueDate}
                      onChange={(e) => setPrDueDate(e.target.value)}
                      className="w-full text-xs font-bold text-slate-900 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Row 5: NOTES */}
              <div className="relative border border-slate-200 rounded-xl px-3.5 pt-2.5 pb-2 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all">
                <label className="absolute -top-2 left-2.5 bg-white px-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  NOTES
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter request notes or payment justification..."
                  value={prNotes}
                  onChange={(e) => setPrNotes(e.target.value)}
                  className="w-full text-xs font-medium text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-300 resize-none"
                />
              </div>

              {/* Row 6: Upload Files */}
              <div
                onClick={() => prFileInputRef.current?.click()}
                className="border border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50/50 hover:bg-red-50/20 hover:border-red-300 transition-colors flex flex-col items-center justify-center gap-1.5 cursor-pointer group"
              >
                <input
                  ref={prFileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handlePrFileUpload}
                  className="hidden"
                />
                {prMediaUrl ? (
                  <div className="flex items-center justify-between w-full max-w-sm px-3 py-2 bg-white rounded-xl border border-emerald-200 shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="flex flex-col text-left min-w-0">
                        <span className="truncate max-w-[200px] text-xs font-bold text-slate-800">{prMediaName || 'Attached Document'}</span>
                        <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>Uploaded: <strong className="text-slate-700">{prMediaUploadedAt || getCurrentUploadTimestamp()}</strong></span>
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPrMediaUrl(null);
                        setPrMediaName(null);
                        setPrMediaUploadedAt(null);
                      }}
                      className="p-1 hover:text-red-600 text-slate-400 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors shrink-0"
                      title="Remove attachment"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500 group-hover:text-red-600 transition-colors">
                    <span>Upload Files</span>
                    <UploadCloud className="w-4 h-4 text-red-600" />
                  </div>
                )}
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. PAYMENT REQUEST OVERVIEW DRAWER                             */}
      {/* ============================================================== */}
      {selectedPRForOverview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-150 animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            <div className="p-4 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPRForOverview(null)}
                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm tracking-wide uppercase">
                    PAYMENT REQUEST {selectedPRForOverview.request_number}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">
                    {project.name}
                  </p>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                selectedPRForOverview.status === 'APPROVED'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : selectedPRForOverview.status === 'REJECTED'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : selectedPRForOverview.status === 'PAID'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {selectedPRForOverview.status}
              </span>
            </div>

            <div className="h-1 bg-red-600 w-full shrink-0" />

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">REQUESTED AMOUNT</span>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  ₹ {Number(selectedPRForOverview.amount).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] font-medium text-slate-500">
                  {numberToIndianWords(Number(selectedPRForOverview.amount))}
                </div>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-400 uppercase text-[10px]">Party Name</span>
                  <span className="font-bold text-slate-900">{selectedPRForOverview.party_name}</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-400 uppercase text-[10px]">Request Type</span>
                  <span className="font-semibold text-slate-800">{selectedPRForOverview.request_type}</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-400 uppercase text-[10px]">Payment Date</span>
                  <span className="font-semibold text-slate-800">{selectedPRForOverview.payment_date}</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-400 uppercase text-[10px]">Due Date</span>
                  <span className="font-semibold text-slate-800">{selectedPRForOverview.due_date}</span>
                </div>
                {selectedPRForOverview.notes && (
                  <div className="py-2.5 space-y-1">
                    <span className="font-semibold text-slate-400 uppercase text-[10px] block">Notes / Justification</span>
                    <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                      {selectedPRForOverview.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              {selectedPRForOverview.status === 'PENDING' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleRejectPaymentRequest(selectedPRForOverview.id)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprovePaymentRequest(selectedPRForOverview.id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePayPaymentRequest(selectedPRForOverview)}
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    Pay Now
                  </button>
                </>
              )}
              {selectedPRForOverview.status === 'APPROVED' && (
                <button
                  type="button"
                  onClick={() => handlePayPaymentRequest(selectedPRForOverview)}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Pay Now
                </button>
              )}
              {(selectedPRForOverview.status === 'PAID' || selectedPRForOverview.status === 'REJECTED') && (
                <button
                  type="button"
                  onClick={() => setSelectedPRForOverview(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
