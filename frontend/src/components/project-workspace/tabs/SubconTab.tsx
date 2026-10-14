import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, CheckCircle2, MoreVertical, 
  Trash2, Eye, Edit2, Check, Clock, X, ExternalLink 
} from 'lucide-react';
import { Project, SubconWorkOrder } from '../../../types';
import { 
  getProjectSubconOrders, 
  saveProjectSubconOrders, 
  addSubconWorkOrder, 
  updateSubconWorkOrder, 
  deleteSubconWorkOrder 
} from '../../../lib/subconService';
import { CreateWorkOrderModal } from './subcon/CreateWorkOrderModal';
import { WorkOrderDetailView } from './subcon/WorkOrderDetailView';

interface SubconTabProps {
  project: Project;
  onShowToast?: (msg: string) => void;
}

export const SubconTab: React.FC<SubconTabProps> = ({ project, onShowToast }) => {
  const projectId = project.id || project.code || 'default';

  // Work Orders state
  const [workOrders, setWorkOrders] = useState<SubconWorkOrder[]>(() => {
    return getProjectSubconOrders(projectId);
  });

  // Re-load if project changes
  useEffect(() => {
    setWorkOrders(getProjectSubconOrders(projectId));
  }, [projectId]);

  // Sync event listener for multi-tab updates
  useEffect(() => {
    const handleSync = (e: any) => {
      if (e.detail?.projectId === projectId && Array.isArray(e.detail?.orders)) {
        setWorkOrders(e.detail.orders);
      }
    };
    window.addEventListener('booshnam_subcon_updated', handleSync);
    return () => window.removeEventListener('booshnam_subcon_updated', handleSync);
  }, [projectId]);

  // Search filter
  const [search, setSearch] = useState('');

  // Selected Work Order for Detail View
  const [selectedWO, setSelectedWO] = useState<SubconWorkOrder | null>(null);

  // Create Work Order modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Row action menu dropdown
  const [activeMenuWoId, setActiveMenuWoId] = useState<string | null>(null);

  // Filtered orders
  const filteredOrders = workOrders.filter(w => {
    const s = search.toLowerCase();
    return (
      w.subcon_name.toLowerCase().includes(s) ||
      (w.work_order_title || '').toLowerCase().includes(s) ||
      w.trade_scope.toLowerCase().includes(s) ||
      w.wo_number.toLowerCase().includes(s)
    );
  });

  // Generate next WO number
  const nextWoNumber = `#WO--${String(workOrders.length + 63)}`;

  // Handle Create Work Order
  const handleCreateSubmit = (newWOData: Partial<SubconWorkOrder>) => {
    const newWO: SubconWorkOrder = {
      id: `wo-${Date.now()}`,
      wo_number: newWOData.wo_number || nextWoNumber,
      subcon_name: newWOData.subcon_name || 'Subcontractor',
      trade_scope: newWOData.trade_scope || 'General Trade',
      work_order_title: newWOData.work_order_title || '--',
      work_order_date: newWOData.work_order_date || new Date().toISOString().split('T')[0],
      tax_type: newWOData.tax_type || 'ITEM_LEVEL',
      contract_amount: 0,
      work_completed_percent: 0,
      billed_amount: 0,
      retention_percent: 5,
      retention_amount: 0,
      paid_amount: 0,
      balance_payable: 0,
      approval_status: 'Approved',
      status: 'ACTIVE',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30*86400000).toISOString().split('T')[0],
      items: [],
      milestones: [],
      bills: [],
      materials: [],
      bank_details: {
        account_holder_name: 'NA',
        account_number: 'NA',
        ifsc_code: 'NA',
        notes: ''
      }
    };

    const updated = addSubconWorkOrder(projectId, newWO);
    setWorkOrders(updated);
    onShowToast?.(`Work Order ${newWO.wo_number} issued to ${newWO.subcon_name}`);
    
    // Automatically open the detail view so user can add items
    setSelectedWO(newWO);
  };

  // Handle Update Work Order from Detail View
  const handleUpdateWO = (updatedWO: SubconWorkOrder) => {
    const updated = updateSubconWorkOrder(projectId, updatedWO);
    setWorkOrders(updated);
    setSelectedWO(updatedWO);
  };

  // Handle Delete
  const handleDeleteWO = (woId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm('Are you sure you want to delete this work order?')) return;
    const updated = deleteSubconWorkOrder(projectId, woId);
    setWorkOrders(updated);
    if (selectedWO?.id === woId) {
      setSelectedWO(null);
    }
    setActiveMenuWoId(null);
    onShowToast?.('Work order deleted');
  };

  // If a Work Order is selected, show the Detail View (matching Screenshot 3 & 4)
  if (selectedWO) {
    return (
      <WorkOrderDetailView
        project={project}
        workOrder={selectedWO}
        onBack={() => {
          // Re-sync with latest stored list
          const latest = getProjectSubconOrders(projectId);
          setWorkOrders(latest);
          setSelectedWO(null);
        }}
        onUpdateWorkOrder={handleUpdateWO}
        onShowToast={onShowToast}
      />
    );
  }

  // Work Orders List Table (matching Screenshot 1)
  return (
    <div className="space-y-4">
      
      {/* Top Search & Actions Bar (Matches Screenshot 1) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        
        {/* Search Input on Left */}
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by sub contractor, work order title, or #WO..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 shadow-2xs"
          />
        </div>

        {/* Purple Button on Right: + Sub Con Work Order */}
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="w-full sm:w-auto px-4 py-2.5 bg-[#5b52f9] hover:bg-[#4b42e0] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Sub Con Work Order</span>
        </button>

      </div>

      {/* Subcon Work Orders Table (Matches Screenshot 1) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3.5 px-4 w-28">S.No.</th>
                <th className="py-3.5 px-4">Sub Contractor</th>
                <th className="py-3.5 px-4 w-40">Work Order Title</th>
                <th className="py-3.5 px-4 text-center w-28">Milestone</th>
                <th className="py-3.5 px-4 w-44">Physical Progress</th>
                <th className="py-3.5 px-4 text-right w-36">Work Order Value</th>
                <th className="py-3.5 px-4 text-right w-32">Billed Value</th>
                <th className="py-3.5 px-4 text-center w-32">Approval Status</th>
                <th className="py-3.5 px-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <div className="space-y-2">
                      <div>No subcontractor work orders found.</div>
                      <button
                        type="button"
                        onClick={() => setIsCreateOpen(true)}
                        className="text-xs font-bold text-[#5b52f9] hover:underline"
                      >
                        + Create your first Sub Con Work Order
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((wo) => {
                  const milestones = wo.milestones || [];
                  const completedMs = milestones.filter(m => m.status === 'COMPLETED').length;
                  const totalMs = milestones.length;
                  const progressPct = wo.work_completed_percent || 0;

                  return (
                    <tr
                      key={wo.id}
                      onClick={() => setSelectedWO(wo)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* S.No. (e.g. #WO--62) */}
                      <td className="py-4 px-4 font-bold text-slate-900 tracking-tight group-hover:text-indigo-600">
                        {wo.wo_number}
                      </td>

                      {/* Sub Contractor */}
                      <td className="py-4 px-4 font-bold text-slate-900 uppercase">
                        {wo.subcon_name}
                      </td>

                      {/* Work Order Title */}
                      <td className="py-4 px-4 text-slate-500 font-medium truncate max-w-xs">
                        {wo.work_order_title || '--'}
                      </td>

                      {/* Milestone (e.g. 0 / 0) */}
                      <td className="py-4 px-4 text-center font-bold text-slate-700">
                        {completedMs} / {totalMs}
                      </td>

                      {/* Physical Progress (e.g. 0% with slim progress bar) */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-700 w-8">
                            {progressPct}%
                          </span>
                          <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-slate-300 h-full rounded-full transition-all"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Work Order Value (e.g. ₹ 1,900) */}
                      <td className="py-4 px-4 text-right font-bold text-slate-900 tracking-tight">
                        ₹ {wo.contract_amount.toLocaleString()}
                      </td>

                      {/* Billed Value (e.g. ₹ 5,500) */}
                      <td className="py-4 px-4 text-right font-bold text-slate-900 tracking-tight">
                        ₹ {(wo.billed_amount || 0).toLocaleString()}
                      </td>

                      {/* Approval Status (e.g. Approved with green check circle) */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{wo.approval_status || 'Approved'}</span>
                        </span>
                      </td>

                      {/* Action Menu (3 dots) */}
                      <td className="py-4 px-3 text-right relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuWoId(activeMenuWoId === wo.id ? null : wo.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {activeMenuWoId === wo.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-4 top-10 z-20 w-36 bg-white rounded-xl shadow-xl border border-slate-100 py-1 text-xs font-medium text-slate-700 animate-in fade-in"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedWO(wo);
                                setActiveMenuWoId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>View Details</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleDeleteWO(wo.id, e)}
                              className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Order</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE WORK ORDER MODAL (Matches Screenshot 2) */}
      <CreateWorkOrderModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        nextWoNumber={nextWoNumber}
      />

    </div>
  );
};
