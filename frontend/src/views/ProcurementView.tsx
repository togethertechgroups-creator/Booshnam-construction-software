import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart, ArrowRight, CheckCircle2, ShieldCheck,
  PackageCheck, FileText, AlertTriangle, Layers, Plus,
  DollarSign, Check, X, Download, Printer, Filter, Eye,
  Edit3, Trash2, Clock, Building2, Truck, RefreshCw,
  ChevronRight, Award, Search, UserCheck, AlertCircle,
  Info, Calendar, ExternalLink, ClipboardList, CheckSquare
} from 'lucide-react';
import {
  getProcurementState,
  checkStockAvailability,
  createMaterialRequest,
  updateMaterialRequestStatus,
  deleteMaterialRequest,
  createPurchaseRequestFromMR,
  updatePurchaseRequestStatus,
  editPurchaseRequest,
  createRFQFromPR,
  selectVendorAndCreatePO,
  updatePurchaseOrderStatus,
  createGRNReceipt,
  processInvoicePayment,
  getProcurementMetrics,
  MaterialRequestRecord,
  PurchaseRequestRecord,
  RFQComparisonRecord,
  PurchaseOrderRecord,
  GRNRecord,
  PurchaseInvoiceRecord,
  SiteStockRecord,
  ProcurementAuditLog,
  MRStatus,
  PRStatus,
  POStatus,
  PriorityLevel,
  ProcurementState,
} from '../lib/procurementService';
import { downloadPurchaseOrderPDF } from '../lib/purchaseOrderExportService';
import { getTermsConditions } from '../lib/termsService';
import { UserProfileDropdown } from '../components/UserProfileDropdown';

