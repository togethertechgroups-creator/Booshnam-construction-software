import React, { useState } from 'react';
import { 
  Calculator, Plus, TrendingDown, TrendingUp, CheckCircle2, 
  AlertCircle, DollarSign, ArrowRight, ShieldCheck, FileCheck
} from 'lucide-react';
import { Project, CostPlanItem, ChangeOrder } from '../types';
import { UserProfileDropdown } from '../components/UserProfileDropdown';

interface BudgetViewProps {
  project: Project | null;
  boqItems: CostPlanItem[];
  changeOrders: ChangeOrder[];
  canViewCost: boolean;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const BudgetView: React.FC<BudgetViewProps> = ({
  project,
  boqItems,
  changeOrders,
  canViewCost,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  const [activeTab, setActiveTab] = useState<'boq' | 'change_orders'>('boq');

  if (!canViewCost) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <UserProfileDropdown showBell={true} />
        </div>
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-red-50 text-brand flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Cost Data Restricted</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Your active role does not have financial visibility permissions. Switch your role to <strong>Project Manager</strong>, <strong>Finance</strong>, or <strong>Owner</strong> to review BOQ costs and change orders.
          </p>
        </div>
      </div>
    );
  }

  const totalPlanned = boqItems.reduce((acc, item) => acc + item.planned_amount, 0);
  const totalActual = boqItems.reduce((acc, item) => acc + item.actual_amount, 0);
  const totalVariance = totalPlanned - totalActual;
  const burnPercent = totalPlanned > 0 ? (totalActual / totalPlanned * 100).toFixed(1) : '0';

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
      {/* Edge-to-edge Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-brand text-white text-[10px] font-bold rounded">
                {project?.code || 'PRJ'}
              </span>
              <h1 className="text-xl font-bold text-slate-900">Estimation & Budget Control</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Bill of Quantities (BOQ), real-time actual expense tracking, and change orders audit trail.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab Toggle */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('boq')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'boq' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              BOQ & Cost Plan
            </button>
            <button
              onClick={() => setActiveTab('change_orders')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'change_orders' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Change Orders ({changeOrders.length})
            </button>
          </div>
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <UserProfileDropdown showBell={true} />
        </div>
      </div>

      {/* Financial Metrics Cards */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/40">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-xs font-medium text-slate-500">Planned Budget (BOQ Baseline)</div>
            <div className="text-2xl font-black text-slate-900 mt-1">₹{(totalPlanned / 100000).toFixed(2)} Lakhs</div>
            <div className="text-[11px] text-slate-400 mt-1">Approved estimate for active packages</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-xs font-medium text-slate-500">Actual Committed Cost</div>
            <div className="text-2xl font-black text-slate-900 mt-1">₹{(totalActual / 100000).toFixed(2)} Lakhs</div>
            <div className="text-[11px] text-brand font-semibold mt-1">{burnPercent}% of baseline consumed</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-xs font-medium text-slate-500">Remaining Budget Variance</div>
            <div className="text-2xl font-black text-emerald-700 mt-1">₹{(totalVariance / 100000).toFixed(2)} Lakhs</div>
            <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>On Track (Positive buffer)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab 1: BOQ Table */}
      {activeTab === 'boq' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden m-6">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-900 text-sm">Bill of Quantities (BOQ) Variance Analysis</h3>
            <button className="px-3 py-1.5 bg-brand hover:bg-brand-dark text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer">
              <Plus className="w-3.5 h-3.5" />
              <span>Add BOQ Item</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">Item Code</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Planned Qty</th>
                  <th className="py-3 px-4 text-right">Rate (₹)</th>
                  <th className="py-3 px-4 text-right">Planned Amt</th>
                  <th className="py-3 px-4 text-right">Actual Qty</th>
                  <th className="py-3 px-4 text-right">Actual Amt</th>
                  <th className="py-3 px-4 text-right">Variance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {boqItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-slate-400">
                      <Calculator className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-700 text-xs">No BOQ Items Recorded</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Click "Add BOQ Item" to add items to your bill of quantities.</p>
                    </td>
                  </tr>
                ) : (
                  boqItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{item.item_code}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {item.category_name}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{item.description}</td>
                      <td className="py-3 px-4 text-right font-mono">{item.planned_quantity} {item.unit}</td>
                      <td className="py-3 px-4 text-right font-mono">₹{item.planned_rate.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{item.planned_amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">{item.actual_quantity} {item.unit}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                        ₹{item.actual_amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        ₹{item.variance_amount.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Change Orders */}
      {activeTab === 'change_orders' && (
        <div className="space-y-4 m-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Variation & Change Orders Trail</h3>
            <button className="px-3 py-1.5 bg-brand hover:bg-brand-dark text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer">
              <Plus className="w-3.5 h-3.5" />
              <span>Submit Change Order</span>
            </button>
          </div>

          <div className="space-y-3">
            {changeOrders.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 p-8">
                <FileCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700 text-xs">No Change Orders Submitted</p>
                <p className="text-[11px] text-slate-400 mt-0.5">All scope and cost variations will appear here.</p>
              </div>
            ) : (
              changeOrders.map((co) => (
                <div key={co.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                        {co.order_number}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900">{co.title}</h4>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold self-start sm:self-auto ${
                      co.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                      co.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {co.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">{co.description}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase block">Cost Impact</span>
                      <span className="font-bold text-slate-900 font-mono">+₹{co.cost_impact.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase block">Schedule Impact</span>
                      <span className="font-bold text-slate-800">+{co.schedule_impact_days} Days</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase block">Reason</span>
                      <span className="font-semibold text-slate-700">{co.reason}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase block">Approver</span>
                      <span className="font-semibold text-slate-700">{co.approved_by_name || 'Pending Review'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
