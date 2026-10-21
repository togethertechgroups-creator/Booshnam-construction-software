import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  CheckCircle2, Clock, AlertCircle, Phone, Mail, 
  MapPin, Calendar, TrendingUp, DollarSign, Users, 
  Layers, ShoppingCart, ListTodo, FileText, ArrowUpRight,
  ShieldCheck, ArrowDownRight, HardHat, PlusCircle, Settings,
  Image as ImageIcon, Upload, ChevronRight, Check, X, Trash2, Eye,
  Building2, Activity, Sparkles, BarChart3, RotateCcw, Coins,
  Search, Filter, Printer, Download, History, BookOpen, Receipt, Plus, ArrowRight
} from 'lucide-react';
import { 
  Project, WBSTask, ApprovalRequest, MaterialRequest, ProjectTeamMember,
  ProjectTransaction, BOQRecord, BOQItem, BOQMilestone, TransactionAllocation, FinancialAuditLog
} from '../../../types';
import { WorkspaceTabId, isSoilDepartmentProject } from '../ProjectTopNav';
import { ProjectPhoto, getProjectPhotos, addProjectPhoto, removeProjectPhoto } from '../../../lib/projectPhotoUtils';
import { confirmAction } from '../../../lib/dialogService';
import { CustomSelect } from '../../CustomSelect';
import { 
  calculateProjectFinancialSummary, 
  syncProjectFinancialsToStorage, 
  getProjectTransactions,
  ProjectFinancialSummary 
} from '../../../lib/projectFinanceUtils';
import { AllocateAdvanceModal } from '../AllocateAdvanceModal';
import { 
  getAllocations, 
  reverseAllocation, 
  reverseProjectTransaction, 
  getFinancialAuditLogs, 
  getTransactionAdvanceBalance,
  recordFinancialAudit 
} from '../../../lib/allocationService';


