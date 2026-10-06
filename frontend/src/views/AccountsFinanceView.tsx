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
  Tag, HardHat, Truck, Fuel, Paperclip, Upload, ArrowLeftRight,
  Copy, Trash2, MoreVertical, Pencil,
  Maximize2, Minimize2
} from 'lucide-react';
import { Project } from '../types';
import { CustomSelect } from '../components/CustomSelect';
import { toggleBrowserFullscreen, addFullscreenChangeListener } from '../lib/fullscreenService';
import { AddPartyDrawer, PartyFormData } from '../components/finance/AddPartyDrawer';
import { AddAccountDrawer, AccountFormData } from '../components/finance/AddAccountDrawer';
import { CreateTransactionModalFlow } from '../components/finance/CreateTransactionModalFlow';
import { CreatePaymentRequestDrawerFlow, PaymentRequestSubmitData } from '../components/finance/CreatePaymentRequestDrawerFlow';
import { PaymentRequestOverviewDrawer } from '../components/finance/PaymentRequestOverviewDrawer';
import { ensurePartyExists, getFinanceParties, saveFinanceParties } from '../lib/financeSyncService';
import { exportInvoiceToPDF } from '../lib/invoiceExportService';

export interface PaymentRequestItem {
  id: string;
  requestCode: string;
  date: string; // e.g. "13 Jul 26"
  partyName: string;
  projectName: string;
  subProjectText: string;
  amount: number;
  status: 'Paid' | 'Approved' | 'Pending' | 'Rejected' | 'Unpaid' | 'On Hold';
  category: string;
  paymentMode?: string;
  referenceNo?: string;
  paidDate?: string;
  dueDate?: string;
  notes?: string;
  invoiceFile?: string;
  entryBy?: string;
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
  gstin?: string;
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
  transactionType?: string;
  costCode?: string;
  notes?: string;
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
  accountHolderName?: string;
  bankAddress?: string;
  ibanNumber?: string;
  upiNumber?: string;
  overdraftLimit?: number;
  isPrimary?: boolean;
  openingBalance?: number;
}

export interface AccountStatementTransaction {
  id: string;
  accountId: string; // 'cash' or bank account id
  date: string; // e.g. '26 Sep 26'
  rawDate: string; // '2026-09-26'
  partyName: string;
  voucherCode: string; // e.g. '#CB-265'
  paymentType: 'Payment In' | 'Payment Out';
  type: 'Credit' | 'Debit';
  amount: number;
  paymentMode: string;
  projectName: string;
  sourceAccountName: string;
  details?: string;
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

export const INITIAL_STATEMENT_TRANSACTIONS: AccountStatementTransaction[] = [];

export const INITIAL_PARTIES: PartyRecord[] = [];
export const INITIAL_PARTY_TRANSACTIONS: Record<string, PartyLedgerTransaction[]> = {};
export const INITIAL_BANK_ACCOUNTS: BankAccountRecord[] = [];
export const INITIAL_TRANSFERS: AccountTransferRecord[] = [];
export const INITIAL_EXPENSES: ExpenseItem[] = [];

// Helper to robustly extract day, month, year, and timestamp from various date string formats
export const parseDateParts = (str?: string) => {
  if (!str) {
    const now = new Date();
    return {
      day: String(now.getDate()).padStart(2, '0'),
      month: now.toLocaleString('en-GB', { month: 'short' }),
      year: String(now.getFullYear()),
      timestamp: now.getTime()
    };
  }
  // Try ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return {
        day: String(d.getDate()).padStart(2, '0'),
        month: d.toLocaleString('en-GB', { month: 'short' }),
        year: String(d.getFullYear()),
        timestamp: d.getTime()
      };
    }
  }
  // Try "DD Mon YYYY" or "DD Mon YY"
  const parts = str.trim().split(/[\s-]+/);
  if (parts.length >= 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1];
    let year = parts[2];
    if (year.length === 2) year = `20${year}`;
    const d = new Date(`${day} ${month} ${year}`);
    const ts = isNaN(d.getTime()) ? Date.now() : d.getTime();
    return { day, month, year, timestamp: ts };
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return {
      day: String(d.getDate()).padStart(2, '0'),
      month: d.toLocaleString('en-GB', { month: 'short' }),
      year: String(d.getFullYear()),
      timestamp: d.getTime()
    };
  }
  const now = new Date();
  return {
    day: String(now.getDate()).padStart(2, '0'),
    month: now.toLocaleString('en-GB', { month: 'short' }),
    year: String(now.getFullYear()),
    timestamp: now.getTime()
  };
};

export interface UnifiedPartyActivityItem {
  id: string;
  source: 'TRANSACTION' | 'PAYMENT_REQUEST' | 'EXPENSE' | 'LEDGER';
  sourceLabel: string;
  date: string;
  day: string;
  month: string;
  year: string;
  timestamp: number;
  title: string;
  code: string;
  projectName?: string;
  category?: string;
  mode?: string;
  referenceNo?: string;
  notes?: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'PAYMENT_IN' | 'PAYMENT_OUT' | 'SALES_INVOICE';
  status?: string;
  badgeText: string;
  badgeClass: string;
}

interface AccountsFinanceViewProps {
  projects?: Project[];
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onShowToast?: (msg: string) => void;
  initialTab?: 'party' | 'transaction' | 'payment_requests' | 'expenses' | 'account_transfer' | 'accounts';
}

export const AccountsFinanceView: React.FC<AccountsFinanceViewProps> = ({
  projects = [],
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
          const clean = parsed.filter(p => p.id && !/^pty-([0-9]{1,3})$/.test(p.id));
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
        if (Array.isArray(parsed)) {
          const clean = parsed.filter(pr => pr.id && !/^pr-([0-9]{1,3})$/.test(pr.id));
          if (clean.length !== parsed.length) {
            localStorage.setItem('booshnam_finance_payment_requests', JSON.stringify(clean));
          }
          return clean;
        }
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
        if (Array.isArray(parsed)) {
          const clean = parsed.filter(tx => tx.id && !/^tx-([0-9]{1,3})$/.test(tx.id));
          if (clean.length !== parsed.length) {
            localStorage.setItem('booshnam_finance_transactions', JSON.stringify(clean));
          }
          return clean;
        }
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('booshnam_finance_transactions', JSON.stringify(transactions));
    } catch {}
  }, [transactions]);

  // Default initial accounts if none saved (matching Company Cash & Bank Accounts)
  const DEFAULT_BANK_ACCOUNTS: BankAccountRecord[] = [
    {
      id: 'ba-axis',
      accountName: 'Axis Bank Current A/c',
      accountHolderName: 'Booshnam Associates Pvt Ltd.',
      bankName: 'Axis Bank',
      bankAddress: 'NO. 66, PAMMAL MAIN ROADPALLAVARAM, CHENNAI DIST. KANCHEEPURAM, TAMIL NADU PIN 600043',
      accountNumber: '922020058090700',
      ifscCode: 'UTIB0000851',
      accountType: 'Current',
      balance: 0,
      openingBalance: 0,
      status: 'Active',
      tallyLedgerName: 'Axis Bank Current Ledger',
      ibanNumber: '',
      upiNumber: '',
      overdraftLimit: 0,
      isPrimary: true
    },
    {
      id: 'ba-idbi',
      accountName: 'IDBI Bank A/c',
      accountHolderName: 'BOOSHNAM ASSOCIATES PVT LTD',
      bankName: 'IDBI',
      bankAddress: '13, YAK COMPLEX, PAMMAL MAIN ROAD, NEAR HP PETROL BUNK PALLAVARAM, CHENNAI 600 075',
      accountNumber: '0779102000015905',
      ifscCode: 'IBKL0000779',
      accountType: 'Current',
      balance: 0,
      openingBalance: 0,
      status: 'Active',
      tallyLedgerName: 'IDBI Current Ledger',
      ibanNumber: '',
      upiNumber: '',
      overdraftLimit: 0,
      isPrimary: false
    }
  ];

  // Bank Accounts State with LocalStorage Persistence
  const [bankAccounts, setBankAccounts] = useState<BankAccountRecord[]>(() => {
    try {
      const savedV4 = localStorage.getItem('booshnam_finance_bank_accounts_v4');
      if (savedV4) {
        const parsed = JSON.parse(savedV4);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed
            .filter((b: BankAccountRecord) => !['ba-hdfc', 'ba-sbi', 'ba-default-1', 'ba-default-2'].includes(b.id))
            .map((b: BankAccountRecord) => ({
              ...b,
              balance: (b.balance === 4850000 || b.balance === 12450000 || b.balance === 17583911.51) ? 0 : (b.balance || 0),
              openingBalance: (b.openingBalance === 4850000 || b.openingBalance === 12450000) ? 0 : (b.openingBalance || 0),
            }));
          if (filtered.length > 0) {
            return filtered;
          }
        }
      }
      // Migrate from v3 or prior
      const savedV3 = localStorage.getItem('booshnam_finance_bank_accounts_v3');
      if (savedV3) {
        const parsedV3 = JSON.parse(savedV3);
        if (Array.isArray(parsedV3)) {
          const customAccs = parsedV3.filter(b => !['ba-default-1', 'ba-default-2', 'ba-idbi', 'ba-axis', 'ba-hdfc', 'ba-sbi'].includes(b.id));
          return [...DEFAULT_BANK_ACCOUNTS, ...customAccs];
        }
      }
    } catch {}
    return DEFAULT_BANK_ACCOUNTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('booshnam_finance_bank_accounts_v4', JSON.stringify(bankAccounts));
    } catch {}
  }, [bankAccounts]);


// Date Filter Preset Definitions (Matching Reference Image)
type DateFilterPresetKey = 
  | 'all'
  | 'today'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'current_fy'
  | 'fy_25_26'
  | 'fy_24_25'
  | 'custom';

const getDynamicDatePresets = (): { id: DateFilterPresetKey; label: string; start: string; end: string }[] => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const todayStr = toYmd(now);

  const dayOfWeek = now.getDay();
  const monOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const thisWeekMon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + monOffset);
  const thisWeekSun = new Date(thisWeekMon.getFullYear(), thisWeekMon.getMonth(), thisWeekMon.getDate() + 6);

  const lastWeekMon = new Date(thisWeekMon.getFullYear(), thisWeekMon.getMonth(), thisWeekMon.getDate() - 7);
  const lastWeekSun = new Date(lastWeekMon.getFullYear(), lastWeekMon.getMonth(), lastWeekMon.getDate() + 6);

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const thisYearStart = new Date(now.getFullYear(), 0, 1);
  const thisYearEnd = new Date(now.getFullYear(), 11, 31);

  return [
    { id: 'today', label: 'Today', start: todayStr, end: todayStr },
    { id: 'this_week', label: 'This Week', start: toYmd(thisWeekMon), end: toYmd(thisWeekSun) },
    { id: 'last_week', label: 'Last Week', start: toYmd(lastWeekMon), end: toYmd(lastWeekSun) },
    { id: 'this_month', label: 'This Month', start: toYmd(thisMonthStart), end: toYmd(thisMonthEnd) },
    { id: 'last_month', label: 'Last Month', start: toYmd(lastMonthStart), end: toYmd(lastMonthEnd) },
    { id: 'this_year', label: 'This Year', start: toYmd(thisYearStart), end: toYmd(thisYearEnd) },
    { id: 'all', label: 'All', start: '', end: '' },
  ];
};

const DATE_FILTER_PRESET_OPTIONS: { id: DateFilterPresetKey; label: string; start: string; end: string }[] = getDynamicDatePresets();

const toDisplayDate = (isoStr: string) => {
  if (!isoStr) return '';
  const parts = isoStr.trim().split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return isoStr;
};

