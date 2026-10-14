import React, { useState } from 'react';
import { 
  Building2, Plus, Search, Filter, Check, X, 
  FileText, ArrowUpRight, DollarSign, Calendar, ShieldCheck 
} from 'lucide-react';
import { Project, SubconWorkOrder } from '../../../types';

interface SubconTabProps {
  project: Project;
  onShowToast?: (msg: string) => void;
}

const DEFAULT_WORK_ORDERS: SubconWorkOrder[] = [];

export const SubconTab: React.FC<SubconTabProps> = ({ project, onShowToast }) => {
  const loadInitialWorkOrders = (): SubconWorkOrder[] => {
    try {
      const raw = localStorage.getItem(`booshnam_subcontractors_v1_${project.id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}

    // Fallback to project.assigned_subcontractors if defined
    if (project.assigned_subcontractors && project.assigned_subcontractors.length > 0) {
      return project.assigned_subcontractors.map((sc, idx) => ({
        id: sc.id || `wo-assigned-${idx}`,
        wo_number: `WO-2026-${String(idx + 1).padStart(3, '0')}`,
        subcon_name: sc.name,
        trade_scope: sc.trade_scope || 'Specialized Subcontractor',
        contract_amount: 350000,
        work_completed_percent: 0,
        billed_amount: 0,
        retention_percent: 5,
        retention_amount: 0,
        paid_amount: 0,
        balance_payable: 0,
        status: 'ACTIVE',
        start_date: sc.assignment_date || new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0]
      }));
    }
    return DEFAULT_WORK_ORDERS;
  };

  const [workOrders, setWorkOrders] = useState<SubconWorkOrder[]>(() => loadInitialWorkOrders());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedWO, setSelectedWO] = useState<SubconWorkOrder | null>(null);

  // Form State
  const [subconName, setSubconName] = useState('');
  const [scope, setScope] = useState('');
  const [contractAmt, setContractAmt] = useState<number>(350000);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 60*86400000).toISOString().split('T')[0]);

  const totalContract = workOrders.reduce((sum, w) => sum + w.contract_amount, 0);
  const totalBilled = workOrders.reduce((sum, w) => sum + w.billed_amount, 0);
  const totalPaid = workOrders.reduce((sum, w) => sum + w.paid_amount, 0);
  const totalBalance = workOrders.reduce((sum, w) => sum + w.balance_payable, 0);

  const filteredOrders = workOrders.filter(w => {
    const matchesSearch = w.subcon_name.toLowerCase().includes(search.toLowerCase()) ||
                          w.trade_scope.toLowerCase().includes(search.toLowerCase()) ||
                          w.wo_number.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateWO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subconName.trim() || !scope.trim()) return;

    const newWO: SubconWorkOrder = {
      id: `wo-${Date.now()}`,
      wo_number: `WO-2026-${String(workOrders.length + 17).padStart(3, '0')}`,
      subcon_name: subconName.trim(),
      trade_scope: scope.trim(),
      contract_amount: Number(contractAmt),
      work_completed_percent: 0,
      billed_amount: 0,
      retention_percent: 5,
      retention_amount: 0,
      paid_amount: 0,
      balance_payable: 0,
      status: 'ACTIVE',
      start_date: startDate,
      end_date: endDate
    };

    const updated = [...workOrders, newWO];
    setWorkOrders(updated);
    try {
      localStorage.setItem(`booshnam_subcontractors_v1_${project.id}`, JSON.stringify(updated));
    } catch (e) {}
    onShowToast?.(`Work Order ${newWO.wo_number} issued to ${newWO.subcon_name}`);
    setIsCreateOpen(false);

    // Reset
    setSubconName('');
    setScope('');
  };

  return (
    <div className="space-y-5">
      
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded">
              SUBCON TRACTS
            </span>
            <h2 className="text-lg font-bold text-slate-900">Subcontractors, Work Orders & RA Bills</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Contract scopes, completion percentages, running account billing (RA bills), and 5% retention tracking.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Issue Work Order</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total Subcon Orders</div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 mt-1">₹ {totalContract.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{workOrders.length} contracted packages</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total Billed to Date</div>
          <div className="text-2xl font-bold tracking-tight text-indigo-700 mt-1">₹ {totalBilled.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Approved RA bills</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Paid to Subcons</div>
          <div className="text-2xl font-bold tracking-tight text-emerald-700 mt-1">₹ {totalPaid.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Disbursed disbursements</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Pending Clearance</div>
          <div className="text-2xl font-bold tracking-tight text-rose-600 mt-1">₹ {totalBalance.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Due on next payment cycle</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by subcon name, trade, or WO #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {['ALL', 'ACTIVE', 'COMPLETED', 'DRAFT'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Work Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3.5 px-4 w-32">WO #</th>
                <th className="py-3.5 px-4">Subcontractor & Scope</th>
                <th className="py-3.5 px-4 text-right w-28">Contract (₹)</th>
                <th className="py-3.5 px-4 w-36">Work Done (%)</th>
                <th className="py-3.5 px-4 text-right w-28">Billed (₹)</th>
                <th className="py-3.5 px-4 text-right w-28">Paid (₹)</th>
                <th className="py-3.5 px-4 text-right w-28">Balance (₹)</th>
                <th className="py-3.5 px-4 text-right w-24">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No subcontractor work orders issued yet.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((wo) => (
                  <tr key={wo.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 tracking-tight font-bold text-slate-900">
                      {wo.wo_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{wo.subcon_name}</div>
                      <div className="text-[11px] text-slate-500">{wo.trade_scope}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right tracking-tight font-bold text-slate-900">
                      ₹ {wo.contract_amount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-slate-800">{wo.work_completed_percent}%</div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-red-600 h-full rounded-full" 
                            style={{ width: `${wo.work_completed_percent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right tracking-tight text-slate-800">
                      ₹ {wo.billed_amount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right tracking-tight text-emerald-700 font-bold">
                      ₹ {wo.paid_amount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right tracking-tight text-rose-600 font-bold">
                      ₹ {wo.balance_payable.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        wo.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                        wo.status === 'ACTIVE' ? 'bg-red-100 text-red-800' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {wo.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE WORK ORDER MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Issue Subcon Work Order</h3>
                  <p className="text-xs text-slate-500">{project.name}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsCreateOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWO} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subcontractor Firm / Agency Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vasanth RCC Shuttering Works"
                  value={subconName}
                  onChange={(e) => setSubconName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Trade & Scope of Work *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Columns Shuttering, Plinth Beam staging & scaffolding"
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Agreed Contract Value (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Total contract value"
                    value={contractAmt}
                    onChange={(e) => setContractAmt(Number(e.target.value))}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl tracking-tight font-bold focus:outline-none focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Retention Terms</label>
                  <input
                    type="text"
                    disabled
                    value="5% Retention Withheld"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contract Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Completion Target</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Issue Work Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
