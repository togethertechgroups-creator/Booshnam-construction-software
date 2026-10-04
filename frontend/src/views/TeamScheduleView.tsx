import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar, Clock, Search, Filter, Plus, ChevronDown, 
  MoreVertical, Download, ExternalLink, HelpCircle, 
  Award, CheckCircle2, ChevronRight, Menu, 
  FileSpreadsheet, FileText, Check, Trash2, Eye, Edit2,
  FolderKanban, Briefcase, User, Sparkles
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
  syncQuotationTaskToProject 
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

// Timeline Month definition for Gantt Chart (covering 2025 Dec - 2026 Nov) matching Image 1
interface TimelineMonth {
  year: number;
  monthIndex: number; // 0-11
  label: string;
  isCurrent?: boolean;
}

const TIMELINE_MONTHS: TimelineMonth[] = [
  { year: 2025, monthIndex: 11, label: 'Dec' },
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
  const [ganttAssigneeFilter, setGanttAssigneeFilter] = useState('All');
  const [ganttStatusFilter, setGanttStatusFilter] = useState('All');
  const [ganttProjectFilter, setGanttProjectFilter] = useState('All');
  const [isUnassignedExpanded, setIsUnassignedExpanded] = useState(true);

  // Single active dropdown tracker: ensures opening any dropdown closes all others
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const partyFilterOpen = activeDropdown === 'party';
  const dateFilterOpen = activeDropdown === 'date';
  const periodDropdownOpen = activeDropdown === 'period';
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
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            
            {/* Control & Filter Sub-Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Team Gantt View
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-red-50 text-red-700 rounded-full border border-red-200/60">
                  {filteredQuotationTasks.length} Quotation Tasks
                </span>
              </div>

              {/* Right Filter Controls */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                
                {/* Period Mode Dropdown (Month / Week / Day / Year) */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown(activeDropdown === 'period' ? null : 'period');
                    }}
                    className="h-9 px-3 bg-white border border-slate-300 hover:border-slate-400 rounded-lg font-medium text-slate-700 flex items-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <span>{ganttPeriod}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {periodDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-28 animate-in fade-in zoom-in-95">
                      {(['Day', 'Week', 'Month', 'Year'] as const).map(p => (
                        <button
                          key={p}
                          onClick={() => {
                            setGanttPeriod(p);
                            setActiveDropdown(null);
                          }}
                          className={`w-full px-3 py-1.5 text-left text-xs hover:bg-red-50 hover:text-red-700 cursor-pointer ${
                            ganttPeriod === p ? 'font-bold text-red-600 bg-red-50/50' : 'text-slate-700'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Date Range Picker (From - To) */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 h-9 text-slate-700 shadow-2xs">
                  <span className="text-slate-400">From</span>
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-300">-</span>
                  <span className="text-slate-400">To</span>
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                </div>

                {/* Filter by Assignee */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown(activeDropdown === 'assignee' ? null : 'assignee');
                    }}
                    className={`h-9 px-3 bg-white border rounded-lg font-medium flex items-center gap-2 cursor-pointer shadow-2xs ${
                      ganttAssigneeFilter !== 'All' 
                        ? 'border-red-500 bg-red-50/40 text-red-700' 
                        : 'border-slate-300 text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <span>{ganttAssigneeFilter === 'All' ? 'Filter by assignee' : ganttAssigneeFilter}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {assigneeDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-48 max-h-52 overflow-y-auto animate-in fade-in zoom-in-95">
                      <button
                        onClick={() => {
                          setGanttAssigneeFilter('All');
                          setActiveDropdown(null);
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs hover:bg-red-50 hover:text-red-700 text-slate-700 cursor-pointer font-medium"
                      >
                        All Assignees
                      </button>
                      {uniqueGanttAssignees.map(a => (
                        <button
                          key={a}
                          onClick={() => {
                            setGanttAssigneeFilter(a);
                            setActiveDropdown(null);
                          }}
                          className={`w-full px-3 py-1.5 text-left text-xs hover:bg-red-50 hover:text-red-700 cursor-pointer ${
                            ganttAssigneeFilter === a ? 'font-bold text-red-600 bg-red-50/50' : 'text-slate-700'
                          }`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* All Statuses */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown(activeDropdown === 'status' ? null : 'status');
                    }}
                    className={`h-9 px-3 bg-white border rounded-lg font-medium flex items-center gap-2 cursor-pointer shadow-2xs ${
                      ganttStatusFilter !== 'All' 
                        ? 'border-red-500 bg-red-50/40 text-red-700' 
                        : 'border-slate-300 text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <span>{ganttStatusFilter === 'All' ? 'All statuses' : ganttStatusFilter}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {statusDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-36 animate-in fade-in zoom-in-95">
                      {['All', 'COMPLETED', 'IN_PROGRESS', 'PENDING'].map(s => (
                        <button
                          key={s}
                          onClick={() => {
                            setGanttStatusFilter(s);
                            setActiveDropdown(null);
                          }}
                          className={`w-full px-3 py-1.5 text-left text-xs hover:bg-red-50 hover:text-red-700 cursor-pointer ${
                            ganttStatusFilter === s ? 'font-bold text-red-600 bg-red-50/50' : 'text-slate-700'
                          }`}
                        >
                          {s === 'All' ? 'All statuses' : s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Filter by Project */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown(activeDropdown === 'project' ? null : 'project');
                    }}
                    className={`h-9 px-3 bg-white border rounded-lg font-medium flex items-center gap-2 cursor-pointer shadow-2xs ${
                      ganttProjectFilter !== 'All' 
                        ? 'border-red-500 bg-red-50/40 text-red-700' 
                        : 'border-slate-300 text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <span className="truncate max-w-[120px]">
                      {ganttProjectFilter === 'All' ? 'Filter by project' : ganttProjectFilter}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </button>

                  {projectDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-56 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95">
                      <button
                        onClick={() => {
                          setGanttProjectFilter('All');
                          setActiveDropdown(null);
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs hover:bg-red-50 hover:text-red-700 text-slate-700 cursor-pointer font-medium"
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
                          className={`w-full px-3 py-1.5 text-left text-xs hover:bg-red-50 hover:text-red-700 cursor-pointer truncate ${
                            ganttProjectFilter === p ? 'font-bold text-red-600 bg-red-50/50' : 'text-slate-700'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Export Dropdown */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown(activeDropdown === 'export' ? null : 'export');
                    }}
                    className="h-9 px-3.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 rounded-lg font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span>Export</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {exportDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-36 animate-in fade-in zoom-in-95">
                      <button
                        onClick={() => {
                          handleExport('Excel');
                          setActiveDropdown(null);
                        }}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Export Excel</span>
                      </button>
                      <button
                        onClick={() => {
                          handleExport('PDF');
                          setActiveDropdown(null);
                        }}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-red-600" />
                        <span>Export PDF</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Gantt Chart Table Grid (Image 1 Design with Red & White Theme) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1100px]">
                  
                  {/* Timeline Header Row 1: Years */}
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/70">
                      <th className="w-16 px-4 py-2 border-r border-slate-200 text-center">S.No</th>
                      <th className="w-56 px-4 py-2 border-r border-slate-200">Task name</th>
                      
                      {/* 2025 Header (1 month: Dec) */}
                      <th className="px-3 py-1 text-center font-bold text-slate-700 border-r border-slate-200 bg-slate-50/50">
                        2025
                      </th>

                      {/* 2026 Header (11 months: Jan - Nov) */}
                      <th colSpan={11} className="px-3 py-1 text-center font-bold text-slate-700 bg-slate-50/50">
                        2026
                      </th>
                    </tr>

                    {/* Timeline Header Row 2: Months */}
                    <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-600 bg-white">
                      <th className="border-r border-slate-200" />
                      <th className="border-r border-slate-200" />
                      {TIMELINE_MONTHS.map((m, idx) => (
                        <th 
                          key={idx}
                          className={`py-2 px-2 text-center border-r border-slate-200 font-medium ${
                            m.isCurrent 
                              ? 'bg-red-50/50 text-red-700 font-bold border-red-200' 
                              : 'text-slate-600'
                          }`}
                        >
                          {m.label}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {/* Expandable Group Row: "▼ Unassigned" */}
                    <tr className="bg-slate-50/80 border-b border-slate-200">
                      <td className="border-r border-slate-200" />
                      <td className="px-4 py-2.5 font-bold text-slate-800 text-xs flex items-center gap-1.5 cursor-pointer border-r border-slate-200">
                        <button 
                          onClick={() => setIsUnassignedExpanded(!isUnassignedExpanded)}
                          className="flex items-center gap-1.5 hover:text-red-600"
                        >
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isUnassignedExpanded ? '' : '-rotate-90'}`} />
                          <span>Unassigned</span>
                        </button>
                      </td>

                      {/* Group Summary Timeline Bar (Red & White Theme) */}
                      <td colSpan={12} className="relative py-2 px-2">
                        <div className="w-[50%] ml-[24%] h-7 bg-red-600 text-white rounded-lg flex items-center justify-center font-semibold text-xs shadow-xs tracking-wide">
                          Unassigned ({filteredQuotationTasks.length} Quotation Tasks)
                        </div>
                      </td>
                    </tr>

                    {/* Quotation Task Rows (Image 1) */}
                    {isUnassignedExpanded && filteredQuotationTasks.map((task, idx) => {
                      const placement = getTimelinePlacement(task.start_date, task.end_date);
                      return (
                        <tr 
                          key={task.id}
                          className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors text-xs text-slate-800 group"
                        >
                          {/* S.No */}
                          <td className="px-4 py-3 text-center border-r border-slate-200 text-slate-500 font-medium">
                            {idx + 1}
                          </td>

                          {/* Task Name (Audio Requirement: Quotation details drawer on click) */}
                          <td 
                            onClick={() => setSelectedQuotationDrawerTask(task)}
                            className="px-4 py-3 font-semibold text-slate-800 border-r border-slate-200 cursor-pointer hover:bg-red-50/60 transition-colors group/name"
                            title="Click to view quotation details"
                          >
                            <div className="flex items-center justify-between">
                              <span className="truncate group-hover/name:text-red-600 transition-colors" title={task.task_name}>
                                {task.task_name}
                              </span>
                              {task.status === 'COMPLETED' && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 ml-1.5" />
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-normal truncate mt-0.5 group-hover/name:text-slate-600">
                              {task.project_name}
                            </div>
                          </td>

                          {/* 12 Timeline Month Cells */}
                          {TIMELINE_MONTHS.map((m, mIdx) => {
                            const isBarCell = mIdx === placement.colIndex;
                            return (
                              <td 
                                key={mIdx}
                                className={`relative py-2 px-1 border-r border-slate-100 text-center ${
                                  m.isCurrent ? 'bg-red-50/20' : ''
                                }`}
                              >
                                {isBarCell && (
                                  <div
                                    onMouseEnter={() => setSelectedTaskTooltip(task)}
                                    onMouseLeave={() => setSelectedTaskTooltip(null)}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedQuotationDrawerTask(task);
                                    }}
                                    className="relative inline-block cursor-pointer p-1"
                                    title="Click to view quotation details"
                                  >
                                    {/* Quotation Completion Marker Bar (Styled in sleek Red Theme) */}
                                    <div 
                                      className="w-1.5 h-6 bg-red-600 hover:bg-red-700 hover:w-2.5 rounded-full transition-all shadow-xs mx-auto group-hover:scale-110 active:scale-95"
                                      title={`Completed: ${task.completed_at || task.end_date} - Click to open drawer`}
                                    />

                                    {/* Tooltip on Hover showing exact time & date requested by user */}
                                    {selectedTaskTooltip?.id === task.id && (
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 p-3 bg-slate-900 text-white rounded-xl shadow-2xl text-left text-xs pointer-events-none animate-in fade-in zoom-in-95">
                                        <div className="font-bold text-sm text-red-400 flex items-center justify-between">
                                          <span>{task.task_name}</span>
                                          <span className="text-[10px] px-1.5 py-0.5 bg-red-500/30 text-red-300 rounded font-normal">
                                            {task.status}
                                          </span>
                                        </div>
                                        <div className="text-slate-300 text-[11px] mt-1 font-medium">
                                          {task.project_name}
                                        </div>
                                        <div className="mt-2 pt-2 border-t border-slate-800 space-y-1 text-[11px]">
                                          <div className="flex items-center justify-between text-slate-400">
                                            <span>Completed Time:</span>
                                            <span className="text-white font-semibold">{task.completed_at || '04:25 PM'}</span>
                                          </div>
                                          <div className="flex items-center justify-between text-slate-400">
                                            <span>Target Date:</span>
                                            <span className="text-white">{task.end_date}</span>
                                          </div>
                                          <div className="flex items-center justify-between text-slate-400">
                                            <span>Assignee:</span>
                                            <span className="text-white">{task.assignee}</span>
                                          </div>
                                        </div>
                                        {task.remarks && (
                                          <div className="mt-2 text-[10.5px] text-slate-400 italic">
                                            "{task.remarks}"
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}

                        </tr>
                      );
                    })}

                  </tbody>
                </table>
              </div>

              {/* Gantt Footer Summary */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-red-600 rounded-sm" />
                    <span>Quotation Milestone Completed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-red-50 border border-red-200 rounded-sm" />
                    <span>Current Execution Month (Oct 2026)</span>
                  </div>
                </div>
                <span>Hover over marker bars to view completion date, time & scope remarks.</span>
              </div>
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