const toIsoDate = (displayStr: string) => {
  if (!displayStr) return '';
  const parts = displayStr.trim().split(/[-/.]/);
  if (parts.length === 3) {
    if (parts[0].length === 2 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
  }
  return displayStr;
};

  // Tab 5: Accounts Statement & View States
  const [statementActiveAccountId, setStatementActiveAccountId] = useState<string | null>(null);
  const [isAccountSelectorOpen, setIsAccountSelectorOpen] = useState(false);
  const [statementDateFilter, setStatementDateFilter] = useState<DateFilterPresetKey>('all');
  const [isDateFilterModalOpen, setIsDateFilterModalOpen] = useState(false);
  const [tempDatePreset, setTempDatePreset] = useState<DateFilterPresetKey>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');
  const [inputStartDisplay, setInputStartDisplay] = useState('');
  const [inputEndDisplay, setInputEndDisplay] = useState('');
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);

  // Close 3-dot preview dropdown when clicking anywhere outside
  useEffect(() => {
    if (!openCardMenuId) return;
    const handleOutsideClick = () => {
      setOpenCardMenuId(null);
    };
    const timer = setTimeout(() => {
      window.addEventListener('click', handleOutsideClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleOutsideClick);
    };
  }, [openCardMenuId]);

  const handleOpenDateFilterModal = () => {
    setTempDatePreset(statementDateFilter);
    setTempStartDate(customStartDate);
    setTempEndDate(customEndDate);
    setInputStartDisplay(toDisplayDate(customStartDate));
    setInputEndDisplay(toDisplayDate(customEndDate));
    setIsDateFilterModalOpen(true);
  };

  const handleApplyDateFilter = () => {
    setStatementDateFilter(tempDatePreset);
    setCustomStartDate(tempStartDate);
    setCustomEndDate(tempEndDate);
    setIsDateFilterModalOpen(false);

    if (onShowToast) {
      const opt = DATE_FILTER_PRESET_OPTIONS.find(p => p.id === tempDatePreset);
      const label = opt ? opt.label : `${inputStartDisplay || 'Start'} to ${inputEndDisplay || 'End'}`;
      onShowToast(`Date filter applied: ${label}`);
    }
  };

  // Cash Account Opening Balance State with LocalStorage Persistence
  const [cashOpeningBalance, setCashOpeningBalance] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('booshnam_cash_opening_balance');
      if (saved !== null) {
        const val = parseFloat(saved);
        if (!isNaN(val)) return val;
      }
    } catch {}
    return 0;
  });

  useEffect(() => {
    try {
      localStorage.setItem('booshnam_cash_opening_balance', cashOpeningBalance.toString());
    } catch {}
  }, [cashOpeningBalance]);

  // Statement Transactions with LocalStorage Persistence
  const [statementTransactions, setStatementTransactions] = useState<AccountStatementTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('booshnam_statement_transactions_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const clean = parsed.filter(t => t.id && !t.id.startsWith('st-c-') && !t.id.startsWith('st-ax-') && !/^st-[0-9]{1,3}$/.test(t.id));
          if (clean.length !== parsed.length) {
            localStorage.setItem('booshnam_statement_transactions_v1', JSON.stringify(clean));
          }
          return clean;
        }
      }
    } catch {}
    return INITIAL_STATEMENT_TRANSACTIONS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('booshnam_statement_transactions_v1', JSON.stringify(statementTransactions));
    } catch {}
  }, [statementTransactions]);

  // Cash Account Net Cash Flow and Closing Balance dynamically computed from statement transactions
  const cashTransactions = useMemo(() => {
    return statementTransactions.filter(t => t.accountId === 'cash');
  }, [statementTransactions]);

  const cashTotalCredit = useMemo(() => {
    return cashTransactions
      .filter(t => t.type === 'Credit' || t.paymentType === 'Payment In')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [cashTransactions]);

  const cashTotalDebit = useMemo(() => {
    return cashTransactions
      .filter(t => t.type === 'Debit' || t.paymentType === 'Payment Out')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [cashTransactions]);

  const cashNetFlow = cashTotalCredit - cashTotalDebit;
  const cashClosingBalance = cashOpeningBalance + cashNetFlow;

  // Edit Opening Balance Modal State
  const [openingBalanceModal, setOpeningBalanceModal] = useState<{
    isOpen: boolean;
    accountId: string;
    accountName: string;
    currentAmount: number;
  } | null>(null);
  const [openingBalanceInput, setOpeningBalanceInput] = useState('0');

  const handleSaveOpeningBalance = () => {
    if (!openingBalanceModal) return;
    const parsed = parseFloat(openingBalanceInput);
    const newAmount = isNaN(parsed) ? 0 : parsed;

    if (openingBalanceModal.accountId === 'cash') {
      setCashOpeningBalance(newAmount);
      if (onShowToast) {
        onShowToast(`Cash Account Opening Balance updated to ₹${newAmount.toLocaleString('en-IN')}`);
      }
    } else {
      setBankAccounts(prev => prev.map(ba => {
        if (ba.id === openingBalanceModal.accountId) {
          const oldOp = ba.openingBalance || 0;
          const diff = newAmount - oldOp;
          return {
            ...ba,
            openingBalance: newAmount,
            balance: (ba.balance || 0) + diff,
          };
        }
        return ba;
      }));
      if (onShowToast) {
        onShowToast(`${openingBalanceModal.accountName} Opening Balance updated to ₹${newAmount.toLocaleString('en-IN')}`);
      }
    }

    setOpeningBalanceModal(null);
  };

  // Computed Active Account for Statement View
  const activeStatementAccount = useMemo(() => {
    if (!statementActiveAccountId) return null;
    if (statementActiveAccountId === 'cash') {
      return {
        id: 'cash',
        name: 'Cash Account',
        accountHolderName: 'Booshnam Associates Pvt Ltd',
        type: 'Cash Account',
        isCash: true,
        accountNumber: 'N/A',
        openingBalance: cashOpeningBalance,
        totalCredit: cashTotalCredit,
        totalDebit: cashTotalDebit,
        closingBalance: cashClosingBalance,
      };
    }
    const found = bankAccounts.find(b => b.id === statementActiveAccountId);
    if (!found) {
      return {
        id: statementActiveAccountId,
        name: 'Account Statement',
        accountHolderName: 'Booshnam Associates',
        type: 'Bank Account',
        isCash: false,
        accountNumber: '',
        openingBalance: 0,
        totalCredit: 0,
        totalDebit: 0,
        closingBalance: 0,
      };
    }

    const accTxns = statementTransactions.filter(t => t.accountId === found.id);
    const cr = accTxns.filter(t => t.type === 'Credit').reduce((s, t) => s + t.amount, 0);
    const dr = accTxns.filter(t => t.type === 'Debit').reduce((s, t) => s + t.amount, 0);
    const op = found.balance || 0;
    const cl = op + cr - dr;

    return {
      id: found.id,
      name: found.bankName,
      accountHolderName: found.accountHolderName || found.accountName,
      type: found.accountType,
      isCash: false,
      accountNumber: found.accountNumber,
      openingBalance: op,
      totalCredit: cr,
      totalDebit: dr,
      closingBalance: cl,
    };
  }, [statementActiveAccountId, bankAccounts, statementTransactions]);

  // Filtered Statement Transactions for Statement View
  const filteredStatementTransactions = useMemo(() => {
    if (!statementActiveAccountId) return [];
    return statementTransactions.filter(t => {
      if (t.accountId !== statementActiveAccountId) return false;
      if (statementDateFilter === 'all') return true;
      const opt = DATE_FILTER_PRESET_OPTIONS.find(p => p.id === statementDateFilter);
      if (opt && opt.start && opt.end) {
        return t.rawDate >= opt.start && t.rawDate <= opt.end;
      }
      if (statementDateFilter === 'current_fy') {
        const fyYear = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
        return t.rawDate >= `${fyYear}-04-01` && t.rawDate <= `${fyYear + 1}-03-31`;
      }
      if (statementDateFilter === 'custom') {
        if (customStartDate && t.rawDate < customStartDate) return false;
        if (customEndDate && t.rawDate > customEndDate) return false;
        return true;
      }
      return true;
    });
  }, [statementActiveAccountId, statementTransactions, statementDateFilter, customStartDate, customEndDate]);

  const statementPeriodCredit = useMemo(() => {
    return filteredStatementTransactions.filter(t => t.type === 'Credit').reduce((s, t) => s + t.amount, 0);
  }, [filteredStatementTransactions]);

  const statementPeriodDebit = useMemo(() => {
    return filteredStatementTransactions.filter(t => t.type === 'Debit').reduce((s, t) => s + t.amount, 0);
  }, [filteredStatementTransactions]);

  const statementPeriodClosing = useMemo(() => {
    const op = activeStatementAccount?.openingBalance || 0;
    return op + statementPeriodCredit - statementPeriodDebit;
  }, [activeStatementAccount?.openingBalance, statementPeriodCredit, statementPeriodDebit]);

  // Tab 5: Accounts Search and Filter State
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState<'All' | 'Current' | 'Savings' | 'Escrow' | 'Petty Cash'>('All');

  const filteredBankAccounts = useMemo(() => {
    return bankAccounts.filter(ba => {
      const q = accountSearchQuery.toLowerCase().trim();
      const matchesQuery = !q || 
        ba.accountName.toLowerCase().includes(q) ||
        (ba.accountHolderName && ba.accountHolderName.toLowerCase().includes(q)) ||
        ba.bankName.toLowerCase().includes(q) ||
        (ba.bankAddress && ba.bankAddress.toLowerCase().includes(q)) ||
        ba.accountNumber.includes(q) ||
        ba.ifscCode.toLowerCase().includes(q) ||
        (ba.upiNumber && ba.upiNumber.toLowerCase().includes(q)) ||
        (ba.ibanNumber && ba.ibanNumber.toLowerCase().includes(q));

      const matchesType = accountTypeFilter === 'All' || ba.accountType === accountTypeFilter;
      return matchesQuery && matchesType;
    });
  }, [bankAccounts, accountSearchQuery, accountTypeFilter]);

  const handleCopyAccountData = (text: string, label: string) => {
    if (!text || text === '—') return;
    navigator.clipboard.writeText(text);
    if (onShowToast) {
      onShowToast(`Copied ${label}: ${text}`);
    }
  };

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Approved' | 'Pending' | 'Rejected' | 'Unpaid' | 'On Hold'>('All');
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

  // New Create Transaction Flow (Image 1 Menu -> Image 2 Select Project -> Image 3 Slide-bar Drawer)
  const [isCreateTxnFlowOpen, setIsCreateTxnFlowOpen] = useState(false);
  const [createTxnFlowStep, setCreateTxnFlowStep] = useState<'menu' | 'select_project' | 'drawer'>('menu');

  // Transaction Tab Filters
  const [txnSearchQuery, setTxnSearchQuery] = useState('');
  const [txnTypeFilter, setTxnTypeFilter] = useState('All');
  const [txnProjectFilter, setTxnProjectFilter] = useState('All');
  const [txnModeFilter, setTxnModeFilter] = useState('All');

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
  const [partyOverviewFilter, setPartyOverviewFilter] = useState<'All' | 'TRANSACTION' | 'PAYMENT_REQUEST' | 'EXPENSE' | 'LEDGER'>('All');
  const [partyOverviewSearch, setPartyOverviewSearch] = useState('');
  const [isCustomPartyInput, setIsCustomPartyInput] = useState(false);
  const [isCustomPRPartyInput, setIsCustomPRPartyInput] = useState(false);
  const [isCustomExpPartyInput, setIsCustomExpPartyInput] = useState(false);

  // Transactions Ledger per Party
  const [partyTransactions, setPartyTransactions] = useState<Record<string, PartyLedgerTransaction[]>>(() => {
    try {
      const saved = localStorage.getItem('booshnam_party_transactions_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          Object.keys(parsed).forEach(k => {
            if (/^pty-[0-9]{1,3}$/.test(k)) delete parsed[k];
          });
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
          Object.keys(parsed).forEach(k => {
            if (/^pty-[0-9]{1,3}$/.test(k)) delete parsed[k];
          });
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
  const [newProjectName, setNewProjectName] = useState(projects[0]?.name || '');
  const [newSubProjectText, setNewSubProjectText] = useState('Against Other');
  const [newCategory, setNewCategory] = useState('Against Other');
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState(() => {
    return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  });
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
  const [newTxnProject, setNewTxnProject] = useState(projects[0]?.name || '');
  const [newTxnCategory, setNewTxnCategory] = useState('Material Purchase');
  const [newTxnAmount, setNewTxnAmount] = useState('');
  const [newTxnMode, setNewTxnMode] = useState<'NEFT/RTGS' | 'UPI' | 'CHEQUE' | 'CASH'>('NEFT/RTGS');
  const [newTxnRef, setNewTxnRef] = useState('');

  // Filtered Payment Requests
  const filteredPaymentRequests = useMemo(() => {
    return paymentRequests.filter(req => {
      if (statusFilter !== 'All') {
        if (statusFilter === 'Unpaid') {
          if (req.status !== 'Unpaid' && req.status !== 'Pending') return false;
        } else if (statusFilter === 'Paid') {
          if (req.status !== 'Paid') return false;
        } else if (statusFilter === 'On Hold') {
          if (req.status !== 'On Hold') return false;
        } else if (req.status !== statusFilter) {
          return false;
        }
      }
      if (selectedProjectFilter !== 'All' && !req.projectName.toLowerCase().includes(selectedProjectFilter.toLowerCase())) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesParty = req.partyName.toLowerCase().includes(q);
        const matchesProj = req.projectName.toLowerCase().includes(q);
        const matchesCode = req.requestCode.toLowerCase().includes(q);
        const matchesCategory = (req.category || '').toLowerCase().includes(q);
        if (!matchesParty && !matchesProj && !matchesCode && !matchesCategory) return false;
      }
      return true;
    });
  }, [paymentRequests, statusFilter, selectedProjectFilter, searchQuery]);

  // Financial summary metrics
  const totalPaidAmount = paymentRequests.filter(r => r.status === 'Paid').reduce((sum, r) => sum + r.amount, 0);
  const totalPendingAmount = paymentRequests.filter(r => r.status === 'Pending' || r.status === 'Unpaid' || r.status === 'Approved').reduce((sum, r) => sum + r.amount, 0);

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
      date: newDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
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

  // Submit Handler for 2-step Payment Request Drawer flow (Images 1 & 2)
  const handleSavePaymentRequestFromFlow = (reqData: PaymentRequestSubmitData) => {
    let formattedDate = reqData.date;
    try {
      const d = new Date(reqData.date);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    } catch {}

    let formattedDueDate: string | undefined = undefined;
    if (reqData.dueDate) {
      try {
        const dd = new Date(reqData.dueDate);
        if (!isNaN(dd.getTime())) {
          formattedDueDate = dd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        } else {
          formattedDueDate = reqData.dueDate;
        }
      } catch {
        formattedDueDate = reqData.dueDate;
      }
    }

    const newReq: PaymentRequestItem = {
      id: `pr-${Date.now()}`,
      requestCode: reqData.requestCode,
      date: formattedDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      partyName: reqData.partyName,
      projectName: reqData.projectName,
      subProjectText: reqData.category,
      amount: reqData.amount,
      status: 'Unpaid',
      category: reqData.category,
      dueDate: formattedDueDate,
      notes: reqData.notes,
      paidDate: undefined,
      entryBy: 'Managing Director - 3 - Nivedhitha Arumugam'
    };

    setPaymentRequests(prev => {
      const updated = [newReq, ...prev];
      try {
        localStorage.setItem('booshnam_finance_payment_requests', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setIsNewRequestModalOpen(false);

    if (onShowToast) {
      onShowToast(`Created Payment Request ${reqData.requestCode} for ₹${reqData.amount.toLocaleString('en-IN')}`);
    }
  };

  // Status Change Handler for Payment Request (Interactive Status in Image 4)
  const handleUpdatePaymentRequestStatus = (id: string, newStatus: 'Unpaid' | 'Paid' | 'On Hold') => {
    setPaymentRequests(prev => {
      const updated = prev.map(r => {
        if (r.id === id) {
          return {
            ...r,
            status: newStatus,
            paidDate: newStatus === 'Paid' ? (r.paidDate || new Date().toISOString().split('T')[0]) : undefined
          };
        }
        return r;
      });
      try {
        localStorage.setItem('booshnam_finance_payment_requests', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setSelectedRequestDetails(prev => prev && prev.id === id ? {
      ...prev,
      status: newStatus,
      paidDate: newStatus === 'Paid' ? (prev.paidDate || new Date().toISOString().split('T')[0]) : undefined
    } : prev);

    if (onShowToast) {
      onShowToast(`Payment request status changed to ${newStatus}`);
    }
  };

  // Record Payment from Overview Drawer
  const handleRecordPaymentFromDrawer = (req: PaymentRequestItem) => {
    handleUpdatePaymentRequestStatus(req.id, 'Paid');
    if (onShowToast) {
      onShowToast(`Payment recorded for ${req.requestCode} (₹${req.amount.toLocaleString('en-IN')})`);
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

  // Delete Party Handler
  const handleDeleteParty = (partyId: string, partyName: string) => {
    if (confirm(`Are you sure you want to delete party "${partyName}"? This will permanently remove the party from the directory.`)) {
      setParties(prev => {
        const updated = prev.filter(p => p.id !== partyId);
        try {
          localStorage.setItem('booshnam_finance_parties', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (activePartyOverview && activePartyOverview.id === partyId) {
        setActivePartyOverview(null);
      }

      if (onShowToast) {
        onShowToast(`Party "${partyName}" deleted successfully`);
      }
    }
  };

  // Submit New Transaction
  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newTxnAmount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const partyName = newTxnParty.trim() || 'Cash Settlement';
    const txnCode = `TXN-2026-${String(transactions.length + 1).padStart(3, '0')}`;
    const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const newTx: FinanceTransaction = {
      id: `tx-${Date.now()}`,
      txnCode,
      date: todayStr,
      type: newTxnType,
      partyName,
      projectName: newTxnProject || (projects[0]?.name || 'General Project'),
      category: newTxnCategory || (newTxnType === 'INCOME' ? 'Client Payment' : 'Vendor Payment'),
      amount: amt,
      mode: newTxnMode,
      referenceNo: newTxnRef || `REF-${Date.now().toString().slice(-6)}`,
      status: 'Completed'
    };

    setTransactions(prev => [newTx, ...prev]);

    // Also sync to matching party if found in parties list
    const matchedParty = parties.find(p => p.name.trim().toLowerCase() === partyName.toLowerCase());
    if (matchedParty) {
      const isIncome = newTxnType === 'INCOME';
      const dParts = parseDateParts(todayStr);

      const partyLedgerEntry: PartyLedgerTransaction = {
        id: `ptx-${Date.now()}`,
        partyId: matchedParty.id,
        partyName: matchedParty.name,
        date: todayStr,
        day: dParts.day,
        month: dParts.month,
        year: dParts.year,
        title: `${newTx.category} (${newTx.mode})`,
        projectName: newTx.projectName,
        category: newTx.category,
        notes: `Cashbook Txn: ${txnCode} • Ref: ${newTx.referenceNo}`,
        amount: amt,
        type: isIncome ? 'PAYMENT_IN' : 'PAYMENT_OUT'
      };

      setPartyTransactions(prev => ({
        ...prev,
        [matchedParty.id]: [partyLedgerEntry, ...(prev[matchedParty.id] || [])]
      }));

      // Update party state balance & totalPaid
      setParties(prev => prev.map(p => {
        if (p.id === matchedParty.id) {
          const newPaid = (p.totalPaid || 0) + amt;
          let newBal = p.balanceDue;
          if (p.type === 'Client') {
            newBal = Math.max(0, (p.totalBilled || p.balanceDue || 0) - (isIncome ? amt : 0));
          } else {
            newBal = Math.max(0, p.balanceDue - (!isIncome ? amt : 0));
          }
          return {
            ...p,
            totalPaid: newPaid,
            balanceDue: newBal,
            status: newBal === 0 ? 'Settled' : p.status
          };
        }
        return p;
      }));
    }

    setIsRecordTxnModalOpen(false);
    setNewTxnParty('');
    setNewTxnAmount('');
    setNewTxnRef('');

    if (onShowToast) {
      onShowToast(`Recorded ₹${amt.toLocaleString('en-IN')} ${newTxnType === 'INCOME' ? 'Inflow' : 'Outflow'} for ${partyName}`);
    }
  };

  // Submit Handler for New 3-Step Create Transaction Flow (Images 1, 2, 3)
  const handleSaveTransactionFromFlow = (txData: {
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
  }) => {
    const isIncome = [
      'Payment In', 'Debit Note', 'Sales Invoice', 
      'Material Sales', 'Material Return', 'Upload Payments'
    ].includes(txData.transactionType);
    const type: 'INCOME' | 'EXPENSE' = isIncome ? 'INCOME' : 'EXPENSE';

    const dObj = new Date(txData.date);
    const day = String(dObj.getDate()).padStart(2, '0');
    const month = dObj.toLocaleDateString('en-GB', { month: 'short' });
    const year = String(dObj.getFullYear());
    const formattedDate = `${day} ${month} ${year.slice(-2)}`;

    const modeMapping: FinanceTransaction['mode'] = 
      txData.paymentMethod === 'Bank Transfer' ? 'NEFT/RTGS' :
      txData.paymentMethod === 'Cheque' ? 'CHEQUE' : 'CASH';

    const newTx: FinanceTransaction = {
      id: `tx-${Date.now()}`,
      txnCode: txData.voucherNo,
      date: formattedDate,
      type,
      partyName: txData.partyName,
      projectName: txData.projectName,
      category: txData.costCode || txData.transactionType,
      amount: txData.amount,
      mode: modeMapping,
      referenceNo: txData.referenceNo || `REF-${Date.now().toString().slice(-6)}`,
      status: 'Completed',
      transactionType: txData.transactionType,
      costCode: txData.costCode,
      notes: txData.notes
    };

    // 1. Update Transactions state & localStorage
    setTransactions(prev => {
      const updated = [newTx, ...prev];
      try {
        localStorage.setItem('booshnam_finance_transactions', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 2. Ensure party exists or update party balances
    let matchedParty = parties.find(p => p.name.trim().toLowerCase() === txData.partyName.trim().toLowerCase());
    if (!matchedParty) {
      matchedParty = ensurePartyExists(txData.partyName, txData.projectName, isIncome ? 'Client' : 'Vendor');
      const latestParties = getFinanceParties();
      setParties(latestParties);
      matchedParty = latestParties.find(p => p.id === matchedParty!.id) || matchedParty;
    } else {
      setParties(prev => {
        const next = prev.map(p => {
          if (p.id === matchedParty!.id) {
            const amt = txData.amount;
            let newBal = p.balanceDue;
            let newPaid = (p.totalPaid || 0) + amt;
            let newBilled = p.totalBilled || 0;

            if (p.type === 'Client') {
              if (txData.transactionType === 'Sales Invoice' || txData.transactionType === 'Material Sales') {
                newBilled += amt;
                newBal = Math.max(0, newBilled - (p.totalPaid || 0));
              } else {
                newBal = Math.max(0, (newBilled || p.balanceDue || 0) - amt);
              }
            } else {
              if (isIncome) {
                newBal = Math.max(0, p.balanceDue - amt);
              } else {
                newBal = Math.max(0, p.balanceDue + (txData.transactionType.includes('Bill') || txData.transactionType.includes('Purchase') ? amt : -amt));
              }
            }

            const partyStatus: PartyRecord['status'] = newBal === 0 
              ? 'Settled' 
              : (p.type === 'Client' ? 'To Receive' : 'To Pay');

            return {
              ...p,
              totalPaid: newPaid,
              totalBilled: newBilled,
              balanceDue: newBal,
              status: partyStatus
            };
          }
          return p;
        });
        saveFinanceParties(next);
        return next;
      });
    }

    // 3. Add to Party Ledger
    if (matchedParty) {
      const partyLedgerEntry: PartyLedgerTransaction = {
        id: `ptx-${Date.now()}`,
        partyId: matchedParty.id,
        partyName: matchedParty.name,
        date: `${day} ${month} ${year}`,
        day,
        month,
        year,
        title: `${txData.transactionType} (${txData.paymentMethod})`,
        projectName: txData.projectName,
        category: txData.costCode || txData.transactionType,
        notes: `Voucher: ${txData.voucherNo}${txData.costCode ? ` • Cost Code: ${txData.costCode}` : ''}${txData.referenceNo ? ` • Ref: ${txData.referenceNo}` : ''}`,
        amount: txData.amount,
        type: isIncome 
          ? (txData.transactionType.includes('Sales') ? 'SALES_INVOICE' : 'PAYMENT_IN') 
          : (txData.transactionType.includes('Bill') || txData.transactionType.includes('Purchase') ? 'EXPENSE' : 'PAYMENT_OUT')
      };

      setPartyTransactions(prev => {
        const next = {
          ...prev,
          [matchedParty!.id]: [partyLedgerEntry, ...(prev[matchedParty!.id] || [])]
        };
        try {
          localStorage.setItem('booshnam_party_transactions_v2', JSON.stringify(next));
        } catch {}
        return next;
      });
    }

    // 4. Update Bank Account Balance if Bank Transfer or Cash
    if (txData.paymentMethod === 'Bank Transfer' && txData.bankAccountId) {
      setBankAccounts(prev => {
        const next = prev.map(b => {
          if (b.id === txData.bankAccountId) {
            return {
              ...b,
              balance: isIncome ? b.balance + txData.amount : Math.max(0, b.balance - txData.amount)
            };
          }
          return b;
        });
        try {
          localStorage.setItem('booshnam_finance_bank_accounts_v4', JSON.stringify(next));
        } catch {}
        return next;
      });
    }

    // 5. If Expense, sync to Expenses tab
    if (!isIncome) {
      let expCategory: ExpenseItem['category'] = 'Site Petty Cash';
      const cLower = (txData.costCode || txData.transactionType || '').toLowerCase();
      if (cLower.includes('material')) expCategory = 'Materials';
      else if (cLower.includes('sub con') || cLower.includes('subcontractor')) expCategory = 'Subcontractor';
      else if (cLower.includes('machinery') || cLower.includes('equipment')) expCategory = 'Machinery & Equipment';
      else if (cLower.includes('labour') || cLower.includes('wage')) expCategory = 'Labour & Daily Wages';
      else if (cLower.includes('fuel') || cLower.includes('logistics')) expCategory = 'Fuel & Logistics';
      else if (cLower.includes('safety') || cLower.includes('compliance')) expCategory = 'Safety & Compliance';
      else if (cLower.includes('util') || cLower.includes('admin')) expCategory = 'Utilities & Admin';
      else expCategory = 'Site Petty Cash';

      const expMode: ExpenseItem['paymentMode'] = 
        txData.paymentMethod === 'Bank Transfer' ? 'NEFT/RTGS' :
        txData.paymentMethod === 'Cheque' ? 'Cheque' : 'Petty Cash';

      const expItem: ExpenseItem = {
        id: `exp-${Date.now()}`,
        expenseCode: txData.voucherNo.replace('#', ''),
        date: formattedDate,
        title: `${txData.transactionType} - ${txData.partyName}`,
        category: expCategory,
        amount: txData.amount,
        projectName: txData.projectName,
        partyOrVendorName: txData.partyName,
        paidFromAccount: txData.bankAccountName || (txData.paymentMethod === 'Cash' ? 'Cash in Hand' : 'Primary Account'),
        paymentMode: expMode,
        status: 'Paid',
        referenceNo: txData.referenceNo || txData.voucherNo
      };
      setExpenses(prev => {
        const next = [expItem, ...prev];
        try {
          localStorage.setItem('booshnam_finance_expenses_v1', JSON.stringify(next));
        } catch {}
        return next;
      });
    }

    // 6. Sync to Project Transactions in localStorage
    try {
      const rawProjs = localStorage.getItem('booshnam_project_transactions');
      const allProjTxns: Record<string, any[]> = rawProjs ? JSON.parse(rawProjs) : {};
      const projKey = txData.projectId || txData.projectName;
      const existingList = allProjTxns[projKey] || allProjTxns[txData.projectName] || [];

      const projTx = {
        id: `ptx-${Date.now()}`,
        transaction_number: txData.voucherNo,
        date: txData.date,
        type: isIncome ? 'IN' : 'OUT',
        amount: txData.amount,
        payment_mode: txData.paymentMethod,
        party_name: txData.partyName,
        transaction_sub_type: txData.transactionType,
        category: txData.costCode || txData.transactionType,
        reference_no: txData.referenceNo || txData.voucherNo,
        notes: txData.notes || `${txData.transactionType} for ${txData.projectName}`,
        status: 'VERIFIED'
      };

      allProjTxns[projKey] = [projTx, ...existingList];
      if (projKey !== txData.projectName) {
        allProjTxns[txData.projectName] = [projTx, ...(allProjTxns[txData.projectName] || [])];
      }
      localStorage.setItem('booshnam_project_transactions', JSON.stringify(allProjTxns));
    } catch (err) {
      console.error('Failed to sync to project transactions:', err);
    }

    // 7. Dispatch events so all tabs & modules update in real-time
    window.dispatchEvent(new CustomEvent('booshnam_finance_updated'));
    window.dispatchEvent(new Event('storage'));

    if (onShowToast) {
      onShowToast(`Recorded ${txData.transactionType} (${txData.voucherNo}) of ₹${txData.amount.toLocaleString('en-IN')} for ${txData.partyName}`);
    }
  };

  // Expenses State with LocalStorage Persistence
  const [expenses, setExpenses] = useState<ExpenseItem[]>(() => {
    try {
      const saved = localStorage.getItem('booshnam_finance_expenses_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const clean = parsed.filter((exp: ExpenseItem) => exp.id && !/^exp-([0-9]{1,3})$/.test(exp.id) && !['exp-1', 'exp-2', 'exp-3', 'exp-4', 'exp-5', 'exp-6'].includes(exp.id));
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
  const [newExpProject, setNewExpProject] = useState(projects[0]?.name || '');
  const [newExpLocation, setNewExpLocation] = useState('');
  const [newExpPayee, setNewExpPayee] = useState('');
  const [newExpAccount, setNewExpAccount] = useState(() => {
    return bankAccounts[0]?.accountName || 'Primary Bank Account';
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
          const clean = parsed.filter((tr: AccountTransferRecord) => tr.id && !/^trf-([0-9]{1,3})$/.test(tr.id) && !['trf-1', 'trf-2', 'trf-3', 'trf-4', 'trf-5'].includes(tr.id));
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

  // Real-time synchronization when transactions or parties are added from Project Workspace
  useEffect(() => {
    const handleFinanceUpdated = () => {
      try {
        const saved = localStorage.getItem('booshnam_finance_parties');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setParties(parsed);
        }
      } catch {}
      try {
        const savedTx = localStorage.getItem('booshnam_finance_transactions');
        if (savedTx) {
          const parsed = JSON.parse(savedTx);
          if (Array.isArray(parsed)) setTransactions(parsed);
        }
      } catch {}
      try {
        const savedPR = localStorage.getItem('booshnam_finance_payment_requests');
        if (savedPR) {
          const parsed = JSON.parse(savedPR);
          if (Array.isArray(parsed)) setPaymentRequests(parsed);
        }
      } catch {}
      try {
        const savedPTx = localStorage.getItem('booshnam_party_transactions_v2');
        if (savedPTx) {
          const parsed = JSON.parse(savedPTx);
          if (parsed && typeof parsed === 'object') setPartyTransactions(parsed);
        }
      } catch {}
      try {
        const savedSumm = localStorage.getItem('booshnam_party_summaries');
        if (savedSumm) {
          const parsed = JSON.parse(savedSumm);
          if (parsed && typeof parsed === 'object') setPartySummaries(parsed);
        }
      } catch {}
      try {
        const savedBanks = localStorage.getItem('booshnam_finance_bank_accounts_v4');
        if (savedBanks) {
          const parsed = JSON.parse(savedBanks);
          if (Array.isArray(parsed)) setBankAccounts(parsed);
        }
      } catch {}
      try {
        const savedStmts = localStorage.getItem('booshnam_statement_transactions_v1');
        if (savedStmts) {
          const parsed = JSON.parse(savedStmts);
          if (Array.isArray(parsed)) setStatementTransactions(parsed);
        }
      } catch {}
      try {
        const savedExps = localStorage.getItem('booshnam_finance_expenses_v1');
        if (savedExps) {
          const parsed = JSON.parse(savedExps);
          if (Array.isArray(parsed)) setExpenses(parsed);
        }
      } catch {}
    };

    window.addEventListener('storage', handleFinanceUpdated);
    window.addEventListener('booshnam_finance_updated', handleFinanceUpdated);
    return () => {
      window.removeEventListener('storage', handleFinanceUpdated);
      window.removeEventListener('booshnam_finance_updated', handleFinanceUpdated);
    };
  }, []);

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
  const [newTrfFromAccountId, setNewTrfFromAccountId] = useState(() => bankAccounts[0]?.id || '');
  const [newTrfToAccountId, setNewTrfToAccountId] = useState(() => bankAccounts[1]?.id || bankAccounts[0]?.id || '');
  const [newTrfAmount, setNewTrfAmount] = useState('');
  const [newTrfMode, setNewTrfMode] = useState<AccountTransferRecord['transferMode']>('Cash Withdrawal');
  const [newTrfDate, setNewTrfDate] = useState(() => {
    return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  });
  const [newTrfRef, setNewTrfRef] = useState('');
  const [newTrfPurpose, setNewTrfPurpose] = useState('');
  const [newTrfProject, setNewTrfProject] = useState(projects[0]?.name || '');
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
    const pettyCashTransfers = transfers.filter(t => (t.toAccountId === 'cash' || t.toAccountName.toLowerCase().includes('cash')) && t.status === 'Completed').reduce((sum, t) => sum + t.amount, 0);
    const interBankTransfers = transfers.filter(t => t.toAccountId !== 'cash' && !t.toAccountName.toLowerCase().includes('cash') && t.status === 'Completed').reduce((sum, t) => sum + t.amount, 0);
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

  // Handle Save New Bank / Cash Account from Drawer (Side Navigation Bar)
  const handleSaveAccountFromDrawer = (data: AccountFormData) => {
    const rawNo = data.accountNumber.trim();
    const formattedNumber = rawNo || `${Math.floor(100000000000 + Math.random() * 900000000000)}`;

    const newAcc: BankAccountRecord = {
      id: `ba-${Date.now()}`,
      accountName: data.accountHolderName.trim() || data.bankName.trim() || 'New Account',
      accountHolderName: data.accountHolderName.trim() || 'Booshnam Associates Pvt Ltd',
      bankName: data.bankName.trim() || 'Commercial Bank',
      bankAddress: data.bankAddress.trim() || '',
      accountNumber: formattedNumber,
      ifscCode: data.ifscCode.trim().toUpperCase() || 'BANK0001234',
      ibanNumber: data.ibanNumber.trim(),
      upiNumber: data.upiNumber.trim(),
      accountType: 'Current',
      balance: data.openingBalance || 0,
      openingBalance: data.openingBalance || 0,
      overdraftLimit: data.overdraftLimit || 0,
      status: 'Active',
      tallyLedgerName: `${data.accountHolderName.trim() || data.bankName.trim()} Ledger`,
      isPrimary: false,
    };

    setBankAccounts(prev => [newAcc, ...prev]);
    setIsAddAccountModalOpen(false);

    if (data.openingBalance && data.openingBalance > 0) {
      const initTxn: AccountStatementTransaction = {
        id: `st-init-${newAcc.id}`,
        accountId: newAcc.id,
        date: 'Today',
        rawDate: new Date().toISOString().split('T')[0],
        partyName: newAcc.accountHolderName || 'Opening Balance',
        voucherCode: `#OPB-${newAcc.id.slice(-4)}`,
        paymentType: 'Payment In',
        type: 'Credit',
        amount: data.openingBalance,
        paymentMode: 'Bank Transfer',
        projectName: 'General Opening Account Balance',
        sourceAccountName: newAcc.bankName,
        details: 'Initial Opening Balance Deposit',
      };
      setStatementTransactions(prev => [initTxn, ...prev]);
    }

    if (onShowToast) {
      onShowToast(`Bank Account "${newAcc.bankName} - ${newAcc.accountHolderName}" created successfully!`);
    }
  };

  // Handle Save New Bank / Cash Account (Legacy fallback)
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

  // Derived pending notifications
  const pendingPaymentRequests = useMemo(() => {
    return paymentRequests.filter(r => r.status === 'Pending' || r.status === 'Approved');
  }, [paymentRequests]);

  const pendingExpenses = useMemo(() => {
    return expenses.filter(e => e.status === 'Pending Approval');
  }, [expenses]);

  const totalPendingNotifications = pendingPaymentRequests.length + pendingExpenses.length;

  // Helper to ensure 100% of transactions accurately map to one of the 15 Create Transaction types
  const inferTransactionType = (t: FinanceTransaction): string => {
    if (t.transactionType && t.transactionType.trim()) {
      return t.transactionType.trim();
    }
    const cat = (t.category || '').toLowerCase();
    const notes = (t.notes || '').toLowerCase();
    const code = (t.txnCode || '').toLowerCase();

    if (cat.includes('debit note') || notes.includes('debit note')) return 'Debit Note';
    if (cat.includes('credit note') || notes.includes('credit note')) return 'Credit Note';
    if (cat.includes('party to party') || notes.includes('party to party')) return 'Party to Party Payment';
    if (cat.includes('internal transfer') || notes.includes('internal transfer')) return 'Internal Transfer';
    if (cat.includes('upload payment') || notes.includes('upload payment')) return 'Upload Payments';
    if (cat.includes('material sale') || notes.includes('material sale')) return 'Material Sales';
    if (cat.includes('material return') || notes.includes('material return')) return 'Material Return';
    if (cat.includes('material transfer') || notes.includes('material transfer')) return 'Material Transfer';
    if (cat.includes('sub con') || cat.includes('subcontractor') || notes.includes('sub con')) return 'Sub Con Bill';
    if (cat.includes('equipment') || cat.includes('machinery') || notes.includes('machinery') || notes.includes('equipment')) return 'Equipment Expense';
    if (cat.includes('material') || cat.includes('purchase')) return 'Material Purchase';
    if (cat.includes('sale') || cat.includes('invoice') || notes.includes('invoice') || code.includes('inv')) return 'Sales Invoice';
    if (cat.includes('other expense') || cat.includes('general') || cat.includes('admin') || cat.includes('petty cash')) return 'Other Expense';

    if (t.type === 'INCOME') return 'Payment In';
    return 'Payment Out';
  };

  // Transaction counts per type for filter dropdown badges
  const txnTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of transactions) {
      const type = inferTransactionType(t);
      counts[type] = (counts[type] || 0) + 1;
    }
    return counts;
  }, [transactions]);

  // Filtered transactions for the Transaction tab
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Transaction Type filter (Categorized with ALL options from Create Transaction)
      if (txnTypeFilter !== 'All') {
        const inferred = inferTransactionType(t);
        const matchType = (t.transactionType || '').toLowerCase().trim();
        const matchCat = (t.category || '').toLowerCase().trim();
        const target = txnTypeFilter.toLowerCase().trim();

        const isExactInferred = inferred.toLowerCase() === target;
        const isExactType = matchType === target;
        const isCatMatch = matchCat === target || matchCat.includes(target);

        if (!isExactInferred && !isExactType && !isCatMatch) {
          return false;
        }
      }

      // 2. Project filter
      if (txnProjectFilter !== 'All') {
        if ((t.projectName || '').toLowerCase() !== txnProjectFilter.toLowerCase()) {
          return false;
        }
      }

      // 3. Mode filter
      if (txnModeFilter !== 'All') {
        const m = (t.mode || '').toLowerCase();
        const targetM = txnModeFilter.toLowerCase();
        if (!m.includes(targetM)) return false;
      }

      // 4. Search query
      if (txnSearchQuery.trim()) {
        const q = txnSearchQuery.toLowerCase().trim();
        const mCode = (t.txnCode || '').toLowerCase().includes(q);
        const mParty = (t.partyName || '').toLowerCase().includes(q);
        const mProj = (t.projectName || '').toLowerCase().includes(q);
        const mRef = (t.referenceNo || '').toLowerCase().includes(q);
        const mCat = (t.category || '').toLowerCase().includes(q);
        const mType = (t.transactionType || '').toLowerCase().includes(q);
        const mInferred = inferTransactionType(t).toLowerCase().includes(q);
        if (!mCode && !mParty && !mProj && !mRef && !mCat && !mType && !mInferred) return false;
      }

      return true;
    });
  }, [transactions, txnTypeFilter, txnProjectFilter, txnModeFilter, txnSearchQuery]);

  // Transaction metrics for project cashbook
  const transactionMetrics = useMemo(() => {
    const listToCount = (txnTypeFilter !== 'All' || txnProjectFilter !== 'All' || txnModeFilter !== 'All' || txnSearchQuery) 
      ? filteredTransactions 
      : transactions;
    const totalInflow = listToCount
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const totalOutflow = listToCount
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const netOperatingCash = totalInflow - totalOutflow;
    return {
      totalInflow,
      totalOutflow,
      netOperatingCash,
      inflowCount: listToCount.filter(t => t.type === 'INCOME').length,
      outflowCount: listToCount.filter(t => t.type === 'EXPENSE').length,
    };
  }, [transactions, filteredTransactions, txnTypeFilter, txnProjectFilter, txnModeFilter, txnSearchQuery]);

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

  // Helper to dynamically calculate real-time financials for any party across all sources
  const getPartySummaryFinancials = (p: PartyRecord) => {
    const pName = p.name.trim().toLowerCase();
    const pId = p.id;

    // Cashbook transactions
    const matchedTxns = transactions.filter(t => t.partyName && t.partyName.trim().toLowerCase() === pName);
    const txnIncome = matchedTxns.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const txnExpense = matchedTxns.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // Direct ledger transactions (excluding any ledger entries that mirror cashbook transactions)
    const txCodes = new Set(matchedTxns.map(t => t.txnCode?.toLowerCase()).filter(Boolean));
    const txIds = new Set(matchedTxns.map(t => t.id));
    const nonTxnLedgers = (partyTransactions[pId] || []).filter(t => {
      if (txIds.has(t.id.replace(/^ptx-/, '')) || txIds.has(t.id)) return false;
      if (t.notes && t.notes.includes('Cashbook Txn') && Array.from(txCodes).some(c => t.notes?.toLowerCase().includes(c))) return false;
      return true;
    });

    const ledgerPaidIn = nonTxnLedgers.filter(t => t.type === 'PAYMENT_IN').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const ledgerPaidOut = nonTxnLedgers.filter(t => t.type === 'PAYMENT_OUT' || t.type === 'EXPENSE').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const ledgerSales = nonTxnLedgers.filter(t => t.type === 'SALES_INVOICE').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // Payment requests
    const matchedPRs = paymentRequests.filter(r => r.partyName && r.partyName.trim().toLowerCase() === pName);
    const prPaid = matchedPRs.filter(r => r.status === 'Paid').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const prPending = matchedPRs.filter(r => r.status === 'Pending' || r.status === 'Approved').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    // Expenses
    const matchedExps = expenses.filter(e => {
      const payee = (e.partyOrVendorName || '').trim().toLowerCase();
      const title = (e.title || '').trim().toLowerCase();
      return payee === pName || title.includes(pName);
    });
    const expPaid = matchedExps.filter(e => e.status === 'Paid').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const expPending = matchedExps.filter(e => e.status === 'Pending Approval').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const baseOpening = p.totalBilled || p.balanceDue || 0;

    let balanceDue = p.balanceDue;
    let status: PartyRecord['status'] = p.status;
    let totalPaid = p.totalPaid || 0;
    let totalBilled = baseOpening + ledgerSales;

    if (p.type === 'Client') {
      totalPaid = txnIncome + ledgerPaidIn;
      balanceDue = Math.max(0, totalBilled - totalPaid);
      status = balanceDue > 0 ? 'To Receive' : (totalPaid > totalBilled ? 'Advance Received' : 'Settled');
    } else {
      // Vendor, Subcontractor, Supplier, Staff
      totalPaid = txnExpense + prPaid + expPaid + ledgerPaidOut;
      const additionalBilled = prPending + expPending;
      totalBilled = Math.max(baseOpening + ledgerSales, totalPaid + additionalBilled);
      balanceDue = Math.max(0, totalBilled - totalPaid);
      status = balanceDue > 0 ? 'To Pay' : (totalPaid > totalBilled ? 'Advance Paid' : 'Settled');
    }

    return {
      balanceDue,
      status,
      totalPaid,
      totalBilled,
      totalActivityCount: nonTxnLedgers.length + matchedTxns.length + matchedPRs.length + matchedExps.length
    };
  };

  // Currently viewed live party object
  const liveActiveParty = useMemo(() => {
    if (!activePartyOverview) return null;
    return parties.find(p => p.id === activePartyOverview.id) || activePartyOverview;
  }, [activePartyOverview, parties]);

  // Aggregated Unified Activities for Live Active Party
  const unifiedPartyActivities = useMemo<UnifiedPartyActivityItem[]>(() => {
    if (!liveActiveParty) return [];
    const pName = liveActiveParty.name.trim().toLowerCase();
    const pId = liveActiveParty.id;
    const items: UnifiedPartyActivityItem[] = [];

    // 1. Direct party ledger transactions
    const directTxns = partyTransactions[pId] || [];
    const directTxnCodes = new Set(transactions.map(t => t.txnCode?.toLowerCase()).filter(Boolean));
    const directTxnIds = new Set(transactions.map(t => t.id));
    directTxns.forEach(t => {
      const isAlreadyInCashbook = directTxnIds.has(t.id.replace(/^ptx-/, '')) || directTxnIds.has(t.id) ||
        (t.notes && t.notes.includes('Cashbook Txn') && Array.from(directTxnCodes).some(c => t.notes?.toLowerCase().includes(c)));
      if (isAlreadyInCashbook) return;

      items.push({
        id: t.id,
        source: 'LEDGER',
        sourceLabel: 'Party Ledger',
        date: `${t.day} ${t.month} ${t.year}`,
        day: t.day,
        month: t.month,
        year: t.year,
        timestamp: parseDateParts(`${t.day} ${t.month} ${t.year}`).timestamp,
        title: t.title,
        code: t.id.startsWith('ptx-') ? `LEDGER-${t.id.slice(-5)}` : t.id,
        projectName: t.projectName,
        category: t.category,
        notes: t.notes,
        amount: t.amount,
        type: t.type === 'SALES_INVOICE' ? 'SALES_INVOICE' : t.type === 'PAYMENT_IN' ? 'PAYMENT_IN' : 'EXPENSE',
        status: 'Completed',
        badgeText: t.type === 'SALES_INVOICE' ? 'Sales Invoice' : t.type === 'PAYMENT_IN' ? 'Payment In' : 'Payment Out',
        badgeClass: t.type === 'SALES_INVOICE' ? 'bg-blue-50 text-blue-700 border-blue-200' : t.type === 'PAYMENT_IN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
      });
    });

    // 2. Project Transactions from Tab 3 (Cashbook)
    transactions.forEach(tx => {
      if (tx.partyName && tx.partyName.trim().toLowerCase() === pName) {
        const d = parseDateParts(tx.date);
        const isIncome = tx.type === 'INCOME';
        items.push({
          id: tx.id,
          source: 'TRANSACTION',
          sourceLabel: 'Cashbook Txn',
          date: tx.date,
          day: d.day,
          month: d.month,
          year: d.year,
          timestamp: d.timestamp,
          title: `${tx.category} via ${tx.mode}`,
          code: tx.txnCode,
          projectName: tx.projectName,
          category: tx.category,
          mode: tx.mode,
          referenceNo: tx.referenceNo,
          notes: `Ref: ${tx.referenceNo} • Project: ${tx.projectName}`,
          amount: tx.amount,
          type: isIncome ? 'INCOME' : 'EXPENSE',
          status: tx.status,
          badgeText: isIncome ? 'Cashbook Inflow' : 'Cashbook Outflow',
          badgeClass: isIncome ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
        });
      }
    });

    // 3. Payment Requests
    paymentRequests.forEach(pr => {
      if (pr.partyName && pr.partyName.trim().toLowerCase() === pName) {
        const d = parseDateParts(pr.date);
        items.push({
          id: pr.id,
          source: 'PAYMENT_REQUEST',
          sourceLabel: 'Payment Request',
          date: pr.date,
          day: d.day,
          month: d.month,
          year: d.year,
          timestamp: d.timestamp,
          title: `Payment Request: ${pr.subProjectText || pr.category}`,
          code: pr.requestCode,
          projectName: pr.projectName,
          category: pr.category,
          mode: pr.paymentMode,
          referenceNo: pr.referenceNo,
          notes: pr.notes ? `${pr.notes} (${pr.category})` : pr.category,
          amount: pr.amount,
          type: 'PAYMENT_OUT',
          status: pr.status,
          badgeText: `Payment Request (${pr.status})`,
          badgeClass: pr.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : pr.status === 'Approved' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'
        });
      }
    });

    // 4. Expenses / Vouchers
    expenses.forEach(exp => {
      const payee = (exp.partyOrVendorName || '').trim().toLowerCase();
      const title = (exp.title || '').trim().toLowerCase();
      if (payee === pName || title.includes(pName)) {
        const d = parseDateParts(exp.date);
        items.push({
          id: exp.id,
          source: 'EXPENSE',
          sourceLabel: 'Expense Voucher',
          date: exp.date,
          day: d.day,
          month: d.month,
          year: d.year,
          timestamp: d.timestamp,
          title: exp.title,
          code: exp.expenseCode,
          projectName: exp.projectName,
          category: exp.category,
          mode: exp.paymentMode,
          referenceNo: exp.referenceNo,
          notes: `Paid From: ${exp.paidFromAccount} • ${exp.category}`,
          amount: exp.amount,
          type: 'EXPENSE',
          status: exp.status,
          badgeText: `Expense (${exp.status})`,
          badgeClass: exp.status === 'Paid' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-amber-50 text-amber-700 border-amber-200'
        });
      }
    });

    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [liveActiveParty, partyTransactions, transactions, paymentRequests, expenses]);

  // Filtered unified activities
  const filteredPartyActivities = useMemo(() => {
    return unifiedPartyActivities.filter(item => {
      if (partyOverviewFilter !== 'All' && item.source !== partyOverviewFilter) return false;
      if (partyOverviewSearch.trim()) {
        const q = partyOverviewSearch.toLowerCase();
        const mCode = item.code.toLowerCase().includes(q);
        const mTitle = item.title.toLowerCase().includes(q);
        const mProj = (item.projectName || '').toLowerCase().includes(q);
        const mNotes = (item.notes || '').toLowerCase().includes(q);
        const mCat = (item.category || '').toLowerCase().includes(q);
        if (!mCode && !mTitle && !mProj && !mNotes && !mCat) return false;
      }
      return true;
    });
  }, [unifiedPartyActivities, partyOverviewFilter, partyOverviewSearch]);

  // Live computed metrics for active party
  const partyComputedMetrics = useMemo(() => {
    if (!liveActiveParty) {
      return {
        opening: 0,
        totalReceived: 0,
        totalPaidOut: 0,
        totalBilled: 0,
        currentBalance: 0,
        status: 'Settled'
      };
    }
    const fin = getPartySummaryFinancials(liveActiveParty);
    const opening = liveActiveParty.totalBilled || liveActiveParty.balanceDue || 0;
    return {
      opening,
      totalReceived: fin.totalPaid,
      totalPaidOut: fin.totalPaid,
      totalBilled: fin.totalBilled,
      currentBalance: fin.balanceDue,
      status: fin.status
    };
  }, [liveActiveParty, transactions, paymentRequests, expenses, partyTransactions]);

  // Fullscreen State & Toggle
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const unsub = addFullscreenChangeListener((fs) => { setIsFullscreen(fs); });
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false); };
    window.addEventListener('keydown', handleKeyDown);
    return () => { unsub(); window.removeEventListener('keydown', handleKeyDown); };
  }, [isFullscreen]);

  const toggleFullscreen = async () => {
    setIsFullscreen(prev => !prev);
    try { await toggleBrowserFullscreen(); } catch (e) {}
  };

  return (
    <div className={`min-h-screen bg-white text-slate-800 flex flex-col font-sans transition-all duration-300 ${
      isFullscreen ? `fixed top-0 right-0 bottom-0 z-[100] overflow-y-auto bg-white ${isSidebarOpen ? 'left-64' : 'left-[72px]'}` : ''
    }`}>
      
      {/* ─────────────────────────────────────────────────────────────
          1. TOP BRAND / UTILITY HEADER (as in reference image)
      ───────────────────────────────────────────────────────────── */}
      <header className="border-b border-slate-200 bg-white px-6 py-3.5 flex items-center justify-between sticky top-0 z-20">
        {/* Title */}
        <div className="flex items-center gap-3">
          <h1 className="text-[21px] font-bold text-[#262626] font-heading tracking-tight">Finance</h1>
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
              {totalPendingNotifications > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                  <span className="font-bold text-slate-900">Finance Notifications</span>
                  <span className="text-[10px] text-slate-400">
                    {totalPendingNotifications} pending
                  </span>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {totalPendingNotifications === 0 ? (
                    <div className="p-4 text-center text-slate-400">
                      <p>No pending notifications</p>
                    </div>
                  ) : (
                    <>
                      {pendingPaymentRequests.map(req => (
                        <div key={req.id} className="p-2 rounded-lg bg-amber-50/60 border border-amber-100">
                          <p className="font-semibold text-amber-900">Payment Request: ₹{req.amount.toLocaleString('en-IN')}</p>
                          <p className="text-[10px] text-amber-700 mt-0.5">{req.partyName} • {req.requestCode} ({req.status})</p>
                        </div>
                      ))}
                      {pendingExpenses.map(exp => (
                        <div key={exp.id} className="p-2 rounded-lg bg-blue-50/60 border border-blue-100">
                          <p className="font-semibold text-blue-900">Expense Approval: ₹{exp.amount.toLocaleString('en-IN')}</p>
                          <p className="text-[10px] text-blue-700 mt-0.5">{exp.title} • {exp.expenseCode} ({exp.status})</p>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Expand / Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isFullscreen ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Full Screen'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Full Screen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-red-600" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* User Profile Avatar */}
          <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs shadow-sm ring-2 ring-red-100 select-none cursor-pointer">
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
                ? 'border-red-600 text-red-600 font-bold'
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
                ? 'border-red-600 text-red-600 font-bold'
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
                ? 'border-red-600 text-red-600 font-bold'
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
                ? 'border-red-600 text-red-600 font-bold'
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
                ? 'border-red-600 text-red-600 font-bold'
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
                ? 'border-red-600 text-red-600 font-bold'
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
                      ? 'border-red-600 text-red-600 bg-red-50/60'
                      : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filter</span>
                  {(statusFilter !== 'All' || selectedProjectFilter !== 'All') && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
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
                    className="w-full h-9 pl-10 pr-8 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all shadow-2xs"
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

                {/* Quick Status Filter Pills (Matching User Voice Instructions: All, Unpaid, Paid, On Hold) */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['All', 'Unpaid', 'Paid', 'On Hold'] as const).map(st => {
                    const count = st === 'All' 
                      ? paymentRequests.length 
                      : st === 'Unpaid' 
                      ? paymentRequests.filter(r => r.status === 'Unpaid' || r.status === 'Pending').length
                      : paymentRequests.filter(r => r.status === st).length;

                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatusFilter(st)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                          statusFilter === st 
                            ? 'bg-red-600 text-white shadow-2xs' 
                            : 'bg-white text-slate-700 hover:bg-red-50 hover:text-red-700 border border-slate-200'
                        }`}
                      >
                        <span>{st}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                          statusFilter === st ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: Payment Request Action Button */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNewRequestModalOpen(true)}
                  className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Payment Request</span>
                </button>
              </div>
            </div>

            {/* Filter Popover Modal */}
            {isFilterModalOpen && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-lg flex flex-wrap items-center gap-4 text-xs animate-in fade-in duration-150">
                <div className="min-w-[160px]">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                  <CustomSelect 
                    value={statusFilter}
                    onChange={(val) => setStatusFilter(val as any)}
                    options={[
                      { label: 'All Statuses', value: 'All' },
                      { label: 'Unpaid', value: 'Unpaid', dotColor: 'bg-rose-500' },
                      { label: 'Paid', value: 'Paid', dotColor: 'bg-emerald-500' },
                      { label: 'On Hold', value: 'On Hold', dotColor: 'bg-amber-500' },
                    ]}
                    size="sm"
                    variant="brand"
                  />
                </div>

                <div className="min-w-[200px]">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Project</label>
                  <CustomSelect 
                    value={selectedProjectFilter}
                    onChange={(val) => setSelectedProjectFilter(val)}
                    options={[
                      { label: 'All Projects', value: 'All' },
                      ...projects.map(p => ({ label: p.name, value: p.name })),
                    ]}
                    size="sm"
                    variant="brand"
                  />
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
                    className="px-4 py-1.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 cursor-pointer"
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
                          <div className="text-sm font-semibold text-slate-900 group-hover:text-red-600 transition-colors truncate">
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
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : req.status === 'On Hold'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : req.status === 'Approved'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-rose-50 text-rose-600 border border-rose-200'
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
            TAB 2: PARTY DIRECTORY (Full View & Split Master-Detail)
        ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'party' && !activePartyOverview && (
          <div className="space-y-4">
            
            {/* 1. Four Summary KPI Cards (Red & White Theme with Perfect Height & Proportions) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Advance Paid */}
              <div className="bg-white rounded-xl p-5 min-h-[112px] flex flex-col justify-between border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all">
                <div className="flex items-center gap-2 text-slate-600 font-bold text-xs uppercase tracking-wide">
                  <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200/90 flex items-center justify-center shrink-0">
                    <ArrowDown className="w-3.5 h-3.5 text-slate-600 stroke-[2.5]" />
                  </div>
                  <span className="tracking-tight text-slate-600">Advance Paid</span>
                </div>
                <div className="text-2xl sm:text-[28px] font-black text-slate-900 tracking-tight tracking-tight leading-none mt-3">
                  ₹ {partyKpiMetrics.advancePaid.toLocaleString('en-IN')}
                </div>
              </div>

              {/* Card 2: To Pay */}
              <div className="bg-white rounded-xl p-5 min-h-[112px] flex flex-col justify-between border border-slate-200 shadow-2xs hover:border-red-300 hover:shadow-xs transition-all">
                <div className="flex items-center gap-2 text-red-600 font-bold text-xs uppercase tracking-wide">
                  <div className="w-6 h-6 rounded-full bg-red-50 border border-red-200/90 flex items-center justify-center shrink-0">
                    <ArrowUp className="w-3.5 h-3.5 text-red-600 stroke-[2.5]" />
                  </div>
                  <span className="tracking-tight text-red-600">To Pay</span>
                </div>
                <div className="text-2xl sm:text-[28px] font-black text-red-600 tracking-tight tracking-tight leading-none mt-3">
                  ₹ {partyKpiMetrics.toPay.toLocaleString('en-IN')}
                </div>
              </div>

              {/* Card 3: To Receive */}
              <div className="bg-white rounded-xl p-5 min-h-[112px] flex flex-col justify-between border border-slate-200 shadow-2xs hover:border-red-300 hover:shadow-xs transition-all">
                <div className="flex items-center gap-2 text-red-600 font-bold text-xs uppercase tracking-wide">
                  <div className="w-6 h-6 rounded-full bg-red-50 border border-red-200/90 flex items-center justify-center shrink-0">
                    <ArrowDown className="w-3.5 h-3.5 text-red-600 stroke-[2.5]" />
                  </div>
                  <span className="tracking-tight text-red-600">To Receive</span>
                </div>
                <div className="text-2xl sm:text-[28px] font-black text-red-600 tracking-tight tracking-tight leading-none mt-3">
                  ₹ {partyKpiMetrics.toReceive.toLocaleString('en-IN')}
                </div>
              </div>

              {/* Card 4: Advance Received */}
              <div className="bg-white rounded-xl p-5 min-h-[112px] flex flex-col justify-between border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all">
                <div className="flex items-center gap-2 text-slate-600 font-bold text-xs uppercase tracking-wide">
                  <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200/90 flex items-center justify-center shrink-0">
                    <ArrowUp className="w-3.5 h-3.5 text-slate-600 stroke-[2.5]" />
                  </div>
                  <span className="tracking-tight text-slate-600">Advance Received</span>
                </div>
                <div className="text-2xl sm:text-[28px] font-black text-slate-900 tracking-tight tracking-tight leading-none mt-3">
                  ₹ {partyKpiMetrics.advanceReceived.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* 2. Action & Filter Toolbar (Perfect Alignment with h-9 & Red Focus) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              
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
                    className="w-full h-9 pl-9 pr-8 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all shadow-2xs"
                  />
                  {partySearchQuery && (
                    <button 
                      onClick={() => setPartySearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Payment Type dropdown */}
                <div className="w-44">
                  <CustomSelect
                    value={partyPaymentTypeFilter}
                    onChange={val => setPartyPaymentTypeFilter(val)}
                    options={[
                      { label: 'Payment Type: All', value: 'All' },
                      { label: 'To Receive', value: 'To Receive', dotColor: 'bg-emerald-500' },
                      { label: 'To Pay', value: 'To Pay', dotColor: 'bg-rose-500' },
                      { label: 'Advance Paid', value: 'Advance Paid', dotColor: 'bg-blue-500' },
                      { label: 'Advance Received', value: 'Advance Received', dotColor: 'bg-indigo-500' },
                      { label: 'Settled', value: 'Settled', dotColor: 'bg-slate-400' },
                    ]}
                    size="md"
                    variant="brand"
                  />
                </div>

                {/* Party Type dropdown */}
                <div className="w-40">
                  <CustomSelect
                    value={partyTypeFilter}
                    onChange={val => setPartyTypeFilter(val)}
                    options={[
                      { label: 'Party Type: All', value: 'All' },
                      { label: 'Client', value: 'Client' },
                      { label: 'Staff', value: 'Staff' },
                      { label: 'Vendor', value: 'Vendor' },
                      { label: 'Subcontractor', value: 'Subcontractor' },
                      { label: 'Supplier', value: 'Supplier' },
                      { label: 'Consultant', value: 'Consultant' },
                    ]}
                    size="md"
                    variant="brand"
                  />
                </div>

                {/* Active dropdown */}
                <div className="w-32">
                  <CustomSelect
                    value={partyActiveFilter}
                    onChange={val => setPartyActiveFilter(val)}
                    options={[
                      { label: 'Active', value: 'Active', dotColor: 'bg-emerald-500' },
                      { label: 'Inactive', value: 'Inactive', dotColor: 'bg-slate-400' },
                      { label: 'All Statuses', value: 'All' },
                    ]}
                    size="md"
                    variant="brand"
                  />
                </div>
              </div>

              {/* Right buttons: Export & + New Party */}
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleExportParties}
                  className="h-9 flex items-center gap-1.5 px-3.5 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                  title="Export to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Export</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddPartyDrawerOpen(true)}
                  className="h-9 flex items-center gap-1.5 px-4 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>New Party</span>
                </button>
              </div>
            </div>

            {/* 3. Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              
              {/* Header row */}
              <div className="grid grid-cols-12 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 select-none">
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
                  filteredParties.map(p => {
                    const fin = getPartySummaryFinancials(p);
                    return (
                      <div 
                        key={p.id}
                        onClick={() => {
                          setActivePartyOverview(p);
                        }}
                        className="grid grid-cols-12 px-6 py-3.5 items-center hover:bg-red-50/20 transition-colors cursor-pointer group"
                      >
                        {/* Party Details: Avatar Circle + Name */}
                        <div className="col-span-6 flex items-center gap-3.5 min-w-0 pr-2">
                          <div className={`w-8 h-8 rounded-full ${
                            p.type === 'Staff' 
                              ? 'bg-red-600' 
                              : p.type === 'Client'
                              ? 'bg-slate-900'
                              : 'bg-red-700'
                          } text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs select-none`}>
                            {p.avatarText || p.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1 truncate">
                            <span className="text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-red-600 transition-colors truncate block">
                              {p.name}
                            </span>
                            {fin.totalActivityCount > 0 && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                {fin.totalActivityCount} {fin.totalActivityCount === 1 ? 'activity' : 'activities'} recorded
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Type Badge */}
                        <div className="col-span-2 text-center">
                          <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${
                            p.type === 'Staff' 
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : p.type === 'Vendor'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : p.type === 'Subcontractor'
                              ? 'bg-slate-100 text-slate-800 border-slate-300'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}>
                            {p.type}
                          </span>
                        </div>

                        {/* Balance (₹) */}
                        <div className="col-span-2 text-right tracking-tight font-bold text-xs sm:text-sm text-slate-900">
                          ₹ {fin.balanceDue.toLocaleString('en-IN')}
                        </div>

                        {/* Status Badge + KYC Action */}
                        <div className="col-span-2 text-right pr-2 flex items-center justify-end gap-1.5">
                          <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                            fin.status === 'To Receive'
                              ? 'border-red-200 bg-red-50 text-red-600'
                              : fin.status === 'To Pay'
                              ? 'border-red-300 bg-red-100 text-red-800'
                              : fin.status === 'Advance Paid' || fin.status === 'Advance Received'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-slate-100 text-slate-600'
                          }`}>
                            {fin.status}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPartyRecord(p);
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title="View Party Profile & KYC"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteParty(p.id, p.name);
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title="Delete Party"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
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
              const currentParty = liveActiveParty || activePartyOverview;
              const isClient = currentParty.type === 'Client';
              const metrics = partyComputedMetrics;

              return (
                <>
                  {/* 1. Header Bar matching Image: ArrowLeft, Avatar, Party Name, Type Badge, Amount, Status, Download */}
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

                      <div className={`w-11 h-11 rounded-full ${currentParty.avatarColor || 'bg-[#1E40AF]'} text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs select-none`}>
                        {currentParty.avatarText || currentParty.name.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="flex items-center gap-2.5">
                        <div className="min-w-[180px]">
                          <CustomSelect
                            value={currentParty.id}
                            onChange={(val) => {
                              const found = parties.find(p => p.id === val);
                              if (found) {
                                setActivePartyOverview(found);
                              }
                            }}
                            options={parties.map(p => ({ label: p.name, value: p.id, badge: p.type }))}
                            triggerClassName="border-0 bg-transparent shadow-none hover:bg-slate-100 text-sm sm:text-base font-bold text-slate-900 px-2.5 py-1 h-9"
                            variant="brand"
                          />
                        </div>

                        <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                          isClient
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : currentParty.type === 'Staff'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : currentParty.type === 'Vendor'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {currentParty.type || 'Party'}
                        </span>

                        {currentParty.phone && (
                          <span className="text-xs text-slate-400 font-medium hidden sm:inline-block">
                            • {currentParty.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Balance amount, Status, Download Icon */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                          ₹ {metrics.currentBalance.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: metrics.currentBalance % 1 !== 0 ? 2 : 0 })}
                        </div>
                        <div className={`text-xs font-semibold leading-none mt-0.5 ${
                          metrics.currentBalance > 0
                            ? isClient ? 'text-blue-600' : 'text-rose-600'
                            : 'text-emerald-600'
                        }`}>
                          {metrics.status}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleExportPartyLedger}
                        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Download Party Statement CSV"
                      >
                        <Download className="w-5 h-5 stroke-[2]" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteParty(currentParty.id, currentParty.name)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Party"
                      >
                        <Trash2 className="w-5 h-5 stroke-[2]" />
                      </button>
                    </div>
                  </div>

                  {/* 2. Opening Balance Subtitle */}
                  <div className="px-6 py-2.5 bg-slate-50/60 border-y border-slate-200/80 text-xs text-slate-600 select-none flex items-center justify-between flex-wrap gap-2">
                    <div>
                      Opening Balance: <span className="font-semibold text-slate-900">₹ {metrics.opening.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-500">
                      <span>Total Invoiced/Billed: <strong className="text-slate-800">₹ {metrics.totalBilled.toLocaleString('en-IN')}</strong></span>
                      <span>•</span>
                      <span>Total Settled/Paid: <strong className="text-emerald-700">₹ {(isClient ? metrics.totalReceived : metrics.totalPaidOut).toLocaleString('en-IN')}</strong></span>
                    </div>
                  </div>

                  {/* 3. Metric Row: User Icon, Party Paid, Invoiced / Claims */}
                  <div className="px-6 py-3.5 bg-white border-b border-slate-200 flex items-center gap-8 sm:gap-12 select-none overflow-x-auto">
                    <div className="text-red-600 flex items-center justify-center shrink-0">
                      <User className="w-6 h-6 stroke-[1.75]" />
                    </div>

                    <div className="relative pb-1 shrink-0">
                      <div className="text-xs font-semibold text-emerald-700">
                        {isClient ? 'Total Received From Party' : 'Total Paid Out to Party'}
                      </div>
                      <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-0.5">
                        ₹ {(isClient ? metrics.totalReceived : metrics.totalPaidOut).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="absolute -bottom-3.5 left-0 right-0 h-1 bg-emerald-600 rounded-t-sm" />
                    </div>

                    <div className="shrink-0">
                      <div className="text-xs font-semibold text-slate-500">
                        {isClient ? 'Sales Invoices & Billing' : 'Total Invoiced / Claims'}
                      </div>
                      <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-0.5">
                        ₹ {metrics.totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="shrink-0">
                      <div className="text-xs font-semibold text-slate-500">Total Activities Tracked</div>
                      <div className="text-base sm:text-lg font-bold text-slate-800 tracking-tight mt-0.5">
                        {unifiedPartyActivities.length} Records
                      </div>
                    </div>
                  </div>

                  {/* 4. Filter Toolbar: All, Cashbook, Payment Requests, Expenses, Ledger + Search */}
                  <div className="px-6 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                      {[
                        { key: 'All', label: 'All Activities', count: unifiedPartyActivities.length },
                        { key: 'TRANSACTION', label: 'Cashbook Txns', count: unifiedPartyActivities.filter(a => a.source === 'TRANSACTION').length },
                        { key: 'PAYMENT_REQUEST', label: 'Payment Requests', count: unifiedPartyActivities.filter(a => a.source === 'PAYMENT_REQUEST').length },
                        { key: 'EXPENSE', label: 'Expenses', count: unifiedPartyActivities.filter(a => a.source === 'EXPENSE').length },
                        { key: 'LEDGER', label: 'Invoices & Ledger', count: unifiedPartyActivities.filter(a => a.source === 'LEDGER').length },
                      ].map(tab => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setPartyOverviewFilter(tab.key as any)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                            partyOverviewFilter === tab.key
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            partyOverviewFilter === tab.key ? 'bg-white/20 text-white' : 'bg-white text-slate-600'
                          }`}>
                            {tab.count}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="relative min-w-[200px]">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search voucher, project, notes..."
                        value={partyOverviewSearch}
                        onChange={e => setPartyOverviewSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-red-600"
                      />
                    </div>
                  </div>

                  {/* 5. Chronological Unified Activity Timeline */}
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-[380px]">
                    {filteredPartyActivities.length === 0 ? (
                      <div className="py-20 text-center text-slate-400">
                        <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-1" />
                        <p className="text-sm font-semibold text-slate-700">No activity records found</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {partyOverviewFilter !== 'All' || partyOverviewSearch 
                            ? 'No matches for current filter/search. Try resetting filters.'
                            : `Click any action below to record a transaction, payment request, or invoice for ${currentParty.name}.`}
                        </p>
                      </div>
                    ) : (
                      filteredPartyActivities.map(item => {
                        const isInflow = item.type === 'INCOME' || item.type === 'PAYMENT_IN';
                        return (
                          <div
                            key={item.id}
                            className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
                          >
                            {/* Date Block: Day, Month, Year vertically */}
                            <div className="w-12 shrink-0 text-center select-none mr-4">
                              <div className="text-base font-bold text-slate-800 leading-tight">{item.day}</div>
                              <div className="text-xs font-semibold text-slate-600 leading-tight uppercase">{item.month}</div>
                              <div className="text-[11px] text-slate-400 leading-tight">{item.year}</div>
                            </div>

                            {/* Middle Content */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-900 leading-snug">
                                  {item.title}
                                </span>
                                <span className="text-[10px] tracking-tight font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {item.code}
                                </span>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${item.badgeClass}`}>
                                  {item.badgeText}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1 flex-wrap">
                                <span className="font-semibold text-slate-800">{currentParty.name}</span>
                                {item.projectName && (
                                  <>
                                    <span className="text-slate-400 font-normal">&gt;</span>
                                    <span className="text-slate-700 font-medium">{item.projectName}</span>
                                  </>
                                )}
                                {item.mode && (
                                  <>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-slate-500 text-[11px]">{item.mode}</span>
                                  </>
                                )}
                                {item.referenceNo && (
                                  <>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-slate-500 text-[11px]">Ref: {item.referenceNo}</span>
                                  </>
                                )}
                              </div>

                              {item.notes && (
                                <div className="text-[11px] text-slate-500 mt-0.5 italic">
                                  {item.notes}
                                </div>
                              )}
                            </div>

                            {/* Right Amount & Actions */}
                            <div className="text-right shrink-0 ml-4 flex flex-col items-end">
                              <div className={`text-sm sm:text-base font-bold ${
                                isInflow ? 'text-[#0D824B]' : 'text-slate-900'
                              }`}>
                                {isInflow ? '+ ' : '- '}₹ {item.amount.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: item.amount % 1 !== 0 ? 2 : 0 })}
                              </div>

                              {item.type === 'SALES_INVOICE' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    exportInvoiceToPDF({
                                      invoice_number: item.title.includes('#') ? item.title.split('#')[1].trim() : (item.code || 'INV-2026-001'),
                                      invoice_date: `${item.year}-${item.month}-${item.day}`,
                                      party_name: currentParty.name,
                                      party_phone: currentParty.phone,
                                      party_address: currentParty.address,
                                      party_gst: currentParty.gstin || currentParty.panNumber,
                                      project_name: item.projectName,
                                      total_amount: item.amount,
                                      notes: item.notes || 'Civil & Structural Construction Services / Milestone Execution',
                                    });
                                    if (onShowToast) onShowToast(`Generated Tax Invoice for ${currentParty.name}`);
                                  }}
                                  className="mt-1 px-2 py-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors cursor-pointer"
                                  title="Download Tax Invoice PDF with customized Terms & Conditions"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Invoice PDF</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* 6. Sticky Bottom Action Bar with 4 Comprehensive Actions */}
                  <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-3.5 flex items-center justify-between gap-3 flex-wrap shadow-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPaymentInModalOpen(true)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#0D824B] hover:bg-[#0A6C3E] text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Payment In (Receipt)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setNewTxnParty(currentParty.name);
                          setIsRecordTxnModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Record Cashbook Txn</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setNewPartyName(currentParty.name);
                          setIsNewRequestModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Payment Request</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsCreatePartyTxnModalOpen(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Invoice / Ledger</span>
                      </button>
                    </div>
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
                onClick={() => {
                  setCreateTxnFlowStep('menu');
                  setIsCreateTxnFlowOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <span>Create Transaction</span>
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500">Total Inflow (Receipts)</span>
                <div className="text-xl font-bold text-emerald-600 mt-1">₹ {transactionMetrics.totalInflow.toLocaleString('en-IN')}</div>
                <span className="text-[10px] text-slate-400">{transactionMetrics.inflowCount} recorded receipts</span>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500">Total Outflow (Expenses)</span>
                <div className="text-xl font-bold text-red-600 mt-1">₹ {transactionMetrics.totalOutflow.toLocaleString('en-IN')}</div>
                <span className="text-[10px] text-slate-400">{transactionMetrics.outflowCount} recorded disbursements</span>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500">Net Operating Cash Balance</span>
                <div className={`text-xl font-bold mt-1 ${transactionMetrics.netOperatingCash >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                  ₹ {transactionMetrics.netOperatingCash.toLocaleString('en-IN')}
                </div>
                <span className={`text-[10px] font-semibold ${transactionMetrics.netOperatingCash >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {transactionMetrics.netOperatingCash >= 0 ? 'Positive Cashflow' : 'Operating Deficit'}
                </span>
              </div>
            </div>

            {/* Comprehensive Filter Bar matching user request with ALL Create Transaction Options */}
            <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-3">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Search query */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={txnSearchQuery}
                    onChange={e => setTxnSearchQuery(e.target.value)}
                    placeholder="Search voucher #, party name, project, reference..."
                    className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-500 text-slate-800"
                  />
                  {txnSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setTxnSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Selectors Row */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* TRANSACTION TYPE FILTER: All Create Transaction Options categorized */}
                  <div className="relative min-w-[200px]">
                    <select
                      value={txnTypeFilter}
                      onChange={e => setTxnTypeFilter(e.target.value)}
                      className={`w-full py-2 px-3 text-xs font-semibold rounded-lg border cursor-pointer focus:outline-none transition-colors ${
                        txnTypeFilter !== 'All' 
                          ? 'border-red-600 text-red-600 bg-red-50/60' 
                          : 'border-slate-200 text-slate-700 bg-white hover:border-slate-300'
                      }`}
                    >
                      <option value="All">All Transaction Types ({transactions.length})</option>
                      
                      <optgroup label="─── PAYMENT ───">
                        <option value="Payment In">Payment In (Receipt) {txnTypeCounts['Payment In'] ? `(${txnTypeCounts['Payment In']})` : ''}</option>
                        <option value="Payment Out">Payment Out (Disbursement) {txnTypeCounts['Payment Out'] ? `(${txnTypeCounts['Payment Out']})` : ''}</option>
                        <option value="Debit Note">Debit Note {txnTypeCounts['Debit Note'] ? `(${txnTypeCounts['Debit Note']})` : ''}</option>
                        <option value="Credit Note">Credit Note {txnTypeCounts['Credit Note'] ? `(${txnTypeCounts['Credit Note']})` : ''}</option>
                        <option value="Party to Party Payment">Party to Party Payment {txnTypeCounts['Party to Party Payment'] ? `(${txnTypeCounts['Party to Party Payment']})` : ''}</option>
                        <option value="Internal Transfer">Internal Transfer {txnTypeCounts['Internal Transfer'] ? `(${txnTypeCounts['Internal Transfer']})` : ''}</option>
                        <option value="Upload Payments">Upload Payments {txnTypeCounts['Upload Payments'] ? `(${txnTypeCounts['Upload Payments']})` : ''}</option>
                      </optgroup>

                      <optgroup label="─── SALES ───">
                        <option value="Sales Invoice">Sales Invoice {txnTypeCounts['Sales Invoice'] ? `(${txnTypeCounts['Sales Invoice']})` : ''}</option>
                        <option value="Material Sales">Material Sales {txnTypeCounts['Material Sales'] ? `(${txnTypeCounts['Material Sales']})` : ''}</option>
                      </optgroup>

                      <optgroup label="─── EXPENSE ───">
                        <option value="Material Purchase">Material Purchase {txnTypeCounts['Material Purchase'] ? `(${txnTypeCounts['Material Purchase']})` : ''}</option>
                        <option value="Material Return">Material Return {txnTypeCounts['Material Return'] ? `(${txnTypeCounts['Material Return']})` : ''}</option>
                        <option value="Material Transfer">Material Transfer {txnTypeCounts['Material Transfer'] ? `(${txnTypeCounts['Material Transfer']})` : ''}</option>
                        <option value="Sub Con Bill">Sub Con Bill {txnTypeCounts['Sub Con Bill'] ? `(${txnTypeCounts['Sub Con Bill']})` : ''}</option>
                        <option value="Other Expense">Other Expense {txnTypeCounts['Other Expense'] ? `(${txnTypeCounts['Other Expense']})` : ''}</option>
                        <option value="Equipment Expense">Equipment Expense {txnTypeCounts['Equipment Expense'] ? `(${txnTypeCounts['Equipment Expense']})` : ''}</option>
                      </optgroup>
                    </select>
                  </div>

                  {/* PROJECT FILTER */}
                  <div className="relative min-w-[150px]">
                    <select
                      value={txnProjectFilter}
                      onChange={e => setTxnProjectFilter(e.target.value)}
                      className={`w-full py-2 px-3 text-xs font-semibold rounded-lg border cursor-pointer focus:outline-none transition-colors ${
                        txnProjectFilter !== 'All' 
                          ? 'border-red-600 text-red-600 bg-red-50/60' 
                          : 'border-slate-200 text-slate-700 bg-white hover:border-slate-300'
                      }`}
                    >
                      <option value="All">All Projects</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* PAYMENT MODE FILTER */}
                  <div className="relative min-w-[130px]">
                    <select
                      value={txnModeFilter}
                      onChange={e => setTxnModeFilter(e.target.value)}
                      className={`w-full py-2 px-3 text-xs font-semibold rounded-lg border cursor-pointer focus:outline-none transition-colors ${
                        txnModeFilter !== 'All' 
                          ? 'border-red-600 text-red-600 bg-red-50/60' 
                          : 'border-slate-200 text-slate-700 bg-white hover:border-slate-300'
                      }`}
                    >
                      <option value="All">All Modes</option>
                      <option value="CASH">Cash</option>
                      <option value="NEFT/RTGS">Bank Transfer</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="UPI">UPI / Online</option>
                    </select>
                  </div>

                  {/* Clear / Reset Filter Button */}
                  {(txnTypeFilter !== 'All' || txnProjectFilter !== 'All' || txnModeFilter !== 'All' || txnSearchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setTxnTypeFilter('All');
                        setTxnProjectFilter('All');
                        setTxnModeFilter('All');
                        setTxnSearchQuery('');
                      }}
                      className="px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Active Filter Indicators */}
              {(txnTypeFilter !== 'All' || txnProjectFilter !== 'All' || txnModeFilter !== 'All') && (
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Filters:</span>
                  {txnTypeFilter !== 'All' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">
                      Type: {txnTypeFilter}
                      <X className="w-3 h-3 cursor-pointer hover:text-red-900" onClick={() => setTxnTypeFilter('All')} />
                    </span>
                  )}
                  {txnProjectFilter !== 'All' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">
                      Project: {txnProjectFilter}
                      <X className="w-3 h-3 cursor-pointer hover:text-red-900" onClick={() => setTxnProjectFilter('All')} />
                    </span>
                  )}
                  {txnModeFilter !== 'All' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">
                      Mode: {txnModeFilter}
                      <X className="w-3 h-3 cursor-pointer hover:text-red-900" onClick={() => setTxnModeFilter('All')} />
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 ml-auto">
                    Showing {filteredTransactions.length} of {transactions.length} records
                  </span>
                </div>
              )}
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
                    <th className="py-3 px-4 font-semibold">Project / Category</th>
                    <th className="py-3 px-4 font-semibold">Mode</th>
                    <th className="py-3 px-4 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                          <Receipt className="w-5 h-5" />
                        </div>
                        <p className="font-semibold text-slate-700">
                          {transactions.length === 0 ? 'No project transactions recorded' : 'No transactions matching selected filter'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {transactions.length === 0 ? (
                            'Click "Create Transaction" to record incoming receipts or disbursements.'
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setTxnTypeFilter('All');
                                setTxnProjectFilter('All');
                                setTxnModeFilter('All');
                                setTxnSearchQuery('');
                              }}
                              className="text-red-600 font-semibold hover:underline cursor-pointer"
                            >
                              Reset filters to view all {transactions.length} transactions
                            </button>
                          )}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 text-slate-600">{t.date}</td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-800">{t.txnCode}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                            t.type === 'INCOME' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                          }`}>
                            {inferTransactionType(t)}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{t.partyName}</td>
                        <td className="py-3 px-4 text-slate-600">
                          <div className="font-medium text-slate-800 truncate max-w-[180px]">{t.projectName || 'General Project'}</div>
                          {t.category && <div className="text-[10px] text-slate-400 truncate max-w-[180px]">{t.category}</div>}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-medium">{t.mode}</td>
                        <td className={`py-3 px-4 text-right font-bold font-mono ${
                          t.type === 'INCOME' ? 'text-emerald-700' : 'text-slate-900'
                        }`}>
                          {t.type === 'INCOME' ? '+' : '-'} ₹{t.amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  )}
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
              <div className="bg-[#FFF1F2] rounded-xl p-5 min-h-[115px] flex flex-col justify-between border border-[#FFE4E6] shadow-2xs hover:shadow-xs transition-all">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide">
                  <div className="w-6 h-6 rounded-full bg-white border border-[#E11D48]/30 flex items-center justify-center shrink-0 shadow-2xs">
                    <ArrowUp className="w-3.5 h-3.5 text-[#E11D48] stroke-[2.5]" />
                  </div>
                  <span className="tracking-tight text-[#E11D48]">Total Operational Expenses</span>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight tracking-tight leading-none">
                    ₹ {expenseMetrics.total.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium block mt-1.5">
                    {expenses.length} vouchers logged
                  </span>
                </div>
              </div>

              {/* Card 2: Materials & Procurement */}
              <div className="bg-[#EFF6FF] rounded-xl p-5 min-h-[115px] flex flex-col justify-between border border-[#DBEAFE] shadow-2xs hover:shadow-xs transition-all">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide">
                  <div className="w-6 h-6 rounded-full bg-white border border-[#2563EB]/30 flex items-center justify-center shrink-0 shadow-2xs">
                    <Building2 className="w-3.5 h-3.5 text-[#2563EB]" />
                  </div>
                  <span className="tracking-tight text-[#2563EB]">Direct Materials</span>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight tracking-tight leading-none">
                    ₹ {expenseMetrics.materials.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium block mt-1.5">
                    Cement, Steel, Aggregates
                  </span>
                </div>
              </div>

              {/* Card 3: Labour & Machinery */}
              <div className="bg-[#FFFBEB] rounded-xl p-5 min-h-[115px] flex flex-col justify-between border border-[#FEF3C7] shadow-2xs hover:shadow-xs transition-all">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide">
                  <div className="w-6 h-6 rounded-full bg-white border border-[#D97706]/30 flex items-center justify-center shrink-0 shadow-2xs">
                    <HardHat className="w-3.5 h-3.5 text-[#D97706]" />
                  </div>
                  <span className="tracking-tight text-[#D97706]">Labour & Machinery</span>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight tracking-tight leading-none">
                    ₹ {expenseMetrics.labourAndMachinery.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium block mt-1.5">
                    Daily wages, JCB & Crane hire
                  </span>
                </div>
              </div>

              {/* Card 4: Site Petty Cash & Sundry */}
              <div className="bg-[#ECFDF5] rounded-xl p-5 min-h-[115px] flex flex-col justify-between border border-[#D1FAE5] shadow-2xs hover:shadow-xs transition-all">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide">
                  <div className="w-6 h-6 rounded-full bg-white border border-[#059669]/30 flex items-center justify-center shrink-0 shadow-2xs">
                    <Wallet className="w-3.5 h-3.5 text-[#059669]" />
                  </div>
                  <span className="tracking-tight text-[#059669]">Site Petty Cash & Utilities</span>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight tracking-tight leading-none">
                    ₹ {expenseMetrics.sitePetty.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium block mt-1.5">
                    Fuel, water tankers, permits
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Action & Filter Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              {/* Left filters: Search, Filter Popover, Quick Category Pills */}
              <div className="flex items-center gap-2.5 flex-wrap flex-1">
                {/* Filter button */}
                <button
                  type="button"
                  onClick={() => setIsExpenseFilterOpen(!isExpenseFilterOpen)}
                  className={`h-9 px-3.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                    expenseStatusFilter !== 'All' || expenseCategoryFilter !== 'All' || expenseProjectFilter !== 'All'
                      ? 'border-red-600 text-red-600 bg-red-50/60'
                      : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50 shadow-2xs'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filter</span>
                  {(expenseStatusFilter !== 'All' || expenseCategoryFilter !== 'All' || expenseProjectFilter !== 'All') && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                  )}
                </button>

                {/* Search input with proper padding and icon alignment */}
                <div className="relative min-w-[240px] sm:min-w-[280px] lg:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search voucher, vendor, project, title..."
                    value={expenseSearchQuery}
                    onChange={e => setExpenseSearchQuery(e.target.value)}
                    className="w-full h-9 pl-10 pr-8 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all shadow-2xs"
                  />
                  {expenseSearchQuery && (
                    <button 
                      type="button"
                      onClick={() => setExpenseSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
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
                      className={`h-9 text-xs font-semibold px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                        expenseCategoryFilter === cat
                          ? 'bg-red-600 text-white shadow-2xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {cat === 'Labour & Daily Wages' ? 'Labour' : cat === 'Machinery & Equipment' ? 'Machinery' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: Export & Record Expense Buttons */}
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleExportExpenses}
                  className="h-9 flex items-center gap-1.5 px-3.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
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
                  className="h-9 flex items-center justify-center gap-2 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Record Expense</span>
                </button>
              </div>
            </div>

            {/* Filter Popover Container */}
            {isExpenseFilterOpen && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-lg flex flex-wrap items-center gap-4 text-xs animate-in fade-in duration-150">
                <div className="min-w-[150px]">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                  <CustomSelect
                    value={expenseStatusFilter}
                    onChange={(val) => setExpenseStatusFilter(val as any)}
                    options={[
                      { label: 'All Statuses', value: 'All' },
                      { label: 'Paid', value: 'Paid', dotColor: 'bg-emerald-500' },
                      { label: 'Approved', value: 'Approved', dotColor: 'bg-blue-500' },
                      { label: 'Pending Approval', value: 'Pending Approval', dotColor: 'bg-amber-500' },
                      { label: 'Rejected', value: 'Rejected', dotColor: 'bg-rose-500' },
                    ]}
                    size="sm"
                    variant="brand"
                  />
                </div>

                <div className="min-w-[180px]">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Category</label>
                  <CustomSelect
                    value={expenseCategoryFilter}
                    onChange={(val) => setExpenseCategoryFilter(val)}
                    options={[
                      { label: 'All Categories', value: 'All' },
                      { label: 'Materials', value: 'Materials' },
                      { label: 'Labour & Daily Wages', value: 'Labour & Daily Wages' },
                      { label: 'Machinery & Equipment', value: 'Machinery & Equipment' },
                      { label: 'Site Petty Cash', value: 'Site Petty Cash' },
                      { label: 'Subcontractor', value: 'Subcontractor' },
                      { label: 'Fuel & Logistics', value: 'Fuel & Logistics' },
                      { label: 'Safety & Compliance', value: 'Safety & Compliance' },
                      { label: 'Utilities & Admin', value: 'Utilities & Admin' },
                    ]}
                    size="sm"
                    variant="brand"
                  />
                </div>

                <div className="min-w-[200px]">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Project</label>
                  <CustomSelect
                    value={expenseProjectFilter}
                    onChange={(val) => setExpenseProjectFilter(val)}
                    options={[
                      { label: 'All Projects', value: 'All' },
                      ...projects.map(p => ({ label: p.name, value: p.name })),
                    ]}
                    size="sm"
                    variant="brand"
                  />
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
                    className="px-4 py-1.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 cursor-pointer"
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
                        <div className="w-11 h-11 rounded-lg bg-red-600 text-white flex flex-col items-center justify-center shrink-0 shadow-2xs">
                          <span className="text-[10px] font-bold tracking-tight text-white/95 leading-none">
                            {exp.date.split(' ').slice(0, 2).join(' ')}
                          </span>
                          <Receipt className="w-3.5 h-3.5 text-white/90 mt-1 stroke-[2.2]" />
                        </div>

                        {/* Title & Payee / Voucher Code */}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-900 group-hover:text-red-600 transition-colors truncate">
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
                              ? 'bg-[#FEF2F2] text-red-600 border border-red-200'
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
                  <span>Total: <strong className="text-red-600">₹{expenseMetrics.total.toLocaleString('en-IN')}</strong></span>
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
                  <div className="w-8 h-8 rounded-lg bg-red-600/10 text-red-600 flex items-center justify-center">
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
                  Inter-account contra transfers
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
                  <Landmark className="w-4 h-4 text-red-600" />
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
                    className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs hover:border-red-600/60 hover:shadow-xs transition-all flex items-center justify-between group cursor-pointer"
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
                      <span className="text-[10px] font-semibold text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
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
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-500 transition-all"
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
                          ? 'border-red-600 bg-red-600/10 text-red-600'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Filter className="w-3.5 h-3.5" />
                      <span>Filter</span>
                      {(transferAccountFilter !== 'All' || transferStatusFilter !== 'All') && (
                        <span className="w-2 h-2 rounded-full bg-red-600" />
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
                            className="text-[11px] text-red-600 font-medium hover:underline cursor-pointer"
                          >
                            Reset All
                          </button>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">Account Involved</label>
                          <CustomSelect
                            value={transferAccountFilter}
                            onChange={(val) => setTransferAccountFilter(val)}
                            options={[
                              { label: 'All Bank & Cash Accounts', value: 'All' },
                              ...bankAccounts.map(b => ({ label: b.accountName, value: b.id })),
                            ]}
                            size="sm"
                            variant="brand"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">Status</label>
                          <CustomSelect
                            value={transferStatusFilter}
                            onChange={(val) => setTransferStatusFilter(val as any)}
                            options={[
                              { label: 'All Statuses', value: 'All' },
                              { label: 'Completed', value: 'Completed', dotColor: 'bg-emerald-500' },
                              { label: 'Pending Verification', value: 'Pending Verification', dotColor: 'bg-amber-500' },
                              { label: 'Rejected', value: 'Rejected', dotColor: 'bg-rose-500' },
                            ]}
                            size="sm"
                            variant="brand"
                          />
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setIsTransferFilterOpen(false)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-xs font-semibold cursor-pointer"
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
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
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
                              : 'Record contra transfers between connected bank accounts and site petty cash vaults.'}
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsNewTransferModalOpen(true)}
                            className="mt-4 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                          >
                            + Record Transfer
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredTransfers.map(trf => (
                        <tr key={trf.id} className="hover:bg-slate-50/70 transition-colors group">
                          
                          {/* Voucher Code & Date */}
                          <td className="py-3.5 px-4 tracking-tight">
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
                              <ArrowRight className="w-3.5 h-3.5 text-red-600" />
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
                            <span className="text-[11px] tracking-tight text-slate-500 block mt-1 truncate max-w-[130px]" title={trf.referenceNo}>
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
                            <span className="text-sm font-bold text-slate-900 block tracking-tight">
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
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-600 hover:bg-red-600/5 transition-colors cursor-pointer inline-flex items-center gap-1"
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
                  <span>Filtered Sum: <strong className="text-slate-900 tracking-tight">₹{filteredTransfers.reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-IN')}</strong></span>
                  <span>Total Completed: <strong className="text-red-600 tracking-tight">₹{transferMetrics.totalTransferred.toLocaleString('en-IN')}</strong></span>
                </div>
              </div>
            </div>

          </div>
        )}


        {/* ═════════════════════════════════════════════════════════════
            TAB 5: ACCOUNTS (Bank & Cash Accounts + Detailed Account Cards)
        ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'accounts' && (
          <div className="space-y-6">
            {statementActiveAccountId ? (
              /* ═══════════════════════════════════════════════════════════
                 VIEW B: ACCOUNT STATEMENT VIEW (Matching Image 2 + Audio)
              ═══════════════════════════════════════════════════════════ */
              <div className="space-y-6">
                
                {/* 1. Statement Top Bar: Back Button, Account Switcher & Date Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Back to Accounts List */}
                    <button
                      type="button"
                      onClick={() => setStatementActiveAccountId(null)}
                      className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
                      title="Back to Cash & Bank Accounts"
                    >
                      <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                    </button>

                    {/* Account Selector Pill with Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsAccountSelectorOpen(prev => !prev)}
                        className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs text-xs sm:text-sm font-bold text-slate-800 transition-all cursor-pointer"
                      >
                        <div className="w-6 h-6 rounded-md bg-[#eaf7f2] border border-[#bce8d5] text-[#00875a] flex items-center justify-center shrink-0">
                          {activeStatementAccount?.isCash ? (
                            <Wallet className="w-3.5 h-3.5 text-[#00875a]" />
                          ) : (
                            <Landmark className="w-3.5 h-3.5 text-indigo-600" />
                          )}
                        </div>
                        <span>{activeStatementAccount?.name}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      </button>

                      {isAccountSelectorOpen && (
                        <div className="absolute left-0 top-full mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                          <div className="px-3.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Select Account Statement
                          </div>
                          
                          {/* Cash Account Option */}
                          <button
                            type="button"
                            onClick={() => {
                              setStatementActiveAccountId('cash');
                              setIsAccountSelectorOpen(false);
                            }}
                            className={`w-full px-3.5 py-2 text-left flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                              statementActiveAccountId === 'cash' ? 'bg-red-50/60 font-bold text-red-600' : 'text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded bg-[#eaf7f2] border border-[#bce8d5] text-[#00875a] flex items-center justify-center shrink-0">
                                <Wallet className="w-3.5 h-3.5 text-[#00875a]" />
                              </div>
                              <span className="text-xs">Cash Account</span>
                            </div>
                            <span className="text-[11px] tracking-tight font-semibold text-slate-500">₹ {cashClosingBalance.toLocaleString('en-IN')}</span>
                          </button>

                          {/* Bank Accounts List */}
                          {bankAccounts.map(ba => (
                            <button
                              key={ba.id}
                              type="button"
                              onClick={() => {
                                setStatementActiveAccountId(ba.id);
                                setIsAccountSelectorOpen(false);
                              }}
                              className={`w-full px-3.5 py-2 text-left flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                                statementActiveAccountId === ba.id ? 'bg-red-50/60 font-bold text-red-600' : 'text-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                  <Landmark className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <span className="text-xs block font-medium">{ba.bankName}</span>
                                  {ba.isPrimary && (
                                    <span className="text-[9px] font-bold uppercase text-[#5932ea] bg-[#ececfd] px-1 py-0.2 rounded">PRIMARY</span>
                                  )}
                                </div>
                              </div>
                              <span className="text-[11px] tracking-tight font-semibold text-slate-500">
                                ₹ {ba.balance.toLocaleString('en-IN')}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Date Filter Trigger & Active Filter Badge */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={handleOpenDateFilterModal}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border shadow-2xs text-xs font-semibold cursor-pointer transition-all ${
                        statementDateFilter !== 'all'
                          ? 'border-[#5932ea]/40 bg-[#ececfd] text-[#5932ea] hover:bg-[#e4e4fc]'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Date Filter</span>
                      {statementDateFilter !== 'all' && (
                        <span className="w-2 h-2 rounded-full bg-[#5932ea]" />
                      )}
                    </button>

                    {statementDateFilter !== 'all' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#ececfd] text-[#5932ea] border border-[#5932ea]/20">
                        <span>
                          {DATE_FILTER_PRESET_OPTIONS.find(p => p.id === statementDateFilter)?.label || 
                           `${toDisplayDate(customStartDate) || 'Start'} to ${toDisplayDate(customEndDate) || 'End'}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setStatementDateFilter('all');
                            setCustomStartDate('');
                            setCustomEndDate('');
                            if (onShowToast) onShowToast('Date filter reset to All');
                          }}
                          className="p-0.5 hover:bg-[#5932ea]/15 rounded cursor-pointer transition-colors"
                          title="Clear date filter"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Four KPI Summary Cards (Matching Image 2) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: OPENING BALANCE */}
                  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[96px]">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      OPENING BALANCE
                    </span>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight tracking-tight mt-1.5">
                      ₹ {activeStatementAccount?.openingBalance.toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Card 2: TOTAL CREDIT */}
                  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[96px]">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      TOTAL CREDIT
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight tracking-tight mt-1.5">
                      ₹ {statementPeriodCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Card 3: TOTAL DEBIT */}
                  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[96px]">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      TOTAL DEBIT
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-red-600 tracking-tight tracking-tight mt-1.5">
                      ₹ {statementPeriodDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Card 4: CLOSING BALANCE */}
                  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[96px]">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      CLOSING BALANCE
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-[#5932ea] tracking-tight tracking-tight mt-1.5">
                      {(() => {
                        const val = statementPeriodClosing;
                        const isNeg = val < 0;
                        const formatted = Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        return isNeg ? `₹ -${formatted}` : `₹ ${formatted}`;
                      })()}
                    </div>
                  </div>
                </div>

                {/* 3. Detailed Statement Transactions Table (with extra Credit/Debit column & Project info) */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200/80 bg-slate-50/50">
                          <th className="px-5 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
                            Payment Type
                          </th>
                          <th className="px-5 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
                            Project / Source Account
                          </th>
                          <th className="px-5 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
                            Details
                          </th>
                          <th className="px-5 py-3.5 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-5 py-3.5 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStatementTransactions.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-xs">
                              No statement entries found for this period.
                            </td>
                          </tr>
                        ) : (
                          filteredStatementTransactions.map(txn => (
                            <tr key={txn.id} className="hover:bg-slate-50/70 transition-colors">
                              {/* 1. Payment Type Column */}
                              <td className="px-5 py-4 whitespace-nowrap align-top">
                                <div className="flex items-start gap-3">
                                  {/* Date Badge */}
                                  <div className={`w-12 h-11 rounded-lg shrink-0 flex flex-col items-center justify-center text-[9px] font-bold border ${
                                    txn.type === 'Credit'
                                      ? 'bg-[#ebf8ee] border-[#b7ebc7] text-[#288448]'
                                      : 'bg-[#ffedee] border-[#ffc9cb] text-[#d93845]'
                                  }`}>
                                    <span>{txn.date}</span>
                                    {txn.type === 'Credit' ? (
                                      <ArrowDownRight className="w-3.5 h-3.5 text-[#288448] stroke-[2.5]" />
                                    ) : (
                                      <ArrowUpRight className="w-3.5 h-3.5 text-[#d93845] stroke-[2.5]" />
                                    )}
                                  </div>
                                  <div>
                                    <span className="font-bold text-xs sm:text-sm text-slate-800 block">
                                      {txn.partyName}
                                    </span>
                                    <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                                      {txn.paymentType} | {txn.voucherCode}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* 2. Project / Source Account Column */}
                              <td className="px-5 py-4 align-top max-w-sm">
                                <div className="text-xs font-medium text-slate-800 leading-snug line-clamp-2">
                                  {txn.projectName}
                                </div>
                                <div className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                  <span>Account:</span>
                                  <strong className="text-slate-700">{txn.sourceAccountName}</strong>
                                </div>
                              </td>

                              {/* 3. Details Column */}
                              <td className="px-5 py-4 align-top text-xs text-slate-600 max-w-xs">
                                {txn.details || '—'}
                              </td>

                              {/* 4. Type Column (Extra Column as requested) */}
                              <td className="px-5 py-4 align-top text-center whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                  txn.type === 'Credit'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {txn.type === 'Credit' ? (
                                    <>
                                      <ArrowDown className="w-3 h-3 stroke-[3]" />
                                      <span>Credit</span>
                                    </>
                                  ) : (
                                    <>
                                      <ArrowUp className="w-3 h-3 stroke-[3]" />
                                      <span>Debit</span>
                                    </>
                                  )}
                                </span>
                              </td>

                              {/* 5. Amount Column */}
                              <td className="px-5 py-4 align-top text-right whitespace-nowrap">
                                <div className="font-bold text-xs sm:text-sm text-slate-900 tracking-tight">
                                  ₹ {txn.amount.toLocaleString('en-IN')}
                                </div>
                                <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                                  {txn.paymentMode}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            ) : (
              /* ═══════════════════════════════════════════════════════════
                 VIEW A: COMPANY CASH & BANK ACCOUNTS (Matching Image 1)
              ═══════════════════════════════════════════════════════════ */
              <div className="space-y-6">
                
                {/* 1. Header Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    Company Cash & Bank Accounts
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsAddAccountModalOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#5932ea] hover:bg-[#4d2ad4] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>New Bank Account</span>
                  </button>
                </div>

                {/* 2. CASH ACCOUNT SECTION */}
                <div>
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                    CASH ACCOUNT
                  </h3>

                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                    {/* Left: Wallet Icon & Name */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-lg bg-[#eaf7f2] border border-[#bce8d5] text-[#00875a] flex items-center justify-center shrink-0 shadow-2xs">
                        <Wallet className="w-5 h-5 text-[#00875a]" />
                      </div>
                      <span className="font-bold text-sm sm:text-base text-slate-900">
                        Cash Account
                      </span>
                    </div>

                    {/* Right: Closing Balance, View Statement & Edit Opening Balance */}
                    <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
                      <span className="font-bold text-base sm:text-lg text-slate-900 tracking-tight tracking-tight mr-1">
                        {(() => {
                          const isNeg = cashClosingBalance < 0;
                          const formatted = Math.abs(cashClosingBalance).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          });
                          return isNeg ? `₹ -${formatted}` : `₹ ${formatted}`;
                        })()}
                      </span>

                      <button
                        type="button"
                        onClick={() => setStatementActiveAccountId('cash')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs"
                      >
                        <span>View Statement</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>

                      {/* Edit Opening Balance Button (Replaces three-dot icon as requested) */}
                      <button
                        type="button"
                        onClick={() => {
                          setOpeningBalanceModal({
                            isOpen: true,
                            accountId: 'cash',
                            accountName: 'Cash Account',
                            currentAmount: cashOpeningBalance,
                          });
                          setOpeningBalanceInput(cashOpeningBalance.toString());
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Pencil className="w-3.5 h-3.5 text-slate-400" />
                        <span>Edit Opening Balance</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. BANK ACCOUNTS SECTION (Column Style Cards Layout) */}
                <div>
                  {/* Top Search & Filter Bar */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 mb-4 mt-2">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={accountSearchQuery}
                        onChange={e => setAccountSearchQuery(e.target.value)}
                        placeholder="Search by holder, bank, ifsc, account no, UPI..."
                        className="w-full pl-10 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-500 shadow-2xs"
                      />
                      {accountSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setAccountSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Filter Pills & Date Filter */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {(['All', 'Current', 'Savings', 'Escrow', 'Petty Cash'] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setAccountTypeFilter(type)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            accountTypeFilter === type
                              ? 'bg-red-600 text-white shadow-2xs'
                              : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                          }`}
                        >
                          {type}
                        </button>
                      ))}

                      {/* Date Filter Button */}
                      <button
                        type="button"
                        onClick={handleOpenDateFilterModal}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border shrink-0 ${
                          statementDateFilter !== 'all'
                            ? 'bg-[#ececfd] text-[#5932ea] border-[#5932ea]/40'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Date Filter</span>
                        {statementDateFilter !== 'all' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#5932ea]" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Column Style Cards List */}
                  <div className="space-y-3.5">
                    {filteredBankAccounts.length === 0 ? (
                      <div className="bg-white rounded-xl border border-slate-200 p-10 text-center shadow-2xs">
                        <Landmark className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <h4 className="text-sm font-bold text-slate-800">No bank accounts match your search</h4>
                        <p className="text-xs text-slate-500 mt-1">Try resetting your filters or search keywords.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setAccountSearchQuery('');
                            setAccountTypeFilter('All');
                          }}
                          className="mt-3 px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg shadow-2xs hover:bg-red-700 cursor-pointer"
                        >
                          Reset Filters
                        </button>
                      </div>
                    ) : (
                      filteredBankAccounts.map(ba => {
                        const isIdbi = ba.bankName.toLowerCase().includes('idbi');
                        const isAxis = ba.bankName.toLowerCase().includes('axis');
                        const isHdfc = ba.bankName.toLowerCase().includes('hdfc');
                        const isSbi = ba.bankName.toLowerCase().includes('sbi') || ba.bankName.toLowerCase().includes('state bank');

                        return (
                          <div
                            key={ba.id}
                            className={`bg-white rounded-xl p-5 shadow-2xs transition-all hover:border-slate-300 ${
                              ba.isPrimary ? 'border-2 border-[#5932ea] ring-1 ring-[#5932ea]/20' : 'border border-slate-200'
                            }`}
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 items-center">
                              
                              {/* Column 1: Bank Info, Type & Address (lg:col-span-3) */}
                              <div className="lg:col-span-3 flex items-start gap-3.5">
                                {/* Bank Logo */}
                                {isHdfc ? (
                                  <div className="w-10 h-10 rounded-lg bg-[#004B8D] text-white flex items-center justify-center shrink-0 font-black text-[10px] shadow-2xs">
                                    HDFC
                                  </div>
                                ) : isSbi ? (
                                  <div className="w-10 h-10 rounded-lg bg-[#280071] text-white flex items-center justify-center shrink-0 font-black text-[10px] shadow-2xs">
                                    SBI
                                  </div>
                                ) : isIdbi ? (
                                  <div className="w-10 h-10 rounded-lg bg-[#005C46] flex items-center justify-center shrink-0 shadow-2xs">
                                    <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
                                      <circle cx="16" cy="16" r="14" fill="#005C46" stroke="#cce6dd" strokeWidth="1.5" />
                                      <path d="M16 8V24" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                                      <path d="M10 14L16 8L22 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                      <circle cx="16" cy="16" r="3" fill="#ff7a00" />
                                    </svg>
                                  </div>
                                ) : isAxis ? (
                                  <div className="w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0">
                                    <div className="w-10 h-7 rounded-md bg-[#861F41] flex items-center justify-center shadow-2xs">
                                      <svg viewBox="0 0 36 28" className="w-6 h-5" fill="none">
                                        <path d="M7 24L17 5L22 5L12 24H7Z" fill="white" />
                                        <path d="M18 24L24 13L27 18L24 24H18Z" fill="white" />
                                      </svg>
                                    </div>
                                    <span className="text-[6.5px] font-black text-[#861F41] tracking-tighter mt-0.5">AXIS BANK</span>
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0 font-bold text-xs shadow-2xs">
                                    <Landmark className="w-5 h-5 text-red-600" />
                                  </div>
                                )}

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h4 className="font-bold text-sm sm:text-base text-slate-900 leading-tight">
                                      {ba.bankName}
                                    </h4>
                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                      {ba.accountType}
                                    </span>
                                    {ba.isPrimary && (
                                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#ececfd] text-[#5932ea]">
                                        PRIMARY
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-start gap-1 text-[11px] text-slate-500 mt-1 leading-snug">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                    <span className="line-clamp-2" title={ba.bankAddress}>
                                      {ba.bankAddress || 'Branch address not specified'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold mt-1.5">
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>{ba.tallyLedgerName || `${ba.bankName} Ledger`}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Column 2: Account Holder & UPI (lg:col-span-3 lg:border-l border-slate-100 lg:pl-5) */}
                              <div className="lg:col-span-3 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-5 space-y-2.5">
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    ACCOUNT HOLDER
                                  </span>
                                  <span className="text-xs font-bold text-slate-900 block truncate mt-0.5" title={ba.accountHolderName || ba.accountName}>
                                    {ba.accountHolderName || ba.accountName}
                                  </span>
                                  {ba.accountName && ba.accountHolderName && ba.accountName !== ba.accountHolderName && (
                                    <span className="text-[10px] text-slate-500 font-medium block truncate mt-0.5" title={ba.accountName}>
                                      Alias: {ba.accountName}
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    UPI ID / NUMBER
                                  </span>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-xs font-semibold text-slate-800 tracking-tight truncate">
                                      {ba.upiNumber || '--'}
                                    </span>
                                    {ba.upiNumber && (
                                      <button
                                        type="button"
                                        onClick={() => handleCopyAccountData(ba.upiNumber || '', 'UPI ID')}
                                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                        title="Copy UPI ID"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Column 3: Account Number & IFSC / IBAN (lg:col-span-3 lg:border-l border-slate-100 lg:pl-5) */}
                              <div className="lg:col-span-3 border-t lg:border-t-0 lg:border-l border-slate-100 pt-3 lg:pt-0 lg:pl-5 space-y-2.5">
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    ACCOUNT NUMBER
                                  </span>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-xs font-bold text-slate-900 tracking-tight tracking-wider">
                                      {ba.accountNumber}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyAccountData(ba.accountNumber, 'Account Number')}
                                      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                      title="Copy Account Number"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    IFSC CODE
                                  </span>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-xs font-semibold text-slate-800 tracking-tight uppercase">
                                      {ba.ifscCode || '--'}
                                    </span>
                                    {ba.ifscCode && (
                                      <button
                                        type="button"
                                        onClick={() => handleCopyAccountData(ba.ifscCode, 'IFSC Code')}
                                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                        title="Copy IFSC Code"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {ba.ibanNumber ? (
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                      IBAN NUMBER
                                    </span>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-[11px] tracking-tight text-slate-700 block truncate" title={ba.ibanNumber}>
                                        {ba.ibanNumber}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyAccountData(ba.ibanNumber || '', 'IBAN Number')}
                                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                        title="Copy IBAN Number"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ) : null}
                              </div>

                              {/* Column 4: Balances & Actions (lg:col-span-3 lg:border-l border-slate-100 lg:pl-5) */}
                              <div className="lg:col-span-3 border-t lg:border-t-0 lg:border-l border-slate-100 pt-3 lg:pt-0 lg:pl-5 flex flex-col justify-between">
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    AVAILABLE BALANCE
                                  </span>
                                  <div className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight tracking-tight mt-0.5">
                                    ₹ {ba.balance.toLocaleString('en-IN')}
                                  </div>

                                  <div className="flex items-center gap-2.5 text-[11px] text-slate-500 mt-1 flex-wrap">
                                    <span>
                                      OD: <strong className="text-slate-700 tracking-tight">{ba.overdraftLimit ? `₹ ${ba.overdraftLimit.toLocaleString('en-IN')}` : 'Nil'}</strong>
                                    </span>
                                    <span>•</span>
                                    <span>
                                      Opening: <strong className="text-slate-700 tracking-tight">₹ {(ba.openingBalance || 0).toLocaleString('en-IN')}</strong>
                                    </span>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2 mt-4 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => setStatementActiveAccountId(ba.id)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs"
                                  >
                                    <span>Statement</span>
                                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpeningBalanceModal({
                                        isOpen: true,
                                        accountId: ba.id,
                                        accountName: ba.bankName,
                                        currentAmount: ba.openingBalance || 0,
                                      });
                                      setOpeningBalanceInput((ba.openingBalance || 0).toString());
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs"
                                    title="Edit Opening Balance"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Opening</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNewTrfFromAccountId(ba.id);
                                      const otherAcc = bankAccounts.find(x => x.id !== ba.id);
                                      if (otherAcc) setNewTrfToAccountId(otherAcc.id);
                                      setActiveTab('account_transfer');
                                      setIsNewTransferModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
                                  >
                                    <span>Transfer</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </button>

                                  {/* More Menu Dropdown */}
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={() => setOpenCardMenuId(openCardMenuId === ba.id ? null : ba.id)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </button>
                                    {openCardMenuId === ba.id && (
                                      <>
                                        <div
                                          className="fixed inset-0 z-20 cursor-default"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenCardMenuId(null);
                                          }}
                                        />
                                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 animate-in fade-in zoom-in-95 duration-100 text-xs">
                                          {!ba.isPrimary && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setBankAccounts(prev => prev.map(b => ({ ...b, isPrimary: b.id === ba.id })));
                                                setOpenCardMenuId(null);
                                                if (onShowToast) onShowToast(`${ba.bankName} marked as Primary Account`);
                                              }}
                                              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
                                            >
                                              Set as Primary
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              handleDeleteAccount(ba.id, ba.accountName);
                                              setOpenCardMenuId(null);
                                            }}
                                            className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 font-medium cursor-pointer"
                                          >
                                            Delete Account
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 4. Tally / Zoho Integration Banner */}
                <div className="bg-gradient-to-r from-red-50 to-indigo-50/60 rounded-xl border border-red-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-red-600 text-white shrink-0 shadow-sm">
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
                    className="px-4 py-2 rounded-lg bg-white border border-red-600 text-red-600 hover:bg-red-50 text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
                  >
                    Configure Sync
                  </button>
                </div>

              </div>
            )}
          </div>
        )}
      </div>


      {/* ─────────────────────────────────────────────────────────────
          4. MODALS & POPUPS
      ───────────────────────────────────────────────────────────── */}

      {/* ─── CREATE PAYMENT REQUEST 2-STEP FLOW (Images 1 & 2 Reference, Red & White Theme) ─── */}
      <CreatePaymentRequestDrawerFlow
        isOpen={isNewRequestModalOpen}
        onClose={() => setIsNewRequestModalOpen(false)}
        projects={projects}
        parties={parties}
        existingRequestsCount={paymentRequests.length}
        onSaveSuccess={handleSavePaymentRequestFromFlow}
      />


      {/* ─── PAYMENT REQUEST OVERVIEW DRAWER (Exact match to Image 4, Red & White Theme) ─── */}
      <PaymentRequestOverviewDrawer
        isOpen={Boolean(selectedRequestDetails)}
        onClose={() => setSelectedRequestDetails(null)}
        request={selectedRequestDetails}
        onStatusChange={handleUpdatePaymentRequestStatus}
        onRecordPayment={handleRecordPaymentFromDrawer}
        onDelete={(id) => {
          setPaymentRequests(prev => prev.filter(r => r.id !== id));
          if (onShowToast) onShowToast('Payment request deleted');
        }}
      />


      {/* MODAL C: BOOK DEMO */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-600" />
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
                <input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs" />
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button onClick={() => setIsDemoModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-500">Cancel</button>
              <button 
                onClick={() => {
                  setIsDemoModalOpen(false);
                  if (onShowToast) onShowToast('Demo session scheduled! Our specialist will reach out.');
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg"
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
                <Boxes className="w-4 h-4 text-red-600" />
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
                  <span className="text-[11px] text-slate-500">Organization ID: BOOSHNAM-BOOKS-IN</span>
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
                className="px-4 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg flex items-center gap-1.5"
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
                <Gift className="w-4 h-4 text-red-600" />
                <h3 className="text-sm font-bold text-slate-900">Refer & Earn ₹5,000</h3>
              </div>
              <button onClick={() => setIsReferModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Invite fellow builders, developers, or subcontractors to Booshnam Software and earn ₹5,000 credit on every active project registration.
            </p>
            <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs flex items-center justify-between">
              <span className="tracking-tight text-red-900 font-bold">BOOSHNAM-FIN-2026</span>
              <button 
                onClick={() => {
                  navigator.clipboard?.writeText('https://booshnam.com/join?ref=BOOSHNAM-FIN-2026');
                  if (onShowToast) onShowToast('Referral link copied to clipboard!');
                }}
                className="text-[11px] font-bold text-red-600 hover:underline"
              >
                Copy Link
              </button>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setIsReferModalOpen(false)} className="px-4 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg">
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
              {projects.length === 0 ? (
                <div className="p-4 text-center text-slate-400">
                  <p>No active project data available</p>
                </div>
              ) : (
                projects.slice(0, 5).map((proj, idx) => (
                  <div
                    key={proj.id || idx}
                    className={`p-2.5 rounded-lg border flex items-center justify-between ${
                      idx === 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className={`font-bold ${idx === 0 ? 'text-amber-900' : 'text-slate-800'}`}>
                      #{idx + 1} {proj.name}
                    </span>
                    <span className="font-semibold text-emerald-700">Active</span>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end">
              <button onClick={() => setIsLeaderboardModalOpen(false)} className="px-4 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg">
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
                      selectedPartyRecord.type === 'Staff' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
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

            <div className="h-1 bg-red-600 w-full shrink-0" />

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
                  <span className="font-semibold text-slate-800">{selectedPartyRecord.dateOfJoining || '—'}</span>
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
                  <span className="tracking-tight font-semibold text-slate-800">
                    {selectedPartyRecord.aadhaarNumber ? `•••• •••• ${selectedPartyRecord.aadhaarNumber.slice(-4)}` : '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-500">PAN Card</span>
                  <span className="tracking-tight font-semibold text-slate-800">
                    {selectedPartyRecord.panNumber ? selectedPartyRecord.panNumber : '—'}
                  </span>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setActivePartyOverview(selectedPartyRecord);
                    setSelectedPartyRecord(null);
                  }}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm text-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Full Party Ledger & Activities</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewPartyName(selectedPartyRecord.name);
                    setSelectedPartyRecord(null);
                    setIsNewRequestModalOpen(true);
                  }}
                  className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Payment Request for {selectedPartyRecord.name}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewTxnParty(selectedPartyRecord.name);
                    if (selectedPartyRecord.type === 'Client') {
                      setNewTxnType('INCOME');
                      setNewTxnCategory('Client Payment');
                    } else {
                      setNewTxnType('EXPENSE');
                      setNewTxnCategory(selectedPartyRecord.type === 'Staff' ? 'Labour & Daily Wages' : 'Material Purchase');
                    }
                    setSelectedPartyRecord(null);
                    setIsRecordTxnModalOpen(true);
                  }}
                  className="w-full py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
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
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Record Cashbook Transaction</h3>
                <p className="text-[11px] text-slate-500">Record incoming receipts or outgoing disbursements for any party</p>
              </div>
              <button onClick={() => setIsRecordTxnModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveTransaction} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Transaction Type *</label>
                  <CustomSelect
                    value={newTxnType}
                    onChange={(val) => {
                      const t = val as 'INCOME' | 'EXPENSE';
                      setNewTxnType(t);
                      if (t === 'INCOME') {
                        setNewTxnCategory('Client Payment');
                      } else {
                        setNewTxnCategory('Material Purchase');
                      }
                    }}
                    options={[
                      { label: 'Expense / Outflow (Disbursement)', value: 'EXPENSE', dotColor: 'bg-rose-500' },
                      { label: 'Income / Inflow (Receipt)', value: 'INCOME', dotColor: 'bg-emerald-500' },
                    ]}
                    size="md"
                    variant="brand"
                  />
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-red-600 tracking-tight font-medium"
                  />
                </div>
              </div>

              {/* Party Selection Dropdown / Custom Switcher */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">Party Name *</label>
                  {parties.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsCustomPartyInput(!isCustomPartyInput)}
                      className="text-[11px] font-semibold text-red-600 hover:underline cursor-pointer"
                    >
                      {isCustomPartyInput ? '← Select from registered parties' : '+ Enter custom party name'}
                    </button>
                  )}
                </div>
                {!isCustomPartyInput && parties.length > 0 ? (
                  <CustomSelect
                    value={newTxnParty}
                    onChange={(val) => {
                      setNewTxnParty(val);
                      const matched = parties.find(p => p.name === val);
                      if (matched) {
                        if (matched.type === 'Client') {
                          setNewTxnType('INCOME');
                          setNewTxnCategory('Client Payment');
                        } else {
                          setNewTxnType('EXPENSE');
                          setNewTxnCategory(matched.type === 'Staff' ? 'Labour & Daily Wages' : 'Material Purchase');
                        }
                      }
                    }}
                    options={parties.map(p => ({
                      label: p.name,
                      value: p.name,
                      badge: p.type,
                      description: `${p.phone ? `${p.phone} • ` : ''}Balance: ₹${p.balanceDue.toLocaleString('en-IN')}`
                    }))}
                    placeholder="Select registered party..."
                    size="md"
                    variant="brand"
                  />
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="e.g. Client / Vendor Name"
                    value={newTxnParty}
                    onChange={e => setNewTxnParty(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-red-600"
                  />
                )}
              </div>

              {/* Project & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <CustomSelect
                    value={newTxnCategory}
                    onChange={(val) => setNewTxnCategory(val)}
                    options={newTxnType === 'INCOME' ? [
                      'Client Payment',
                      'Advance Receipt',
                      'Milestone Billing Receipt',
                      'Mobilization Advance',
                      'Retention Release Receipt',
                      'Rental Income',
                      'Other Cash Inflow'
                    ] : [
                      'Material Purchase',
                      'Vendor Payment',
                      'Subcontractor Payout',
                      'Labour & Daily Wages',
                      'Site Petty Cash',
                      'Machinery & Fuel Hire',
                      'Permit & Regulatory Fees',
                      'Utilities & Admin',
                      'Other Operational Outflow'
                    ]}
                    size="md"
                    variant="brand"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Project</label>
                  <CustomSelect
                    value={newTxnProject}
                    onChange={(val) => setNewTxnProject(val)}
                    options={projects.length > 0 ? projects.map(p => ({ label: p.name, value: p.name })) : ['Booshnam Construction Project']}
                    placeholder="Select Project..."
                    size="md"
                    variant="brand"
                  />
                </div>
              </div>

              {/* Payment Mode & Reference */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                  <CustomSelect
                    value={newTxnMode}
                    onChange={(val) => setNewTxnMode(val as any)}
                    options={[
                      { label: 'NEFT / RTGS', value: 'NEFT/RTGS' },
                      { label: 'UPI', value: 'UPI' },
                      { label: 'Cheque', value: 'CHEQUE' },
                      { label: 'Cash', value: 'CASH' },
                    ]}
                    size="md"
                    variant="brand"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reference No / UTR</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR / Cheque No"
                    value={newTxnRef}
                    onChange={e => setNewTxnRef(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsRecordTxnModalOpen(false)} className="px-3.5 py-2 text-xs text-slate-500 hover:text-slate-800 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm cursor-pointer transition-all">
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ─── CREATE TRANSACTION FLOW (Images 1, 2, 3 Reference) ─── */}
      <CreateTransactionModalFlow
        isOpen={isCreateTxnFlowOpen}
        currentStep={createTxnFlowStep}
        onClose={() => setIsCreateTxnFlowOpen(false)}
        projects={projects}
        parties={parties}
        bankAccounts={bankAccounts}
        existingTransactionsCount={transactions.length}
        onSaveSuccess={handleSaveTransactionFromFlow}
      />

      {/* ─── ADD ACCOUNT DRAWER (Side Navigation Bar matching Reference) ─── */}
      <AddAccountDrawer
        isOpen={isAddAccountModalOpen}
        onClose={() => setIsAddAccountModalOpen(false)}
        onSaveAccount={handleSaveAccountFromDrawer}
      />

      {/* ─────────────────────────────────────────────────────────────
          MODAL: EDIT OPENING BALANCE (Matching Image 2 Reference)
      ───────────────────────────────────────────────────────────── */}
      {openingBalanceModal && openingBalanceModal.isOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setOpeningBalanceModal(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-[340px] sm:max-w-[360px] p-5 animate-in fade-in zoom-in-95 duration-150 m-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Title & Close Button */}
            <div className="flex items-center justify-between pb-3">
              <h3 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">
                Opening Balance
              </h3>
              <button
                type="button"
                onClick={() => setOpeningBalanceModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 stroke-[2]" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveOpeningBalance();
              }}
              className="space-y-4 pt-1"
            >
              {/* Floating Notch Amount Input Box */}
              <div className="relative mt-2">
                <div className="relative border-2 border-red-600 rounded-xl focus-within:ring-2 focus-within:ring-red-500/20 transition-all bg-white px-3.5 py-2.5">
                  {/* Floating Notch Label */}
                  <span className="absolute -top-2.5 left-3.5 px-1.5 bg-white text-[10px] font-bold text-red-600 uppercase tracking-wider select-none">
                    AMOUNT
                  </span>
                  <input
                    type="number"
                    step="any"
                    autoFocus
                    placeholder="0"
                    value={openingBalanceInput}
                    onChange={(e) => setOpeningBalanceInput(e.target.value)}
                    className="w-full bg-transparent text-slate-900 text-lg sm:text-xl font-medium focus:outline-none"
                  />
                </div>
              </div>

              {/* Bottom Right Save Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: DATE FILTER (Matching Attached Reference Image)
      ───────────────────────────────────────────────────────────── */}
      {isDateFilterModalOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setIsDateFilterModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-[360px] sm:max-w-[380px] overflow-hidden animate-in fade-in zoom-in-95 duration-150 m-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Title & Close Button */}
            <div className="px-5 pt-4 pb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800 tracking-tight">
                Date Filter
              </h3>
              <button
                type="button"
                onClick={() => setIsDateFilterModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 stroke-[2]" />
              </button>
            </div>

            {/* Purple Horizontal Divider Bar - Edge to Edge */}
            <div className="w-full h-[3px] bg-[#5932ea]" />

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-3.5">
              {/* Start Date & End Date Pickers Row */}
              <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                {/* START DATE */}
                <div className="relative border-2 border-slate-200 rounded-xl px-3 py-2 hover:border-slate-300 focus-within:border-[#5932ea] transition-all bg-white">
                  <span className="absolute -top-2.5 left-3 bg-white px-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider select-none">
                    START DATE
                  </span>
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={inputStartDisplay}
                      onChange={(e) => {
                        const val = e.target.value;
                        setInputStartDisplay(val);
                        const iso = toIsoDate(val);
                        if (iso.length === 10) setTempStartDate(iso);
                        setTempDatePreset('custom');
                      }}
                      placeholder="dd-mm-yyyy"
                      className="w-full text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none bg-transparent"
                    />
                    <label className="cursor-pointer text-slate-800 hover:text-[#5932ea] ml-1 shrink-0 relative flex items-center">
                      <Calendar className="w-3.5 h-3.5" />
                      <input
                        type="date"
                        value={tempStartDate}
                        onChange={(e) => {
                          const iso = e.target.value;
                          setTempStartDate(iso);
                          setInputStartDisplay(toDisplayDate(iso));
                          setTempDatePreset('custom');
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>
                  </div>
                </div>

                {/* END DATE */}
                <div className="relative border-2 border-slate-200 rounded-xl px-3 py-2 hover:border-slate-300 focus-within:border-[#5932ea] transition-all bg-white">
                  <span className="absolute -top-2.5 left-3 bg-white px-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider select-none">
                    END DATE
                  </span>
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={inputEndDisplay}
                      onChange={(e) => {
                        const val = e.target.value;
                        setInputEndDisplay(val);
                        const iso = toIsoDate(val);
                        if (iso.length === 10) setTempEndDate(iso);
                        setTempDatePreset('custom');
                      }}
                      placeholder="dd-mm-yyyy"
                      className="w-full text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none bg-transparent"
                    />
                    <label className="cursor-pointer text-slate-800 hover:text-[#5932ea] ml-1 shrink-0 relative flex items-center">
                      <Calendar className="w-3.5 h-3.5" />
                      <input
                        type="date"
                        value={tempEndDate}
                        onChange={(e) => {
                          const iso = e.target.value;
                          setTempEndDate(iso);
                          setInputEndDisplay(toDisplayDate(iso));
                          setTempDatePreset('custom');
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Preset Checkbox List */}
              <div className="space-y-2 pt-0.5">
                {DATE_FILTER_PRESET_OPTIONS.map((opt) => {
                  const isSelected = tempDatePreset === opt.id;
                  return (
                    <label
                      key={opt.id}
                      onClick={() => {
                        setTempDatePreset(opt.id);
                        setTempStartDate(opt.start);
                        setTempEndDate(opt.end);
                        setInputStartDisplay(toDisplayDate(opt.start));
                        setInputEndDisplay(toDisplayDate(opt.end));
                      }}
                      className="flex items-center gap-2.5 cursor-pointer group select-none py-0.5"
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-[3px] flex items-center justify-center transition-colors shrink-0 ${
                          isSelected
                            ? 'bg-[#2563eb] text-white'
                            : 'border border-slate-400 bg-white group-hover:border-slate-500'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span className={`text-xs sm:text-[13px] transition-colors ${
                        isSelected ? 'text-slate-900 font-medium' : 'text-slate-700 group-hover:text-slate-900'
                      }`}>
                        {opt.label}
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* Apply Button */}
              <div className="pt-1.5 flex justify-end">
                <button
                  type="button"
                  onClick={handleApplyDateFilter}
                  className="px-5 py-1.5 bg-[#5932ea] hover:bg-[#4d28d0] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </div>
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
                <CustomSelect
                  value={paymentInProject}
                  onChange={val => setPaymentInProject(val)}
                  options={[
                    'Booshnam Associates Pvt Ltd',
                    ...projects.map(p => p.name),
                    'General Project / Unallocated',
                  ]}
                  size="md"
                  variant="brand"
                />
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
                  <CustomSelect
                    value={paymentInMode}
                    onChange={(val) => setPaymentInMode(val as any)}
                    options={[
                      { label: 'UPI / GPay / PhonePe', value: 'UPI' },
                      { label: 'NEFT / RTGS / Bank', value: 'NEFT/RTGS' },
                      { label: 'Cheque', value: 'Cheque' },
                      { label: 'Cash', value: 'Cash' },
                    ]}
                    size="md"
                    variant="brand"
                  />
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
                <div className="w-8 h-8 rounded-full bg-red-600/10 text-red-600 flex items-center justify-center font-bold text-xs">
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
                  <CustomSelect
                    value={partyTxnCategory}
                    onChange={(val) => {
                      setPartyTxnCategory(val as any);
                      const code = Math.floor(1700 + Math.random() * 500);
                      setPartyTxnTitle(`RA11-BAGJ-${code}(2026-2027)-${activePartyOverview.name}-${val}`);
                    }}
                    options={[
                      'Sales Invoice',
                      'Material Sales',
                      'Labour & Service Invoice',
                      'Machine / Equipment Rental',
                      'Debit Note',
                      'Credit Note',
                    ]}
                    size="md"
                    variant="brand"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Project *</label>
                  <CustomSelect
                    value={partyTxnProject}
                    onChange={val => setPartyTxnProject(val)}
                    options={[
                      'Booshnam Associates Pvt Ltd',
                      ...projects.map(p => p.name),
                      'General Project / Unallocated',
                    ]}
                    size="md"
                    variant="brand"
                  />
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-500"
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
                      className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={partyTxnDate}
                    onChange={e => setPartyTxnDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-red-600"
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-red-600"
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
                  className="px-4.5 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
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
                <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center">
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
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category *
                  </label>
                  <CustomSelect
                    value={newExpCategory}
                    onChange={(val) => setNewExpCategory(val as any)}
                    options={[
                      'Materials',
                      'Labour & Daily Wages',
                      'Machinery & Equipment',
                      'Site Petty Cash',
                      'Subcontractor',
                      'Fuel & Logistics',
                      'Safety & Compliance',
                      'Utilities & Admin',
                    ]}
                    size="md"
                    variant="brand"
                  />
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
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Project *
                  </label>
                  <CustomSelect
                    value={newExpProject}
                    onChange={(val) => setNewExpProject(val)}
                    options={projects.length > 0 ? projects.map(p => ({ label: p.name, value: p.name })) : ['Default Project']}
                    placeholder="Select Project..."
                    size="md"
                    variant="brand"
                  />
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
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Vendor / Payee Name *
                    </label>
                    {parties.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsCustomExpPartyInput(!isCustomExpPartyInput)}
                        className="text-[11px] font-semibold text-red-600 hover:underline cursor-pointer"
                      >
                        {isCustomExpPartyInput ? '← Select registered party' : '+ Enter custom payee'}
                      </button>
                    )}
                  </div>
                  {!isCustomExpPartyInput && parties.length > 0 ? (
                    <CustomSelect
                      value={newExpPayee}
                      onChange={(val) => setNewExpPayee(val)}
                      options={parties.map(p => ({
                        label: p.name,
                        value: p.name,
                        badge: p.type,
                        description: p.phone ? `${p.phone}` : undefined
                      }))}
                      placeholder="Select registered payee..."
                      size="md"
                      variant="brand"
                    />
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="e.g. UltraTech Cement or Site Worker"
                      value={newExpPayee}
                      onChange={e => setNewExpPayee(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-red-600"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Paid From Account *
                  </label>
                  <CustomSelect
                    value={newExpAccount}
                    onChange={(val) => setNewExpAccount(val)}
                    options={bankAccounts.map(ba => ({
                      label: ba.accountName,
                      value: ba.accountName,
                      description: `Available: ₹${ba.balance.toLocaleString('en-IN')}`,
                      badge: `₹${ba.balance.toLocaleString('en-IN')}`,
                    }))}
                    placeholder="Select Bank Account..."
                    size="md"
                    variant="brand"
                  />
                  {(() => {
                    const sel = bankAccounts.find(ba => ba.accountName === newExpAccount || ba.id === newExpAccount);
                    return sel ? (
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Available Balance: <strong className="text-slate-800 tracking-tight">₹{sel.balance.toLocaleString('en-IN')}</strong>
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
                  <CustomSelect
                    value={newExpMode}
                    onChange={(val) => setNewExpMode(val as any)}
                    options={[
                      { label: 'NEFT / RTGS', value: 'NEFT/RTGS' },
                      { label: 'UPI', value: 'UPI' },
                      { label: 'Petty Cash', value: 'Petty Cash' },
                      { label: 'Corporate Card', value: 'Corporate Card' },
                      { label: 'Cheque', value: 'Cheque' },
                    ]}
                    size="md"
                    variant="brand"
                  />
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
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <CustomSelect
                    value={newExpStatus}
                    onChange={(val) => setNewExpStatus(val as any)}
                    options={[
                      { label: 'Paid', value: 'Paid', dotColor: 'bg-emerald-500' },
                      { label: 'Approved', value: 'Approved', dotColor: 'bg-blue-500' },
                      { label: 'Pending Approval', value: 'Pending Approval', dotColor: 'bg-amber-500' },
                    ]}
                    align="right"
                    size="md"
                    variant="brand"
                  />
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
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-red-600"
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
                    <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
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
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-red-600"
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
                  className="px-5 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm transition-all cursor-pointer"
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
                <div className="w-10 h-10 rounded-lg bg-red-600 text-white flex flex-col items-center justify-center font-bold text-[10px]">
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
                      ? 'bg-[#FEF2F2] text-red-600 border border-red-200'
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
                    <p className="text-slate-600 tracking-tight">{selectedExpenseDetails.billNumber}</p>
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
                      className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg cursor-pointer transition-colors"
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
                <div className="w-10 h-10 rounded-xl bg-red-600/10 text-red-600 flex items-center justify-center">
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
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  
                  {/* From Account */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      From Account (Source / Debit) <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      value={newTrfFromAccountId}
                      onChange={(val) => setNewTrfFromAccountId(val)}
                      options={bankAccounts.map(b => ({
                        label: b.accountName,
                        value: b.id,
                        description: `Available: ₹${b.balance.toLocaleString('en-IN')}`,
                        badge: `₹${b.balance.toLocaleString('en-IN')}`,
                      }))}
                      placeholder="Select Source Account..."
                      size="md"
                      variant="brand"
                    />
                    <div className="min-h-[18px] mt-1.5 flex items-center">
                      {(() => {
                        const src = bankAccounts.find(b => b.id === newTrfFromAccountId);
                        return src ? (
                          <p className="text-[10px] text-slate-500">
                            Available Balance: <strong className="text-slate-800 tracking-tight">₹{src.balance.toLocaleString('en-IN')}</strong>
                          </p>
                        ) : null;
                      })()}
                    </div>
                  </div>

                  {/* To Account */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      To Account (Destination / Credit) <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      value={newTrfToAccountId}
                      onChange={(val) => setNewTrfToAccountId(val)}
                      options={bankAccounts.map(b => ({
                        label: b.accountName,
                        value: b.id,
                        description: `Current: ₹${b.balance.toLocaleString('en-IN')}`,
                        badge: `₹${b.balance.toLocaleString('en-IN')}`,
                      }))}
                      placeholder="Select Destination Account..."
                      size="md"
                      variant="brand"
                    />
                    <div className="min-h-[18px] mt-1.5 flex items-center">
                      {(() => {
                        const dst = bankAccounts.find(b => b.id === newTrfToAccountId);
                        return dst ? (
                          <p className="text-[10px] text-slate-500">
                            Current Balance: <strong className="text-slate-800 tracking-tight">₹{dst.balance.toLocaleString('en-IN')}</strong>
                          </p>
                        ) : null;
                      })()}
                    </div>
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
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
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
                    className="w-full h-11 pl-8 pr-4 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-500"
                  />
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-slate-400 font-medium">Quick Add:</span>
                  {[10000, 25000, 50000, 100000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setNewTrfAmount(String(val))}
                      className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 tracking-tight text-[11px] font-semibold cursor-pointer transition-colors"
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
                    <Sparkles className="w-3 h-3 text-red-600" />
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
                            <span className="font-bold text-red-600 tracking-tight">
                              ₹{((src?.balance || 0) - amt).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[9px] text-slate-400 block">(-₹{amt.toLocaleString('en-IN')})</span>
                          </div>
                          <div className="p-2 bg-white rounded border border-indigo-100">
                            <span className="text-slate-500 block truncate">{dst?.accountName}</span>
                            <span className="font-bold text-emerald-600 tracking-tight">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Transfer Mode</label>
                  <CustomSelect
                    value={newTrfMode}
                    onChange={(val) => setNewTrfMode(val as any)}
                    options={[
                      { label: 'Cash Withdrawal (Site Imprest)', value: 'Cash Withdrawal' },
                      { label: 'IMPS / Bank Transfer', value: 'IMPS / Bank Transfer' },
                      { label: 'NEFT / RTGS', value: 'NEFT / RTGS' },
                      { label: 'Cash Deposit', value: 'Cash Deposit' },
                      { label: 'Internal Ledger Contra', value: 'Internal Ledger Contra' },
                      { label: 'Cheque Transfer', value: 'Cheque' },
                    ]}
                    size="md"
                    variant="brand"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Transfer Date</label>
                  <input
                    type="text"
                    value={newTrfDate}
                    onChange={(e) => setNewTrfDate(e.target.value)}
                    placeholder="e.g. 26 Sept 2026"
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Row: Reference & Project */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Reference / UTR / Cheque #</label>
                  <input
                    type="text"
                    value={newTrfRef}
                    onChange={(e) => setNewTrfRef(e.target.value)}
                    placeholder="e.g. UTR-998821 or CHQ-7782"
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Related Project (Optional)</label>
                  <CustomSelect
                    value={newTrfProject}
                    onChange={(val) => setNewTrfProject(val)}
                    options={[
                      { label: 'General Company Accounts', value: '' },
                      ...projects.map(p => ({ label: p.name, value: p.name })),
                    ]}
                    size="md"
                    variant="brand"
                  />
                </div>
              </div>

              {/* Purpose / Narration */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Purpose / Narration <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTrfPurpose}
                  onChange={(e) => setNewTrfPurpose(e.target.value)}
                  placeholder="e.g. Replenish site petty cash vault for masonry wages & fuel"
                  required
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-500"
                />
              </div>

              {/* Initiated By & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Initiated By</label>
                  <input
                    type="text"
                    value={newTrfInitiatedBy}
                    onChange={(e) => setNewTrfInitiatedBy(e.target.value)}
                    placeholder="e.g. Finance Incharge"
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Internal Notes (Optional)</label>
                  <input
                    type="text"
                    value={newTrfNotes}
                    onChange={(e) => setNewTrfNotes(e.target.value)}
                    placeholder="e.g. Approved by Managing Director"
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewTransferModalOpen(false)}
                  className="px-5 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newTrfFromAccountId === newTrfToAccountId}
                  className={`px-5 py-2 rounded-lg text-white text-xs font-bold transition-all shadow-xs ${
                    newTrfFromAccountId === newTrfToAccountId
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 cursor-pointer'
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
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">Booshnam Associates</span>
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
                  <div className="text-base tracking-tight font-black text-slate-900">{selectedTransferDetails.transferCode}</div>
                  <span className="text-[11px] text-slate-500">{selectedTransferDetails.date}</span>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {selectedTransferDetails.status}
                </span>
              </div>

              {/* Amount & Route Graphic */}
              <div className="p-4 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/40 via-red-50/30 to-indigo-50/40 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Transferred</span>
                <div className="text-2xl font-black text-slate-900 tracking-tight my-1">
                  ₹{selectedTransferDetails.amount.toLocaleString('en-IN')}
                </div>
                
                <div className="flex items-center justify-center gap-3 mt-3">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">From (Credit)</span>
                    <span className="font-bold text-slate-800 text-xs">{selectedTransferDetails.fromAccountName}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white shadow-xs text-red-600 flex items-center justify-center font-bold">
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
                  <span className="tracking-tight font-semibold text-slate-800">{selectedTransferDetails.referenceNo}</span>
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
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg cursor-pointer transition-colors"
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

