import React, { useState, useMemo, useEffect } from 'react';
import { 
  DollarSign, CheckCircle2, Clock, AlertCircle, Plus, 
  Search, Filter, Download, ArrowUpRight, ArrowDownRight, 
  Receipt, Building2, User, FileText, Check, X, ShieldCheck,
  CreditCard, Wallet, Landmark, TrendingUp, Boxes, Gift, 
  Trophy, Bell, ChevronDown, ExternalLink, RefreshCw, Printer, 
  Sparkles, SlidersHorizontal, Calendar, Phone, Mail, FileSpreadsheet,
  ArrowRight, Shield, Layers, HelpCircle, CheckCheck, Eye,
  ArrowUp, ArrowDown, MapPin, ArrowLeft, ChevronRight,
  Tag, HardHat, Truck, Fuel, Paperclip, Upload, ArrowLeftRight
} from 'lucide-react';
import { Project } from '../types';
import { MOCK_PROJECTS } from '../lib/mockData';
import { CustomSelect } from '../components/CustomSelect';
import { AddPartyDrawer, PartyFormData } from '../components/finance/AddPartyDrawer';

export interface PaymentRequestItem {
  id: string;
  requestCode: string;
  date: string; // e.g. "13 Jul 26"
  partyName: string;
  projectName: string;
  subProjectText: string;
  amount: number;
  status: 'Paid' | 'Approved' | 'Pending' | 'Rejected';
  category: string;
  paymentMode?: string;
  referenceNo?: string;
  paidDate?: string;
  notes?: string;
  invoiceFile?: string;
}

export interface PartyRecord {
  id: string;
  name: string;
  avatarText?: string;
  avatarColor?: string;
  type: 'Client' | 'Staff' | 'Vendor' | 'Subcontractor' | 'Supplier' | 'Consultant';
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  partyId?: string;
  dateOfJoining?: string;
  aadhaarNumber?: string;
  aadhaarFile?: string;
  panNumber?: string;
  panFile?: string;
  balanceDue: number;
  status: 'To Receive' | 'To Pay' | 'Settled' | 'Advance Paid' | 'Advance Received';
  activeStatus?: 'Active' | 'Inactive';
  totalBilled?: number;
  totalPaid?: number;
  activeProjects?: string[];
}

export interface PartyLedgerTransaction {
  id: string;
  partyId: string;
  partyName: string;
  date: string;
  day: string;
  month: string;
  year: string;
  title: string;
  projectName?: string;
  category?: string;
  notes?: string;
  amount: number;
  type: 'SALES_INVOICE' | 'PAYMENT_IN' | 'EXPENSE' | 'PAYMENT_OUT';
}

export interface FinanceTransaction {
  id: string;
  txnCode: string;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  partyName: string;
  projectName: string;
  category: string;
  amount: number;
  mode: 'NEFT/RTGS' | 'UPI' | 'CHEQUE' | 'CASH';
  referenceNo: string;
  status: 'Completed' | 'Pending' | 'Reconciled';
}

export interface BankAccountRecord {
  id: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountType: 'Current' | 'Savings' | 'Escrow' | 'Petty Cash';
  balance: number;
  status: 'Active' | 'Inactive';
  tallyLedgerName: string;
}

export interface AccountTransferRecord {
  id: string;
  transferCode: string;
  date: string;
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  amount: number;
  transferMode: 'NEFT/RTGS' | 'IMPS' | 'Cheque' | 'Cash Withdrawal' | 'Cash Deposit' | 'Internal Contra';
  referenceNo: string;
  purpose: string;
  projectName?: string;
  initiatedBy: string;
  status: 'Completed' | 'Pending Verification' | 'Rejected';
  notes?: string;
}

export interface ExpenseItem {
  id: string;
  expenseCode: string;
  date: string;
  title: string;
  category: 'Materials' | 'Labour & Daily Wages' | 'Machinery & Equipment' | 'Site Petty Cash' | 'Subcontractor' | 'Fuel & Logistics' | 'Safety & Compliance' | 'Utilities & Admin';
  projectName: string;
  subProjectOrLocation?: string;
  partyOrVendorName: string;
  amount: number;
  paymentMode: 'NEFT/RTGS' | 'UPI' | 'Petty Cash' | 'Corporate Card' | 'Cheque';
  paidFromAccount: string;
  referenceNo?: string;
  billNumber?: string;
  billFile?: string;
  status: 'Approved' | 'Paid' | 'Pending Approval' | 'Rejected';
  approvedBy?: string;
  notes?: string;
}

export const INITIAL_PARTIES: PartyRecord[] = [];
export const INITIAL_PARTY_TRANSACTIONS: Record<string, PartyLedgerTransaction[]> = {};
export const INITIAL_BANK_ACCOUNTS: BankAccountRecord[] = [];
export const INITIAL_TRANSFERS: AccountTransferRecord[] = [];
export const INITIAL_EXPENSES: ExpenseItem[] = [];

interface AccountsFinanceViewProps {
  projects?: Project[];
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onShowToast?: (msg: string) => void;
  initialTab?: 'party' | 'transaction' | 'payment_requests' | 'expenses' | 'account_transfer' | 'accounts';
}

