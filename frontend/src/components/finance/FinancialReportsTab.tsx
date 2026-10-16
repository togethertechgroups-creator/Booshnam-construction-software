import React, { useState, useMemo } from 'react';
import { 
  FileText, Download, Printer, Filter, Calendar, 
  Search, SlidersHorizontal, ArrowDown, ArrowUp,
  Building2, Users, Landmark, Clock, CheckCircle2,
  ChevronRight, RefreshCw, Eye
} from 'lucide-react';
import { Project } from '../../types';
import { 
  PartyRecord, 
  FinanceTransaction, 
  PaymentRequestItem, 
  BankAccountRecord, 
  AccountTransferRecord 
} from '../../views/AccountsFinanceView';
import { CustomSelect } from '../CustomSelect';
import { ExpenseItemSummary } from './FinanceDashboardTab';

export type ReportTypeKey = 
  | 'party_ledger'
  | 'client_outstanding'
  | 'vendor_outstanding'
  | 'payment_report'
  | 'expense_report'
  | 'advance_report'
  | 'cash_bank_report'
  | 'project_cost_report'
  | 'budget_vs_actual'
  | 'profitability_report'
  | 'audit_activity_log';

interface FinancialReportsTabProps {
  parties: PartyRecord[];
  transactions: FinanceTransaction[];
  paymentRequests: PaymentRequestItem[];
  expenses: ExpenseItemSummary[];
  bankAccounts: BankAccountRecord[];
  transfers: AccountTransferRecord[];
  projects: Project[];
  getAccountDisplayName: (ba: any) => string;
  getPartySummaryFinancials: (p: any) => any;
}

