import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  DollarSign, Plus, ArrowUpRight, ArrowDownRight, ArrowDownLeft, Search, 
  Filter, Check, X, FileText, Calendar, Wallet, SlidersHorizontal,
  Truck, ThumbsUp, Download, ChevronDown, ChevronUp, TrendingUp,
  Coins, Edit3, MoreVertical, UploadCloud, Info, Percent, User,
  Pencil, Building2, RotateCcw, Sparkles, Layers, AlertCircle,
  Mail, SquarePen, Trash2, FileSpreadsheet, CheckCircle2, Settings
} from 'lucide-react';
import { Project, ProjectTransaction, PaymentRequest, BOQRecord, SalesInvoice, ProjectExpenseRecord, SubconWorkOrder } from '../../../types';
import { getProjectSubconOrders } from '../../../lib/subconService';
import { addNotification } from '../../../lib/notificationService';
import { 
  getFinanceParties, 
  syncProjectTransactionToFinance, 
  syncProjectPaymentRequestToFinance, 
  PartyRecord 
} from '../../../lib/financeSyncService';
import { syncProjectFinancialsToStorage } from '../../../lib/projectFinanceUtils';
import { AllocateAdvanceModal } from '../AllocateAdvanceModal';
import { 
  getTransactionAdvanceBalance, 
  reverseProjectTransaction, 
  recordFinancialAudit 
} from '../../../lib/allocationService';
import { 
  getProjectInvoices, 
  saveProjectInvoices, 
  settleInvoicesWithPayment,
  getProjectExpenses, 
  saveProjectExpenses,
  addProjectExpense,
  settleExpensesWithPayment,
  getCompanyBanks,
  deleteSalesInvoice
} from '../../../lib/invoiceService';
import { 
  exportSalesInvoiceToPDF, 
  exportSalesInvoiceToExcel 
} from '../../../lib/invoiceExportService';

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