export const AccountsFinanceView: React.FC<AccountsFinanceViewProps> = ({
  projects = MOCK_PROJECTS,
  isSidebarOpen,
  onToggleSidebar,
  onShowToast,
  initialTab
}) => {
  // Navigation Tabs: Party, Transaction, Payment Requests, Expenses, Account to Account Transfer, Accounts
  const [activeTab, setActiveTab] = useState<'party' | 'transaction' | 'payment_requests' | 'expenses' | 'account_transfer' | 'accounts'>(initialTab || 'party');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Parties State with LocalStorage Persistence
  const [parties, setParties] = useState<PartyRecord[]>(() => {
    try {
      const saved = localStorage.getItem('booshnam_finance_parties');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const clean = parsed.filter(p => !['pty-1', 'pty-2', 'pty-3', 'pty-4', 'pty-5', 'pty-6'].includes(p.id));
          if (clean.length !== parsed.length) {
            localStorage.setItem('booshnam_finance_parties', JSON.stringify(clean));
          }
          return clean;
        }
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('booshnam_finance_parties', JSON.stringify(parties));
    } catch {
      // Ignore
    }
  }, [parties]);

  // Payment Requests State
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequestItem[]>(() => {
    try {
      const saved = localStorage.getItem('booshnam_finance_payment_requests');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter(pr => !['pr-1', 'pr-2', 'pr-3', 'pr-4', 'pr-5', 'pr-6'].includes(pr.id));
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('booshnam_finance_payment_requests', JSON.stringify(paymentRequests));
    } catch {}
  }, [paymentRequests]);

  // Transactions State
  const [transactions, setTransactions] = useState<FinanceTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('booshnam_finance_transactions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter(tx => !['tx-1', 'tx-2', 'tx-3', 'tx-4', 'tx-5'].includes(tx.id));
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('booshnam_finance_transactions', JSON.stringify(transactions));
    } catch {}
  }, [transactions]);

  // Bank Accounts State with LocalStorage Persistence
  const [bankAccounts, setBankAccounts] = useState<BankAccountRecord[]>(() => {
    try {
      const saved = localStorage.getItem('booshnam_finance_bank_accounts_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const clean = parsed.filter(ba => !['ba-1', 'ba-2', 'ba-3', 'ba-4', 'ba-5'].includes(ba.id));
          if (clean.length !== parsed.length) {
            localStorage.setItem('booshnam_finance_bank_accounts_v1', JSON.stringify(clean));
          }
          return clean;
        }
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('booshnam_finance_bank_accounts_v1', JSON.stringify(bankAccounts));
    } catch {}
  }, [bankAccounts]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Approved' | 'Pending' | 'Rejected'>('All');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('All');

  // Modals State
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [selectedRequestDetails, setSelectedRequestDetails] = useState<PaymentRequestItem | null>(null);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isTallyModalOpen, setIsTallyModalOpen] = useState(false);
  const [isReferModalOpen, setIsReferModalOpen] = useState(false);
  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAddPartyModalOpen, setIsAddPartyModalOpen] = useState(false);
  const [isRecordTxnModalOpen, setIsRecordTxnModalOpen] = useState(false);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);

  // Add Bank / Cash Account Form State
  const [newAccName, setNewAccName] = useState('');
  const [newAccBankName, setNewAccBankName] = useState('');
  const [newAccNumber, setNewAccNumber] = useState('');
  const [newAccIfsc, setNewAccIfsc] = useState('');
  const [newAccType, setNewAccType] = useState<BankAccountRecord['accountType']>('Current');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [newAccTallyLedger, setNewAccTallyLedger] = useState('');

  // Party Tab Filters, Active Overview & Drawer States
  const [partySearchQuery, setPartySearchQuery] = useState('');
  const [partyPaymentTypeFilter, setPartyPaymentTypeFilter] = useState('All');
  const [partyTypeFilter, setPartyTypeFilter] = useState('All');
  const [partyActiveFilter, setPartyActiveFilter] = useState('Active');
  const [isAddPartyDrawerOpen, setIsAddPartyDrawerOpen] = useState(false);
  const [selectedPartyRecord, setSelectedPartyRecord] = useState<PartyRecord | null>(null);
  const [activePartyOverview, setActivePartyOverview] = useState<PartyRecord | null>(null);

  // Transactions Ledger per Party
  const [partyTransactions, setPartyTransactions] = useState<Record<string, PartyLedgerTransaction[]>>(() => {
    try {
      const saved = localStorage.getItem('booshnam_party_transactions_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          delete parsed['pty-1'];
          delete parsed['pty-2'];
          delete parsed['pty-3'];
          return parsed;
        }
      }
    } catch {}
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem('booshnam_party_transactions_v2', JSON.stringify(partyTransactions));
    } catch {}
  }, [partyTransactions]);

  // Summaries per Party (Opening, Party Paid, Sales Invoice)
  const [partySummaries, setPartySummaries] = useState<Record<string, { opening: number; partyPaid: number; salesInvoice: number }>>(() => {
    try {
      const saved = localStorage.getItem('booshnam_party_summaries');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          delete parsed['pty-1'];
          return parsed;
        }
      }
    } catch {}
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem('booshnam_party_summaries', JSON.stringify(partySummaries));
    } catch {}
  }, [partySummaries]);

  // Payment In Modal Form State
  const [isPaymentInModalOpen, setIsPaymentInModalOpen] = useState(false);
  const [paymentInProject, setPaymentInProject] = useState('Booshnam Associates Pvt Ltd');
  const [paymentInAmount, setPaymentInAmount] = useState('');
  const [paymentInDate, setPaymentInDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [paymentInMode, setPaymentInMode] = useState<'UPI' | 'NEFT/RTGS' | 'Cheque' | 'Cash'>('UPI');
  const [paymentInRef, setPaymentInRef] = useState('');
  const [paymentInNotes, setPaymentInNotes] = useState('');

  // Create Transaction / Invoice Modal Form State
  const [isCreatePartyTxnModalOpen, setIsCreatePartyTxnModalOpen] = useState(false);
  const [partyTxnCategory, setPartyTxnCategory] = useState<'Sales Invoice' | 'Material Sales' | 'Labour & Service Invoice' | 'Machine / Equipment Rental' | 'Debit Note' | 'Credit Note'>('Sales Invoice');
  const [partyTxnProject, setPartyTxnProject] = useState('Booshnam Associates Pvt Ltd');
  const [partyTxnTitle, setPartyTxnTitle] = useState('');
  const [partyTxnAmount, setPartyTxnAmount] = useState('');
  const [partyTxnDate, setPartyTxnDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [partyTxnNotes, setPartyTxnNotes] = useState('');

  // KPI Metrics Baseline from Image 1 + Dynamic Party Balances
  const partyKpiMetrics = useMemo(() => {
    let advancePaid = 0;
    let toPay = 0;
    let toReceive = 0;
    let advanceReceived = 0;

    for (const cp of parties) {
      if (cp.status === 'Advance Paid') advancePaid += cp.balanceDue;
      else if (cp.status === 'To Pay') toPay += cp.balanceDue;
      else if (cp.status === 'To Receive') toReceive += cp.balanceDue;
      else if (cp.status === 'Advance Received') advanceReceived += cp.balanceDue;
    }

    return { advancePaid, toPay, toReceive, advanceReceived };
  }, [parties]);

  // Filtered Parties matching Search & Dropdowns
  const filteredParties = useMemo(() => {
    return parties.filter(p => {
      if (partyActiveFilter !== 'All' && (p.activeStatus || 'Active') !== partyActiveFilter) return false;
      if (partyTypeFilter !== 'All' && p.type !== partyTypeFilter) return false;
      if (partyPaymentTypeFilter !== 'All' && p.status !== partyPaymentTypeFilter) return false;
      if (partySearchQuery.trim()) {
        const q = partySearchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesPhone = (p.phone || '').toLowerCase().includes(q);
        const matchesEmail = (p.email || '').toLowerCase().includes(q);
        const matchesId = (p.partyId || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesEmail && !matchesId) return false;
      }
      return true;
    });
  }, [parties, partyActiveFilter, partyTypeFilter, partyPaymentTypeFilter, partySearchQuery]);

  // Handle Create Party From Drawer
  const handleCreatePartyFromDrawer = (partyData: PartyFormData) => {
    const trimmed = partyData.name.trim();
    let text = 'P';
    if (trimmed.startsWith('(')) {
      const inside = trimmed.replace(/[()]/g, '').trim();
      const parts = inside.split(/\s+/);
      if (parts.length > 1 && parts[1] === '&') {
        text = '(&';
      } else {
        text = inside.slice(0, 2);
      }
    } else if (/^\d+$/.test(trimmed)) {
      text = trimmed.charAt(0);
    } else {
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 3 && parts[1] === '&') {
        text = `${parts[0][0]}&`;
      } else if (parts.length > 1) {
        text = `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      } else {
        text = trimmed.slice(0, 2).toUpperCase();
      }
    }

    let color = 'bg-[#1E40AF]';
    if (partyData.partyType === 'Staff') color = 'bg-[#7C3AED]';
    else if (partyData.partyType === 'Vendor') color = 'bg-[#EA580C]';
    else if (partyData.partyType === 'Subcontractor') color = 'bg-[#4F46E5]';
    else if (partyData.partyType === 'Supplier') color = 'bg-[#0D9488]';

    const newRecord: PartyRecord = {
      id: `pty-${Date.now()}`,
      name: partyData.name,
      avatarText: text,
      avatarColor: color,
      type: partyData.partyType,
      contactPerson: partyData.name,
      phone: partyData.phone ? `${partyData.countryCode} ${partyData.phone}` : undefined,
      email: partyData.email || undefined,
      address: partyData.address || undefined,
      partyId: partyData.partyId,
      dateOfJoining: partyData.dateOfJoining,
      aadhaarNumber: partyData.aadhaarNumber,
      aadhaarFile: partyData.aadhaarFile,
      panNumber: partyData.panNumber,
      panFile: partyData.panFile,
      balanceDue: partyData.openingBalance || 0,
      status: partyData.status,
      activeStatus: 'Active',
      totalBilled: partyData.openingBalance || 0,
      totalPaid: 0
    };

    setParties(prev => [newRecord, ...prev]);
    if (onShowToast) {
      onShowToast(`Party "${partyData.name}" created successfully!`);
    }
  };

  // Export Parties to CSV
  const handleExportParties = () => {
    const headers = ['Party Name', 'Party ID', 'Type', 'Phone', 'Email', 'Address', 'Balance (₹)', 'Status'];
    const rows = filteredParties.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.partyId || ''}"`,
      `"${p.type}"`,
      `"${p.phone || ''}"`,
      `"${p.email || ''}"`,
      `"${(p.address || '').replace(/"/g, '""')}"`,
      p.balanceDue,
      `"${p.status}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Booshnam_Parties_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) onShowToast('Exported parties directory to CSV');
  };

  // Handle Save Payment In (Receipt)
  const handleSavePaymentIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePartyOverview) return;
    const amt = parseFloat(paymentInAmount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const today = new Date();
    let dStr = String(today.getDate()).padStart(2, '0');
    let mStr = today.toLocaleDateString('en-GB', { month: 'short' });
    let yStr = String(today.getFullYear());
    let formattedDate = `${dStr} ${mStr} ${yStr}`;

    if (paymentInDate) {
      const parsed = new Date(paymentInDate);
      if (!isNaN(parsed.getTime())) {
        dStr = String(parsed.getDate()).padStart(2, '0');
        mStr = parsed.toLocaleDateString('en-GB', { month: 'short' });
        yStr = String(parsed.getFullYear());
        formattedDate = `${dStr} ${mStr} ${yStr}`;
      } else {
        formattedDate = paymentInDate;
      }
    }

    const newTx: PartyLedgerTransaction = {
      id: `ptx-${Date.now()}`,
      partyId: activePartyOverview.id,
      partyName: activePartyOverview.name,
      date: formattedDate,
      day: dStr,
      month: mStr,
      year: yStr,
      title: `Payment Received via ${paymentInMode}${paymentInRef ? ` - Ref: ${paymentInRef}` : ''}`,
      projectName: paymentInProject,
      notes: paymentInNotes || undefined,
      amount: amt,
      type: 'PAYMENT_IN'
    };

    setPartyTransactions(prev => ({
      ...prev,
      [activePartyOverview.id]: [newTx, ...(prev[activePartyOverview.id] || [])]
    }));

    // Update summary
    const currentSummary = partySummaries[activePartyOverview.id] || {
      opening: 0,
      partyPaid: 0,
      salesInvoice: activePartyOverview.balanceDue
    };
    const updatedPaid = currentSummary.partyPaid + amt;
    const newBalance = Math.max(0, currentSummary.salesInvoice - updatedPaid);

    setPartySummaries(prev => ({
      ...prev,
      [activePartyOverview.id]: {
        ...currentSummary,
        partyPaid: updatedPaid
      }
    }));

    // Update parties list & activePartyOverview
    setParties(prev => prev.map(p => {
      if (p.id === activePartyOverview.id) {
        return {
          ...p,
          balanceDue: newBalance,
          status: newBalance === 0 ? 'Settled' : 'To Receive'
        };
      }
      return p;
    }));

    setActivePartyOverview(prev => prev ? {
      ...prev,
      balanceDue: newBalance,
      status: newBalance === 0 ? 'Settled' : 'To Receive'
    } : null);

    setIsPaymentInModalOpen(false);
    setPaymentInAmount('');
    setPaymentInRef('');
    setPaymentInNotes('');

    if (onShowToast) {
      onShowToast(`Payment In of ₹${amt.toLocaleString('en-IN')} recorded for ${activePartyOverview.name}!`);
    }
  };

  // Handle Save Create Transaction (Invoice)
  const handleSavePartyTxn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePartyOverview) return;
    const amt = parseFloat(partyTxnAmount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const today = new Date();
    let dStr = String(today.getDate()).padStart(2, '0');
    let mStr = today.toLocaleDateString('en-GB', { month: 'short' });
    let yStr = String(today.getFullYear());
    let formattedDate = `${dStr} ${mStr} ${yStr}`;

    if (partyTxnDate) {
      const parsed = new Date(partyTxnDate);
      if (!isNaN(parsed.getTime())) {
        dStr = String(parsed.getDate()).padStart(2, '0');
        mStr = parsed.toLocaleDateString('en-GB', { month: 'short' });
        yStr = String(parsed.getFullYear());
        formattedDate = `${dStr} ${mStr} ${yStr}`;
      } else {
        formattedDate = partyTxnDate;
      }
    }

    const nextVoucherCode = `RA11-BAGJ-${Math.floor(1800 + Math.random() * 800)}(2026-2027)-${activePartyOverview.name}-${partyTxnCategory}`;
    const newTx: PartyLedgerTransaction = {
      id: `ptx-${Date.now()}`,
      partyId: activePartyOverview.id,
      partyName: activePartyOverview.name,
      date: formattedDate,
      day: dStr,
      month: mStr,
      year: yStr,
      title: partyTxnTitle || nextVoucherCode,
      projectName: partyTxnProject,
      category: partyTxnCategory,
      notes: partyTxnNotes || undefined,
      amount: amt,
      type: 'SALES_INVOICE'
    };

    setPartyTransactions(prev => ({
      ...prev,
      [activePartyOverview.id]: [newTx, ...(prev[activePartyOverview.id] || [])]
    }));

    // Update summary
    const currentSummary = partySummaries[activePartyOverview.id] || {
      opening: 0,
      partyPaid: 0,
      salesInvoice: activePartyOverview.balanceDue
    };
    const updatedInvoice = currentSummary.salesInvoice + amt;
    const newBalance = Math.max(0, updatedInvoice - currentSummary.partyPaid);

    setPartySummaries(prev => ({
      ...prev,
      [activePartyOverview.id]: {
        ...currentSummary,
        salesInvoice: updatedInvoice
      }
    }));

    // Update parties list & activePartyOverview
    setParties(prev => prev.map(p => {
      if (p.id === activePartyOverview.id) {
        return {
          ...p,
          balanceDue: newBalance,
          status: newBalance === 0 ? 'Settled' : 'To Receive'
        };
      }
      return p;
    }));

    setActivePartyOverview(prev => prev ? {
      ...prev,
      balanceDue: newBalance,
      status: newBalance === 0 ? 'Settled' : 'To Receive'
    } : null);

    setIsCreatePartyTxnModalOpen(false);
    setPartyTxnTitle('');
    setPartyTxnAmount('');
    setPartyTxnNotes('');

    if (onShowToast) {
      onShowToast(`Transaction of ₹${amt.toLocaleString('en-IN')} created for ${activePartyOverview.name}!`);
    }
  };

  // Export Specific Party's Ledger
  const handleExportPartyLedger = () => {
    if (!activePartyOverview) return;
    const txns = partyTransactions[activePartyOverview.id] || [];
    const headers = ['Date', 'Title', 'Remarks/TDS', 'Amount (₹)'];
    const rows = txns.map(t => [
      `"${t.date}"`,
      `"${t.title.replace(/"/g, '""')}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
      t.amount
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activePartyOverview.name}_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) onShowToast(`Exported ${activePartyOverview.name} ledger to CSV`);
  };

  // New Payment Request Form
  const [newPartyName, setNewPartyName] = useState('');
  const [newProjectName, setNewProjectName] = useState(projects[0]?.name || 'Chromepet Project');
  const [newSubProjectText, setNewSubProjectText] = useState('Against Other');
  const [newCategory, setNewCategory] = useState('Against Other');
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState('13 Jul 26');
  const [newNotes, setNewNotes] = useState('');
  const [newStatus, setNewStatus] = useState<'Pending' | 'Approved' | 'Paid'>('Pending');

  // New Party Form
  const [newPtyName, setNewPtyName] = useState('');
  const [newPtyType, setNewPtyType] = useState<'Vendor' | 'Subcontractor' | 'Supplier' | 'Client' | 'Staff' | 'Consultant'>('Vendor');
  const [newPtyContact, setNewPtyContact] = useState('');
  const [newPtyPhone, setNewPtyPhone] = useState('');
  const [newPtyEmail, setNewPtyEmail] = useState('');

  // New Transaction Form
  const [newTxnType, setNewTxnType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [newTxnParty, setNewTxnParty] = useState('');
  const [newTxnProject, setNewTxnProject] = useState(projects[0]?.name || 'Villa Grande');
  const [newTxnCategory, setNewTxnCategory] = useState('Material Purchase');
  const [newTxnAmount, setNewTxnAmount] = useState('');
  const [newTxnMode, setNewTxnMode] = useState<'NEFT/RTGS' | 'UPI' | 'CHEQUE' | 'CASH'>('NEFT/RTGS');
  const [newTxnRef, setNewTxnRef] = useState('');

  // Filtered Payment Requests
  const filteredPaymentRequests = useMemo(() => {
    return paymentRequests.filter(req => {
      if (statusFilter !== 'All' && req.status !== statusFilter) return false;
      if (selectedProjectFilter !== 'All' && !req.projectName.toLowerCase().includes(selectedProjectFilter.toLowerCase())) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesParty = req.partyName.toLowerCase().includes(q);
        const matchesProj = req.projectName.toLowerCase().includes(q);
        const matchesCode = req.requestCode.toLowerCase().includes(q);
        const matchesCategory = req.category.toLowerCase().includes(q);
        if (!matchesParty && !matchesProj && !matchesCode && !matchesCategory) return false;
      }
      return true;
    });
  }, [paymentRequests, statusFilter, selectedProjectFilter, searchQuery]);

  // Financial summary metrics
  const totalPaidAmount = paymentRequests.filter(r => r.status === 'Paid').reduce((sum, r) => sum + r.amount, 0);
  const totalPendingAmount = paymentRequests.filter(r => r.status === 'Pending' || r.status === 'Approved').reduce((sum, r) => sum + r.amount, 0);

  // Submit New Payment Request
  const handleSavePaymentRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartyName.trim()) {
      alert('Please enter a party name');
      return;
    }
    const parsedAmt = parseFloat(newAmount);
    if (!parsedAmt || parsedAmt <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const nextCode = `Payment Request # - ${paymentRequests.length + 1}`;
    const newReq: PaymentRequestItem = {
      id: `pr-${Date.now()}`,
      requestCode: nextCode,
      date: newDate || '13 Jul 26',
      partyName: newPartyName.trim(),
      projectName: newProjectName,
      subProjectText: newSubProjectText || 'Against Other',
      amount: parsedAmt,
      status: newStatus,
      category: newCategory,
      notes: newNotes,
      paidDate: newStatus === 'Paid' ? newDate : undefined
    };

    setPaymentRequests(prev => [newReq, ...prev]);
    setIsNewRequestModalOpen(false);

    // Reset fields
    setNewPartyName('');
    setNewAmount('');
    setNewNotes('');

    if (onShowToast) {
      onShowToast(`Created ${nextCode} for ₹${parsedAmt.toLocaleString('en-IN')}`);
    }
  };

  // Submit New Party
  const handleSaveParty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPtyName.trim()) return;

    const newPty: PartyRecord = {
      id: `pty-${Date.now()}`,
      name: newPtyName.trim(),
      avatarText: newPtyName.trim().slice(0, 2).toUpperCase(),
      avatarColor: newPtyType === 'Staff' ? 'bg-[#7C3AED]' : 'bg-[#1E40AF]',
      type: newPtyType,
      contactPerson: newPtyContact,
      phone: newPtyPhone,
      email: newPtyEmail,
      totalBilled: 0,
      totalPaid: 0,
      balanceDue: 0,
      status: 'Settled',
      activeStatus: 'Active',
      activeProjects: [projects[0]?.name || 'General Project']
    };

    setParties(prev => [newPty, ...prev]);
    setIsAddPartyModalOpen(false);
    setNewPtyName('');
    setNewPtyContact('');
    setNewPtyPhone('');
    setNewPtyEmail('');

    if (onShowToast) {
      onShowToast(`Party "${newPty.name}" registered successfully`);
    }
  };

  // Submit New Transaction
  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newTxnAmount);
    if (!amt || amt <= 0) return;

    const newTx: FinanceTransaction = {
      id: `tx-${Date.now()}`,
      txnCode: `TXN-2026-${String(transactions.length + 82).padStart(3, '0')}`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      type: newTxnType,
      partyName: newTxnParty || 'Cash Settlement',
      projectName: newTxnProject,
      category: newTxnCategory,
      amount: amt,
      mode: newTxnMode,
      referenceNo: newTxnRef || `REF-${Date.now().toString().slice(-6)}`,
      status: 'Completed'
    };

    setTransactions(prev => [newTx, ...prev]);
    setIsRecordTxnModalOpen(false);
    setNewTxnParty('');
    setNewTxnAmount('');
    setNewTxnRef('');

    if (onShowToast) {
      onShowToast(`Recorded ₹${amt.toLocaleString('en-IN')} ${newTxnType.toLowerCase()} transaction`);
    }
  };

  // Expenses State with LocalStorage Persistence
  const [expenses, setExpenses] = useState<ExpenseItem[]>(() => {
    try {
      const saved = localStorage.getItem('booshnam_finance_expenses_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const clean = parsed.filter(exp => !['exp-1', 'exp-2', 'exp-3', 'exp-4', 'exp-5', 'exp-6'].includes(exp.id));
          if (clean.length !== parsed.length) {
            localStorage.setItem('booshnam_finance_expenses_v1', JSON.stringify(clean));
          }
          return clean;
        }
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('booshnam_finance_expenses_v1', JSON.stringify(expenses));
    } catch {
      // Ignore
    }
  }, [expenses]);

  // Expenses Filters & Search State
  const [expenseSearchQuery, setExpenseSearchQuery] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('All');
  const [expenseProjectFilter, setExpenseProjectFilter] = useState('All');
  const [expenseStatusFilter, setExpenseStatusFilter] = useState<'All' | 'Paid' | 'Approved' | 'Pending Approval' | 'Rejected'>('All');
  const [isExpenseFilterOpen, setIsExpenseFilterOpen] = useState(false);

  // Expenses Modals
  const [isRecordExpenseModalOpen, setIsRecordExpenseModalOpen] = useState(false);
  const [selectedExpenseDetails, setSelectedExpenseDetails] = useState<ExpenseItem | null>(null);

  // New Expense Form State
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpCategory, setNewExpCategory] = useState<ExpenseItem['category']>('Materials');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpProject, setNewExpProject] = useState(projects[0]?.name || 'Villa Grande');
  const [newExpLocation, setNewExpLocation] = useState('');
  const [newExpPayee, setNewExpPayee] = useState('');
  const [newExpAccount, setNewExpAccount] = useState(() => {
    return bankAccounts[0]?.accountName || 'Booshnam Associates Operations A/c';
  });
  const [newExpMode, setNewExpMode] = useState<ExpenseItem['paymentMode']>('NEFT/RTGS');
  const [newExpDate, setNewExpDate] = useState(() => {
    return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  });
  const [newExpRef, setNewExpRef] = useState('');
  const [newExpBillNo, setNewExpBillNo] = useState('');
  const [newExpFileName, setNewExpFileName] = useState('');
  const [newExpStatus, setNewExpStatus] = useState<ExpenseItem['status']>('Paid');
  const [newExpNotes, setNewExpNotes] = useState('');

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      if (expenseStatusFilter !== 'All' && exp.status !== expenseStatusFilter) return false;
      if (expenseCategoryFilter !== 'All' && exp.category !== expenseCategoryFilter) return false;
      if (expenseProjectFilter !== 'All' && !exp.projectName.toLowerCase().includes(expenseProjectFilter.toLowerCase())) return false;
      if (expenseSearchQuery.trim()) {
        const q = expenseSearchQuery.toLowerCase();
        const matchesCode = exp.expenseCode.toLowerCase().includes(q);
        const matchesTitle = exp.title.toLowerCase().includes(q);
        const matchesParty = exp.partyOrVendorName.toLowerCase().includes(q);
        const matchesProj = exp.projectName.toLowerCase().includes(q);
        const matchesRef = (exp.referenceNo || '').toLowerCase().includes(q);
        const matchesBill = (exp.billNumber || '').toLowerCase().includes(q);
        const matchesCat = exp.category.toLowerCase().includes(q);
        if (!matchesCode && !matchesTitle && !matchesParty && !matchesProj && !matchesRef && !matchesBill && !matchesCat) return false;
      }
      return true;
    });
  }, [expenses, expenseStatusFilter, expenseCategoryFilter, expenseProjectFilter, expenseSearchQuery]);

  // Expenses Financial Metrics
  const expenseMetrics = useMemo(() => {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const materials = expenses.filter(e => e.category === 'Materials').reduce((sum, e) => sum + e.amount, 0);
    const labourAndMachinery = expenses.filter(e => e.category === 'Labour & Daily Wages' || e.category === 'Machinery & Equipment').reduce((sum, e) => sum + e.amount, 0);
    const sitePetty = expenses.filter(e => e.category === 'Site Petty Cash' || e.category === 'Fuel & Logistics' || e.category === 'Utilities & Admin' || e.category === 'Safety & Compliance').reduce((sum, e) => sum + e.amount, 0);
    const paidAmount = expenses.filter(e => e.status === 'Paid').reduce((sum, e) => sum + e.amount, 0);
    const pendingAmount = expenses.filter(e => e.status === 'Pending Approval' || e.status === 'Approved').reduce((sum, e) => sum + e.amount, 0);
    return {
      total,
      materials,
      labourAndMachinery,
      sitePetty,
      paidAmount,
      pendingAmount
    };
  }, [expenses]);

  // Handle Save Expense
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newExpAmount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid expense amount');
      return;
    }
    if (!newExpTitle.trim()) {
      alert('Please enter an expense title / description');
      return;
    }

    const nextCode = `EXP-2026-${String(expenses.length + 106).padStart(3, '0')}`;
    const newExp: ExpenseItem = {
      id: `exp-${Date.now()}`,
      expenseCode: nextCode,
      date: newExpDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      title: newExpTitle.trim(),
      category: newExpCategory,
      projectName: newExpProject,
      subProjectOrLocation: newExpLocation || undefined,
      partyOrVendorName: newExpPayee || 'Self / Site Cash',
      amount: amt,
      paymentMode: newExpMode,
      paidFromAccount: newExpAccount,
      referenceNo: newExpRef || `VOUCH-${Date.now().toString().slice(-6)}`,
      billNumber: newExpBillNo || undefined,
      billFile: newExpFileName || undefined,
      status: newExpStatus,
      notes: newExpNotes || undefined,
      approvedBy: newExpStatus === 'Paid' || newExpStatus === 'Approved' ? 'Project Accounts' : undefined
    };

    // If Paid, deduct from the designated bank or cash account balance
    if (newExpStatus === 'Paid') {
      setBankAccounts(prev => prev.map(acc => {
        if (acc.accountName === newExpAccount || acc.id === newExpAccount) {
          return { ...acc, balance: Math.max(0, acc.balance - amt) };
        }
        return acc;
      }));
    }

    setExpenses(prev => [newExp, ...prev]);
    setIsRecordExpenseModalOpen(false);

    // Reset Form
    setNewExpTitle('');
    setNewExpAmount('');
    setNewExpPayee('');
    setNewExpLocation('');
    setNewExpRef('');
    setNewExpBillNo('');
    setNewExpFileName('');
    setNewExpNotes('');

    if (onShowToast) {
      onShowToast(`Expense voucher ${nextCode} for ₹${amt.toLocaleString('en-IN')} recorded successfully`);
    }
  };

  // Export Expenses to CSV
  const handleExportExpenses = () => {
    const headers = ['Voucher Code', 'Date', 'Expense Title', 'Category', 'Project', 'Vendor / Payee', 'Amount (₹)', 'Payment Mode', 'Paid Account', 'Status', 'Ref No'];
    const rows = filteredExpenses.map(e => [
      `"${e.expenseCode}"`,
      `"${e.date}"`,
      `"${e.title.replace(/"/g, '""')}"`,
      `"${e.category}"`,
      `"${e.projectName.replace(/"/g, '""')}"`,
      `"${e.partyOrVendorName.replace(/"/g, '""')}"`,
      e.amount,
      `"${e.paymentMode}"`,
      `"${e.paidFromAccount}"`,
      `"${e.status}"`,
      `"${e.referenceNo || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Booshnam_Expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) onShowToast('Exported expenses report to CSV');
  };

  // Quick Status Update for Expense
  const handleUpdateExpenseStatus = (expId: string, newStatus: 'Paid' | 'Approved') => {
    const target = expenses.find(e => e.id === expId);
    if (target && newStatus === 'Paid' && target.status !== 'Paid') {
      setBankAccounts(prev => prev.map(acc => {
        if (acc.accountName === target.paidFromAccount || acc.id === target.paidFromAccount) {
          return { ...acc, balance: Math.max(0, acc.balance - target.amount) };
        }
        return acc;
      }));
    }

    setExpenses(prev => prev.map(exp => {
      if (exp.id === expId) {
        return {
          ...exp,
          status: newStatus,
          approvedBy: 'Project Accounts Manager'
        };
      }
      return exp;
    }));
    if (selectedExpenseDetails && selectedExpenseDetails.id === expId) {
      setSelectedExpenseDetails(prev => prev ? { ...prev, status: newStatus, approvedBy: 'Project Accounts Manager' } : null);
    }
    if (onShowToast) {
      onShowToast(`Expense voucher marked as ${newStatus}`);
    }
  };

  // Account Transfers State with LocalStorage Persistence
  const [transfers, setTransfers] = useState<AccountTransferRecord[]>(() => {
    try {
      const saved = localStorage.getItem('booshnam_finance_transfers_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const clean = parsed.filter(tr => !['trf-1', 'trf-2', 'trf-3', 'trf-4', 'trf-5'].includes(tr.id));
          if (clean.length !== parsed.length) {
            localStorage.setItem('booshnam_finance_transfers_v1', JSON.stringify(clean));
          }
          return clean;
        }
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('booshnam_finance_transfers_v1', JSON.stringify(transfers));
    } catch {}
  }, [transfers]);

  // Account Transfers Filters & Search State
  const [transferSearchQuery, setTransferSearchQuery] = useState('');
  const [transferAccountFilter, setTransferAccountFilter] = useState('All');
  const [transferModeFilter, setTransferModeFilter] = useState('All');
  const [transferStatusFilter, setTransferStatusFilter] = useState<'All' | 'Completed' | 'Pending Verification' | 'Rejected'>('All');
  const [isTransferFilterOpen, setIsTransferFilterOpen] = useState(false);

  // Account Transfer Modals
  const [isNewTransferModalOpen, setIsNewTransferModalOpen] = useState(false);
  const [selectedTransferDetails, setSelectedTransferDetails] = useState<AccountTransferRecord | null>(null);

  // New Transfer Form State
  const [newTrfFromAccountId, setNewTrfFromAccountId] = useState('');
  const [newTrfToAccountId, setNewTrfToAccountId] = useState('ba-3');
  const [newTrfAmount, setNewTrfAmount] = useState('');
  const [newTrfMode, setNewTrfMode] = useState<AccountTransferRecord['transferMode']>('Cash Withdrawal');
  const [newTrfDate, setNewTrfDate] = useState(() => {
    return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  });
  const [newTrfRef, setNewTrfRef] = useState('');
  const [newTrfPurpose, setNewTrfPurpose] = useState('');
  const [newTrfProject, setNewTrfProject] = useState(projects[0]?.name || 'RO66 - Chromepet Plot Development');
  const [newTrfInitiatedBy, setNewTrfInitiatedBy] = useState('Finance Incharge');
  const [newTrfNotes, setNewTrfNotes] = useState('');

  // Filtered Transfers
  const filteredTransfers = useMemo(() => {
    return transfers.filter(trf => {
      if (transferStatusFilter !== 'All' && trf.status !== transferStatusFilter) return false;
      if (transferModeFilter !== 'All' && trf.transferMode !== transferModeFilter) return false;
      if (transferAccountFilter !== 'All') {
        if (trf.fromAccountId !== transferAccountFilter && trf.toAccountId !== transferAccountFilter) return false;
      }
      if (transferSearchQuery.trim()) {
        const q = transferSearchQuery.toLowerCase();
        const matchesCode = trf.transferCode.toLowerCase().includes(q);
        const matchesFrom = trf.fromAccountName.toLowerCase().includes(q);
        const matchesTo = trf.toAccountName.toLowerCase().includes(q);
        const matchesPurpose = trf.purpose.toLowerCase().includes(q);
        const matchesRef = trf.referenceNo.toLowerCase().includes(q);
        const matchesProj = (trf.projectName || '').toLowerCase().includes(q);
        if (!matchesCode && !matchesFrom && !matchesTo && !matchesPurpose && !matchesRef && !matchesProj) return false;
      }
      return true;
    });
  }, [transfers, transferStatusFilter, transferModeFilter, transferAccountFilter, transferSearchQuery]);

  // Account Transfer Metrics
  const transferMetrics = useMemo(() => {
    const totalTransferred = transfers.filter(t => t.status === 'Completed').reduce((sum, t) => sum + t.amount, 0);
    const pettyCashTransfers = transfers.filter(t => t.toAccountId === 'ba-3' && t.status === 'Completed').reduce((sum, t) => sum + t.amount, 0);
    const interBankTransfers = transfers.filter(t => (Boolean(t.toAccountId)) && t.status === 'Completed').reduce((sum, t) => sum + t.amount, 0);
    return {
      totalTransferred,
      pettyCashTransfers,
      interBankTransfers,
      count: transfers.length
    };
  }, [transfers]);

  // Handle Save New Account Transfer
  const handleSaveTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newTrfAmount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid transfer amount');
      return;
    }
    if (newTrfFromAccountId === newTrfToAccountId) {
      alert('Source and destination accounts must be different');
      return;
    }

    const sourceAcc = bankAccounts.find(a => a.id === newTrfFromAccountId);
    const destAcc = bankAccounts.find(a => a.id === newTrfToAccountId);
    if (!sourceAcc || !destAcc) {
      alert('Please select valid accounts');
      return;
    }

    if (sourceAcc.balance < amt) {
      alert(`Insufficient funds in ${sourceAcc.accountName}. Available: ₹${sourceAcc.balance.toLocaleString('en-IN')}`);
      return;
    }

    const nextCode = `TRF-2026-${String(transfers.length + 43).padStart(3, '0')}`;
    const newTrf: AccountTransferRecord = {
      id: `trf-${Date.now()}`,
      transferCode: nextCode,
      date: newTrfDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      fromAccountId: sourceAcc.id,
      fromAccountName: sourceAcc.accountName,
      toAccountId: destAcc.id,
      toAccountName: destAcc.accountName,
      amount: amt,
      transferMode: newTrfMode,
      referenceNo: newTrfRef || `REF-TRF-${Date.now().toString().slice(-6)}`,
      purpose: newTrfPurpose.trim() || 'Internal Liquidity & Imprest Transfer',
      projectName: newTrfProject,
      initiatedBy: newTrfInitiatedBy || 'Finance Incharge',
      status: 'Completed',
      notes: newTrfNotes || undefined
    };

    // Update balances dynamically across source and destination accounts
    setBankAccounts(prev => prev.map(acc => {
      if (acc.id === sourceAcc.id) {
        return { ...acc, balance: acc.balance - amt };
      }
      if (acc.id === destAcc.id) {
        return { ...acc, balance: acc.balance + amt };
      }
      return acc;
    }));

    setTransfers(prev => [newTrf, ...prev]);
    setIsNewTransferModalOpen(false);

    // Reset Form
    setNewTrfAmount('');
    setNewTrfRef('');
    setNewTrfPurpose('');
    setNewTrfNotes('');

    if (onShowToast) {
      onShowToast(`Transferred ₹${amt.toLocaleString('en-IN')} from ${sourceAcc.bankName} to ${destAcc.bankName} successfully!`);
    }
  };

  // Export Transfers to CSV
  const handleExportTransfers = () => {
    const headers = ['Voucher Code', 'Date', 'From Account', 'To Account', 'Amount (₹)', 'Transfer Mode', 'Reference / UTR', 'Purpose', 'Project', 'Status', 'Initiated By'];
    const rows = filteredTransfers.map(t => [
      `"${t.transferCode}"`,
      `"${t.date}"`,
      `"${t.fromAccountName.replace(/"/g, '""')}"`,
      `"${t.toAccountName.replace(/"/g, '""')}"`,
      t.amount,
      `"${t.transferMode}"`,
      `"${t.referenceNo}"`,
      `"${t.purpose.replace(/"/g, '""')}"`,
      `"${(t.projectName || '').replace(/"/g, '""')}"`,
      `"${t.status}"`,
      `"${t.initiatedBy}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Booshnam_Account_Transfers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) onShowToast('Exported account transfers report to CSV');
  };

  // Handle Save New Bank / Cash Account
  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) {
      alert('Please enter an account or ledger name');
      return;
    }

    const bal = parseFloat(newAccBalance) || 0;
    const rawNo = newAccNumber.trim();
    const formattedNumber = rawNo
      ? (rawNo.startsWith('••••') || rawNo.toUpperCase().startsWith('PETTY') ? rawNo : `•••• •••• ${rawNo.slice(-4)}`)
      : `•••• •••• ${Math.floor(1000 + Math.random() * 9000)}`;

    const newAcc: BankAccountRecord = {
      id: `ba-${Date.now()}`,
      accountName: newAccName.trim(),
      bankName: newAccBankName.trim() || (newAccType === 'Petty Cash' ? 'Internal Site Cash Safe' : 'Commercial Bank'),
      accountNumber: formattedNumber,
      ifscCode: newAccIfsc.trim().toUpperCase() || (newAccType === 'Petty Cash' ? 'N/A (Cash)' : 'BANK0001234'),
      accountType: newAccType,
      balance: bal,
      status: 'Active',
      tallyLedgerName: newAccTallyLedger.trim() || `${newAccName.trim()} Ledger`
    };

    setBankAccounts(prev => [...prev, newAcc]);
    setIsAddAccountModalOpen(false);

    // Reset Form
    setNewAccName('');
    setNewAccBankName('');
    setNewAccNumber('');
    setNewAccIfsc('');
    setNewAccType('Current');
    setNewAccBalance('');
    setNewAccTallyLedger('');

    if (onShowToast) {
      onShowToast(`Account "${newAcc.accountName}" added to chart of accounts!`);
    }
  };

  // Handle Delete / Archive Account
  const handleDeleteAccount = (accId: string, accName: string) => {
    if (bankAccounts.length <= 1) {
      alert('You must have at least one active bank or cash account');
      return;
    }
    if (confirm(`Are you sure you want to remove account "${accName}"?`)) {
      setBankAccounts(prev => prev.filter(a => a.id !== accId));
      if (onShowToast) onShowToast(`Account "${accName}" removed`);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col font-sans">
      
      {/* ─────────────────────────────────────────────────────────────
          1. TOP BRAND / UTILITY HEADER (as in reference image)
      ───────────────────────────────────────────────────────────── */}
      <header className="border-b border-slate-200 bg-white px-6 py-3.5 flex items-center justify-between sticky top-0 z-20">
        {/* Title */}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Finance</h1>
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 hidden sm:inline-block">
            Accounts & Finance
          </span>
        </div>

        {/* Right utilities */}
        <div className="flex items-center gap-3.5 sm:gap-4">
          {/* Notifications */}
          <div className="relative">
            <button 
              type="button"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-1.5 rounded-full text-slate-600 hover:bg-slate-100 transition-colors relative cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>

            {/* Notification Dropdown */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                  <span className="font-bold text-slate-900">Finance Notifications</span>
                  <span className="text-[10px] text-slate-400">Mark all read</span>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
                    <p className="font-semibold text-emerald-900">₹5,000 Disbursed to Jd Ekambaram</p>
                    <p className="text-[10px] text-emerald-700 mt-0.5">Payment Request # - 3 processed via UPI</p>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-50/60 border border-blue-100">
                    <p className="font-semibold text-blue-900">Approval Required</p>
                    <p className="text-[10px] text-blue-700 mt-0.5">Sri Murugan Steel: ₹82,500 pending final ledger posting</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar */}
          <div className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-xs shadow-sm ring-2 ring-orange-100 select-none cursor-pointer">
            <User className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      </header>


      {/* ─────────────────────────────────────────────────────────────
          2. SUB-NAVIGATION TABS (Party | Transaction | Payment Requests | Expenses | Accounts)
      ───────────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-white px-6">
        <nav className="flex items-center gap-8 -mb-px overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setActiveTab('party');
              setActivePartyOverview(null);
            }}
            className={`py-3.5 text-xs font-semibold tracking-wide transition-all border-b-2 cursor-pointer shrink-0 ${
              activeTab === 'party'
                ? 'border-[#635BFF] text-[#635BFF] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Party
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transaction')}
            className={`py-3.5 text-xs font-semibold tracking-wide transition-all border-b-2 cursor-pointer shrink-0 ${
              activeTab === 'transaction'
                ? 'border-[#635BFF] text-[#635BFF] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Transaction
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payment_requests')}
            className={`py-3.5 text-xs font-semibold tracking-wide transition-all border-b-2 cursor-pointer shrink-0 ${
              activeTab === 'payment_requests'
                ? 'border-[#635BFF] text-[#635BFF] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Payment Requests
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            className={`py-3.5 text-xs font-semibold tracking-wide transition-all border-b-2 cursor-pointer shrink-0 ${
              activeTab === 'expenses'
                ? 'border-[#635BFF] text-[#635BFF] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Expenses
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('account_transfer')}
            className={`py-3.5 text-xs font-semibold tracking-wide transition-all border-b-2 cursor-pointer shrink-0 ${
              activeTab === 'account_transfer'
                ? 'border-[#635BFF] text-[#635BFF] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Account to Account Transfer
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            className={`py-3.5 text-xs font-semibold tracking-wide transition-all border-b-2 cursor-pointer shrink-0 ${
              activeTab === 'accounts'
                ? 'border-[#635BFF] text-[#635BFF] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Accounts
          </button>
        </nav>
      </div>


      {/* ─────────────────────────────────────────────────────────────
          3. TAB CONTENT
      ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 p-6 bg-[#fbfcfd]">

        {/* ═════════════════════════════════════════════════════════════
            TAB 1: PAYMENT REQUESTS (The exact view from user screenshot)
        ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'payment_requests' && (
          <div className="space-y-4">
            
            {/* Toolbar: Filter, Calendar, and "Payment Request" Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Left filters */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Filter button */}
                <button
                  type="button"
                  onClick={() => setIsFilterModalOpen(!isFilterModalOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                    statusFilter !== 'All' || selectedProjectFilter !== 'All'
                      ? 'border-[#635BFF] text-[#635BFF] bg-purple-50/60'
                      : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filter</span>
                  {(statusFilter !== 'All' || selectedProjectFilter !== 'All') && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#635BFF]" />
                  )}
                </button>

                {/* Calendar picker button */}
                <button
                  type="button"
                  onClick={() => onShowToast && onShowToast('Date range: Showing current fiscal cycle (2026-2027)')}
                  className="p-2 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Date Range Filter"
                >
                  <Calendar className="w-3.5 h-3.5" />
                </button>

                {/* Search input */}
                <div className="relative min-w-[200px] sm:min-w-[260px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search party, project, voucher..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#635BFF] focus:ring-1 focus:ring-[#635BFF]"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Quick Status Pills */}
                <div className="hidden lg:flex items-center gap-1.5 pl-2">
                  {(['All', 'Paid', 'Approved', 'Pending', 'Rejected'] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        statusFilter === st 
                          ? 'bg-[#635BFF] text-white shadow-2xs' 
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: Payment Request Action Button (purple matching screenshot) */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNewRequestModalOpen(true)}
                  className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-[#635BFF] hover:bg-[#5046E5] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Payment Request</span>
                </button>
              </div>
            </div>

            {/* Filter Popover Modal */}
            {isFilterModalOpen && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-lg flex flex-wrap items-center gap-4 text-xs animate-in fade-in duration-150">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                  <select 
                    value={statusFilter}
                    onChange={(e: any) => setStatusFilter(e.target.value)}
                    className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-[#635BFF]"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Paid">Paid</option>
                    <option value="Approved">Approved</option>
                    <option value="Pending">Pending</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Project</label>
                  <select 
                    value={selectedProjectFilter}
                    onChange={(e: any) => setSelectedProjectFilter(e.target.value)}
                    className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-[#635BFF] max-w-[240px]"
                  >
                    <option value="All">All Projects</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end gap-2 ml-auto pt-4 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('All');
                      setSelectedProjectFilter('All');
                      setSearchQuery('');
                      setIsFilterModalOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFilterModalOpen(false)}
                    className="px-4 py-1.5 rounded-lg bg-[#635BFF] text-white font-semibold hover:bg-[#5046E5] cursor-pointer"
                  >
                    Apply Filter
                  </button>
                </div>
              </div>
            )}

            {/* Table / List Container */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              
              {/* Header Row matching screenshot */}
              <div className="grid grid-cols-12 px-6 py-3 bg-[#f8fafc] border-b border-slate-200 text-xs font-semibold text-slate-600 select-none">
                <div className="col-span-5 md:col-span-4 pl-12">
                  Party Name
                </div>
                <div className="col-span-4 md:col-span-5">
                  Project Name
                </div>
                <div className="col-span-3 text-right">
                  Amount
                </div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-slate-100">
                {filteredPaymentRequests.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-1" />
                    <p className="text-sm font-semibold text-slate-600">No payment requests found</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting the filters or create a new request.</p>
                  </div>
                ) : (
                  filteredPaymentRequests.map((req) => (
                    <div
                      key={req.id}
                      onClick={() => setSelectedRequestDetails(req)}
                      className="grid grid-cols-12 px-6 py-4 items-center hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Left: Green Date Box + Party Name */}
                      <div className="col-span-5 md:col-span-4 flex items-center gap-3.5 min-w-0 pr-2">
                        {/* Green Date Box with receipt icon (exact match to screenshot) */}
                        <div className="w-11 h-11 rounded-lg bg-[#198754] text-white flex flex-col items-center justify-center shrink-0 shadow-2xs">
                          <span className="text-[10px] font-bold tracking-tight text-white/95 leading-none">
                            {req.date}
                          </span>
                          <Receipt className="w-3.5 h-3.5 text-white/90 mt-1 stroke-[2.2]" />
                        </div>

                        {/* Party Name & Subtitle */}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-900 group-hover:text-[#635BFF] transition-colors truncate">
                            {req.partyName}
                          </div>
                          <div className="text-xs text-slate-400 font-medium mt-0.5 truncate">
                            {req.requestCode}
                          </div>
                        </div>
                      </div>

                      {/* Middle: Project Name & Subtitle */}
                      <div className="col-span-4 md:col-span-5 min-w-0 pr-3">
                        <div className="text-xs font-semibold text-slate-800 truncate" title={req.projectName}>
                          {req.projectName}
                        </div>
                        <div className="text-xs text-slate-400 font-medium mt-0.5 truncate">
                          {req.subProjectText}
                        </div>
                      </div>

                      {/* Right: Amount & Status Badge */}
                      <div className="col-span-3 text-right shrink-0">
                        <div className="text-sm font-bold text-slate-900">
                          ₹ {req.amount.toLocaleString('en-IN')}
                        </div>
                        <div className="mt-1">
                          <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded ${
                            req.status === 'Paid'
                              ? 'bg-[#EDE9FE] text-[#635BFF] border border-purple-200'
                              : req.status === 'Approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : req.status === 'Pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-red-50 text-red-600 border border-red-200'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Table Footer Summary */}
              <div className="px-6 py-3 bg-[#f8fafc] border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500">
                <span>Showing {filteredPaymentRequests.length} of {paymentRequests.length} payment requests</span>
                <div className="flex items-center gap-5">
                  <span>Paid: <strong className="text-slate-800">₹{totalPaidAmount.toLocaleString('en-IN')}</strong></span>
                  <span>Pending: <strong className="text-amber-700">₹{totalPendingAmount.toLocaleString('en-IN')}</strong></span>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* ═════════════════════════════════════════════════════════════
            TAB 2: PARTY DIRECTORY (Matching User Screenshot 1)
        ═════════════════════════════════════════════════════════════ */}
        {/* ═════════════════════════════════════════════════════════════
            TAB 2: PARTY DIRECTORY (Full View & Split Master-Detail)
        ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'party' && !activePartyOverview && (
          <div className="space-y-4">
            
            {/* 1. Four Summary KPI Cards matching Image 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Advance Paid */}
              <div className="bg-[#EAF8F1] rounded-2xl p-4.5 flex flex-col justify-between border border-[#D5F2E2] shadow-2xs">
                <div className="flex items-center gap-2 text-[#0D824B] font-semibold text-xs">
                  <div className="w-5 h-5 rounded-full border border-[#0D824B] flex items-center justify-center shrink-0">
                    <ArrowDown className="w-3 h-3 text-[#0D824B] stroke-[2.5]" />
                  </div>
                  <span className="tracking-tight">Advance Paid</span>
                </div>
                <div className="text-xl font-bold text-slate-900 mt-2.5 tracking-tight">
                  ₹ {partyKpiMetrics.advancePaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* Card 2: To Pay */}
              <div className="bg-[#FDF0F3] rounded-2xl p-4.5 flex flex-col justify-between border border-[#FCDCE2] shadow-2xs">
                <div className="flex items-center gap-2 text-[#E11D48] font-semibold text-xs">
                  <div className="w-5 h-5 rounded-full border border-[#E11D48] flex items-center justify-center shrink-0">
                    <ArrowUp className="w-3 h-3 text-[#E11D48] stroke-[2.5]" />
                  </div>
                  <span className="tracking-tight">To Pay</span>
                </div>
                <div className="text-xl font-bold text-slate-900 mt-2.5 tracking-tight">
                  ₹ {partyKpiMetrics.toPay.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* Card 3: To Receive */}
              <div className="bg-[#FDF0F6] rounded-2xl p-4.5 flex flex-col justify-between border border-[#FADDEE] shadow-2xs">
                <div className="flex items-center gap-2 text-[#BE185D] font-semibold text-xs">
                  <div className="w-5 h-5 rounded-full border border-[#BE185D] flex items-center justify-center shrink-0">
                    <ArrowUp className="w-3 h-3 text-[#BE185D] stroke-[2.5]" />
                  </div>
                  <span className="tracking-tight">To Receive</span>
                </div>
                <div className="text-xl font-bold text-slate-900 mt-2.5 tracking-tight">
                  ₹ {partyKpiMetrics.toReceive.toLocaleString('en-IN')}
                </div>
              </div>

              {/* Card 4: Advance Received */}
              <div className="bg-[#EAF8F1] rounded-2xl p-4.5 flex flex-col justify-between border border-[#D5F2E2] shadow-2xs">
                <div className="flex items-center gap-2 text-[#0D824B] font-semibold text-xs">
                  <div className="w-5 h-5 rounded-full border border-[#0D824B] flex items-center justify-center shrink-0">
                    <ArrowDown className="w-3 h-3 text-[#0D824B] stroke-[2.5]" />
                  </div>
                  <span className="tracking-tight">Advance Received</span>
                </div>
                <div className="text-xl font-bold text-slate-900 mt-2.5 tracking-tight">
                  ₹ {partyKpiMetrics.advanceReceived.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* 2. Action & Filter Toolbar matching Image 1 */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
              
              {/* Left filters: Search, Payment Type, Party Type, Active */}
              <div className="flex items-center gap-2.5 flex-wrap flex-1">
                {/* Search Parties */}
                <div className="relative min-w-[220px] flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search parties..."
                    value={partySearchQuery}
                    onChange={e => setPartySearchQuery(e.target.value)}
                    className="w-full pl-8.5 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#635BFF] focus:ring-1 focus:ring-[#635BFF] transition-all"
                  />
                  {partySearchQuery && (
                    <button 
                      onClick={() => setPartySearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Payment Type dropdown */}
                <div className="relative">
                  <select
                    value={partyPaymentTypeFilter}
                    onChange={e => setPartyPaymentTypeFilter(e.target.value)}
                    className="appearance-none bg-white border border-slate-200 rounded-xl pl-3.5 pr-8 py-2 text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:border-[#635BFF] cursor-pointer"
                  >
                    <option value="All">Payment Type</option>
                    <option value="To Receive">To Receive</option>
                    <option value="To Pay">To Pay</option>
                    <option value="Advance Paid">Advance Paid</option>
                    <option value="Advance Received">Advance Received</option>
                    <option value="Settled">Settled</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Party Type dropdown */}
                <div className="relative">
                  <select
                    value={partyTypeFilter}
                    onChange={e => setPartyTypeFilter(e.target.value)}
                    className="appearance-none bg-white border border-slate-200 rounded-xl pl-3.5 pr-8 py-2 text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:border-[#635BFF] cursor-pointer"
                  >
                    <option value="All">Party Type</option>
                    <option value="Client">Client</option>
                    <option value="Staff">Staff</option>
                    <option value="Vendor">Vendor</option>
                    <option value="Subcontractor">Subcontractor</option>
                    <option value="Supplier">Supplier</option>
                    <option value="Consultant">Consultant</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Active dropdown */}
                <div className="relative">
                  <select
                    value={partyActiveFilter}
                    onChange={e => setPartyActiveFilter(e.target.value)}
                    className="appearance-none bg-white border border-slate-200 rounded-xl pl-3.5 pr-8 py-2 text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:border-[#635BFF] cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="All">All</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Right buttons: Export & + New Party */}
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleExportParties}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer shadow-2xs"
                  title="Export to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Export</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddPartyDrawerOpen(true)}
                  className="flex items-center gap-1.5 px-4.5 py-2 bg-[#635BFF] hover:bg-[#5046E5] text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>New Party</span>
                </button>
              </div>
            </div>

            {/* 3. Table matching Image 1 */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              
              {/* Header row */}
              <div className="grid grid-cols-12 px-6 py-3.5 bg-[#F6F7FB] border-b border-slate-100 text-xs font-semibold text-slate-600 select-none">
                <div className="col-span-6">Party Details</div>
                <div className="col-span-2 text-center">Type</div>
                <div className="col-span-2 text-right">Balance (₹)</div>
                <div className="col-span-2 text-right pr-2">Status</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-slate-100">
                {filteredParties.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <User className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-1" />
                    <p className="text-sm font-semibold text-slate-700">No parties found</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting the filter criteria or click "+ New Party" to create one.</p>
                  </div>
                ) : (
                  filteredParties.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => {
                        setActivePartyOverview(p);
                        setSelectedPartyRecord(p);
                      }}
                      className="grid grid-cols-12 px-6 py-3.5 items-center hover:bg-[#FAFAFD] transition-colors cursor-pointer group"
                    >
                      {/* Party Details: Avatar Circle + Name */}
                      <div className="col-span-6 flex items-center gap-3.5 min-w-0 pr-2">
                        <div className={`w-8 h-8 rounded-full ${p.avatarColor || 'bg-[#1E40AF]'} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs select-none`}>
                          {p.avatarText || p.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1 truncate">
                          <span className="text-xs sm:text-sm font-medium text-slate-900 group-hover:text-[#635BFF] transition-colors truncate block">
                            {p.name}
                          </span>
                        </div>
                      </div>

                      {/* Type Badge */}
                      <div className="col-span-2 text-center">
                        <span className={`inline-block text-[11px] font-medium px-2.5 py-0.5 rounded ${
                          p.type === 'Staff' 
                            ? 'bg-[#F5F3FF] text-[#7C3AED]'
                            : p.type === 'Vendor'
                            ? 'bg-[#FFF7ED] text-[#C2410C]'
                            : p.type === 'Subcontractor'
                            ? 'bg-[#EEF2FF] text-[#4F46E5]'
                            : 'bg-[#EFF6FF] text-[#2563EB]'
                        }`}>
                          {p.type}
                        </span>
                      </div>

                      {/* Balance (₹) */}
                      <div className="col-span-2 text-right font-medium text-xs sm:text-sm text-slate-900">
                        ₹ {p.balanceDue.toLocaleString('en-IN')}
                      </div>

                      {/* Status Badge */}
                      <div className="col-span-2 text-right pr-2">
                        <span className={`inline-block text-[11px] font-medium px-2.5 py-0.5 rounded ${
                          p.status === 'To Receive'
                            ? 'border border-blue-200 bg-[#EFF6FF] text-[#2563EB]'
                            : p.status === 'To Pay'
                            ? 'border border-red-200 bg-red-50 text-red-600'
                            : p.status === 'Advance Paid' || p.status === 'Advance Received'
                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════
            PARTY OVERVIEW SCREEN (Matching User's Attached Screenshot)
        ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'party' && activePartyOverview && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col min-h-[720px]">
            {(() => {
              const summary = partySummaries[activePartyOverview.id] || {
                opening: 0,
                partyPaid: 0,
                salesInvoice: activePartyOverview.balanceDue
              };
              const currentBalance = Math.max(0, summary.salesInvoice - summary.partyPaid);
              const txns = partyTransactions[activePartyOverview.id] || [];

              return (
                <>
                  {/* 1. Header Bar matching Image: ArrowLeft, Avatar, Party Name, Client Badge, Amount, To Receive, Download */}
                  <div className="px-6 py-4.5 bg-white border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
                    {/* Left: Back button, Avatar, Name & Party Switcher, Type Badge */}
                    <div className="flex items-center gap-3.5">
                      <button
                        type="button"
                        onClick={() => setActivePartyOverview(null)}
                        className="p-1.5 -ml-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Back to parties list"
                      >
                        <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                      </button>

                      <div className={`w-11 h-11 rounded-full ${activePartyOverview.avatarColor || 'bg-[#1E40AF]'} text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs select-none`}>
                        {activePartyOverview.avatarText || activePartyOverview.name.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="flex items-center gap-2.5">
                        <div className="relative group">
                          <select
                            value={activePartyOverview.id}
                            onChange={e => {
                              const found = parties.find(p => p.id === e.target.value);
                              if (found) {
                                setActivePartyOverview(found);
                                setSelectedPartyRecord(found);
                              }
                            }}
                            className="text-base sm:text-lg font-bold text-slate-900 tracking-tight bg-transparent pr-5.5 cursor-pointer focus:outline-none appearance-none hover:text-[#635BFF] transition-colors"
                            title="Click to switch between parties"
                          >
                            {parties.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-[#635BFF]" />
                        </div>

                        <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB]">
                          {activePartyOverview.type || 'Client'}
                        </span>
                      </div>
                    </div>

                    {/* Right: Balance amount, Status, Download Icon */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                          ₹ {currentBalance.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: currentBalance % 1 !== 0 ? 2 : 0 })}
                        </div>
                        <div className="text-xs font-semibold text-[#E11D48] leading-none mt-0.5">
                          {currentBalance > 0 ? (activePartyOverview.status || 'To Receive') : 'Settled'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleExportPartyLedger}
                        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Download Ledger CSV"
                      >
                        <Download className="w-5 h-5 stroke-[2]" />
                      </button>
                    </div>
                  </div>

                  {/* 2. Opening Balance Subtitle matching Image */}
                  <div className="px-6 py-2.5 bg-white border-y border-slate-200/80 text-xs text-slate-700 select-none">
                    Opening: <span className="font-semibold text-slate-800">₹ {summary.opening.toLocaleString('en-IN')}</span>
                  </div>

                  {/* 3. Metric Row: User Icon, Party Paid, Sales Invoice matching Image */}
                  <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center gap-12 select-none">
                    <div className="text-[#635BFF] flex items-center justify-center">
                      <User className="w-6 h-6 stroke-[1.75]" />
                    </div>

                    <div className="relative pb-1">
                      <div className="text-xs font-semibold text-[#635BFF]">Party Paid</div>
                      <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-0.5">
                        ₹ {summary.partyPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="absolute -bottom-4 left-0 right-0 h-1 bg-[#635BFF] rounded-t-sm" />
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-500">Sales Invoice</div>
                      <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-0.5">
                        ₹ {summary.salesInvoice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* 4. Chronological Transaction Entries matching Image */}
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-[380px]">
                    {txns.length === 0 ? (
                      <div className="py-20 text-center text-slate-400">
                        <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-1" />
                        <p className="text-sm font-semibold text-slate-700">No transactions recorded yet</p>
                        <p className="text-xs text-slate-400 mt-1">Click "+ Payment In" or "+ Create Transaction" to add the first entry for {activePartyOverview.name}.</p>
                      </div>
                    ) : (
                      txns.map(t => (
                        <div
                          key={t.id}
                          className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
                        >
                          {/* Date Block: Day, Month, Year vertically */}
                          <div className="w-12 shrink-0 text-center select-none mr-4">
                            <div className="text-base font-bold text-slate-800 leading-tight">{t.day}</div>
                            <div className="text-xs font-medium text-slate-600 leading-tight">{t.month}</div>
                            <div className="text-xs text-slate-500 leading-tight">{t.year}</div>
                          </div>

                          {/* Middle Content */}
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-slate-800 leading-snug">
                              {t.title}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 mt-1 flex-wrap">
                              <span>{activePartyOverview.name}</span>
                              <span className="text-slate-400 font-normal">&gt;</span>
                              {t.projectName ? (
                                <span className="text-slate-900 font-medium">{t.projectName}</span>
                              ) : null}
                              {t.type === 'PAYMENT_IN' && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 ml-1">
                                  Payment In
                                </span>
                              )}
                            </div>
                            {t.notes && (
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {t.notes}
                              </div>
                            )}
                          </div>

                          {/* Right Amount */}
                          <div className="text-right shrink-0 ml-4">
                            <div className={`text-sm sm:text-base font-bold ${t.type === 'PAYMENT_IN' ? 'text-[#0D824B]' : 'text-slate-900'}`}>
                              {t.type === 'PAYMENT_IN' ? '+ ' : ''}₹ {t.amount.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: t.amount % 1 !== 0 ? 2 : 0 })}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* 5. Sticky Bottom Action Bar matching Image */}
                  <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-xs">
                    <button
                      type="button"
                      onClick={() => setIsPaymentInModalOpen(true)}
                      className="flex items-center gap-1.5 px-4.5 py-2.5 bg-[#0D824B] hover:bg-[#0A6C3E] text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Payment In</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsCreatePartyTxnModalOpen(true)}
                      className="flex items-center gap-1.5 px-4.5 py-2.5 bg-[#635BFF] hover:bg-[#5046E5] text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Create Transaction</span>
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        )}



        {/* ═════════════════════════════════════════════════════════════
            TAB 3: TRANSACTION (Inflow / Outflow Cashbook)
        ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'transaction' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Project Transactions & Cashbook</h2>
                <p className="text-xs text-slate-500">Live operational inflows, disbursements, and ledger journal</p>
              </div>
              <button
                type="button"
                onClick={() => setIsRecordTxnModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#635BFF] hover:bg-[#5046E5] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Transaction</span>
              </button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500">Total Inflow (Receipts)</span>
                <div className="text-xl font-bold text-emerald-600 mt-1">₹ 17,50,000</div>
                <span className="text-[10px] text-slate-400">Client milestone receipts</span>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500">Total Outflow (Expenses)</span>
                <div className="text-xl font-bold text-red-600 mt-1">₹ 1,92,000</div>
                <span className="text-[10px] text-slate-400">Material & vendor payments</span>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500">Net Operating Cash Balance</span>
                <div className="text-xl font-bold text-[#635BFF] mt-1">₹ 15,58,000</div>
                <span className="text-[10px] text-emerald-600 font-semibold">Positive Cashflow</span>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#f8fafc] text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Date</th>
                    <th className="py-3 px-4 font-semibold">Voucher</th>
                    <th className="py-3 px-4 font-semibold">Type</th>
                    <th className="py-3 px-4 font-semibold">Party</th>
                    <th className="py-3 px-4 font-semibold">Category</th>
                    <th className="py-3 px-4 font-semibold">Mode</th>
                    <th className="py-3 px-4 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-slate-600">{t.date}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{t.txnCode}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                          t.type === 'INCOME' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                        }`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{t.partyName}</td>
                      <td className="py-3 px-4 text-slate-600">{t.category}</td>
                      <td className="py-3 px-4 text-slate-500">{t.mode}</td>
                      <td className={`py-3 px-4 text-right font-bold ${
                        t.type === 'INCOME' ? 'text-emerald-700' : 'text-slate-900'
                      }`}>
                        {t.type === 'INCOME' ? '+' : '-'} ₹{t.amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════
            TAB: EXPENSES (Construction Expenses, Petty Cash & Vouchers)
        ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            
            {/* 1. Four Summary KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Expenses */}
              <div className="bg-[#FFF1F2] rounded-2xl p-4.5 flex flex-col justify-between border border-[#FFE4E6] shadow-2xs">
                <div className="flex items-center gap-2 text-[#E11D48] font-semibold text-xs">
                  <div className="w-5 h-5 rounded-full border border-[#E11D48] flex items-center justify-center shrink-0">
                    <ArrowUp className="w-3 h-3 text-[#E11D48] stroke-[2.5]" />
                  </div>
                  <span className="tracking-tight">Total Operational Expenses</span>
                </div>
                <div className="mt-2.5">
                  <div className="text-xl font-bold text-slate-900 tracking-tight">
                    ₹ {expenseMetrics.total.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {expenses.length} vouchers logged
                  </span>
                </div>
              </div>

              {/* Card 2: Materials & Procurement */}
              <div className="bg-[#EFF6FF] rounded-2xl p-4.5 flex flex-col justify-between border border-[#DBEAFE] shadow-2xs">
                <div className="flex items-center gap-2 text-[#2563EB] font-semibold text-xs">
                  <div className="w-5 h-5 rounded-full border border-[#2563EB] flex items-center justify-center shrink-0">
                    <Building2 className="w-3 h-3 text-[#2563EB]" />
                  </div>
                  <span className="tracking-tight">Direct Materials</span>
                </div>
                <div className="mt-2.5">
                  <div className="text-xl font-bold text-slate-900 tracking-tight">
                    ₹ {expenseMetrics.materials.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Cement, Steel, Aggregates
                  </span>
                </div>
              </div>

              {/* Card 3: Labour & Machinery */}
              <div className="bg-[#FFFBEB] rounded-2xl p-4.5 flex flex-col justify-between border border-[#FEF3C7] shadow-2xs">
                <div className="flex items-center gap-2 text-[#D97706] font-semibold text-xs">
                  <div className="w-5 h-5 rounded-full border border-[#D97706] flex items-center justify-center shrink-0">
                    <HardHat className="w-3 h-3 text-[#D97706]" />
                  </div>
                  <span className="tracking-tight">Labour & Machinery</span>
                </div>
                <div className="mt-2.5">
                  <div className="text-xl font-bold text-slate-900 tracking-tight">
                    ₹ {expenseMetrics.labourAndMachinery.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Daily wages, JCB & Crane hire
                  </span>
                </div>
              </div>

              {/* Card 4: Site Petty Cash & Sundry */}
              <div className="bg-[#ECFDF5] rounded-2xl p-4.5 flex flex-col justify-between border border-[#D1FAE5] shadow-2xs">
                <div className="flex items-center gap-2 text-[#059669] font-semibold text-xs">
                  <div className="w-5 h-5 rounded-full border border-[#059669] flex items-center justify-center shrink-0">
                    <Wallet className="w-3 h-3 text-[#059669]" />
                  </div>
                  <span className="tracking-tight">Site Petty Cash & Utilities</span>
                </div>
                <div className="mt-2.5">
                  <div className="text-xl font-bold text-slate-900 tracking-tight">
                    ₹ {expenseMetrics.sitePetty.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Fuel, water tankers, permits
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Action & Filter Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Left filters: Search, Filter Popover, Quick Category Pills */}
              <div className="flex items-center gap-2 flex-wrap flex-1">
                {/* Filter button */}
                <button
                  type="button"
                  onClick={() => setIsExpenseFilterOpen(!isExpenseFilterOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                    expenseStatusFilter !== 'All' || expenseCategoryFilter !== 'All' || expenseProjectFilter !== 'All'
                      ? 'border-[#635BFF] text-[#635BFF] bg-purple-50/60'
                      : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filter</span>
                  {(expenseStatusFilter !== 'All' || expenseCategoryFilter !== 'All' || expenseProjectFilter !== 'All') && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#635BFF]" />
                  )}
                </button>

                {/* Search input */}
                <div className="relative min-w-[200px] sm:min-w-[260px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search voucher, vendor, project, title..."
                    value={expenseSearchQuery}
                    onChange={e => setExpenseSearchQuery(e.target.value)}
                    className="w-full pl-8.5 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#635BFF] focus:ring-1 focus:ring-[#635BFF]"
                  />
                  {expenseSearchQuery && (
                    <button 
                      onClick={() => setExpenseSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Quick Category Filter Pills */}
                <div className="hidden xl:flex items-center gap-1.5 pl-1">
                  {(['All', 'Materials', 'Labour & Daily Wages', 'Machinery & Equipment', 'Site Petty Cash', 'Subcontractor'] as const).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setExpenseCategoryFilter(cat)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        expenseCategoryFilter === cat
                          ? 'bg-[#635BFF] text-white shadow-2xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {cat === 'Labour & Daily Wages' ? 'Labour' : cat === 'Machinery & Equipment' ? 'Machinery' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: Export & Record Expense Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleExportExpenses}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
                  title="Export to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Export</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!newExpAccount || !bankAccounts.some(b => b.accountName === newExpAccount)) {
                      setNewExpAccount(bankAccounts[0]?.accountName || 'Booshnam Associates Operations A/c');
                    }
                    setIsRecordExpenseModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#635BFF] hover:bg-[#5046E5] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Record Expense</span>
                </button>
              </div>
            </div>

            {/* Filter Popover Container */}
            {isExpenseFilterOpen && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-lg flex flex-wrap items-center gap-4 text-xs animate-in fade-in duration-150">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={expenseStatusFilter}
                    onChange={(e: any) => setExpenseStatusFilter(e.target.value)}
                    className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-[#635BFF]"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Paid">Paid</option>
                    <option value="Approved">Approved</option>
                    <option value="Pending Approval">Pending Approval</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={expenseCategoryFilter}
                    onChange={(e: any) => setExpenseCategoryFilter(e.target.value)}
                    className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-[#635BFF]"
                  >
                    <option value="All">All Categories</option>
                    <option value="Materials">Materials</option>
                    <option value="Labour & Daily Wages">Labour & Daily Wages</option>
                    <option value="Machinery & Equipment">Machinery & Equipment</option>
                    <option value="Site Petty Cash">Site Petty Cash</option>
                    <option value="Subcontractor">Subcontractor</option>
                    <option value="Fuel & Logistics">Fuel & Logistics</option>
                    <option value="Safety & Compliance">Safety & Compliance</option>
                    <option value="Utilities & Admin">Utilities & Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Project</label>
                  <select
                    value={expenseProjectFilter}
                    onChange={(e: any) => setExpenseProjectFilter(e.target.value)}
                    className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-[#635BFF] max-w-[240px]"
                  >
                    <option value="All">All Projects</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end gap-2 ml-auto pt-4 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => {
                      setExpenseStatusFilter('All');
                      setExpenseCategoryFilter('All');
                      setExpenseProjectFilter('All');
                      setExpenseSearchQuery('');
                      setIsExpenseFilterOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsExpenseFilterOpen(false)}
                    className="px-4 py-1.5 rounded-lg bg-[#635BFF] text-white font-semibold hover:bg-[#5046E5] cursor-pointer"
                  >
                    Apply Filter
                  </button>
                </div>
              </div>
            )}

            {/* 3. Expenses Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              
              {/* Header Row */}
              <div className="grid grid-cols-12 px-6 py-3 bg-[#f8fafc] border-b border-slate-200 text-xs font-semibold text-slate-600 select-none">
                <div className="col-span-5 md:col-span-4 pl-12">
                  Expense Details & Voucher
                </div>
                <div className="col-span-3 md:col-span-3">
                  Project & Allocation
                </div>
                <div className="col-span-2 hidden md:block">
                  Category
                </div>
                <div className="col-span-4 md:col-span-3 text-right">
                  Amount & Status
                </div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-slate-100">
                {filteredExpenses.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-1" />
                    <p className="text-sm font-semibold text-slate-600">No expenses found</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting the filters or record a new expense voucher.</p>
                  </div>
                ) : (
                  filteredExpenses.map((exp) => (
                    <div
                      key={exp.id}
                      onClick={() => setSelectedExpenseDetails(exp)}
                      className="grid grid-cols-12 px-6 py-4 items-center hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Left: Purple Date Box + Expense Title & Voucher */}
                      <div className="col-span-5 md:col-span-4 flex items-center gap-3.5 min-w-0 pr-2">
                        {/* Date Box */}
                        <div className="w-11 h-11 rounded-lg bg-[#635BFF] text-white flex flex-col items-center justify-center shrink-0 shadow-2xs">
                          <span className="text-[10px] font-bold tracking-tight text-white/95 leading-none">
                            {exp.date.split(' ').slice(0, 2).join(' ')}
                          </span>
                          <Receipt className="w-3.5 h-3.5 text-white/90 mt-1 stroke-[2.2]" />
                        </div>

                        {/* Title & Payee / Voucher Code */}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-900 group-hover:text-[#635BFF] transition-colors truncate">
                            {exp.title}
                          </div>
                          <div className="text-xs text-slate-500 font-medium mt-0.5 truncate flex items-center gap-1.5">
                            <span className="font-semibold text-slate-700">{exp.partyOrVendorName}</span>
                            <span>•</span>
                            <span className="text-slate-400">{exp.expenseCode}</span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Project & Subproject Location */}
                      <div className="col-span-3 md:col-span-3 min-w-0 pr-3">
                        <div className="text-xs font-semibold text-slate-800 truncate" title={exp.projectName}>
                          {exp.projectName}
                        </div>
                        <div className="text-xs text-slate-400 font-medium mt-0.5 truncate">
                          {exp.subProjectOrLocation || exp.paidFromAccount}
                        </div>
                      </div>

                      {/* Category Badge */}
                      <div className="col-span-2 hidden md:block">
                        <span className={`inline-block text-[11px] font-medium px-2.5 py-0.5 rounded border ${
                          exp.category === 'Materials'
                            ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                            : exp.category === 'Labour & Daily Wages'
                            ? 'bg-violet-50 text-violet-700 border-violet-200'
                            : exp.category === 'Machinery & Equipment'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : exp.category === 'Site Petty Cash'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : exp.category === 'Subcontractor'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : exp.category === 'Fuel & Logistics'
                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : exp.category === 'Safety & Compliance'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {exp.category}
                        </span>
                      </div>

                      {/* Right: Amount & Status Badge */}
                      <div className="col-span-4 md:col-span-3 text-right shrink-0">
                        <div className="text-sm font-bold text-slate-900">
                          ₹ {exp.amount.toLocaleString('en-IN')}
                        </div>
                        <div className="mt-1 flex items-center justify-end gap-1.5">
                          <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded ${
                            exp.status === 'Paid'
                              ? 'bg-[#EDE9FE] text-[#635BFF] border border-purple-200'
                              : exp.status === 'Approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : exp.status === 'Pending Approval'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-red-50 text-red-600 border border-red-200'
                          }`}>
                            {exp.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Table Footer Summary */}
              <div className="px-6 py-3 bg-[#f8fafc] border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500">
                <span>Showing {filteredExpenses.length} of {expenses.length} expense vouchers</span>
                <div className="flex items-center gap-5">
                  <span>Paid: <strong className="text-slate-800">₹{expenseMetrics.paidAmount.toLocaleString('en-IN')}</strong></span>
                  <span>Pending: <strong className="text-amber-700">₹{expenseMetrics.pendingAmount.toLocaleString('en-IN')}</strong></span>
                  <span>Total: <strong className="text-[#635BFF]">₹{expenseMetrics.total.toLocaleString('en-IN')}</strong></span>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* ═════════════════════════════════════════════════════════════
            TAB 4: ACCOUNT TO ACCOUNT TRANSFER (Contra Ledgers & Imprest)
        ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'account_transfer' && (
          <div className="space-y-6">
            
            {/* Top KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Transferred */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Transferred</span>
                  <div className="w-8 h-8 rounded-lg bg-[#635BFF]/10 text-[#635BFF] flex items-center justify-center">
                    <ArrowLeftRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                  ₹{transferMetrics.totalTransferred.toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
                  <span className="text-emerald-700 font-semibold">{transfers.filter(t => t.status === 'Completed').length} Completed</span>
                  <span>Contra entries posted</span>
                </p>
              </div>

              {/* Card 2: Bank to Site Petty Cash */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bank ➔ Site Imprest</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                  ₹{transferMetrics.pettyCashTransfers.toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-amber-700 mt-1 font-medium flex items-center gap-1">
                  <span>Site cash safe replenishment</span>
                </p>
              </div>

              {/* Card 3: Inter-Bank & Escrow */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inter-Bank & Escrow</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Landmark className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                  ₹{transferMetrics.interBankTransfers.toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 font-medium">
                  HDFC Operations ⇋ SBI Escrow
                </p>
              </div>

              {/* Card 4: Connected Accounts */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Connected Accounts</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                  {bankAccounts.length} Active Accounts
                </div>
                <p className="text-[11px] text-slate-500 mt-1 font-medium">
                  Total Liquidity: <span className="font-semibold text-slate-800">₹{bankAccounts.reduce((acc, b) => acc + b.balance, 0).toLocaleString('en-IN')}</span>
                </p>
              </div>
            </div>

            {/* Live Account Balances Quick-Overview */}
            <div className="bg-gradient-to-r from-slate-50 via-slate-50/70 to-indigo-50/30 p-4 rounded-xl border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-[#635BFF]" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Connected Account Balances</span>
                  <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Live Synchronized
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">Click any account to initiate a quick transfer</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {bankAccounts.map(acc => (
                  <div 
                    key={acc.id} 
                    className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs hover:border-[#635BFF]/60 hover:shadow-xs transition-all flex items-center justify-between group cursor-pointer"
                    onClick={() => {
                      setNewTrfFromAccountId(acc.id);
                      const other = bankAccounts.find(b => b.id !== acc.id);
                      if (other) setNewTrfToAccountId(other.id);
                      setIsNewTransferModalOpen(true);
                    }}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-bold text-slate-900 truncate block">{acc.accountName}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{acc.bankName} • {acc.accountNumber}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-slate-400 font-medium">Balance</div>
                      <div className="text-sm font-black text-slate-900">₹{acc.balance.toLocaleString('en-IN')}</div>
                      <span className="text-[10px] font-semibold text-[#635BFF] opacity-0 group-hover:opacity-100 transition-opacity">
                        Transfer ➔
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Bar: Search, Filters, Modes, and + New Transfer Button */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                
                {/* Search & Filter Trigger */}
                <div className="flex items-center gap-2.5 flex-1 min-w-[280px] max-w-xl">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={transferSearchQuery}
                      onChange={(e) => setTransferSearchQuery(e.target.value)}
                      placeholder="Search voucher #, account, UTR, purpose, project..."
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#635BFF] focus:ring-1 focus:ring-[#635BFF] transition-all"
                    />
                    {transferSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setTransferSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Filter Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsTransferFilterOpen(!isTransferFilterOpen)}
                      className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        transferAccountFilter !== 'All' || transferStatusFilter !== 'All'
                          ? 'border-[#635BFF] bg-[#635BFF]/10 text-[#635BFF]'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Filter className="w-3.5 h-3.5" />
                      <span>Filter</span>
                      {(transferAccountFilter !== 'All' || transferStatusFilter !== 'All') && (
                        <span className="w-2 h-2 rounded-full bg-[#635BFF]" />
                      )}
                    </button>

                    {isTransferFilterOpen && (
                      <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-40 space-y-3.5">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <span className="text-xs font-bold text-slate-900">Filter Transfers</span>
                          <button
                            type="button"
                            onClick={() => {
                              setTransferAccountFilter('All');
                              setTransferStatusFilter('All');
                              setTransferModeFilter('All');
                            }}
                            className="text-[11px] text-[#635BFF] font-medium hover:underline cursor-pointer"
                          >
                            Reset All
                          </button>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">Account Involved</label>
                          <select
                            value={transferAccountFilter}
                            onChange={(e) => setTransferAccountFilter(e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded-md p-1.5 bg-white text-slate-800 focus:outline-none focus:border-[#635BFF]"
                          >
                            <option value="All">All Bank & Cash Accounts</option>
                            {bankAccounts.map(b => (
                              <option key={b.id} value={b.id}>{b.accountName}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">Status</label>
                          <select
                            value={transferStatusFilter}
                            onChange={(e) => setTransferStatusFilter(e.target.value as any)}
                            className="w-full text-xs border border-slate-200 rounded-md p-1.5 bg-white text-slate-800 focus:outline-none focus:border-[#635BFF]"
                          >
                            <option value="All">All Statuses</option>
                            <option value="Completed">Completed</option>
                            <option value="Pending Verification">Pending Verification</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setIsTransferFilterOpen(false)}
                            className="px-3 py-1 bg-[#635BFF] text-white rounded text-xs font-semibold cursor-pointer"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Actions: Export + New Transfer Button */}
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleExportTransfers}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Export CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewTrfFromAccountId(bankAccounts[0]?.id || '');
                      setNewTrfToAccountId(bankAccounts[2]?.id || bankAccounts[1]?.id || 'ba-2');
                      setIsNewTransferModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#635BFF] hover:bg-[#5046E5] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ New Transfer</span>
                  </button>
                </div>
              </div>

              {/* Transfer Mode Quick Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[11px] font-semibold text-slate-400 mr-1 shrink-0">Mode:</span>
                {[
                  { id: 'All', label: 'All Transfers' },
                  { id: 'Cash Withdrawal', label: '💵 Cash Withdrawal (Imprest)' },
                  { id: 'IMPS / Bank Transfer', label: '⚡ IMPS' },
                  { id: 'NEFT / RTGS', label: '🏦 NEFT / RTGS' },
                  { id: 'Internal Ledger Contra', label: '🔄 Internal Contra' },
                  { id: 'Cash Deposit', label: '📥 Cash Deposit' }
                ].map(mode => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setTransferModeFilter(mode.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer border ${
                      transferModeFilter === mode.id
                        ? 'bg-slate-900 border-slate-900 text-white font-semibold shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Transfers Table Card */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-[#f8fafc] text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Voucher # & Date</th>
                      <th className="py-3 px-4">From Account (Credit)</th>
                      <th className="py-3 px-2 text-center w-8"></th>
                      <th className="py-3 px-4">To Account (Debit)</th>
                      <th className="py-3 px-4">Mode & Reference</th>
                      <th className="py-3 px-4">Purpose & Project</th>
                      <th className="py-3 px-4 text-right">Amount (₹)</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransfers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-14 text-center">
                          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                            <ArrowLeftRight className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-bold text-slate-800">No account transfers found</p>
                          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                            {transferSearchQuery || transferModeFilter !== 'All' || transferStatusFilter !== 'All'
                              ? 'Try adjusting your search query or clear the active filters.'
                              : 'Record contra transfers between HDFC Bank, SBI Escrow, and Site Petty Cash Vaults.'}
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsNewTransferModalOpen(true)}
                            className="mt-4 px-4 py-1.5 bg-[#635BFF] hover:bg-[#5046E5] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                          >
                            + Record Transfer
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredTransfers.map(trf => (
                        <tr key={trf.id} className="hover:bg-slate-50/70 transition-colors group">
                          
                          {/* Voucher Code & Date */}
                          <td className="py-3.5 px-4 font-mono">
                            <span className="font-bold text-slate-900 block">{trf.transferCode}</span>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {trf.date}
                            </span>
                          </td>

                          {/* From Account */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-md bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <span className="font-semibold text-slate-800 block truncate max-w-[170px]" title={trf.fromAccountName}>
                                  {trf.fromAccountName}
                                </span>
                                <span className="text-[10px] text-slate-400">Debit / Outflow</span>
                              </div>
                            </div>
                          </td>

                          {/* Arrow Flow */}
                          <td className="py-3.5 px-2 text-center">
                            <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                              <ArrowRight className="w-3.5 h-3.5 text-[#635BFF]" />
                            </div>
                          </td>

                          {/* To Account */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                <ArrowDownRight className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <span className="font-semibold text-slate-800 block truncate max-w-[170px]" title={trf.toAccountName}>
                                  {trf.toAccountName}
                                </span>
                                <span className="text-[10px] text-emerald-600 font-medium">Credit / Inflow</span>
                              </div>
                            </div>
                          </td>

                          {/* Mode & Ref */}
                          <td className="py-3.5 px-4">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {trf.transferMode}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500 block mt-1 truncate max-w-[130px]" title={trf.referenceNo}>
                              {trf.referenceNo}
                            </span>
                          </td>

                          {/* Purpose & Project */}
                          <td className="py-3.5 px-4">
                            <p className="text-slate-800 font-medium line-clamp-1 max-w-[220px]" title={trf.purpose}>
                              {trf.purpose}
                            </p>
                            {trf.projectName && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded mt-0.5 truncate max-w-[200px]" title={trf.projectName}>
                                <Building2 className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{trf.projectName}</span>
                              </span>
                            )}
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4 text-right">
                            <span className="text-sm font-bold text-slate-900 block font-mono">
                              ₹{trf.amount.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] font-medium text-slate-400">Contra Entry</span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              trf.status === 'Completed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : trf.status === 'Pending Verification'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {trf.status === 'Completed' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                              {trf.status === 'Pending Verification' && <Clock className="w-3 h-3 text-amber-600" />}
                              {trf.status === 'Rejected' && <AlertCircle className="w-3 h-3 text-red-600" />}
                              <span>{trf.status}</span>
                            </span>
                          </td>

                          {/* Action */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedTransferDetails(trf)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-[#635BFF] hover:border-[#635BFF] hover:bg-[#635BFF]/5 transition-colors cursor-pointer inline-flex items-center gap-1"
                              title="View Contra Voucher Slip"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-semibold hidden md:inline">Voucher</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer Summary */}
              <div className="px-6 py-3 bg-[#f8fafc] border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500">
                <span>Showing {filteredTransfers.length} of {transfers.length} contra transfer entries</span>
                <div className="flex items-center gap-5">
                  <span>Filtered Sum: <strong className="text-slate-900 font-mono">₹{filteredTransfers.reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-IN')}</strong></span>
                  <span>Total Completed: <strong className="text-[#635BFF] font-mono">₹{transferMetrics.totalTransferred.toLocaleString('en-IN')}</strong></span>
                </div>
              </div>
            </div>

          </div>
        )}


        {/* ═════════════════════════════════════════════════════════════
            TAB 5: ACCOUNTS (Bank & Cash Accounts + Tally/Zoho Integration)
        ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'accounts' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Bank Accounts & Petty Cash Vaults</h2>
                <p className="text-xs text-slate-500">Connected bank ledgers, RERA escrow, and Tally/Zoho books sync</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddAccountModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#635BFF] hover:bg-[#5046E5] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Account</span>
              </button>
            </div>

            {/* Bank Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {bankAccounts.map(ba => (
                <div key={ba.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4 hover:border-slate-300 transition-all group">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">{ba.bankName}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          ba.accountType === 'Escrow' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          ba.accountType === 'Petty Cash' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}>
                          {ba.accountType}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">{ba.accountName}</h3>
                    </div>
                    <span className="p-2 rounded-lg bg-purple-50 text-[#635BFF]">
                      <Landmark className="w-4 h-4" />
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500 block">Available Balance</span>
                    <div className="text-2xl font-bold text-slate-900 mt-0.5 font-mono">
                      ₹ {ba.balance.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>A/c: {ba.accountNumber}</span>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setNewTrfFromAccountId(ba.id);
                          const other = bankAccounts.find(b => b.id !== ba.id);
                          if (other) setNewTrfToAccountId(other.id);
                          setActiveTab('account_transfer');
                          setIsNewTransferModalOpen(true);
                        }}
                        className="text-[11px] font-bold text-[#635BFF] hover:underline cursor-pointer"
                      >
                        Transfer ➔
                      </button>
                      {ba.id.startsWith('ba-') && true && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAccount(ba.id, ba.accountName)}
                          className="text-[11px] text-red-500 hover:text-red-700 cursor-pointer p-0.5"
                          title="Delete Account"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tally / Zoho Integration Banner */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50/60 rounded-xl border border-purple-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-[#635BFF] text-white shrink-0 shadow-sm">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">ERP & Accounting Synchronization</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Seamlessly push payment vouchers and receipts to Tally Prime & Zoho Books in real-time.
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                      <Check className="w-3 h-3 text-emerald-600" /> Tally ODBC Gateway Ready
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                      <Check className="w-3 h-3 text-emerald-600" /> Zoho Books REST API Active
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTallyModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-white border border-[#635BFF] text-[#635BFF] hover:bg-purple-50 text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
              >
                Configure Sync
              </button>
            </div>
          </div>
        )}
      </div>


      {/* ─────────────────────────────────────────────────────────────
          4. MODALS & POPUPS
      ───────────────────────────────────────────────────────────── */}

      {/* MODAL A: NEW PAYMENT REQUEST (as in screenshot) */}
      {isNewRequestModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#635BFF] text-white flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Create Payment Request</h3>
              </div>
              <button 
                onClick={() => setIsNewRequestModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePaymentRequest} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Party / Vendor Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jd Ekambaram Chrompet"
                  value={newPartyName}
                  onChange={e => setNewPartyName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#635BFF] focus:ring-1 focus:ring-[#635BFF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 5000"
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#635BFF] focus:ring-1 focus:ring-[#635BFF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Voucher Date
                  </label>
                  <input
                    type="text"
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    placeholder="13 Jul 26"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#635BFF] focus:ring-1 focus:ring-[#635BFF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Project Name / Allocation
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="e.g. RO66 - 2153 - (2026 - 2027) - Jd Ekambaram - Chromepet"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#635BFF] focus:ring-1 focus:ring-[#635BFF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category / Against
                  </label>
                  <select
                    value={newSubProjectText}
                    onChange={e => setNewSubProjectText(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#635BFF] bg-white"
                  >
                    <option value="Against Other">Against Other</option>
                    <option value="Against Material PO">Against Material PO</option>
                    <option value="Against Machinery Hire">Against Machinery Hire</option>
                    <option value="Against Labour Bill">Against Labour Bill</option>
                    <option value="Against Subcontractor Bill">Against Subcontractor Bill</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e: any) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#635BFF] bg-white"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Approved">Approved</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Purpose
                </label>
                <textarea
                  rows={2}
                  placeholder="Details of expense, site work, or invoice reference..."
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#635BFF]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewRequestModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-[#635BFF] hover:bg-[#5046E5] text-white rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  Save Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* MODAL B: PAYMENT REQUEST DETAILS */}
      {selectedRequestDetails && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#198754] text-white flex flex-col items-center justify-center font-bold text-[10px]">
                  <span>{selectedRequestDetails.date}</span>
                  <Receipt className="w-3.5 h-3.5 text-white/90 mt-0.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedRequestDetails.requestCode}</h3>
                  <p className="text-xs text-slate-500">{selectedRequestDetails.partyName}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedRequestDetails(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[11px]">Request Amount</span>
                  <span className="text-xl font-bold text-slate-900">
                    ₹ {selectedRequestDetails.amount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] text-right">Status</span>
                  <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded ${
                    selectedRequestDetails.status === 'Paid'
                      ? 'bg-[#EDE9FE] text-[#635BFF] border border-purple-200'
                      : selectedRequestDetails.status === 'Approved'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {selectedRequestDetails.status}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="font-semibold text-slate-700 block">Project Description:</span>
                  <p className="text-slate-600 font-medium">{selectedRequestDetails.projectName}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-700 block">Category / Type:</span>
                  <p className="text-slate-600">{selectedRequestDetails.subProjectText} ({selectedRequestDetails.category})</p>
                </div>
                {selectedRequestDetails.paymentMode && (
                  <div>
                    <span className="font-semibold text-slate-700 block">Disbursal Mode & Ref:</span>
                    <p className="text-slate-600">{selectedRequestDetails.paymentMode} • Ref: {selectedRequestDetails.referenceNo || 'N/A'}</p>
                  </div>
                )}
                {selectedRequestDetails.notes && (
                  <div>
                    <span className="font-semibold text-slate-700 block">Remarks:</span>
                    <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">{selectedRequestDetails.notes}</p>
                  </div>
                )}
              </div>

              {/* Status Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    if (onShowToast) onShowToast(`Voucher ${selectedRequestDetails.requestCode} downloaded`);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Voucher</span>
                </button>

                <div className="flex items-center gap-2">
                  {selectedRequestDetails.status !== 'Paid' && (
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentRequests(prev => prev.map(r => r.id === selectedRequestDetails.id ? { ...r, status: 'Paid', paidDate: 'Today' } : r));
                        setSelectedRequestDetails(null);
                        if (onShowToast) onShowToast(`Marked ${selectedRequestDetails.requestCode} as Paid`);
                      }}
                      className="px-4 py-1.5 bg-[#635BFF] hover:bg-[#5046E5] text-white font-semibold rounded-lg cursor-pointer"
                    >
                      Mark as Paid
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* MODAL C: BOOK DEMO */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#635BFF]" />
                <h3 className="text-sm font-bold text-slate-900">Book Interactive Demo</h3>
              </div>
              <button onClick={() => setIsDemoModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Schedule a 1-on-1 walkthrough of Booshnam Construction Finance, Tally sync & subcontractor billing automation.
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company / Project Name</label>
                <input type="text" defaultValue="Booshnam Associates" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Preferred Demo Date</label>
                <input type="date" defaultValue="2026-09-25" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs" />
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button onClick={() => setIsDemoModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-500">Cancel</button>
              <button 
                onClick={() => {
                  setIsDemoModalOpen(false);
                  if (onShowToast) onShowToast('Demo session scheduled! Our specialist will reach out.');
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-[#635BFF] text-white rounded-lg"
              >
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}


      {/* MODAL D: TALLY & ZOHO INTEGRATION */}
      {isTallyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-[#635BFF]" />
                <h3 className="text-sm font-bold text-slate-900">Configure Tally & Zoho Integration</h3>
              </div>
              <button onClick={() => setIsTallyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Tally Prime ODBC Server</span>
                  <span className="text-[11px] text-slate-500">Port 9000 • XML Gateway</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Ready to Sync
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Zoho Books API</span>
                  <span className="text-[11px] text-slate-500">Organization ID: 819200192</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Connected
                </span>
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button onClick={() => setIsTallyModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-500">Close</button>
              <button 
                onClick={() => {
                  setIsTallyModalOpen(false);
                  if (onShowToast) onShowToast('Sync complete: 12 vouchers posted to Tally & Zoho Books');
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-[#635BFF] text-white rounded-lg flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync Now</span>
              </button>
            </div>
          </div>
        </div>
      )}


      {/* MODAL E: REFER & EARN */}
      {isReferModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-[#635BFF]" />
                <h3 className="text-sm font-bold text-slate-900">Refer & Earn ₹5,000</h3>
              </div>
              <button onClick={() => setIsReferModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Invite fellow builders, developers, or subcontractors to Booshnam Software and earn ₹5,000 credit on every active project registration.
            </p>
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs flex items-center justify-between">
              <span className="font-mono text-purple-900 font-bold">BOOSHNAM-FIN-2026</span>
              <button 
                onClick={() => {
                  navigator.clipboard?.writeText('https://booshnam.com/join?ref=BOOSHNAM-FIN-2026');
                  if (onShowToast) onShowToast('Referral link copied to clipboard!');
                }}
                className="text-[11px] font-bold text-[#635BFF] hover:underline"
              >
                Copy Link
              </button>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setIsReferModalOpen(false)} className="px-4 py-1.5 text-xs font-semibold bg-[#635BFF] text-white rounded-lg">
                Done
              </button>
            </div>
          </div>
        </div>
      )}


      {/* MODAL F: LEADERBOARD */}
      {isLeaderboardModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">Finance Efficiency Leaderboard</h3>
              </div>
              <button onClick={() => setIsLeaderboardModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between">
                <span className="font-bold text-amber-900">#1 Villa Grande Site Team</span>
                <span className="font-semibold text-emerald-700">99.4% On-Budget</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-800">#2 Commercial Hub Team</span>
                <span className="font-semibold text-emerald-700">97.8% On-Budget</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-800">#3 Chromepet Substation</span>
                <span className="font-semibold text-emerald-700">95.2% On-Budget</span>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setIsLeaderboardModalOpen(false)} className="px-4 py-1.5 text-xs font-semibold bg-[#635BFF] text-white rounded-lg">
                Close
              </button>
            </div>
          </div>
        </div>
      )}


      {/* DRAWER: ADD PARTY (matching User Screenshot 2) */}
      <AddPartyDrawer
        isOpen={isAddPartyDrawerOpen}
        onClose={() => setIsAddPartyDrawerOpen(false)}
        onSaveParty={handleCreatePartyFromDrawer}
        nextPartyId={String(1641 + parties.length)}
      />

      {/* DRAWER / MODAL: VIEW PARTY DETAILS */}
      {selectedPartyRecord && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedPartyRecord(null)}
          />

          <div className="relative w-full max-w-md bg-white shadow-2xl z-10 flex flex-col h-full border-l border-slate-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full ${selectedPartyRecord.avatarColor || 'bg-[#1E40AF]'} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs`}>
                  {selectedPartyRecord.avatarText || selectedPartyRecord.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">{selectedPartyRecord.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-500 font-medium">ID: {selectedPartyRecord.partyId || 'N/A'}</span>
                    <span className="text-slate-300">•</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                      selectedPartyRecord.type === 'Staff' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {selectedPartyRecord.type}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPartyRecord(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="h-1 bg-[#635BFF] w-full shrink-0" />

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Financial Balance Card */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Ledger Balance</span>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    ₹ {selectedPartyRecord.balanceDue.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded ${
                    selectedPartyRecord.status === 'To Receive'
                      ? 'border border-blue-200 bg-[#EFF6FF] text-[#2563EB]'
                      : selectedPartyRecord.status === 'To Pay'
                      ? 'border border-red-200 bg-red-50 text-red-600'
                      : 'border border-slate-200 bg-slate-100 text-slate-600'
                  }`}>
                    {selectedPartyRecord.status}
                  </span>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-2.5 bg-white rounded-xl border border-slate-200 p-4">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contact & Profile</h4>
                
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone
                  </span>
                  <span className="font-semibold text-slate-800">{selectedPartyRecord.phone || 'Not provided'}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> Email
                  </span>
                  <span className="font-semibold text-slate-800 truncate max-w-[200px]">{selectedPartyRecord.email || 'Not provided'}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date of Joining
                  </span>
                  <span className="font-semibold text-slate-800">{selectedPartyRecord.dateOfJoining || '12/04/2025'}</span>
                </div>

                {selectedPartyRecord.address && (
                  <div className="py-1.5">
                    <span className="text-slate-500 flex items-center gap-1.5 block mb-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> Address
                    </span>
                    <p className="text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px]">
                      {selectedPartyRecord.address}
                    </p>
                  </div>
                )}
              </div>

              {/* KYC Information */}
              <div className="space-y-2.5 bg-white rounded-xl border border-slate-200 p-4">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">KYC Compliance</h4>
                
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Aadhaar Number</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {selectedPartyRecord.aadhaarNumber ? `•••• •••• ${selectedPartyRecord.aadhaarNumber.slice(-4)}` : 'Verified on File'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-500">PAN Card</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {selectedPartyRecord.panNumber ? selectedPartyRecord.panNumber : 'ABCDE1234F'}
                  </span>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewPartyName(selectedPartyRecord.name);
                    setSelectedPartyRecord(null);
                    setIsNewRequestModalOpen(true);
                  }}
                  className="w-full py-2.5 bg-[#635BFF] hover:bg-[#5046E5] text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Payment Request for {selectedPartyRecord.name}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewTxnParty(selectedPartyRecord.name);
                    setSelectedPartyRecord(null);
                    setIsRecordTxnModalOpen(true);
                  }}
                  className="w-full py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Record Cash/Bank Transaction</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* MODAL H: RECORD TRANSACTION */}
      {isRecordTxnModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Record Cashbook Transaction</h3>
              <button onClick={() => setIsRecordTxnModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveTransaction} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Type</label>
                  <select
                    value={newTxnType}
                    onChange={(e: any) => setNewTxnType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-bold"
                  >
                    <option value="EXPENSE">Expense (Outflow)</option>
                    <option value="INCOME">Income (Inflow)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 25000"
                    value={newTxnAmount}
                    onChange={e => setNewTxnAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Party Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jd Ekambaram or Client Name"
                  value={newTxnParty}
                  onChange={e => setNewTxnParty(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={newTxnMode}
                    onChange={(e: any) => setNewTxnMode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="NEFT/RTGS">NEFT / RTGS</option>
                    <option value="UPI">UPI</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reference No / UTR</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC2026..."
                    value={newTxnRef}
                    onChange={e => setNewTxnRef(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsRecordTxnModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-500">Cancel</button>
                <button type="submit" className="px-4 py-1.5 text-xs font-semibold bg-[#635BFF] text-white rounded-lg">Save Record</button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* MODAL I: ADD BANK ACCOUNT */}
      {isAddAccountModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#635BFF]/10 text-[#635BFF] flex items-center justify-center">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add Bank or Cash Ledger</h3>
                  <p className="text-[11px] text-slate-400">Syncs immediately to Expenses & Transfers</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsAddAccountModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSaveAccount} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Account / Ledger Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Axis Bank Site Escrow or Site Petty Cash - Tambaram" 
                  value={newAccName}
                  onChange={e => setNewAccName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#635BFF] focus:ring-1 focus:ring-[#635BFF]" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Bank / Institution Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Axis Bank Ltd" 
                    value={newAccBankName}
                    onChange={e => setNewAccBankName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#635BFF]" 
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Type</label>
                  <select
                    value={newAccType}
                    onChange={e => setNewAccType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:border-[#635BFF]"
                  >
                    <option value="Current">Current Account</option>
                    <option value="Savings">Savings Account</option>
                    <option value="Escrow">Project Escrow (RERA)</option>
                    <option value="Petty Cash">Petty Cash Safe</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Account / Safe Number
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. 9230100482910" 
                    value={newAccNumber}
                    onChange={e => setNewAccNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#635BFF]" 
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">IFSC / Branch Code</label>
                  <input 
                    type="text" 
                    placeholder="e.g. UTIB0001234" 
                    value={newAccIfsc}
                    onChange={e => setNewAccIfsc(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#635BFF]" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Opening Balance (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input 
                      type="number" 
                      min="0"
                      step="any"
                      placeholder="0" 
                      value={newAccBalance}
                      onChange={e => setNewAccBalance(e.target.value)}
                      className="w-full pl-6 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-[#635BFF]" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tally / Zoho Ledger</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Axis Bank - Ops" 
                    value={newAccTallyLedger}
                    onChange={e => setNewAccTallyLedger(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#635BFF]" 
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-100 text-[11px] text-indigo-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#635BFF] shrink-0" />
                <span>This account will instantly become selectable in <strong>Expenses</strong> and <strong>Account Transfers</strong>.</span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsAddAccountModalOpen(false)} 
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-1.5 text-xs font-bold bg-[#635BFF] hover:bg-[#5046E5] text-white rounded-lg shadow-2xs cursor-pointer transition-colors"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
 
      {/* MODAL J: PAYMENT IN (RECORD RECEIPT) */}
      {isPaymentInModalOpen && activePartyOverview && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  <ArrowDown className="w-4.5 h-4.5 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Record Payment In</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Party: <strong className="text-slate-800">{activePartyOverview.name}</strong></p>
                </div>
              </div>
              <button 
                onClick={() => setIsPaymentInModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePaymentIn} className="space-y-3.5 text-xs">
              {/* Project Selection as requested in audio */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Project *</label>
                <select
                  value={paymentInProject}
                  onChange={e => setPaymentInProject(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-medium focus:outline-none focus:border-[#00875A] focus:ring-1 focus:ring-[#00875A] cursor-pointer"
                >
                  <option value="Booshnam Associates Pvt Ltd">Booshnam Associates Pvt Ltd</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                  <option value="General Project / Unallocated">General Project / Unallocated</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount Received (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="1"
                    placeholder="e.g. 50000"
                    value={paymentInAmount}
                    onChange={e => setPaymentInAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#00875A] focus:ring-1 focus:ring-[#00875A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={paymentInDate}
                    onChange={e => setPaymentInDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#00875A]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={paymentInMode}
                    onChange={(e: any) => setPaymentInMode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-medium focus:outline-none focus:border-[#00875A] cursor-pointer"
                  >
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="NEFT/RTGS">NEFT / RTGS / Bank</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reference / UTR / Cheque No.</label>
                <input
                  type="text"
                  placeholder="e.g. UPI/2026/092301 or CHQ-99182"
                  value={paymentInRef}
                  onChange={e => setPaymentInRef(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#00875A]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Remarks</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Milestone payment against machine hire"
                  value={paymentInNotes}
                  onChange={e => setPaymentInNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#00875A] resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsPaymentInModalOpen(false)} 
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4.5 py-2 text-xs font-bold bg-[#00875A] hover:bg-[#0D824B] text-white rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Record Payment In</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL K: CREATE TRANSACTION / SALES INVOICE */}
      {isCreatePartyTxnModalOpen && activePartyOverview && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#635BFF]/10 text-[#635BFF] flex items-center justify-center font-bold text-xs">
                  <FileText className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Create Transaction</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Party: <strong className="text-slate-800">{activePartyOverview.name}</strong></p>
                </div>
              </div>
              <button 
                onClick={() => setIsCreatePartyTxnModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePartyTxn} className="space-y-3.5 text-xs">
              {/* Transaction Type selection as requested in audio */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Transaction Type *</label>
                  <select
                    value={partyTxnCategory}
                    onChange={(e: any) => {
                      const cat = e.target.value;
                      setPartyTxnCategory(cat);
                      const code = Math.floor(1700 + Math.random() * 500);
                      setPartyTxnTitle(`RA11-BAGJ-${code}(2026-2027)-${activePartyOverview.name}-${cat}`);
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-medium focus:outline-none focus:border-[#635BFF] focus:ring-1 focus:ring-[#635BFF] cursor-pointer"
                  >
                    <option value="Sales Invoice">Sales Invoice</option>
                    <option value="Material Sales">Material Sales</option>
                    <option value="Labour & Service Invoice">Labour & Service Invoice</option>
                    <option value="Machine / Equipment Rental">Machine / Equipment Rental</option>
                    <option value="Debit Note">Debit Note</option>
                    <option value="Credit Note">Credit Note</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Project *</label>
                  <select
                    value={partyTxnProject}
                    onChange={e => setPartyTxnProject(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-medium focus:outline-none focus:border-[#635BFF] focus:ring-1 focus:ring-[#635BFF] cursor-pointer"
                  >
                    <option value="Booshnam Associates Pvt Ltd">Booshnam Associates Pvt Ltd</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                    <option value="General Project / Unallocated">General Project / Unallocated</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Invoice / Voucher Code *</label>
                <input
                  type="text"
                  required
                  placeholder={`e.g. RA11-BAGJ-1748(2026-2027)-${activePartyOverview.name}-${partyTxnCategory}`}
                  value={partyTxnTitle}
                  onChange={e => setPartyTxnTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#635BFF] focus:ring-1 focus:ring-[#635BFF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="1"
                      placeholder="e.g. 133464"
                      value={partyTxnAmount}
                      onChange={e => setPartyTxnAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#635BFF] focus:ring-1 focus:ring-[#635BFF]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={partyTxnDate}
                    onChange={e => setPartyTxnDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#635BFF]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">TDS / Retention / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. 2% TDS or 10% TDS or RETENTION AMOUNT-6970&2% TDS"
                  value={partyTxnNotes}
                  onChange={e => setPartyTxnNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#635BFF]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsCreatePartyTxnModalOpen(false)} 
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4.5 py-2 text-xs font-bold bg-[#635BFF] hover:bg-[#5046E5] text-white rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Create Transaction</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL L: RECORD NEW EXPENSE */}
      {isRecordExpenseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#635BFF] text-white flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Record Construction Expense</h3>
                  <p className="text-[11px] text-slate-400">Log operational bills, contractor claims, and site petty cash</p>
                </div>
              </div>
              <button 
                onClick={() => setIsRecordExpenseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expense Description / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UltraTech M25 Grade RMC Pouring (45 CuM)"
                  value={newExpTitle}
                  onChange={e => setNewExpTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#635BFF] focus:ring-1 focus:ring-[#635BFF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={newExpCategory}
                    onChange={(e: any) => setNewExpCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#635BFF] bg-white font-medium"
                  >
                    <option value="Materials">Materials</option>
                    <option value="Labour & Daily Wages">Labour & Daily Wages</option>
                    <option value="Machinery & Equipment">Machinery & Equipment</option>
                    <option value="Site Petty Cash">Site Petty Cash</option>
                    <option value="Subcontractor">Subcontractor</option>
                    <option value="Fuel & Logistics">Fuel & Logistics</option>
                    <option value="Safety & Compliance">Safety & Compliance</option>
                    <option value="Utilities & Admin">Utilities & Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 48000"
                    value={newExpAmount}
                    onChange={e => setNewExpAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#635BFF] focus:ring-1 focus:ring-[#635BFF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Project *
                  </label>
                  <select
                    value={newExpProject}
                    onChange={e => setNewExpProject(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#635BFF] bg-white"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Site Location / Sub-Work
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Block A - 2nd Floor Slab"
                    value={newExpLocation}
                    onChange={e => setNewExpLocation(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#635BFF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vendor / Payee Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. UltraTech Cement or Site Worker"
                    value={newExpPayee}
                    onChange={e => setNewExpPayee(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#635BFF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Paid From Account *
                  </label>
                  <select
                    value={newExpAccount}
                    onChange={e => setNewExpAccount(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#635BFF] bg-white font-medium text-slate-800"
                  >
                    {bankAccounts.map(ba => (
                      <option key={ba.id} value={ba.accountName}>
                        {ba.accountName} (₹{ba.balance.toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                  {(() => {
                    const sel = bankAccounts.find(ba => ba.accountName === newExpAccount || ba.id === newExpAccount);
                    return sel ? (
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Available Balance: <strong className="text-slate-800 font-mono">₹{sel.balance.toLocaleString('en-IN')}</strong>
                      </span>
                    ) : null;
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={newExpMode}
                    onChange={(e: any) => setNewExpMode(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#635BFF] bg-white"
                  >
                    <option value="NEFT/RTGS">NEFT / RTGS</option>
                    <option value="UPI">UPI</option>
                    <option value="Petty Cash">Petty Cash</option>
                    <option value="Corporate Card">Corporate Card</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Voucher Date
                  </label>
                  <input
                    type="text"
                    value={newExpDate}
                    onChange={e => setNewExpDate(e.target.value)}
                    placeholder="14 Jul 26"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#635BFF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={newExpStatus}
                    onChange={(e: any) => setNewExpStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#635BFF] bg-white"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Approved">Approved</option>
                    <option value="Pending Approval">Pending Approval</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reference / UTR / Cheque #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC20260714088"
                    value={newExpRef}
                    onChange={e => setNewExpRef(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#635BFF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Invoice / Bill #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-8821"
                    value={newExpBillNo}
                    onChange={e => setNewExpBillNo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Receipt File Attachment */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Upload Invoice / Delivery Challan
                </label>
                <div className="border border-dashed border-slate-300 rounded-xl p-3 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#635BFF] flex items-center justify-center">
                      <Paperclip className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        {newExpFileName || 'Attach tax invoice or weight slip'}
                      </p>
                      <p className="text-[10px] text-slate-400">PDF, PNG, JPG up to 10MB</p>
                    </div>
                  </div>
                  <label className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 cursor-pointer shadow-2xs">
                    <span>{newExpFileName ? 'Change' : 'Browse'}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={e => {
                        if (e.target.files?.[0]) {
                          setNewExpFileName(e.target.files[0].name);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Remarks / Site Purpose
                </label>
                <textarea
                  rows={2}
                  placeholder="Details of delivery, batch quality check, or supervisor remarks..."
                  value={newExpNotes}
                  onChange={e => setNewExpNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#635BFF]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsRecordExpenseModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-[#635BFF] hover:bg-[#5046E5] text-white rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* MODAL M: EXPENSE DETAILS & VOUCHER PREVIEW */}
      {selectedExpenseDetails && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#635BFF] text-white flex flex-col items-center justify-center font-bold text-[10px]">
                  <span>{selectedExpenseDetails.date.split(' ').slice(0, 2).join(' ')}</span>
                  <Receipt className="w-3.5 h-3.5 text-white/90 mt-0.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedExpenseDetails.expenseCode}</h3>
                  <p className="text-xs text-slate-500">{selectedExpenseDetails.partyOrVendorName}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedExpenseDetails(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Financial Highlight */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[11px]">Expense Amount</span>
                  <span className="text-xl font-bold text-slate-900">
                    ₹ {selectedExpenseDetails.amount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] text-right">Status</span>
                  <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded ${
                    selectedExpenseDetails.status === 'Paid'
                      ? 'bg-[#EDE9FE] text-[#635BFF] border border-purple-200'
                      : selectedExpenseDetails.status === 'Approved'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : selectedExpenseDetails.status === 'Pending Approval'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-red-50 text-red-600 border border-red-200'
                  }`}>
                    {selectedExpenseDetails.status}
                  </span>
                </div>
              </div>

              {/* Attributes */}
              <div className="space-y-2.5">
                <div>
                  <span className="font-semibold text-slate-700 block">Expense Title:</span>
                  <p className="text-slate-900 font-medium text-xs mt-0.5">{selectedExpenseDetails.title}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                  <div>
                    <span className="font-semibold text-slate-700 block">Project:</span>
                    <p className="text-slate-600 truncate">{selectedExpenseDetails.projectName}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700 block">Category:</span>
                    <p className="text-slate-600">{selectedExpenseDetails.category}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                  <div>
                    <span className="font-semibold text-slate-700 block">Disbursed From:</span>
                    <p className="text-slate-600 truncate">{selectedExpenseDetails.paidFromAccount}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700 block">Mode & Ref:</span>
                    <p className="text-slate-600 truncate">{selectedExpenseDetails.paymentMode} • {selectedExpenseDetails.referenceNo || 'N/A'}</p>
                  </div>
                </div>
                {selectedExpenseDetails.billNumber && (
                  <div className="pt-1 border-t border-slate-100">
                    <span className="font-semibold text-slate-700 block">Invoice / Bill Reference:</span>
                    <p className="text-slate-600 font-mono">{selectedExpenseDetails.billNumber}</p>
                  </div>
                )}
                {selectedExpenseDetails.approvedBy && (
                  <div className="pt-1 border-t border-slate-100">
                    <span className="font-semibold text-slate-700 block">Verified / Approved By:</span>
                    <p className="text-emerald-700 font-medium">{selectedExpenseDetails.approvedBy}</p>
                  </div>
                )}
                {selectedExpenseDetails.notes && (
                  <div className="pt-1 border-t border-slate-100">
                    <span className="font-semibold text-slate-700 block">Site Remarks:</span>
                    <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-1">{selectedExpenseDetails.notes}</p>
                  </div>
                )}
              </div>

              {/* Status Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    if (onShowToast) onShowToast(`Expense voucher ${selectedExpenseDetails.expenseCode} downloaded`);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Voucher</span>
                </button>

                <div className="flex items-center gap-2">
                  {selectedExpenseDetails.status !== 'Paid' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateExpenseStatus(selectedExpenseDetails.id, 'Paid')}
                      className="px-4 py-1.5 bg-[#635BFF] hover:bg-[#5046E5] text-white font-semibold rounded-lg cursor-pointer transition-colors"
                    >
                      Mark as Paid
                    </button>
                  )}
                  {selectedExpenseDetails.status === 'Pending Approval' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateExpenseStatus(selectedExpenseDetails.id, 'Approved')}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg cursor-pointer transition-colors"
                    >
                      Approve
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: NEW ACCOUNT TO ACCOUNT TRANSFER
      ───────────────────────────────────────────────────────────── */}
      {isNewTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#635BFF]/10 text-[#635BFF] flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">New Account to Account Transfer</h3>
                  <p className="text-xs text-slate-500">Record an internal fund transfer or site petty cash imprest</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewTransferModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveTransfer} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              
              {/* Account Selection Flow (From ➔ To) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                  
                  {/* From Account */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      From Account (Source / Debit) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newTrfFromAccountId}
                      onChange={(e) => setNewTrfFromAccountId(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#635BFF] shadow-2xs"
                    >
                      {bankAccounts.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.accountName} (₹{b.balance.toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>
                    {(() => {
                      const src = bankAccounts.find(b => b.id === newTrfFromAccountId);
                      return src ? (
                        <p className="text-[10px] text-slate-500 mt-1">
                          Available Balance: <strong className="text-slate-800 font-mono">₹{src.balance.toLocaleString('en-IN')}</strong>
                        </p>
                      ) : null;
                    })()}
                  </div>

                  {/* To Account */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      To Account (Destination / Credit) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newTrfToAccountId}
                      onChange={(e) => setNewTrfToAccountId(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#635BFF] shadow-2xs"
                    >
                      {bankAccounts.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.accountName} (₹{b.balance.toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>
                    {(() => {
                      const dst = bankAccounts.find(b => b.id === newTrfToAccountId);
                      return dst ? (
                        <p className="text-[10px] text-slate-500 mt-1">
                          Current Balance: <strong className="text-slate-800 font-mono">₹{dst.balance.toLocaleString('en-IN')}</strong>
                        </p>
                      ) : null;
                    })()}
                  </div>
                </div>

                {newTrfFromAccountId === newTrfToAccountId && (
                  <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Source and destination cannot be the same account!</span>
                  </div>
                )}
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Transfer Amount (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={newTrfAmount}
                    onChange={(e) => setNewTrfAmount(e.target.value)}
                    placeholder="Enter amount, e.g. 50000"
                    required
                    className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:border-[#635BFF] focus:ring-1 focus:ring-[#635BFF]"
                  />
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-slate-400">Quick Add:</span>
                  {[10000, 25000, 50000, 100000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setNewTrfAmount(String(val))}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[10px] font-semibold cursor-pointer transition-colors"
                    >
                      +₹{val.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>

                {/* Balance validation alert */}
                {(() => {
                  const src = bankAccounts.find(b => b.id === newTrfFromAccountId);
                  const amt = parseFloat(newTrfAmount) || 0;
                  if (src && amt > src.balance) {
                    return (
                      <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Warning: Amount exceeds source account balance (₹{src.balance.toLocaleString('en-IN')})</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Real-Time Balance Simulation Preview */}
              {parseFloat(newTrfAmount) > 0 && newTrfFromAccountId !== newTrfToAccountId && (
                <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-1.5">
                  <div className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#635BFF]" />
                    <span>Projected Balances After Transfer</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {(() => {
                      const src = bankAccounts.find(b => b.id === newTrfFromAccountId);
                      const dst = bankAccounts.find(b => b.id === newTrfToAccountId);
                      const amt = parseFloat(newTrfAmount) || 0;
                      return (
                        <>
                          <div className="p-2 bg-white rounded border border-indigo-100">
                            <span className="text-slate-500 block truncate">{src?.accountName}</span>
                            <span className="font-bold text-red-600 font-mono">
                              ₹{((src?.balance || 0) - amt).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[9px] text-slate-400 block">(-₹{amt.toLocaleString('en-IN')})</span>
                          </div>
                          <div className="p-2 bg-white rounded border border-indigo-100">
                            <span className="text-slate-500 block truncate">{dst?.accountName}</span>
                            <span className="font-bold text-emerald-600 font-mono">
                              ₹{((dst?.balance || 0) + amt).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[9px] text-slate-400 block">(+₹{amt.toLocaleString('en-IN')})</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Row: Mode and Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Transfer Mode</label>
                  <select
                    value={newTrfMode}
                    onChange={(e) => setNewTrfMode(e.target.value as any)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#635BFF]"
                  >
                    <option value="Cash Withdrawal">Cash Withdrawal (Site Imprest)</option>
                    <option value="IMPS / Bank Transfer">IMPS / Bank Transfer</option>
                    <option value="NEFT / RTGS">NEFT / RTGS</option>
                    <option value="Cash Deposit">Cash Deposit</option>
                    <option value="Internal Ledger Contra">Internal Ledger Contra</option>
                    <option value="Cheque">Cheque Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Transfer Date</label>
                  <input
                    type="text"
                    value={newTrfDate}
                    onChange={(e) => setNewTrfDate(e.target.value)}
                    placeholder="e.g. 24 Sep 2026"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#635BFF]"
                  />
                </div>
              </div>

              {/* Row: Reference & Project */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Reference / UTR / Cheque #</label>
                  <input
                    type="text"
                    value={newTrfRef}
                    onChange={(e) => setNewTrfRef(e.target.value)}
                    placeholder="e.g. UTR-998821 or CHQ-7782"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#635BFF]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Related Project (Optional)</label>
                  <select
                    value={newTrfProject}
                    onChange={(e) => setNewTrfProject(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#635BFF]"
                  >
                    <option value="">General Company Accounts</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Purpose / Narration */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Purpose / Narration <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTrfPurpose}
                  onChange={(e) => setNewTrfPurpose(e.target.value)}
                  placeholder="e.g. Replenish site petty cash vault for masonry wages & fuel"
                  required
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#635BFF]"
                />
              </div>

              {/* Initiated By & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Initiated By</label>
                  <input
                    type="text"
                    value={newTrfInitiatedBy}
                    onChange={(e) => setNewTrfInitiatedBy(e.target.value)}
                    placeholder="e.g. Finance Incharge"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#635BFF]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Internal Notes (Optional)</label>
                  <input
                    type="text"
                    value={newTrfNotes}
                    onChange={(e) => setNewTrfNotes(e.target.value)}
                    placeholder="e.g. Approved by Managing Director"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#635BFF]"
                  />
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewTransferModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newTrfFromAccountId === newTrfToAccountId}
                  className={`px-5 py-2 rounded-lg text-white text-xs font-bold transition-all shadow-xs ${
                    newTrfFromAccountId === newTrfToAccountId
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-[#635BFF] hover:bg-[#5046E5] cursor-pointer'
                  }`}
                >
                  Post Contra Transfer
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: CONTRA TRANSFER VOUCHER SLIP
      ───────────────────────────────────────────────────────────── */}
      {selectedTransferDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Slip Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-[#f8fafc] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#635BFF] uppercase tracking-wider block">Booshnam Associates</span>
                <h3 className="text-base font-bold text-slate-900">Contra Voucher Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransferDetails(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Slip Body */}
            <div className="p-6 space-y-4 text-xs">
              
              {/* Voucher Code & Status Banner */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Voucher Number</span>
                  <div className="text-base font-mono font-black text-slate-900">{selectedTransferDetails.transferCode}</div>
                  <span className="text-[11px] text-slate-500">{selectedTransferDetails.date}</span>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {selectedTransferDetails.status}
                </span>
              </div>

              {/* Amount & Route Graphic */}
              <div className="p-4 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/40 via-purple-50/30 to-indigo-50/40 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Transferred</span>
                <div className="text-2xl font-black text-slate-900 font-mono my-1">
                  ₹{selectedTransferDetails.amount.toLocaleString('en-IN')}
                </div>
                
                <div className="flex items-center justify-center gap-3 mt-3">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">From (Credit)</span>
                    <span className="font-bold text-slate-800 text-xs">{selectedTransferDetails.fromAccountName}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white shadow-xs text-[#635BFF] flex items-center justify-center font-bold">
                    ➔
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] text-slate-400 block">To (Debit)</span>
                    <span className="font-bold text-slate-800 text-xs">{selectedTransferDetails.toAccountName}</span>
                  </div>
                </div>
              </div>

              {/* Breakdown Details Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Transfer Mode</span>
                  <span className="font-semibold text-slate-800">{selectedTransferDetails.transferMode}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Reference / UTR</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedTransferDetails.referenceNo}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Initiated By</span>
                  <span className="font-semibold text-slate-800">{selectedTransferDetails.initiatedBy}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Related Project</span>
                  <span className="font-semibold text-slate-800">{selectedTransferDetails.projectName || 'General Accounts'}</span>
                </div>
              </div>

              {/* Purpose / Narration */}
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Purpose / Narration</span>
                <p className="text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-medium">
                  {selectedTransferDetails.purpose}
                </p>
              </div>

              {selectedTransferDetails.notes && (
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Internal Notes</span>
                  <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {selectedTransferDetails.notes}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    if (onShowToast) onShowToast(`Contra voucher slip ${selectedTransferDetails.transferCode} downloaded`);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Voucher</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTransferDetails(null)}
                  className="px-4 py-1.5 bg-[#635BFF] hover:bg-[#5046E5] text-white font-semibold rounded-lg cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

