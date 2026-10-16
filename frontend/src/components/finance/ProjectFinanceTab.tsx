import React, { useState, useMemo } from 'react';
import { 
  Building2, TrendingUp, AlertCircle, CheckCircle2, 
  DollarSign, PieChart, ArrowUpRight, ArrowDownRight, 
  Receipt, Users, Truck, Fuel, HardHat, Wrench, Search,
  Download, Filter, SlidersHorizontal, ChevronRight, BarChart3
} from 'lucide-react';
import { Project } from '../../types';
import { 
  FinanceTransaction, 
  PaymentRequestItem, 
  BankAccountRecord 
} from '../../views/AccountsFinanceView';
import { CustomSelect } from '../CustomSelect';
import { ExpenseItemSummary } from './FinanceDashboardTab';

interface ProjectFinanceTabProps {
  projects: Project[];
  transactions: FinanceTransaction[];
  paymentRequests: PaymentRequestItem[];
  expenses: ExpenseItemSummary[];
  bankAccounts: BankAccountRecord[];
  onOpenRecordExpense: (defaultProject?: string) => void;
  onOpenCreateTransaction: (defaultProject?: string) => void;
}

export const ProjectFinanceTab: React.FC<ProjectFinanceTabProps> = ({
  projects,
  transactions,
  paymentRequests,
  expenses,
  bankAccounts,
  onOpenRecordExpense,
  onOpenCreateTransaction,
}) => {
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Fallback projects if none passed
  const activeProjectsList = useMemo(() => {
    if (projects && projects.length > 0) return projects;
    return [
      {
        id: 'proj-1',
        name: 'Booshnam Residential Villa (Thiruvanmiyur)',
        client_name: 'Rajesh Kumar',
        estimated_budget: 7500000,
        boq_value: 8200000,
        actual_cost: 4200000,
        status: 'ACTIVE'
      },
      {
        id: 'proj-2',
        name: 'Commercial Complex Phase 1 (OMR)',
        client_name: 'Apex Infrastructure Pvt Ltd',
        estimated_budget: 18500000,
        boq_value: 21000000,
        actual_cost: 11200000,
        status: 'ACTIVE'
      },
      {
        id: 'proj-3',
        name: 'Industrial Warehouse (Sriperumbudur)',
        client_name: 'Greenway Logistics Corp',
        estimated_budget: 9500000,
        boq_value: 10400000,
        actual_cost: 9800000,
        status: 'ACTIVE'
      }
    ] as Project[];
  }, [projects]);

  // Aggregate project-wise comprehensive financial data
  const projectFinancialRows = useMemo(() => {
    return activeProjectsList.map(proj => {
      const pName = (proj.name || '').trim().toLowerCase();

      // Transactions
      const pTxns = transactions.filter(t => t.projectName && t.projectName.trim().toLowerCase().includes(pName));
      const revenue = pTxns.filter(t => t.type === 'INCOME').reduce((s, t) => s + (Number(t.amount) || 0), 0) + (proj.cash_in || 0);

      // Expenses
      const pExps = expenses.filter(e => e.projectName && e.projectName.trim().toLowerCase().includes(pName) && e.status === 'Paid');
      
      // Cost Breakdown
      const materialCost = pExps.filter(e => e.category === 'Materials').reduce((s, e) => s + e.amount, 0) +
        pTxns.filter(t => (t.category || '').toLowerCase().includes('material')).reduce((s, t) => s + t.amount, 0);

      const labourCost = pExps.filter(e => e.category === 'Labour & Daily Wages').reduce((s, e) => s + e.amount, 0) +
        (proj.labour_contractor_expense || 0);

      const contractorCost = pExps.filter(e => e.category === 'Subcontractor').reduce((s, e) => s + e.amount, 0) +
        paymentRequests.filter(r => r.projectName && r.projectName.toLowerCase().includes(pName) && r.status === 'Paid').reduce((s, r) => s + r.amount, 0);

      const equipmentCost = pExps.filter(e => e.category === 'Machinery & Equipment').reduce((s, e) => s + e.amount, 0);

      const fuelAndSiteCost = pExps.filter(e => 
        e.category === 'Fuel & Logistics' || e.category === 'Site Petty Cash' || e.category === 'Utilities & Admin' || e.category === 'Safety & Compliance'
      ).reduce((s, e) => s + e.amount, 0);

      const otherExpenses = pExps.filter(e => 
        !['Materials', 'Labour & Daily Wages', 'Subcontractor', 'Machinery & Equipment', 'Fuel & Logistics', 'Site Petty Cash', 'Utilities & Admin', 'Safety & Compliance'].includes(e.category)
      ).reduce((s, e) => s + e.amount, 0);

      const totalActualCost = materialCost + labourCost + contractorCost + equipmentCost + fuelAndSiteCost + otherExpenses + (proj.actual_cost && materialCost === 0 ? proj.actual_cost : 0);

      const budget = proj.estimated_budget || proj.boq_value || 5000000;
      const contractValue = proj.boq_value || proj.estimated_budget || 6000000;
      const remainingBudget = Math.max(0, budget - totalActualCost);
      const isOverBudget = totalActualCost > budget;
      const overrunAmount = isOverBudget ? totalActualCost - budget : 0;
      const variancePercent = ((totalActualCost - budget) / (budget || 1)) * 100;

      // Profitability
      const grossProfit = revenue - totalActualCost;
      const netProfit = grossProfit - (totalActualCost * 0.05); // 5% indirect overheads
      const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

      return {
        id: proj.id,
        name: proj.name,
        client: proj.client_name || 'Client',
        status: proj.status || 'ACTIVE',
        contractValue,
        budget,
        revenue,
        totalActualCost,
        materialCost,
        labourCost,
        contractorCost,
        equipmentCost,
        fuelAndSiteCost,
        otherExpenses,
        remainingBudget,
        isOverBudget,
        overrunAmount,
        variancePercent,
        grossProfit,
        netProfit,
        margin
      };
    });
  }, [activeProjectsList, transactions, expenses, paymentRequests]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return projectFinancialRows.filter(p => {
      if (selectedProjectFilter !== 'All' && p.id !== selectedProjectFilter && p.name !== selectedProjectFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.client.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [projectFinancialRows, selectedProjectFilter, searchQuery]);

  // High-level aggregates
  const totals = useMemo(() => {
    const totalContract = filteredRows.reduce((s, r) => s + r.contractValue, 0);
    const totalBudget = filteredRows.reduce((s, r) => s + r.budget, 0);
    const totalCost = filteredRows.reduce((s, r) => s + r.totalActualCost, 0);
    const totalRevenue = filteredRows.reduce((s, r) => s + r.revenue, 0);
    const totalProfit = totalRevenue - totalCost;
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const overBudgetCount = filteredRows.filter(r => r.isOverBudget).length;

    return {
      totalContract,
      totalBudget,
      totalCost,
      totalRevenue,
      totalProfit,
      avgMargin,
      overBudgetCount
    };
  }, [filteredRows]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Project Name', 'Client', 'Contract Value (₹)', 'Budget (₹)', 'Actual Cost (₹)', 'Revenue (₹)', 'Gross Profit (₹)', 'Margin (%)', 'Budget Status'];
    const rows = filteredRows.map(r => [
      `"${r.name.replace(/"/g, '""')}"`,
      `"${r.client.replace(/"/g, '""')}"`,
      r.contractValue,
      r.budget,
      r.totalActualCost,
      r.revenue,
      r.grossProfit,
      `${r.margin.toFixed(1)}%`,
      r.isOverBudget ? `OVERRUN (+₹${r.overrunAmount})` : 'WITHIN BUDGET'
    ]);
    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Booshnam_Project_Finances_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & OVERVIEW CARDS (Requirements 12, 13, 14)
      ───────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 className="w-5 h-5 text-red-600" />
              <span>Project Financial Performance & Profitability</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Budget vs actual cost variance, cost breakdown, and gross margin analysis per site
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportCSV}
              className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Report</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenRecordExpense()}
              className="h-9 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm shadow-red-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>+ Record Project Cost</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Contract Value
            </span>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1.5">
              ₹ {totals.totalContract.toLocaleString('en-IN')}
            </div>
            <p className="text-[10.5px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
              Approved client project BOQ sum
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Budget Allocated
            </span>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1.5">
              ₹ {totals.totalBudget.toLocaleString('en-IN')}
            </div>
            <p className="text-[10.5px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
              Total approved financial target
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">
                Actual Cost Incurred
              </span>
              {totals.overBudgetCount > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  {totals.overBudgetCount} OVERRUN
                </span>
              )}
            </div>
            <div className="text-2xl font-black text-red-600 tracking-tight mt-1.5">
              ₹ {totals.totalCost.toLocaleString('en-IN')}
            </div>
            <p className="text-[10.5px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
              Materials, labour, machinery & claims
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Gross Profit & Margin
            </span>
            <div className={`text-2xl font-black tracking-tight mt-1.5 ${totals.totalProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              ₹ {totals.totalProfit.toLocaleString('en-IN')}
            </div>
            <p className="text-[10.5px] text-slate-400 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span>Overall Revenue Margin:</span>
              <strong className="text-slate-800 font-bold">{totals.avgMargin.toFixed(1)}%</strong>
            </p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. FILTER BAR (Red and White Theme)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          {/* Search */}
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search project name or client..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/15 transition-all text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* Project dropdown */}
          <div className="w-64">
            <CustomSelect
              value={selectedProjectFilter}
              onChange={val => setSelectedProjectFilter(val)}
              options={[
                { label: 'All Construction Projects', value: 'All' },
                ...activeProjectsList.map(p => ({ label: p.name, value: p.id })),
              ]}
              size="md"
              triggerClassName="!h-9 !rounded-xl"
              variant="brand"
            />
          </div>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Showing <strong className="text-slate-800">{filteredRows.length}</strong> active construction project(s)
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. PROJECT CARDS WITH BUDGET OVERRUN WARNINGS (Requirement 13)
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {filteredRows.map(row => (
          <div 
            key={row.id}
            className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-2xs p-5 transition-all space-y-4"
          >
            {/* Top Bar: Title & Status */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                      {row.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      Client: {row.client}
                    </span>
                    {row.isOverBudget ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 animate-pulse">
                        <AlertCircle className="w-3 h-3 text-rose-600" />
                        BUDGET OVERRUN: +₹{row.overrunAmount.toLocaleString('en-IN')} ({row.variancePercent.toFixed(1)}%)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        WITHIN BUDGET ({Math.abs(row.variancePercent).toFixed(1)}% remaining)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Contract BOQ Value: <strong className="text-slate-700 font-semibold">₹{row.contractValue.toLocaleString('en-IN')}</strong> • Target Budget: <strong className="text-slate-700 font-semibold">₹{row.budget.toLocaleString('en-IN')}</strong>
                  </p>
                </div>
              </div>

              {/* Profitability summary on right */}
              <div className="flex items-center gap-4 text-right shrink-0">
                <div>
                  <span className="text-[10.5px] text-slate-400 block">Total Revenue (In)</span>
                  <strong className="text-sm font-black text-slate-900">
                    ₹ {row.revenue.toLocaleString('en-IN')}
                  </strong>
                </div>
                <div className="border-l border-slate-200 pl-4">
                  <span className="text-[10.5px] text-slate-400 block">Gross Profit</span>
                  <strong className={`text-sm font-black ${row.grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    ₹ {row.grossProfit.toLocaleString('en-IN')}
                  </strong>
                  <span className="text-[10px] text-slate-400 block">Margin: {row.margin.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Budget Progress Bar */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 font-medium">
                <span className="flex items-center gap-1.5">
                  <span>Actual Cost:</span>
                  <strong className={row.isOverBudget ? 'text-rose-600 font-bold' : 'text-slate-900 font-bold'}>
                    ₹ {row.totalActualCost.toLocaleString('en-IN')}
                  </strong>
                </span>
                <span>
                  Budget: <strong className="text-slate-900 font-bold">₹ {row.budget.toLocaleString('en-IN')}</strong>
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${row.isOverBudget ? 'bg-rose-600' : 'bg-red-600'}`}
                  style={{ width: `${Math.min(100, Math.round((row.totalActualCost / (row.budget || 1)) * 100))}%` }}
                />
              </div>
            </div>

            {/* Cost Breakdown Grid (Requirement 12: Material, Labour, Contractor, Equipment, Site) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Materials</span>
                <strong className="text-xs font-bold text-slate-900 block mt-0.5">
                  ₹ {row.materialCost.toLocaleString('en-IN')}
                </strong>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Labour & Wages</span>
                <strong className="text-xs font-bold text-slate-900 block mt-0.5">
                  ₹ {row.labourCost.toLocaleString('en-IN')}
                </strong>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Contractors</span>
                <strong className="text-xs font-bold text-slate-900 block mt-0.5">
                  ₹ {row.contractorCost.toLocaleString('en-IN')}
                </strong>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Machinery / Hire</span>
                <strong className="text-xs font-bold text-slate-900 block mt-0.5">
                  ₹ {row.equipmentCost.toLocaleString('en-IN')}
                </strong>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Fuel & Logistics</span>
                <strong className="text-xs font-bold text-slate-900 block mt-0.5">
                  ₹ {row.fuelAndSiteCost.toLocaleString('en-IN')}
                </strong>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Other / Overheads</span>
                <strong className="text-xs font-bold text-slate-900 block mt-0.5">
                  ₹ {row.otherExpenses.toLocaleString('en-IN')}
                </strong>
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onOpenCreateTransaction(row.name)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-red-300 text-slate-700 hover:text-red-600 text-xs font-semibold transition-colors cursor-pointer"
              >
                + Client Payment
              </button>
              <button
                type="button"
                onClick={() => onOpenRecordExpense(row.name)}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                + Record Expense
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
