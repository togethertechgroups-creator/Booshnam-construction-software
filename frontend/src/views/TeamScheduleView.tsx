import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar, Clock, Search, Filter, Plus, ChevronDown, 
  MoreVertical, Download, ExternalLink, HelpCircle, 
  Award, CheckCircle2, ChevronRight, ChevronLeft, Menu, 
  FileSpreadsheet, FileText, Check, Trash2, Eye, Edit2,
  FolderKanban, Briefcase, User, Sparkles, X, AlertCircle, CheckCircle
} from 'lucide-react';
import { Project, Role, WBSTask } from '../types';
import { 
  getStoredTimesheets, 
  deleteTimesheet, 
  TimesheetEntry 
} from '../lib/timesheetService';
import { 
  getQuotationScheduleTasks, 
  QuotationScheduleTask,
  syncQuotationTaskToProject,
  updateQuotationTaskStatus,
  addQuotationScheduleTask
} from '../lib/quotationScheduleService';
import { NewTimesheetDrawer } from '../components/schedule/NewTimesheetDrawer';
import { QuotationTaskDrawer } from '../components/schedule/QuotationTaskDrawer';
import { TimeLogDetailView } from './TimeLogDetailView';
import { UserProfileDropdown } from '../components/UserProfileDropdown';

interface TeamScheduleViewProps {
  projects?: Project[];
  tasks?: WBSTask[];
  activeRole?: Role;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onShowToast?: (msg: string) => void;
  initialTab?: 'schedule' | 'timesheet';
}

// Timeline Month definition for Gantt Chart (covering full year 2026 Jan - Dec)
interface TimelineMonth {
  year: number;
  monthIndex: number; // 0-11
  label: string;
  isCurrent?: boolean;
}

const TIMELINE_MONTHS: TimelineMonth[] = [
  { year: 2026, monthIndex: 0, label: 'Jan' },
  { year: 2026, monthIndex: 1, label: 'Feb' },
  { year: 2026, monthIndex: 2, label: 'Mar' },
  { year: 2026, monthIndex: 3, label: 'Apr' },
  { year: 2026, monthIndex: 4, label: 'May' },
  { year: 2026, monthIndex: 5, label: 'Jun' },
  { year: 2026, monthIndex: 6, label: 'Jul' },
  { year: 2026, monthIndex: 7, label: 'Aug' },
  { year: 2026, monthIndex: 8, label: 'Sep' },
  { year: 2026, monthIndex: 9, label: 'Oct', isCurrent: true },
  { year: 2026, monthIndex: 10, label: 'Nov' },
  { year: 2026, monthIndex: 11, label: 'Dec' },
];

