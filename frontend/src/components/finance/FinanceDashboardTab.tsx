import React, { useMemo, useState } from 'react';
import { 
  ArrowDown, ArrowUp, ArrowUpRight, ArrowDownRight, 
  Wallet, Landmark, Receipt, CreditCard, Building2, 
  Plus, ArrowLeftRight, Clock, CheckCircle2, AlertCircle,
  FileText, ExternalLink, Calendar, ChevronRight, TrendingUp,
  ShieldCheck, UserPlus, Search, X
} from 'lucide-react';
import { Project } from '../../types';
import { 
  PartyRecord, 
  FinanceTransaction, 
  PaymentRequestItem, 
  BankAccountRecord, 
  AccountTransferRecord 
} from '../../views/AccountsFinanceView';

// Expense Item interface matching AccountsFinanceView
export interface ExpenseItemSummary {
  id: string;
  expenseCode: string;
  date: string;
  title: string;
  category: string;
  projectName: string;
  partyOrVendorName: string;
  amount: number;
  paymentMode: string;
  paidFromAccount?: string;
  status: 'Paid' | 'Approved' | 'Pending Approval' | 'Rejected';
}

interface FinanceDashboardTabProps {
  parties: PartyRecord[];
  transactions: FinanceTransaction[];
  paymentRequests: PaymentRequestItem[];
  expenses: ExpenseItemSummary[];
  bankAccounts: BankAccountRecord[];
  transfers: AccountTransferRecord[];
  projects: Project[];
  partyKpiMetrics: {
    advancePaid: number;
    toPay: number;
    toReceive: number;
    advanceReceived: number;
  };
  onNavigateTab: (tab: any) => void;
  onOpenCreateTransaction: () => void;
  onOpenPaymentRequest: () => void;
  onOpenRecordExpense: () => void;
  onOpenTransferModal: () => void;
  onOpenAddParty: () => void;
  getAccountDisplayName: (ba: any) => string;
}

