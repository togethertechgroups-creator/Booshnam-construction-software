import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, Edit2, Search, Download, Plus, CheckCircle2, 
  Layers, Calendar, Building2, Check, X, FileText, ArrowUpRight,
  TrendingUp, Clock, AlertCircle, ShieldCheck, Printer, Trash2,
  ExternalLink, Link as LinkIcon, DollarSign, Wallet
} from 'lucide-react';
import { 
  SubconWorkOrder, 
  SubconWorkOrderItem, 
  SubconMilestone, 
  SubconBill, 
  SubconMaterialIssue,
  PaymentRequest,
  Project 
} from '../../../../types';
import { SelectWorkOrderItemsDrawer } from './SelectWorkOrderItemsDrawer';
import { SubcontractorExpenseDrawer } from './SubcontractorExpenseDrawer';
import { addSubconBillToWorkOrder } from '../../../../lib/subconService';
import { syncProjectPaymentRequestToFinance } from '../../../../lib/financeSyncService';

interface WorkOrderDetailViewProps {
  project: Project;
  workOrder: SubconWorkOrder;
  onBack: () => void;
  onUpdateWorkOrder: (updated: SubconWorkOrder) => void;
  onShowToast?: (msg: string) => void;
}

export const WorkOrderDetailView: React.FC<WorkOrderDetailViewProps> = ({
  project,
  workOrder,
  onBack,
  onUpdateWorkOrder,
  onShowToast
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'items' | 'milestones' | 'bills' | 'materials'>('items');
  const [search, setSearch] = useState('');

  // Drawers state
  const [isSelectItemsDrawerOpen, setIsSelectItemsDrawerOpen] = useState(false);
  const [selectedItemsForBill, setSelectedItemsForBill] = useState<SubconWorkOrderItem[]>([]);
  const [isExpenseDrawerOpen, setIsExpenseDrawerOpen] = useState(false);

  // Modals state
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isAddMilestoneModalOpen, setIsAddMilestoneModalOpen] = useState(false);
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);
  const [isPaymentRequestModalOpen, setIsPaymentRequestModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isEditHeaderOpen, setIsEditHeaderOpen] = useState(false);
  const [linkingItem, setLinkingItem] = useState<SubconWorkOrderItem | null>(null);

  // Edit Header Form State
  const [headerVendor, setHeaderVendor] = useState(workOrder.subcon_name);
  const [headerWoNo, setHeaderWoNo] = useState(workOrder.wo_number);
  const [headerDate, setHeaderDate] = useState(workOrder.work_order_date || '2026-10-12');

  // Add Item Form State
  const [newItemName, setNewItemName] = useState('');
  const [newItemDimensions, setNewItemDimensions] = useState('-');
  const [newItemRate, setNewItemRate] = useState<number>(400);
  const [newItemUnit, setNewItemUnit] = useState('RMT');
  const [newItemQty, setNewItemQty] = useState<number>(1);
  const [newItemGst, setNewItemGst] = useState<number>(0);

  // Add Milestone Form State
  const [msTitle, setMsTitle] = useState('');
  const [msDate, setMsDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [msWeightage, setMsWeightage] = useState<number>(50);
  const [msAmount, setMsAmount] = useState<number>(1000);

  // Add Material Form State
  const [matName, setMatName] = useState('');
  const [matUnit, setMatUnit] = useState('Bags');
  const [matIssued, setMatIssued] = useState<number>(10);
  const [matChallan, setMatChallan] = useState('CH-4091');

  // Payment Request Form State
  const [prAmount, setPrAmount] = useState<number>(workOrder.balance_payable || 1900);
  const [prRemarks, setPrRemarks] = useState(`Payment against Work Order ${workOrder.wo_number}`);

  // Bank Form State
  const [bankAccHolder, setBankAccHolder] = useState(workOrder.bank_details?.account_holder_name || 'NA');
  const [bankAccNumber, setBankAccNumber] = useState(workOrder.bank_details?.account_number || 'NA');
  const [bankIfsc, setBankIfsc] = useState(workOrder.bank_details?.ifsc_code || 'NA');
  const [bankNotes, setBankNotes] = useState(workOrder.bank_details?.notes || '');

  // Line calculations
  const items = workOrder.items || [];
  const milestones = workOrder.milestones || [];
  const bills = workOrder.bills || [];
  const materials = workOrder.materials || [];

  const itemSubtotal = items.reduce((sum, it) => sum + (it.amount || 0), 0);
  const orderValue = workOrder.contract_amount || itemSubtotal;
  const billedValue = workOrder.billed_amount || 0;

  // Additional Discount & Additional Charges
  const [discount, setDiscount] = useState<number>(workOrder.additional_discount || 0);
  const [charges, setCharges] = useState<number>(workOrder.additional_charges || 0);

  const handleSaveDiscountCharges = (newDisc: number, newChg: number) => {
    setDiscount(newDisc);
    setCharges(newChg);
    onUpdateWorkOrder({
      ...workOrder,
      additional_discount: newDisc,
      additional_charges: newChg
    });
  };

  // Add line item
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem: SubconWorkOrderItem = {
      id: `wo-item-${Date.now()}`,
      item_name: newItemName.trim(),
      dimensions: newItemDimensions.trim() || '-',
      unit_rate: Number(newItemRate) || 0,
      unit: newItemUnit.trim() || 'nos',
      quantity: Number(newItemQty) || 1,
      billed_quantity: 0,
      unbilled_quantity: Number(newItemQty) || 1,
      amount: (Number(newItemRate) || 0) * (Number(newItemQty) || 1),
      gst_percent: Number(newItemGst) || 0
    };

    const updatedItems = [...items, newItem];
    const newContractAmt = updatedItems.reduce((sum, it) => sum + it.amount, 0);

    onUpdateWorkOrder({
      ...workOrder,
      items: updatedItems,
      contract_amount: newContractAmt,
      balance_payable: newContractAmt - (workOrder.paid_amount || 0)
    });

    setIsAddItemModalOpen(false);
    setNewItemName('');
    onShowToast?.(`Item "${newItem.item_name}" added to work order`);
  };

  // Delete line item
  const handleDeleteItem = (itemId: string) => {
    if (!confirm('Are you sure you want to remove this item?')) return;
    const updatedItems = items.filter(it => it.id !== itemId);
    const newContractAmt = updatedItems.reduce((sum, it) => sum + it.amount, 0);

    onUpdateWorkOrder({
      ...workOrder,
      items: updatedItems,
      contract_amount: newContractAmt,
      balance_payable: newContractAmt - (workOrder.paid_amount || 0)
    });
    onShowToast?.('Item removed from work order');
  };

  // Add Milestone
  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msTitle.trim()) return;

    const newMs: SubconMilestone = {
      id: `ms-${Date.now()}`,
      title: msTitle.trim(),
      target_date: msDate,
      weightage_percent: Number(msWeightage) || 0,
      amount: Number(msAmount) || 0,
      status: 'PENDING'
    };

    onUpdateWorkOrder({
      ...workOrder,
      milestones: [...milestones, newMs]
    });

    setIsAddMilestoneModalOpen(false);
    setMsTitle('');
    onShowToast?.(`Milestone "${newMs.title}" created`);
  };

  // Add Material Issue
  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matName.trim()) return;

    const newMat: SubconMaterialIssue = {
      id: `mat-${Date.now()}`,
      material_name: matName.trim(),
      unit: matUnit,
      issued_qty: Number(matIssued) || 0,
      consumed_qty: 0,
      returned_qty: 0,
      issue_date: new Date().toISOString().split('T')[0],
      challan_no: matChallan.trim() || 'CH-001'
    };

    onUpdateWorkOrder({
      ...workOrder,
      materials: [...materials, newMat]
    });

    setIsAddMaterialModalOpen(false);
    setMatName('');
    onShowToast?.(`Material "${newMat.material_name}" issued to ${workOrder.subcon_name}`);
  };

  // Save Header edits
  const handleSaveHeader = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateWorkOrder({
      ...workOrder,
      subcon_name: headerVendor.trim() || workOrder.subcon_name,
      wo_number: headerWoNo.trim() || workOrder.wo_number,
      work_order_date: headerDate
    });
    setIsEditHeaderOpen(false);
    onShowToast?.('Work order details updated');
  };

  // Save Bank Details
  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateWorkOrder({
      ...workOrder,
      bank_details: {
        account_holder_name: bankAccHolder.trim() || 'NA',
        account_number: bankAccNumber.trim() || 'NA',
        ifsc_code: bankIfsc.trim() || 'NA',
        notes: bankNotes.trim()
      }
    });
    setIsBankModalOpen(false);
    onShowToast?.('Bank details updated');
  };

  // Handle Save Bill from Drawer
  const handleSaveBill = (bill: SubconBill) => {
    const updatedOrders = addSubconBillToWorkOrder(
      project.id || project.code || 'default',
      project.name,
      workOrder.id,
      bill
    );
    const updatedCurrent = updatedOrders.find(wo => wo.id === workOrder.id);
    if (updatedCurrent) {
      onUpdateWorkOrder(updatedCurrent);
    }
    setIsExpenseDrawerOpen(false);
    onShowToast?.(`Subcontractor RA Bill ${bill.bill_number} saved & synced to Finance!`);
  };

  // Payment Request Submission
  const handleCreatePaymentRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prAmount || prAmount <= 0) return;

    try {
      const pr: PaymentRequest = {
        id: `pr-subcon-${Date.now()}`,
        request_number: `PR-WO-${Math.floor(100 + Math.random() * 900)}`,
        payment_date: new Date().toISOString().split('T')[0],
        party_name: workOrder.subcon_name,
        request_type: 'Advance against Subcon Work Order',
        amount: Number(prAmount),
        currency: 'INR',
        due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        notes: prRemarks,
        status: 'PENDING'
      };

      syncProjectPaymentRequestToFinance(
        { id: project.id, code: project.code, name: project.name, client_name: project.client_name },
        pr
      );

      onShowToast?.(`Payment request for ₹ ${Number(prAmount).toLocaleString()} submitted to Accounts`);
      setIsPaymentRequestModalOpen(false);
    } catch (e) {
      alert('Failed to submit payment request.');
    }
  };

  // Export / Print Work Order
  const handleExport = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      
      {/* Top Header Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left: Back & Info Cards */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors cursor-pointer"
            title="Back to Work Orders list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Vendor Card */}
          <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vendor</div>
              <div className="text-xs font-bold text-slate-900">{workOrder.subcon_name}</div>
            </div>
            <button
              type="button"
              onClick={() => setIsEditHeaderOpen(true)}
              className="p-1 text-slate-400 hover:text-indigo-600"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Work Order ID Card */}
          <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Work Order ID</div>
              <div className="text-xs font-bold text-slate-900">{workOrder.wo_number}</div>
            </div>
            <button
              type="button"
              onClick={() => setIsEditHeaderOpen(true)}
              className="p-1 text-slate-400 hover:text-indigo-600"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Work Order Date Card */}
          <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Work Order Date</div>
            <div className="text-xs font-bold text-slate-900">
              {new Date(workOrder.work_order_date || '2026-10-12').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Right: Metrics Cards */}
        <div className="flex items-center gap-2">
          {/* Order Value */}
          <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl min-w-[110px]">
            <div className="text-[10px] font-semibold text-slate-500">Order Value</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              ₹ {orderValue.toLocaleString()}
            </div>
          </div>

          {/* Work Done */}
          <div className="px-4 py-2.5 bg-emerald-50/60 border border-emerald-200 rounded-xl min-w-[110px]">
            <div className="text-[10px] font-semibold text-emerald-800">
              Work Done ({workOrder.work_completed_percent || 0}%)
            </div>
            <div className="text-sm font-bold text-emerald-900 mt-0.5">
              ₹ {(workOrder.work_completed_percent ? (orderValue * workOrder.work_completed_percent) / 100 : 0).toLocaleString()}
            </div>
          </div>

          {/* Billed */}
          <div className="px-4 py-2.5 bg-indigo-50/60 border border-indigo-200 rounded-xl min-w-[110px]">
            <div className="text-[10px] font-semibold text-indigo-800">Billed</div>
            <div className="text-sm font-bold text-indigo-950 mt-0.5">
              ₹ {billedValue.toLocaleString()}
            </div>
          </div>
        </div>

      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-2xl w-fit">
        {[
          { id: 'items', label: 'Items' },
          { id: 'milestones', label: 'Milestones' },
          { id: 'bills', label: 'Bills' },
          { id: 'materials', label: 'Materials' },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeSubTab === tab.id
                ? 'bg-[#5b52f9] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Toolbar: Search, Payment Request, Download, Add */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Payment Request button */}
          <button
            type="button"
            onClick={() => setIsPaymentRequestModalOpen(true)}
            className="px-3.5 py-1.5 border border-indigo-200 hover:bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600" />
            <span>Payment Request</span>
          </button>

          {/* Download button */}
          <button
            type="button"
            onClick={handleExport}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors cursor-pointer"
            title="Download / Print"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Contextual Action Button */}
          {activeSubTab === 'items' && (
            <button
              type="button"
              onClick={() => setIsAddItemModalOpen(true)}
              className="px-3.5 py-1.5 bg-[#5b52f9] hover:bg-[#4b42e0] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          )}

          {activeSubTab === 'milestones' && (
            <button
              type="button"
              onClick={() => setIsAddMilestoneModalOpen(true)}
              className="px-3.5 py-1.5 bg-[#5b52f9] hover:bg-[#4b42e0] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Milestone</span>
            </button>
          )}

          {activeSubTab === 'bills' && (
            <button
              type="button"
              onClick={() => setIsSelectItemsDrawerOpen(true)}
              className="px-3.5 py-1.5 bg-[#5b52f9] hover:bg-[#4b42e0] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Bill</span>
            </button>
          )}

          {activeSubTab === 'materials' && (
            <button
              type="button"
              onClick={() => setIsAddMaterialModalOpen(true)}
              className="px-3.5 py-1.5 bg-[#5b52f9] hover:bg-[#4b42e0] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Issue Material</span>
            </button>
          )}

        </div>

      </div>

      {/* SUB-TAB CONTENT 1: ITEMS */}
      {activeSubTab === 'items' && (
        <div className="space-y-4">
          
          {/* Items Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-3 px-4 w-12">S.No</th>
                    <th className="py-3 px-4">Item</th>
                    <th className="py-3 px-4 w-28 text-center">N x L x W x H</th>
                    <th className="py-3 px-4 text-right w-28">Unit rate (₹)</th>
                    <th className="py-3 px-4 text-center w-28">QTY</th>
                    <th className="py-3 px-4 text-center w-28">Progress</th>
                    <th className="py-3 px-4 text-center w-28">Billed Qty</th>
                    <th className="py-3 px-4 text-right w-28">Amount (₹)</th>
                    <th className="py-3 px-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        No line items added yet. Click <span className="font-bold text-indigo-600">+ Add Item</span> to add work items.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-slate-500 font-bold">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{item.item_name}</div>
                          {item.linked_task_name && (
                            <div className="text-[10px] text-indigo-600 font-medium mt-0.5">
                              Linked: {item.linked_task_name}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-500 font-medium">
                          {item.dimensions || '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-800">
                          {item.unit_rate.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-800 font-semibold">
                          {item.quantity} <span className="text-[11px] text-slate-500 font-normal">{item.unit}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setLinkingItem(item)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-[#5b52f9] border border-indigo-200 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            Link Task
                          </button>
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-slate-800">
                          {item.billed_quantity || 0} <span className="text-[11px] text-slate-500 font-normal">{item.unit}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          {item.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Breakdown & Bank Details Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Left: Bank Details */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Bank Details
                </h4>
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(true)}
                  className="text-[11px] font-bold text-[#5b52f9] hover:underline"
                >
                  Edit Details
                </button>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  Account Holder Name
                </div>
                <div className="font-semibold text-slate-800">
                  {workOrder.bank_details?.account_holder_name || 'NA'}
                </div>

                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide pt-1">
                  Account Number
                </div>
                <div className="font-semibold text-slate-800">
                  {workOrder.bank_details?.account_number || 'NA'}
                </div>

                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide pt-1">
                  IFSC / Branch
                </div>
                <div className="font-semibold text-slate-800">
                  {workOrder.bank_details?.ifsc_code || 'NA'}
                </div>

                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide pt-1">
                  Note
                </div>
                <div className="font-medium text-slate-500 italic">
                  {workOrder.bank_details?.notes || 'No remarks provided'}
                </div>
              </div>
            </div>

            {/* Right: Subtotal, GST, Additional Discount & Charges */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-medium">Item Sub Total</span>
                <span className="font-bold text-slate-900">₹ {itemSubtotal.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between text-slate-700">
                <span className="font-medium">GST</span>
                <span className="font-bold text-slate-900">₹ {workOrder.gst_amount || 0}</span>
              </div>

              <div className="flex items-center justify-between text-slate-700">
                <span className="font-medium">Additional Discount</span>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => handleSaveDiscountCharges(Number(e.target.value), charges)}
                  className="w-24 text-right p-1 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between text-slate-700">
                <span className="font-medium">Additional Charges</span>
                <input
                  type="number"
                  min="0"
                  value={charges}
                  onChange={(e) => handleSaveDiscountCharges(discount, Number(e.target.value))}
                  className="w-24 text-right p-1 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-sm font-bold text-indigo-900">
                <span>Final Order Value</span>
                <span>₹ {Math.max(0, itemSubtotal - discount + charges).toLocaleString()}</span>
              </div>
            </div>

          </div>

          {/* Bottom Status Tag */}
          <div className="flex items-center gap-2 pt-1">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>APPROVED</span>
            </span>
          </div>

        </div>
      )}

      {/* SUB-TAB CONTENT 2: MILESTONES */}
      {activeSubTab === 'milestones' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4 w-12">#</th>
                  <th className="py-3 px-4">Milestone Title</th>
                  <th className="py-3 px-4 w-32">Target Date</th>
                  <th className="py-3 px-4 text-center w-28">Weightage</th>
                  <th className="py-3 px-4 text-right w-32">Amount (₹)</th>
                  <th className="py-3 px-4 text-center w-28">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {milestones.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No milestones created yet. Click <span className="font-bold text-indigo-600">+ Add Milestone</span> to track deliverables.
                    </td>
                  </tr>
                ) : (
                  milestones.map((ms, idx) => (
                    <tr key={ms.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-500">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{ms.title}</td>
                      <td className="py-3.5 px-4 text-slate-600">{ms.target_date}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-indigo-700">
                        {ms.weightage_percent}%
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        ₹ {ms.amount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ms.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {ms.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB CONTENT 3: BILLS */}
      {activeSubTab === 'bills' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">Sub Contractor</th>
                  <th className="py-3 px-4 w-32">Invoice Date</th>
                  <th className="py-3 px-4 w-28">Bill #</th>
                  <th className="py-3 px-4 text-right w-32">Gross Amount (₹)</th>
                  <th className="py-3 px-4 text-right w-32">Net Payable (₹)</th>
                  <th className="py-3 px-4 text-center w-28">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {bills.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No RA bills or expenses recorded yet. Click <span className="font-bold text-indigo-600">+ Create Bill</span> to record contractor billing.
                    </td>
                  </tr>
                ) : (
                  bills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{bill.vendor_name}</td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {new Date(bill.invoice_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-indigo-700">{bill.bill_number}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        ₹ {bill.total_amount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                        ₹ {bill.net_amount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {bill.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB CONTENT 4: MATERIALS */}
      {activeSubTab === 'materials' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">Material Name</th>
                  <th className="py-3 px-4 text-center w-24">Unit</th>
                  <th className="py-3 px-4 text-center w-28">Issued Qty</th>
                  <th className="py-3 px-4 text-center w-28">Consumed Qty</th>
                  <th className="py-3 px-4 text-center w-28">Returned Qty</th>
                  <th className="py-3 px-4 w-32">Issue Date</th>
                  <th className="py-3 px-4 w-28">Challan #</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {materials.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No materials issued to this subcontractor yet. Click <span className="font-bold text-indigo-600">+ Issue Material</span> to log issues.
                    </td>
                  </tr>
                ) : (
                  materials.map((mat) => (
                    <tr key={mat.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{mat.material_name}</td>
                      <td className="py-3.5 px-4 text-center text-slate-600">{mat.unit}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-900">{mat.issued_qty}</td>
                      <td className="py-3.5 px-4 text-center text-slate-600">{mat.consumed_qty}</td>
                      <td className="py-3.5 px-4 text-center text-slate-600">{mat.returned_qty}</td>
                      <td className="py-3.5 px-4 text-slate-600">{mat.issue_date}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{mat.challan_no}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DRAWERS */}
      
      {/* 1. Select Work Order Items Drawer (Screenshot 4) */}
      <SelectWorkOrderItemsDrawer
        isOpen={isSelectItemsDrawerOpen}
        onClose={() => setIsSelectItemsDrawerOpen(false)}
        workOrder={workOrder}
        onNext={(selected) => {
          setSelectedItemsForBill(selected);
          setIsSelectItemsDrawerOpen(false);
          setIsExpenseDrawerOpen(true);
        }}
        onAddNewItemToWO={(createdItem) => {
          const updatedItems = [...items, createdItem];
          onUpdateWorkOrder({
            ...workOrder,
            items: updatedItems,
            contract_amount: updatedItems.reduce((sum, it) => sum + it.amount, 0)
          });
        }}
      />

      {/* 2. Subcontractor Expense Drawer (Screenshot 5) */}
      <SubcontractorExpenseDrawer
        isOpen={isExpenseDrawerOpen}
        onClose={() => setIsExpenseDrawerOpen(false)}
        workOrder={workOrder}
        selectedItems={selectedItemsForBill}
        onSaveBill={handleSaveBill}
      />

      {/* MODALS */}

      {/* Add Item to Work Order Modal */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Add Item to Work Order</h3>
              <button
                type="button"
                onClick={() => setIsAddItemModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Item Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Drilling Charges"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dimensions (N x L x W x H)</label>
                  <input
                    type="text"
                    placeholder="-"
                    value={newItemDimensions}
                    onChange={(e) => setNewItemDimensions(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    required
                    placeholder="RMT, nos, sqft"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit Rate (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newItemRate}
                    onChange={(e) => setNewItemRate(Number(e.target.value))}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(Number(e.target.value))}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#5b52f9] text-white text-xs font-bold rounded-xl hover:bg-[#4b42e0]"
                >
                  Add Line Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Milestone Modal */}
      {isAddMilestoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Add Milestone</h3>
              <button
                type="button"
                onClick={() => setIsAddMilestoneModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMilestone} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Milestone Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Drilling to 10m depth"
                  value={msTitle}
                  onChange={(e) => setMsTitle(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Date</label>
                  <input
                    type="date"
                    required
                    value={msDate}
                    onChange={(e) => setMsDate(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Weightage (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={msWeightage}
                    onChange={(e) => setMsWeightage(Number(e.target.value))}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Milestone Value (₹) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={msAmount}
                  onChange={(e) => setMsAmount(Number(e.target.value))}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddMilestoneModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#5b52f9] text-white text-xs font-bold rounded-xl hover:bg-[#4b42e0]"
                >
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Material Issue Modal */}
      {isAddMaterialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Issue Material to Subcontractor</h3>
              <button
                type="button"
                onClick={() => setIsAddMaterialModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMaterial} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Material Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bentonite Mud, PVC Pipes"
                  value={matName}
                  onChange={(e) => setMatName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Issued Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={matIssued}
                    onChange={(e) => setMatIssued(Number(e.target.value))}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    required
                    value={matUnit}
                    onChange={(e) => setMatUnit(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Challan / Gate Pass #</label>
                <input
                  type="text"
                  value={matChallan}
                  onChange={(e) => setMatChallan(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddMaterialModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#5b52f9] text-white text-xs font-bold rounded-xl hover:bg-[#4b42e0]"
                >
                  Confirm Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Request Modal */}
      {isPaymentRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm">Raise Payment Request</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentRequestModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePaymentRequest} className="space-y-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Payee / Subcontractor</div>
                <div className="font-bold text-slate-900">{workOrder.subcon_name}</div>
                <div className="text-[11px] text-slate-500">WO Number: {workOrder.wo_number}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Requested Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={prAmount}
                  onChange={(e) => setPrAmount(Number(e.target.value))}
                  className="w-full text-sm font-bold p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks / Justification</label>
                <textarea
                  rows={2}
                  value={prRemarks}
                  onChange={(e) => setPrRemarks(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentRequestModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#5b52f9] text-white text-xs font-bold rounded-xl hover:bg-[#4b42e0]"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Header Details Modal */}
      {isEditHeaderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Edit Work Order Header</h3>
              <button
                type="button"
                onClick={() => setIsEditHeaderOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveHeader} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor / Subcontractor</label>
                <input
                  type="text"
                  required
                  value={headerVendor}
                  onChange={(e) => setHeaderVendor(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Work Order ID</label>
                <input
                  type="text"
                  required
                  value={headerWoNo}
                  onChange={(e) => setHeaderWoNo(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Work Order Date</label>
                <input
                  type="date"
                  required
                  value={headerDate}
                  onChange={(e) => setHeaderDate(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditHeaderOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#5b52f9] text-white text-xs font-bold rounded-xl hover:bg-[#4b42e0]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Bank Details Modal */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Update Bank Details</h3>
              <button
                type="button"
                onClick={() => setIsBankModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBank} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Holder Name</label>
                <input
                  type="text"
                  value={bankAccHolder}
                  onChange={(e) => setBankAccHolder(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number</label>
                <input
                  type="text"
                  value={bankAccNumber}
                  onChange={(e) => setBankAccNumber(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC / Branch</label>
                <input
                  type="text"
                  value={bankIfsc}
                  onChange={(e) => setBankIfsc(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={bankNotes}
                  onChange={(e) => setBankNotes(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#5b52f9] text-white text-xs font-bold rounded-xl hover:bg-[#4b42e0]"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Task Modal */}
      {linkingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm">Link Item to Project Task</h3>
              </div>
              <button
                type="button"
                onClick={() => setLinkingItem(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-3">
              <p>Link <strong>{linkingItem.item_name}</strong> to site execution tasks to automatically track physical progress:</p>
              
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {[
                  'Borehole Drilling 10m - Rig 1',
                  'SPT Sample Collection & Soil Logging',
                  'Foundation Piling & Grouting',
                  'Earthwork & Excavation Phase 1'
                ].map((taskName, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const updatedItems = items.map(it => 
                        it.id === linkingItem.id 
                          ? { ...it, linked_task_id: `task-${idx}`, linked_task_name: taskName }
                          : it
                      );
                      onUpdateWorkOrder({ ...workOrder, items: updatedItems });
                      setLinkingItem(null);
                      onShowToast?.(`Item linked to "${taskName}"`);
                    }}
                    className="w-full text-left p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-colors font-medium text-slate-800"
                  >
                    {taskName}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setLinkingItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