export const TeamScheduleView: React.FC<TeamScheduleViewProps> = ({
  projects = [],
  activeRole,
  isSidebarOpen = true,
  onToggleSidebar,
  onShowToast,
  initialTab = 'schedule'
}) => {
  // Main Tab State: 'schedule' or 'timesheet'
  const [activeTab, setActiveTab] = useState<'schedule' | 'timesheet'>(initialTab);

  // New Timesheet Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Timesheets Data state
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>(() => getStoredTimesheets());

  // Timesheet Filters state
  const [timesheetSearch, setTimesheetSearch] = useState('');
  const [partyFilter, setPartyFilter] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<string>('All');
  const [activeRowMenuId, setActiveRowMenuId] = useState<string | null>(null);

  // Viewing full Time Log View state (matching user screenshot)
  const [viewingTimesheet, setViewingTimesheet] = useState<TimesheetEntry | null>(null);
  const [editingTimesheet, setEditingTimesheet] = useState<TimesheetEntry | null>(null);

  // Quotation Schedule Gantt Data state
  const [quotationTasks, setQuotationTasks] = useState<QuotationScheduleTask[]>(() => 
    getQuotationScheduleTasks(projects)
  );
  const [selectedTaskTooltip, setSelectedTaskTooltip] = useState<QuotationScheduleTask | null>(null);
  const [selectedQuotationDrawerTask, setSelectedQuotationDrawerTask] = useState<QuotationScheduleTask | null>(null);

  // Gantt Filters state
  const [ganttPeriod, setGanttPeriod] = useState<'Day' | 'Week' | 'Month' | 'Year'>('Month');
  const [granularityFilter, setGranularityFilter] = useState<'Month' | 'Quarter' | 'Year' | 'All'>('Month');
  const [ganttAssigneeFilter, setGanttAssigneeFilter] = useState('All');
  const [ganttStatusFilter, setGanttStatusFilter] = useState('All');
  const [ganttProjectFilter, setGanttProjectFilter] = useState('All');
  const [isUnassignedExpanded, setIsUnassignedExpanded] = useState(true);
  const [activeTaskStatusMenuId, setActiveTaskStatusMenuId] = useState<string | null>(null);
  const [hoveredMarkerTaskId, setHoveredMarkerTaskId] = useState<string | null>(null);

  // Add Task Modal state
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskProjectId, setNewTaskProjectId] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('2026-06-18');
  const [newTaskStage, setNewTaskStage] = useState('Prepare Quotation');
  const [newTaskStatus, setNewTaskStatus] = useState<'NOT_STARTED' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('NOT_STARTED');

  // Single active dropdown tracker: ensures opening any dropdown closes all others
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const partyFilterOpen = activeDropdown === 'party';
  const dateFilterOpen = activeDropdown === 'date';
  const periodDropdownOpen = activeDropdown === 'period';
  const granularityDropdownOpen = activeDropdown === 'granularity';
  const assigneeDropdownOpen = activeDropdown === 'assignee';
  const statusDropdownOpen = activeDropdown === 'status';
  const projectDropdownOpen = activeDropdown === 'project';
  const exportDropdownOpen = activeDropdown === 'export';

  // Close any open dropdown on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveDropdown(null);
      setActiveRowMenuId(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Sync timesheets on custom event or storage
  useEffect(() => {
    const handleSync = () => {
      setTimesheets(getStoredTimesheets());
    };
    window.addEventListener('booshnam_timesheets_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('booshnam_timesheets_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Sync quotation schedule tasks
  useEffect(() => {
    const handleTaskSync = () => {
      setQuotationTasks(getQuotationScheduleTasks(projects));
    };
    window.addEventListener('booshnam_quotation_schedule_updated', handleTaskSync);
    window.addEventListener('booshnam_projects_updated', handleTaskSync);
    window.addEventListener('booshnam_wbs_tasks_updated', handleTaskSync);
    window.addEventListener('storage', handleTaskSync);
    return () => {
      window.removeEventListener('booshnam_quotation_schedule_updated', handleTaskSync);
      window.removeEventListener('booshnam_projects_updated', handleTaskSync);
      window.removeEventListener('booshnam_wbs_tasks_updated', handleTaskSync);
      window.removeEventListener('storage', handleTaskSync);
    };
  }, [projects]);

  // Filtered Timesheets
  const filteredTimesheets = useMemo(() => {
    return timesheets.filter(item => {
      // Search
      const searchLower = timesheetSearch.toLowerCase();
      const matchesSearch = 
        !timesheetSearch ||
        item.party_name.toLowerCase().includes(searchLower) ||
        item.project_name.toLowerCase().includes(searchLower) ||
        item.display_date.toLowerCase().includes(searchLower) ||
        (item.task_name && item.task_name.toLowerCase().includes(searchLower)) ||
        (item.remarks && item.remarks.toLowerCase().includes(searchLower));

      // Party filter
      const matchesParty = partyFilter === 'All' || item.party_name === partyFilter;

      // Date filter
      let matchesDate = true;
      if (dateFilter === 'Today') {
        matchesDate = item.date === '2026-10-04';
      } else if (dateFilter === '03 Oct, 2026') {
        matchesDate = item.display_date.includes('03 Oct');
      } else if (dateFilter === '01 Oct, 2026') {
        matchesDate = item.display_date.includes('01 Oct');
      }

      return matchesSearch && matchesParty && matchesDate;
    });
  }, [timesheets, timesheetSearch, partyFilter, dateFilter]);

  // Unique parties for party filter dropdown
  const uniqueParties = useMemo(() => {
    const set = new Set<string>();
    timesheets.forEach(t => set.add(t.party_name));
    return Array.from(set);
  }, [timesheets]);

  // Filtered Quotation Tasks for Gantt View
  const filteredQuotationTasks = useMemo(() => {
    return quotationTasks.filter(task => {
      if (ganttAssigneeFilter !== 'All' && task.assignee !== ganttAssigneeFilter) {
        return false;
      }
      if (ganttStatusFilter !== 'All' && task.status !== ganttStatusFilter) {
        return false;
      }
      if (ganttProjectFilter !== 'All' && task.project_name !== ganttProjectFilter) {
        return false;
      }
      return true;
    });
  }, [quotationTasks, ganttAssigneeFilter, ganttStatusFilter, ganttProjectFilter]);

  // Unique assignees for Gantt filter
  const uniqueGanttAssignees = useMemo(() => {
    const set = new Set<string>();
    quotationTasks.forEach(t => {
      if (t.assignee) set.add(t.assignee);
    });
    return Array.from(set);
  }, [quotationTasks]);

  // Unique projects for Gantt filter
  const uniqueGanttProjects = useMemo(() => {
    const set = new Set<string>();
    quotationTasks.forEach(t => {
      if (t.project_name) set.add(t.project_name);
    });
    return Array.from(set);
  }, [quotationTasks]);

  const handleDeleteTimesheet = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this timesheet entry?')) {
      const updated = deleteTimesheet(id);
      setTimesheets(updated);
      onShowToast?.('Timesheet entry deleted.');
    }
  };

  const handleExport = (type: string) => {
    onShowToast?.(`Exporting ${activeTab === 'schedule' ? 'Team Gantt Schedule' : 'Timesheets'} to ${type}...`);
  };

  const handleUpdateStatus = (taskId: string, newStatus: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'NOT_STARTED') => {
    const updated = updateQuotationTaskStatus(taskId, newStatus);
    setQuotationTasks(updated);
    const label = newStatus === 'COMPLETED' ? 'Completed' : newStatus === 'IN_PROGRESS' ? 'In Progress' : newStatus === 'PENDING' ? 'Pending' : 'Not Started';
    onShowToast?.(`Task status updated to ${label}.`);
  };

  const handleAddNewTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;
    const targetProj = projects.find(p => p.id === newTaskProjectId);
    const dateObj = new Date(newTaskDate);
    const milestoneStr = isNaN(dateObj.getTime()) 
      ? '18 Jun' 
      : dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

    const updated = addQuotationScheduleTask({
      task_name: newTaskName.trim(),
      project_id: newTaskProjectId || (projects[0]?.id || 'proj-01'),
      project_name: targetProj?.name || 'Project',
      start_date: newTaskDate,
      end_date: newTaskDate,
      milestone_date: milestoneStr,
      stage_label: newTaskStage || 'Prepare Quotation',
      status: newTaskStatus,
      color_theme: newTaskStatus === 'COMPLETED' ? 'green' : 'blue'
    });
    setQuotationTasks(updated);
    setIsAddTaskModalOpen(false);
    setNewTaskName('');
    onShowToast?.('New quotation task added to schedule.');
  };

  // Helper to determine start and end column index in the timeline for a given date
  const getTimelinePlacement = (startDateStr: string, endDateStr: string) => {
    try {
      const s = new Date(startDateStr);
      const e = new Date(endDateStr);
      const sYear = s.getFullYear();
      const sMonth = s.getMonth();
      const eYear = e.getFullYear();
      const eMonth = e.getMonth();

      // Find matching column in TIMELINE_MONTHS
      const startCol = TIMELINE_MONTHS.findIndex(m => m.year === sYear && m.monthIndex === sMonth);
      const endCol = TIMELINE_MONTHS.findIndex(m => m.year === eYear && m.monthIndex === eMonth);

      const resolvedStart = startCol >= 0 ? startCol : 6; // default Jun
      const resolvedEnd = endCol >= 0 ? endCol : resolvedStart;

      // Calculate approximate day offset within the month (0% to 100%)
      const startDay = s.getDate();
      const leftOffsetPercent = (startDay / 31) * 100;

      return {
        colIndex: resolvedStart,
        leftPercent: Math.max(5, Math.min(85, leftOffsetPercent)),
        colSpan: Math.max(1, resolvedEnd - resolvedStart + 1)
      };
    } catch {
      return { colIndex: 6, leftPercent: 20, colSpan: 1 };
    }
  };

  // If a user has clicked on a timesheet row to view it, render the full Time Log View (Image from user)
  if (viewingTimesheet) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <TimeLogDetailView
          timesheet={viewingTimesheet}
          onBack={() => setViewingTimesheet(null)}
          onEdit={(entry) => {
            setEditingTimesheet(entry);
            setIsDrawerOpen(true);
          }}
          onDelete={(id) => {
            deleteTimesheet(id);
            setTimesheets(prev => prev.filter(t => t.id !== id));
            setViewingTimesheet(null);
          }}
          onShowToast={onShowToast}
        />

        <NewTimesheetDrawer
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setEditingTimesheet(null);
          }}
          editEntry={editingTimesheet}
          onSaved={(newEntry) => {
            setTimesheets(prev => {
              const exists = prev.some(t => t.id === newEntry.id);
              if (exists) {
                return prev.map(t => t.id === newEntry.id ? newEntry : t);
              }
              return [newEntry, ...prev];
            });
            setViewingTimesheet(newEntry);
          }}
          projects={projects}
          onShowToast={onShowToast}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafbfc] flex flex-col">
      
      {/* ---------------------------------------------------------------- */}
      {/* TOP HEADER BAR (Clean, modern Red & White Theme) */}
      {/* ---------------------------------------------------------------- */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Team Schedule</span>
          </h1>
        </div>

        {/* Right Header Navigation & Actions */}
        <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
          {/* User Profile */}
          <UserProfileDropdown />
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* SUB-TABS BAR: "Schedule" & "Timesheet" (Red & White Theme) */}
      {/* ---------------------------------------------------------------- */}
      <div className="bg-white border-b border-slate-200 px-6 pt-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          {/* TAB 1: Schedule */}
          <button
            onClick={() => setActiveTab('schedule')}
            className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer ${
              activeTab === 'schedule'
                ? 'text-red-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Schedule</span>
            {activeTab === 'schedule' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 rounded-t-full shadow-xs" />
            )}
          </button>

          {/* TAB 2: Timesheet */}
          <button
            onClick={() => setActiveTab('timesheet')}
            className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer ${
              activeTab === 'timesheet'
                ? 'text-red-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Timesheet</span>
            {activeTab === 'timesheet' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 rounded-t-full shadow-xs" />
            )}
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* MAIN VIEW CONTENT AREA */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex-1 p-6 space-y-5 max-w-[1700px] w-full mx-auto">

        {/* ============================================================== */}
        {/* VIEW 1: SCHEDULE (TEAM GANTT VIEW) - Matching Image 1 */}
        {/* ============================================================== */}
        {/* ============================================================== */}
        {/* VIEW 1: QUOTATION TASKS SCHEDULE - Exact User Image Layout */}
        {/* ============================================================== */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            
            {/* Top Header Card matching User Image */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              {/* Left Title & Icon */}
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm flex items-center justify-center text-white shrink-0">
                  <FileText className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Quotation Tasks Schedule
                  </h1>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Plan and track quotation related tasks across projects
                  </p>
                </div>
              </div>

              {/* Right Summary KPI Cards & Actions */}
              <div className="flex flex-wrap items-center gap-3">
                {/* KPI 1: Total Tasks (Purple Theme) */}
                <div className="flex items-center gap-3 px-4 py-2 bg-white border border-slate-200 rounded-2xl shadow-2xs min-w-[125px]">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <FolderKanban className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Tasks</span>
                    <span className="text-lg font-black text-slate-900 leading-tight">
                      {quotationTasks.length}
                    </span>
                  </div>
                </div>

                {/* KPI 2: Completed (Green Theme) */}
                <div className="flex items-center gap-3 px-4 py-2 bg-white border border-slate-200 rounded-2xl shadow-2xs min-w-[125px]">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completed</span>
                    <span className="text-lg font-black text-slate-900 leading-tight">
                      {quotationTasks.filter(t => t.status === 'COMPLETED').length}
                    </span>
                  </div>
                </div>

                {/* NOTE: "In Progress" KPI Card is REMOVED as explicitly requested in voice audio: "இன் ப்ரோக்ரஸ் வந்து வேண்டாம்" */}

                {/* KPI 3: Pending (Red Theme) */}
                <div className="flex items-center gap-3 px-4 py-2 bg-white border border-slate-200 rounded-2xl shadow-2xs min-w-[125px]">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending</span>
                    <span className="text-lg font-black text-slate-900 leading-tight">
                      {quotationTasks.filter(t => t.status === 'PENDING' || t.status === 'NOT_STARTED').length}
                    </span>
                  </div>
                </div>

                {/* Filter by Project Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown(activeDropdown === 'project' ? null : 'project');
                    }}
                    className="h-10 px-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl font-semibold text-xs text-slate-700 flex items-center gap-2 cursor-pointer shadow-2xs transition-colors"
                  >
                    <span className="truncate max-w-[120px]">
                      {ganttProjectFilter === 'All' ? 'All Projects' : ganttProjectFilter}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </button>

                  {projectDropdownOpen && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 w-52 max-h-56 overflow-y-auto text-xs animate-in fade-in zoom-in-95"
                    >
                      <button
                        onClick={() => {
                          setGanttProjectFilter('All');
                          setActiveDropdown(null);
                        }}
                        className={`w-full px-3 py-2 text-left font-medium hover:bg-slate-50 cursor-pointer ${
                          ganttProjectFilter === 'All' ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-slate-700'
                        }`}
                      >
                        All Projects
                      </button>
                      {uniqueGanttProjects.map(p => (
                        <button
                          key={p}
                          onClick={() => {
                            setGanttProjectFilter(p);
                            setActiveDropdown(null);
                          }}
                          className={`w-full px-3 py-2 text-left truncate font-medium hover:bg-slate-50 cursor-pointer ${
                            ganttProjectFilter === p ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-slate-700'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* + Add Task Button */}
                <button
                  type="button"
                  onClick={() => setIsAddTaskModalOpen(true)}
                  className="h-10 px-4 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Add Task</span>
                </button>
              </div>
            </div>

            {/* Main Schedule Container (Toolbar + Gantt Table) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              
              {/* Toolbar matching User Image */}
              <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
                
                {/* Left: Today, Prev/Next, Date Range */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setGranularityFilter('Month');
                      onShowToast?.('Centered timeline on current date');
                    }}
                    className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                  >
                    Today
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 shadow-2xs transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 shadow-2xs transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Date Range: starts Jan 2026 as explicitly instructed */}
                  <span className="text-sm font-bold text-slate-800 tracking-tight ml-1">
                    Jan 2026 - Dec 2026
                  </span>
                </div>

                {/* Right: Granularity Filter Dropdown (Audio: "ட்ராப்டவுன்ல இருக்கிற மாதிரி... ஆல் இருக்கணும், நான் இயர்லின்னு போட்டா அந்த இயரோடது மட்டும் எனக்கு பில்டர் ஆகி வரணும்") */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdown(activeDropdown === 'granularity' ? null : 'granularity');
                      }}
                      className="h-9 px-3.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      <span>
                        {granularityFilter === 'All' ? 'All' : granularityFilter === 'Quarter' ? 'Quarter' : granularityFilter === 'Year' ? 'Year' : 'Month'}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {granularityDropdownOpen && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 w-36 text-xs animate-in fade-in zoom-in-95"
                      >
                        {(['All', 'Month', 'Quarter', 'Year'] as const).map(option => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              setGranularityFilter(option);
                              setActiveDropdown(null);
                            }}
                            className={`w-full px-3.5 py-2 text-left font-medium hover:bg-slate-50 cursor-pointer ${
                              granularityFilter === option ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-slate-700'
                            }`}
                          >
                            {option === 'All' ? 'All' : option === 'Month' ? 'Month' : option === 'Quarter' ? 'Quarter' : 'Year'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Main Table Grid matching Image 1 */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1250px]">
                  
                  {/* Timeline Header Row 1: Years */}
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/70">
                      <th className="w-12 px-3 py-2.5 border-r border-slate-200 text-center font-bold text-slate-700">S.No</th>
                      <th className="w-64 px-4 py-2.5 border-r border-slate-200 font-bold text-slate-700">Task name</th>
                      <th className="w-36 px-4 py-2.5 border-r border-slate-200 font-bold text-slate-700">Status</th>
                      <th className="w-32 px-4 py-2.5 border-r border-slate-200 font-bold text-slate-700">Progress</th>
                      
                      {/* 2026 Header spanning full year (starts at Jan 2026 per audio instruction) */}
                      <th colSpan={12} className="px-3 py-2 text-center font-bold text-slate-800 bg-slate-100/60 border-r border-slate-200">
                        2026
                      </th>

                      {/* Right Action column */}
                      <th className="w-10 px-2 py-2 text-center font-bold text-slate-700" />
                    </tr>

                    {/* Timeline Header Row 2: Months */}
                    <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-600 bg-white">
                      <th className="border-r border-slate-200" />
                      <th className="border-r border-slate-200" />
                      <th className="border-r border-slate-200" />
                      <th className="border-r border-slate-200" />
                      {TIMELINE_MONTHS.map((m, idx) => (
                        <th 
                          key={idx}
                          className={`py-2 px-2 text-center border-r border-slate-200 font-medium ${
                            m.isCurrent 
                              ? 'bg-rose-50/60 text-red-600 font-bold' 
                              : 'text-slate-600'
                          }`}
                        >
                          {m.label}
                        </th>
                      ))}
                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {/* Expandable Group Row: "v 📕 Unassigned (8 Quotation Tasks)   [8 Tasks]" matching user image */}
                    <tr className="bg-[#fff1f2] border-b border-red-100/80">
                      <td className="px-3 py-2.5 text-center border-r border-red-100/80">
                        <button 
                          type="button"
                          onClick={() => setIsUnassignedExpanded(!isUnassignedExpanded)}
                          className="text-red-700 hover:text-red-900 cursor-pointer p-0.5"
                        >
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isUnassignedExpanded ? '' : '-rotate-90'}`} />
                        </button>
                      </td>
                      <td colSpan={3} className="px-4 py-2.5 font-bold text-red-700 text-xs border-r border-red-100/80">
                        <div className="flex items-center gap-2">
                          <FolderKanban className="w-4 h-4 text-red-600" />
                          <span>Unassigned ({filteredQuotationTasks.length} Quotation Tasks)</span>
                        </div>
                      </td>
                      <td colSpan={12} className="px-4 py-2.5 text-left border-r border-red-100/80">
                        <span className="px-2.5 py-0.5 bg-red-600 text-white rounded-md text-[11px] font-bold shadow-xs">
                          {filteredQuotationTasks.length} Tasks
                        </span>
                      </td>
                      <td />
                    </tr>

                    {/* Quotation Task Rows matching User Image */}
                    {isUnassignedExpanded && filteredQuotationTasks.map((task, idx) => {
                      const placement = getTimelinePlacement(task.start_date, task.end_date);
                      const isStatusCompleted = task.status === 'COMPLETED';
                      const isStatusInProgress = task.status === 'IN_PROGRESS';
                      const isStatusPending = task.status === 'PENDING';
                      const isHovered = hoveredMarkerTaskId === task.id;

                      // Status dynamic color mapping:
                      // Completed MUST show Green as instructed in audio!
                      const markerBgColor = isStatusCompleted 
                        ? 'bg-emerald-500' 
                        : isStatusInProgress 
                        ? 'bg-blue-500' 
                        : isStatusPending 
                        ? 'bg-red-500' 
                        : task.color_theme === 'green' ? 'bg-emerald-500' 
                        : task.color_theme === 'blue' ? 'bg-blue-500'
                        : task.color_theme === 'orange' ? 'bg-amber-500'
                        : task.color_theme === 'purple' ? 'bg-purple-500'
                        : 'bg-red-500';

                      const markerRingColor = isStatusCompleted 
                        ? 'ring-emerald-200' 
                        : isStatusInProgress 
                        ? 'ring-blue-200' 
                        : isStatusPending 
                        ? 'ring-red-200' 
                        : 'ring-slate-200';

                      return (
                        <tr 
                          key={task.id}
                          className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors text-xs text-slate-800 group"
                        >
                          {/* S.No */}
                          <td className="px-3 py-3 text-center border-r border-slate-200 text-slate-500 font-medium">
                            {idx + 1}
                          </td>

                          {/* Task Name & Project */}
                          <td 
                            onClick={() => setSelectedQuotationDrawerTask(task)}
                            className="px-4 py-3 border-r border-slate-200 cursor-pointer hover:bg-red-50/40 transition-colors"
                          >
                            <div className="font-bold text-slate-900 leading-tight">
                              <span className="truncate hover:text-red-600 transition-colors">{task.task_name}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                              {task.project_name}
                            </div>
                          </td>

                          {/* Status Pill with interactive Dropdown */}
                          <td className="px-3 py-2.5 border-r border-slate-200 relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTaskStatusMenuId(activeTaskStatusMenuId === task.id ? null : task.id);
                              }}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                                isStatusCompleted
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : isStatusInProgress
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                  : isStatusPending
                                  ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${
                                isStatusCompleted ? 'bg-emerald-500' : isStatusInProgress ? 'bg-blue-500' : isStatusPending ? 'bg-red-500' : 'bg-slate-600'
                              }`} />
                              <span>
                                {isStatusCompleted ? 'Completed' : isStatusInProgress ? 'In Progress' : isStatusPending ? 'Pending' : 'Not Started'}
                              </span>
                              <ChevronDown className="w-3 h-3 text-slate-400" />
                            </button>

                            {activeTaskStatusMenuId === task.id && (
                              <div 
                                onClick={(e) => e.stopPropagation()}
                                className="absolute left-2 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-36 text-xs animate-in fade-in zoom-in-95"
                              >
                                {(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'PENDING'] as const).map(st => (
                                  <button
                                    key={st}
                                    onClick={() => {
                                      handleUpdateStatus(task.id, st);
                                      setActiveTaskStatusMenuId(null);
                                    }}
                                    className={`w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-50 cursor-pointer ${
                                      task.status === st ? 'font-bold bg-slate-50 text-slate-900' : 'text-slate-700'
                                    }`}
                                  >
                                    <span className={`w-2 h-2 rounded-full ${
                                      st === 'COMPLETED' ? 'bg-emerald-500' : st === 'IN_PROGRESS' ? 'bg-blue-500' : st === 'PENDING' ? 'bg-red-500' : 'bg-slate-600'
                                    }`} />
                                    <span>{st === 'NOT_STARTED' ? 'Not Started' : st === 'IN_PROGRESS' ? 'In Progress' : st === 'COMPLETED' ? 'Completed' : 'Pending'}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Progress Column matching Image */}
                          <td className="px-4 py-3 border-r border-slate-200">
                            <div className="flex items-center gap-2">
                              <div className="w-14 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-300 ${
                                    isStatusCompleted ? 'bg-emerald-500' : isStatusInProgress ? 'bg-blue-500' : 'bg-slate-300'
                                  }`}
                                  style={{ width: `${task.progress_percentage || (isStatusCompleted ? 100 : 0)}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-semibold text-slate-600">
                                {task.progress_percentage || (isStatusCompleted ? 100 : 0)}%
                              </span>
                            </div>
                          </td>

                          {/* 12 Timeline Months */}
                          {TIMELINE_MONTHS.map((m, mIdx) => {
                            const isMilestoneCell = mIdx === placement.colIndex;

                            return (
                              <td 
                                key={mIdx}
                                className={`relative py-2 px-1 border-r border-slate-100 text-center ${
                                  m.isCurrent ? 'bg-rose-50/20' : ''
                                }`}
                              >
                                {isMilestoneCell && (
                                  <div 
                                    className="relative inline-flex items-center justify-center min-h-[44px] cursor-pointer"
                                    onMouseEnter={() => setHoveredMarkerTaskId(task.id)}
                                    onMouseLeave={() => setHoveredMarkerTaskId(null)}
                                    onClick={() => setSelectedQuotationDrawerTask(task)}
                                  >
                                    {/* Vertical Dotted Guideline - clearly visible above and under the dart */}
                                    <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 border-l-2 border-dashed border-slate-400 pointer-events-none" />

                                    {/* The Dot Marker (Dynamic Status Color) - smaller dart */}
                                    <div 
                                      className={`relative z-10 w-2.5 h-2.5 rounded-full ${markerBgColor} ring-2 ${markerRingColor} shadow-2xs transition-transform duration-200 hover:scale-125`}
                                    />

                                    {/* Floating Popover: Appears ONLY when hovering on marker, as commanded in Audio! */}
                                    {isHovered && (
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-auto">
                                        <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-2xl flex flex-col gap-1 text-left min-w-[210px] bg-white text-slate-900 animate-in fade-in zoom-in-95 duration-150">
                                          <div className="flex items-center justify-between gap-2 border-b pb-1.5 border-slate-100">
                                            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                                              <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                              <span>{task.milestone_date || '18 Jun'}</span>
                                            </div>
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                              isStatusCompleted 
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                                : isStatusInProgress 
                                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                                            }`}>
                                              {isStatusCompleted ? 'Completed' : isStatusInProgress ? 'In Progress' : 'Pending'}
                                            </span>
                                          </div>
                                          <div className="font-bold text-xs text-slate-900 mt-0.5">
                                            {task.stage_label || task.task_name}
                                          </div>
                                          <div className="text-[10px] text-slate-500 truncate">
                                            {task.project_name}
                                          </div>

                                          {/* Quick Complete / Toggle Button */}
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleUpdateStatus(task.id, isStatusCompleted ? 'PENDING' : 'COMPLETED');
                                            }}
                                            className={`mt-1.5 w-full py-1.5 px-2 rounded-lg text-[10.5px] font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer ${
                                              isStatusCompleted 
                                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' 
                                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                            }`}
                                          >
                                            <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                                            <span>{isStatusCompleted ? 'Mark as Pending' : 'Mark as Completed'}</span>
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}

                          {/* Row Actions Menu (⋮) */}
                          <td className="px-2 py-3 text-center relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveRowMenuId(activeRowMenuId === task.id ? null : task.id);
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeRowMenuId === task.id && (
                              <div 
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-4 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 w-44 text-xs animate-in fade-in zoom-in-95"
                              >
                                <button
                                  onClick={() => {
                                    handleUpdateStatus(task.id, 'COMPLETED');
                                    setActiveRowMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-emerald-50 text-emerald-700 font-semibold cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Mark as Completed</span>
                                </button>
                                <button
                                  onClick={() => {
                                    handleUpdateStatus(task.id, 'IN_PROGRESS');
                                    setActiveRowMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-blue-50 text-blue-700 cursor-pointer"
                                >
                                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Mark as In Progress</span>
                                </button>
                                <button
                                  onClick={() => {
                                    handleUpdateStatus(task.id, 'PENDING');
                                    setActiveRowMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-red-50 text-red-700 cursor-pointer"
                                >
                                  <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                                  <span>Mark as Pending</span>
                                </button>
                                <div className="my-1 border-t border-slate-100" />
                                <button
                                  onClick={() => {
                                    setSelectedQuotationDrawerTask(task);
                                    setActiveRowMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-50 text-slate-700 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                                  <span>View Details</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                  </tbody>
                </table>
              </div>

              {/* Schedule Footer */}
              <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                    <span>Completed (Green)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-rose-500 rounded-full" />
                    <span>Pending / Target Milestone</span>
                  </div>
                </div>
                <span>Hover over timeline markers to view details, dates & mark completed.</span>
              </div>
            </div>

          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* ADD QUOTATION TASK MODAL */}
        {/* ---------------------------------------------------------------- */}
        {isAddTaskModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Add Quotation Task</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddTaskModalOpen(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddNewTask} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Task Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Quotation, Collect Client Details"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Project
                  </label>
                  <select
                    value={newTaskProjectId}
                    onChange={(e) => setNewTaskProjectId(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 bg-white"
                  >
                    <option value="">Select Project</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Target Date
                    </label>
                    <input
                      type="date"
                      value={newTaskDate}
                      onChange={(e) => setNewTaskDate(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Status
                    </label>
                    <select
                      value={newTaskStatus}
                      onChange={(e) => setNewTaskStatus(e.target.value as any)}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 bg-white"
                    >
                      <option value="NOT_STARTED">Not Started</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed (Green)</option>
                      <option value="PENDING">Pending (Red)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Stage / Action Label
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Send Quotation, Client Meeting, Prepare Quotation"
                    value={newTaskStage}
                    onChange={(e) => setNewTaskStage(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsAddTaskModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
                  >
                    Save Task
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: TIMESHEET - Matching Image 2 with Red & White Theme */}
        {/* ============================================================== */}
        {activeTab === 'timesheet' && (
          <div className="space-y-4">
            
            {/* Timesheet Action & Filter Bar (Image 2) */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              
              {/* Left Filters */}
              <div className="flex flex-wrap items-center gap-3">
                
                {/* Party Filter Button */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown(activeDropdown === 'party' ? null : 'party');
                    }}
                    className={`h-9 px-4 rounded-lg font-medium text-xs border transition-all cursor-pointer shadow-2xs flex items-center gap-2 ${
                      partyFilter !== 'All' 
                        ? 'border-red-500 bg-red-50/50 text-red-700 font-bold' 
                        : 'border-slate-300 text-slate-700 hover:border-slate-400 bg-white'
                    }`}
                  >
                    <span>{partyFilter === 'All' ? 'Party' : partyFilter}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {partyFilterOpen && (
                    <div className="absolute left-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-64 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95">
                      <button
                        onClick={() => {
                          setPartyFilter('All');
                          setActiveDropdown(null);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs hover:bg-red-50 hover:text-red-700 text-slate-700 cursor-pointer font-medium"
                      >
                        All Parties
                      </button>
                      {uniqueParties.map(p => (
                        <button
                          key={p}
                          onClick={() => {
                            setPartyFilter(p);
                            setActiveDropdown(null);
                          }}
                          className={`w-full px-3.5 py-2 text-left text-xs hover:bg-red-50 hover:text-red-700 cursor-pointer truncate ${
                            partyFilter === p ? 'font-bold text-red-600 bg-red-50/50' : 'text-slate-700'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Date Filter Button */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown(activeDropdown === 'date' ? null : 'date');
                    }}
                    className={`h-9 px-4 rounded-lg font-medium text-xs border transition-all cursor-pointer shadow-2xs flex items-center gap-2 ${
                      dateFilter !== 'All' 
                        ? 'border-red-500 bg-red-50/50 text-red-700 font-bold' 
                        : 'border-slate-300 text-slate-700 hover:border-slate-400 bg-white'
                    }`}
                  >
                    <span>{dateFilter === 'All' ? 'Date Filter' : dateFilter}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {dateFilterOpen && (
                    <div className="absolute left-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-44 animate-in fade-in zoom-in-95">
                      {['All', 'Today', '03 Oct, 2026', '01 Oct, 2026'].map(d => (
                        <button
                          key={d}
                          onClick={() => {
                            setDateFilter(d);
                            setActiveDropdown(null);
                          }}
                          className={`w-full px-3.5 py-2 text-left text-xs hover:bg-red-50 hover:text-red-700 cursor-pointer ${
                            dateFilter === d ? 'font-bold text-red-600 bg-red-50/50' : 'text-slate-700'
                          }`}
                        >
                          {d === 'All' ? 'All Dates' : d}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Search Bar matching Image 2 */}
                <div className="relative">
                  <div className="flex items-center h-9 px-3 border border-slate-300 hover:border-slate-400 focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 rounded-lg bg-white w-56 transition-all shadow-2xs">
                    <input
                      type="text"
                      value={timesheetSearch}
                      onChange={(e) => setTimesheetSearch(e.target.value)}
                      placeholder="search"
                      className="w-full text-xs text-slate-800 outline-none bg-transparent"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </div>
                </div>

              </div>

              {/* Right Action Button: "+ New Timesheet" in Red & White Theme */}
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="h-9 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all hover:shadow cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Timesheet</span>
              </button>

            </div>

            {/* Timesheet Data Table matching Image 2 */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[950px]">
                  
                  {/* Table Header */}
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/70">
                      <th className="py-3 px-6 w-36">Date</th>
                      <th className="py-3 px-6">Party</th>
                      <th className="py-3 px-6 w-44">Start & End Time</th>
                      <th className="py-3 px-6 w-32">Duration</th>
                      <th className="py-3 px-6">Project</th>
                      <th className="py-3 px-4 w-12 text-center" />
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-800 font-medium">
                    {filteredTimesheets.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <p className="font-semibold text-sm text-slate-600">No timesheet records found</p>
                          <p className="text-xs text-slate-400 mt-1">Try clearing your search or add a new timesheet.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredTimesheets.map((entry) => (
                        <tr 
                          key={entry.id}
                          onClick={() => setViewingTimesheet(entry)}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                        >
                          {/* Date */}
                          <td className="py-3.5 px-6 font-semibold text-slate-700 whitespace-nowrap">
                            {entry.display_date || entry.date}
                          </td>

                          {/* Party */}
                          <td className="py-3.5 px-6 font-medium text-slate-800">
                            {entry.party_name}
                          </td>

                          {/* Start & End Time */}
                          <td className="py-3.5 px-6 text-slate-700 whitespace-nowrap">
                            {entry.start_time} - {entry.end_time}
                          </td>

                          {/* Duration */}
                          <td className="py-3.5 px-6 text-slate-700 whitespace-nowrap font-medium">
                            {entry.duration}
                          </td>

                          {/* Project */}
                          <td className="py-3.5 px-6 text-slate-800 font-medium truncate max-w-xs">
                            {entry.project_name}
                          </td>

                          {/* Actions (Three dots menu matching Image 2) */}
                          <td className="py-3.5 px-4 text-center relative" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdown(null);
                                setActiveRowMenuId(activeRowMenuId === entry.id ? null : entry.id);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              title="Actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Dropdown Menu */}
                            {activeRowMenuId === entry.id && (
                              <div className="absolute right-4 top-full mt-1 z-40 bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-36 text-xs text-left animate-in fade-in zoom-in-95">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingTimesheet(entry);
                                    setActiveRowMenuId(null);
                                  }}
                                  className="w-full px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                                  <span>View Details</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingTimesheet(entry);
                                    setIsDrawerOpen(true);
                                    setActiveRowMenuId(null);
                                  }}
                                  className="w-full px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Edit Log</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTimesheet(entry.id, e);
                                    setActiveRowMenuId(null);
                                  }}
                                  className="w-full px-3 py-2 hover:bg-red-50 flex items-center gap-2 text-red-600 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>

                </table>
              </div>

              {/* Table Footer */}
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>Showing {filteredTimesheets.length} of {timesheets.length} total entries</span>
                <span>Timesheets logged by site supervisors & engineers</span>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ---------------------------------------------------------------- */}
      {/* NEW TIMESHEET DRAWER (Matching Image 3) */}
      {/* ---------------------------------------------------------------- */}
      <NewTimesheetDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingTimesheet(null);
        }}
        editEntry={editingTimesheet}
        onSaved={(newEntry) => {
          setTimesheets(prev => {
            const exists = prev.some(t => t.id === newEntry.id);
            if (exists) {
              return prev.map(t => t.id === newEntry.id ? newEntry : t);
            }
            return [newEntry, ...prev];
          });
        }}
        projects={projects}
        onShowToast={onShowToast}
      />

      {/* ---------------------------------------------------------------- */}
      {/* QUOTATION TASK DETAILS DRAWER (Matching User Audio & Screenshot) */}
      {/* ---------------------------------------------------------------- */}
      <QuotationTaskDrawer
        isOpen={!!selectedQuotationDrawerTask}
        onClose={() => setSelectedQuotationDrawerTask(null)}
        task={selectedQuotationDrawerTask}
        onShowToast={onShowToast}
        onUpdateTask={(updated) => {
          setSelectedQuotationDrawerTask(updated);
          syncQuotationTaskToProject(updated);
          setQuotationTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
        }}
      />

    </div>
  );
};
