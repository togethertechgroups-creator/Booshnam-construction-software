import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, Clock, AlertCircle, Phone, Mail, 
  MapPin, Calendar, TrendingUp, DollarSign, Users, 
  Layers, ShoppingCart, ListTodo, FileText, ArrowUpRight,
  ShieldCheck, ArrowDownRight, HardHat, PlusCircle, Settings,
  Image as ImageIcon, Upload, ChevronRight, Check, X, Trash2, Eye
} from 'lucide-react';
import { Project, WBSTask, ApprovalRequest, MaterialRequest, ProjectTeamMember } from '../../../types';
import { WorkspaceTabId } from '../ProjectTopNav';
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

  // Task metrics
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const notStartedTasks = tasks.filter(t => t.status === 'TODO').length;
  const delayedTasks = tasks.filter(t => t.status === 'BLOCKED').length;

  // Attendance 7-day data
  const attendanceDays: Array<{ date: string; target: number; actual: number }> = [];

  // Financial stats
  const cashIn = project.cash_in || 1250000;
  const cashOut = project.cash_out || 865000;
  const netWorkingCap = cashIn - cashOut;

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

        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400 font-mono">
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
          
          {/* ROW 1: Project Status | Planned Vs Actual Dates | MOM */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Card 1: Project Status */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Project Status</h3>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                    project.status === 'ON_HOLD' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    project.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    'bg-slate-50 text-slate-700 border-slate-200'
                  }`}>
                    {project.status === 'ON_HOLD' ? 'OnHold' : project.status === 'ACTIVE' ? 'Ongoing' : project.status}
                  </span>
                </div>

                {/* Circular Gauge Donut (Project 0%) */}
                <div className="flex items-center justify-center my-4">
                  <div className="relative w-24 h-24 rounded-full border-4 border-slate-100 flex flex-col items-center justify-center shadow-inner">
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-100"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-[#0ea5e9] transition-all duration-500"
                        strokeDasharray={`${projProgress}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="text-[#0ea5e9] text-xs font-bold leading-tight">Project</span>
                    <span className="text-slate-700 text-xs font-semibold">{projProgress}%</span>
                  </div>
                </div>

                {/* Project Value */}
                <div className="space-y-0.5">
                  <div className="text-xs text-slate-500 font-semibold">Project Value</div>
                  <div className="text-base font-bold text-slate-900 font-mono">
                    ₹ {projectValue.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Key Personnel */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Key Personnel</span>
                <button
                  type="button"
                  onClick={onOpenTeamModal}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                  title="Manage Key Personnel"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Card 2: Planned Vs Actual Dates */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between min-h-[220px]">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Planned Vs Actual Dates</h3>

                {/* Planned Dates */}
                <div className="mt-4 space-y-1.5">
                  <div className="text-xs font-bold text-slate-800">Planned Dates</div>
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono py-1">
                    <div>
                      <span className="text-slate-500">Start:</span> {project.start_date || '--'}
                    </div>
                    <div>
                      <span className="text-slate-500">End:</span> {project.expected_end_date || '--'}
                    </div>
                  </div>
                </div>

                {/* Actual Dates */}
                <div className="mt-5 space-y-1.5 pt-4 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-800">Actual Dates</div>
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono py-1">
                    <div>
                      <span className="text-slate-500">Start:</span> {project.start_date || '--'}
                    </div>
                    <div>
                      <span className="text-slate-500">End:</span> --
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 pt-3 border-t border-slate-100">
                Milestones tracked via WBS Schedule
              </div>
            </div>

            {/* Card 3: MOM (Minutes of Meeting) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">MOM</h3>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('mom')}
                    className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                  >
                    view all
                  </button>
                </div>

                {/* Body: No MOM found (matches user screenshot) */}
                <div className="py-12 text-center text-xs text-slate-400">
                  No MOM found
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-right">
                <button
                  type="button"
                  onClick={() => onNavigateTab('mom')}
                  className="text-xs text-slate-500 hover:text-slate-900 font-medium cursor-pointer"
                >
                  + Add New Meeting
                </button>
              </div>
            </div>

          </div>

          {/* ROW 2: Month on Month Progress | Task progress */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Card 4: Month on Month Progress (7 cols) */}
            <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900">Month on Month Progress</h3>
                
                {/* Legends matching Screenshot */}
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>Not Started {notStartedTasks} | Delayed {delayedTasks}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span>In Progress {inProgressTasks} | Delayed 0</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Completed {completedTasks}</span>
                  </span>
                </div>
              </div>

              {/* Cumulative Progress Chart */}
              <div className="flex items-stretch gap-3 pt-2">
                {/* Vertical Y-axis label */}
                <div className="w-6 flex items-center justify-center">
                  <span className="text-[10px] text-slate-400 -rotate-90 whitespace-nowrap font-medium">
                    Cumulative Progress (%)
                  </span>
                </div>

                {/* Y-axis Ticks & Grid */}
                <div className="flex-1 space-y-4 relative py-2">
                  {[
                    { label: '100.00%', val: 100 },
                    { label: '80.00%', val: 80 },
                    { label: '60.00%', val: 60 },
                    { label: '40.00%', val: 40 },
                    { label: '20.00%', val: 20 },
                    { label: '0.00%', val: 0 },
                  ].map((tick, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-14 text-[10px] text-slate-400 font-mono text-right">{tick.label}</span>
                      <div className="flex-1 h-px bg-slate-100" />
                    </div>
                  ))}

                  {/* Simulated progress area background */}
                  <div className="absolute left-16 right-0 bottom-6 top-4 pointer-events-none opacity-20">
                    <div className="w-full h-full bg-linear-to-t from-slate-200 to-transparent rounded" />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 5: Task progress (4 cols) */}
            <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Task progress</h3>
                <div className="flex flex-col items-center justify-center py-12">
                  <span className="text-4xl font-black text-slate-900 tracking-tight">
                    {tasks.length || 0}
                  </span>
                  <span className="text-xs text-slate-400 mt-1">Total Scheduled Tasks</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Completed:</span>
                <span className="font-bold text-emerald-700">{completedTasks}</span>
              </div>
            </div>

          </div>

          {/* ROW 3: Attendance Overview | Project Photos */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Card 6: Attendance Overview (8 cols) */}
            <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Attendance Overview</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Grey bars = required workers to meet weekly schedule target
                </p>
              </div>

              {/* 7-Day Bar Chart */}
              {attendanceDays.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs border-b border-slate-100">
                  <Users className="w-8 h-8 mb-2 text-slate-300" />
                  <p>No attendance records logged for this period.</p>
                </div>
              ) : (
                <div className="h-44 flex items-end justify-between gap-3 pt-4 px-4 pb-2 border-b border-slate-100">
                  {attendanceDays.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className="w-full flex items-end justify-center gap-1 h-32">
                        {/* Grey Target Bar */}
                        <div 
                          className="w-3 bg-slate-300 rounded-t-xs transition-all"
                          style={{ height: `${(d.target / 25) * 100}%` }}
                          title={`Target: ${d.target} workers`}
                        />
                        {/* Actual Bar (Red) */}
                        <div 
                          className="w-3 bg-red-600 rounded-t-xs transition-all"
                          style={{ height: `${(d.actual / 25) * 100}%` }}
                          title={`Actual: ${d.actual} workers`}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">{d.date}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-500 px-2">
                <span>Average Daily Headcount: <strong>{attendanceDays.length > 0 ? `${Math.round(attendanceDays.reduce((a, b) => a + b.actual, 0) / attendanceDays.length)} Workers` : '0 Workers'}</strong></span>
                <button
                  type="button"
                  onClick={() => onNavigateTab('attendance')}
                  className="text-red-600 font-bold hover:underline cursor-pointer"
                >
                  View Attendance Roster →
                </button>
              </div>
            </div>

            {/* Card 7: Project Photos (4 cols) */}
            <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">Project Photos</h3>
                    {photos.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-50 text-red-600 rounded-full border border-red-100">
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

                {/* Source Filter Chips if photos from multiple sections exist */}
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

                {/* Photos Grid / Thumbnails */}
                <div className="grid grid-cols-2 gap-3 my-2">
                  {(activeSourceFilter === 'ALL' ? photos : photos.filter(p => (p.source || 'Site Photo') === activeSourceFilter)).map((ph) => (
                    <div 
                      key={ph.id} 
                      onClick={() => setSelectedPhotoForView(ph)}
                      className="group relative rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100 cursor-pointer shadow-2xs hover:shadow-md transition-all"
                      title="Click to view full photo"
                    >
                      <img
                        src={ph.url}
                        alt={ph.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      
                      {/* Section / Source Badge */}
                      <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-tight shadow-xs ${
                        ph.source === 'Design' || ph.source === 'BOQ' ? 'bg-red-600 text-white' :
                        ph.source === 'Material' ? 'bg-emerald-600 text-white' :
                        ph.source === 'Files' ? 'bg-amber-600 text-white' :
                        ph.source === 'Task' ? 'bg-cyan-700 text-white' :
                        'bg-red-600 text-white'
                      }`}>
                        {ph.source || 'Site Photo'}
                      </span>

                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2 text-white">
                        <div className="min-w-0 pr-1">
                          <p className="text-[10px] font-semibold truncate leading-tight">{ph.title}</p>
                          <p className="text-[9px] text-slate-300">{ph.date}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeletePhoto(ph.id, e)}
                          className="p-1 bg-red-600 hover:bg-red-700 rounded-md text-white transition-colors cursor-pointer shrink-0 shadow-sm"
                          title="Delete photo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add Placeholder Tile */}
                  <button
                    type="button"
                    onClick={() => setIsAddPhotoOpen(true)}
                    className="rounded-xl border-2 border-dashed border-slate-200 hover:border-red-600 hover:bg-red-50/20 aspect-video flex flex-col items-center justify-center text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-5 h-5 mb-1 text-slate-400 group-hover:text-red-600" />
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

          {/* ROW 4: Contractor Summary (Full Width Card) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Contractor Summary</h3>
              <button
                type="button"
                onClick={() => onNavigateTab('subcon')}
                className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
              >
                View Subcontractors →
              </button>
            </div>

            {/* Body: No Contractor Summary found (matches user screenshot) */}
            <div className="py-10 text-center text-xs text-slate-400">
              No Contractor Summary found
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* 2. FINANCIAL SUB-TAB */}
      {/* ========================================================= */}
      {subTab === 'financial' && (
        <div className="space-y-5">
          
          {/* Top Financial KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total Estimated Budget</div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                ₹ {projectValue.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Approved contract value</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Cash In (Client Receipts)</div>
              <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                ₹ {cashIn.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Cleared into project account</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Cash Out (Site Expenses)</div>
              <div className="text-2xl font-bold font-mono text-rose-600 mt-1">
                ₹ {cashOut.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Material, labor & subcon payouts</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Net Working Capital</div>
              <div className={`text-2xl font-bold font-mono mt-1 ${netWorkingCap >= 0 ? 'text-indigo-900' : 'text-rose-600'}`}>
                ₹ {netWorkingCap.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Available liquidity balance</div>
            </div>
          </div>

          {/* Budget vs Actual Cashflow Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Budget Consumption & Burn Rate</h3>
                <span className="text-xs font-bold text-red-600">
                  {projectValue > 0 ? ((cashOut / projectValue) * 100).toFixed(1) : 0}% Spent
                </span>
              </div>

              <div className="space-y-2">
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-red-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${projectValue > 0 ? Math.min(100, (cashOut / projectValue) * 100) : 0}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                  <span>Spent: ₹ {cashOut.toLocaleString()}</span>
                  <span>Budget: ₹ {projectValue.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Uncommitted Scope:</span>
                <span className="font-bold font-mono text-slate-900">₹ {Math.max(0, projectValue - cashOut).toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Quick Financial Shortcuts</h3>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => onNavigateTab('transaction')}
                  className="w-full p-3 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <span>Record Cash In / Cash Out Payment</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateTab('boq')}
                  className="w-full p-3 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-red-50 text-red-600">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span>Inspect BOQ Quantity Takeoff & Rate Analysis</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateTab('party')}
                  className="w-full p-3 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
                      <Users className="w-4 h-4" />
                    </div>
                    <span>Check Client & Vendor Balance Ledgers</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
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
