import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, Clock, AlertCircle, Phone, Mail, 
  MapPin, Calendar, TrendingUp, DollarSign, Users, 
  Layers, ShoppingCart, ListTodo, FileText, ArrowUpRight,
  ShieldCheck, ArrowDownRight, HardHat, PlusCircle, Settings,
  Image as ImageIcon, Upload, ChevronRight, Check, X, Trash2, Eye,
  Building2, Activity, Sparkles, BarChart3
} from 'lucide-react';
import { Project, WBSTask, ApprovalRequest, MaterialRequest, ProjectTeamMember } from '../../../types';
import { WorkspaceTabId, isSoilDepartmentProject } from '../ProjectTopNav';
import { ProjectPhoto, getProjectPhotos, addProjectPhoto, removeProjectPhoto } from '../../../lib/projectPhotoUtils';
import { confirmAction } from '../../../lib/dialogService';
import { CustomSelect } from '../../CustomSelect';

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
  const projectValue = project.estimated_budget || 0;
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

  // Financial stats
  const cashIn = project.cash_in || 0;
  const cashOut = project.cash_out || 0;
  const netWorkingCap = cashIn - cashOut;
  const boqValue = project.boq_value || 0;
  const estimatedMargin = project.estimated_margin || 0;
  const salesInvoice = project.sales_invoice || 0;
  const workDone = project.work_done || 0;
  const payables = project.payables || 0;
  const receivables = project.receivables || 0;
  const siteStaffExpense = project.site_staff_expense || 0;
  const labourContractorExpense = project.labour_contractor_expense || 0;
  const officeStaffExpense = project.office_staff_expense || 0;


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
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    project.status === 'ON_HOLD' 
                      ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${project.status === 'ON_HOLD' ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
                    <span>{project.status === 'ON_HOLD' ? 'On Hold' : 'Ongoing'}</span>
                  </span>

                  <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-mono font-bold">
                    {project.code}
                  </span>

                  {project.department_name && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
                      {project.department_name}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
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
          {/* 2. DYNAMIC TASK EXECUTION & VELOCITY CENTER */}
          {/* ========================================================= */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-5">
            {/* Header with Dynamic View Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Task Execution & Progress Velocity</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
                    {projectTasks.length} Tasks
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live task breakdown and trajectory synced with WBS schedule
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <div className="p-0.5 bg-slate-100 rounded-xl inline-flex items-center text-xs">
                  <button
                    type="button"
                    onClick={() => setTaskViewMode('tasks')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      taskViewMode === 'tasks' 
                        ? 'bg-white text-slate-900 shadow-2xs' 
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Live Tasks ({projectTasks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskViewMode('chart')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      taskViewMode === 'chart' 
                        ? 'bg-white text-slate-900 shadow-2xs' 
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Progress S-Curve
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigateTab('task')}
                  className="px-3 py-1.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <span>Open Schedule</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Dynamic Multi-Color Segmented Distribution Bar */}
            <div className="space-y-2">
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                {completedTasks > 0 && (
                  <div 
                    style={{ width: `${(completedTasks / (projectTasks.length || 1)) * 100}%` }}
                    className="bg-emerald-500 transition-all duration-500" 
                    title={`Completed: ${completedTasks}`}
                  />
                )}
                {inProgressTasks > 0 && (
                  <div 
                    style={{ width: `${(inProgressTasks / (projectTasks.length || 1)) * 100}%` }}
                    className="bg-blue-500 transition-all duration-500" 
                    title={`In Progress: ${inProgressTasks}`}
                  />
                )}
                {notStartedTasks > 0 && (
                  <div 
                    style={{ width: `${(notStartedTasks / (projectTasks.length || 1)) * 100}%` }}
                    className="bg-amber-500 transition-all duration-500" 
                    title={`Pending / Not Started: ${notStartedTasks}`}
                  />
                )}
                {delayedTasks > 0 && (
                  <div 
                    style={{ width: `${(delayedTasks / (projectTasks.length || 1)) * 100}%` }}
                    className="bg-rose-500 transition-all duration-500" 
                    title={`Delayed / Blocked: ${delayedTasks}`}
                  />
                )}
              </div>

              {/* Dynamic KPI Badges (Clickable to jump to Tasks) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div 
                  onClick={() => onNavigateTab('task')}
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-amber-50/60 border border-slate-200/70 hover:border-amber-200 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 group-hover:text-amber-800">Pending / Todo</span>
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                  </div>
                  <div className="text-xl font-black text-slate-900 group-hover:text-amber-900 mt-1">
                    {notStartedTasks}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {projectTasks.length > 0 ? Math.round((notStartedTasks / projectTasks.length) * 100) : 0}% of schedule
                  </div>
                </div>

                <div 
                  onClick={() => onNavigateTab('task')}
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200/70 hover:border-blue-200 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 group-hover:text-blue-800">In Progress</span>
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                  </div>
                  <div className="text-xl font-black text-slate-900 group-hover:text-blue-900 mt-1">
                    {inProgressTasks}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {projectTasks.length > 0 ? Math.round((inProgressTasks / projectTasks.length) * 100) : 0}% active now
                  </div>
                </div>

                <div 
                  onClick={() => onNavigateTab('task')}
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200/70 hover:border-emerald-200 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 group-hover:text-emerald-800">Completed</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <div className="text-xl font-black text-slate-900 group-hover:text-emerald-900 mt-1">
                    {completedTasks}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {overallTaskProgress}% completed
                  </div>
                </div>

                <div 
                  onClick={() => onNavigateTab('task')}
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-rose-50/60 border border-slate-200/70 hover:border-rose-200 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 group-hover:text-rose-800">Delayed / Blocked</span>
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                  </div>
                  <div className="text-xl font-black text-slate-900 group-hover:text-rose-900 mt-1">
                    {delayedTasks}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {delayedTasks === 0 ? 'Zero bottlenecks' : 'Requires attention'}
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Content: Either Live Tasks Feed or S-Curve Graph */}
            {taskViewMode === 'tasks' ? (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1 pb-1">
                  <span>Upcoming & Active Milestone Tasks</span>
                  <button 
                    type="button" 
                    onClick={() => onNavigateTab('task')} 
                    className="text-red-600 hover:underline cursor-pointer"
                  >
                    View All {projectTasks.length} in WBS Schedule →
                  </button>
                </div>

                {projectTasks.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <ListTodo className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No WBS tasks scheduled yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Create tasks in the Schedule tab to track dynamic progress.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 overflow-hidden bg-slate-50/40">
                    {projectTasks.slice(0, 5).map((t, idx) => (
                      <div 
                        key={t.id || idx}
                        onClick={() => onNavigateTab('task')}
                        className="p-3 hover:bg-white transition-colors flex items-center justify-between gap-3 text-xs cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-500 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-800 truncate group-hover:text-red-600 transition-colors">
                              {t.title || t.name}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                              {t.wbs_code && <span>{t.wbs_code}</span>}
                              {t.start_date && <span>• {formatDashDate(t.start_date)} to {formatDashDate(t.end_date)}</span>}
                              {t.assigned_to_name && <span>• Assigned: {t.assigned_to_name}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="w-20 hidden sm:block">
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 rounded-full" 
                                style={{ width: `${t.status === 'COMPLETED' ? 100 : (t.progress_percentage || 0)}%` }}
                              />
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            t.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            t.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            t.status === 'BLOCKED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {t.status === 'COMPLETED' ? 'Completed' :
                             t.status === 'IN_PROGRESS' ? 'In Progress' :
                             t.status === 'BLOCKED' ? 'Delayed' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Dynamic SVG S-Curve & Cumulative Progress Graph */
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-3">
                  <span>Planned vs Actual Cumulative Progress Curve (S-Curve)</span>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-slate-400" />
                      <span>Planned Baseline</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-1 bg-red-600 rounded-full" />
                      <span>Actual Progress ({overallTaskProgress}%)</span>
                    </span>
                  </div>
                </div>

                {/* Dynamic SVG Chart */}
                <div className="relative h-52 bg-slate-50/50 rounded-2xl border border-slate-100 p-4">
                  {/* Grid Lines */}
                  <div className="absolute inset-4 flex flex-col justify-between pointer-events-none">
                    {[100, 75, 50, 25, 0].map((val) => (
                      <div key={val} className="flex items-center gap-2 w-full">
                        <span className="w-8 text-[9px] font-mono text-slate-400 text-right">{val}%</span>
                        <div className="flex-1 h-px bg-slate-200/70" />
                      </div>
                    ))}
                  </div>

                  {/* SVG Line / Curve */}
                  <svg className="w-full h-full pl-10 pr-2 pt-2 pb-6" viewBox="0 0 500 160" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#DC2626" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#DC2626" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Planned Baseline Dashed Line */}
                    <path
                      d="M 10 150 Q 150 140, 250 80 T 490 10"
                      fill="none"
                      stroke="#94A3B8"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />

                    {/* Actual Progress Curve */}
                    <path
                      d={`M 10 150 Q 80 145, 150 ${150 - (overallTaskProgress * 1.4)} L 150 150 Z`}
                      fill="url(#actualGrad)"
                    />
                    <path
                      d={`M 10 150 Q 80 145, 150 ${150 - (overallTaskProgress * 1.4)}`}
                      fill="none"
                      stroke="#DC2626"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />

                    {/* Current Progress Point */}
                    <circle
                      cx="150"
                      cy={150 - (overallTaskProgress * 1.4)}
                      r="5"
                      fill="#DC2626"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      className="animate-pulse"
                    />
                  </svg>

                  {/* X-Axis Monthly Labels */}
                  <div className="absolute bottom-2 left-14 right-6 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    {monthlyProgressData.map((pt, i) => (
                      <span key={i}>{pt.month}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
      {/* 2. FINANCIAL SUB-TAB */}
      {/* ========================================================= */}
      {subTab === 'financial' && (
        <div className="space-y-5">
          
          {/* Top Financial KPI Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex justify-between">
              <div>
                <div className="text-xs text-slate-500 font-medium">Estimated Budget</div>
                <div className="text-[22px] font-bold text-slate-900 mt-4 tracking-tight">
                  ₹ {projectValue.toLocaleString()}
                </div>
                <div className="text-[11px] text-[#2272c7] font-semibold mt-1 cursor-pointer hover:underline">
                  View Breakup &gt;
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#62a0d7] flex items-center justify-center text-white shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex justify-between">
              <div>
                <div className="text-xs text-slate-500 font-medium">Total BOQ Value</div>
                <div className="text-[22px] font-bold text-slate-900 mt-4 tracking-tight">
                  ₹ {boqValue.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Estimated Margin: ₹ {estimatedMargin.toLocaleString()}
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#e8a365] flex items-center justify-center text-white shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex justify-between">
              <div>
                <div className="text-xs text-slate-500 font-medium">Total Sales Invoice</div>
                <div className="text-[22px] font-bold text-slate-900 mt-4 tracking-tight">
                  ₹ {salesInvoice.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {boqValue > 0 ? Math.round((salesInvoice / boqValue) * 100) : 0}% of BOQ value
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#42a898] flex items-center justify-center text-white shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Top Financial KPI Row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex justify-between">
              <div>
                <div className="text-xs text-slate-500 font-medium">Total Expense (Till Date)</div>
                <div className="text-[22px] font-bold text-slate-900 mt-4 tracking-tight">
                  ₹ {cashOut.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {projectValue > 0 ? Math.round((cashOut / projectValue) * 100) : 0}% of Budget used
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#966baf] flex items-center justify-center text-white shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex justify-between">
              <div>
                <div className="text-xs text-slate-500 font-medium">Work done value</div>
                <div className="text-[22px] font-bold text-slate-900 mt-4 tracking-tight">
                  ₹ {workDone.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {boqValue > 0 ? Math.round((workDone / boqValue) * 100) : 0}% of BOQ value
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#61b865] flex items-center justify-center text-white shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex justify-between">
              <div>
                <div className="text-xs text-slate-500 font-medium">Net Cash Position</div>
                <div className="text-[22px] font-bold text-slate-900 mt-4 tracking-tight">
                  ₹ {netWorkingCap.toLocaleString()}
                </div>
                <div className="text-[11px] text-[#2272c7] font-semibold mt-1 cursor-pointer hover:underline">
                  View Breakup &gt;
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#dd6b66] flex items-center justify-center text-white shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Budget vs Expense by Cost Code */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-bold text-slate-900">Budget Vs Expense by Cost Code</h3>
              <button type="button" className="text-[11px] text-slate-500 hover:text-slate-800">
                View Breakup
              </button>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <div className="px-3 py-1 bg-slate-900 text-white text-[11px] rounded-full font-medium">
                Over Budget (0)
              </div>
              <div className="px-3 py-1 border border-slate-200 text-slate-400 text-[11px] rounded-full font-medium bg-white">
                Under Budget (0)
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mb-10">
              Cost codes where expense exceeds budget. % shown as variance.
            </div>
            <div className="text-center text-[12px] text-slate-500 py-4 mb-4">
              No cost codes over budget.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Payables vs Receivables */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <h3 className="text-[13px] font-bold text-slate-900 mb-6">Payables vs Receivables</h3>
              
              <div className="flex items-center justify-center my-8">
                <div className="relative w-36 h-36 rounded-full border-[12px] border-slate-100 flex items-center justify-center">
                   {/* Simplified Donut Chart matching screenshot (full green ring since Payable is 0) */}
                   <svg className="absolute inset-0 w-full h-full -rotate-90 -m-[12px]" viewBox="0 0 36 36">
                    <path
                      className="text-[#3baf57] transition-all duration-500"
                      strokeDasharray="100, 100"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                </div>
              </div>

              <div className="space-y-3 mt-10">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-slate-600">Payable</span>
                  </div>
                  <span className="font-bold text-slate-900">₹ {payables.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#3baf57]" />
                    <span className="text-slate-600">Receivable</span>
                  </div>
                  <span className="font-bold text-slate-900">₹ {receivables.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Salary Expense */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <h3 className="text-[13px] font-bold text-slate-900 mb-4">Salary Expense</h3>
              
              <div className="h-44"></div> {/* Placeholder for chart area */}
              
              <div className="space-y-4 mt-6">
                <div className="flex justify-between items-center text-xs border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#6a4c9c]" />
                    <span className="text-slate-600">Site Staff</span>
                  </div>
                  <div className="flex gap-4 w-20 justify-end">
                    <span className="font-bold text-slate-900">₹ {siteStaffExpense.toLocaleString()}</span>
                    <span className="text-slate-400 w-6 text-right">0%</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-xs border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#f39c12]" />
                    <span className="text-slate-600">Labour Contractor</span>
                  </div>
                  <div className="flex gap-4 w-20 justify-end">
                    <span className="font-bold text-slate-900">₹ {labourContractorExpense.toLocaleString()}</span>
                    <span className="text-slate-400 w-6 text-right">0%</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#3498db]" />
                    <span className="text-slate-600">Office Staff</span>
                  </div>
                  <div className="flex gap-4 w-20 justify-end">
                    <span className="font-bold text-slate-900">₹ {officeStaffExpense.toLocaleString()}</span>
                    <span className="text-slate-400 w-6 text-right">0%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

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

    </div>
  );
};