export interface ProcurementViewProps {
  // Legacy / fallback props
  materialRequests?: any[];
  purchaseOrders?: any[];
  grns?: any[];
  invoices?: any[];
  stockItems?: any[];
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  initialTab?: string;
  // App context props
  projects?: Array<{ id: string; name: string }>;
  selectedProject?: { id: string; name: string } | null;
  onSelectProject?: (proj: any) => void;
  activeRole?: any;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ProcurementView: React.FC<ProcurementViewProps> = ({
  projects = [],
  selectedProject,
  activeRole: parentRole = 'Procurement Officer',
  onShowToast,
}) => {
  // ── Procurement Data State ──
  const [procState, setProcState] = useState<ProcurementState>(() => getProcurementState());

  // Listen for storage / custom updates
  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail) setProcState(e.detail);
      else setProcState(getProcurementState());
    };
    window.addEventListener('booshnam_procurement_updated', handleUpdate);
    return () => window.removeEventListener('booshnam_procurement_updated', handleUpdate);
  }, []);

  const toast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (onShowToast) onShowToast(msg, type);
  };

  // ── Navigation & Role State ──
  const [activeTab, setActiveTab] = useState<
    'flow' | 'mr' | 'pr' | 'rfq' | 'po' | 'grn' | 'invoices' | 'stock' | 'audit'
  >('flow');

  // Role Switcher for seamless verification across user types
  const [simulatedRole, setSimulatedRole] = useState<
    'Site Engineer' | 'Procurement Officer' | 'Project Manager' | 'Storekeeper' | 'Accounts'
  >(() => {
    if (parentRole?.toLowerCase().includes('engineer') || parentRole?.toLowerCase().includes('supervisor')) return 'Site Engineer';
    if (parentRole?.toLowerCase().includes('store') || parentRole?.toLowerCase().includes('inventory')) return 'Storekeeper';
    if (parentRole?.toLowerCase().includes('account') || parentRole?.toLowerCase().includes('finance')) return 'Accounts';
    if (parentRole?.toLowerCase().includes('manager') || parentRole?.toLowerCase().includes('admin')) return 'Project Manager';
    return 'Procurement Officer';
  });

  const [selectedProjectName, setSelectedProjectName] = useState<string>(
    selectedProject?.name || 'All Sites'
  );
  const [searchTerm, setSearchTerm] = useState<string>('');

  // ── Modal States ──
  const [showMRModal, setShowMRModal] = useState<boolean>(false);
  const [showPRModal, setShowPRModal] = useState<boolean>(false);
  const [showEditPRModal, setShowEditPRModal] = useState<boolean>(false);
  const [showRFQModal, setShowRFQModal] = useState<boolean>(false);
  const [showPODetailModal, setShowPODetailModal] = useState<boolean>(false);
  const [showGRNModal, setShowGRNModal] = useState<boolean>(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);

  // Selected item references for drawers/modals
  const [selectedMR, setSelectedMR] = useState<MaterialRequestRecord | null>(null);
  const [selectedPR, setSelectedPR] = useState<PurchaseRequestRecord | null>(null);
  const [selectedRFQ, setSelectedRFQ] = useState<RFQComparisonRecord | null>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrderRecord | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoiceRecord | null>(null);

  // ── New Material Request Form State ──
  const [mrForm, setMrForm] = useState({
    project_name: selectedProject?.name || 'Villa Complex Phase 1',
    requested_by: 'Karthik (Site Engineer)',
    material_category: 'Cement',
    material_name: '53 Grade OPC Cement',
    material_specification: 'IS:12269 certified, 50kg moisture-proof HDPE bags',
    required_quantity: 100,
    unit: 'Bags',
    required_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    priority: 'HIGH' as PriorityLevel,
    purpose: '2nd Floor Column and beam casting',
    remarks: 'Concrete vibrator team available on scheduled date.',
    attachment_name: 'structural_dwg_rev2.pdf',
    status: 'SUBMITTED' as MRStatus,
  });

  // Live stock check for MR form
  const liveStockCheck = useMemo(() => {
    return checkStockAvailability(mrForm.material_name, mrForm.project_name);
  }, [mrForm.material_name, mrForm.project_name]);

  const liveShortage = Math.max(0, Number(mrForm.required_quantity) - liveStockCheck.availableStock);

  // ── New PR Form State ──
  const [prForm, setPrForm] = useState({
    procurement_person: 'Vijay (Procurement Officer)',
    remarks: '',
  });

  // ── Edit PR Form State ──
  const [editPRForm, setEditPRForm] = useState({
    required_quantity: 0,
    available_stock: 0,
    required_date: '',
    priority: 'NORMAL' as PriorityLevel,
    remarks: '',
  });

  // ── New GRN Form State ──
  const [grnForm, setGrnForm] = useState({
    po_number: '',
    challan_number: 'DC-' + Math.floor(10000 + Math.random() * 90000),
    vehicle_number: 'TN-05-AB-7788',
    received_by: 'Murugan (Storekeeper)',
    received_quantity: 0,
    accepted_quantity: 0,
    rejected_quantity: 0,
    inspection_notes: 'Visual inspection done. Material verified against delivery challan & specs.',
  });

  // ── Payment Form State ──
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    mode: 'NEFT / Direct Bank Transfer',
    ref_number: 'UTR-' + Date.now().toString().slice(-8),
  });

  // ── Filter Data by Project and Search ──
  const filterByProject = <T extends { project_name?: string }>(items: T[]): T[] => {
    if (!selectedProjectName || selectedProjectName === 'All Sites') return items;
    return items.filter(
      (item) => (item.project_name || '').toLowerCase() === selectedProjectName.toLowerCase()
    );
  };

  const filteredMRs = useMemo(() => {
    return filterByProject(procState.materialRequests).filter(
      (m) =>
        m.request_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.material_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.requested_by.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [procState.materialRequests, selectedProjectName, searchTerm]);

  const filteredPRs = useMemo(() => {
    return filterByProject(procState.purchaseRequests).filter(
      (p) =>
        p.pr_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.material.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.mr_reference.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [procState.purchaseRequests, selectedProjectName, searchTerm]);

  const filteredRFQs = useMemo(() => {
    return filterByProject(procState.rfqs).filter(
      (r) =>
        r.rfq_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.material_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [procState.rfqs, selectedProjectName, searchTerm]);

  const filteredPOs = useMemo(() => {
    return filterByProject(procState.purchaseOrders).filter(
      (p) =>
        p.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.project_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [procState.purchaseOrders, selectedProjectName, searchTerm]);

  const filteredGRNs = useMemo(() => {
    return filterByProject(procState.grns).filter(
      (g) =>
        g.grn_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.vendor_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [procState.grns, selectedProjectName, searchTerm]);

  const filteredInvoices = useMemo(() => {
    return filterByProject(procState.invoices).filter(
      (i) =>
        i.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.po_number.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [procState.invoices, selectedProjectName, searchTerm]);

  const filteredStock = useMemo(() => {
    return filterByProject(procState.stockItems).filter(
      (s) =>
        s.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [procState.stockItems, selectedProjectName, searchTerm]);

  const filteredAudit = useMemo(() => {
    return procState.auditLogs.filter(
      (l) =>
        l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.document_ref || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [procState.auditLogs, searchTerm]);

  // Summary Metrics & Notifications
  const metrics = useMemo(() => {
    return getProcurementMetrics(procState, selectedProjectName);
  }, [procState, selectedProjectName]);

  // Project List Options
  const projectListOptions = useMemo(() => {
    const names = new Set<string>();
    projects.forEach((p) => names.add(p.name));
    procState.materialRequests.forEach((m) => names.add(m.project_name));
    procState.purchaseOrders.forEach((p) => names.add(p.project_name));
    return ['All Sites', ...Array.from(names)];
  }, [projects, procState]);

  // ── Actions ──
  const handleSaveMR = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mrForm.material_name || !mrForm.required_quantity) {
      toast('Please enter material name and required quantity', 'error');
      return;
    }
    const created = createMaterialRequest({
      project_id: projects.find((p) => p.name === mrForm.project_name)?.id || 'p-1',
      project_name: mrForm.project_name,
      requested_by: mrForm.requested_by,
      material_category: mrForm.material_category,
      material_name: mrForm.material_name,
      material_specification: mrForm.material_specification,
      required_quantity: Number(mrForm.required_quantity),
      unit: mrForm.unit,
      required_date: mrForm.required_date,
      priority: mrForm.priority,
      purpose: mrForm.purpose,
      remarks: mrForm.remarks,
      attachment_name: mrForm.attachment_name,
      status: mrForm.status,
    });
    setProcState(getProcurementState());
    setShowMRModal(false);
    toast(`Material Request ${created.request_number} created successfully! Available stock checked.`);
  };

  const handleCreatePRFromMR = (mr: MaterialRequestRecord) => {
    setSelectedMR(mr);
    setPrForm({
      procurement_person: simulatedRole === 'Procurement Officer' ? 'Vijay (Procurement Officer)' : 'Procurement Team',
      remarks: `Purchase Request generated for ${mr.material_name}. Shortage: ${mr.shortage_quantity} ${mr.unit}.`,
    });
    setShowPRModal(true);
  };

  const handleConfirmCreatePR = () => {
    if (!selectedMR) return;
    try {
      const created = createPurchaseRequestFromMR(
        selectedMR.id,
        prForm.procurement_person,
        simulatedRole
      );
      setProcState(getProcurementState());
      setShowPRModal(false);
      toast(`Purchase Request ${created.pr_number} created! Shortage quantity calculated.`);
      setActiveTab('pr');
    } catch (err: any) {
      toast(err.message || 'Error creating PR', 'error');
    }
  };

  const handleOpenEditPR = (pr: PurchaseRequestRecord) => {
    setSelectedPR(pr);
    setEditPRForm({
      required_quantity: pr.required_quantity,
      available_stock: pr.available_stock,
      required_date: pr.required_date,
      priority: pr.priority,
      remarks: pr.remarks,
    });
    setShowEditPRModal(true);
  };

  const handleSaveEditPR = () => {
    if (!selectedPR) return;
    editPurchaseRequest(
      selectedPR.id,
      {
        required_quantity: Number(editPRForm.required_quantity),
        available_stock: Number(editPRForm.available_stock),
        required_date: editPRForm.required_date,
        priority: editPRForm.priority,
        remarks: editPRForm.remarks,
      },
      'Vijay (Procurement)',
      simulatedRole
    );
    setProcState(getProcurementState());
    setShowEditPRModal(false);
    toast(`Purchase Request ${selectedPR.pr_number} updated with recalculated shortage quantity!`);
  };

  const handleCreateRFQ = (pr: PurchaseRequestRecord) => {
    if (pr.status !== 'APPROVED') {
      toast('Rule Enforced: PR must be APPROVED before dispatching RFQ to vendors!', 'error');
      return;
    }
    const rfq = createRFQFromPR(pr.id, 'Vijay (Procurement Officer)');
    setProcState(getProcurementState());
    setSelectedRFQ(rfq);
    setShowRFQModal(true);
    toast(`RFQ ${rfq.rfq_number} dispatched to 3 vendors!`);
    setActiveTab('rfq');
  };

  const handleSelectVendorAndMakePO = (rfqId: string, vendorId: string) => {
    try {
      const po = selectVendorAndCreatePO(
        rfqId,
        vendorId,
        'Vijay (Procurement Officer)',
        `Site Yard, ${selectedProjectName === 'All Sites' ? 'Villa Complex' : selectedProjectName}, Chennai`
      );
      setProcState(getProcurementState());
      setShowRFQModal(false);
      setSelectedPO(po);
      setShowPODetailModal(true);
      toast(`Purchase Order ${po.po_number} successfully generated! Ready for download.`);
      setActiveTab('po');
    } catch (err: any) {
      toast(err.message || 'Error generating PO', 'error');
    }
  };

  const handleOpenGRNModal = (po: PurchaseOrderRecord) => {
    setSelectedPO(po);
    const item = po.items[0];
    const ordered = item ? item.quantity : 100;
    setGrnForm({
      po_number: po.po_number,
      challan_number: 'DC-' + Math.floor(10000 + Math.random() * 90000),
      vehicle_number: 'TN-05-CD-' + Math.floor(1000 + Math.random() * 9000),
      received_by: 'Murugan (Storekeeper)',
      received_quantity: ordered,
      accepted_quantity: ordered,
      rejected_quantity: 0,
      inspection_notes: `Inspected ${item?.material_name || 'Material'}. Delivery in good condition, standard conformity checked.`,
    });
    setShowGRNModal(true);
  };

  const handleSaveGRN = () => {
    if (!grnForm.po_number || grnForm.received_quantity <= 0) {
      toast('Please enter valid received and accepted quantities', 'error');
      return;
    }
    try {
      const grn = createGRNReceipt({
        po_number: grnForm.po_number,
        challan_number: grnForm.challan_number,
        vehicle_number: grnForm.vehicle_number,
        received_by: grnForm.received_by,
        received_quantity: Number(grnForm.received_quantity),
        accepted_quantity: Number(grnForm.accepted_quantity),
        rejected_quantity: Number(grnForm.rejected_quantity),
        inspection_notes: grnForm.inspection_notes,
      });
      setProcState(getProcurementState());
      setShowGRNModal(false);
      toast(`GRN ${grn.grn_number} created! Exactly ${grn.accepted_quantity} ${grn.unit} added to site inventory.`);
      setActiveTab('grn');
    } catch (err: any) {
      toast(err.message || 'Error recording GRN', 'error');
    }
  };

  const handleProcessPayment = () => {
    if (!selectedInvoice || paymentForm.amount <= 0) {
      toast('Enter a valid payment amount', 'error');
      return;
    }
    processInvoicePayment(
      selectedInvoice.id,
      Number(paymentForm.amount),
      'Priya (Accounts Officer)'
    );
    setProcState(getProcurementState());
    setShowPaymentModal(false);
    toast(`Payment of ₹${Number(paymentForm.amount).toLocaleString('en-IN')} processed successfully!`);
    setActiveTab('invoices');
  };

  // Helper for priority badges
  const renderPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case 'URGENT':
        return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">URGENT</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">HIGH</span>;
      case 'NORMAL':
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full">NORMAL</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full">LOW</span>;
    }
  };

  // Helper for status badges
  const renderStatusBadge = (status: string) => {
    const s = status?.toUpperCase() || '';
    if (s === 'APPROVED' || s === 'FULLY_RECEIVED' || s === 'MATCHED' || s === 'PAID' || s === 'STOCK_UPDATED') {
      return <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full flex items-center gap-1 w-max"><CheckCircle2 className="w-3 h-3" />{status}</span>;
    }
    if (s === 'SUBMITTED' || s === 'UNDER_REVIEW' || s === 'SUBMITTED_FOR_APPROVAL' || s === 'PENDING_APPROVAL' || s === 'SENT_TO_VENDOR' || s === 'PARTIALLY_RECEIVED' || s === 'PARTIALLY_PAID') {
      return <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full flex items-center gap-1 w-max"><Clock className="w-3 h-3" />{status}</span>;
    }
    if (s === 'REJECTED' || s === 'CANCELLED' || s === 'DEFECTS_NOTED' || s === 'DISCREPANCY') {
      return <span className="px-2.5 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded-full flex items-center gap-1 w-max"><AlertTriangle className="w-3 h-3" />{status}</span>;
    }
    return <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full flex items-center gap-1 w-max">{status}</span>;
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 min-h-screen">
      {/* ── Top Header with Brand, Role Switcher, & Project Filter ── */}
      <div className="px-6 py-4 bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-red-600 text-white text-[11px] font-bold tracking-wider rounded">
                SUPPLY CHAIN
              </span>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Procurement & Material Operations
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              End-to-End Governance: Site Material Request → Stock Check → PR → RFQ → PO → GRN Inspection → 3-Way Match & Pay.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Project / Site Selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <label htmlFor="procurement-site-filter" className="text-xs font-medium text-slate-500">Site:</label>
              <select
                id="procurement-site-filter"
                aria-label="Filter procurement records by site"
                value={selectedProjectName}
                onChange={(e) => setSelectedProjectName(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                {projectListOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Role Switcher Toolbar */}
            <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-200">
              <span className="text-[10px] font-bold text-red-700 px-1.5 flex items-center gap-1">
                <UserCheck className="w-3 h-3" /> Role:
              </span>
              {(['Site Engineer', 'Procurement Officer', 'Project Manager', 'Storekeeper', 'Accounts'] as const).map(
                (role) => (
                  <button
                    key={role}
                    onClick={() => {
                      setSimulatedRole(role);
                      toast(`Switched perspective to ${role}`);
                    }}
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition-all cursor-pointer ${
                      simulatedRole === role
                        ? 'bg-red-600 text-white shadow-sm font-bold'
                        : 'text-red-900 hover:bg-red-100/70'
                    }`}
                  >
                    {role}
                  </button>
                )
              )}
            </div>

            <UserProfileDropdown showBell={true} />
          </div>
        </div>

        {/* ── System Notifications & Attention Bar ── */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-red-500" /> Actions Pending:
            </span>
            {metrics.pendingMRApprovals > 0 && (
              <button
                onClick={() => setActiveTab('mr')}
                className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md font-medium cursor-pointer"
              >
                {metrics.pendingMRApprovals} MRs Need Review
              </button>
            )}
            {metrics.pendingPRApprovals > 0 && (
              <button
                onClick={() => setActiveTab('pr')}
                className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-md font-medium cursor-pointer"
              >
                {metrics.pendingPRApprovals} PRs Awaiting Approval
              </button>
            )}
            {metrics.deliveriesExpected > 0 && (
              <button
                onClick={() => setActiveTab('po')}
                className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-md font-medium cursor-pointer"
              >
                {metrics.deliveriesExpected} POs In Transit
              </button>
            )}
            {metrics.lowStockCount > 0 && (
              <button
                onClick={() => setActiveTab('stock')}
                className="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-md font-medium cursor-pointer"
              >
                {metrics.lowStockCount} Items Low Stock
              </button>
            )}
            {metrics.outstandingPayables > 0 && (
              <button
                onClick={() => setActiveTab('invoices')}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-md font-medium cursor-pointer"
              >
                Payables: ₹{metrics.outstandingPayables.toLocaleString('en-IN')}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Active Scope: <strong>{selectedProjectName}</strong>
            </span>
          </div>
        </div>

        {/* ── Sub-navigation Horizontal Row ── */}
        <div className="mt-4 flex items-center justify-between gap-4 overflow-x-auto pb-1">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold whitespace-nowrap">
            <button
              onClick={() => setActiveTab('flow')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'flow'
                  ? 'bg-red-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7-Step Workflow
            </button>
            <button
              onClick={() => setActiveTab('mr')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'mr'
                  ? 'bg-red-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. Material Requests ({metrics.mrsCount})
            </button>
            <button
              onClick={() => setActiveTab('pr')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'pr'
                  ? 'bg-red-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. Purchase Requests ({metrics.prsCount})
            </button>
            <button
              onClick={() => setActiveTab('rfq')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'rfq'
                  ? 'bg-red-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              3. Vendor RFQ & Quotes
            </button>
            <button
              onClick={() => setActiveTab('po')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'po'
                  ? 'bg-red-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              4. Purchase Orders ({metrics.posCount})
            </button>
            <button
              onClick={() => setActiveTab('grn')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'grn'
                  ? 'bg-red-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              5. Site GRN ({metrics.grnsCount})
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'invoices'
                  ? 'bg-red-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              6. 3-Way Match & Pay ({metrics.invoicesCount})
            </button>
            <button
              onClick={() => setActiveTab('stock')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'stock'
                  ? 'bg-red-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7. Site Yard Stock ({metrics.stockCount})
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-red-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Audit Trail
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search ref #, material, vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-red-500"
            />
          </div>
        </div>
      </div>

      {/* ── Main Tab Contents ── */}
      <div className="p-6 space-y-6 flex-1">
        {/* TAB 1: 7-STEP VISUAL WORKFLOW */}
        {activeTab === 'flow' && (
          <div className="space-y-6">
            {/* Visual Process Pipeline */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Booshnam Procurement Lifecycle Flow
                  </h2>
                  <p className="text-xs text-slate-500">
                    Mandatory multi-tier verification loop connecting site requirements directly to material deliveries and verified ledger payouts.
                  </p>
                </div>
                <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                  Current Role: {simulatedRole}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-7 gap-3 text-center text-xs">
                {/* Step 1: Material Request */}
                <div
                  onClick={() => setActiveTab('mr')}
                  className="bg-white border-2 border-red-200 hover:border-red-500 p-4 rounded-xl cursor-pointer transition-all hover:shadow-md"
                >
                  <div className="text-[10px] font-bold text-red-600 uppercase">Step 1</div>
                  <div className="font-bold text-slate-900 mt-1">Material Request</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Site Engineer creates MR with specs</div>
                  <div className="mt-3 inline-block px-2 py-0.5 bg-red-50 text-red-700 font-bold rounded text-[10px]">
                    {metrics.mrsCount} Requests
                  </div>
                </div>

                {/* Step 2: Stock Check */}
                <div
                  onClick={() => setActiveTab('stock')}
                  className="bg-white border-2 border-slate-200 hover:border-red-400 p-4 rounded-xl cursor-pointer transition-all hover:shadow-md"
                >
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Step 2</div>
                  <div className="font-bold text-slate-900 mt-1">Stock Check</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Auto-checks yard balance before buy</div>
                  <div className="mt-3 inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded text-[10px]">
                    Shortage Calculation
                  </div>
                </div>

                {/* Step 3: Purchase Request */}
                <div
                  onClick={() => setActiveTab('pr')}
                  className="bg-white border-2 border-purple-200 hover:border-purple-500 p-4 rounded-xl cursor-pointer transition-all hover:shadow-md"
                >
                  <div className="text-[10px] font-bold text-purple-600 uppercase">Step 3</div>
                  <div className="font-bold text-slate-900 mt-1">Purchase Request</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Approved PR required for RFQ</div>
                  <div className="mt-3 inline-block px-2 py-0.5 bg-purple-50 text-purple-700 font-bold rounded text-[10px]">
                    {metrics.prsCount} PRs
                  </div>
                </div>

                {/* Step 4: RFQ & Comparison */}
                <div
                  onClick={() => setActiveTab('rfq')}
                  className="bg-white border-2 border-blue-200 hover:border-blue-500 p-4 rounded-xl cursor-pointer transition-all hover:shadow-md"
                >
                  <div className="text-[10px] font-bold text-blue-600 uppercase">Step 4</div>
                  <div className="font-bold text-slate-900 mt-1">RFQ & Quotes</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Multi-vendor price & tax matrix</div>
                  <div className="mt-3 inline-block px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded text-[10px]">
                    L1 Award Engine
                  </div>
                </div>

                {/* Step 5: Purchase Order */}
                <div
                  onClick={() => setActiveTab('po')}
                  className="bg-white border-2 border-amber-200 hover:border-amber-500 p-4 rounded-xl cursor-pointer transition-all hover:shadow-md"
                >
                  <div className="text-[10px] font-bold text-amber-600 uppercase">Step 5</div>
                  <div className="font-bold text-slate-900 mt-1">Purchase Order</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Official contract & PDF generation</div>
                  <div className="mt-3 inline-block px-2 py-0.5 bg-amber-50 text-amber-700 font-bold rounded text-[10px]">
                    {metrics.posCount} POs
                  </div>
                </div>

                {/* Step 6: Site GRN Receipt */}
                <div
                  onClick={() => setActiveTab('grn')}
                  className="bg-white border-2 border-emerald-200 hover:border-emerald-500 p-4 rounded-xl cursor-pointer transition-all hover:shadow-md"
                >
                  <div className="text-[10px] font-bold text-emerald-600 uppercase">Step 6</div>
                  <div className="font-bold text-slate-900 mt-1">GRN Inspection</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Only accepted qty enters yard stock</div>
                  <div className="mt-3 inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded text-[10px]">
                    {metrics.grnsCount} GRNs
                  </div>
                </div>

                {/* Step 7: 3-Way Match & Pay */}
                <div
                  onClick={() => setActiveTab('invoices')}
                  className="bg-white border-2 border-rose-200 hover:border-rose-500 p-4 rounded-xl cursor-pointer transition-all hover:shadow-md"
                >
                  <div className="text-[10px] font-bold text-rose-600 uppercase">Step 7</div>
                  <div className="font-bold text-slate-900 mt-1">3-Way Match & Pay</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">PO == GRN == Invoice verification</div>
                  <div className="mt-3 inline-block px-2 py-0.5 bg-rose-50 text-rose-700 font-bold rounded text-[10px]">
                    ₹{metrics.totalInvoiceAmount.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Cards Based on Role */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Site Engineer Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">Site Operations</span>
                    <span className="text-[11px] text-slate-400">Site Engineer / Supervisor</span>
                  </div>
                  <h3 className="font-bold text-slate-900 mt-2">Material Requirement & Indent</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Raise an indent for required site materials. Live stock availability will instantly calculate shortage.
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">{metrics.mrsCount} active indents</span>
                  <button
                    onClick={() => {
                      setMrForm({
                        ...mrForm,
                        project_name: selectedProjectName === 'All Sites' ? 'Villa Complex Phase 1' : selectedProjectName,
                      });
                      setShowMRModal(true);
                    }}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Raise Material Request
                  </button>
                </div>
              </div>

              {/* Procurement Officer Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">Procurement</span>
                    <span className="text-[11px] text-slate-400">Procurement Officer</span>
                  </div>
                  <h3 className="font-bold text-slate-900 mt-2">PR, RFQ & Vendor Quotations</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Convert approved indents to Purchase Requests, float RFQs to certified vendors, and select best rates.
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">{metrics.prsCount} PRs in queue</span>
                  <button
                    onClick={() => setActiveTab('pr')}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    Review PRs & RFQs <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Storekeeper & Accounts Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Yard & Accounts</span>
                    <span className="text-[11px] text-slate-400">Storekeeper & Finance</span>
                  </div>
                  <h3 className="font-bold text-slate-900 mt-2">Delivery Inspection & 3-Way Audit</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Record physical delivery, log quality rejections, update site inventory, and authorize vendor payout.
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">{metrics.grnsCount} GRNs certified</span>
                  <button
                    onClick={() => setActiveTab('grn')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    Open GRN Register <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 3-Way Match Verification Preview */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    3-Way Matching Engine (Rule: PO == GRN == Purchase Invoice)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Guarantees zero payment leakage by validating ordered quantity, accepted goods, and billed invoice.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('invoices')}
                  className="text-xs text-red-600 font-bold hover:underline"
                >
                  View All Verified Invoices →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {filteredInvoices.slice(0, 1).map((inv) => (
                  <React.Fragment key={inv.id}>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>1. Purchase Order</span>
                        <span className="font-mono text-red-600">{inv.po_number}</span>
                      </div>
                      <div className="text-slate-600 space-y-1 pt-1 border-t border-slate-200 text-[11px]">
                        <div>Vendor: <strong>{inv.vendor_name}</strong></div>
                        <div>Project: <strong>{inv.project_name}</strong></div>
                        <div>Gross Value: <strong>₹{inv.total_amount.toLocaleString('en-IN')}</strong></div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>2. Goods Receipt Note</span>
                        <span className="font-mono text-emerald-600">{inv.grn_number || 'GRN Linked'}</span>
                      </div>
                      <div className="text-slate-600 space-y-1 pt-1 border-t border-slate-200 text-[11px]">
                        <div>Delivery: <strong>Verified by Storekeeper</strong></div>
                        <div>Quality Check: <strong>Passed IS Specification</strong></div>
                        <div className="text-emerald-700 font-bold">Inventory: Updated by Accepted Qty</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>3. Vendor Invoice</span>
                        <span className="font-mono text-slate-900">{inv.invoice_number}</span>
                      </div>
                      <div className="text-slate-600 space-y-1 pt-1 border-t border-slate-200 text-[11px]">
                        <div>Billed Amount: <strong>₹{inv.total_amount.toLocaleString('en-IN')}</strong></div>
                        <div>Payment Status: <strong>{inv.payment_status}</strong></div>
                        <div className="text-emerald-700 font-bold">Match Result: 100% Certified</div>
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MATERIAL REQUESTS (MR) */}
        {activeTab === 'mr' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">Material Requests (MR) Register</h2>
                  <span className="px-2 py-0.5 bg-red-50 text-red-700 text-xs font-bold rounded-full">
                    Site Indent
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Site Engineer / Supervisor raises requests with project, category, specs, and live stock shortage checks.
                </p>
              </div>

              <button
                onClick={() => {
                  setMrForm({
                    ...mrForm,
                    project_name: selectedProjectName === 'All Sites' ? 'Villa Complex Phase 1' : selectedProjectName,
                  });
                  setShowMRModal(true);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Create Material Request</span>
              </button>
            </div>

            {/* MR Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Request #</th>
                    <th className="py-3 px-4">Project / Site</th>
                    <th className="py-3 px-4">Material Details</th>
                    <th className="py-3 px-4 text-center">Req. Qty</th>
                    <th className="py-3 px-4 text-center">Stock</th>
                    <th className="py-3 px-4 text-center">Shortage</th>
                    <th className="py-3 px-4">Required Date</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredMRs.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        No Material Requests found matching criteria. Click "+ Create Material Request" to raise one.
                      </td>
                    </tr>
                  ) : (
                    filteredMRs.map((mr) => (
                      <tr key={mr.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {mr.request_number}
                          <div className="text-[10px] text-slate-400 font-normal">{mr.request_date}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{mr.project_name}</div>
                          <div className="text-[10px] text-slate-500">By: {mr.requested_by}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{mr.material_name}</div>
                          <div className="text-[10px] text-slate-500 max-w-xs truncate">{mr.material_specification}</div>
                          <div className="text-[10px] text-slate-400">Cat: {mr.material_category}</div>
                        </td>
                        <td className="py-3 px-4 text-center font-bold font-mono">
                          {mr.required_quantity} {mr.unit}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-500">
                          {mr.available_stock_snapshot} {mr.unit}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-red-600">
                          {mr.shortage_quantity} {mr.unit}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{mr.required_date}</td>
                        <td className="py-3 px-4">{renderPriorityBadge(mr.priority)}</td>
                        <td className="py-3 px-4">{renderStatusBadge(mr.status)}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Action: Convert to PR if submitted or approved and no PR linked yet */}
                            {!mr.linked_pr_number && (mr.status === 'SUBMITTED' || mr.status === 'APPROVED' || mr.status === 'UNDER_REVIEW') && (
                              <button
                                onClick={() => handleCreatePRFromMR(mr)}
                                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded text-xs font-bold transition-colors cursor-pointer"
                                title="Generate Purchase Request with calculated shortage"
                              >
                                Create PR →
                              </button>
                            )}

                            {/* View PR link if already created */}
                            {mr.linked_pr_number && (
                              <span className="font-mono text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-bold">
                                {mr.linked_pr_number}
                              </span>
                            )}

                            {/* Status controls */}
                            {mr.status === 'SUBMITTED' && (
                              <button
                                onClick={() => {
                                  updateMaterialRequestStatus(mr.id, 'APPROVED', 'Project Manager', simulatedRole);
                                  setProcState(getProcurementState());
                                  toast(`MR ${mr.request_number} Approved! Ready for PR.`);
                                }}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                                title="Approve MR"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}

                            {mr.status !== 'APPROVED' && mr.status !== 'CANCELLED' && (
                              <button
                                onClick={() => {
                                  updateMaterialRequestStatus(mr.id, 'CANCELLED', 'User', simulatedRole);
                                  setProcState(getProcurementState());
                                  toast(`MR ${mr.request_number} marked as Cancelled`);
                                }}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                                title="Cancel MR"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PURCHASE REQUESTS (PR) */}
        {activeTab === 'pr' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">Purchase Requests (PR)</h2>
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs font-bold rounded-full">
                    Procurement Stage
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Generated from Material Requests. Purchase Quantity is automatically calculated from the verified shortage quantity.
                </p>
              </div>

              <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                Rule: <strong>Approved PR</strong> is required before floating an RFQ to vendors.
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">PR Number</th>
                    <th className="py-3 px-4">MR Reference</th>
                    <th className="py-3 px-4">Project / Site</th>
                    <th className="py-3 px-4">Material</th>
                    <th className="py-3 px-4 text-center">Req. Qty</th>
                    <th className="py-3 px-4 text-center">Available Stock</th>
                    <th className="py-3 px-4 text-center text-red-600">Purchase Qty</th>
                    <th className="py-3 px-4">Procurement Officer</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredPRs.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        No Purchase Requests available. Convert an approved Material Request to create a PR.
                      </td>
                    </tr>
                  ) : (
                    filteredPRs.map((pr) => (
                      <tr key={pr.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {pr.pr_number}
                          <div className="text-[10px] text-slate-400 font-normal">{pr.created_date}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-purple-700 font-bold">
                          {pr.mr_reference}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{pr.project_name}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{pr.material}</div>
                          <div className="text-[10px] text-slate-500 max-w-xs truncate">{pr.specification}</div>
                        </td>
                        <td className="py-3 px-4 text-center font-mono">{pr.required_quantity} {pr.unit}</td>
                        <td className="py-3 px-4 text-center font-mono text-slate-500">{pr.available_stock} {pr.unit}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-red-600 bg-red-50/50">
                          {pr.purchase_quantity} {pr.unit}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{pr.procurement_person}</td>
                        <td className="py-3 px-4">{renderStatusBadge(pr.status)}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* PR Actions: Edit */}
                            {pr.status !== 'PO_CREATED' && pr.status !== 'CANCELLED' && (
                              <button
                                onClick={() => handleOpenEditPR(pr)}
                                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
                                title="Edit PR"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Approve PR */}
                            {pr.status === 'SUBMITTED_FOR_APPROVAL' && (
                              <button
                                onClick={() => {
                                  updatePurchaseRequestStatus(pr.id, 'APPROVED', 'Project Manager', simulatedRole);
                                  setProcState(getProcurementState());
                                  toast(`PR ${pr.pr_number} Approved! Ready for RFQ dispatch.`);
                                }}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded text-xs font-bold cursor-pointer"
                              >
                                Approve PR
                              </button>
                            )}

                            {/* Reject PR */}
                            {pr.status === 'SUBMITTED_FOR_APPROVAL' && (
                              <button
                                onClick={() => {
                                  updatePurchaseRequestStatus(pr.id, 'REJECTED', 'Project Manager', simulatedRole);
                                  setProcState(getProcurementState());
                                  toast(`PR ${pr.pr_number} Rejected`);
                                }}
                                className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded text-xs font-bold cursor-pointer"
                              >
                                Reject
                              </button>
                            )}

                            {/* Create RFQ from Approved PR */}
                            {pr.status === 'APPROVED' && !pr.linked_rfq_number && (
                              <button
                                onClick={() => handleCreateRFQ(pr)}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold cursor-pointer"
                              >
                                Float RFQ →
                              </button>
                            )}

                            {/* Show linked RFQ */}
                            {pr.linked_rfq_number && (
                              <span className="font-mono text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">
                                {pr.linked_rfq_number}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: VENDOR RFQ & QUOTATION COMPARISON */}
        {activeTab === 'rfq' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-6 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">Request for Quotation (RFQ) & Multi-Vendor Comparison</h2>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full">
                    Vendor Evaluation
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Compare rates, freight, GST, and delivery turnaround across multiple vendors before awarding Purchase Order.
                </p>
              </div>
            </div>

            {filteredRFQs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl">
                No RFQs generated yet. Approve a Purchase Request and click "Float RFQ" to trigger multi-vendor comparison.
              </div>
            ) : (
              filteredRFQs.map((rfq) => (
                <div key={rfq.id} className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900">{rfq.rfq_number}</span>
                        <span className="text-xs text-slate-500">(Linked PR: {rfq.pr_number})</span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
                          {rfq.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-700 mt-1">
                        Material: <strong>{rfq.material_name}</strong> • Quantity:{' '}
                        <strong className="text-red-600 font-mono">
                          {rfq.quantity} {rfq.unit}
                        </strong>{' '}
                        • Project: <strong>{rfq.project_name}</strong>
                      </div>
                    </div>

                    {rfq.selected_vendor_name && (
                      <div className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5" /> Awarded to: {rfq.selected_vendor_name}
                      </div>
                    )}
                  </div>

                  {/* Multi-Vendor Comparison Table */}
                  <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">Vendor Name & GST</th>
                          <th className="py-2.5 px-3 text-right">Unit Rate (₹)</th>
                          <th className="py-2.5 px-3 text-right">Disc %</th>
                          <th className="py-2.5 px-3 text-right">GST %</th>
                          <th className="py-2.5 px-3 text-right">Transport</th>
                          <th className="py-2.5 px-3 text-center">Delivery Days</th>
                          <th className="py-2.5 px-3">Payment Terms</th>
                          <th className="py-2.5 px-3 text-right">Landed Cost (₹)</th>
                          <th className="py-2.5 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {rfq.quotations.map((quote) => {
                          const isLowest = quote.total_amount === Math.min(...rfq.quotations.map((q) => q.total_amount));
                          return (
                            <tr
                              key={quote.vendor_id}
                              className={`hover:bg-slate-50 transition-colors ${
                                quote.is_selected ? 'bg-emerald-50/60 font-semibold' : ''
                              }`}
                            >
                              <td className="py-3 px-3">
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  {quote.vendor_name}
                                  {isLowest && (
                                    <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded">
                                      L1 BIDDER
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400">GST: {quote.vendor_gst || 'N/A'} • {quote.vendor_phone}</div>
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold">₹{quote.unit_rate.toLocaleString()}</td>
                              <td className="py-3 px-3 text-right font-mono">{quote.discount_percent}%</td>
                              <td className="py-3 px-3 text-right font-mono">{quote.gst_percent}%</td>
                              <td className="py-3 px-3 text-right font-mono">₹{quote.transport_charges.toLocaleString()}</td>
                              <td className="py-3 px-3 text-center font-mono">{quote.delivery_days} Days</td>
                              <td className="py-3 px-3 text-slate-600 text-[11px]">{quote.payment_terms}</td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 text-sm">
                                ₹{quote.total_amount.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-3 text-center">
                                {quote.is_selected ? (
                                  <span className="px-2 py-1 bg-emerald-600 text-white rounded font-bold text-[10px]">
                                    PO Issued
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleSelectVendorAndMakePO(rfq.id, quote.vendor_id)}
                                    className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold transition-colors cursor-pointer"
                                  >
                                    Select & Make PO
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 5: PURCHASE ORDERS (PO) */}
        {activeTab === 'po' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">Purchase Orders (PO) Register</h2>
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-full">
                    Official Contract
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Contractual purchase commitments with items, taxes, standard Terms & Conditions, and printable PDF documents.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  Total Committed:{' '}
                  <strong className="text-slate-900 font-mono">
                    ₹{metrics.totalPurchaseCost.toLocaleString('en-IN')}
                  </strong>
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">PO Number</th>
                    <th className="py-3 px-4">Project / Delivery Site</th>
                    <th className="py-3 px-4">Vendor</th>
                    <th className="py-3 px-4">PO Date</th>
                    <th className="py-3 px-4">Expected Delivery</th>
                    <th className="py-3 px-4 text-right">Total Amount (₹)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredPOs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No Purchase Orders found. Select a vendor quotation in the RFQ tab to generate a PO.
                      </td>
                    </tr>
                  ) : (
                    filteredPOs.map((po) => (
                      <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {po.po_number}
                          <div className="text-[10px] text-slate-400 font-normal">PR: {po.pr_reference}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{po.project_name}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{po.delivery_location}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{po.vendor_name}</div>
                          <div className="text-[10px] text-slate-400">GST: {po.vendor_gst || 'N/A'}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{po.po_date}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{po.expected_delivery_date}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                          ₹{po.total_amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4">{renderStatusBadge(po.status)}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Printable / Download PDF */}
                            <button
                              onClick={() => {
                                setSelectedPO(po);
                                setShowPODetailModal(true);
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
                              title="View and Download PDF"
                            >
                              <Eye className="w-3.5 h-3.5" /> View / Print
                            </button>

                            <button
                              onClick={() => {
                                downloadPurchaseOrderPDF(po);
                                toast(`Downloading official PDF for ${po.po_number}...`);
                              }}
                              className="p-1 bg-red-50 hover:bg-red-100 text-red-700 rounded cursor-pointer"
                              title="Direct Download PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {/* Storekeeper Action: Record GRN */}
                            {(po.status === 'APPROVED' || po.status === 'SENT_TO_VENDOR' || po.status === 'PARTIALLY_RECEIVED') && (
                              <button
                                onClick={() => handleOpenGRNModal(po)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold cursor-pointer"
                                title="Record physical material delivery & inspection"
                              >
                                Record GRN →
                              </button>
                            )}

                            {/* Project Manager Action: Approve PO */}
                            {po.status === 'PENDING_APPROVAL' && (
                              <button
                                onClick={() => {
                                  updatePurchaseOrderStatus(po.id, 'APPROVED', 'Project Manager', simulatedRole);
                                  setProcState(getProcurementState());
                                  toast(`PO ${po.po_number} Approved! Ready for dispatch.`);
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold cursor-pointer"
                              >
                                Approve PO
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: GOODS RECEIPT NOTE (GRN) */}
        {activeTab === 'grn' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">Goods Receipt Note (GRN) & Site Quality Inspection</h2>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full">
                    Storekeeper Verification
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Physical gate receipt, challan recording, and quality inspection.
                </p>
              </div>

              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 font-medium">
                ⚠️ <strong>CRITICAL SYSTEM RULE:</strong> Only the <strong>accepted quantity</strong> increases site inventory. Rejected items do NOT enter stock.
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">GRN #</th>
                    <th className="py-3 px-4">PO Ref</th>
                    <th className="py-3 px-4">Vendor & Challan</th>
                    <th className="py-3 px-4">Material</th>
                    <th className="py-3 px-4 text-center">Ordered</th>
                    <th className="py-3 px-4 text-center">Received</th>
                    <th className="py-3 px-4 text-center text-emerald-700 font-bold">Accepted (Stock+)</th>
                    <th className="py-3 px-4 text-center text-red-600 font-bold">Rejected</th>
                    <th className="py-3 px-4">Storekeeper</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredGRNs.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        No GRN receipts recorded yet. Click "Record GRN" on an approved Purchase Order when delivery arrives.
                      </td>
                    </tr>
                  ) : (
                    filteredGRNs.map((grn) => (
                      <tr key={grn.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {grn.grn_number}
                          <div className="text-[10px] text-slate-400 font-normal">{grn.receipt_date}</div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-700">{grn.po_number}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{grn.vendor_name}</div>
                          <div className="text-[10px] text-slate-500">Challan: {grn.challan_number} • Veh: {grn.vehicle_number}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{grn.material_name}</div>
                          <div className="text-[10px] text-slate-400 italic truncate max-w-xs">{grn.inspection_notes}</div>
                        </td>
                        <td className="py-3 px-4 text-center font-mono">{grn.ordered_quantity} {grn.unit}</td>
                        <td className="py-3 px-4 text-center font-mono">{grn.received_quantity} {grn.unit}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700 bg-emerald-50">
                          +{grn.accepted_quantity} {grn.unit}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-red-600 bg-red-50">
                          {grn.rejected_quantity} {grn.unit}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{grn.received_by}</td>
                        <td className="py-3 px-4">{renderStatusBadge(grn.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: 3-WAY MATCH INVOICES & PAYMENTS */}
        {activeTab === 'invoices' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">Vendor Purchase Invoices & 3-Way Match Verification</h2>
                  <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-xs font-bold rounded-full">
                    Accounts Payout
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Invoices are automatically linked to Purchase Order and GRN. 3-Way match ensures exact reconciliation.
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  Total Billed: <span className="font-mono font-bold">₹{metrics.totalInvoiceAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200">
                  Paid: <span className="font-mono font-bold">₹{metrics.totalPaidAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-red-50 text-red-800 px-3 py-1.5 rounded-lg border border-red-200">
                  Outstanding: <span className="font-mono font-bold">₹{metrics.outstandingPayables.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  No invoices available. Invoices are generated when GRN delivery receipts are certified.
                </div>
              ) : (
                filteredInvoices.map((inv) => (
                  <div key={inv.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900">{inv.invoice_number}</span>
                        <span className="text-xs text-slate-500">({inv.vendor_invoice_ref})</span>
                        {renderStatusBadge(inv.match_status)}
                        {renderStatusBadge(inv.payment_status)}
                      </div>
                      <div className="text-xs text-slate-700 mt-1.5">
                        Vendor: <strong>{inv.vendor_name}</strong> • PO Ref:{' '}
                        <strong className="font-mono text-amber-700">{inv.po_number}</strong> • GRN Ref:{' '}
                        <strong className="font-mono text-emerald-700">{inv.grn_number}</strong>
                      </div>
                      {inv.match_notes && (
                        <div className="text-[11px] text-slate-600 mt-1 bg-slate-100 p-2 rounded max-w-xl">
                          <strong>Reconciliation Note:</strong> {inv.match_notes}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col md:items-end gap-2">
                      <div className="text-right">
                        <div className="font-mono font-bold text-base text-slate-900">
                          ₹{inv.total_amount.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Paid: ₹{(inv.paid_amount || 0).toLocaleString('en-IN')} • Due: {inv.due_date}
                        </div>
                      </div>

                      {inv.payment_status !== 'PAID' && (
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            const balance = inv.total_amount - (inv.paid_amount || 0);
                            setPaymentForm({
                              amount: balance,
                              mode: 'NEFT / Direct Bank Transfer',
                              ref_number: 'UTR-' + Date.now().toString().slice(-8),
                            });
                            setShowPaymentModal(true);
                          }}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-all shadow-sm cursor-pointer self-start md:self-auto"
                        >
                          Process Payment →
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 8: SITE YARD STOCK */}
        {activeTab === 'stock' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">Site Yard Stock Levels & Availability</h2>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-800 text-xs font-bold rounded-full">
                    Live Inventory
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Updated strictly by GRN accepted deliveries. Used by Site Engineers and Procurement to compute accurate shortages.
                </p>
              </div>

              <button
                onClick={() => {
                  setMrForm({
                    ...mrForm,
                    project_name: selectedProjectName === 'All Sites' ? 'Villa Complex Phase 1' : selectedProjectName,
                  });
                  setShowMRModal(true);
                }}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Indent Low Stock Material
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Item Name</th>
                    <th className="py-3 px-4">Project / Yard</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Current Stock</th>
                    <th className="py-3 px-4 text-right">Min Threshold</th>
                    <th className="py-3 px-4">Stock Health</th>
                    <th className="py-3 px-4">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredStock.map((stock) => (
                    <tr key={stock.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{stock.item_name}</td>
                      <td className="py-3 px-4">{stock.project_name}</td>
                      <td className="py-3 px-4">{stock.category}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                        {stock.current_quantity} {stock.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {stock.minimum_threshold} {stock.unit}
                      </td>
                      <td className="py-3 px-4">
                        {stock.is_low_stock ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 flex items-center gap-1 w-max">
                            <AlertTriangle className="w-3 h-3" /> Low Stock - Indent Needed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-max">
                            <CheckCircle2 className="w-3 h-3" /> Optimal
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400">{stock.last_updated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 9: AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">Procurement Activity & Audit History</h2>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-800 text-xs font-bold rounded-full">
                    Immutable Log
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Every requisition, approval, PO issuance, inspection acceptance, and payout is logged with timestamp and user.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 font-medium">
              {filteredAudit.map((log) => (
                <div key={log.id} className="py-3.5 flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{log.action}</span>
                      {log.document_ref && (
                        <span className="font-mono text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded font-bold">
                          {log.document_ref}
                        </span>
                      )}
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {log.role}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">{log.details}</p>
                    <div className="text-[10px] text-slate-400">By: {log.user_name}</div>
                  </div>
                  <div className="text-slate-400 font-mono text-[11px] whitespace-nowrap">{log.timestamp}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── MODALS ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      {/* MODAL 1: CREATE MATERIAL REQUEST */}
      {showMRModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create Material Request (Indent)</h3>
                <p className="text-xs text-slate-500">Site Engineer / Supervisor initial demand requisition</p>
              </div>
              <button
                onClick={() => setShowMRModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMR} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Project / Site */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Project / Site *</label>
                  <select
                    value={mrForm.project_name}
                    onChange={(e) => setMrForm({ ...mrForm, project_name: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-red-500 font-medium"
                    required
                  >
                    {projectListOptions
                      .filter((p) => p !== 'All Sites')
                      .map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Requested By */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Requested By *</label>
                  <input
                    type="text"
                    value={mrForm.requested_by}
                    onChange={(e) => setMrForm({ ...mrForm, requested_by: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-red-500 font-medium"
                    required
                  />
                </div>

                {/* Material Category */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Material Category *</label>
                  <select
                    value={mrForm.material_category}
                    onChange={(e) => setMrForm({ ...mrForm, material_category: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-red-500 font-medium"
                  >
                    <option value="Cement">Cement & Concrete</option>
                    <option value="Steel">Reinforcement Steel (TMT)</option>
                    <option value="Aggregates">Aggregates & Sand</option>
                    <option value="Bricks & Blocks">Bricks & Masonry Blocks</option>
                    <option value="Plumbing">Plumbing & Sanitary</option>
                    <option value="Electrical">Electrical & Cabling</option>
                    <option value="Finishing">Finishing & Paints</option>
                    <option value="General Supplies">General Supplies</option>
                  </select>
                </div>

                {/* Material Name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Material Name *</label>
                  <input
                    type="text"
                    value={mrForm.material_name}
                    onChange={(e) => setMrForm({ ...mrForm, material_name: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-red-500 font-bold"
                    placeholder="e.g. 53 Grade OPC Cement, 12mm TMT Rebar"
                    required
                  />
                </div>
              </div>

              {/* LIVE STOCK AVAILABILITY & SHORTAGE DISPLAY */}
              <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-red-900 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-red-600" /> Site Stock Availability Check
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-700">
                    Yard Balance: {liveStockCheck.availableStock} {mrForm.unit}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 flex items-center justify-between">
                  <span>Required Demand: {mrForm.required_quantity} {mrForm.unit}</span>
                  <span className="font-bold text-red-600">
                    Calculated Shortage: {liveShortage} {mrForm.unit}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Shortage will be transferred to Purchase Request to avoid surplus over-ordering.
                </div>
              </div>

              {/* Material Specification */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Material Specification</label>
                <input
                  type="text"
                  value={mrForm.material_specification}
                  onChange={(e) => setMrForm({ ...mrForm, material_specification: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-red-500"
                  placeholder="IS Code, grade, packing type..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Required Quantity */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Required Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={mrForm.required_quantity}
                    onChange={(e) => setMrForm({ ...mrForm, required_quantity: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-red-500 font-bold font-mono"
                    required
                  />
                </div>

                {/* Unit */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit *</label>
                  <select
                    value={mrForm.unit}
                    onChange={(e) => setMrForm({ ...mrForm, unit: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-red-500 font-medium"
                  >
                    <option value="Bags">Bags</option>
                    <option value="Tons">Tons</option>
                    <option value="Cu.m">Cu.m (Cubic Meters)</option>
                    <option value="Nos">Nos (Units)</option>
                    <option value="Sq.ft">Sq.ft</option>
                    <option value="Rmt">Rmt (Running Meters)</option>
                    <option value="Litres">Litres</option>
                  </select>
                </div>

                {/* Required Date */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Required Date *</label>
                  <input
                    type="date"
                    value={mrForm.required_date}
                    onChange={(e) => setMrForm({ ...mrForm, required_date: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-red-500 font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Priority */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority Level</label>
                  <select
                    value={mrForm.priority}
                    onChange={(e) => setMrForm({ ...mrForm, priority: e.target.value as PriorityLevel })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-red-500 font-medium"
                  >
                    <option value="URGENT">URGENT (Critical Path Work)</option>
                    <option value="HIGH">HIGH Priority</option>
                    <option value="NORMAL">NORMAL</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>

                {/* Initial Status */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Submission Status</label>
                  <select
                    value={mrForm.status}
                    onChange={(e) => setMrForm({ ...mrForm, status: e.target.value as MRStatus })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-red-500 font-medium"
                  >
                    <option value="SUBMITTED">Submit to Procurement Team</option>
                    <option value="DRAFT">Save as Draft (Site Review)</option>
                  </select>
                </div>
              </div>

              {/* Purpose / Work Description */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Purpose / Work Description</label>
                <textarea
                  rows={2}
                  value={mrForm.purpose}
                  onChange={(e) => setMrForm({ ...mrForm, purpose: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-red-500"
                  placeholder="e.g. 2nd Floor slab casting, column reinforcement..."
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks & Site Instructions</label>
                <input
                  type="text"
                  value={mrForm.remarks}
                  onChange={(e) => setMrForm({ ...mrForm, remarks: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-red-500"
                  placeholder="Access timings, vehicle restrictions, unloading cranes..."
                />
              </div>

              {/* Simulated Attachment */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Attachment File Reference</label>
                <input
                  type="text"
                  value={mrForm.attachment_name}
                  onChange={(e) => setMrForm({ ...mrForm, attachment_name: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-red-500 font-mono"
                  placeholder="e.g. bar_bending_schedule_rev1.pdf"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowMRModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-md transition-all cursor-pointer"
                >
                  Create Material Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE PURCHASE REQUEST FROM MR */}
      {showPRModal && selectedMR && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create Purchase Request (PR)</h3>
                <p className="text-slate-500">From Material Request: {selectedMR.request_number}</p>
              </div>
              <button onClick={() => setShowPRModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Material:</span>
                <span className="font-bold text-slate-900">{selectedMR.material_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Site Required Demand:</span>
                <span className="font-mono font-bold text-slate-900">{selectedMR.required_quantity} {selectedMR.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Site Available Stock:</span>
                <span className="font-mono text-slate-700">{selectedMR.available_stock_snapshot} {selectedMR.unit}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-900">Calculated Purchase Qty (Shortage):</span>
                <span className="font-mono font-bold text-red-600 text-sm">
                  {selectedMR.shortage_quantity > 0 ? selectedMR.shortage_quantity : selectedMR.required_quantity} {selectedMR.unit}
                </span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Procurement Officer in Charge</label>
              <input
                type="text"
                value={prForm.procurement_person}
                onChange={(e) => setPrForm({ ...prForm, procurement_person: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-200 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Procurement Remarks / Notes</label>
              <textarea
                rows={2}
                value={prForm.remarks}
                onChange={(e) => setPrForm({ ...prForm, remarks: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-200"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPRModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCreatePR}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-md cursor-pointer"
              >
                Submit PR for Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT PURCHASE REQUEST */}
      {showEditPRModal && selectedPR && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Purchase Request</h3>
                <p className="text-slate-500">{selectedPR.pr_number}</p>
              </div>
              <button onClick={() => setShowEditPRModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Required Quantity ({selectedPR.unit})</label>
              <input
                type="number"
                value={editPRForm.required_quantity}
                onChange={(e) => setEditPRForm({ ...editPRForm, required_quantity: Number(e.target.value) })}
                className="w-full p-2.5 rounded-lg border border-slate-200 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Available Stock ({selectedPR.unit})</label>
              <input
                type="number"
                value={editPRForm.available_stock}
                onChange={(e) => setEditPRForm({ ...editPRForm, available_stock: Number(e.target.value) })}
                className="w-full p-2.5 rounded-lg border border-slate-200 font-mono font-bold"
              />
            </div>

            <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs font-bold">
              Recalculated Purchase Shortage:{' '}
              {Math.max(0, editPRForm.required_quantity - editPRForm.available_stock)} {selectedPR.unit}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={editPRForm.priority}
                onChange={(e) => setEditPRForm({ ...editPRForm, priority: e.target.value as PriorityLevel })}
                className="w-full p-2.5 rounded-lg border border-slate-200 font-medium"
              >
                <option value="URGENT">URGENT</option>
                <option value="HIGH">HIGH</option>
                <option value="NORMAL">NORMAL</option>
                <option value="LOW">LOW</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Remarks</label>
              <textarea
                rows={2}
                value={editPRForm.remarks}
                onChange={(e) => setEditPRForm({ ...editPRForm, remarks: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-200"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEditPRModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditPR}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-md cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PURCHASE ORDER DETAILS & PRINTABLE VIEW */}
      {showPODetailModal && selectedPO && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white font-black text-xl">
                  B
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Purchase Order Details</h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedPO.po_number}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    downloadPurchaseOrderPDF(selectedPO);
                    toast('Downloading official Purchase Order PDF...');
                  }}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Download Official PDF
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button
                  onClick={() => setShowPODetailModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Preview Body */}
            <div className="space-y-6 text-xs text-slate-700">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <div className="font-bold text-slate-900 text-sm mb-1">{selectedPO.vendor_name}</div>
                  <div className="text-slate-500">{selectedPO.vendor_address}</div>
                  <div className="text-slate-500 mt-1">Phone: {selectedPO.vendor_phone}</div>
                  <div className="text-slate-500">GSTIN: {selectedPO.vendor_gst || 'N/A'}</div>
                </div>

                <div className="text-right space-y-1">
                  <div>PO Date: <strong>{selectedPO.po_date}</strong></div>
                  <div>Expected Delivery: <strong className="text-red-600">{selectedPO.expected_delivery_date}</strong></div>
                  <div>Project / Site: <strong>{selectedPO.project_name}</strong></div>
                  <div>Delivery Yard: <strong>{selectedPO.delivery_location}</strong></div>
                  <div>Payment Terms: <strong>{selectedPO.payment_terms}</strong></div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Rate (₹)</th>
                      <th className="py-2.5 px-3 text-right">Disc %</th>
                      <th className="py-2.5 px-3 text-right">GST %</th>
                      <th className="py-2.5 px-3 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {selectedPO.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{item.material_name}</div>
                          <div className="text-[10px] text-slate-500">{item.specification}</div>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold">{item.quantity} {item.unit}</td>
                        <td className="py-3 px-3 text-right font-mono">₹{item.rate.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right font-mono">{item.discount_percent}%</td>
                        <td className="py-3 px-3 text-right font-mono">{item.gst_percent}%</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{item.total_amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Breakdown */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 text-right font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>₹{selectedPO.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST Tax Amount:</span>
                    <span>₹{selectedPO.tax_amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Transport / Freight:</span>
                    <span>₹{(selectedPO.transport_charges || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-200">
                    <span>Grand Total:</span>
                    <span className="text-red-600">₹{selectedPO.total_amount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Terms & Conditions */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 text-xs">Standard Purchase Terms & Conditions:</div>
                <div className="text-[11px] text-slate-600 whitespace-pre-line leading-relaxed">
                  {selectedPO.terms_conditions || getTermsConditions().purchaseOrderTerms}
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200 text-center text-xs">
                <div>
                  <div className="border-t border-slate-300 pt-2 font-bold text-slate-800">
                    {selectedPO.created_by}
                  </div>
                  <div className="text-slate-400 text-[10px]">Prepared By (Procurement)</div>
                </div>
                <div>
                  <div className="border-t border-slate-300 pt-2 font-bold text-slate-800">
                    {selectedPO.approved_by || 'R. Booshnam'}
                  </div>
                  <div className="text-slate-400 text-[10px]">Approved By (Project Manager)</div>
                </div>
                <div>
                  <div className="border-t border-slate-300 pt-2 font-bold text-slate-800">
                    Authorized Signatory
                  </div>
                  <div className="text-slate-400 text-[10px]">For Booshnam Associates</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: RECORD GRN RECEIPT & INSPECTION */}
      {showGRNModal && selectedPO && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Material Delivery & GRN Inspection</h3>
                <p className="text-slate-500">Linked to PO: {selectedPO.po_number} ({selectedPO.vendor_name})</p>
              </div>
              <button onClick={() => setShowGRNModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 font-medium">
              ⚠️ <strong>Mandatory Rule:</strong> Inventory will increase strictly by the <strong>Accepted Quantity</strong>. Rejected quantities do NOT increase site stock.
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vendor Delivery Challan # *</label>
                <input
                  type="text"
                  value={grnForm.challan_number}
                  onChange={(e) => setGrnForm({ ...grnForm, challan_number: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Delivery Truck / Vehicle # *</label>
                <input
                  type="text"
                  value={grnForm.vehicle_number}
                  onChange={(e) => setGrnForm({ ...grnForm, vehicle_number: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Received Qty</label>
                <input
                  type="number"
                  value={grnForm.received_quantity}
                  onChange={(e) => {
                    const r = Number(e.target.value);
                    setGrnForm({
                      ...grnForm,
                      received_quantity: r,
                      accepted_quantity: r - grnForm.rejected_quantity,
                    });
                  }}
                  className="w-full p-2 rounded-lg border border-slate-300 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-emerald-700 mb-1">Accepted Qty (Stock+)</label>
                <input
                  type="number"
                  value={grnForm.accepted_quantity}
                  onChange={(e) => {
                    const a = Number(e.target.value);
                    setGrnForm({
                      ...grnForm,
                      accepted_quantity: a,
                      rejected_quantity: Math.max(0, grnForm.received_quantity - a),
                    });
                  }}
                  className="w-full p-2 rounded-lg border border-emerald-400 bg-emerald-50/50 font-mono font-bold text-emerald-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-red-700 mb-1">Rejected Qty</label>
                <input
                  type="number"
                  value={grnForm.rejected_quantity}
                  onChange={(e) => {
                    const rej = Number(e.target.value);
                    setGrnForm({
                      ...grnForm,
                      rejected_quantity: rej,
                      accepted_quantity: Math.max(0, grnForm.received_quantity - rej),
                    });
                  }}
                  className="w-full p-2 rounded-lg border border-red-400 bg-red-50/50 font-mono font-bold text-red-800"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Inspection & Quality Notes</label>
              <textarea
                rows={2}
                value={grnForm.inspection_notes}
                onChange={(e) => setGrnForm({ ...grnForm, inspection_notes: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-200"
                placeholder="Visual defects, test certificate check, batch numbers..."
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Received By (Storekeeper)</label>
              <input
                type="text"
                value={grnForm.received_by}
                onChange={(e) => setGrnForm({ ...grnForm, received_by: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-200 font-medium"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowGRNModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveGRN}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md cursor-pointer"
              >
                Certify GRN & Update Inventory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: PROCESS VENDOR PAYMENT */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Process Vendor Payment</h3>
                <p className="text-slate-500">{selectedInvoice.invoice_number} ({selectedInvoice.vendor_name})</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Gross Billed Amount:</span>
                <span className="font-mono font-bold text-slate-900">₹{selectedInvoice.total_amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Paid So Far:</span>
                <span className="font-mono text-emerald-700">₹{(selectedInvoice.paid_amount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 font-bold">
                <span>Remaining Balance:</span>
                <span className="font-mono text-red-600">
                  ₹{(selectedInvoice.total_amount - (selectedInvoice.paid_amount || 0)).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Amount (₹) *</label>
              <input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                className="w-full p-2.5 rounded-lg border border-slate-200 font-mono font-bold text-base"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
              <select
                value={paymentForm.mode}
                onChange={(e) => setPaymentForm({ ...paymentForm, mode: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-200 font-medium"
              >
                <option value="NEFT / Direct Bank Transfer">NEFT / Direct Bank Transfer</option>
                <option value="RTGS">RTGS</option>
                <option value="Company Cheque">Company Cheque</option>
                <option value="UPI / Corporate Card">UPI / Corporate Card</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Transaction / Reference #</label>
              <input
                type="text"
                value={paymentForm.ref_number}
                onChange={(e) => setPaymentForm({ ...paymentForm, ref_number: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-200 font-mono"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessPayment}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-md cursor-pointer"
              >
                Confirm Payout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
