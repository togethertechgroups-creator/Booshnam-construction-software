import React, { useState, useMemo, useEffect } from 'react';
import { 
  DollarSign, CheckCircle2, Clock, AlertCircle, Plus, 
  Search, Filter, Download, ArrowUpRight, ArrowDownRight, 
  Receipt, Building2, User, FileText, Check, X, ShieldCheck,
  CreditCard, Wallet, Landmark, TrendingUp, Boxes, Gift, 
  Trophy, Bell, ChevronDown, ExternalLink, RefreshCw, Printer, 
  Sparkles, SlidersHorizontal, Calendar, Phone, Mail, FileSpreadsheet,
  ArrowRight, Shield, Layers, HelpCircle, CheckCheck, Eye,
  ArrowUp, ArrowDown, MapPin, ArrowLeft, ChevronRight
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

export const INITIAL_PARTIES: PartyRecord[] = [
  {
    id: 'pty-1',
    name: '(Ag & P)',
    avatarText: '(&',
    avatarColor: 'bg-[#1E40AF]',
    type: 'Client',
    phone: '+91 98401 12345',
    email: 'agandp@client.in',
    balanceDue: 757555,
    status: 'To Receive',
    activeStatus: 'Active',
    partyId: '1631',
    dateOfJoining: '12/04/2025'
  },
  {
    id: 'pty-2',
    name: '9381025889',
    avatarText: '9',
    avatarColor: 'bg-[#1E40AF]',
    type: 'Client',
    phone: '+91 93810 25889',
    email: '9381025889@client.in',
    balanceDue: 0,
    status: 'Settled',
    activeStatus: 'Active',
    partyId: '1632',
    dateOfJoining: '15/05/2025'
  },
  {
    id: 'pty-3',
    name: 'A & D Builders',
    avatarText: 'A&',
    avatarColor: 'bg-[#1E40AF]',
    type: 'Client',
    phone: '+91 98412 88990',
    email: 'adbuilders@gmail.com',
    balanceDue: 0,
    status: 'Settled',
    activeStatus: 'Active',
    partyId: '1633',
    dateOfJoining: '02/06/2025'
  },
  {
    id: 'pty-4',
    name: 'Aadvik Construction Rettri',
    avatarText: 'AC',
    avatarColor: 'bg-[#1E40AF]',
    type: 'Client',
    phone: '+91 97900 44556',
    email: 'aadvik.rettri@gmail.com',
    balanceDue: 0,
    status: 'Settled',
    activeStatus: 'Active',
    partyId: '1634',
    dateOfJoining: '10/07/2025'
  },
  {
    id: 'pty-5',
    name: 'aarkesh',
    avatarText: 'A',
    avatarColor: 'bg-[#7C3AED]',
    type: 'Staff',
    phone: '+91 90031 77889',
    email: 'aarkesh@booshnam.com',
    balanceDue: 0,
    status: 'Settled',
    activeStatus: 'Active',
    partyId: '1635',
    dateOfJoining: '01/08/2025'
  },
  {
    id: 'pty-6',
    name: 'Aarthi Gerugambakkam',
    avatarText: 'AG',
    avatarColor: 'bg-[#1E40AF]',
    type: 'Client',
    phone: '+91 94440 33221',
    email: 'aarthi.geru@gmail.com',
    balanceDue: 0,
    status: 'Settled',
    activeStatus: 'Active',
    partyId: '1636',
    dateOfJoining: '14/09/2025'
  },
  {
    id: 'pty-7',
    name: 'AB Builders Jamalia',
    avatarText: 'AB',
    avatarColor: 'bg-[#1E40AF]',
    type: 'Client',
    phone: '+91 98405 66778',
    email: 'abbuilders.jamalia@gmail.com',
    balanceDue: 0,
    status: 'Settled',
    activeStatus: 'Active',
    partyId: '1637',
    dateOfJoining: '20/10/2025'
  },
  {
    id: 'pty-8',
    name: 'Abdul Dawn Promoters',
    avatarText: 'AD',
    avatarColor: 'bg-[#1E40AF]',
    type: 'Client',
    phone: '+91 98841 99001',
    email: 'abduldawn.promoters@gmail.com',
    balanceDue: 0,
    status: 'Settled',
    activeStatus: 'Active',
    partyId: '1638',
    dateOfJoining: '05/11/2025'
  },
  {
    id: 'pty-9',
    name: 'Abhishek Neelankandan',
    avatarText: 'AN',
    avatarColor: 'bg-[#1E40AF]',
    type: 'Client',
    phone: '+91 98409 11223',
    email: 'abhishek.n@gmail.com',
    balanceDue: 0,
    status: 'Settled',
    activeStatus: 'Active',
    partyId: '1639',
    dateOfJoining: '10/01/2026'
  }
];

export const INITIAL_PARTY_TRANSACTIONS: Record<string, PartyLedgerTransaction[]> = {
  'pty-1': [
    {
      id: 'ptx-1',
      partyId: 'pty-1',
      partyName: '(Ag & P)',
      date: '07 Jul 2026',
      day: '07',
      month: 'Jul',
      year: '2026',
      title: 'RA11-BAGJ-1747(2026-2027)-AG&P-Ananthapur-(23pts)-Machine(Sadayan)-',
      projectName: 'Booshnam Associates Pvt Ltd',
      notes: '2% TDS',
      amount: 348531.28,
      type: 'SALES_INVOICE'
    },
    {
      id: 'ptx-2',
      partyId: 'pty-1',
      partyName: '(Ag & P)',
      date: '07 Jul 2026',
      day: '07',
      month: 'Jul',
      year: '2026',
      title: 'RA11-BAGJ-1770(2026-2027)-AG&P-Hindupur-Machine-(Sadayan)-(6pts)',
      notes: '2% TDS',
      amount: 98001,
      type: 'SALES_INVOICE'
    },
    {
      id: 'ptx-3',
      partyId: 'pty-1',
      partyName: '(Ag & P)',
      date: '07 Jul 2026',
      day: '07',
      month: 'Jul',
      year: '2026',
      title: 'RA11-BAGJ-1771(2026-2027)-AG&P-Kadapa-(Machine)-Sadayan-(8pts)',
      projectName: 'Booshnam Associates Pvt Ltd',
      notes: '2% TDS',
      amount: 133464,
      type: 'SALES_INVOICE'
    },
    {
      id: 'ptx-4',
      partyId: 'pty-1',
      partyName: '(Ag & P)',
      date: '30 Jun 2026',
      day: '30',
      month: 'Jun',
      year: '2026',
      title: 'RA11-BAGJ-3234-AG&P-Ananthapur-(4pts)-(Machine)-Ranjith-',
      projectName: 'Booshnam Associates Pvt Ltd',
      notes: '2% tds',
      amount: 58983,
      type: 'SALES_INVOICE'
    },
    {
      id: 'ptx-5',
      partyId: 'pty-1',
      partyName: '(Ag & P)',
      date: '25 May 2026',
      day: '25',
      month: 'May',
      year: '2026',
      title: 'RA11-BAGJ-2034-AG & P Client-4pts-Shollinganallur-Machine',
      notes: '10% TDS',
      amount: 67781,
      type: 'SALES_INVOICE'
    }
  ]
};

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

interface AccountsFinanceViewProps {
  projects?: Project[];
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onShowToast?: (msg: string) => void;
}

export const AccountsFinanceView: React.FC<AccountsFinanceViewProps> = ({
  projects = MOCK_PROJECTS,
  isSidebarOpen,
  onToggleSidebar,
  onShowToast
}) => {
  // Navigation Tabs: Party, Transaction, Payment Requests, Accounts
  const [activeTab, setActiveTab] = useState<'party' | 'transaction' | 'payment_requests' | 'accounts'>('party');

  // Parties State with LocalStorage Persistence
  const [parties, setParties] = useState<PartyRecord[]>(() => {
    try {
      const saved = localStorage.getItem('booshnam_finance_parties');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return INITIAL_PARTIES;
  });

  useEffect(() => {
    try {
      localStorage.setItem('booshnam_finance_parties', JSON.stringify(parties));
    } catch {
      // Ignore
    }
  }, [parties]);

  // Payment Requests State
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequestItem[]>([
    {
      id: 'pr-1',
      requestCode: 'Payment Request # - 3',
      date: '13 Jul 26',
      partyName: 'Jd Ekambaram Chrompet',
      projectName: 'RO66 - 2153 - (2026 - 2027) - Jd Ekambaram - Chromepet - (4pts)-Ranjith-(Machine)-9047499476',
      subProjectText: 'Against Other',
      amount: 5000,
      status: 'Paid',
      category: 'Machinery Hire & Operator',
      paymentMode: 'UPI / GPay',
      referenceNo: 'UPI/260713/88921',
      paidDate: '13 Jul 2026',
      notes: 'Site excavation and trench digging at Chromepet plot'
    },
    {
      id: 'pr-2',
      requestCode: 'Payment Request # - 2',
      date: '12 Jul 26',
      partyName: 'UltraTech Cement Agency',
      projectName: 'Villa Grande Phase 2 - Structural Concrete Pouring',
      subProjectText: 'Against Material PO #PO-8821',
      amount: 145000,
      status: 'Paid',
      category: 'Material Supply',
      paymentMode: 'NEFT / RTGS',
      referenceNo: 'HDFC20260712009',
      paidDate: '12 Jul 2026',
      notes: 'Grade M25 RMC batch supply 40 CuM'
    },
    {
      id: 'pr-3',
      requestCode: 'Payment Request # - 1',
      date: '10 Jul 26',
      partyName: 'Sri Murugan Steel Traders',
      projectName: 'Commercial Hub - TMT Rebar Batch 4',
      subProjectText: 'Against Material PO #PO-8790',
      amount: 82500,
      status: 'Approved',
      category: 'Raw Materials',
      paymentMode: 'Cheque',
      referenceNo: 'CHQ-449102',
      notes: 'Fe550D TMT Steel 16mm & 20mm bundles'
    },
    {
      id: 'pr-4',
      requestCode: 'Payment Request # - 4',
      date: '08 Jul 26',
      partyName: 'Ranjith Earthmovers & JCB',
      projectName: 'Green Valley Villas - Foundation Excavation',
      subProjectText: 'Against Machinery Hire',
      amount: 28000,
      status: 'Pending',
      category: 'Equipment Rental',
      paymentMode: 'Bank Transfer',
      notes: 'JCB 3DX 40 hours site clearance work'
    },
    {
      id: 'pr-5',
      requestCode: 'Payment Request # - 5',
      date: '05 Jul 26',
      partyName: 'City Electricals & Hardware',
      projectName: 'Residential Tower B - Floor 1 Electricals',
      subProjectText: 'Against Material PO #PO-8805',
      amount: 42000,
      status: 'Paid',
      category: 'Electricals',
      paymentMode: 'NEFT / RTGS',
      referenceNo: 'HDFC20260705011',
      paidDate: '06 Jul 2026',
      notes: 'Conduits, copper wires and modular box consignment'
    },
    {
      id: 'pr-6',
      requestCode: 'Payment Request # - 6',
      date: '02 Jul 26',
      partyName: 'Apex Safety Solutions',
      projectName: 'Metro Station Extension - Safety Gears',
      subProjectText: 'Against Safety Equipments',
      amount: 18500,
      status: 'Rejected',
      category: 'Safety & PPE',
      notes: 'Rejected due to missing delivery challan stamp'
    }
  ]);

  // Transactions State
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([
    {
      id: 'tx-1',
      txnCode: 'TXN-2026-081',
      date: '13 Jul 2026',
      type: 'EXPENSE',
      partyName: 'Jd Ekambaram Chrompet',
      projectName: 'RO66 - Chromepet',
      category: 'Machinery Hire',
      amount: 5000,
      mode: 'UPI',
      referenceNo: 'UPI/260713/88921',
      status: 'Completed'
    },
    {
      id: 'tx-2',
      txnCode: 'TXN-2026-080',
      date: '12 Jul 2026',
      type: 'EXPENSE',
      partyName: 'UltraTech Cement Agency',
      projectName: 'Villa Grande Phase 2',
      category: 'Material Purchase',
      amount: 145000,
      mode: 'NEFT/RTGS',
      referenceNo: 'HDFC20260712009',
      status: 'Reconciled'
    },
    {
      id: 'tx-3',
      txnCode: 'TXN-2026-079',
      date: '11 Jul 2026',
      type: 'INCOME',
      partyName: 'Mr. Arvind Swamy (Client)',
      projectName: 'Villa Grande Phase 2',
      category: 'Milestone 3 Client Receipt',
      amount: 500000,
      mode: 'NEFT/RTGS',
      referenceNo: 'ICIC20260711802',
      status: 'Reconciled'
    },
    {
      id: 'tx-4',
      txnCode: 'TXN-2026-078',
      date: '06 Jul 2026',
      type: 'EXPENSE',
      partyName: 'City Electricals & Hardware',
      projectName: 'Residential Tower B',
      category: 'Electrical Wiring',
      amount: 42000,
      mode: 'NEFT/RTGS',
      referenceNo: 'HDFC20260705011',
      status: 'Completed'
    },
    {
      id: 'tx-5',
      txnCode: 'TXN-2026-077',
      date: '04 Jul 2026',
      type: 'INCOME',
      partyName: 'Titan Real Estate Corp (Client)',
      projectName: 'Commercial Hub',
      category: 'Slab Casting Milestone',
      amount: 1250000,
      mode: 'NEFT/RTGS',
      referenceNo: 'SBIN20260704991',
      status: 'Reconciled'
    }
  ]);

  // Bank Accounts State
  const [bankAccounts, setBankAccounts] = useState<BankAccountRecord[]>([
    {
      id: 'ba-1',
      accountName: 'Booshnam Associates Operations A/c',
      bankName: 'HDFC Bank Ltd',
      accountNumber: '•••• •••• 4892',
      ifscCode: 'HDFC0001234',
      accountType: 'Current',
      balance: 1845200,
      status: 'Active',
      tallyLedgerName: 'HDFC Current Account (Main)'
    },
    {
      id: 'ba-2',
      accountName: 'Project Escrow Account (RERA)',
      bankName: 'State Bank of India',
      accountNumber: '•••• •••• 9012',
      ifscCode: 'SBIN0005678',
      accountType: 'Escrow',
      balance: 4280000,
      status: 'Active',
      tallyLedgerName: 'SBI Project Escrow Account'
    },
    {
      id: 'ba-3',
      accountName: 'Site Petty Cash Vault - Chromepet',
      bankName: 'Internal Site Cash Safe',
      accountNumber: 'PETTY-CHR-01',
      ifscCode: 'N/A (Cash)',
      accountType: 'Petty Cash',
      balance: 35000,
      status: 'Active',
      tallyLedgerName: 'Site Imprest Cash - Chromepet'
    }
  ]);

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
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_PARTY_TRANSACTIONS;
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
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      'pty-1': { opening: 0, partyPaid: 2334276.91, salesInvoice: 3091831.91 }
    };
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
    let advancePaid = 3586237.38;
    let toPay = 13098678.07;
    let toReceive = 4559432;
    let advanceReceived = 356104;

    const initialIds = new Set(INITIAL_PARTIES.map(ip => ip.id));
    const customParties = parties.filter(p => !initialIds.has(p.id));
    for (const cp of customParties) {
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

        {/* Right utilities matching Image 1 */}
        <div className="flex items-center gap-3.5 sm:gap-6">
          {/* Book Demo */}
          <button
            type="button"
            onClick={() => setIsDemoModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-[#635BFF] transition-colors cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-[#635BFF]" />
            <span className="hidden sm:inline">Book Demo</span>
          </button>

          {/* Integrate Tally/Zoho */}
          <button
            type="button"
            onClick={() => setIsTallyModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-[#635BFF] transition-colors cursor-pointer"
          >
            <Boxes className="w-3.5 h-3.5 text-[#635BFF]" />
            <span className="hidden md:inline">Integrate Tally/Zoho</span>
          </button>

          {/* Refer & Earn */}
          <button
            type="button"
            onClick={() => setIsReferModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-[#635BFF] transition-colors cursor-pointer"
          >
            <Gift className="w-3.5 h-3.5 text-[#635BFF]" />
            <span className="hidden md:inline">Refer & Earn</span>
          </button>

          {/* Leaderboard */}
          <button
            type="button"
            onClick={() => setIsLeaderboardModalOpen(true)}
            className="text-xs font-semibold text-slate-700 hover:text-[#635BFF] transition-colors cursor-pointer hidden lg:inline"
          >
            Leaderboard
          </button>

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
          2. SUB-NAVIGATION TABS (Party | Transaction | Payment Requests | Accounts)
      ───────────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-white px-6">
        <nav className="flex items-center gap-8 -mb-px">
          <button
            type="button"
            onClick={() => setActiveTab('party')}
            className={`py-3.5 text-xs font-semibold tracking-wide transition-all border-b-2 cursor-pointer ${
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
            className={`py-3.5 text-xs font-semibold tracking-wide transition-all border-b-2 cursor-pointer ${
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
            className={`py-3.5 text-xs font-semibold tracking-wide transition-all border-b-2 cursor-pointer ${
              activeTab === 'payment_requests'
                ? 'border-[#635BFF] text-[#635BFF] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Payment Requests
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            className={`py-3.5 text-xs font-semibold tracking-wide transition-all border-b-2 cursor-pointer ${
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
            TAB 4: ACCOUNTS (Bank & Cash Accounts + Tally/Zoho Integration)
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
                <div key={ba.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">{ba.bankName}</span>
                      <h3 className="text-sm font-bold text-slate-900 mt-0.5">{ba.accountName}</h3>
                    </div>
                    <span className="p-2 rounded-lg bg-purple-50 text-[#635BFF]">
                      <Landmark className="w-4 h-4" />
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500 block">Available Balance</span>
                    <div className="text-2xl font-bold text-slate-900 mt-0.5">
                      ₹ {ba.balance.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>A/c: {ba.accountNumber}</span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
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
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Add Bank or Cash Ledger</h3>
              <button onClick={() => setIsAddAccountModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Account / Ledger Name</label>
                <input type="text" placeholder="e.g. Axis Bank Site Escrow" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bank Name</label>
                  <input type="text" placeholder="Axis Bank" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Number</label>
                  <input type="text" placeholder="•••• 1234" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">IFSC Code</label>
                  <input type="text" placeholder="UTIB0001234" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Opening Balance (₹)</label>
                  <input type="number" placeholder="0" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs" />
                </div>
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button onClick={() => setIsAddAccountModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-500">Cancel</button>
              <button 
                onClick={() => {
                  setIsAddAccountModalOpen(false);
                  if (onShowToast) onShowToast('Bank ledger added to chart of accounts');
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-[#635BFF] text-white rounded-lg"
              >
                Save Account
              </button>
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

    </div>
  );
};