const DEFAULT_BANKS: BankAccount[] = getCompanyBanks();

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
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter(t => !(
            t.id?.includes('seed-') ||
            (t.transaction_number === '#65' && t.party_name === 'PRASATH') ||
            (t.transaction_number === '#INV-67' && t.party_name === 'Jisha Jeevan Buildtech')
          ));
          if (clean.length !== parsed.length) {
            localStorage.setItem(storageKey, JSON.stringify(clean));
          }
          return clean;
        }
      }
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

  // Project Invoices & Expenses (Video Flow)
  const [projectInvoices, setProjectInvoices] = useState<SalesInvoice[]>(() => {
    return getProjectInvoices(project.id, project.client_name);
  });
  const [projectExpenses, setProjectExpenses] = useState<ProjectExpenseRecord[]>(() => {
    return getProjectExpenses(project.id);
  });

  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);

  // Other Expense Line Form State (Matching Video "#OE 260")
  const [siteExpItemName, setSiteExpItemName] = useState('Site Expense');
  const [siteExpQty, setSiteExpQty] = useState<number>(1);
  const [siteExpRate, setSiteExpRate] = useState<number>(250);
  const [siteExpEnableGST, setSiteExpEnableGST] = useState<boolean>(true);

  // Sync with invoice & expense storage events
  useEffect(() => {
    setProjectInvoices(getProjectInvoices(project.id, project.client_name));
    setProjectExpenses(getProjectExpenses(project.id));
    const handleInvoicesUpdated = () => {
      setProjectInvoices(getProjectInvoices(project.id, project.client_name));
    };
    const handleExpensesUpdated = () => {
      setProjectExpenses(getProjectExpenses(project.id));
    };
    window.addEventListener('siteops_invoices_updated', handleInvoicesUpdated);
    window.addEventListener('siteops_expenses_updated', handleExpensesUpdated);
    return () => {
      window.removeEventListener('siteops_invoices_updated', handleInvoicesUpdated);
      window.removeEventListener('siteops_expenses_updated', handleExpensesUpdated);
    };
  }, [project.id, project.client_name]);

  // Project BOQs & Finance Reference
  const [projectBOQs, setProjectBOQs] = useState<BOQRecord[]>(() => {
    try {
      const raw = localStorage.getItem(`siteops_boq_records_v2_${projectIdKey}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // Payment Category & Advance Scheduling State
  const [paymentCategory, setPaymentCategory] = useState<'CLIENT_ADVANCE' | 'WORK_PAYMENT' | 'MILESTONE_PAYMENT' | 'OTHER_RECEIPT' | 'SUPPLIER_PAYMENT' | 'SUBCON_PAYMENT' | 'EXPENSE'>('CLIENT_ADVANCE');
  const [selectedBOQId, setSelectedBOQId] = useState<string>('');
  const [advancePercentage, setAdvancePercentage] = useState<number | ''>(50);
  const [selectedTargetBOQItemId, setSelectedTargetBOQItemId] = useState<string>('');
  const [selectedTargetMilestoneId, setSelectedTargetMilestoneId] = useState<string>('');
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);

  // Advance Allocation Modal State
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [txForAllocation, setTxForAllocation] = useState<ProjectTransaction | null>(null);

  // Total BOQ Value across project BOQs
  const totalBOQValue = useMemo(() => {
    if (projectBOQs.length === 0) return Number(project.boq_value || 0);
    return projectBOQs.reduce((sum, b) => {
      const itemsSum = b.items?.reduce((s, it) => s + (Number(it.sales_price || it.total_amount) || 0), 0) || 0;
      return sum + (itemsSum || Number(b.boq_value) || 0);
    }, 0);
  }, [projectBOQs, project.boq_value]);

  // Selected BOQ Record
  const activeSelectedBOQ = useMemo(() => {
    return projectBOQs.find(b => b.id === selectedBOQId) || projectBOQs[0] || null;
  }, [projectBOQs, selectedBOQId]);

  // Applicable BOQ Value for the selected BOQ or project
  const applicableBOQValue = useMemo(() => {
    if (activeSelectedBOQ) {
      const itemsSum = activeSelectedBOQ.items?.reduce((s, it) => s + (Number(it.sales_price || it.total_amount) || 0), 0) || 0;
      return itemsSum || Number(activeSelectedBOQ.boq_value) || totalBOQValue;
    }
    return totalBOQValue;
  }, [activeSelectedBOQ, totalBOQValue]);

  // Refresh BOQs on storage event or key change
  useEffect(() => {
    const refreshBOQs = () => {
      try {
        const raw = localStorage.getItem(`siteops_boq_records_v2_${projectIdKey}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setProjectBOQs(parsed);
        }
      } catch (e) {}
    };
    refreshBOQs();
    window.addEventListener('storage', refreshBOQs);
    return () => window.removeEventListener('storage', refreshBOQs);
  }, [projectIdKey]);

  // Two-way sync handlers for Advance % and Amount
  const handleAdvancePercentageChange = (pct: number | '') => {
    setAdvancePercentage(pct);
    if (pct !== '' && applicableBOQValue > 0) {
      const calculatedAmt = Math.round((applicableBOQValue * Number(pct)) / 100);
      setFormAmount(calculatedAmt);
    }
  };

  const handleAmountChange = (amt: number | '') => {
    setFormAmount(amt);
    if (paymentCategory === 'CLIENT_ADVANCE' && applicableBOQValue > 0 && amt !== '') {
      const pct = Number(((Number(amt) / applicableBOQValue) * 100).toFixed(2));
      setAdvancePercentage(pct);
    }
  };

  // Transaction Detail Overview Modal / Drawer (Matching Image 5)
  const [selectedTxForOverview, setSelectedTxForOverview] = useState<ProjectTransaction | null>(null);

  // Sales Invoice Detail Drawer (Matching Screenshots 1 & 2)
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<SalesInvoice | null>(null);
  const [isInvoiceDownloadDropdownOpen, setIsInvoiceDownloadDropdownOpen] = useState(false);
  const [isInvoiceMoreMenuOpen, setIsInvoiceMoreMenuOpen] = useState(false);

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

  // Outstanding invoices and expenses for the project / party (Video Flow)
  const outstandingInvoices = useMemo(() => {
    return projectInvoices.filter(inv => (inv.balance_due ?? inv.total_amount) > 0);
  }, [projectInvoices]);

  const partyOutstandingInvoices = useMemo(() => {
    if (!formPartyName.trim()) return outstandingInvoices;
    const q = formPartyName.trim().toLowerCase();
    const filtered = outstandingInvoices.filter(inv =>
      !inv.client_name ||
      inv.client_name.toLowerCase().includes(q) ||
      q.includes(inv.client_name.toLowerCase())
    );
    return filtered.length > 0 ? filtered : outstandingInvoices;
  }, [outstandingInvoices, formPartyName]);

  const outstandingExpenses = useMemo(() => {
    return projectExpenses.filter(exp => (exp.balance_due ?? exp.total_amount) > 0);
  }, [projectExpenses]);

  const partyOutstandingExpenses = useMemo(() => {
    if (!formPartyName.trim()) return outstandingExpenses;
    const q = formPartyName.trim().toLowerCase();
    const filtered = outstandingExpenses.filter(exp =>
      !exp.party_name ||
      exp.party_name.toLowerCase().includes(q) ||
      q.includes(exp.party_name.toLowerCase())
    );
    return filtered.length > 0 ? filtered : outstandingExpenses;
  }, [outstandingExpenses, formPartyName]);

  // Total balance due across currently checked invoices
  const selectedInvoicesDue = useMemo(() => {
    return projectInvoices
      .filter(i => selectedInvoiceIds.includes(i.id))
      .reduce((sum, i) => sum + (i.balance_due !== undefined ? i.balance_due : i.total_amount), 0);
  }, [projectInvoices, selectedInvoiceIds]);

  // Total balance due across currently checked expenses
  const selectedExpensesDue = useMemo(() => {
    return projectExpenses
      .filter(e => selectedExpenseIds.includes(e.id))
      .reduce((sum, e) => sum + (e.balance_due !== undefined ? e.balance_due : e.total_amount), 0);
  }, [projectExpenses, selectedExpenseIds]);

  // Validation checks for amount exceeding invoice/expense balance due
  const isInvoiceAmountExceeded = useMemo(() => {
    const isPaymentIn = selectedSubtype === 'Payment In' || selectedSubtype === 'I Received' || txFlowType === 'IN';
    if (!isPaymentIn || selectedInvoiceIds.length === 0) return false;
    const entered = Number(formAmount) || 0;
    return entered > selectedInvoicesDue;
  }, [selectedSubtype, txFlowType, selectedInvoiceIds.length, formAmount, selectedInvoicesDue]);

  const isExpenseAmountExceeded = useMemo(() => {
    const isPaymentOut = selectedSubtype === 'Payment Out' || txFlowType === 'OUT';
    if (!isPaymentOut || selectedExpenseIds.length === 0) return false;
    const entered = Number(formAmount) || 0;
    return entered > selectedExpensesDue;
  }, [selectedSubtype, txFlowType, selectedExpenseIds.length, formAmount, selectedExpensesDue]);

  const isAmountOverLimit = isInvoiceAmountExceeded || isExpenseAmountExceeded;

  // Date formatters for Sales Invoice Side Drawer (Matching Screenshots 1 & 2)
  const formatDateBadge = (dateStr?: string) => {
    try {
      const d = new Date(dateStr || Date.now());
      if (isNaN(d.getTime())) return { text: '07 Oct 26' };
      const day = String(d.getDate()).padStart(2, '0');
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const year = String(d.getFullYear()).slice(-2);
      return { text: `${day} ${month} ${year}` };
    } catch {
      return { text: '07 Oct 26' };
    }
  };

  const formatDueDate = (dateStr?: string) => {
    try {
      const d = new Date(dateStr || Date.now());
      if (isNaN(d.getTime())) return '14 Oct 2026';
      const due = new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000);
      const day = due.getDate();
      const month = due.toLocaleDateString('en-US', { month: 'short' });
      const year = due.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return '14 Oct 2026';
    }
  };

  // Ticket-style date badge for transaction and payment request rows (matching user UI screenshot)
  const renderRowTicketBadge = (
    dateStr?: string,
    kind: 'subcon' | 'invoice' | 'in' | 'out' | 'request' | 'default' = 'default'
  ) => {
    let day = '07';
    let month = 'Oct';
    let year = '26';
    try {
      const d = new Date(dateStr || Date.now());
      if (!isNaN(d.getTime())) {
        day = String(d.getDate()).padStart(2, '0');
        month = d.toLocaleDateString('en-GB', { month: 'short' });
        year = String(d.getFullYear()).slice(-2);
      }
    } catch {}

    const dateFormatted = `${day} ${month} ${year}`;

    if (kind === 'invoice') {
      return (
        <div className="w-[48px] h-[48px] rounded-lg border border-blue-200/90 shadow-2xs overflow-hidden flex flex-col shrink-0 select-none bg-white">
          <div className="h-[17px] bg-[#2563EB] text-white text-[9.5px] font-bold flex items-center justify-center tracking-tight">
            {dateFormatted}
          </div>
          <div className="flex-1 bg-[#EFF6FF] flex items-center justify-center p-1">
            <svg width="20" height="21" viewBox="0 0 20 22" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#2563EB]">
              <path
                d="M3 2C3 1.44772 3.44772 1 4 1H16C16.5523 1 17 1.44772 17 2V19.5L14.5 18L12 19.5L9.5 18L7 19.5L4.5 18L3 19V2Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="white"
              />
              <rect x="5.5" y="5.5" width="9" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
              <text x="10" y="10.8" fontSize="4.2" fontWeight="800" textAnchor="middle" fill="currentColor" fontFamily="sans-serif">INV</text>
            </svg>
          </div>
        </div>
      );
    }

    if (kind === 'subcon' || kind === 'out') {
      return (
        <div className="w-[48px] h-[48px] rounded-lg border border-slate-300/90 shadow-2xs overflow-hidden flex flex-col shrink-0 select-none bg-white">
          <div className="h-[17px] bg-[#2B324B] text-white text-[9.5px] font-bold flex items-center justify-center tracking-tight">
            {dateFormatted}
          </div>
          <div className="flex-1 bg-[#F0F3F9] flex items-center justify-center p-1">
            <svg width="20" height="21" viewBox="0 0 20 22" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#334155]">
              <path
                d="M3 2C3 1.44772 3.44772 1 4 1H16C16.5523 1 17 1.44772 17 2V19.5L14.5 18L12 19.5L9.5 18L7 19.5L4.5 18L3 19V2Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="white"
              />
              <path d="M6 6.5H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M6 9.5H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M6 12.5H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      );
    }

    if (kind === 'in') {
      return (
        <div className="w-[48px] h-[48px] rounded-lg border border-emerald-300/90 shadow-2xs overflow-hidden flex flex-col shrink-0 select-none bg-white">
          <div className="h-[17px] bg-[#059669] text-white text-[9.5px] font-bold flex items-center justify-center tracking-tight">
            {dateFormatted}
          </div>
          <div className="flex-1 bg-[#ECFDF5] flex items-center justify-center p-1">
            <svg width="20" height="21" viewBox="0 0 20 22" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#059669]">
              <path
                d="M3 2C3 1.44772 3.44772 1 4 1H16C16.5523 1 17 1.44772 17 2V19.5L14.5 18L12 19.5L9.5 18L7 19.5L4.5 18L3 19V2Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="white"
              />
              <path d="M10 5.5V13.5M10 13.5L7 10.5M10 13.5L13 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      );
    }

    if (kind === 'request') {
      return (
        <div className="w-[48px] h-[48px] rounded-lg border border-indigo-200/90 shadow-2xs overflow-hidden flex flex-col shrink-0 select-none bg-white">
          <div className="h-[17px] bg-[#4F46E5] text-white text-[9.5px] font-bold flex items-center justify-center tracking-tight">
            {dateFormatted}
          </div>
          <div className="flex-1 bg-[#EEF2FF] flex items-center justify-center p-1">
            <svg width="20" height="21" viewBox="0 0 20 22" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#4F46E5]">
              <path
                d="M3 2C3 1.44772 3.44772 1 4 1H16C16.5523 1 17 1.44772 17 2V19.5L14.5 18L12 19.5L9.5 18L7 19.5L4.5 18L3 19V2Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="white"
              />
              <rect x="5.5" y="5.5" width="9" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
              <text x="10" y="10.8" fontSize="4.2" fontWeight="800" textAnchor="middle" fill="currentColor" fontFamily="sans-serif">REQ</text>
            </svg>
          </div>
        </div>
      );
    }

    return (
      <div className="w-[48px] h-[48px] rounded-lg border border-slate-300/90 shadow-2xs overflow-hidden flex flex-col shrink-0 select-none bg-white">
        <div className="h-[17px] bg-[#475569] text-white text-[9.5px] font-bold flex items-center justify-center tracking-tight">
          {dateFormatted}
        </div>
        <div className="flex-1 bg-[#F8FAFC] flex items-center justify-center p-1">
          <svg width="20" height="21" viewBox="0 0 20 22" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#475569]">
            <path
              d="M3 2C3 1.44772 3.44772 1 4 1H16C16.5523 1 17 1.44772 17 2V19.5L14.5 18L12 19.5L9.5 18L7 19.5L4.5 18L3 19V2Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="white"
            />
            <path d="M6 7H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M6 11H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    );
  };

  const handleDeleteInvoice = (inv: SalesInvoice) => {
    deleteSalesInvoice(project.id, inv.id);
    setProjectInvoices(getProjectInvoices(project.id, project.client_name));
    setSelectedInvoiceForDetail(null);
    onShowToast?.(`Invoice ${inv.invoice_number} deleted`);
  };

  // Sync amount for Other Expense
  useEffect(() => {
    if (selectedSubtype === 'Other Expense') {
      const sub = (Number(siteExpQty) || 0) * (Number(siteExpRate) || 0);
      const tax = siteExpEnableGST ? Math.round(sub * 0.18) : 0;
      setFormAmount(sub + tax);
    }
  }, [selectedSubtype, siteExpQty, siteExpRate, siteExpEnableGST]);

  // Sync state when project changes & listen for finance sync updates
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`siteops_project_transactions_${projectIdKey}`);
      const txs = saved ? JSON.parse(saved) : DEFAULT_TRANSACTIONS;
      const cleanTxs = Array.isArray(txs) ? txs.filter((t: any) => !(
        t.id?.includes('seed-') ||
        (t.transaction_number === '#65' && t.party_name === 'PRASATH') ||
        (t.transaction_number === '#INV-67' && t.party_name === 'Jisha Jeevan Buildtech')
      )) : [];
      if (Array.isArray(txs) && cleanTxs.length !== txs.length) {
        localStorage.setItem(`siteops_project_transactions_${projectIdKey}`, JSON.stringify(cleanTxs));
      }
      setTransactions(cleanTxs);
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

  // Load Subcon Work Orders for this project to integrate Subcon Bills into Transactions
  const [subconOrders, setSubconOrders] = useState<SubconWorkOrder[]>(() => {
    return getProjectSubconOrders(project.id || project.code || 'default');
  });

  useEffect(() => {
    const pId = project.id || project.code || 'default';
    setSubconOrders(getProjectSubconOrders(pId));
  }, [project.id, project.code]);

  useEffect(() => {
    const handleSubconUpdated = () => {
      const pId = project.id || project.code || 'default';
      setSubconOrders(getProjectSubconOrders(pId));
    };
    window.addEventListener('booshnam_subcon_updated', handleSubconUpdated);
    window.addEventListener('siteops_project_transactions_updated', handleSubconUpdated);
    return () => {
      window.removeEventListener('booshnam_subcon_updated', handleSubconUpdated);
      window.removeEventListener('siteops_project_transactions_updated', handleSubconUpdated);
    };
  }, [project.id, project.code]);

  // Generate ledger display entries for Subcontractor RA Bills
  const subconBillEntries: ProjectTransaction[] = useMemo(() => {
    const entries: ProjectTransaction[] = [];
    subconOrders.forEach(wo => {
      (wo.bills || []).forEach(bill => {
        if (bill.id?.includes('seed-') || (bill.bill_number === '#65' && bill.vendor_name === 'PRASATH')) return;
        const billNo = bill.bill_number.startsWith('#') ? bill.bill_number : `#${bill.bill_number}`;
        entries.push({
          id: `tx-subcon-${bill.id}`,
          transaction_number: billNo,
          date: bill.invoice_date,
          time: '10:00 AM',
          type: 'OUT' as const,
          party_name: bill.vendor_name || wo.subcon_name || 'Subcontractor',
          party_category: 'SUBCONTRACTOR',
          category: 'Subcon Expense',
          transaction_sub_type: 'Subcon Expense',
          amount: Number(bill.total_amount) || Number(bill.net_amount) || 0,
          payment_mode: bill.status === 'PAID' ? 'Paid' : 'unpaid',
          reference_no: bill.bill_number,
          status: 'APPROVED' as const,
          notes: `RA Bill ${bill.bill_number} for Work Order ${wo.wo_number || ''}`,
          entry_by: 'Site Ops',
          project_id: project.id,
          project_name: project.name,
          cost_code: bill.cost_code || 'CC-SUBCON-01'
        });
      });
    });
    return entries;
  }, [subconOrders, project.id, project.name]);

  // Combine recorded transactions, sales invoices, and subcon bills for ledger display
  const combinedTransactions = useMemo(() => {
    // Generate ledger display entries for project sales invoices
    const invoiceEntries: ProjectTransaction[] = projectInvoices
      .filter(inv => !(inv.id?.includes('seed-') || (inv.invoice_number === 'INV-67' && inv.boq_number === 'Sales-62')))
      .map(inv => {
      const isSettled = (inv.balance_due ?? inv.total_amount) <= 0;
      const isPartiallySettled = (inv.settled_amount || 0) > 0 && !isSettled;
      const paymentModeLabel = isSettled ? 'Settled' : isPartiallySettled ? 'Partially Paid' : 'Unpaid';
      
      return {
        id: `tx-inv-${inv.id}`,
        transaction_number: inv.invoice_number.startsWith('#') ? inv.invoice_number : `#${inv.invoice_number}`,
        date: inv.invoice_date,
        time: '10:00 AM',
        type: 'IN' as const,
        party_name: inv.client_name || project.client_name || 'Client',
        category: 'Sales Invoice',
        transaction_sub_type: 'Sales Invoice',
        amount: inv.total_amount,
        payment_mode: paymentModeLabel,
        reference_no: inv.invoice_number,
        status: 'APPROVED' as const,
        notes: isSettled ? 'Fully Settled' : `Remaining: ₹${(inv.balance_due ?? inv.total_amount).toLocaleString('en-IN')}`,
        entry_by: 'Billing',
        project_id: project.id,
        project_name: project.name,
        boq_number: inv.boq_number
      };
    });

    const existingTxNumbers = new Set(
      transactions.map(t => (t.transaction_number || '').toLowerCase().replace(/[^a-z0-9]/g, ''))
    );

    const nonDuplicateInvoices = invoiceEntries.filter(
      ie => !existingTxNumbers.has((ie.transaction_number || '').toLowerCase().replace(/[^a-z0-9]/g, ''))
    );

    const nonDuplicateSubconBills = subconBillEntries.filter(
      se => !existingTxNumbers.has((se.transaction_number || '').toLowerCase().replace(/[^a-z0-9]/g, ''))
    );

    return [...transactions, ...nonDuplicateInvoices, ...nonDuplicateSubconBills].sort((a, b) => {
      const dateA = new Date(a.date).getTime() || 0;
      const dateB = new Date(b.date).getTime() || 0;
      return dateB - dateA;
    });
  }, [transactions, projectInvoices, subconBillEntries, project.id, project.name, project.client_name]);

  // Compute Totals
  const totalIn = combinedTransactions
    .filter(t => t.type === 'IN' && t.transaction_sub_type !== 'Sales Invoice')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalOut = combinedTransactions
    .filter(t => t.type === 'OUT')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const projectBalance = totalIn - totalOut;

  // Margin calculation (Sales vs Expense)
  const totalSales = projectInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0) +
    transactions
      .filter(t => t.transaction_sub_type === 'Material Sales')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalExpense = combinedTransactions
    .filter(t => t.type === 'OUT')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const margin = totalSales - totalExpense;

  // Filtered List
  const filteredTransactions = combinedTransactions.filter(t => {
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
    setIsSubmittingTx(false);
    setProjectInvoices(getProjectInvoices(project.id, project.client_name));
    setProjectExpenses(getProjectExpenses(project.id));

    if (subtype === 'Payment In') {
      const party = project.client_name || 'Jisha Jeevan Buildtech';
      setFormPaymentNumber(`#CB-${105 + transactions.filter(t => t.type === 'IN' && t.transaction_sub_type !== 'Sales Invoice').length}`);
      setFormPartyName(party);
      setSelectedInvoiceIds([]);
      setFormAmount(0);
      setPaymentCategory('WORK_PAYMENT');
    } else if (subtype === 'Other Expense') {
      setFormPaymentNumber(`#OE-${260 + projectExpenses.length}`);
      setFormPartyName('Adithya - Admin (Staff)');
      setSiteExpItemName('Site Expense');
      setSiteExpQty(1);
      setSiteExpRate(250);
      setSiteExpEnableGST(true);
      setFormAmount(295);
      setPaymentCategory('EXPENSE');
    } else if (subtype === 'Payment Out') {
      setFormPaymentNumber(`#CB-${106 + transactions.filter(t => t.type === 'OUT').length}`);
      setSelectedExpenseIds([]);
      setFormPartyName('');
      setFormAmount(0);
      setPaymentCategory('EXPENSE');
    } else if (subtype === 'I Received' || defaultFlow === 'IN') {
      setFormPaymentNumber(`#CB-${105 + transactions.filter(t => t.type === 'IN').length}`);
      setPaymentCategory('CLIENT_ADVANCE');
      setFormPartyName(project.client_name || '');
      setFormAmount(0);
    } else {
      setPaymentCategory('EXPENSE');
      setAdvancePercentage('');
      setSelectedTargetBOQItemId('');
      setSelectedTargetMilestoneId('');
      setFormPartyName('');
      setFormAmount('');
    }

    setIsCreateModalOpen(true);
  };

  // Toggle invoice selection in Payment In
  const handleToggleInvoiceSelection = (invId: string, dueAmount: number) => {
    let nextSelected: string[];
    if (selectedInvoiceIds.includes(invId)) {
      nextSelected = selectedInvoiceIds.filter(id => id !== invId);
    } else {
      nextSelected = [...selectedInvoiceIds, invId];
    }
    setSelectedInvoiceIds(nextSelected);

    const totalDue = projectInvoices
      .filter(i => nextSelected.includes(i.id))
      .reduce((sum, i) => sum + (i.balance_due !== undefined ? i.balance_due : i.total_amount), 0);

    setFormAmount(totalDue > 0 ? totalDue : 0);
  };

  // Toggle expense selection in Payment Out
  const handleToggleExpenseSelection = (expId: string, dueAmount: number) => {
    let nextSelected: string[];
    if (selectedExpenseIds.includes(expId)) {
      nextSelected = selectedExpenseIds.filter(id => id !== expId);
    } else {
      nextSelected = [...selectedExpenseIds, expId];
    }
    setSelectedExpenseIds(nextSelected);

    const totalDue = projectExpenses
      .filter(e => nextSelected.includes(e.id))
      .reduce((sum, e) => sum + (e.balance_due !== undefined ? e.balance_due : e.total_amount), 0);

    setFormAmount(totalDue > 0 ? totalDue : 0);
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
    if (isSubmittingTx) return;

    if (!formPartyName.trim()) {
      onShowToast?.('Please enter party name');
      return;
    }
    const finalAmount = Number(formAmount) || 0;
    if (finalAmount <= 0) {
      onShowToast?.('Please enter a valid amount');
      return;
    }

    // Check if entered amount exceeds selected invoice or expense balance due
    if ((selectedSubtype === 'Payment In' || selectedSubtype === 'I Received' || txFlowType === 'IN') && selectedInvoiceIds.length > 0) {
      if (finalAmount > selectedInvoicesDue) {
        onShowToast?.(`Amount cannot exceed the selected invoice remaining balance of ₹${selectedInvoicesDue.toLocaleString('en-IN')}`);
        return;
      }
    }

    if (selectedSubtype === 'Payment Out' && selectedExpenseIds.length > 0) {
      if (finalAmount > selectedExpensesDue) {
        onShowToast?.(`Amount cannot exceed the selected expense remaining balance of ₹${selectedExpensesDue.toLocaleString('en-IN')}`);
        return;
      }
    }

    setIsSubmittingTx(true);

    const now = new Date();
    const formattedTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const chosenBank = (formPaymentMethod === 'Bank Transfer' || formPaymentMethod === 'Cheque') 
      ? currentSelectedBank 
      : undefined;

    const isClientAdvance = (selectedSubtype === 'Payment In' || txFlowType === 'IN') && paymentCategory === 'CLIENT_ADVANCE';

    const newTx: ProjectTransaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      transaction_number: formPaymentNumber.trim() || `#CB-${Date.now().toString().slice(-3)}`,
      date: formDate,
      time: formattedTime,
      type: txFlowType,
      party_name: formPartyName.trim(),
      category: isClientAdvance ? 'Client Advance' : (paymentCategory === 'WORK_PAYMENT' ? 'Work Payment' : 'Client Billing'),
      transaction_sub_type: selectedSubtype,
      amount: finalAmount,
      payment_mode: formPaymentMethod,
      reference_no: formReferenceNo.trim() || formPaymentNumber,
      cost_code: formCostCode !== 'Select Cost Code' ? formCostCode : undefined,
      bank_name: chosenBank?.bank_name,
      bank_account: chosenBank?.account_number,
      status: 'APPROVED',
      notes: formNotes.trim() || '-',
      entry_by: 'Current User',
      paid_to: chosenBank ? `Booshnam Associates Pvt Ltd (${chosenBank.bank_name})` : 'Booshnam Associates Pvt Ltd',
      media_url: formMediaUrl || undefined,
      project_id: project.id,
      project_name: project.name,
      payment_category: (selectedSubtype === 'Payment In' || txFlowType === 'IN') ? paymentCategory : 'EXPENSE',
      boq_id: activeSelectedBOQ?.id,
      boq_number: activeSelectedBOQ?.boq_number,
      boq_value_ref: applicableBOQValue,
      advance_percentage: isClientAdvance && advancePercentage !== '' ? Number(advancePercentage) : undefined,
      allocated_amount: 0,
      unallocated_amount: isClientAdvance ? finalAmount : 0,
      target_boq_item_id: selectedTargetBOQItemId || undefined,
      target_milestone_id: selectedTargetMilestoneId || undefined
    };

    const updated = [newTx, ...transactions];
    persistTransactions(updated);

    // Record audit log entry
    recordFinancialAudit({
      project_id: project.id,
      entity_type: 'TRANSACTION',
      entity_id: newTx.id,
      action: 'CREATE',
      amount: finalAmount,
      performed_by: 'Current User',
      details: `Created ${newTx.type === 'IN' ? 'Payment In' : 'Payment Out'} ${newTx.transaction_number} of ₹${finalAmount.toLocaleString('en-IN')} (${newTx.payment_category || newTx.transaction_sub_type})`
    });

    // Video Flow: Settle Invoices when Payment In is made
    if (selectedSubtype === 'Payment In' || txFlowType === 'IN') {
      settleInvoicesWithPayment(project.id, formPartyName, finalAmount, selectedInvoiceIds);
      setProjectInvoices(getProjectInvoices(project.id, project.client_name));
    }

    // Video Flow: Settle Expenses when Payment Out is made
    if (selectedSubtype === 'Payment Out') {
      settleExpensesWithPayment(project.id, formPartyName, finalAmount, selectedExpenseIds);
      setProjectExpenses(getProjectExpenses(project.id));
    }

    // Video Flow: Record Other Expense
    if (selectedSubtype === 'Other Expense') {
      const sub = siteExpQty * siteExpRate;
      const gst = siteExpEnableGST ? Math.round(sub * 0.18) : 0;
      const tot = sub + gst;
      const newExp: ProjectExpenseRecord = {
        id: `exp-${Date.now()}`,
        project_id: project.id,
        voucher_no: formPaymentNumber.trim() || `#OE ${260 + projectExpenses.length}`,
        date: formDate,
        party_name: formPartyName.trim(),
        item_name: siteExpItemName.trim() || 'Site Expense',
        quantity: siteExpQty,
        unit_rate: siteExpRate,
        enable_gst: siteExpEnableGST,
        gst_percent: siteExpEnableGST ? 18 : 0,
        subtotal: sub,
        tax_amount: gst,
        total_amount: tot,
        settled_amount: 0,
        balance_due: tot,
        status: 'PENDING',
        created_at: new Date().toISOString()
      };
      addProjectExpense(project.id, newExp);
      setProjectExpenses(getProjectExpenses(project.id));
    }

    // Synchronize transaction into Accounts & Finance
    syncProjectTransactionToFinance(project, newTx);

    if (selectedSubtype === 'Payment Out') {
      onShowToast?.('Successfully Transferred');
    } else {
      onShowToast?.('Successfully Added');
    }
    setIsCreateModalOpen(false);
    setIsSubmittingTx(false);
  };

  // Handle Controlled Transaction Reversal
  const handleReverseTransaction = (tx: ProjectTransaction) => {
    const reason = window.prompt(`Please enter reason for reversing transaction "${tx.transaction_number}":`, 'Client request / Payment reversal');
    if (!reason || !reason.trim()) return;

    const res = reverseProjectTransaction(project.id, tx.id, reason.trim(), 'Current User');
    if (res.success) {
      const raw = localStorage.getItem(storageKey);
      if (raw) setTransactions(JSON.parse(raw));
      syncProjectFinancialsToStorage(project.id, project.code, project.name);
      onShowToast?.(`Transaction ${tx.transaction_number} reversed successfully.`);
      if (selectedTxForOverview?.id === tx.id) {
        setSelectedTxForOverview(null);
      }
    } else {
      alert(res.error || 'Failed to reverse transaction');
    }
  };

  // Handle File Input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setFormMediaUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setFormMediaUrl('https://images.unsplash.com/photo-1541888946425-d0fbb186156a?w=800&auto=format&fit=crop&q=80');
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
      setPrMediaName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPrMediaUrl(reader.result);
          onShowToast?.(`File "${file.name}" attached`);
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
    <div className="space-y-4 animate-in fade-in duration-200 w-full min-w-0">
      
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
      {/* 3. SIX METRIC CARDS — Reference card style with icon visuals   */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">

        {/* Card 1: Balance — White / Indigo */}
        <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all overflow-hidden group min-w-0 p-4 flex flex-col justify-between">
          {/* Decorative bg blob */}
          <div className="absolute right-0 top-0 w-20 h-20 rounded-bl-[3rem] bg-indigo-50/70 pointer-events-none" />
          {/* Icon */}
          <div className="absolute right-3 top-3 w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
            <Wallet className="w-[18px] h-[18px]" />
          </div>
          <div className="min-w-0 pr-10">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest truncate">Balance</p>
            <p className="mt-1.5 text-xl font-black text-slate-900 tracking-tight truncate leading-tight">
              ₹ {projectBalance.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="mt-3">
            <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
              Net Cash
            </span>
          </div>
        </div>

        {/* Card 2: Total In — Emerald gradient */}
        <div className="relative rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden group min-w-0 p-4 flex flex-col justify-between"
          style={{ background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 60%, #6ee7b7 100%)' }}>
          <div className="absolute right-0 top-0 w-20 h-20 rounded-bl-[3rem] bg-white/20 pointer-events-none" />
          <div className="absolute right-3 top-3 w-9 h-9 rounded-xl bg-white/50 text-emerald-700 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
            <ArrowDownRight className="w-[18px] h-[18px]" />
          </div>
          <div className="min-w-0 pr-10">
            <p className="text-[11px] font-bold text-emerald-800/70 uppercase tracking-widest truncate">Total In</p>
            <p className="mt-1.5 text-xl font-black text-emerald-900 tracking-tight truncate leading-tight">
              ₹ {totalIn.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="mt-3">
            <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-800 bg-white/50 px-2.5 py-1 rounded-lg truncate">
              <ArrowDownRight className="w-3 h-3 shrink-0" />
              Received
            </span>
          </div>
        </div>

        {/* Card 3: Total Out — Rose / Warm */}
        <div className="relative rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden group min-w-0 p-4 flex flex-col justify-between"
          style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
          <div className="absolute right-0 top-0 w-20 h-20 rounded-bl-[3rem] bg-white/5 pointer-events-none" />
          <div className="absolute right-3 top-3 w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
            <ArrowUpRight className="w-[18px] h-[18px]" />
          </div>
          <div className="min-w-0 pr-10">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest truncate">Total Out</p>
            <p className="mt-1.5 text-xl font-black text-white tracking-tight truncate leading-tight">
              ₹ {totalOut.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="mt-3">
            <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-rose-300 bg-rose-500/20 px-2.5 py-1 rounded-lg truncate">
              <ArrowUpRight className="w-3 h-3 shrink-0" />
              Paid Out
            </span>
          </div>
        </div>

        {/* Card 4: Sales — Blue gradient */}
        <div className="relative rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden group min-w-0 p-4 flex flex-col justify-between"
          style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 60%, #bfdbfe 100%)' }}>
          <div className="absolute right-0 top-0 w-20 h-20 rounded-bl-[3rem] bg-white/30 pointer-events-none" />
          <div className="absolute right-3 top-3 w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
            <FileText className="w-[18px] h-[18px]" />
          </div>
          <div className="min-w-0 pr-10">
            <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest truncate">Sales</p>
            <p className="mt-1.5 text-xl font-black text-blue-900 tracking-tight truncate leading-tight">
              ₹ {totalSales.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="mt-3">
            <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-blue-700 bg-blue-200/60 px-2.5 py-1 rounded-lg truncate">
              Invoiced
            </span>
          </div>
        </div>

        {/* Card 5: Expense — Amber / Orange gradient */}
        <div className="relative rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden group min-w-0 p-4 flex flex-col justify-between"
          style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 60%, #fdba74 100%)' }}>
          <div className="absolute right-0 top-0 w-20 h-20 rounded-bl-[3rem] bg-white/30 pointer-events-none" />
          <div className="absolute right-3 top-3 w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
            <TrendingUp className="w-[18px] h-[18px]" />
          </div>
          <div className="min-w-0 pr-10">
            <p className="text-[11px] font-bold text-orange-500/80 uppercase tracking-widest truncate">Expense</p>
            <p className="mt-1.5 text-xl font-black text-orange-900 tracking-tight truncate leading-tight">
              ₹ {totalExpense.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="mt-3">
            <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-orange-800 bg-orange-200/60 px-2.5 py-1 rounded-lg truncate">
              Direct Costs
            </span>
          </div>
        </div>

        {/* Card 6: Margin — Purple / Violet */}
        <div className="relative rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden group min-w-0 p-4 flex flex-col justify-between"
          style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #e9d5ff 60%, #d8b4fe 100%)' }}>
          <div className="absolute right-0 top-0 w-20 h-20 rounded-bl-[3rem] bg-white/30 pointer-events-none" />
          <div className="absolute right-3 top-3 w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
            <Percent className="w-[18px] h-[18px]" />
          </div>
          <div className="min-w-0 pr-10">
            <p className="text-[11px] font-bold text-purple-400 uppercase tracking-widest truncate">Margin</p>
            <p className="mt-1.5 text-xl font-black text-purple-900 tracking-tight truncate leading-tight">
              ₹ {margin.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="mt-3">
            <span className="inline-flex items-center text-[10.5px] font-semibold text-purple-700 bg-purple-200/60 px-2.5 py-1 rounded-lg truncate">
              {totalSales > 0 ? `${((margin / totalSales) * 100).toFixed(0)}% Margin` : 'Net Margin'}
            </span>
          </div>
        </div>

      </div>

      {/* ============================================================== */}
      {/* 4. TRANSACTIONS TABLE / LIST (Matching Image 1 & 4)            */}
      {/* ============================================================== */}
      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-2xs">
        {/* Table Header (Matching User Screenshot: 3 Columns) */}
        <div className="grid grid-cols-12 px-6 py-3.5 bg-[#F8F9FE] border-b border-slate-200/70 text-[13px] font-semibold text-slate-700 select-none">
          <div className="col-span-6 sm:col-span-5">Party Name</div>
          <div className="col-span-3 sm:col-span-4 pl-2 sm:pl-6 text-left">Details</div>
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
            /* Populated Rows */
            <div className="divide-y divide-slate-100">
              {filteredTransactions.map((tx) => {
                // Parse date & time separately
                let displayDate = '17 Sep 2026';
                let displayTime = tx.time || '';
                try {
                  const d = new Date(tx.date);
                  if (!isNaN(d.getTime())) {
                    displayDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                    if (!displayTime && (tx.date.includes('T') || tx.date.includes(':'))) {
                      displayTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    }
                  }
                } catch (e) {}

                const isInvoice = tx.transaction_sub_type === 'Sales Invoice' || tx.category === 'Sales Invoice';
                const isSubcon = tx.category === 'Subcon Expense' || tx.transaction_sub_type === 'Subcon Expense' || tx.category === 'Sub Con Expense' || tx.transaction_sub_type === 'Sub Con Expense';
                const isPaymentIn = tx.type === 'IN' && !isInvoice;
                const isReversed = tx.status === 'REVERSED' || tx.is_reversed;
                const isClientAdvance = tx.payment_category === 'CLIENT_ADVANCE' || tx.transaction_sub_type === 'Client Advance' || (isPaymentIn && (tx.notes?.toLowerCase().includes('advance') || tx.category?.toLowerCase().includes('advance')));
                const advBal = isClientAdvance && !isReversed ? getTransactionAdvanceBalance(tx) : null;

                return (
                  <div
                    key={tx.id}
                    onClick={() => {
                      if (isInvoice) {
                        const invId = tx.id.startsWith('tx-inv-') ? tx.id.replace('tx-inv-', '') : null;
                        const cleanNum = tx.transaction_number.replace('#', '').trim().toLowerCase();
                        const matchingInv = projectInvoices.find(i => 
                          (invId && i.id === invId) ||
                          i.invoice_number.replace('#', '').trim().toLowerCase() === cleanNum ||
                          i.id === tx.reference_no ||
                          i.invoice_number === tx.reference_no
                        ) || projectInvoices[0];
                        if (matchingInv) {
                          setSelectedInvoiceForDetail(matchingInv);
                          setIsInvoiceDownloadDropdownOpen(false);
                          setIsInvoiceMoreMenuOpen(false);
                          return;
                        }
                      }
                      setSelectedTxForOverview(tx);
                    }}
                    className={`grid grid-cols-12 px-6 py-4 items-center hover:bg-[#F8F9FE]/70 transition-colors cursor-pointer group select-none ${
                      isReversed ? 'opacity-60 bg-slate-50/50' : ''
                    }`}
                  >
                    {/* Column 1: Party Name with Date Ticket Badge (Matching Screenshot) */}
                    <div className="col-span-6 sm:col-span-5 min-w-0 pr-3 flex items-center gap-3.5">
                      {/* Ticket Badge */}
                      {renderRowTicketBadge(
                        tx.date,
                        isInvoice ? 'invoice' : (isSubcon ? 'subcon' : (isPaymentIn ? 'in' : 'out'))
                      )}

                      {/* Party Name & Subtitle */}
                      <div className="min-w-0 flex-1">
                        <h4 className={`font-semibold text-[13.5px] sm:text-[14px] tracking-tight leading-snug truncate ${
                          isReversed ? 'text-slate-400 line-through' : 'text-slate-800 group-hover:text-blue-600 transition-colors'
                        }`}>
                          {tx.party_name}
                        </h4>
                        <div className="text-[11.5px] font-normal text-slate-500 mt-1 flex items-center gap-1.5 truncate">
                          <span>
                            {isInvoice 
                              ? 'Sales Invoice' 
                              : isSubcon
                              ? 'Subcon Expense'
                              : tx.transaction_sub_type || (isPaymentIn ? 'Payment In' : 'Payment Out')}
                          </span>
                          <span className="text-slate-300">|</span>
                          <span>{tx.transaction_number}</span>
                          {tx.boq_number && (
                            <>
                              <span className="text-slate-300">|</span>
                              <span>{tx.boq_number}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Details (Matching Screenshot) */}
                    <div className="col-span-3 sm:col-span-4 flex items-center justify-start text-left pl-2 sm:pl-6 min-w-0">
                      {isClientAdvance && advBal && !isReversed ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-md ${
                            advBal.unallocatedAmount > 0 
                              ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                              : 'bg-[#F1F3F9] text-slate-600'
                          }`}>
                            {advBal.unallocatedAmount > 0 
                              ? `Unallocated: ₹${advBal.unallocatedAmount.toLocaleString('en-IN')}` 
                              : 'Fully Settled'}
                          </span>
                          {advBal.unallocatedAmount > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTxForAllocation(tx);
                                setIsAllocateModalOpen(true);
                              }}
                              className="px-2 py-0.5 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-2xs cursor-pointer transition-transform active:scale-95 inline-flex items-center gap-1"
                            >
                              <span>Allocate</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center justify-center w-7 h-5 rounded-md bg-[#F1F3F9] text-[#8E95A9] text-xs font-semibold select-none">
                          -
                        </span>
                      )}
                    </div>

                    {/* Column 3: Amount & Status Badge (Matching Screenshot) */}
                    <div className="col-span-3 text-right shrink-0">
                      <div className={`tracking-tight font-semibold text-sm sm:text-[14.5px] ${
                        isReversed ? 'text-slate-400 line-through' : 'text-slate-800'
                      }`}>
                        ₹ {Number(tx.amount).toLocaleString('en-IN')}
                      </div>
                      <div className="mt-1 flex items-center justify-end gap-1.5">
                        {!isReversed && !isInvoice && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReverseTransaction(tx);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Reverse transaction"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Reverse</span>
                          </button>
                        )}
                        {!isInvoice && tx.payment_mode && tx.payment_mode !== 'Settled' && tx.payment_mode !== '-' && (
                          <span className={`inline-block px-2.5 py-0.5 rounded text-[10.5px] font-semibold lowercase ${
                            tx.payment_mode.toLowerCase() === 'unpaid' || tx.payment_mode.toLowerCase() === 'pending'
                              ? 'bg-[#EEF1FC] text-[#5364CD]'
                              : tx.payment_mode.toLowerCase() === 'partially paid'
                              ? 'bg-amber-50 text-amber-700'
                              : tx.payment_mode.toLowerCase() === 'paid'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-[#F1F3F9] text-slate-600'
                          }`}>
                            {tx.payment_mode.toLowerCase() === 'pending' ? 'unpaid' : tx.payment_mode.toLowerCase()}
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
                let prDate = '17 Sep 2026';
                let prTime = '';
                try {
                  const d = new Date(pr.payment_date);
                  if (!isNaN(d.getTime())) {
                    prDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                    if (pr.payment_date.includes('T') || pr.payment_date.includes(':')) {
                      prTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    }
                  }
                } catch (e) {}

                return (
                  <div
                    key={pr.id}
                    onClick={() => setSelectedPRForOverview(pr)}
                    className="grid grid-cols-12 px-6 py-4 items-center hover:bg-[#F8F9FE]/70 transition-colors cursor-pointer group select-none"
                  >
                    {/* Column 1: Party Name with Date Ticket Badge */}
                    <div className="col-span-6 sm:col-span-5 min-w-0 pr-3 flex items-center gap-3.5">
                      {renderRowTicketBadge(pr.payment_date, 'request')}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-[13.5px] sm:text-[14px] tracking-tight leading-snug text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                          {pr.party_name}
                        </h4>
                        <div className="text-[11.5px] font-normal text-slate-500 mt-1 truncate flex items-center gap-1.5">
                          <span>{pr.request_type}</span>
                          <span className="text-slate-300">|</span>
                          <span>{pr.request_number}</span>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Details */}
                    <div className="col-span-3 sm:col-span-4 flex items-center justify-start text-left pl-2 sm:pl-6 min-w-0">
                      {pr.due_date ? (
                        <span className="inline-flex items-center text-xs font-medium text-slate-600 bg-[#F1F3F9] px-2.5 py-0.5 rounded-md truncate">
                          Due: {pr.due_date}
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-7 h-5 rounded-md bg-[#F1F3F9] text-[#8E95A9] text-xs font-semibold select-none">
                          -
                        </span>
                      )}
                    </div>

                    {/* Column 3: Amount & Status Badge */}
                    <div className="col-span-3 text-right shrink-0">
                      <div className="tracking-tight font-semibold text-sm sm:text-[14.5px] text-slate-800">
                        ₹ {Number(pr.amount).toLocaleString('en-IN')}
                      </div>
                      <div className="mt-1 flex items-center justify-end gap-1.5">
                        <span className={`px-2.5 py-0.5 rounded text-[10.5px] font-semibold lowercase ${
                          pr.status === 'APPROVED' 
                            ? 'bg-emerald-50 text-emerald-700'
                            : pr.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700'
                            : pr.status === 'PAID'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-[#EEF1FC] text-[#5364CD]'
                        }`}>
                          {pr.status?.toLowerCase() || 'pending'}
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
      {/* 5. CREATE TRANSACTION RIGHT-SIDE DRAWER (Matches Screenshot)   */}
      {/* ============================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white max-w-lg w-full h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between animate-in slide-in-from-right duration-200">
            
            {/* Drawer Header (Exact Match to Screenshot) */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 text-sm tracking-wide uppercase">
                    {selectedSubtype === 'Other Expense' ? 'ADD EXPENSE' : selectedSubtype.toUpperCase()}
                  </h3>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase leading-snug truncate mt-0.5" title={project.name}>
                    {project.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingTx || isAmountOverLimit || (Number(formAmount) || 0) <= 0}
                  onClick={handleSaveTransaction}
                  className={`px-6 py-2 rounded-lg text-xs font-bold transition-all shadow-xs ${
                    isAmountOverLimit || (Number(formAmount) || 0) <= 0
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 active:scale-95 text-white cursor-pointer'
                  }`}
                >
                  Save
                </button>
              </div>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveTransaction} className="p-5 space-y-4 overflow-y-auto flex-1 bg-white">
              
              {/* Row 1: PAYMENT NUMBER * & PAYMENT DATE * (2 Columns matching screenshot) */}
              <div className="grid grid-cols-2 gap-3">
                {/* Payment Number with Edit Pencil */}
                <div className="relative border border-slate-200 rounded-xl px-3.5 pt-3 pb-2.5 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all bg-white">
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
                <div className="relative border border-slate-200 rounded-xl px-3.5 pt-3 pb-2.5 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all bg-white">
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

              {/* Row 2: PARTY NAME (Matching screenshot with pencil icon) */}
              <div ref={partyDropdownRef} className="relative">
                <div 
                  className="relative border border-slate-200 rounded-xl px-3.5 pt-3 pb-2.5 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all bg-white"
                >
                  <label className="absolute -top-2 left-2.5 bg-white px-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    PARTY NAME <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Party Name"
                      value={formPartyName}
                      onFocus={() => setIsPartyDropdownOpen(true)}
                      onChange={(e) => {
                        setFormPartyName(e.target.value);
                        setIsPartyDropdownOpen(true);
                      }}
                      className="w-full text-xs font-bold text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-300"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsPartyDropdownOpen(!isPartyDropdownOpen);
                      }}
                      className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
                      title="Browse Parties"
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Dropdown Menu of Accounts & Finance Parties (if user wants to select existing party) */}
                {isPartyDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1 max-h-60 overflow-y-auto">
                    <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                      <span>Select Party</span>
                      <span className="text-[9px] text-red-600 font-semibold lowercase">click to select</span>
                    </div>

                    {filteredTxPartyOptions.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-500">
                        {formPartyName.trim() ? `Using custom party: "${formPartyName}"` : 'No parties found'}
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
                                ? 'bg-red-50 text-red-900 font-bold border border-red-200'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-7 h-7 rounded-full ${p.avatarColor || 'bg-red-600'} text-white font-bold text-[11px] flex items-center justify-center shrink-0`}>
                                {p.avatarText || p.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-xs truncate text-slate-900">
                                  {p.name}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {p.type || 'Party'}
                                </div>
                              </div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-red-600 stroke-[3]" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Dynamic Middle Section based on subtype */}
              {selectedSubtype === 'Other Expense' ? (
                <div className="space-y-4 pt-1">
                  {/* Expense Items Breakdown */}
                  <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        EXPENSE ITEM DETAILS
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={siteExpEnableGST}
                          onChange={(e) => setSiteExpEnableGST(e.target.checked)}
                          className="w-4 h-4 text-red-600 rounded border-slate-300 accent-red-600 cursor-pointer"
                        />
                        <span>Enable GST (18%)</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-1 relative border border-slate-200 rounded-xl px-3 pt-2 pb-1.5 bg-white">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                          ITEM NAME
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Site Expense"
                          value={siteExpItemName}
                          onChange={(e) => setSiteExpItemName(e.target.value)}
                          className="w-full text-xs font-bold text-slate-900 bg-transparent focus:outline-none mt-0.5"
                        />
                      </div>

                      <div className="relative border border-slate-200 rounded-xl px-3 pt-2 pb-1.5 bg-white">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                          QUANTITY
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={siteExpQty}
                          onChange={(e) => setSiteExpQty(Number(e.target.value) || 1)}
                          className="w-full text-xs font-bold text-slate-900 bg-transparent focus:outline-none mt-0.5"
                        />
                      </div>

                      <div className="relative border border-slate-200 rounded-xl px-3 pt-2 pb-1.5 bg-white">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                          UNIT RATE (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={siteExpRate}
                          onChange={(e) => setSiteExpRate(Number(e.target.value) || 0)}
                          className="w-full text-xs font-bold text-slate-900 bg-transparent focus:outline-none mt-0.5"
                        />
                      </div>
                    </div>

                    <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs space-y-1">
                      <div className="flex justify-between text-slate-500">
                        <span>Subtotal</span>
                        <span className="font-semibold text-slate-800">₹ {(siteExpQty * siteExpRate).toLocaleString('en-IN')}</span>
                      </div>
                      {siteExpEnableGST && (
                        <div className="flex justify-between text-slate-500">
                          <span>GST (18%)</span>
                          <span className="font-semibold text-slate-800">₹ {Math.round(siteExpQty * siteExpRate * 0.18).toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-900 font-bold border-t border-slate-100 pt-1">
                        <span>Total Expense</span>
                        <span className="text-red-700">
                          ₹ {((siteExpQty * siteExpRate) + (siteExpEnableGST ? Math.round(siteExpQty * siteExpRate * 0.18) : 0)).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* AMOUNT */}
                  <div className="relative border border-slate-200 rounded-xl px-3.5 pt-3 pb-2.5 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all bg-white">
                    <label className="absolute -top-2 left-2.5 bg-white px-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      AMOUNT
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formAmount === '' ? '' : formAmount}
                      onChange={(e) => setFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full text-sm font-semibold text-slate-900 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
              ) : (selectedSubtype === 'Payment In' || selectedSubtype === 'I Received' || txFlowType === 'IN') ? (
                <>
                  {/* Row 3: AMOUNT (Exact match to screenshot with remaining balance cap) */}
                  <div className="space-y-1">
                    <div className={`relative border rounded-xl px-3.5 pt-3 pb-2.5 transition-all bg-white ${
                      isInvoiceAmountExceeded
                        ? 'border-red-500 ring-2 ring-red-100'
                        : 'border-slate-200 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100'
                    }`}>
                      <div className="flex items-center justify-between">
                        <label className={`absolute -top-2 left-2.5 bg-white px-1 text-[9px] font-bold uppercase tracking-wider ${
                          isInvoiceAmountExceeded ? 'text-red-600' : 'text-slate-400'
                        }`}>
                          AMOUNT
                        </label>
                        {selectedInvoiceIds.length > 0 && (
                          <span className="absolute -top-2 right-2.5 bg-white px-1 text-[9px] font-bold text-slate-500">
                            Max: ₹{selectedInvoicesDue.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={selectedInvoiceIds.length > 0 ? selectedInvoicesDue : undefined}
                        placeholder="0"
                        value={formAmount === '' ? '' : formAmount}
                        onChange={(e) => setFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        onBlur={() => {
                          if (selectedInvoiceIds.length > 0 && Number(formAmount) > selectedInvoicesDue) {
                            setFormAmount(selectedInvoicesDue);
                            onShowToast?.(`Amount adjusted to maximum allowed balance of ₹${selectedInvoicesDue.toLocaleString('en-IN')}`);
                          }
                        }}
                        className={`w-full text-sm font-semibold bg-transparent focus:outline-none ${
                          isInvoiceAmountExceeded ? 'text-red-700 font-bold' : 'text-slate-900'
                        }`}
                      />
                    </div>
                    {isInvoiceAmountExceeded && (
                      <div className="flex items-center justify-between text-[11px] text-red-600 font-medium px-1 pt-0.5">
                        <span>Cannot exceed invoice balance (₹{selectedInvoicesDue.toLocaleString('en-IN')})</span>
                        <button
                          type="button"
                          onClick={() => setFormAmount(selectedInvoicesDue)}
                          className="text-[10px] font-bold underline hover:text-red-800 cursor-pointer"
                        >
                          Set to Max
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Row 4: Invoice Settlement Card (Exact Match to Screenshot) */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">Invoice</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">Settle outstanding bills with the above payment</p>
                      </div>
                      <Pencil className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    </div>

                    {/* Invoices List */}
                    <div className="space-y-2 pt-1">
                      {partyOutstandingInvoices.length === 0 ? (
                        <div className="py-4 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                          No outstanding bills found for this project.
                        </div>
                      ) : (
                        partyOutstandingInvoices.map((inv) => {
                          const isChecked = selectedInvoiceIds.includes(inv.id);
                          const due = inv.balance_due ?? inv.total_amount;
                          let formattedInvDate = '7 Oct';
                          let formattedDueDate = '14 Oct';
                          try {
                            const idDate = new Date(inv.invoice_date);
                            if (!isNaN(idDate.getTime())) {
                              formattedInvDate = `${idDate.getDate()} ${idDate.toLocaleDateString('en-US', { month: 'short' })}`;
                              const dueDate = new Date(idDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                              formattedDueDate = `${dueDate.getDate()} ${dueDate.toLocaleDateString('en-US', { month: 'short' })}`;
                            }
                          } catch {}

                          return (
                            <div
                              key={inv.id}
                              onClick={() => handleToggleInvoiceSelection(inv.id, due)}
                              className={`flex items-start justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                isChecked
                                  ? 'border-red-600 bg-red-50/20 ring-1 ring-red-600/30'
                                  : 'border-slate-200 hover:border-slate-300 bg-white'
                              }`}
                            >
                              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  className="w-4 h-4 mt-0.5 text-red-600 rounded border-slate-300 accent-red-600 cursor-pointer shrink-0"
                                />
                                <div className="min-w-0 space-y-0.5">
                                  <span className="text-[10px] text-slate-400 font-medium block">{formattedInvDate}</span>
                                  <div className="text-xs font-bold text-slate-900 leading-tight">
                                    Sales Invoice (#{inv.invoice_number.replace('#', '')})
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    Due Date: {formattedDueDate}
                                  </div>
                                  <div className="text-[10px] text-slate-400 leading-tight truncate max-w-xs" title={project.name}>
                                    Project: {project.name}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="text-xs font-bold text-slate-900">
                                  ₹ {inv.total_amount.toLocaleString('en-IN')}
                                </div>
                                <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                                  ₹ {due.toLocaleString('en-IN')} Remaining
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Row 3: AMOUNT (For Payment Out with expense balance cap) */}
                  <div className="space-y-1">
                    <div className={`relative border rounded-xl px-3.5 pt-3 pb-2.5 transition-all bg-white ${
                      isExpenseAmountExceeded
                        ? 'border-red-500 ring-2 ring-red-100'
                        : 'border-slate-200 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100'
                    }`}>
                      <div className="flex items-center justify-between">
                        <label className={`absolute -top-2 left-2.5 bg-white px-1 text-[9px] font-bold uppercase tracking-wider ${
                          isExpenseAmountExceeded ? 'text-red-600' : 'text-slate-400'
                        }`}>
                          AMOUNT
                        </label>
                        {selectedExpenseIds.length > 0 && (
                          <span className="absolute -top-2 right-2.5 bg-white px-1 text-[9px] font-bold text-slate-500">
                            Max: ₹{selectedExpensesDue.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={selectedExpenseIds.length > 0 ? selectedExpensesDue : undefined}
                        placeholder="0"
                        value={formAmount === '' ? '' : formAmount}
                        onChange={(e) => setFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        onBlur={() => {
                          if (selectedExpenseIds.length > 0 && Number(formAmount) > selectedExpensesDue) {
                            setFormAmount(selectedExpensesDue);
                            onShowToast?.(`Amount adjusted to maximum allowed balance of ₹${selectedExpensesDue.toLocaleString('en-IN')}`);
                          }
                        }}
                        className={`w-full text-sm font-semibold bg-transparent focus:outline-none ${
                          isExpenseAmountExceeded ? 'text-red-700 font-bold' : 'text-slate-900'
                        }`}
                      />
                    </div>
                    {isExpenseAmountExceeded && (
                      <div className="flex items-center justify-between text-[11px] text-red-600 font-medium px-1 pt-0.5">
                        <span>Cannot exceed expense balance (₹{selectedExpensesDue.toLocaleString('en-IN')})</span>
                        <button
                          type="button"
                          onClick={() => setFormAmount(selectedExpensesDue)}
                          className="text-[10px] font-bold underline hover:text-red-800 cursor-pointer"
                        >
                          Set to Max
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Expense Settle Card (For Payment Out) */}
                  {partyOutstandingExpenses.length > 0 && (
                    <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">Expense</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Settle outstanding bills with the above payment</p>
                        </div>
                        <Pencil className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      </div>

                      <div className="space-y-2 pt-1">
                        {partyOutstandingExpenses.map((exp) => {
                          const isChecked = selectedExpenseIds.includes(exp.id);
                          const due = exp.balance_due ?? exp.total_amount;
                          return (
                            <div
                              key={exp.id}
                              onClick={() => handleToggleExpenseSelection(exp.id, due)}
                              className={`flex items-start justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                isChecked
                                  ? 'border-red-600 bg-red-50/20 ring-1 ring-red-600/30'
                                  : 'border-slate-200 hover:border-slate-300 bg-white'
                              }`}
                            >
                              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  className="w-4 h-4 mt-0.5 text-red-600 rounded border-slate-300 accent-red-600 cursor-pointer shrink-0"
                                />
                                <div className="min-w-0 space-y-0.5">
                                  <div className="text-xs font-bold text-slate-900 leading-tight">
                                    {exp.voucher_no} - {exp.item_name}
                                  </div>
                                  <div className="text-[11px] text-slate-500">{exp.date} • {exp.party_name}</div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-xs font-bold text-slate-900">₹ {exp.total_amount.toLocaleString('en-IN')}</div>
                                <div className="text-[11px] text-slate-500 font-medium mt-0.5">₹ {due.toLocaleString('en-IN')} Remaining</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Row 5: Payment Method Radio Options (Exact match to screenshot) */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2.5 bg-white">
                <label className="text-xs font-semibold text-slate-800 block">
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

                {/* Dynamic Bank Selection when Bank Transfer or Cheque is selected */}
                {(formPaymentMethod === 'Bank Transfer' || formPaymentMethod === 'Cheque') && (
                  <div className="pt-3 mt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-red-600" />
                        <span>Select Bank Account</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsAddingNewBank(!isAddingNewBank)}
                        className="text-[10px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3 stroke-[3]" />
                        <span>Add Bank</span>
                      </button>
                    </div>

                    <div ref={bankDropdownRef} className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setIsBankDropdownOpen(!isBankDropdownOpen);
                          setIsCostCodeDropdownOpen(false);
                        }}
                        className={`w-full text-left relative border rounded-xl px-3.5 pt-2 pb-1.5 bg-white transition-all cursor-pointer flex items-center justify-between ${
                          isBankDropdownOpen ? 'border-red-600 ring-1 ring-red-100' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 block truncate">
                            {currentSelectedBank ? currentSelectedBank.bank_name : 'Select Bank'}
                          </span>
                          {currentSelectedBank && (
                            <span className="text-[10px] text-slate-400 block truncate">
                              A/c: •••• {currentSelectedBank.account_number.slice(-4)} • {currentSelectedBank.branch}
                            </span>
                          )}
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 ml-1 transition-transform ${isBankDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isBankDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in space-y-1">
                          {bankAccounts.map((b) => (
                            <div
                              key={b.id}
                              onClick={() => {
                                setSelectedBankId(b.id);
                                setIsBankDropdownOpen(false);
                              }}
                              className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between ${
                                b.id === selectedBankId ? 'bg-red-50 text-red-700 font-bold' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div>
                                <div className="font-bold">{b.bank_name}</div>
                                <div className="text-[10px] text-slate-400">•••• {b.account_number.slice(-4)} • {b.branch}</div>
                              </div>
                              {b.id === selectedBankId && <Check className="w-3.5 h-3.5 text-red-600 stroke-[3]" />}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Add Bank Inline */}
                    {isAddingNewBank && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 mt-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Bank Name *"
                            value={newBankName}
                            onChange={(e) => setNewBankName(e.target.value)}
                            className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-red-600"
                          />
                          <input
                            type="text"
                            placeholder="Account Number *"
                            value={newAccountNumber}
                            onChange={(e) => setNewAccountNumber(e.target.value)}
                            className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-red-600"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setIsAddingNewBank(false)}
                            className="px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-200 rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleAddNewBank}
                            className="px-3 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Row 6: ADD COST CODE (Exact match to screenshot) */}
              <div ref={costCodeDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsCostCodeDropdownOpen(!isCostCodeDropdownOpen);
                    setIsBankDropdownOpen(false);
                  }}
                  className={`w-full text-left relative border rounded-xl px-3.5 pt-3 pb-2.5 bg-white transition-all cursor-pointer flex items-center justify-between ${
                    isCostCodeDropdownOpen
                      ? 'border-red-600 ring-1 ring-red-100'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <label className="absolute -top-2 left-2.5 bg-white px-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider pointer-events-none">
                    ADD COST CODE
                  </label>
                  <span className={`text-xs truncate ${
                    formCostCode !== 'Select Cost Code' ? 'text-slate-900 font-semibold' : 'text-slate-600'
                  }`}>
                    {formCostCode}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 ml-1 transition-transform ${isCostCodeDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isCostCodeDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-40 animate-in fade-in space-y-1 max-h-56 overflow-y-auto">
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
                          className={`px-3 py-2 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-between ${
                            isSelected ? 'bg-red-50 text-red-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{code}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-red-600 stroke-[3]" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Row 7: REFERENCE NO. (Exact match to screenshot) */}
              <div className="relative border border-slate-200 rounded-xl px-3.5 pt-3 pb-2.5 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-100 transition-all bg-white">
                <label className="absolute -top-2 left-2.5 bg-white px-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  REFERENCE NO.
                </label>
                <input
                  type="text"
                  placeholder=""
                  value={formReferenceNo}
                  onChange={(e) => setFormReferenceNo(e.target.value)}
                  className="w-full text-xs font-semibold text-slate-900 bg-transparent focus:outline-none"
                />
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. SALES INVOICE SIDE DRAWER (Exact Match to User Screenshots) */}
      {/* ============================================================== */}
      {selectedInvoiceForDetail && (
        <div 
          onClick={() => {
            setSelectedInvoiceForDetail(null);
            setIsInvoiceDownloadDropdownOpen(false);
            setIsInvoiceMoreMenuOpen(false);
          }}
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white max-w-lg w-full h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between animate-in slide-in-from-right duration-200 cursor-default"
          >
            {/* Header: ✕ SALES INVOICE, Entry by Bagyavathi Accountant, Mail, Download, Edit, 3-dots */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white relative">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedInvoiceForDetail(null);
                    setIsInvoiceDownloadDropdownOpen(false);
                    setIsInvoiceMoreMenuOpen(false);
                  }}
                  className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm tracking-wide uppercase">SALES INVOICE</h3>
                  <p className="text-[11px] text-slate-500">Entry by Bagyavathi Accountant</p>
                </div>
              </div>

              <div className="flex items-center gap-2 relative">
                {/* Email icon button */}
                <button
                  type="button"
                  title="Share Invoice by Email"
                  onClick={() => {
                    window.open(`mailto:?subject=${encodeURIComponent(`Invoice ${selectedInvoiceForDetail.invoice_number} - ${selectedInvoiceForDetail.client_name}`)}&body=${encodeURIComponent(`Dear ${selectedInvoiceForDetail.client_name},\n\nPlease find your Sales Invoice #${selectedInvoiceForDetail.invoice_number} for ₹${selectedInvoiceForDetail.total_amount.toLocaleString('en-IN')}.\n\nProject: ${project.name}\nBOQ No: ${selectedInvoiceForDetail.boq_number || 'Sales-62'}\n\nRegards,\nBOOSHNAM ASSOCIATES PVT LTD`)}`);
                  }}
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer border border-slate-200 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                </button>

                {/* Download icon button with dropdown (PDF & Excel) */}
                <div className="relative">
                  <button
                    type="button"
                    title="Download Invoice"
                    onClick={() => {
                      setIsInvoiceDownloadDropdownOpen(!isInvoiceDownloadDropdownOpen);
                      setIsInvoiceMoreMenuOpen(false);
                    }}
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer border border-slate-200 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {isInvoiceDownloadDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <button
                        type="button"
                        onClick={() => {
                          setIsInvoiceDownloadDropdownOpen(false);
                          exportSalesInvoiceToPDF(selectedInvoiceForDetail, project.name);
                          onShowToast?.(`Downloading ${selectedInvoiceForDetail.invoice_number} as PDF...`);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-red-50 hover:text-red-700 flex items-center gap-2.5 cursor-pointer font-medium"
                      >
                        <FileText className="w-4 h-4 text-red-600" />
                        <span>Download PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsInvoiceDownloadDropdownOpen(false);
                          exportSalesInvoiceToExcel(selectedInvoiceForDetail, project.name);
                          onShowToast?.(`Downloading ${selectedInvoiceForDetail.invoice_number} as Excel (.xlsx)...`);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 cursor-pointer font-medium"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>Download Excel (.xlsx)</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Edit icon button */}
                <button
                  type="button"
                  title="Edit Invoice"
                  onClick={() => onShowToast?.(`Editing ${selectedInvoiceForDetail.invoice_number}...`)}
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer border border-slate-200 transition-colors"
                >
                  <SquarePen className="w-4 h-4" />
                </button>

                {/* 3-dots menu button with Delete option (Screenshot 2) */}
                <div className="relative">
                  <button
                    type="button"
                    title="More Options"
                    onClick={() => {
                      setIsInvoiceMoreMenuOpen(!isInvoiceMoreMenuOpen);
                      setIsInvoiceDownloadDropdownOpen(false);
                    }}
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer border border-slate-200 transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {isInvoiceMoreMenuOpen && (
                    <div className="absolute right-0 mt-2 w-32 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <button
                        type="button"
                        onClick={() => handleDeleteInvoice(selectedInvoiceForDetail)}
                        className="w-full px-3.5 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Top Purple Stripe below header matching Screenshot 1 */}
            <div className="h-1 bg-[#6366f1] w-full shrink-0" />

            {/* Body matching Screenshots 1 & 2 */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              
              {/* Top Info Block: Date Badge + Client Details */}
              <div className="flex items-start gap-3.5">
                {/* Blue calendar date badge */}
                <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-lg px-2.5 py-2 flex flex-col items-center justify-center shrink-0 min-w-[70px]">
                  <span className="text-[10px] font-bold text-[#1d4ed8] leading-tight">
                    {formatDateBadge(selectedInvoiceForDetail.invoice_date).text}
                  </span>
                  <div className="mt-1 w-6 h-6 rounded bg-[#3b82f6] text-white flex items-center justify-center text-[9px] font-bold shadow-2xs">
                    INV
                  </div>
                </div>

                {/* Metadata */}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="text-xs text-slate-700">
                    Client: <span className="font-bold text-slate-900">{selectedInvoiceForDetail.client_name}</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-600">
                    #{selectedInvoiceForDetail.invoice_number.replace('#', '')}
                  </div>
                  <div className="text-[11px] text-slate-500 leading-tight">
                    Project: {project.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    BOQ No: {selectedInvoiceForDetail.boq_number || 'Sales-62'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Due Date: {formatDueDate(selectedInvoiceForDetail.invoice_date)}
                  </div>
                </div>
              </div>

              {/* Address Block */}
              <div className="grid grid-cols-2 gap-4 py-3 border-t border-b border-slate-100 text-xs">
                <div>
                  <div className="text-slate-600 font-medium">Bill From:</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">No address available</div>
                  <div className="text-slate-600 font-medium mt-2.5">Ship From:</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">No address available</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-600 font-medium">Bill To:</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">No address available</div>
                  <div className="text-slate-600 font-medium mt-2.5">Ship To:</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">No address available</div>
                </div>
              </div>

              {/* Line Items Table (Screenshot 1) */}
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium pb-2 border-b border-slate-100">
                  <span className="flex-1">Item</span>
                  <span className="w-16 text-center">Qty.</span>
                  <span className="w-20 text-right">Amt.</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {selectedInvoiceForDetail.items?.map((item, idx) => (
                    <div key={idx} className="py-3 flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-normal text-slate-800 text-xs leading-relaxed">
                          {item.item_name || item.description}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          ₹ {item.unit_rate.toLocaleString('en-IN')}/{item.unit || 'nos'}
                        </div>
                      </div>
                      <div className="w-16 text-center font-medium text-slate-700 text-xs pt-0.5">
                        {item.invoiced_quantity}
                      </div>
                      <div className="w-20 text-right font-medium text-slate-800 text-xs pt-0.5">
                        {item.total_amount.toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tax & Financial Breakdown (Screenshot 2) */}
              <div className="space-y-2 text-xs text-slate-600 pt-1">
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Sub Total</span>
                  <span className="font-semibold text-slate-900">₹ {(selectedInvoiceForDetail.sub_total || 12000).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>CGST (9%)</span>
                  <span>₹ {Math.round((selectedInvoiceForDetail.gst_amount || 2160) / 2).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST (9%)</span>
                  <span>₹ {Math.round((selectedInvoiceForDetail.gst_amount || 2160) / 2).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>₹ {(selectedInvoiceForDetail.discount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Additional Charges</span>
                  <span>₹ 0</span>
                </div>

                <div className="border-t border-slate-100 pt-2 flex justify-between font-bold text-slate-900">
                  <span>Total Amount</span>
                  <span>₹ {selectedInvoiceForDetail.total_amount.toLocaleString('en-IN')}</span>
                </div>

                <div className="border-t border-slate-100 pt-2 flex justify-between">
                  <span>Post Tax Deductions</span>
                  <span>₹ 0</span>
                </div>
                <div className="flex justify-between">
                  <span>Post Tax Retentions</span>
                  <span>₹ 0</span>
                </div>

                <div className="border-t border-slate-100 pt-2 flex justify-between font-bold text-slate-900">
                  <span>Net Amount</span>
                  <span>₹ {selectedInvoiceForDetail.total_amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Settled Amount</span>
                  <span>₹ {(selectedInvoiceForDetail.settled_amount || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Balance Due Container (Screenshot 2) */}
              <div className="bg-[#fff5f5] border border-rose-100 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs">Balance Due</span>
                <span className="font-extrabold text-slate-900 text-sm">
                  ₹ {(selectedInvoiceForDetail.balance_due ?? selectedInvoiceForDetail.total_amount).toLocaleString('en-IN')}
                </span>
              </div>

              {/* Terms & Condition Notch Box (Screenshot 2) */}
              <div className="border border-slate-200/90 rounded-xl p-3.5 bg-white space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider">TERMS & CONDITION</span>
                  <Settings className="w-4 h-4 text-slate-700" />
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Late payments may result in late payment fees. Please reach out to us in case of any Invoice errors. All disputes are subject to India jurisdiction only
                </p>
              </div>

              {/* Bank Details (Screenshot 2) */}
              <div className="pt-2 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-xs">BOOSHNAM ASSOCIATES PVT LTD</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">AC: 922020058090700</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 bg-[#861F41] rounded flex items-center justify-center text-white text-[11px] font-bold">
                    ▲
                  </div>
                  <span className="text-[9px] font-extrabold text-[#861F41] tracking-tight">AXIS BANK</span>
                </div>
              </div>

              {/* Payment In button (Screenshot 2) */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const inv = selectedInvoiceForDetail;
                    setSelectedInvoiceForDetail(null);
                    handleOpenCreateModal('Payment In', 'IN');
                    if (inv) {
                      setSelectedInvoiceIds([inv.id]);
                      setFormAmount(inv.balance_due !== undefined ? inv.balance_due : inv.total_amount);
                    }
                  }}
                  className="w-full py-2.5 bg-white border border-slate-200 hover:border-red-500 hover:bg-red-50/20 text-red-600 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <Plus className="w-4 h-4" />
                  <span>Payment In</span>
                </button>
              </div>

              {/* Approved Badge (Screenshot 2 bottom) */}
              <div className="pt-2 pb-1 flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>APPROVED</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. PAYMENT IN OVERVIEW MODAL / DRAWER (Exact Match to Image 5) */}
      {/* ============================================================== */}
      {selectedTxForOverview && (
        <div 
          onClick={() => setSelectedTxForOverview(null)}
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white max-w-lg w-full h-full shadow-2xl border-l border-slate-200 cursor-default animate-in slide-in-from-right duration-200 flex flex-col justify-between"
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
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="truncate max-w-[220px]">{prMediaName || 'Attached Document'}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPrMediaUrl(null);
                        setPrMediaName(null);
                      }}
                      className="p-1 hover:text-red-600 text-slate-400 ml-1"
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

      {/* Advance Allocation Modal */}
      {isAllocateModalOpen && txForAllocation && (
        <AllocateAdvanceModal
          isOpen={isAllocateModalOpen}
          onClose={() => {
            setIsAllocateModalOpen(false);
            setTxForAllocation(null);
          }}
          sourceTransaction={txForAllocation}
          project={project}
          onSuccess={(msg) => {
            setIsAllocateModalOpen(false);
            setTxForAllocation(null);
            try {
              const raw = localStorage.getItem(`siteops_project_transactions_${projectIdKey}`);
              if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) setTransactions(parsed);
              }
            } catch (e) {}
            onShowToast?.(msg);
          }}
        />
      )}

    </div>
  );
};