interface DashboardTabProps {
  project: Project;
  tasks?: WBSTask[];
  approvals?: ApprovalRequest[];
  materialRequests?: MaterialRequest[];
  onNavigateTab: (tab: WorkspaceTabId) => void;
  onOpenTeamModal?: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  project,
  tasks = [],
  approvals = [],
  materialRequests = [],
  onNavigateTab,
  onOpenTeamModal
}) => {
  // Top Sub-Tabs: 'operational' | 'financial' (matching user screenshot)
  const [subTab, setSubTab] = useState<'operational' | 'financial'>('operational');

  // Check if current project is in Soil Investigation department
  const isSoilProject = isSoilDepartmentProject(project);

  // Centralized project photos state (aggregated from Dashboard, Design, Material, Files, etc.)
  const projectIdKey = project.id || project.code;
  const [photos, setPhotos] = useState<ProjectPhoto[]>(() => getProjectPhotos(projectIdKey));
  const [activeSourceFilter, setActiveSourceFilter] = useState<string>('ALL');

  const [isAddPhotoOpen, setIsAddPhotoOpen] = useState(false);
  const [newPhotoTitle, setNewPhotoTitle] = useState('');
  const [newPhotoSource, setNewPhotoSource] = useState<string>('Site Photo');
  const [newPhotoDataUrl, setNewPhotoDataUrl] = useState<string | null>(null);
  const [selectedPhotoForView, setSelectedPhotoForView] = useState<ProjectPhoto | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync photos when active project changes
  useEffect(() => {
    setPhotos(getProjectPhotos(projectIdKey));
    setActiveSourceFilter('ALL');
  }, [projectIdKey]);

  // Listen for photos added or removed from ANY tab (Design, Material, Files, etc.)
  useEffect(() => {
    const handlePhotoAdded = (e: any) => {
      if (e.detail && (e.detail.projectId === project.id || e.detail.projectId === project.code)) {
        setPhotos(prev => [e.detail.photo, ...prev.filter(p => p.id !== e.detail.photo.id)]);
      }
    };
    const handlePhotoRemoved = (e: any) => {
      if (e.detail && (e.detail.projectId === project.id || e.detail.projectId === project.code)) {
        setPhotos(prev => prev.filter(p => p.id !== e.detail.photoId));
      }
    };

    window.addEventListener('siteops_photo_added', handlePhotoAdded);
    window.addEventListener('siteops_photo_removed', handlePhotoRemoved);
    return () => {
      window.removeEventListener('siteops_photo_added', handlePhotoAdded);
      window.removeEventListener('siteops_photo_removed', handlePhotoRemoved);
    };
  }, [project.id, project.code]);

  const projProgress = project.progress_percentage || 0;
  const projTeam: ProjectTeamMember[] = project.assigned_team || [];

  // Project MOMs (Requirement 4)
  const [projectMoms, setProjectMoms] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem(`booshnam_mom_v1_${project.id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`booshnam_mom_v1_${project.id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setProjectMoms(parsed);
      }
    } catch (e) {}
  }, [project.id]);

  // Date format helper (converts YYYY-MM-DD to DD-MM-YYYY as requested in Requirement 4)
  const formatDashDate = (dStr?: string) => {
    if (!dStr) return '--';
    if (dStr.includes('-')) {
      const parts = dStr.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    return dStr;
  };

  // Task metrics strictly for this project (Requirement 6)
  const projectTasks = React.useMemo(() => {
    let list = tasks.filter(t => t.project === project.id || t.project_id === project.id);
    if (list.length === 0) {
      try {
        const raw = localStorage.getItem(`booshnam_wbs_tasks_v2_${project.id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
        }
      } catch (e) {}
    }
    return list;
  }, [tasks, project.id]);

  const completedTasks = projectTasks.filter(t => t.status === 'COMPLETED').length;
  const inProgressTasks = projectTasks.filter(t => t.status === 'IN_PROGRESS').length;
  const notStartedTasks = projectTasks.filter(t => t.status === 'TODO').length;
  const delayedTasks = projectTasks.filter(t => t.status === 'BLOCKED').length;

  // Task View Mode: 'tasks' (interactive list) | 'chart' (dynamic S-curve)
  const [taskViewMode, setTaskViewMode] = useState<'tasks' | 'chart'>('tasks');

  // Dynamic Overall Progress (% completed tasks or project progress)
  const overallTaskProgress = projectTasks.length > 0 
    ? Math.round((completedTasks / projectTasks.length) * 100) 
    : (project.progress_percentage || 0);

  // Dynamic Timeline Metrics (Days elapsed, Days remaining, Timeline %)
  const timelineMetrics = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = project.start_date ? new Date(project.start_date) : null;
    const endDate = project.expected_end_date ? new Date(project.expected_end_date) : null;
    
    let totalDays = 0;
    let elapsedDays = 0;
    let remainingDays = 0;
    let timelinePercent = 0;
    let isDelayed = false;
    
    if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      const diffTime = endDate.getTime() - startDate.getTime();
      totalDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
      
      const elapsed = today.getTime() - startDate.getTime();
      elapsedDays = Math.max(0, Math.round(elapsed / (1000 * 60 * 60 * 24)));
      remainingDays = Math.max(0, Math.round((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
      timelinePercent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
      isDelayed = today.getTime() > endDate.getTime();
    }
    
    return { totalDays, elapsedDays, remainingDays, timelinePercent, isDelayed };
  }, [project.start_date, project.expected_end_date]);

  // Dynamic monthly progress data points for S-curve
  const monthlyProgressData = React.useMemo(() => {
    const points: Array<{ month: string; planned: number; actual: number }> = [];
    const baseDate = project.start_date ? new Date(project.start_date) : new Date();
    
    for (let i = 0; i < 6; i++) {
      const d = new Date(baseDate);
      d.setMonth(d.getMonth() + i * 2);
      const monthStr = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
      const planned = Math.min(100, Math.round((Math.sin((i / 5) * (Math.PI / 2))) * 100));
      const actual = i === 0 ? overallTaskProgress : (overallTaskProgress > 0 && i === 1 ? overallTaskProgress : 0);
      points.push({ month: monthStr, planned, actual });
    }
    return points;
  }, [project.start_date, overallTaskProgress]);

  // Project Subcontractors from localStorage if any
  const [projectSubcons] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem(`booshnam_subcontractors_v1_${project.id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // Attendance 7-day data
  const attendanceDays: Array<{ date: string; target: number; actual: number }> = [];

  // Live Dynamic Financial Calculations synced with Transactions & Accounts
  const [finSummary, setFinSummary] = useState<ProjectFinancialSummary>(() => {
    return calculateProjectFinancialSummary(project);
  });

  useEffect(() => {
    const refreshFinancials = () => {
      setFinSummary(calculateProjectFinancialSummary(project));
    };

    // On mount and project change, ensure storage is updated and state is fresh
    syncProjectFinancialsToStorage(project.id, project.code, project.name);
    refreshFinancials();

    window.addEventListener('siteops_project_transactions_updated', refreshFinancials);
    window.addEventListener('booshnam_projects_updated', refreshFinancials);
    window.addEventListener('booshnam_finance_updated', refreshFinancials);
    window.addEventListener('storage', refreshFinancials);

    return () => {
      window.removeEventListener('siteops_project_transactions_updated', refreshFinancials);
      window.removeEventListener('booshnam_projects_updated', refreshFinancials);
      window.removeEventListener('booshnam_finance_updated', refreshFinancials);
      window.removeEventListener('storage', refreshFinancials);
    };
  }, [project.id, project.code, project.name, project]);

  // Financial stats
  const cashIn = finSummary.cashIn;
  const cashOut = finSummary.cashOut;
  const netWorkingCap = finSummary.netCashPosition;
  const boqValue = finSummary.boqValue;
  const estimatedMargin = finSummary.estimatedMargin;
  const salesInvoice = finSummary.totalSalesInvoice;
  const workDone = finSummary.workDoneValue;
  const payables = finSummary.payables;
  const receivables = finSummary.receivables;
  const siteStaffExpense = finSummary.siteStaffExpense;
  const labourContractorExpense = finSummary.labourContractorExpense;
  const officeStaffExpense = finSummary.officeStaffExpense;
  const projectValue = finSummary.estimatedBudget;

  const [costCodeFilter, setCostCodeFilter] = useState<'all' | 'over' | 'under'>('all');

  // 6 Dedicated Finance Sub-tabs (Requirement Step 4 & 7)
  type FinancialView = 'overview' | 'transactions' | 'pending_allocation' | 'pending_settlements' | 'settled_history' | 'client_ledger';
  const [financialView, setFinancialView] = useState<FinancialView>('overview');
  const [finTxSearch, setFinTxSearch] = useState('');
  const [finTxTypeFilter, setFinTxTypeFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [historySubView, setHistorySubView] = useState<'settled_items' | 'allocations' | 'audit_log'>('settled_items');

  // Advance Allocation Modal state inside Finance
  const [isFinAllocateModalOpen, setIsFinAllocateModalOpen] = useState(false);
  const [finTxForAllocation, setFinTxForAllocation] = useState<ProjectTransaction | null>(null);

  // All project transactions (freshly queried)
  const projectTransactions = useMemo<ProjectTransaction[]>(() => {
    return getProjectTransactions(project);
  }, [project, finSummary]);

  // All project BOQ records
  const projectBOQs = useMemo<BOQRecord[]>(() => {
    try {
      const raw = localStorage.getItem(`siteops_boq_records_v2_${project.id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  }, [project.id, finSummary]);

  // All project allocations
  const projectAllocations = useMemo<TransactionAllocation[]>(() => {
    return getAllocations(project.id);
  }, [project.id, finSummary]);

  // All financial audit logs for this project
  const projectAuditLogs = useMemo<FinancialAuditLog[]>(() => {
    return getFinancialAuditLogs(project.id);
  }, [project.id, finSummary]);

  // Flattened BOQ items with financial tracking details
  const boqWorkItemsWithFinance = useMemo(() => {
    const list: Array<{
      boq_id: string;
      boq_number: string;
      boq_title: string;
      item: BOQItem;
      planned_amount: number;
      approved_billed: number;
      allocated_advance: number;
      direct_received: number;
      total_received_allocated: number;
      outstanding_amount: number;
      status: 'PENDING' | 'PARTIALLY_SETTLED' | 'SETTLED';
      linked_tx_refs: string[];
    }> = [];

    for (const b of projectBOQs) {
      for (const item of (b.items || [])) {
        const planned = Number(item.sales_price || item.total_amount || 0);
        const billed = item.billed_quantity 
          ? Math.min(planned, Number(item.billed_quantity) * Number(item.unit_rate || 0))
          : planned;
        
        // Active allocations to this item
        const itemAllocs = projectAllocations.filter(
          a => a.boq_item_id === item.id && a.status === 'ACTIVE'
        );
        const allocatedAdvance = itemAllocs.reduce((s, a) => s + (Number(a.allocated_amount) || 0), 0);

        // Direct payments to this item
        const directTxs = projectTransactions.filter(
          t => t.type === 'IN' && t.status !== 'REVERSED' && !t.is_reversed && t.target_boq_item_id === item.id
        );
        const directReceived = directTxs.reduce((s, t) => s + (Number(t.amount) || 0), 0);

        const totalReceivedAllocated = allocatedAdvance + directReceived;
        const outstanding = Math.max(0, planned - totalReceivedAllocated);

        let status: 'PENDING' | 'PARTIALLY_SETTLED' | 'SETTLED' = 'PENDING';
        if (totalReceivedAllocated >= planned && planned > 0) {
          status = 'SETTLED';
        } else if (totalReceivedAllocated > 0) {
          status = 'PARTIALLY_SETTLED';
        }

        const linkedRefs = [
          ...itemAllocs.map(a => a.source_transaction_number || a.id),
          ...directTxs.map(t => t.transaction_number)
        ];

        list.push({
          boq_id: b.id,
          boq_number: b.boq_number || 'BOQ',
          boq_title: b.title || 'BOQ Schedule',
          item,
          planned_amount: planned,
          approved_billed: billed,
          allocated_advance: allocatedAdvance,
          direct_received: directReceived,
          total_received_allocated: totalReceivedAllocated,
          outstanding_amount: outstanding,
          status,
          linked_tx_refs: linkedRefs
        });
      }
    }
    return list;
  }, [projectBOQs, projectAllocations, projectTransactions]);

  // Pending settlements (outstanding > 0)
  const pendingSettlementItems = useMemo(() => {
    return boqWorkItemsWithFinance.filter(w => w.outstanding_amount > 0);
  }, [boqWorkItemsWithFinance]);

  // Fully settled obligations (settled items)
  const settledItems = useMemo(() => {
    return boqWorkItemsWithFinance.filter(w => w.status === 'SETTLED');
  }, [boqWorkItemsWithFinance]);

  // Unallocated Client Advances (for Pending Allocation tab)
  const unallocatedClientAdvances = useMemo(() => {
    return projectTransactions.filter(t => {
      if (t.type !== 'IN' || t.status === 'REVERSED' || t.is_reversed) return false;
      const isAdvance = t.payment_category === 'CLIENT_ADVANCE' || 
                        t.category === 'Client Advance' || 
                        t.transaction_sub_type === 'Client Advance' ||
                        (t.transaction_sub_type === 'Payment In' && t.notes?.toLowerCase().includes('advance'));
      if (!isAdvance) return false;
      const bal = getTransactionAdvanceBalance(t);
      return bal.unallocatedAmount > 0;
    });
  }, [projectTransactions, projectAllocations]);

  // Client Ledger statement entries
  const clientLedgerEntries = useMemo(() => {
    interface LedgerRow {
      id: string;
      date: string;
      ref_no: string;
      description: string;
      debit: number;
      credit: number;
      balance: number;
      type: 'DEBIT' | 'CREDIT';
    }

    const rows: Array<Omit<LedgerRow, 'balance'>> = [];

    // 1. Invoices / Billed obligations as Debits
    for (const b of projectBOQs) {
      const bValue = Number(b.boq_value || 0);
      if (bValue > 0) {
        rows.push({
          id: `boq-bill-${b.id}`,
          date: b.created_at || (b as any).created_date || project.start_date || new Date().toISOString().split('T')[0],
          ref_no: b.boq_number || 'BOQ-BILL',
          description: `Agreed BOQ Contract Billing: ${b.title || 'General Construction'}`,
          debit: bValue,
          credit: 0,
          type: 'DEBIT'
        });
      }
    }

    // 2. Actual Non-reversed Payment In transactions as Credits
    for (const tx of projectTransactions) {
      if (tx.type === 'IN' && tx.status !== 'REVERSED' && !tx.is_reversed) {
        rows.push({
          id: `tx-credit-${tx.id}`,
          date: tx.date || new Date().toISOString().split('T')[0],
          ref_no: tx.transaction_number,
          description: `${tx.payment_category === 'CLIENT_ADVANCE' ? 'Client Advance' : (tx.payment_category === 'WORK_PAYMENT' ? 'Work Payment' : 'Payment Received')} (${tx.payment_mode || 'Cash'}${tx.reference_no ? ` - Ref: ${tx.reference_no}` : ''})`,
          debit: 0,
          credit: Number(tx.amount) || 0,
          type: 'CREDIT'
        });
      }
    }

    // Sort by date ascending
    rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Compute running balance
    let running = 0;
    const finalRows: LedgerRow[] = rows.map(r => {
      running += (r.debit - r.credit);
      return {
        ...r,
        balance: running
      };
    });

    return finalRows;
  }, [projectBOQs, projectTransactions, project.start_date]);

  // Transaction reversal handler in Finance
  const handleReverseTransactionInFin = (tx: ProjectTransaction) => {
    const reason = window.prompt(`Please enter reason for reversing transaction "${tx.transaction_number}":`, 'Payment reversal');
    if (!reason || !reason.trim()) return;

    const res = reverseProjectTransaction(tx.id, reason.trim(), 'Current User');
    if (res.success) {
      syncProjectFinancialsToStorage(project.id, project.code, project.name);
      setFinSummary(calculateProjectFinancialSummary(project));
      window.dispatchEvent(new CustomEvent('siteops_project_transactions_updated', { detail: { projectId: project.id } }));
      window.dispatchEvent(new CustomEvent('booshnam_finance_updated', { detail: { projectId: project.id } }));
      window.dispatchEvent(new CustomEvent('siteops_toast', { detail: `Transaction ${tx.transaction_number} reversed successfully.` }));
    } else {
      window.dispatchEvent(new CustomEvent('siteops_toast', { detail: res.error || 'Failed to reverse transaction.' }));
    }
  };

  // Allocation reversal handler in Finance
  const handleReverseAllocationInFin = (allocationId: string) => {
    const reason = window.prompt('Please enter reason for reversing this advance allocation:', 'Advance allocation adjustment');
    if (!reason || !reason.trim()) return;

    const res = reverseAllocation(allocationId, reason.trim(), 'Current User');
    if (res.success) {
      syncProjectFinancialsToStorage(project.id, project.code, project.name);
      setFinSummary(calculateProjectFinancialSummary(project));
      window.dispatchEvent(new CustomEvent('siteops_project_transactions_updated', { detail: { projectId: project.id } }));
      window.dispatchEvent(new CustomEvent('booshnam_finance_updated', { detail: { projectId: project.id } }));
      window.dispatchEvent(new CustomEvent('siteops_toast', { detail: 'Advance allocation reversed successfully.' }));
    } else {
      window.dispatchEvent(new CustomEvent('siteops_toast', { detail: res.error || 'Failed to reverse allocation.' }));
    }
  };



  // Handle image file selection
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      window.dispatchEvent(new CustomEvent('siteops_toast', { detail: 'Image file size should be less than 15MB' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setNewPhotoDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle drag and drop
  const handleDropPhoto = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      window.dispatchEvent(new CustomEvent('siteops_toast', { detail: 'Image file size should be less than 15MB' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setNewPhotoDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Save uploaded photo
  const handleAddPhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhotoDataUrl) {
      window.dispatchEvent(new CustomEvent('siteops_toast', { detail: 'Please select an image file first' }));
      return;
    }
    
    addProjectPhoto(projectIdKey, {
      url: newPhotoDataUrl,
      title: newPhotoTitle.trim() || 'Site Progress Photo',
      source: newPhotoSource || 'Site Photo',
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    });

    window.dispatchEvent(new CustomEvent('siteops_toast', { detail: 'Project photo uploaded successfully' }));
    setNewPhotoTitle('');
    setNewPhotoDataUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsAddPhotoOpen(false);
  };

  // Delete photo
  const handleDeletePhoto = async (photoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirmAction({
      title: 'Delete Site Photo',
      message: 'Are you sure you want to remove this photo from the site progress gallery?',
      confirmText: 'Delete Photo',
      cancelText: 'Cancel',
      variant: 'danger',
      icon: 'trash'
    });
    if (!confirmed) return;
    removeProjectPhoto(projectIdKey, photoId);
    window.dispatchEvent(new CustomEvent('siteops_toast', { detail: 'Photo removed' }));
  };

  return (
    <div className="space-y-5">
      
      {/* Top Pill Switcher: [ Operational ] [ Financial ] (Exact Screenshot Match) */}
      <div className="flex items-center justify-between">
        <div className="p-1 bg-white border border-slate-200/90 rounded-full inline-flex items-center shadow-xs">
          <button
            type="button"
            onClick={() => setSubTab('operational')}
            className={`px-6 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              subTab === 'operational'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-transparent text-slate-500 hover:text-slate-900 font-semibold'
            }`}
          >
            Operational
          </button>
          <button
            type="button"
            onClick={() => setSubTab('financial')}
            className={`px-6 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              subTab === 'financial'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-transparent text-slate-500 hover:text-slate-900 font-semibold'
            }`}
          >
            Financial
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400 tracking-tight">
          <span>Site: {project.location || 'Chennai'}</span>
          <span>•</span>
          <span>Code: {project.code}</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. OPERATIONAL SUB-TAB (Matching User Reference Screenshots) */}
      {/* ========================================================= */}
      {subTab === 'operational' && (
        <div className="space-y-5">
          
          {/* ========================================================= */}
          {/* 1. UNIFIED PROJECT COMMAND HERO COCKPIT */}
          {/* ========================================================= */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 relative overflow-hidden">
            {/* Subtle background aesthetic gradient */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-red-50/50 via-slate-50/20 to-transparent rounded-full -mr-16 -mt-16 pointer-events-none" />

            {/* Cockpit Top Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100 relative">
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1 text-slate-600 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-red-500" />
                    <span>{project.location || 'Site Location'}</span>
                  </span>
                  {project.client_name && (
                    <span className="flex items-center gap-1 text-slate-600 font-medium">
                      <Users className="w-3.5 h-3.5 text-blue-500" />
                      <span>Client: <strong className="text-slate-800">{project.client_name}</strong></span>
                    </span>
                  )}
                </div>

              {/* Quick Action Navigation Shortcuts */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigateTab('task')}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-red-50 hover:text-red-700 border border-slate-200/80 text-xs font-bold text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <ListTodo className="w-3.5 h-3.5 text-red-600" />
                  <span>Tasks ({projectTasks.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('mom')}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-red-50 hover:text-red-700 border border-slate-200/80 text-xs font-bold text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <FileText className="w-3.5 h-3.5 text-purple-600" />
                  <span>MOM ({projectMoms.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddPhotoOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>+ Site Photo</span>
                </button>
              </div>
            </div>

            {/* Cockpit Core Metrics Grid (3 Seamless Functional Zones) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5 relative">
              
              {/* ZONE 1: Progress Radial Ring & Commercial Value */}
              <div className="flex items-center gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                {/* Dynamic Radial Progress Gauge */}
                <div className="relative w-20 h-20 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      className="text-slate-200"
                      strokeWidth="3.2"
                      stroke="currentColor"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      className="text-red-600 transition-all duration-700 ease-out"
                      strokeWidth="3.2"
                      strokeDasharray={`${overallTaskProgress}, 100`}
                      strokeLinecap="round"
                      stroke="currentColor"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-sm font-black text-slate-900 leading-none">
                      {overallTaskProgress}%
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                      Done
                    </span>
                  </div>
                </div>

                <div className="space-y-1 min-w-0">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Project Value
                  </span>
                  <div className="text-lg font-black text-slate-900 tracking-tight truncate">
                    ₹ {projectValue.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span className="truncate">{completedTasks} of {projectTasks.length} tasks finished</span>
                  </div>
                </div>
              </div>

              {/* ZONE 2: Dynamic Timeline & Schedule Track */}
              <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-red-600" />
                    <span>Project Schedule</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    timelineMetrics.isDelayed 
                      ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {timelineMetrics.isDelayed ? 'Overdue' : `${timelineMetrics.remainingDays} Days Left`}
                  </span>
                </div>

                {/* Visual Timeline Track */}
                <div className="my-2 space-y-1.5">
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden relative">
                    <div 
                      className="h-full bg-linear-to-r from-red-500 to-rose-600 rounded-full transition-all duration-500"
                      style={{ width: `${timelineMetrics.timelinePercent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-medium text-slate-400">
                    <span>Start: {formatDashDate(project.start_date)}</span>
                    <span>End: {formatDashDate(project.expected_end_date)}</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span>Actual Start: <strong>{formatDashDate(project.start_date)}</strong></span>
                  <span className="text-slate-400">Duration: {timelineMetrics.totalDays}d</span>
                </div>
              </div>

              {/* ZONE 3: Key Personnel & Supervision */}
              <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <HardHat className="w-3.5 h-3.5 text-amber-600" />
                    <span>Key Personnel</span>
                  </span>
                  <button
                    type="button"
                    onClick={onOpenTeamModal}
                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-white rounded-md transition-colors cursor-pointer"
                    title="Manage Personnel"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="py-1">
                  {projTeam.length === 0 ? (
                    <div className="text-xs text-slate-400 italic flex items-center justify-between">
                      <span>No team members assigned</span>
                      <button
                        type="button"
                        onClick={onOpenTeamModal}
                        className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer not-italic"
                      >
                        + Assign
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {projTeam.slice(0, 4).map((m, idx) => (
                          <div 
                            key={idx}
                            title={`${m.name} (${m.role || 'Team Member'})`}
                            className="w-7 h-7 rounded-full bg-slate-800 border-2 border-white text-white text-[9px] font-bold flex items-center justify-center shrink-0 shadow-2xs"
                          >
                            {(m.name || 'U').slice(0, 2).toUpperCase()}
                          </div>
                        ))}
                        {projTeam.length > 4 && (
                          <div className="w-7 h-7 rounded-full bg-red-100 border-2 border-white text-red-700 text-[9px] font-bold flex items-center justify-center shrink-0">
                            +{projTeam.length - 4}
                          </div>
                        )}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-700 truncate">
                        {projTeam[0]?.name} 
                        <span className="text-slate-400 font-normal text-[10px]"> — {projTeam[0]?.role || 'Lead'}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                  <span>Site Attendance:</span>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('attendance')}
                    className="text-red-600 font-bold hover:underline cursor-pointer"
                  >
                    View Roster →
                  </button>
                </div>
              </div>

            </div>
          </div>



          {/* ========================================================= */}
          {/* 3. COLLABORATION & SITE PROGRESS (MOM & PHOTOS) */}
          {/* ========================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            
            {/* CARD: Minutes of Meeting (MOM) */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between min-h-[260px]">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Minutes of Meeting (MOM)</h3>
                      <p className="text-[11px] text-slate-400">Client & site review discussions</p>
                    </div>
                    {projectMoms.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                        {projectMoms.length}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('mom')}
                    className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                  >
                    view all →
                  </button>
                </div>

                {projectMoms.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 space-y-1">
                    <FileText className="w-7 h-7 mx-auto text-slate-300" />
                    <p className="font-semibold text-slate-600">No meeting minutes recorded yet</p>
                    <p className="text-[11px] text-slate-400">Keep stakeholder decisions documented.</p>
                  </div>
                ) : (
                  <div className="space-y-2 py-1">
                    {projectMoms.slice(0, 3).map((m: any, idx: number) => (
                      <div 
                        key={m.id || idx} 
                        onClick={() => onNavigateTab('mom')}
                        className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/70 border border-slate-100 flex items-center justify-between text-xs cursor-pointer transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-slate-800 truncate block">{m.title || `Meeting #${idx + 1}`}</span>
                          <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                            {m.attendees ? `Attendees: ${m.attendees}` : 'Logged meeting discussion'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono tracking-tight shrink-0">{m.date || '--'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">Synced with MOM Module</span>
                <button
                  type="button"
                  onClick={() => onNavigateTab('mom')}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-red-50 hover:text-red-700 border border-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  + Add New Meeting
                </button>
              </div>
            </div>

            {/* CARD: Site Progress Photos */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between min-h-[260px]">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Site Progress Photos</h3>
                      <p className="text-[11px] text-slate-400">Visual progress gallery</p>
                    </div>
                    {photos.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-red-50 text-red-600 rounded-full border border-red-100">
                        {photos.length}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddPhotoOpen(true)}
                    className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                  >
                    + Add Photo
                  </button>
                </div>

                {/* Source Filter Chips */}
                {Array.from(new Set(photos.map(p => p.source || 'Site Photo'))).length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 mb-2 no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setActiveSourceFilter('ALL')}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                        activeSourceFilter === 'ALL' ? 'bg-red-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      All ({photos.length})
                    </button>
                    {Array.from(new Set(photos.map(p => p.source || 'Site Photo'))).map(src => {
                      const count = photos.filter(p => (p.source || 'Site Photo') === src).length;
                      return (
                        <button
                          key={src}
                          type="button"
                          onClick={() => setActiveSourceFilter(src)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                            activeSourceFilter === src ? 'bg-red-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {src} ({count})
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Photos Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-1">
                  {(activeSourceFilter === 'ALL' ? photos : photos.filter(p => (p.source || 'Site Photo') === activeSourceFilter)).slice(0, 5).map((ph) => (
                    <div 
                      key={ph.id} 
                      onClick={() => setSelectedPhotoForView(ph)}
                      className="group relative rounded-2xl overflow-hidden border border-slate-200 aspect-video bg-slate-100 cursor-pointer shadow-2xs hover:shadow-md transition-all"
                      title="Click to view full photo"
                    >
                      <img
                        src={ph.url}
                        alt={ph.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.2 rounded text-[8px] font-bold text-white bg-red-600/90 shadow-2xs">
                        {ph.source || 'Site'}
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-1.5 text-white">
                        <p className="text-[9px] font-semibold truncate leading-tight">{ph.title}</p>
                        <button
                          type="button"
                          onClick={(e) => handleDeletePhoto(ph.id, e)}
                          className="p-1 bg-red-600 hover:bg-red-700 rounded text-white transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add Placeholder Tile */}
                  <button
                    type="button"
                    onClick={() => setIsAddPhotoOpen(true)}
                    className="rounded-2xl border-2 border-dashed border-slate-200 hover:border-red-600 hover:bg-red-50/20 aspect-video flex flex-col items-center justify-center text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4 mb-1 text-slate-400 group-hover:text-red-600" />
                    <span className="text-[10px] font-semibold">Upload Photo</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-400">
                {photos.length === 0 
                  ? 'No site progress images uploaded yet' 
                  : `${photos.length} site progress image${photos.length > 1 ? 's' : ''} uploaded across project sections`}
              </div>
            </div>

          </div>

          {/* ========================================================= */}
          {/* 4. ATTENDANCE OVERVIEW (FOR NON-SOIL PROJECTS) */}
          {/* ========================================================= */}
          {!isSoilProject && (
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Attendance Overview</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Target vs Actual daily worker headcount
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab('attendance')}
                  className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                >
                  View Attendance Roster →
                </button>
              </div>

              {attendanceDays.length === 0 ? (
                <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Users className="w-6 h-6 mb-1.5 text-slate-300" />
                  <p>No attendance records logged for this period.</p>
                </div>
              ) : (
                <div className="h-36 flex items-end justify-between gap-3 pt-4 px-4 pb-2 border-b border-slate-100">
                  {attendanceDays.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className="w-full flex items-end justify-center gap-1 h-28">
                        <div 
                          className="w-3 bg-slate-300 rounded-t-xs"
                          style={{ height: `${(d.target / 25) * 100}%` }}
                          title={`Target: ${d.target}`}
                        />
                        <div 
                          className="w-3 bg-red-600 rounded-t-xs"
                          style={{ height: `${(d.actual / 25) * 100}%` }}
                          title={`Actual: ${d.actual}`}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{d.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 5. SUBCONTRACTOR & TRADE SUMMARY */}
          {/* ========================================================= */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Subcontractor & Trade Summary</h3>
                  <p className="text-xs text-slate-400">Trade contracts and execution status</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('subcon')}
                className="text-xs font-semibold text-red-600 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>View Subcontractors</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Dynamic Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Work Orders</div>
                <div className="text-xl font-black text-slate-900 mt-1">
                  {projectSubcons.length}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Assigned trades</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Contract</div>
                <div className="text-xl font-black text-slate-900 mt-1">
                  ₹ {projectSubcons.reduce((s: number, w: any) => s + (w.contract_amount || 0), 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Committed value</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Paid</div>
                <div className="text-xl font-black text-emerald-700 mt-1">
                  ₹ {projectSubcons.reduce((s: number, w: any) => s + (w.paid_amount || 0), 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Settled to date</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Balance Payable</div>
                <div className="text-xl font-black text-amber-700 mt-1">
                  ₹ {projectSubcons.reduce((s: number, w: any) => s + (w.balance_payable || 0), 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Pending release</div>
              </div>
            </div>

            {projectSubcons.length === 0 && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => onNavigateTab('subcon')}
                  className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                >
                  + Create First Work Order in Subcontractor Tab
                </button>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* 2. FINANCIAL SUB-TAB — COMPREHENSIVE 6-TAB FINANCE DASHBOARD */}
      {/* ========================================================= */}
      {subTab === 'financial' && (
        <div className="space-y-5">

          {/* Sub-Navigation for Finance: 6 Dedicated Views */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-2 shadow-xs flex items-center gap-1.5 overflow-x-auto select-none">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'transactions', label: 'Transactions', count: projectTransactions.length, icon: Receipt },
              { id: 'pending_allocation', label: 'Pending Allocation', count: unallocatedClientAdvances.length, alert: unallocatedClientAdvances.length > 0, icon: Coins },
              { id: 'pending_settlements', label: 'Pending Settlements', count: pendingSettlementItems.length, alert: pendingSettlementItems.length > 0, icon: Clock },
              { id: 'settled_history', label: 'Settled / History', count: settledItems.length + projectAllocations.length, icon: History },
              { id: 'client_ledger', label: 'Client Ledger', icon: BookOpen }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = financialView === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFinancialView(tab.id as FinancialView)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : tab.alert
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-slate-100 text-slate-500'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ────────────────────────────────────────────────────────── */}
          {/* TAB 1: OVERVIEW — 10 SPEC KPI CARDS & CHARTS               */}
          {/* ────────────────────────────────────────────────────────── */}
          {financialView === 'overview' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              {/* Row 1: Primary Agreed & Cash Totals (4 Cards) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Total BOQ Value (Reference Only) */}
                <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex justify-between relative overflow-hidden group">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500 font-semibold">Total BOQ Value</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700">Ref Only</span>
                    </div>
                    <div className="text-[20px] font-bold text-slate-900 mt-3 tracking-tight truncate">
                      ₹ {boqValue.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 truncate">
                      Agreed planned work value
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>

                {/* 2. Total Billed */}
                <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex justify-between">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 font-semibold">Total Billed</div>
                    <div className="text-[20px] font-bold text-slate-900 mt-3 tracking-tight truncate">
                      ₹ {finSummary.totalBilled.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 truncate">
                      Approved client invoice value
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Receipt className="w-5 h-5" />
                  </div>
                </div>

                {/* 3. Total Received (Actual Payments In) */}
                <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex justify-between">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 font-semibold">Total Received</div>
                    <div className="text-[20px] font-bold text-emerald-700 mt-3 tracking-tight truncate">
                      ₹ {finSummary.totalReceived.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 truncate">
                      {boqValue > 0 ? Math.round((finSummary.totalReceived / boqValue) * 100) : 0}% of agreed BOQ
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <ArrowDownRight className="w-5 h-5" />
                  </div>
                </div>

                {/* 4. Total Paid (Actual Payments Out) */}
                <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex justify-between">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 font-semibold">Total Paid</div>
                    <div className="text-[20px] font-bold text-rose-700 mt-3 tracking-tight truncate">
                      ₹ {finSummary.totalPaid.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 truncate">
                      Actual payments recorded Out
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                </div>

              </div>

              {/* Row 2: Advance & Outstanding Tracking (3 Cards) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* 5. Advance Received */}
                <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex justify-between">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 font-semibold">Advance Received</div>
                    <div className="text-[20px] font-bold text-purple-800 mt-3 tracking-tight truncate">
                      ₹ {finSummary.advanceReceived.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Unallocated: <span className="font-bold text-purple-700">₹ {finSummary.unallocatedClientAdvance.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                    <Coins className="w-5 h-5" />
                  </div>
                </div>

                {/* 6. Advance Paid */}
                <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex justify-between">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 font-semibold">Advance Paid</div>
                    <div className="text-[20px] font-bold text-amber-700 mt-3 tracking-tight truncate">
                      ₹ {finSummary.advancePaid.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 truncate">
                      Paid to suppliers & subcontractors
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Coins className="w-5 h-5" />
                  </div>
                </div>

                {/* 7. Outstanding Balance */}
                <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex justify-between">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 font-semibold">Outstanding Balance</div>
                    <div className="text-[20px] font-bold text-slate-900 mt-3 tracking-tight truncate">
                      ₹ {finSummary.outstandingBalance.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 truncate">
                      Remaining expected payment
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>

              </div>

              {/* Row 3: Receivables, Liabilities & Settled (3 Cards) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* 8. To Receive */}
                <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex justify-between">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 font-semibold">To Receive</div>
                    <div className="text-[20px] font-bold text-emerald-800 mt-3 tracking-tight truncate">
                      ₹ {finSummary.toReceive.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 truncate">
                      Approved client receivables
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>

                {/* 9. To Pay */}
                <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex justify-between">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 font-semibold">To Pay</div>
                    <div className="text-[20px] font-bold text-amber-800 mt-3 tracking-tight truncate">
                      ₹ {finSummary.toPay.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 truncate">
                      Outstanding vendor & subcon liabilities
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>

                {/* 10. Settled Transactions */}
                <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex justify-between">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 font-semibold">Settled Obligations</div>
                    <div className="text-[20px] font-bold text-purple-700 mt-3 tracking-tight truncate">
                      {settledItems.length + finSummary.settledTransactionsCount} Closed
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 truncate">
                      Fully allocated & paid items
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>

              </div>

              {/* Budget vs Expense by Cost Code */}
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-[13px] font-bold text-slate-900">Budget Vs Expense by Cost Code</h3>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Cost codes where expense exceeds budget. % shown as variance.
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => onNavigateTab('transaction')}
                    className="text-[11px] text-purple-700 font-bold hover:underline cursor-pointer"
                  >
                    + Add Transaction
                  </button>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setCostCodeFilter('all')}
                    className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                      costCodeFilter === 'all' 
                        ? 'bg-purple-700 text-white' 
                        : 'border border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                    }`}
                  >
                    All ({finSummary.costCodeBreakdown.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCostCodeFilter('over')}
                    className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                      costCodeFilter === 'over' 
                        ? 'bg-rose-600 text-white' 
                        : 'border border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                    }`}
                  >
                    Over Budget ({finSummary.overBudgetCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCostCodeFilter('under')}
                    className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                      costCodeFilter === 'under' 
                        ? 'bg-emerald-700 text-white' 
                        : 'border border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                    }`}
                  >
                    Under Budget ({finSummary.underBudgetCount})
                  </button>
                </div>

                {/* Cost Code Rows or Empty State */}
                {finSummary.costCodeBreakdown.length === 0 ? (
                  <div className="text-center text-[12px] text-slate-400 py-6 border border-dashed border-slate-200 rounded-xl my-2">
                    No expense cost codes logged for this project yet. Expenses recorded in the Transaction tab will appear here automatically.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {finSummary.costCodeBreakdown
                      .filter(c => {
                        if (costCodeFilter === 'over') return c.isOverBudget;
                        if (costCodeFilter === 'under') return !c.isOverBudget;
                        return true;
                      })
                      .map((c, idx) => (
                        <div key={idx} className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-slate-900">{c.code}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Budget benchmark: ₹ {c.budget.toLocaleString('en-IN')}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-slate-900">
                              ₹ {c.expense.toLocaleString('en-IN')}
                            </div>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                              c.isOverBudget 
                                ? 'bg-rose-100 text-rose-700' 
                                : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {c.isOverBudget ? `+${c.variance}% Over` : `${c.variance}% Used`}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Payables vs Receivables & Salary Expense */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Payables vs Receivables */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[13px] font-bold text-slate-900">Payables vs Receivables</h3>
                    <span className="text-[11px] font-medium text-slate-400">
                      Total: ₹ {(payables + receivables).toLocaleString('en-IN')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-center my-6">
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <circle
                          cx="18"
                          cy="18"
                          r="15.9155"
                          fill="none"
                          className="text-slate-100"
                          stroke="currentColor"
                          strokeWidth="3.5"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="15.9155"
                          fill="none"
                          className="text-[#3baf57] transition-all duration-500"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          strokeDasharray={
                            (payables + receivables > 0)
                              ? `${(receivables / (payables + receivables)) * 100}, 100`
                              : "100, 100"
                          }
                          strokeDashoffset="0"
                        />
                        {payables + receivables > 0 && payables > 0 && (
                          <circle
                            cx="18"
                            cy="18"
                            r="15.9155"
                            fill="none"
                            className="text-rose-500 transition-all duration-500"
                            stroke="currentColor"
                            strokeWidth="3.5"
                            strokeDasharray={`${(payables / (payables + receivables)) * 100}, 100`}
                            strokeDashoffset={String(-((receivables / (payables + receivables)) * 100))}
                          />
                        )}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Net Cash</span>
                        <span className="text-xs font-black text-slate-800">
                          ₹ {netWorkingCap >= 100000 ? `${(netWorkingCap / 100000).toFixed(1)}L` : netWorkingCap.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mt-6">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <span className="text-slate-600">Payable (Vendors/Subcons)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">₹ {payables.toLocaleString('en-IN')}</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          ({(payables + receivables) > 0 ? Math.round((payables / (payables + receivables)) * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#3baf57]" />
                        <span className="text-slate-600">Receivable (Client Balance)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">₹ {receivables.toLocaleString('en-IN')}</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          ({(payables + receivables) > 0 ? Math.round((receivables / (payables + receivables)) * 100) : 100}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Salary Expense */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[13px] font-bold text-slate-900">Salary Expense</h3>
                    <span className="text-[11px] font-medium text-slate-500">
                      Total: ₹ {(siteStaffExpense + labourContractorExpense + officeStaffExpense).toLocaleString('en-IN')}
                    </span>
                  </div>
                  
                  {(() => {
                    const totalSal = siteStaffExpense + labourContractorExpense + officeStaffExpense;
                    const sitePct = totalSal > 0 ? Math.round((siteStaffExpense / totalSal) * 100) : 0;
                    const labourPct = totalSal > 0 ? Math.round((labourContractorExpense / totalSal) * 100) : 0;
                    const officePct = totalSal > 0 ? Math.max(0, 100 - sitePct - labourPct) : 0;

                    return (
                      <div className="py-6 space-y-4">
                        <div className="w-full bg-slate-100 h-4 rounded-xl overflow-hidden flex shadow-inner">
                          {sitePct > 0 && (
                            <div 
                              className="bg-purple-700 h-full transition-all duration-300" 
                              style={{ width: `${sitePct}%` }}
                              title={`Site Staff: ${sitePct}%`}
                            />
                          )}
                          {labourPct > 0 && (
                            <div 
                              className="bg-amber-500 h-full transition-all duration-300" 
                              style={{ width: `${labourPct}%` }}
                              title={`Labour: ${labourPct}%`}
                            />
                          )}
                          {officePct > 0 && (
                            <div 
                              className="bg-blue-500 h-full transition-all duration-300" 
                              style={{ width: `${officePct}%` }}
                              title={`Office Staff: ${officePct}%`}
                            />
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center pt-2">
                          <div className="p-2 rounded-lg bg-purple-50 border border-purple-100">
                            <div className="text-[10px] font-bold text-purple-700 uppercase">Site Staff</div>
                            <div className="text-xs font-bold text-slate-900 mt-0.5">{sitePct}%</div>
                          </div>
                          <div className="p-2 rounded-lg bg-amber-50 border border-amber-100">
                            <div className="text-[10px] font-bold text-amber-700 uppercase">Labour</div>
                            <div className="text-xs font-bold text-slate-900 mt-0.5">{labourPct}%</div>
                          </div>
                          <div className="p-2 rounded-lg bg-blue-50 border border-blue-100">
                            <div className="text-[10px] font-bold text-blue-700 uppercase">Office</div>
                            <div className="text-xs font-bold text-slate-900 mt-0.5">{officePct}%</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  
                  <div className="space-y-3 mt-2 border-t border-slate-100 pt-3">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-700" />
                        <span className="text-slate-600">Site Staff</span>
                      </div>
                      <div className="flex gap-4 w-28 justify-end">
                        <span className="font-bold text-slate-900">₹ {siteStaffExpense.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-slate-600">Labour Contractor</span>
                      </div>
                      <div className="flex gap-4 w-28 justify-end">
                        <span className="font-bold text-slate-900">₹ {labourContractorExpense.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-slate-600">Office Staff</span>
                      </div>
                      <div className="flex gap-4 w-28 justify-end">
                        <span className="font-bold text-slate-900">₹ {officeStaffExpense.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* TAB 2: TRANSACTIONS — REAL PROJECT FINANCIAL RECORDS       */}
          {/* ────────────────────────────────────────────────────────── */}
          {financialView === 'transactions' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Controls Filter Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search transactions by party, reference, or note..."
                      value={finTxSearch}
                      onChange={(e) => setFinTxSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                    />
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    {(['ALL', 'IN', 'OUT'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFinTxTypeFilter(t)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                          finTxTypeFilter === t
                            ? 'bg-white text-purple-700 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        {t === 'ALL' ? 'All' : (t === 'IN' ? 'Payment In' : 'Payment Out')}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigateTab('transaction')}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Record New Transaction</span>
                </button>
              </div>

              {/* Transactions Table */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                {(() => {
                  const filtered = projectTransactions.filter(t => {
                    if (finTxTypeFilter === 'IN' && t.type !== 'IN') return false;
                    if (finTxTypeFilter === 'OUT' && t.type !== 'OUT') return false;
                    if (finTxSearch.trim()) {
                      const q = finTxSearch.toLowerCase();
                      const matchParty = t.party_name?.toLowerCase().includes(q);
                      const matchNumber = t.transaction_number?.toLowerCase().includes(q);
                      const matchNotes = t.notes?.toLowerCase().includes(q);
                      const matchRef = t.reference_no?.toLowerCase().includes(q);
                      if (!matchParty && !matchNumber && !matchNotes && !matchRef) return false;
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                        <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="font-semibold text-slate-700">No transactions found</p>
                        <p className="text-[11px] text-slate-400">Record payments in the Transaction tab to update project finance records.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="text-[10px] uppercase font-bold text-slate-500 bg-purple-50/50 border-b border-slate-200/80 select-none">
                          <tr>
                            <th className="py-3 px-4">Date</th>
                            <th className="py-3 px-4">Tx # & Party</th>
                            <th className="py-3 px-4">Type / Category</th>
                            <th className="py-3 px-4">Payment Mode</th>
                            <th className="py-3 px-4">Advance Status</th>
                            <th className="py-3 px-4 text-right">Amount</th>
                            <th className="py-3 px-4 text-center">Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {filtered.map((tx) => {
                            const isReversed = tx.status === 'REVERSED' || tx.is_reversed;
                            const isAdvance = tx.payment_category === 'CLIENT_ADVANCE' || tx.category === 'Client Advance' || tx.transaction_sub_type === 'Client Advance';
                            const advBal = isAdvance ? getTransactionAdvanceBalance(tx) : null;

                            return (
                              <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                                  {tx.date}
                                  <span className="text-[10px] text-slate-400 block font-normal">{tx.time || ''}</span>
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <div className="font-bold text-slate-900">{tx.party_name}</div>
                                  <span className="text-[10px] text-purple-700 font-mono block">{tx.transaction_number}</span>
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                                    tx.type === 'IN' 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}>
                                    {tx.type === 'IN' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                    <span>{tx.payment_category || tx.transaction_sub_type || (tx.type === 'IN' ? 'Payment In' : 'Payment Out')}</span>
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                                  {tx.payment_mode || 'Cash'}
                                  {tx.bank_name && <span className="text-[10px] text-slate-400 block">{tx.bank_name}</span>}
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  {isAdvance && advBal && !isReversed ? (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                      advBal.unallocatedAmount > 0 
                                        ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    }`}>
                                      {advBal.unallocatedAmount > 0 
                                        ? `Unallocated: ₹${advBal.unallocatedAmount.toLocaleString('en-IN')}` 
                                        : 'Fully Allocated'}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-[11px]">-</span>
                                  )}
                                </td>
                                <td className={`py-3.5 px-4 text-right font-bold whitespace-nowrap ${
                                  isReversed ? 'text-slate-400 line-through' : (tx.type === 'IN' ? 'text-emerald-700' : 'text-slate-900')
                                }`}>
                                  {tx.type === 'IN' ? '+' : '-'} ₹ {Number(tx.amount).toLocaleString('en-IN')}
                                </td>
                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    isReversed
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  }`}>
                                    {isReversed ? 'Reversed' : 'Approved'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {isAdvance && advBal && advBal.unallocatedAmount > 0 && !isReversed && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setFinTxForAllocation(tx);
                                          setIsFinAllocateModalOpen(true);
                                        }}
                                        className="px-2.5 py-1 text-[10px] font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow-2xs cursor-pointer transition-transform active:scale-95"
                                      >
                                        Allocate
                                      </button>
                                    )}
                                    {!isReversed && (
                                      <button
                                        type="button"
                                        onClick={() => handleReverseTransactionInFin(tx)}
                                        className="px-2 py-1 text-[10px] font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                        title="Controlled reversal"
                                      >
                                        Reverse
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

            </div>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* TAB 3: PENDING ALLOCATION — UNALLOCATED CLIENT ADVANCES    */}
          {/* ────────────────────────────────────────────────────────── */}
          {financialView === 'pending_allocation' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Informational Banner */}
              <div className="p-4 bg-purple-50/70 rounded-xl border border-purple-200/80 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Coins className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs text-purple-950">Reusable Client Advance Pool</h4>
                    <p className="text-[11px] text-purple-800/80 mt-0.5">
                      Client advances recorded in Transactions are held here until allocated to specific BOQ work items or milestones.
                      Allocations link fulfillment without creating duplicate cash movements.
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] text-purple-700 font-semibold uppercase tracking-wider">Unallocated Total</div>
                  <div className="text-lg font-black text-purple-900 mt-0.5">
                    ₹ {finSummary.unallocatedClientAdvance.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Unallocated Advances List */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                {unallocatedClientAdvances.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="font-bold text-slate-700">All Client Advances Are Fully Allocated</p>
                    <p className="text-[11px] text-slate-400">
                      There are no idle client advances waiting to be assigned to work. New Client Advance payments recorded in Transactions will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="text-[10px] uppercase font-bold text-slate-500 bg-purple-50/50 border-b border-slate-200/80 select-none">
                        <tr>
                          <th className="py-3 px-4">Tx # & Date</th>
                          <th className="py-3 px-4">Client / Party</th>
                          <th className="py-3 px-4">Total Received</th>
                          <th className="py-3 px-4">Allocated So Far</th>
                          <th className="py-3 px-4">Available Unallocated</th>
                          <th className="py-3 px-4">Payment Mode</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {unallocatedClientAdvances.map((tx) => {
                          const bal = getTransactionAdvanceBalance(tx);
                          return (
                            <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className="font-bold font-mono text-purple-700">{tx.transaction_number}</span>
                                <span className="text-[10px] text-slate-400 block">{tx.date}</span>
                              </td>
                              <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                                {tx.party_name}
                              </td>
                              <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap font-semibold">
                                ₹ {Number(tx.amount).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                                ₹ {bal.allocatedAmount.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                                  ₹ {bal.unallocatedAmount.toLocaleString('en-IN')}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                                {tx.payment_mode || 'Cash'}
                              </td>
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFinTxForAllocation(tx);
                                    setIsFinAllocateModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                  <span>Allocate to Work</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* TAB 4: PENDING SETTLEMENTS — WORK ITEMS PENDING PAYMENT     */}
          {/* ────────────────────────────────────────────────────────── */}
          {financialView === 'pending_settlements' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Informational Banner */}
              <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200/80 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs text-amber-950">Pending Work Item Settlements</h4>
                    <p className="text-[11px] text-amber-800/80 mt-0.5">
                      Planned BOQ work items with outstanding receivable balances. Work items are settled through direct Work Payments or by allocating client advances.
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] text-amber-700 font-semibold uppercase tracking-wider">Total Pending Balance</div>
                  <div className="text-lg font-black text-amber-900 mt-0.5">
                    ₹ {pendingSettlementItems.reduce((s, w) => s + w.outstanding_amount, 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Pending Work Items Table */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                {pendingSettlementItems.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="font-bold text-slate-700">All BOQ Work Items Are Fully Settled</p>
                    <p className="text-[11px] text-slate-400">Every planned work item has received full payment or advance allocation.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="text-[10px] uppercase font-bold text-slate-500 bg-purple-50/50 border-b border-slate-200/80 select-none">
                        <tr>
                          <th className="py-3 px-4">BOQ # & Title</th>
                          <th className="py-3 px-4">Work Item Description</th>
                          <th className="py-3 px-4 text-right">Planned BOQ Amount</th>
                          <th className="py-3 px-4 text-right">Direct Received</th>
                          <th className="py-3 px-4 text-right">Allocated Advance</th>
                          <th className="py-3 px-4 text-right">Outstanding Due</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {pendingSettlementItems.map((w, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="font-bold font-mono text-purple-700">{w.boq_number}</span>
                              <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">{w.boq_title}</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900">{w.item.description || w.item.item_name}</div>
                              <span className="text-[10px] text-slate-400 block">
                                {w.item.quantity} {(w.item as any).unit_of_measurement || w.item.unit} @ ₹{w.item.unit_rate}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                              ₹ {w.planned_amount.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4 text-right text-emerald-700 whitespace-nowrap">
                              ₹ {w.direct_received.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4 text-right text-purple-700 whitespace-nowrap">
                              ₹ {w.allocated_advance.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-amber-700 whitespace-nowrap">
                              ₹ {w.outstanding_amount.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                w.status === 'PARTIALLY_SETTLED'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {w.status === 'PARTIALLY_SETTLED' ? 'Partially Settled' : 'Pending'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => onNavigateTab('transaction')}
                                className="px-2.5 py-1 text-[10px] font-bold text-purple-700 hover:text-white hover:bg-purple-700 border border-purple-200 hover:border-transparent rounded-lg transition-all cursor-pointer"
                              >
                                Record Payment →
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* TAB 5: SETTLED / HISTORY — CLOSED OBLIGATIONS & AUDIT      */}
          {/* ────────────────────────────────────────────────────────── */}
          {financialView === 'settled_history' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* History Sub-View Toggle */}
              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setHistorySubView('settled_items')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      historySubView === 'settled_items'
                        ? 'bg-purple-700 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Settled Obligations ({settledItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistorySubView('allocations')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      historySubView === 'allocations'
                        ? 'bg-purple-700 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Advance Allocations History ({projectAllocations.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistorySubView('audit_log')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      historySubView === 'audit_log'
                        ? 'bg-purple-700 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Financial Audit Trail ({projectAuditLogs.length})
                  </button>
                </div>
              </div>

              {/* Sub-View 1: Settled Obligations */}
              {historySubView === 'settled_items' && (
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                  {settledItems.length === 0 ? (
                    <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                      <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-700">No Obligations Fully Settled Yet</p>
                      <p className="text-[11px] text-slate-400">Work items will appear here once their full planned value is allocated or received.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="text-[10px] uppercase font-bold text-slate-500 bg-purple-50/50 border-b border-slate-200/80 select-none">
                          <tr>
                            <th className="py-3 px-4">BOQ #</th>
                            <th className="py-3 px-4">Work Item Description</th>
                            <th className="py-3 px-4 text-right">Agreed Value</th>
                            <th className="py-3 px-4 text-right">Settled Amount</th>
                            <th className="py-3 px-4">Linked Tx References</th>
                            <th className="py-3 px-4 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {settledItems.map((w, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-4 font-bold font-mono text-purple-700 whitespace-nowrap">
                                {w.boq_number}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-slate-900">{w.item.description || w.item.item_name}</div>
                              </td>
                              <td className="py-3.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                                ₹ {w.planned_amount.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3.5 px-4 text-right font-bold text-emerald-700 whitespace-nowrap">
                                ₹ {w.total_received_allocated.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                                {w.linked_tx_refs.length > 0 ? w.linked_tx_refs.join(', ') : 'Direct Settlement'}
                              </td>
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Fully Settled
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-View 2: Advance Allocations History */}
              {historySubView === 'allocations' && (
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                  {projectAllocations.length === 0 ? (
                    <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                      <Coins className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-700">No Advance Allocations Recorded</p>
                      <p className="text-[11px] text-slate-400">Allocations made in the Transactions or Pending Allocation tab will appear here.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="text-[10px] uppercase font-bold text-slate-500 bg-purple-50/50 border-b border-slate-200/80 select-none">
                          <tr>
                            <th className="py-3 px-4">Date</th>
                            <th className="py-3 px-4">Source Advance</th>
                            <th className="py-3 px-4">Allocated To (BOQ & Work)</th>
                            <th className="py-3 px-4 text-right">Allocated Amount</th>
                            <th className="py-3 px-4 text-center">Status</th>
                            <th className="py-3 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {projectAllocations.map((alloc) => {
                            const isReversed = alloc.status === 'REVERSED';
                            return (
                              <tr key={alloc.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                                  {alloc.allocation_date}
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <span className="font-bold font-mono text-purple-700">
                                    {alloc.source_transaction_number || alloc.source_transaction_id}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-slate-900">{alloc.boq_item_name || alloc.milestone_name || 'Work Item'}</div>
                                  <span className="text-[10px] text-slate-400 block">{alloc.boq_number}</span>
                                </td>
                                <td className={`py-3.5 px-4 text-right font-bold whitespace-nowrap ${
                                  isReversed ? 'text-slate-400 line-through' : 'text-purple-700'
                                }`}>
                                  ₹ {Number(alloc.allocated_amount).toLocaleString('en-IN')}
                                </td>
                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    isReversed
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  }`}>
                                    {isReversed ? 'Reversed' : 'Active'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                  {!isReversed && (
                                    <button
                                      type="button"
                                      onClick={() => handleReverseAllocationInFin(alloc.id)}
                                      className="px-2 py-1 text-[10px] font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    >
                                      Reverse
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-View 3: Financial Audit Trail */}
              {historySubView === 'audit_log' && (
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                  {projectAuditLogs.length === 0 ? (
                    <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                      <History className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-700">No Financial Audit Records</p>
                      <p className="text-[11px] text-slate-400">All financial modifications, allocations, and reversals are automatically audited.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="text-[10px] uppercase font-bold text-slate-500 bg-purple-50/50 border-b border-slate-200/80 select-none">
                          <tr>
                            <th className="py-3 px-4">Timestamp</th>
                            <th className="py-3 px-4">Action</th>
                            <th className="py-3 px-4">Entity</th>
                            <th className="py-3 px-4 text-right">Amount</th>
                            <th className="py-3 px-4">User</th>
                            <th className="py-3 px-4">Details / Rationale</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {projectAuditLogs.map((log) => {
                            let formattedTs = log.timestamp;
                            try {
                              formattedTs = new Date(log.timestamp).toLocaleString('en-IN', {
                                dateStyle: 'short',
                                timeStyle: 'short'
                              });
                            } catch {}

                            return (
                              <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                                  {formattedTs}
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                    log.action === 'REVERSE' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                    'bg-purple-50 text-purple-700 border border-purple-200'
                                  }`}>
                                    {log.action}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                                  {log.entity_type}
                                </td>
                                <td className="py-3.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                                  {log.amount !== undefined ? `₹ ${Number(log.amount).toLocaleString('en-IN')}` : '-'}
                                </td>
                                <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                                  {log.performed_by}
                                </td>
                                <td className="py-3.5 px-4 text-slate-700">
                                  {log.details}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* TAB 6: CLIENT LEDGER — STATEMENT OF ACCOUNT                */}
          {/* ────────────────────────────────────────────────────────── */}
          {financialView === 'client_ledger' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Statement Header Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">Client Ledger</span>
                    <h3 className="font-bold text-sm text-slate-900">{project.client_name || 'Client Account'}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Project: <span className="font-semibold text-slate-800">{project.name}</span> • Statement as of {new Date().toLocaleDateString('en-GB')}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right px-3 py-1 bg-purple-50 rounded-lg border border-purple-100">
                    <div className="text-[10px] text-purple-700 font-bold uppercase">Net Balance Due</div>
                    <div className="text-sm font-black text-purple-900">
                      ₹ {finSummary.outstandingBalance.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>Print Statement</span>
                  </button>
                </div>
              </div>

              {/* Statement Summary KPI Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Total Debited (Billed)</div>
                  <div className="text-base font-bold text-slate-900 mt-1">
                    ₹ {clientLedgerEntries.reduce((s, r) => s + r.debit, 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Total Credited (Paid)</div>
                  <div className="text-base font-bold text-emerald-700 mt-1">
                    ₹ {clientLedgerEntries.reduce((s, r) => s + r.credit, 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Closing Receivable</div>
                  <div className="text-base font-bold text-purple-700 mt-1">
                    ₹ {finSummary.outstandingBalance.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Running Balance Statement Table */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                {clientLedgerEntries.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                    <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-700">No Ledger Entries Yet</p>
                    <p className="text-[11px] text-slate-400">BOQ billing and client payment receipts will appear in this chronological statement.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="text-[10px] uppercase font-bold text-slate-500 bg-purple-50/50 border-b border-slate-200/80 select-none">
                        <tr>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Ref / Vch #</th>
                          <th className="py-3 px-4">Particulars / Description</th>
                          <th className="py-3 px-4 text-right">Debit (₹)</th>
                          <th className="py-3 px-4 text-right">Credit (₹)</th>
                          <th className="py-3 px-4 text-right">Balance (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {clientLedgerEntries.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                              {row.date}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-purple-700 whitespace-nowrap">
                              {row.ref_no}
                            </td>
                            <td className="py-3.5 px-4 text-slate-800">
                              {row.description}
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                              {row.debit > 0 ? `₹ ${row.debit.toLocaleString('en-IN')}` : '-'}
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-emerald-700 whitespace-nowrap">
                              {row.credit > 0 ? `₹ ${row.credit.toLocaleString('en-IN')}` : '-'}
                            </td>
                            <td className={`py-3.5 px-4 text-right font-bold whitespace-nowrap ${
                              row.balance > 0 ? 'text-purple-700' : 'text-slate-900'
                            }`}>
                              ₹ {row.balance.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      )}

      {/* UPLOAD PHOTO MODAL */}
      {isAddPhotoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Upload Project Photo</h3>
                  <p className="text-xs text-slate-500">{project.name}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setIsAddPhotoOpen(false);
                  setNewPhotoDataUrl(null);
                  setNewPhotoTitle('');
                }} 
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoFileChange}
              accept="image/*"
              className="hidden"
            />

            <form onSubmit={handleAddPhoto} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Photo Description / Milestone
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Column casting concrete vibration check"
                  value={newPhotoTitle}
                  onChange={(e) => setNewPhotoTitle(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Project Section / Tag
                </label>
                <CustomSelect
                  value={newPhotoSource}
                  onChange={(val) => setNewPhotoSource(val as any)}
                  options={[
                    { label: 'Site Progress (Overview)', value: 'Site Photo' },
                    { label: 'Design & Drawings', value: 'Design' },
                    { label: 'Material & Delivery', value: 'Material' },
                    { label: 'Files & Reports', value: 'Files' },
                    { label: 'BOQ & Measurements', value: 'BOQ' },
                  ]}
                  size="md"
                  variant="brand"
                />
              </div>

              {/* Photo Upload Dropzone (Interactive File Picker) */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDropPhoto}
                className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
                  newPhotoDataUrl 
                    ? 'border-red-400 bg-red-50/20' 
                    : 'border-slate-200 hover:border-red-600 hover:bg-slate-50'
                }`}
              >
                {newPhotoDataUrl ? (
                  <div className="space-y-2">
                    <img 
                      src={newPhotoDataUrl} 
                      alt="Selected preview" 
                      className="max-h-44 w-auto mx-auto rounded-lg object-contain shadow-xs border border-slate-200"
                    />
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <span className="text-[11px] font-semibold text-slate-700">Photo selected</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewPhotoDataUrl(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="text-[10px] text-red-600 font-bold hover:underline cursor-pointer"
                      >
                        Change Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                    <div className="text-xs font-semibold text-slate-700">Select site picture or drop file</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">JPEG or PNG up to 15MB</div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddPhotoOpen(false);
                    setNewPhotoDataUrl(null);
                    setNewPhotoTitle('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPhotoDataUrl}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-all ${
                    newPhotoDataUrl 
                      ? 'text-white bg-red-600 hover:bg-red-700 cursor-pointer active:scale-95' 
                      : 'text-slate-400 bg-slate-100 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Photo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL-SIZE PHOTO VIEWER / LIGHTBOX */}
      {selectedPhotoForView && (
        <div 
          onClick={() => setSelectedPhotoForView(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl cursor-default animate-in zoom-in-95 duration-150"
          >
            <div className="relative bg-slate-900 flex items-center justify-center max-h-[75vh]">
              <img 
                src={selectedPhotoForView.url} 
                alt={selectedPhotoForView.title}
                className="max-h-[75vh] w-auto object-contain"
              />
              <button
                type="button"
                onClick={() => setSelectedPhotoForView(null)}
                className="absolute top-3 right-3 p-2 bg-slate-900/70 hover:bg-slate-900 text-white rounded-full transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-white flex items-center justify-between border-t border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold text-white ${
                    selectedPhotoForView.source === 'Design' || selectedPhotoForView.source === 'BOQ' ? 'bg-red-600' :
                    selectedPhotoForView.source === 'Material' ? 'bg-emerald-600' :
                    selectedPhotoForView.source === 'Files' ? 'bg-amber-600' :
                    selectedPhotoForView.source === 'Task' ? 'bg-cyan-700' :
                    'bg-red-600'
                  }`}>
                    {selectedPhotoForView.source || 'Site Photo'}
                  </span>
                  <h4 className="font-bold text-sm text-slate-900">{selectedPhotoForView.title}</h4>
                </div>
                <p className="text-xs text-slate-500 mt-1">{selectedPhotoForView.date} • {project.name}</p>
                {selectedPhotoForView.details && (
                  <p className="text-[11px] text-slate-600 mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    {selectedPhotoForView.details}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhotoForView(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer shrink-0"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advance Allocation Modal inside Finance */}
      {isFinAllocateModalOpen && finTxForAllocation && (
        <AllocateAdvanceModal
          isOpen={isFinAllocateModalOpen}
          onClose={() => {
            setIsFinAllocateModalOpen(false);
            setFinTxForAllocation(null);
          }}
          sourceTransaction={finTxForAllocation}
          project={project}
          onSuccess={(msg) => {
            setIsFinAllocateModalOpen(false);
            setFinTxForAllocation(null);
            syncProjectFinancialsToStorage(project.id, project.code, project.name);
            setFinSummary(calculateProjectFinancialSummary(project));
            window.dispatchEvent(new CustomEvent('booshnam_finance_updated', { detail: { projectId: project.id } }));
            window.dispatchEvent(new CustomEvent('siteops_toast', { detail: msg }));
          }}
        />
      )}

    </div>
  );
};