export const FinanceDashboardTab: React.FC<FinanceDashboardTabProps> = ({
  parties,
  transactions,
  paymentRequests,
  expenses,
  bankAccounts,
  transfers,
  projects,
  partyKpiMetrics,
  onNavigateTab,
  onOpenCreateTransaction,
  onOpenPaymentRequest,
  onOpenRecordExpense,
  onOpenTransferModal,
  onOpenAddParty,
  getAccountDisplayName,
}) => {
  // Filter for recent activity
  const [activityFilter, setActivityFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [isInflowOutflowModalOpen, setIsInflowOutflowModalOpen] = useState(false);
  const [modalFilter, setModalFilter] = useState<'ALL' | 'INFLOW' | 'OUTFLOW'>('ALL');
  const [modalSearchQuery, setModalSearchQuery] = useState('');

  // Total Company Liquidity (Cash + Bank Balances)
  const totalLiquidity = useMemo(() => {
    return bankAccounts.reduce((sum, ba) => sum + (Number(ba.balance) || 0), 0);
  }, [bankAccounts]);

  // Total Inflow & Outflow from transactions
  const { totalInflow, totalOutflow, netCashFlow } = useMemo(() => {
    const inflow = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const outflow = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0) +
      expenses
        .filter(e => e.status === 'Paid')
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    return {
      totalInflow: inflow,
      totalOutflow: outflow,
      netCashFlow: inflow - outflow
    };
  }, [transactions, expenses]);

  // All Cash Flow movements contributing to Inflow & Outflow
  const allCashFlowMovements = useMemo(() => {
    const list: Array<{
      id: string;
      code: string;
      type: 'INCOME' | 'EXPENSE';
      date: string;
      partyName: string;
      accountName: string;
      projectName: string;
      category: string;
      amount: number;
      mode: string;
      status: string;
    }> = [];

    // Transactions
    transactions.forEach(t => {
      const acc = t.bankAccountName || (t.bankAccountId ? bankAccounts.find(b => b.id === t.bankAccountId)?.accountName : undefined) || 'Company Account';
      list.push({
        id: t.id,
        code: t.txnCode || 'TXN',
        type: t.type,
        date: t.date,
        partyName: t.partyName || 'Party Settlement',
        accountName: acc,
        projectName: t.projectName || 'General',
        category: t.category || (t.type === 'INCOME' ? 'Client Payment' : 'Vendor Payment'),
        amount: Number(t.amount) || 0,
        mode: t.mode || 'Online',
        status: t.status || 'Completed'
      });
    });

    // Paid Expenses
    expenses.filter(e => e.status === 'Paid').forEach(e => {
      list.push({
        id: e.id,
        code: e.expenseCode || 'EXP',
        type: 'EXPENSE',
        date: e.date,
        partyName: e.partyOrVendorName || 'Vendor Payout',
        accountName: e.paidFromAccount || 'Company Account',
        projectName: e.projectName || 'General',
        category: e.category || 'Site Expense',
        amount: Number(e.amount) || 0,
        mode: e.paymentMode || 'Petty Cash',
        status: 'Paid'
      });
    });

    return list;
  }, [transactions, expenses, bankAccounts]);

  // Filtered movements for Inflow/Outflow Breakdown modal
  const filteredCashFlowMovements = useMemo(() => {
    return allCashFlowMovements.filter(m => {
      if (modalFilter === 'INFLOW' && m.type !== 'INCOME') return false;
      if (modalFilter === 'OUTFLOW' && m.type !== 'EXPENSE') return false;
      if (modalSearchQuery.trim()) {
        const q = modalSearchQuery.toLowerCase();
        const matchesParty = m.partyName.toLowerCase().includes(q);
        const matchesCode = m.code.toLowerCase().includes(q);
        const matchesProj = m.projectName.toLowerCase().includes(q);
        const matchesAcc = m.accountName.toLowerCase().includes(q);
        const matchesCat = m.category.toLowerCase().includes(q);
        if (!matchesParty && !matchesCode && !matchesProj && !matchesAcc && !matchesCat) return false;
      }
      return true;
    });
  }, [allCashFlowMovements, modalFilter, modalSearchQuery]);

  // Project Health Metrics (Budget vs Actual & Overrun checks)
  const projectHealthList = useMemo(() => {
    return (projects.length > 0 ? projects : [{ id: 'proj-1', name: 'Booshnam Prime Site', client_name: 'Booshnam Associates', estimated_budget: 4500000, boq_value: 5200000 } as any]).slice(0, 4).map(p => {
      const budget = p.estimated_budget || p.boq_value || 4500000;
      const contractValue = p.boq_value || p.estimated_budget || 5000000;

      // Project expenses
      const pExps = expenses.filter(e => 
        e.projectName && p.name && e.projectName.toLowerCase().includes(p.name.toLowerCase()) && e.status === 'Paid'
      ).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      // Project transactions
      const pTxnsOut = transactions.filter(t => 
        t.projectName && p.name && t.projectName.toLowerCase().includes(p.name.toLowerCase()) && t.type === 'EXPENSE'
      ).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const pTxnsIn = transactions.filter(t => 
        t.projectName && p.name && t.projectName.toLowerCase().includes(p.name.toLowerCase()) && t.type === 'INCOME'
      ).reduce((sum, t) => sum + (Number(t.amount) || 0), 0) + (p.cash_in || 0);

      const totalSpent = pExps + pTxnsOut + (p.actual_cost || 0);
      const isOverBudget = totalSpent > budget;
      const remainingBudget = Math.max(0, budget - totalSpent);
      const profit = pTxnsIn - totalSpent;
      const margin = pTxnsIn > 0 ? ((profit / pTxnsIn) * 100).toFixed(1) : '0.0';

      return {
        id: p.id,
        name: p.name,
        client: p.client_name || 'Client',
        budget,
        contractValue,
        totalSpent,
        revenue: pTxnsIn,
        remainingBudget,
        isOverBudget,
        profit,
        margin
      };
    });
  }, [projects, expenses, transactions]);

  // Unified recent activity feed
  const recentActivities = useMemo(() => {
    const list: Array<{
      id: string;
      code: string;
      type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
      title: string;
      partyOrBank: string;
      project: string;
      amount: number;
      date: string;
      status: string;
    }> = [];

    // Transactions
    transactions.slice(0, 15).forEach(t => {
      list.push({
        id: t.id,
        code: t.txnCode || 'TXN',
        type: t.type,
        title: `${t.type === 'INCOME' ? 'Payment Received' : 'Payment Out'} • ${t.category}`,
        partyOrBank: t.partyName,
        project: t.projectName,
        amount: t.amount,
        date: t.date,
        status: t.status
      });
    });

    // Expenses
    expenses.slice(0, 10).forEach(e => {
      list.push({
        id: e.id,
        code: e.expenseCode,
        type: 'EXPENSE',
        title: `Expense: ${e.title}`,
        partyOrBank: e.partyOrVendorName,
        project: e.projectName,
        amount: e.amount,
        date: e.date,
        status: e.status
      });
    });

    // Transfers
    transfers.slice(0, 5).forEach(tr => {
      list.push({
        id: tr.id,
        code: tr.transferCode,
        type: 'TRANSFER',
        title: `Contra Transfer: ${tr.fromAccountName} ➔ ${tr.toAccountName}`,
        partyOrBank: `${tr.transferMode}`,
        project: tr.projectName || 'Internal',
        amount: tr.amount,
        date: tr.date,
        status: 'Completed'
      });
    });

    return list.filter(item => {
      if (activityFilter === 'ALL') return true;
      return item.type === activityFilter;
    }).slice(0, 8);
  }, [transactions, expenses, transfers, activityFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* ─────────────────────────────────────────────────────────────
          1. TOP SUMMARY CARDS (Requirement 1: Advance Paid, To Pay, To Receive, Advance Received)
      ───────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Financial Position Overview</span>
              <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10.5px] font-bold border border-red-200">
                Live Dynamic
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live balances calculated automatically across transactions, vouchers, and party accounts
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="text-slate-400">Total Liquidity:</span>
            <strong className="text-slate-900 font-black tracking-tight text-sm">
              ₹ {totalLiquidity.toLocaleString('en-IN')}
            </strong>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Advance Paid */}
          <div 
            onClick={() => onNavigateTab('party')}
            className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-red-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between min-h-[32px]">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Advance Paid
                </span>
              </div>
              <div className="text-2xl sm:text-[28px] font-black text-slate-900 tracking-tight mt-2.5">
                ₹ {partyKpiMetrics.advancePaid.toLocaleString('en-IN')}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
              <span>Paid to vendors & contractors</span>
              <span className="text-red-600 font-semibold group-hover:translate-x-0.5 transition-transform">➔</span>
            </p>
          </div>

          {/* Card 2: To Pay */}
          <div 
            onClick={() => onNavigateTab('party')}
            className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-red-400 shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between min-h-[32px]">
                <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">
                  To Pay (Payable)
                </span>
              </div>
              <div className="text-2xl sm:text-[28px] font-black text-red-600 tracking-tight mt-2.5">
                ₹ {partyKpiMetrics.toPay.toLocaleString('en-IN')}
              </div>
            </div>
            <p className="text-[11px] text-red-700/80 mt-3 pt-2.5 border-t border-red-100 flex items-center justify-between">
              <span>Total outstanding payable</span>
              <span className="text-red-600 font-semibold group-hover:translate-x-0.5 transition-transform">➔</span>
            </p>
          </div>

          {/* Card 3: To Receive */}
          <div 
            onClick={() => onNavigateTab('party')}
            className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-red-400 shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between min-h-[32px]">
                <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">
                  To Receive (Receivable)
                </span>
              </div>
              <div className="text-2xl sm:text-[28px] font-black text-red-600 tracking-tight mt-2.5">
                ₹ {partyKpiMetrics.toReceive.toLocaleString('en-IN')}
              </div>
            </div>
            <p className="text-[11px] text-red-700/80 mt-3 pt-2.5 border-t border-red-100 flex items-center justify-between">
              <span>Pending collection from clients</span>
              <span className="text-red-600 font-semibold group-hover:translate-x-0.5 transition-transform">➔</span>
            </p>
          </div>

          {/* Card 4: Advance Received */}
          <div 
            onClick={() => onNavigateTab('party')}
            className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-red-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between min-h-[32px]">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Advance Received
                </span>
              </div>
              <div className="text-2xl sm:text-[28px] font-black text-slate-900 tracking-tight mt-2.5">
                ₹ {partyKpiMetrics.advanceReceived.toLocaleString('en-IN')}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
              <span>Client advances awaiting bills</span>
              <span className="text-red-600 font-semibold group-hover:translate-x-0.5 transition-transform">➔</span>
            </p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. QUICK ACTIONS BAR (Red and White Theme)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center shadow-xs">
            <Plus className="w-4 h-4 stroke-[3]" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900">Financial Actions</h3>
            <p className="text-[11px] text-slate-400">Execute movements, voucher payments & bank transfers</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={onOpenCreateTransaction}
            className="h-9 px-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm shadow-red-200 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Record Payment / Income</span>
          </button>

          <button
            type="button"
            onClick={onOpenRecordExpense}
            className="h-9 px-3.5 rounded-xl bg-white border border-red-600 text-red-600 hover:bg-red-50 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Record Expense</span>
          </button>

          <button
            type="button"
            onClick={onOpenPaymentRequest}
            className="h-9 px-3 rounded-xl bg-white border border-slate-200 hover:border-red-300 text-slate-700 hover:text-red-600 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Payment Request</span>
          </button>

          <button
            type="button"
            onClick={onOpenTransferModal}
            className="h-9 px-3 rounded-xl bg-white border border-slate-200 hover:border-red-300 text-slate-700 hover:text-red-600 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400" />
            <span>Contra Transfer</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddParty}
            className="h-9 px-3 rounded-xl bg-white border border-slate-200 hover:border-red-300 text-slate-700 hover:text-red-600 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5 text-slate-400" />
            <span>Add Party</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. TWO-COLUMN GRID: BANK ACCOUNTS LIQUIDITY & CASH FLOW
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1 & 2: Bank Accounts Liquidity */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <Landmark className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Company Accounts & Liquid Funds</h3>
                <p className="text-[11px] text-slate-400">Live bank accounts, petty cash & running ledger balances</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('accounts')}
              className="text-xs font-bold text-red-600 hover:text-red-700 transition-colors flex items-center gap-1"
            >
              <span>Manage Accounts</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {bankAccounts.map(ba => {
              const displayName = getAccountDisplayName(ba);
              return (
                <div 
                  key={ba.id} 
                  className="p-3.5 rounded-xl border border-slate-200/90 hover:border-red-400 bg-slate-50/40 hover:bg-white transition-all shadow-2xs group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {ba.accountType}
                      </span>
                      {ba.isPrimary && (
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-red-50 text-red-600 border border-red-200">
                          PRIMARY
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 mt-1 truncate" title={displayName}>
                      {displayName}
                    </h4>
                    <p className="text-[10.5px] text-slate-400 font-mono mt-0.5 truncate">
                      {ba.accountNumber || ba.bankName}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/60">
                    <span className="text-[10px] text-slate-400 block font-medium">Available Balance</span>
                    <strong className="text-base font-black text-slate-900 tracking-tight block">
                      ₹ {ba.balance.toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inflow vs Outflow Mini Summary Banner with View All Button */}
          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-slate-400 block text-[10.5px]">Total Inflow (Received)</span>
                <strong className="text-emerald-700 font-bold text-sm">
                  + ₹ {totalInflow.toLocaleString('en-IN')}
                </strong>
              </div>
              <div className="border-l border-slate-200 pl-6">
                <span className="text-slate-400 block text-[10.5px]">Total Outflow (Disbursed)</span>
                <strong className="text-rose-600 font-bold text-sm">
                  - ₹ {totalOutflow.toLocaleString('en-IN')}
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-slate-400 block text-[10.5px]">Net Cash Movement</span>
                <strong className={`font-black text-sm ${netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {netCashFlow >= 0 ? '+' : '-'} ₹ {Math.abs(netCashFlow).toLocaleString('en-IN')}
                </strong>
              </div>

              {/* View All Button Requested by User */}
              <button
                type="button"
                onClick={() => setIsInflowOutflowModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer shrink-0"
                title="View all transactions contributing to Inflow and Outflow"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>

        {/* Column 3: Project Finance & Budget Overrun Snapshot */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Project Budget & Margins</h3>
                  <p className="text-[11px] text-slate-400">Budget vs actual spend with overrun alerts</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mt-3">
              {projectHealthList.map(proj => (
                <div 
                  key={proj.id}
                  className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 truncate max-w-[170px]" title={proj.name}>
                      {proj.name}
                    </h4>
                    {proj.isOverBudget ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-rose-600" />
                        OVERRUN
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ON TRACK
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[10.5px] text-slate-500 mb-1">
                      <span>Spent: ₹{proj.totalSpent.toLocaleString('en-IN')}</span>
                      <span>Budget: ₹{proj.budget.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${proj.isOverBudget ? 'bg-rose-600' : 'bg-red-600'}`}
                        style={{ width: `${Math.min(100, Math.round((proj.totalSpent / (proj.budget || 1)) * 100))}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-1 text-[10.5px] text-slate-400">
                    <span>Revenue: ₹{proj.revenue.toLocaleString('en-IN')}</span>
                    <span className="font-semibold text-slate-700">Margin: {proj.margin}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('project_finance')}
            className="w-full py-2.5 rounded-xl border border-red-600 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer text-center block mt-2"
          >
            View Project Profitability & Cost Details ➔
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. RECENT LIVE FINANCIAL ACTIVITIES FEED (Audit & Movement)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Financial Activity & Movements</h3>
              <p className="text-[11px] text-slate-400">Complete audit log of cash movements, vouchers, and claims</p>
            </div>
          </div>

          {/* Activity Pills */}
          <div className="flex items-center gap-1.5">
            {(['ALL', 'INCOME', 'EXPENSE'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActivityFilter(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activityFilter === tab
                    ? 'bg-red-600 text-white shadow-2xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {tab === 'ALL' ? 'All Movements' : tab === 'INCOME' ? 'Income / Inflow' : 'Expense / Outflow'}
              </button>
            ))}
          </div>
        </div>

        {/* Activity Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-[10.5px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Date & Code</th>
                <th className="py-2.5 px-3">Description & Category</th>
                <th className="py-2.5 px-3">Party / Account</th>
                <th className="py-2.5 px-3">Project</th>
                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {recentActivities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                    No recent financial activities found
                  </td>
                </tr>
              ) : (
                recentActivities.map(act => (
                  <tr key={act.id} className="hover:bg-red-50/20 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 block">{act.date}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{act.code}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-800 block">{act.title}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-slate-900 font-medium block truncate max-w-[160px]">{act.partyOrBank}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 truncate max-w-[140px]">
                      {act.project || 'General'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <strong className={`font-black tracking-tight ${
                        act.type === 'INCOME' 
                          ? 'text-emerald-700' 
                          : act.type === 'EXPENSE' 
                          ? 'text-rose-600' 
                          : 'text-slate-800'
                      }`}>
                        {act.type === 'INCOME' ? '+' : act.type === 'EXPENSE' ? '-' : ''} ₹{act.amount.toLocaleString('en-IN')}
                      </strong>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                        act.status === 'Completed' || act.status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : act.status === 'Approved'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {act.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: VIEW ALL INFLOW & OUTFLOW TRANSACTIONS BREAKDOWN
      ───────────────────────────────────────────────────────────── */}
      {isInflowOutflowModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    Cash Inflow & Outflow Breakdown
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    All receipts, expense payouts, vouchers & fund movements
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInflowOutflowModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick KPI Strip inside modal */}
            <div className="px-6 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap text-xs">
              <div className="flex items-center gap-5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Inflow</span>
                  <span className="font-extrabold text-emerald-700 text-sm">
                    + ₹ {totalInflow.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="border-l border-slate-200 pl-5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Outflow</span>
                  <span className="font-extrabold text-rose-600 text-sm">
                    - ₹ {totalOutflow.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="border-l border-slate-200 pl-5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Net Movement</span>
                  <span className={`font-extrabold text-sm ${netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {netCashFlow >= 0 ? '+' : '-'} ₹ {Math.abs(netCashFlow).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Search input */}
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search party, code, account..."
                  value={modalSearchQuery}
                  onChange={e => setModalSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-600"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="px-6 pt-3 pb-2 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {[
                  { id: 'ALL', label: `All Movements (${allCashFlowMovements.length})` },
                  { id: 'INFLOW', label: `Inflow Receipts (+)` },
                  { id: 'OUTFLOW', label: `Outflow Payments (-)` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setModalFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      modalFilter === tab.id
                        ? 'bg-red-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Movements List / Table */}
            <div className="flex-1 overflow-y-auto px-6 py-3 divide-y divide-slate-100">
              {filteredCashFlowMovements.length === 0 ? (
                <div className="py-12 text-center text-slate-400 italic text-xs">
                  No movements matching your filter or search criteria
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredCashFlowMovements.map(m => {
                    const isInflow = m.type === 'INCOME';
                    return (
                      <div
                        key={m.id}
                        className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isInflow ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                          }`}>
                            {isInflow ? <ArrowDown className="w-4 h-4 stroke-[2.5]" /> : <ArrowUp className="w-4 h-4 stroke-[2.5]" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900 truncate">
                                {m.partyName}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {m.code}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate flex items-center gap-2 mt-0.5">
                              <span>📅 {m.date}</span>
                              <span>•</span>
                              <span className="font-medium text-slate-700">🏛️ {m.accountName}</span>
                              <span>•</span>
                              <span>{m.category}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`text-sm font-black tracking-tight block ${
                            isInflow ? 'text-emerald-700' : 'text-rose-600'
                          }`}>
                            {isInflow ? '+' : '-'} ₹ {m.amount.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {m.mode}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Showing {filteredCashFlowMovements.length} of {allCashFlowMovements.length} transactions
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsInflowOutflowModalOpen(false);
                    onNavigateTab('transaction');
                  }}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Open Full Transactions Tab</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