export const FinancialReportsTab: React.FC<FinancialReportsTabProps> = ({
  parties,
  transactions,
  paymentRequests,
  expenses,
  bankAccounts,
  transfers,
  projects,
  getAccountDisplayName,
  getPartySummaryFinancials,
}) => {
  const [reportType, setReportType] = useState<ReportTypeKey>('party_ledger');
  const [projectFilter, setProjectFilter] = useState('All');
  const [partyFilter, setPartyFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState<'All' | 'Today' | 'This Week' | 'This Month' | 'Last Month'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Report Definitions
  const REPORT_TYPES: { id: ReportTypeKey; label: string; desc: string }[] = [
    { id: 'party_ledger', label: 'Party Ledger Report', desc: 'Running transaction statement per party' },
    { id: 'client_outstanding', label: 'Client Outstanding (Receivables)', desc: 'Amounts pending collection from clients' },
    { id: 'vendor_outstanding', label: 'Vendor & Contractor (Payables)', desc: 'Total bills pending payment to vendors' },
    { id: 'payment_report', label: 'Payments & Collections Report', desc: 'All incoming & outgoing money movements' },
    { id: 'expense_report', label: 'Expense & Voucher Report', desc: 'Operational bills, materials & site petty cash' },
    { id: 'advance_report', label: 'Advance Report (Paid & Received)', desc: 'Advance balances pending invoice settlement' },
    { id: 'cash_bank_report', label: 'Cash & Bank Account Ledger', desc: 'Account-wise inflows, outflows & balances' },
    { id: 'project_cost_report', label: 'Project Cost Report', desc: 'Site-wise expenditure breakdown' },
    { id: 'budget_vs_actual', label: 'Budget vs Actual Report', desc: 'Cost variance and overrun warnings' },
    { id: 'profitability_report', label: 'Project Profitability Report', desc: 'Revenue, direct costs & gross margins' },
    { id: 'audit_activity_log', label: 'Audit & Activity Tracking Log', desc: 'Complete timeline of changes & authorizations' },
  ];

  // Dynamic Report Data Generation
  const reportData = useMemo(() => {
    switch (reportType) {
      case 'party_ledger': {
        const rows: any[] = [];
        parties.forEach(p => {
          if (partyFilter !== 'All' && p.id !== partyFilter && p.name !== partyFilter) return;
          const fin = getPartySummaryFinancials(p);
          rows.push({
            id: p.id,
            col1: p.name,
            col2: p.type,
            col3: p.phone || '--',
            col4: `₹ ${fin.totalBilled.toLocaleString('en-IN')}`,
            col5: `₹ ${fin.totalPaid.toLocaleString('en-IN')}`,
            col6: `₹ ${fin.balanceDue.toLocaleString('en-IN')}`,
            status: fin.status,
            date: p.dateOfJoining || 'Recent'
          });
        });
        return {
          headers: ['Party Name', 'Party Type', 'Contact', 'Total Billed', 'Total Paid', 'Balance Due', 'Status'],
          rows
        };
      }

      case 'client_outstanding': {
        const rows: any[] = [];
        parties.filter(p => p.type === 'Client').forEach(p => {
          const fin = getPartySummaryFinancials(p);
          if (fin.balanceDue > 0) {
            rows.push({
              id: p.id,
              col1: p.name,
              col2: p.activeProjects?.join(', ') || 'General',
              col3: p.phone || '--',
              col4: `₹ ${fin.totalBilled.toLocaleString('en-IN')}`,
              col5: `₹ ${fin.totalPaid.toLocaleString('en-IN')}`,
              col6: `₹ ${fin.balanceDue.toLocaleString('en-IN')}`,
              status: 'To Receive',
              date: 'Pending'
            });
          }
        });
        return {
          headers: ['Client Name', 'Projects', 'Mobile Number', 'Total Invoiced', 'Received', 'Outstanding (To Receive)', 'Status'],
          rows
        };
      }

      case 'vendor_outstanding': {
        const rows: any[] = [];
        parties.filter(p => p.type !== 'Client').forEach(p => {
          const fin = getPartySummaryFinancials(p);
          if (fin.balanceDue > 0) {
            rows.push({
              id: p.id,
              col1: p.name,
              col2: p.type,
              col3: p.activeProjects?.join(', ') || 'All Sites',
              col4: `₹ ${fin.totalBilled.toLocaleString('en-IN')}`,
              col5: `₹ ${fin.totalPaid.toLocaleString('en-IN')}`,
              col6: `₹ ${fin.balanceDue.toLocaleString('en-IN')}`,
              status: 'To Pay',
              date: 'Due'
            });
          }
        });
        return {
          headers: ['Vendor / Contractor', 'Type', 'Sites', 'Total Claims', 'Paid Amount', 'Payable Due', 'Status'],
          rows
        };
      }

      case 'payment_report': {
        const rows = transactions.map(t => ({
          id: t.id,
          col1: t.txnCode,
          col2: t.date,
          col3: t.partyName,
          col4: t.projectName,
          col5: t.mode,
          col6: `₹ ${t.amount.toLocaleString('en-IN')}`,
          status: t.type === 'INCOME' ? 'Received (In)' : 'Paid (Out)',
          date: t.date
        }));
        return {
          headers: ['Voucher Code', 'Date', 'Party Name', 'Project', 'Payment Mode', 'Amount', 'Type'],
          rows
        };
      }

      case 'expense_report': {
        const rows = expenses.map(e => ({
          id: e.id,
          col1: e.expenseCode,
          col2: e.date,
          col3: e.title,
          col4: e.category,
          col5: e.projectName,
          col6: `₹ ${e.amount.toLocaleString('en-IN')}`,
          status: e.status,
          date: e.date
        }));
        return {
          headers: ['Expense Code', 'Date', 'Title / Item', 'Category', 'Project', 'Amount', 'Status'],
          rows
        };
      }

      case 'advance_report': {
        const rows: any[] = [];
        parties.forEach(p => {
          const fin = getPartySummaryFinancials(p);
          if (fin.status === 'Advance Paid' || fin.status === 'Advance Received') {
            const adv = fin.totalPaid > fin.totalBilled ? fin.totalPaid - fin.totalBilled : fin.balanceDue;
            rows.push({
              id: p.id,
              col1: p.name,
              col2: p.type,
              col3: p.type === 'Client' ? 'Client Advance' : 'Vendor Advance',
              col4: `₹ ${fin.totalPaid.toLocaleString('en-IN')}`,
              col5: `₹ ${fin.totalBilled.toLocaleString('en-IN')}`,
              col6: `₹ ${adv.toLocaleString('en-IN')}`,
              status: fin.status,
              date: 'Pending Adjustment'
            });
          }
        });
        return {
          headers: ['Party Name', 'Type', 'Advance Classification', 'Total Paid / Received', 'Invoices Settled', 'Remaining Advance', 'Status'],
          rows
        };
      }

      case 'cash_bank_report': {
        const rows = bankAccounts.map(b => ({
          id: b.id,
          col1: getAccountDisplayName(b),
          col2: b.accountType,
          col3: b.accountNumber || '--',
          col4: b.bankName,
          col5: `₹ ${(b.openingBalance || 0).toLocaleString('en-IN')}`,
          col6: `₹ ${b.balance.toLocaleString('en-IN')}`,
          status: b.isPrimary ? 'Primary Account' : 'Active',
          date: 'Live'
        }));
        return {
          headers: ['Account Name', 'Account Type', 'Account Number', 'Bank / Location', 'Opening Balance', 'Current Balance', 'Account Status'],
          rows
        };
      }

      case 'project_cost_report': {
        const rows = (projects.length > 0 ? projects : [{ id: 'p1', name: 'Booshnam Residential Villa', client_name: 'Client', estimated_budget: 4500000, boq_value: 5200000 } as any]).map(p => {
          const pExps = expenses.filter(e => e.projectName && p.name && e.projectName.toLowerCase().includes(p.name.toLowerCase()) && e.status === 'Paid');
          const totalCost = pExps.reduce((s, e) => s + e.amount, 0) + (p.actual_cost || 0);
          return {
            id: p.id,
            col1: p.name,
            col2: p.client_name || 'Client',
            col3: `₹ ${(p.boq_value || p.estimated_budget || 5000000).toLocaleString('en-IN')}`,
            col4: `₹ ${(p.estimated_budget || 4500000).toLocaleString('en-IN')}`,
            col5: `₹ ${totalCost.toLocaleString('en-IN')}`,
            col6: `₹ ${Math.max(0, (p.estimated_budget || 4500000) - totalCost).toLocaleString('en-IN')}`,
            status: totalCost > (p.estimated_budget || 4500000) ? 'Over Budget' : 'Within Budget',
            date: p.status || 'Active'
          };
        });
        return {
          headers: ['Project Name', 'Client', 'Contract BOQ', 'Allocated Budget', 'Actual Cost Spent', 'Remaining Balance', 'Budget Status'],
          rows
        };
      }

      case 'budget_vs_actual': {
        const rows = (projects.length > 0 ? projects : [{ id: 'p1', name: 'Booshnam Commercial Complex', client_name: 'Apex Infrastructure', estimated_budget: 8500000 } as any]).map(p => {
          const budget = p.estimated_budget || 5000000;
          const pExps = expenses.filter(e => e.projectName && p.name && e.projectName.toLowerCase().includes(p.name.toLowerCase()) && e.status === 'Paid');
          const cost = pExps.reduce((s, e) => s + e.amount, 0) + (p.actual_cost || 0);
          const variance = cost - budget;
          return {
            id: p.id,
            col1: p.name,
            col2: `₹ ${budget.toLocaleString('en-IN')}`,
            col3: `₹ ${cost.toLocaleString('en-IN')}`,
            col4: `${variance > 0 ? '+' : '-'} ₹ ${Math.abs(variance).toLocaleString('en-IN')}`,
            col5: `${((variance / budget) * 100).toFixed(1)}%`,
            col6: variance > 0 ? 'Budget Overrun Alert' : 'Within Allocation',
            status: variance > 0 ? 'OVERRUN' : 'ON TRACK',
            date: 'Live'
          };
        });
        return {
          headers: ['Project', 'Approved Budget', 'Actual Spend', 'Cost Variance (₹)', 'Variance %', 'Audit Status', 'Health Status'],
          rows
        };
      }

      case 'profitability_report': {
        const rows = (projects.length > 0 ? projects : [{ id: 'p1', name: 'Industrial Warehouse Sriperumbudur', client_name: 'Greenway Logistics', boq_value: 9500000, estimated_budget: 8200000 } as any]).map(p => {
          const rev = p.boq_value || 8500000;
          const pExps = expenses.filter(e => e.projectName && p.name && e.projectName.toLowerCase().includes(p.name.toLowerCase()) && e.status === 'Paid');
          const cost = pExps.reduce((s, e) => s + e.amount, 0) + (p.actual_cost || 6200000);
          const profit = rev - cost;
          const margin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : '0.0';
          return {
            id: p.id,
            col1: p.name,
            col2: `₹ ${rev.toLocaleString('en-IN')}`,
            col3: `₹ ${cost.toLocaleString('en-IN')}`,
            col4: `₹ ${profit.toLocaleString('en-IN')}`,
            col5: `${margin}%`,
            col6: profit >= 0 ? 'Profitable Site' : 'Negative Margin',
            status: profit >= 0 ? 'PROFITABLE' : 'LOSS',
            date: 'FY 2026'
          };
        });
        return {
          headers: ['Project Name', 'Total Revenue', 'Total Cost', 'Gross Profit', 'Gross Margin (%)', 'Profit Status', 'Margin Health'],
          rows
        };
      }

      case 'audit_activity_log':
      default: {
        const rows: any[] = [];
        transactions.slice(0, 20).forEach(t => {
          rows.push({
            id: t.id,
            col1: t.date,
            col2: t.txnCode,
            col3: `${t.type === 'INCOME' ? 'Payment In' : 'Payment Out'} • ${t.category}`,
            col4: t.partyName,
            col5: t.projectName,
            col6: `₹ ${t.amount.toLocaleString('en-IN')}`,
            status: t.status,
            date: 'Admin (System)'
          });
        });
        return {
          headers: ['Timestamp / Date', 'Reference Code', 'Action / Movement', 'Party Involved', 'Project Location', 'Amount (₹)', 'Execution Status'],
          rows
        };
      }
    }
  }, [reportType, parties, transactions, paymentRequests, expenses, bankAccounts, projects, partyFilter, getAccountDisplayName, getPartySummaryFinancials]);

  // Filter rows by search
  const filteredReportRows = useMemo(() => {
    if (!searchQuery.trim()) return reportData.rows;
    const q = searchQuery.toLowerCase();
    return reportData.rows.filter((r: any) => 
      (r.col1 || '').toLowerCase().includes(q) ||
      (r.col2 || '').toLowerCase().includes(q) ||
      (r.col3 || '').toLowerCase().includes(q) ||
      (r.status || '').toLowerCase().includes(q)
    );
  }, [reportData, searchQuery]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = reportData.headers;
    const rows = filteredReportRows.map((r: any) => [
      `"${r.col1}"`,
      `"${r.col2}"`,
      `"${r.col3}"`,
      `"${r.col4}"`,
      `"${r.col5}"`,
      `"${r.col6}"`,
      `"${r.status}"`
    ]);
    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Booshnam_${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const activeReportMeta = REPORT_TYPES.find(r => r.id === reportType);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & REPORT SELECTOR (Requirement 15 & 16)
      ───────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-600" />
              <span>Comprehensive Financial Reports & Audit Log</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live statements, party ledgers, receivables, payables, project costs & audit trails
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="h-9 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm shadow-red-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV / Excel</span>
            </button>
          </div>
        </div>

        {/* Report Type Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {REPORT_TYPES.map(rep => (
            <button
              key={rep.id}
              type="button"
              onClick={() => {
                setReportType(rep.id);
                setSearchQuery('');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold tracking-tight whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                reportType === rep.id
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-red-50 hover:text-red-700 border border-slate-200'
              }`}
            >
              <span>{rep.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. FILTER TOOLBAR (Red & White Theme)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            {/* Search */}
            <div className="relative min-w-[220px] max-w-sm flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search within report rows..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/15 transition-all text-slate-800 placeholder:text-slate-400"
              />
            </div>

            {/* Date Preset */}
            <div className="flex items-center gap-1">
              {(['All', 'Today', 'This Week', 'This Month', 'Last Month'] as const).map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDateFilter(d)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    dateFilter === d 
                      ? 'bg-red-50 text-red-700 border border-red-200' 
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-400 font-medium">
            Generated: <strong className="text-slate-800">{filteredReportRows.length}</strong> record(s)
          </div>
        </div>

        {/* Report Info Banner */}
        <div className="p-3 rounded-xl bg-red-50/50 border border-red-100 flex items-center justify-between text-xs text-red-900">
          <div>
            <strong>Report: {activeReportMeta?.label}</strong> — <span className="text-slate-600">{activeReportMeta?.desc}</span>
          </div>
          <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">
            Live Synchronized
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. REPORT DATA TABLE
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                {reportData.headers.map((head, idx) => (
                  <th key={idx} className="py-3 px-4">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredReportRows.length === 0 ? (
                <tr>
                  <td colSpan={reportData.headers.length} className="py-8 text-center text-slate-400 italic">
                    No report records found matching current criteria
                  </td>
                </tr>
              ) : (
                filteredReportRows.map((row: any, i: number) => (
                  <tr key={row.id || i} className="hover:bg-red-50/20 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {row.col1}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {row.col2}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {row.col3}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {row.col4}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {row.col5}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {row.col6}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                        row.status === 'Completed' || row.status === 'Within Budget' || row.status === 'Settled' || row.status === 'PROFITABLE' || row.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : row.status === 'To Pay' || row.status === 'Over Budget' || row.status === 'OVERRUN' || row.status === 'Paid (Out)' || row.status === 'LOSS'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
