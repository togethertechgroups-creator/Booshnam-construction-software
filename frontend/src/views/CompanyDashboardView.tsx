import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { SVGProps } from 'react';
import { 
  Bell, User as UserIcon, RefreshCw, Calendar,
  ArrowUpDown, BarChart2, Maximize2, Minimize2, MoreVertical, 
  Search, CheckCircle2, AlertTriangle, Filter, ChevronDown, 
  TrendingUp, DollarSign, Layers, ArrowDownRight,
  Settings, UserX, LogOut, CheckCheck, Clock, ShieldCheck, X,
  Download, FileSpreadsheet, Check, PieChart, Wallet, CreditCard,
  ArrowLeft, Menu, LayoutDashboard, RotateCcw, FileText,
  Activity, HeartPulse, PlayCircle, PauseCircle, FolderKanban, Sparkles, Users, MessageSquare
} from 'lucide-react';
import { toggleBrowserFullscreen, addFullscreenChangeListener } from '../lib/fullscreenService';

export function ArrowsDiagonalRotatedIcon({ size = 24, className = '', ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  const [animKey, setAnimKey] = useState(0);

  return (
    <svg 
      key={animKey}
      onMouseEnter={() => setAnimKey(prev => prev + 1)}
      width={size} 
      height={size} 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      className={className}
      {...props}
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path strokeDasharray="12" d="M14 14l6.5 6.5M10 10l-6.5 -6.5">
          <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.4s" values="12;0" />
        </path>
        <path strokeDasharray="8" strokeDashoffset="8" d="M3 3h6M21 21v-6M3 3v6M21 21h-6">
          <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.4s" dur="0.2s" to="0" />
        </path>
      </g>
    </svg>
  );
}

export function ArrowsDiagonalMinimizeIcon({ size = 24, className = '', ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  const [animKey, setAnimKey] = useState(0);

  return (
    <svg 
      key={animKey}
      onMouseEnter={() => setAnimKey(prev => prev + 1)}
      width={size} 
      height={size} 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      className={className}
      {...props}
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path strokeDasharray="12" d="M4 4l5 5M20 20l-5 -5">
          <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.4s" values="12;0" />
        </path>
        <path strokeDasharray="8" strokeDashoffset="8" d="M9 4v5H4M15 20v-5h5">
          <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.4s" dur="0.2s" to="0" />
        </path>
      </g>
    </svg>
  );
}
import { Project, User } from '../types';
import { MOCK_USER, formatProjectTitle } from '../lib/mockData';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UserProfileDropdown } from '../components/UserProfileDropdown';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { CustomSelect } from '../components/CustomSelect';
import { 
  getActiveDepartmentId, 
  normalizeDepartmentId,
  ORGANIZATION_DEPARTMENTS,
  isUserCompanyWideSuperAdmin,
  getUserAllowedDepartmentIds
} from '../lib/departmentService';
import { getCurrentUserAccount } from '../lib/authService';
import { TodayTasksReminderBanner } from '../components/dashboard/TodayTasksReminderBanner';

export interface UnderlyingAttendanceRecord {
  id: string;
  date: string;
  fullDate: string;
  employee_code: string;
  name: string;
  role: string;
  status: 'Present' | 'Absent' | 'Overtime' | 'Half Day';
  payroll_type: 'Office Staff' | 'Site Staff';
  salary: number;
  salary_type: 'Day' | 'Month';
  overtime_hours: number;
}

const MASTER_EMPLOYEES: Array<{
  employee_code: string;
  name: string;
  role: string;
  payroll_type: 'Office Staff' | 'Site Staff';
  salary: number;
  salary_type: 'Day' | 'Month';
}> = [];

interface CompanyDashboardViewProps {
  projects: Project[];
  onSelectProject?: (p: Project) => void;
  onNavigate?: (view: string) => void;
  canViewCost?: boolean;
  user?: User;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const CompanyDashboardView: React.FC<CompanyDashboardViewProps> = ({
  projects,
  onSelectProject,
  onNavigate,
  canViewCost = true,
  user,
  isSidebarOpen,
  onToggleSidebar
}) => {
  const currentUser = user || MOCK_USER;
  const [activeTab, setActiveTab] = useState<'operational' | 'financial'>('operational');

  // Active Department State (Synchronized with global switcher)
  const [activeDeptId, setActiveDeptId] = useState<string>(() => getActiveDepartmentId());

  useEffect(() => {
    const handleDeptChange = (e: any) => {
      const newId = e.detail || getActiveDepartmentId();
      setActiveDeptId(newId);
    };
    window.addEventListener('booshnam_active_dept_changed', handleDeptChange);
    return () => window.removeEventListener('booshnam_active_dept_changed', handleDeptChange);
  }, []);

  // Fullscreen State & Toggle
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const unsub = addFullscreenChangeListener((fs) => {
      setIsFullscreen(fs);
    });
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      unsub();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  const toggleFullscreen = async () => {
    const nextState = !isFullscreen;
    setIsFullscreen(nextState);
    try {
      await toggleBrowserFullscreen();
    } catch (e) {}
  };

  // Header Interactive Dropdowns & Modals
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isAccessBlocked, setIsAccessBlocked] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Close dropdowns when clicking outside
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const healthDotsMenuRef = useRef<HTMLDivElement>(null);
  const finDownloadRef = useRef<HTMLDivElement>(null);
  const salesDotsMenuRef = useRef<HTMLDivElement>(null);
  const expenseDotsMenuRef = useRef<HTMLDivElement>(null);
  const marginDotsMenuRef = useRef<HTMLDivElement>(null);

  // Financial Cards More Options Menus
  const [showSalesMoreMenu, setShowSalesMoreMenu] = useState(false);
  const [showExpenseMoreMenu, setShowExpenseMoreMenu] = useState(false);
  const [showMarginMoreMenu, setShowMarginMoreMenu] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotificationDropdown(false);
      }
      if (healthDotsMenuRef.current && !healthDotsMenuRef.current.contains(e.target as Node)) {
        setShowHealthMenuDropdown(false);
      }
      if (finDownloadRef.current && !finDownloadRef.current.contains(e.target as Node)) {
        setShowFinDownloadDropdown(false);
      }
      if (salesDotsMenuRef.current && !salesDotsMenuRef.current.contains(e.target as Node)) {
        setShowSalesMoreMenu(false);
      }
      if (expenseDotsMenuRef.current && !expenseDotsMenuRef.current.contains(e.target as Node)) {
        setShowExpenseMoreMenu(false);
      }
      if (marginDotsMenuRef.current && !marginDotsMenuRef.current.contains(e.target as Node)) {
        setShowMarginMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Real-time site notifications
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    title: string;
    description: string;
    time: string;
    read: boolean;
  }>>([]);

  const unreadNotifCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showToast('All notifications marked as read');
  };

  const handleMarkSingleRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };
  
  // Filters
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [selectedHealthFilter, setSelectedHealthFilter] = useState('All');
  
  // Attendance filters
  const [payrollType, setPayrollType] = useState('All');
  const [workforceName, setWorkforceName] = useState('All');

  // Table Search filters
  const [searchName, setSearchName] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [searchPersonnel, setSearchPersonnel] = useState('');
  const [searchStatus, setSearchStatus] = useState('All');
  const [searchHealth, setSearchHealth] = useState('All');
  const [searchDueDate, setSearchDueDate] = useState('');

  // Attendance Date definitions (7 consecutive days matching screenshot)
  const ATTENDANCE_DATES = [
    { date: '09-Sep', fullDate: '09-Sep-2026' },
    { date: '10-Sep', fullDate: '10-Sep-2026' },
    { date: '11-Sep', fullDate: '11-Sep-2026' },
    { date: '12-Sep', fullDate: '12-Sep-2026' },
    { date: '13-Sep', fullDate: '13-Sep-2026' },
    { date: '14-Sep', fullDate: '14-Sep-2026' },
    { date: '15-Sep', fullDate: '15-Sep-2026' },
  ];

  // Attendance absent mapping
  const ATTENDANCE_ABSENT_MAP: Record<string, string[]> = {};

  const getUnderlyingAttendanceRecords = (
    dateKey: string,
    customPayroll?: string,
    customWorkforce?: string
  ): UnderlyingAttendanceRecord[] => {
    const pFilter = customPayroll !== undefined ? customPayroll : payrollType;
    const wFilter = customWorkforce !== undefined ? customWorkforce : workforceName;
    const absentList = ATTENDANCE_ABSENT_MAP[dateKey] || [];
    const fullDate = ATTENDANCE_DATES.find(d => d.date === dateKey)?.fullDate || `${dateKey}-2026`;

    const matchingEmployees = MASTER_EMPLOYEES.filter(emp => {
      const matchesPayroll = pFilter === 'All' || emp.payroll_type === pFilter;
      const matchesWorkforce = wFilter === 'All' || emp.role === wFilter;
      return matchesPayroll && matchesWorkforce;
    });

    return matchingEmployees.map((emp, idx) => {
      const isAbsent = absentList.includes(emp.employee_code);
      let status: 'Present' | 'Absent' | 'Overtime' | 'Half Day' = isAbsent ? 'Absent' : 'Present';
      let overtime_hours = 0;

      if (!isAbsent) {
        if (idx % 3 === 1) {
          status = 'Overtime';
          overtime_hours = ((idx % 4) + 1) * 0.5 + 1.0;
        } else if (idx === matchingEmployees.length - 1 && matchingEmployees.length > 3 && idx % 2 === 1) {
          status = 'Half Day';
        }
      }

      return {
        id: `att-${dateKey}-${emp.employee_code}`,
        date: dateKey,
        fullDate,
        employee_code: emp.employee_code,
        name: emp.name,
        role: emp.role,
        status,
        payroll_type: emp.payroll_type,
        salary: emp.salary,
        salary_type: emp.salary_type,
        overtime_hours,
      };
    });
  };

  // Dynamic 7-day attendance counts driven by selected Payroll Type and Workforce Name filters
  const attendanceData = useMemo(() => {
    return ATTENDANCE_DATES.map(d => {
      const records = getUnderlyingAttendanceRecords(d.date, payrollType, workforceName);
      const presentRecords = records.filter(r => r.status !== 'Absent');
      const absentRecords = records.filter(r => r.status === 'Absent');
      const otHours = records.reduce((sum, r) => sum + r.overtime_hours, 0);

      return {
        date: d.date,
        fullDate: d.fullDate,
        count: presentRecords.length,
        present: presentRecords.length,
        absent: absentRecords.length,
        otHours: Number(otHours.toFixed(1)),
        totalRoster: records.length,
      };
    });
  }, [payrollType, workforceName]);

  // Scaled max workers for the chart Y-axis & bar heights
  const chartMaxWorkers = useMemo(() => {
    const maxInAttendance = Math.max(...attendanceData.map(d => d.count), 0);
    if (payrollType === 'All' && workforceName === 'All') return 25;
    if (maxInAttendance > 15) return 25;
    if (maxInAttendance > 8) return 12;
    if (maxInAttendance > 3) return 6;
    if (maxInAttendance > 0) return 2;
    return 5;
  }, [attendanceData, payrollType, workforceName]);

  // Interactive Attendance Chart & Underlying Data States
  const [selectedAttendanceBar, setSelectedAttendanceBar] = useState<string | null>(null);
  const [hoveredAttendanceBar, setHoveredAttendanceBar] = useState<{
    date: string;
    fullDate: string;
    count: number;
    present: number;
    absent: number;
    otHours: number;
    x: number;
    y: number;
  } | null>(null);

  const [isUnderlyingPageView, setIsUnderlyingPageView] = useState(false);
  const [selectedModalDate, setSelectedModalDate] = useState<string>('09-Sep');
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [modalStatusFilter, setModalStatusFilter] = useState('All');
  const [modalPayrollFilter, setModalPayrollFilter] = useState('All');
  const [modalWorkforceFilter, setModalWorkforceFilter] = useState('All');

  // Project Health Underlying Sheet States
  const [showHealthMenuDropdown, setShowHealthMenuDropdown] = useState(false);
  const [isUnderlyingHealthPageView, setIsUnderlyingHealthPageView] = useState(false);
  const [healthSearchTerm, setHealthSearchTerm] = useState('');
  const [healthFilterTab, setHealthFilterTab] = useState<'All' | 'Normal' | 'At Risk'>('All');

  // Dynamic Projects derived from projects prop (matches active department or full portfolio)
  const summaryProjects = useMemo(() => {
    const validProjects = (projects || []).filter(p => 
      !['Prestige Boulevard', 'Royal Palm', 'Green Valley', 'Sunrise Industrial', 'Urban Metro', 'Skyline Contemporary', 'Heritage Courtyard', 'Highway Overpass', 'Government Medical College', 'High-Rise Commercial', 'Coastal Highway'].some(t => (p.name || (p as any).title || p.client_name || '').includes(t))
    );

    const userAcc = getCurrentUserAccount();
    const isSuperAdminCompanyWide = isUserCompanyWideSuperAdmin(userAcc);
    const allowedDeptIds = getUserAllowedDepartmentIds(userAcc);
    const isRestricted = !isSuperAdminCompanyWide && allowedDeptIds !== null && allowedDeptIds.length > 0;

    let rawList = validProjects;
    if (isRestricted && allowedDeptIds) {
      rawList = validProjects.filter(p => allowedDeptIds.includes(normalizeDepartmentId(p.department as string) as any));
      if (allowedDeptIds.includes(activeDeptId as any)) {
        rawList = rawList.filter(p => normalizeDepartmentId(p.department as string) === activeDeptId);
      }
    } else if (activeDeptId === 'booshnam_associates') {
      rawList = validProjects;
    } else {
      rawList = validProjects.filter(p => normalizeDepartmentId(p.department as string) === activeDeptId);
    }

    if (rawList && rawList.length > 0) {
      return rawList.map((p, idx) => {
        const title = formatProjectTitle(p);
        const leadPerson = p.assigned_team && p.assigned_team.length > 0
          ? `${p.assigned_team[0].name} (${p.assigned_team[0].role})`
          : '-';
        
        // Dynamically compute progress: check tasks in localStorage first, then p.progress_percentage
        let dynamicProgress = typeof p.progress_percentage === 'number' ? p.progress_percentage : 0;
        try {
          const raw = localStorage.getItem(`booshnam_wbs_tasks_v2_${p.id}`);
          if (raw) {
            const parsedTasks = JSON.parse(raw);
            if (Array.isArray(parsedTasks) && parsedTasks.length > 0) {
              const taskCount = parsedTasks.length;
              let sumTaskProg = 0;
              parsedTasks.forEach((t: any) => {
                if (t.status === 'COMPLETED' || t.progress_percentage === 100) {
                  sumTaskProg += 100;
                } else if (typeof t.progress_percentage === 'number') {
                  sumTaskProg += t.progress_percentage;
                }
              });
              dynamicProgress = Math.round(sumTaskProg / taskCount);
            }
          }
        } catch (e) {}
        dynamicProgress = Math.min(100, Math.max(0, dynamicProgress));

        let displayStatus: 'Ongoing' | 'Not Started' | 'Onhold' | 'Completed' = 'Ongoing';
        const pStatusUpper = String(p.status || '').toUpperCase();
        if (pStatusUpper === 'COMPLETED' || dynamicProgress >= 100) {
          displayStatus = 'Completed';
        } else if (pStatusUpper === 'ON_HOLD' || pStatusUpper === 'ONHOLD') {
          displayStatus = 'Onhold';
        } else if (pStatusUpper === 'PLANNING' || pStatusUpper === 'NOT_STARTED' || pStatusUpper === 'NOT STARTED') {
          displayStatus = 'Not Started';
        } else {
          displayStatus = 'Ongoing';
        }

        const assignedCode = p.code || `PRJ-00${idx + 1}`;
        const rawHealth = (p as any).health || (p as any).health_status;
        let healthStatus: 'Normal' | 'At Risk' = 'Normal';
        if (rawHealth === 'At Risk' || rawHealth === 'AT_RISK' || rawHealth === 'Critical') {
          healthStatus = 'At Risk';
        } else if (rawHealth === 'Normal' || rawHealth === 'Healthy') {
          healthStatus = 'Normal';
        } else if (displayStatus === 'Onhold' || p.status === 'ON_HOLD') {
          healthStatus = 'At Risk';
        } else if (p.approval_pending_count !== undefined && p.approval_pending_count > 1) {
          healthStatus = 'At Risk';
        } else {
          healthStatus = 'Normal';
        }

        return {
          id: p.id || String(idx + 1),
          code: assignedCode,
          name: title,
          department: p.department,
          category: p.category || p.project_type || 'General',
          personnel: leadPerson,
          status: displayStatus,
          health: healthStatus,
          date: p.expected_end_date || '-',
          progress: dynamicProgress,
          notes: healthStatus === 'At Risk'
            ? 'Critical delay in approvals or overseas equipment. Remediation active.'
            : 'On schedule. Healthy operational status.'
        };
      });
    }
    return [];
  }, [projects, activeDeptId]);

  const kpiCounts = useMemo(() => {
    let notStarted = 0;
    let ongoing = 0;
    let onhold = 0;
    let completed = 0;
    let healthyCount = 0;
    let atRiskCount = 0;

    summaryProjects.forEach(p => {
      if (p.status === 'Not Started') notStarted++;
      else if (p.status === 'Ongoing') ongoing++;
      else if (p.status === 'Onhold') onhold++;
      else if (p.status === 'Completed') completed++;

      if (p.health === 'At Risk') atRiskCount++;
      else healthyCount++;
    });

    const total = summaryProjects.length;
    const healthyPercent = total > 0 ? Math.round((healthyCount / total) * 100) : 0;

    return {
      notStarted,
      ongoing,
      onhold,
      completed,
      total,
      healthyCount,
      atRiskCount,
      healthyPercent
    };
  }, [summaryProjects]);

  // Dynamic Project Health computed specifically based on selectedProjectFilter
  const healthStats = useMemo(() => {
    const isAll = selectedProjectFilter === 'All';
    const list = isAll 
      ? summaryProjects 
      : summaryProjects.filter(p => p.name === selectedProjectFilter);

    const total = list.length;
    if (total === 0) {
      return {
        total: 0,
        healthyCount: 0,
        atRiskCount: 0,
        percent: 0,
        statusLabel: 'No Active Projects',
        isAtRisk: false,
        isSingle: false,
        projectName: 'All Projects',
      };
    }

    const healthyCount = list.filter(p => p.health === 'Normal').length;
    const atRiskCount = list.filter(p => p.health === 'At Risk').length;
    const isSingle = total === 1;

    let percent = 0;
    let statusLabel = 'Optimal Status';
    let isAtRisk = atRiskCount > 0;

    if (total === 1) {
      // Single project: show that project's exact progress %
      const proj = list[0];
      percent = Math.min(100, Math.max(0, Math.round(proj.progress || 0)));
      isAtRisk = proj.health === 'At Risk';

      if (isAtRisk) {
        statusLabel = 'At Risk Alert';
      } else if (percent === 100) {
        statusLabel = 'Completed';
      } else if (percent > 0) {
        statusLabel = 'In Progress';
      } else {
        statusLabel = 'Not Started';
      }
    } else {
      // Overall portfolio progress across all projects in the selected filter
      const totalProgressSum = list.reduce((sum, p) => sum + (p.progress || 0), 0);
      percent = Math.round(totalProgressSum / total);
      isAtRisk = atRiskCount > 0;

      if (isAtRisk) {
        statusLabel = `${atRiskCount} Sites At Risk`;
      } else if (percent === 100) {
        statusLabel = 'Completed';
      } else if (percent > 0) {
        statusLabel = 'In Progress';
      } else {
        statusLabel = 'Not Started';
      }
    }

    return {
      total,
      healthyCount,
      atRiskCount,
      percent,
      statusLabel,
      isAtRisk,
      isSingle: false,
      projectName: 'All Projects',
    };
  }, [summaryProjects, selectedProjectFilter]);

  const healthProjectsData = useMemo(() => {
    return summaryProjects.map(p => ({
      id: p.id,
      code: p.code,
      name: p.name,
      category: p.category,
      personnel: p.personnel,
      status: p.status,
      health: p.health,
      progress: p.progress,
      date: p.date,
      notes: p.notes
    }));
  }, [summaryProjects]);

  const healthFilteredProjects = useMemo(() => {
    return healthProjectsData.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(healthSearchTerm.toLowerCase()) ||
                            p.personnel.toLowerCase().includes(healthSearchTerm.toLowerCase()) ||
                            p.category.toLowerCase().includes(healthSearchTerm.toLowerCase());
      const matchesTab = healthFilterTab === 'All' || p.health === healthFilterTab;
      return matchesSearch && matchesTab;
    });
  }, [healthProjectsData, healthSearchTerm, healthFilterTab]);

  const handleExportHealthExcel = () => {
    try {
      const headers = [
        'S.No',
        'Project ID',
        'Project Name',
        'Category',
        'Project In-Charge',
        'Health Status',
        'Progress %',
        'Status',
        'Target Completion Date',
        'Operational & Risk Notes',
      ];

      const dataRows = healthProjectsData.map((p, i) => [
        i + 1,
        p.code,
        p.name,
        p.category,
        p.personnel,
        p.health === 'Normal' ? 'Healthy' : 'At Risk',
        `${p.progress}%`,
        p.status,
        p.date,
        p.notes,
      ]);

      const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Project Health Registry');
      XLSX.writeFile(wb, 'Project_Health_Registry_2026.xlsx');
      showToast('Exported Project Health sheet successfully');
    } catch (err) {
      console.error('Failed to export health excel', err);
      showToast('Error exporting Project Health sheet');
    }
  };

  const handleExportAttendanceExcel = (records: UnderlyingAttendanceRecord[], dateStr: string) => {
    try {
      const headers = [
        'S.No',
        'Attendance Date',
        'Employee Code',
        'Worker / Employee Name',
        'Role / Designation',
        'Attendance Status',
        'Payroll Type',
        'Salary / Wage',
        'Overtime (Hours)',
      ];

      const dataRows = records.map((r, i) => [
        i + 1,
        r.fullDate,
        r.employee_code,
        r.name,
        r.role,
        r.status,
        r.payroll_type,
        r.salary_type === 'Month' ? `₹${r.salary.toLocaleString()} / mo` : `₹${r.salary.toLocaleString()} / day`,
        r.overtime_hours > 0 ? `${r.overtime_hours} hrs` : '0.0 hrs',
      ]);

      const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance Roster');
      XLSX.writeFile(wb, `Attendance_Roster_${dateStr.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`);
      showToast(`Exported attendance roster for ${dateStr} successfully`);
    } catch (err) {
      console.error('Failed to export excel', err);
      showToast('Error exporting attendance roster');
    }
  };

  // Filtered operational rows
  const filteredSummary = summaryProjects.filter(p => {
    const matchesProject = selectedProjectFilter === 'All' || p.name === selectedProjectFilter;
    const matchesName = p.name.toLowerCase().includes(searchName.toLowerCase());
    const matchesCategory = searchCategory === '' || p.category.toLowerCase().includes(searchCategory.toLowerCase());
    const matchesPersonnel = searchPersonnel === '' || p.personnel.toLowerCase().includes(searchPersonnel.toLowerCase());
    const matchesStatus = (selectedStatusFilter === 'All' || p.status === selectedStatusFilter) &&
                          (searchStatus === 'All' || p.status === searchStatus);
    const matchesHealth = (selectedHealthFilter === 'All' || p.health === selectedHealthFilter) &&
                          (searchHealth === 'All' || p.health === searchHealth);
    const matchesDueDate = searchDueDate === '' || p.date === searchDueDate || p.date.includes(searchDueDate);
    return matchesProject && matchesName && matchesCategory && matchesPersonnel && matchesStatus && matchesHealth && matchesDueDate;
  });

  // Financial Tab Filters & State
  const [finProjectFilter, setFinProjectFilter] = useState('All');
  const [fromDate, setFromDate] = useState('2026-01-01');
  const [toDate, setToDate] = useState('2026-07-31');
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [showFinDownloadDropdown, setShowFinDownloadDropdown] = useState(false);

  // Financial Table Search Filters
  const [finSearchName, setFinSearchName] = useState('');
  const [finSearchStatus, setFinSearchStatus] = useState('All');
  const [finSearchHealth, setFinSearchHealth] = useState('All');
  const [finSearchBudget, setFinSearchBudget] = useState('');
  const [finSearchExpense, setFinSearchExpense] = useState('');

  // Checkbox filters for charts
  const [showPaymentIn, setShowPaymentIn] = useState(true);
  const [showPaymentOut, setShowPaymentOut] = useState(true);

  const [showSubconExp, setShowSubconExp] = useState(true);
  const [showOtherExp, setShowOtherExp] = useState(true);
  const [showSalaryExp, setShowSalaryExp] = useState(true);
  const [showSiteExp, setShowSiteExp] = useState(true);

  const [showToPay, setShowToPay] = useState(true);
  const [showToReceive, setShowToReceive] = useState(true);
  const [showAdvancePaid, setShowAdvancePaid] = useState(true);
  const [showAdvanceReceived, setShowAdvanceReceived] = useState(true);
  const [showSettled, setShowSettled] = useState(true);

  // Financial Table rows derived dynamically from projects and strictly isolated to active department
  const finSummaryRows = useMemo(() => {
    const validProjects = (projects || []).filter(p => 
      !p.id?.startsWith('proj-') &&
      !['Prestige Boulevard', 'Royal Palm', 'Green Valley', 'Sunrise Industrial', 'Urban Metro', 'Skyline Contemporary', 'Heritage Courtyard', 'Highway Overpass', 'Government Medical College', 'High-Rise Commercial', 'Coastal Highway'].some(t => (p.name || (p as any).title || p.client_name || '').includes(t))
    );
    if (!validProjects || validProjects.length === 0) return [];

    const targetDeptProjects = activeDeptId === 'booshnam_associates'
      ? validProjects
      : validProjects.filter(p => normalizeDepartmentId(p.department as string) === activeDeptId);

    return targetDeptProjects.map((p, idx) => {
      const budget = p.estimated_budget || 0;
      const expense = (p as any).spent_budget || p.actual_cost || Number(p.cash_out || 0);
      const sales = Number(p.cash_in || 0) > 0 ? Number(p.cash_in) : budget;
      const paymentIn = Number(p.cash_in || 0) > 0 ? Number(p.cash_in) : budget;
      const paymentOut = Number(p.cash_out || 0) > 0 ? Number(p.cash_out) : expense;
      return {
        id: p.id || String(idx + 1),
        name: formatProjectTitle(p),
        status: p.status === 'COMPLETED' ? 'Complete' : 'Ongoing',
        health: (p as any).health || (p as any).health_status || 'Normal',
        budget,
        expense,
        sales,
        paymentIn,
        paymentOut,
      };
    });
  }, [projects, activeDeptId]);

  const filteredFinRows = useMemo(() => {
    return finSummaryRows.filter(r => {
      const matchesProject = finProjectFilter === 'All' || r.name === finProjectFilter;
      const matchesName = r.name.toLowerCase().includes(finSearchName.toLowerCase());
      const matchesStatus = (finSearchStatus === 'All' || r.status === finSearchStatus);
      const matchesHealth = (finSearchHealth === 'All' || r.health === finSearchHealth);
      const matchesBudget = finSearchBudget === '' || r.budget.toString().includes(finSearchBudget);
      const matchesExpense = finSearchExpense === '' || r.expense.toString().includes(finSearchExpense);
      return matchesProject && matchesName && matchesStatus && matchesHealth && matchesBudget && matchesExpense;
    });
  }, [finSummaryRows, finProjectFilter, finSearchName, finSearchStatus, finSearchHealth, finSearchBudget, finSearchExpense]);

  const totalFinSales = useMemo(() => filteredFinRows.reduce((s, r) => s + r.sales, 0), [filteredFinRows]);
  const totalFinExpense = useMemo(() => filteredFinRows.reduce((s, r) => s + r.expense, 0), [filteredFinRows]);
  const totalFinMargin = totalFinSales - totalFinExpense;
  const totalFinPaymentIn = useMemo(() => filteredFinRows.reduce((s, r) => s + r.paymentIn, 0), [filteredFinRows]);
  const totalFinPaymentOut = useMemo(() => filteredFinRows.reduce((s, r) => s + r.paymentOut, 0), [filteredFinRows]);

  // Financial Monthly Data (Clean Dynamic Structure driven by department numbers)
  const finMonthlyData = useMemo(() => {
    const months = ['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026'];
    const weights = [0.08, 0.12, 0.15, 0.18, 0.14, 0.16, 0.17];
    return months.map((month, i) => {
      const w = weights[i];
      const sales = (totalFinSales * w) / 1000000;
      const expense = (totalFinExpense * w) / 1000000;
      const margin = sales - expense;
      const payIn = (totalFinPaymentIn * w) / 1000000;
      const payOut = (totalFinPaymentOut * w) / 1000000;
      return { month, sales, expense, margin, payIn, payOut };
    });
  }, [totalFinSales, totalFinExpense, totalFinPaymentIn, totalFinPaymentOut]);

  const maxSales = useMemo(() => Math.max(...finMonthlyData.map(d => d.sales), 0.01), [finMonthlyData]);
  const salesChartPoints = useMemo(() => {
    return finMonthlyData.map((d, idx) => ({
      x: idx * 46,
      y: d.sales > 0 ? Math.max(15, 80 - (d.sales / maxSales) * 65) : 80,
      val: d.sales
    }));
  }, [finMonthlyData, maxSales]);
  const salesPointsStr = useMemo(() => salesChartPoints.map(p => `${p.x},${p.y}`).join(' '), [salesChartPoints]);

  const maxExpense = useMemo(() => Math.max(...finMonthlyData.map(d => d.expense), 0.01), [finMonthlyData]);
  const expenseChartPoints = useMemo(() => {
    return finMonthlyData.map((d, idx) => ({
      x: idx * 46,
      y: d.expense > 0 ? Math.max(15, 80 - (d.expense / maxExpense) * 65) : 80,
      val: d.expense
    }));
  }, [finMonthlyData, maxExpense]);
  const expensePointsStr = useMemo(() => expenseChartPoints.map(p => `${p.x},${p.y}`).join(' '), [expenseChartPoints]);

  const maxMargin = useMemo(() => Math.max(...finMonthlyData.map(d => d.margin), 0.01), [finMonthlyData]);
  const marginChartPoints = useMemo(() => {
    return finMonthlyData.map((d, idx) => ({
      x: idx * 46,
      y: d.margin > 0 ? Math.max(15, 80 - (d.margin / maxMargin) * 65) : 80,
      val: d.margin
    }));
  }, [finMonthlyData, maxMargin]);
  const marginPointsStr = useMemo(() => marginChartPoints.map(p => `${p.x},${p.y}`).join(' '), [marginChartPoints]);

  const handleExportExcel = () => {
    try {
      const headers = [
        'S.No',
        'Project Name',
        'Project Status',
        'Project Health',
        'Project Budget (₹)',
        'Total Expense (₹)',
        'Budget Remaining (₹)',
        'Total Sales (₹)',
        'Project Margin (₹)',
        'Payment In (₹)',
        'Payment Out (₹)',
        'Cash Balance (₹)',
      ];

      const dataRows = filteredFinRows.map((r, i) => {
        const budgetRemaining = r.budget > 0 ? (r.budget - r.expense) : 0;
        const margin = r.sales - r.expense;
        const cashBalance = r.paymentIn - r.paymentOut;
        return [
          i + 1,
          r.name,
          r.status,
          r.health,
          r.budget,
          r.expense,
          budgetRemaining,
          r.sales,
          margin,
          r.paymentIn,
          r.paymentOut,
          cashBalance,
        ];
      });

      const totalsRow = [
        'Total',
        `Summary (${filteredFinRows.length} Projects)`,
        '',
        '',
        filteredFinRows.reduce((s, r) => s + r.budget, 0),
        filteredFinRows.reduce((s, r) => s + r.expense, 0),
        filteredFinRows.reduce((s, r) => s + (r.budget > 0 ? r.budget - r.expense : 0), 0),
        filteredFinRows.reduce((s, r) => s + r.sales, 0),
        filteredFinRows.reduce((s, r) => s + (r.sales - r.expense), 0),
        filteredFinRows.reduce((s, r) => s + r.paymentIn, 0),
        filteredFinRows.reduce((s, r) => s + r.paymentOut, 0),
        filteredFinRows.reduce((s, r) => s + (r.paymentIn - r.paymentOut), 0),
      ];

      const wsData = [headers, ...dataRows, totalsRow];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      ws['!cols'] = [
        { wch: 8 },   // S.No
        { wch: 45 },  // Project Name
        { wch: 15 },  // Status
        { wch: 15 },  // Health
        { wch: 18 },  // Budget
        { wch: 18 },  // Expense
        { wch: 20 },  // Remaining
        { wch: 18 },  // Sales
        { wch: 18 },  // Margin
        { wch: 18 },  // Payment In
        { wch: 18 },  // Payment Out
        { wch: 18 },  // Cash Balance
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Financial Summary');

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Project_Financial_Summary_${fromDate}_to_${toDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast('Project Financial Summary exported successfully as Excel (.xlsx)');
    } catch (err) {
      console.error('Failed to export Excel:', err);
      showToast('Failed to export Excel file');
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = [
        '#', 
        'Project Name', 
        'Project Status', 
        'Project Health', 
        'Project Budget', 
        'Total Expense', 
        'Budget Remaining', 
        'Total Sales', 
        'Project Margin', 
        'Payment In', 
        'Payment Out', 
        'Cash Balance'
      ];
      const rows = filteredFinRows.map((r, i) => {
        const budgetRemaining = r.budget > 0 ? (r.budget - r.expense) : 0;
        const margin = r.sales - r.expense;
        const cashBalance = r.paymentIn - r.paymentOut;
        return [
          i + 1,
          `"${r.name.replace(/"/g, '""')}"`,
          `"${r.status}"`,
          `"${r.health}"`,
          r.budget,
          r.expense,
          budgetRemaining,
          r.sales,
          margin,
          r.paymentIn,
          r.paymentOut,
          cashBalance
        ];
      });
      const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `financial_summary_${fromDate}_to_${toDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast('Financial summary exported successfully with all 12 columns');
    } catch (err) {
      console.error('Failed to export CSV:', err);
      showToast('Failed to export CSV file');
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4',
      });

      const totalBudget = filteredFinRows.reduce((s, r) => s + r.budget, 0);
      const totalExpense = filteredFinRows.reduce((s, r) => s + r.expense, 0);
      const totalSales = filteredFinRows.reduce((s, r) => s + r.sales, 0);
      const totalMargin = totalSales - totalExpense;
      const totalPaymentIn = filteredFinRows.reduce((s, r) => s + r.paymentIn, 0);
      const totalPaymentOut = filteredFinRows.reduce((s, r) => s + r.paymentOut, 0);
      const netCashBalance = totalPaymentIn - totalPaymentOut;

      // Top Red Accent Line
      doc.setFillColor(220, 38, 38);
      doc.rect(0, 0, doc.internal.pageSize.width, 8, 'F');

      // Header: Company & Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text('BOOSHNAM ASSOCIATES', 40, 38);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Executive Financial & Project Cost Ledger Report', 40, 52);

      // Metadata right aligned
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      const rightX = doc.internal.pageSize.width - 40;
      doc.text(`Period: ${fromDate} to ${toDate}`, rightX, 36, { align: 'right' });
      doc.text(`Project Filter: ${finProjectFilter}`, rightX, 48, { align: 'right' });
      doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, rightX, 60, { align: 'right' });

      // KPI Metric Cards
      const kpis = [
        { label: 'TOTAL SALES', val: `₹${(totalSales / 1000000).toFixed(2)}M`, color: [5, 150, 105] },
        { label: 'TOTAL EXPENSE', val: `₹${(totalExpense / 1000000).toFixed(2)}M`, color: [225, 29, 72] },
        { label: 'NET MARGIN', val: `₹${(totalMargin / 1000000).toFixed(2)}M`, color: [37, 99, 235] },
        { label: 'BUDGET ALLOCATED', val: `₹${(totalBudget / 1000000).toFixed(2)}M`, color: [71, 85, 105] },
        { label: 'CASH BALANCE', val: `₹${(netCashBalance / 1000000).toFixed(2)}M`, color: [16, 185, 129] },
      ];

      const kpiStartY = 72;
      const kpiCardWidth = (doc.internal.pageSize.width - 80 - (kpis.length - 1) * 8) / kpis.length;
      kpis.forEach((kpi, idx) => {
        const cardX = 40 + idx * (kpiCardWidth + 8);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(cardX, kpiStartY, kpiCardWidth, 34, 3, 3, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(kpi.label, cardX + kpiCardWidth / 2, kpiStartY + 12, { align: 'center' });

        doc.setFontSize(10.5);
        doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
        doc.text(kpi.val, cardX + kpiCardWidth / 2, kpiStartY + 26, { align: 'center' });
      });

      // Data Table
      const headers = [
        '#',
        'Project Name',
        'Status',
        'Health',
        'Budget (₹)',
        'Expense (₹)',
        'Remaining (₹)',
        'Sales (₹)',
        'Margin (₹)',
        'Cash Bal (₹)',
      ];

      const rows = filteredFinRows.map((r, i) => {
        const remaining = r.budget > 0 ? r.budget - r.expense : 0;
        const margin = r.sales - r.expense;
        const cashBal = r.paymentIn - r.paymentOut;
        return [
          i + 1,
          r.name,
          r.status,
          r.health,
          r.budget.toLocaleString(),
          r.expense.toLocaleString(),
          remaining.toLocaleString(),
          r.sales.toLocaleString(),
          margin.toLocaleString(),
          cashBal.toLocaleString(),
        ];
      });

      // Summary Footer Row
      const footRow = [
        'Total',
        `${filteredFinRows.length} Projects Listed`,
        '-',
        '-',
        totalBudget.toLocaleString(),
        totalExpense.toLocaleString(),
        (totalBudget - totalExpense > 0 ? totalBudget - totalExpense : 0).toLocaleString(),
        totalSales.toLocaleString(),
        totalMargin.toLocaleString(),
        netCashBalance.toLocaleString(),
      ];

      autoTable(doc, {
        head: [headers],
        body: rows,
        foot: [footRow],
        startY: 116,
        theme: 'grid',
        headStyles: {
          fillColor: [220, 38, 38],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'left',
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [30, 41, 59],
          cellPadding: 4,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          fontSize: 8,
        },
        columnStyles: {
          0: { cellWidth: 24, halign: 'center' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 55, halign: 'center' },
          3: { cellWidth: 45, halign: 'center' },
          4: { cellWidth: 70, halign: 'right' },
          5: { cellWidth: 70, halign: 'right' },
          6: { cellWidth: 70, halign: 'right' },
          7: { cellWidth: 70, halign: 'right' },
          8: { cellWidth: 70, halign: 'right' },
          9: { cellWidth: 70, halign: 'right' },
        },
        margin: { left: 40, right: 40, bottom: 35 },
        didDrawPage: (data) => {
          const pageHeight = doc.internal.pageSize.height;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(148, 163, 184);
          doc.text('Booshnam Construction Management Suite 2026 • Confidential & Proprietary', 40, pageHeight - 12);
          const pageStr = `Page ${data.pageNumber} of ${doc.internal.pages.length - 1}`;
          doc.text(pageStr, doc.internal.pageSize.width - 40, pageHeight - 12, { align: 'right' });
        },
      });

      // Direct instant file download (.pdf)
      doc.save(`Booshnam_Financial_Summary_${fromDate}_to_${toDate}.pdf`);
      showToast('Financial summary report (.pdf) downloaded directly to your device');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      showToast('Failed to download PDF file');
    }
  };

  return (
    <div className={`flex-1 flex flex-col min-w-0 bg-white transition-all duration-300 ${
      isFullscreen ? `fixed top-0 right-0 bottom-0 z-[100] overflow-y-auto bg-[#F4F6F9] ${isSidebarOpen ? 'left-64' : 'left-[72px]'}` : 'min-h-screen'
    }`}>
      {/* If isUnderlyingPageView is true, render dedicated Full-Page View (Not a pop-up) */}
      {isUnderlyingPageView ? (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Breadcrumb & Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-6 py-4 border-b border-slate-200">
            <div className="flex items-center gap-3">

              <button
                onClick={() => setIsUnderlyingPageView(false)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                title="Back to Dashboard"
                aria-label="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            {/* Date Switcher Tabs & Excel Export */}
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                {attendanceData.map((d) => (
                  <button
                    key={d.date}
                    onClick={() => setSelectedModalDate(d.date)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      selectedModalDate === d.date
                        ? 'bg-white text-emerald-700 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {d.date}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  const rawRecords = getUnderlyingAttendanceRecords(selectedModalDate, modalPayrollFilter, modalWorkforceFilter);
                  const modalDateItem = attendanceData.find(d => d.date === selectedModalDate) || attendanceData[0];
                  handleExportAttendanceExcel(rawRecords, modalDateItem.fullDate);
                }}
                className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                title="Download attendance roster in Microsoft Excel format"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Excel</span>
              </button>
              <div className="h-5 w-px bg-slate-200 hidden sm:block" />
              <UserProfileDropdown showBell={true} onShowToast={showToast} />
            </div>
          </div>

          {/* Page Header Banner */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mx-6">
            <h1 className="text-[26px] font-bold text-[#262626] font-heading tracking-tight">
              Underlying Attendance Roster — {attendanceData.find(d => d.date === selectedModalDate)?.fullDate || `${selectedModalDate}-2026`}
            </h1>
          </div>

          {/* KPI Summary Cards */}
          {(() => {
            const rawRecords = getUnderlyingAttendanceRecords(selectedModalDate, modalPayrollFilter, modalWorkforceFilter);
            const presentCount = rawRecords.filter(r => r.status !== 'Absent').length;
            const absentCount = rawRecords.filter(r => r.status === 'Absent').length;
            const totalOT = rawRecords.reduce((s, r) => s + r.overtime_hours, 0);
            const estTotalWages = rawRecords.filter(r => r.status !== 'Absent').reduce((sum, r) => {
              const base = r.salary_type === 'Month' ? Math.round(r.salary / 26) : r.salary;
              const ot = r.overtime_hours * 180;
              return sum + base + ot;
            }, 0);

            return (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-medium">Total Roster</span>
                  <div className="text-2xl font-bold tracking-tight text-slate-900 mt-1">{rawRecords.length}</div>
                  <span className="text-[11px] text-slate-400">Enrolled workforce</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-emerald-600 font-medium">Workers Present</span>
                  <div className="text-2xl font-bold tracking-tight text-emerald-600 mt-1">{presentCount}</div>
                  <span className="text-[11px] text-emerald-500 font-semibold">{rawRecords.length > 0 ? ((presentCount / rawRecords.length) * 100).toFixed(0) : 0}% Turnout</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-rose-600 font-medium">Workers Absent</span>
                  <div className="text-2xl font-bold tracking-tight text-rose-600 mt-1">{absentCount}</div>
                  <span className="text-[11px] text-rose-400">Leave / Unannounced</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-red-600 font-medium">Overtime Hours</span>
                  <div className="text-2xl font-bold tracking-tight text-red-600 mt-1">{totalOT.toFixed(1)} hrs</div>
                  <span className="text-[11px] text-red-400">Site night shift</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
                  <span className="text-xs text-blue-600 font-medium">Day Wage Cost</span>
                  <div className="text-2xl font-bold tracking-tight text-blue-700 mt-1">
                    ₹{estTotalWages.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[11px] text-blue-500">Est. payroll cost</span>
                </div>
              </div>
            );
          })()}

          {/* Search, Filter Toolbar & Full Roster Table */}
          {(() => {
            const rawRecords = getUnderlyingAttendanceRecords(selectedModalDate, modalPayrollFilter, modalWorkforceFilter);
            const filteredRecords = rawRecords.filter((r) => {
              const matchesSearch = modalSearchTerm === '' || 
                r.name.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
                r.employee_code.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
                r.role.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
                r.payroll_type.toLowerCase().includes(modalSearchTerm.toLowerCase());

              const matchesStatus = modalStatusFilter === 'All' || 
                (modalStatusFilter === 'Present' && (r.status === 'Present' || r.status === 'Overtime' || r.status === 'Half Day')) ||
                (modalStatusFilter === 'Absent' && r.status === 'Absent') ||
                (modalStatusFilter === 'Overtime' && r.status === 'Overtime');

              return matchesSearch && matchesStatus;
            });

            return (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
                {/* Search & Filter Toolbar */}
                <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/50">
                  <div className="flex-1 relative max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={modalSearchTerm}
                      onChange={(e) => setModalSearchTerm(e.target.value)}
                      placeholder="Search by Employee Code (e.g. EMP-0101), Name, Role..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                    />
                    {modalSearchTerm && (
                      <button
                        onClick={() => setModalSearchTerm('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="w-36">
                      <CustomSelect
                        value={modalStatusFilter}
                        onChange={(val) => setModalStatusFilter(val)}
                        options={[
                          { label: 'All Status', value: 'All' },
                          { label: 'Present Only', value: 'Present', dotColor: 'bg-emerald-500' },
                          { label: 'Absent Only', value: 'Absent', dotColor: 'bg-rose-500' },
                          { label: 'Overtime Only', value: 'Overtime', dotColor: 'bg-amber-500' },
                        ]}
                        prefix="Status: "
                        size="sm"
                        variant="brand"
                      />
                    </div>

                    <div className="w-36">
                      <CustomSelect
                        value={modalPayrollFilter}
                        onChange={(val) => setModalPayrollFilter(val)}
                        options={[
                          { label: 'All Payrolls', value: 'All' },
                          { label: 'Office Staff', value: 'Office Staff' },
                          { label: 'Site Staff', value: 'Site Staff' },
                        ]}
                        prefix="Payroll: "
                        size="sm"
                        variant="brand"
                      />
                    </div>

                    <div className="w-48">
                      <CustomSelect
                        value={modalWorkforceFilter}
                        onChange={(val) => setModalWorkforceFilter(val)}
                        options={[
                          { label: 'All Roles', value: 'All' },
                          { label: 'Accounts', value: 'Accounts' },
                          { label: 'Admin', value: 'Admin' },
                          { label: 'Business Development', value: 'Business Development' },
                          { label: 'Chief Operating Officer', value: 'Chief Operating Officer' },
                          { label: 'Collection Executive', value: 'Collection Executive' },
                          { label: 'Digital Marketing', value: 'Digital Marketing' },
                          { label: 'Director', value: 'Director' },
                          { label: 'Engineer', value: 'Engineer' },
                        ]}
                        prefix="Role: "
                        size="sm"
                        variant="brand"
                        searchable={true}
                      />
                    </div>

                    {(modalSearchTerm || modalStatusFilter !== 'All' || modalPayrollFilter !== 'All' || modalWorkforceFilter !== 'All') && (
                      <button
                        onClick={() => {
                          setModalSearchTerm('');
                          setModalStatusFilter('All');
                          setModalPayrollFilter('All');
                          setModalWorkforceFilter('All');
                        }}
                        className="text-xs text-emerald-600 hover:text-emerald-800 font-medium underline cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#6B5B95] text-white font-semibold sticky top-0 z-10 select-none">
                      <tr>
                        <th className="py-3.5 px-4 w-12 text-center">#</th>
                        <th className="py-3.5 px-4">Attendance Date</th>
                        <th className="py-3.5 px-4">Employee Code</th>
                        <th className="py-3.5 px-4">Worker / Employee Name</th>
                        <th className="py-3.5 px-4">Role / Designation</th>
                        <th className="py-3.5 px-4 text-center">Status</th>
                        <th className="py-3.5 px-4">Payroll Type</th>
                        <th className="py-3.5 px-4 text-right">Salary / Wage</th>
                        <th className="py-3.5 px-4 text-right">Overtime Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredRecords.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-16 text-center text-slate-400">
                            <UserX className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                            <p className="font-semibold text-slate-600 text-sm">No matching attendance records found</p>
                            <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or status filter</p>
                          </td>
                        </tr>
                      ) : (
                        filteredRecords.map((r, i) => {
                          const isAbsent = r.status === 'Absent';
                          const isOvertime = r.status === 'Overtime';
                          const isHalfDay = r.status === 'Half Day';

                          return (
                            <tr 
                              key={r.id} 
                              className={`hover:bg-slate-50 transition-colors ${
                                isAbsent ? 'bg-rose-50/20' : ''
                              }`}
                            >
                              <td className="py-3 px-4 text-center text-slate-400 tracking-tight text-[11px]">
                                {i + 1}
                              </td>
                              <td className="py-3 px-4 tracking-tight text-slate-600">
                                {r.fullDate}
                              </td>
                              <td className="py-3 px-4 tracking-tight font-bold text-slate-900">
                                <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                                  {r.employee_code}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                                    {r.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                  </span>
                                  <span className="font-semibold text-slate-900">{r.name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-slate-600">
                                {r.role}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {isAbsent ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                                    Absent
                                  </span>
                                ) : isOvertime ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                                    <Clock className="w-3 h-3 text-red-600" />
                                    Overtime
                                  </span>
                                ) : isHalfDay ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                    Half Day
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    Present
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-medium ${
                                  r.payroll_type === 'Office Staff' 
                                    ? 'bg-slate-100 text-slate-700 border border-slate-200' 
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}>
                                  {r.payroll_type}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right tracking-tight font-bold text-slate-800">
                                {r.salary_type === 'Month' ? (
                                  <span>₹{r.salary.toLocaleString('en-IN')} <span className="text-[10px] text-slate-400 font-normal">/ mo</span></span>
                                ) : (
                                  <span>₹{r.salary.toLocaleString('en-IN')} <span className="text-[10px] text-slate-400 font-normal">/ day</span></span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right tracking-tight">
                                {r.overtime_hours > 0 ? (
                                  <span className="font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                    {r.overtime_hours.toFixed(1)} hrs
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-normal">0.0 hrs</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {filteredRecords.length > 0 && (
                      <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-200 text-xs text-slate-800 sticky bottom-0">
                        <tr>
                          <td colSpan={5} className="py-3.5 px-4 text-slate-900">
                            Showing {filteredRecords.length} of {rawRecords.length} Employees
                          </td>
                          <td className="py-3.5 px-4 text-center tracking-tight">
                            {filteredRecords.filter(r => r.status !== 'Absent').length} P / {filteredRecords.filter(r => r.status === 'Absent').length} A
                          </td>
                          <td className="py-3.5 px-4"></td>
                          <td className="py-3.5 px-4 text-right tracking-tight text-emerald-700">
                            ₹{filteredRecords.filter(r => r.status !== 'Absent').reduce((sum, r) => {
                              const base = r.salary_type === 'Month' ? Math.round(r.salary / 26) : r.salary;
                              const ot = r.overtime_hours * 180;
                              return sum + base + ot;
                            }, 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 text-right tracking-tight text-red-700">
                            {filteredRecords.reduce((s, r) => s + r.overtime_hours, 0).toFixed(1)} hrs
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <CheckCheck className="w-4 h-4 text-emerald-600" />
                    <span>GPS Geofence & Mobile Biometric Verified by Site Supervisor</span>
                  </div>
                  <button
                    onClick={() => setIsUnderlyingPageView(false)}
                    className="p-2 text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center justify-center"
                    title="Return to Dashboard"
                    aria-label="Return to Dashboard"
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      ) : isUnderlyingHealthPageView ? (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Breadcrumb & Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-6 py-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsUnderlyingHealthPageView(false)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                title="Back to Dashboard"
                aria-label="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="h-4 w-px bg-slate-200" />
              <div className="text-xs text-slate-500 font-medium">
                Dashboard <span className="mx-1">/</span> <strong className="text-slate-800">Project Health Registry Sheet</strong>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleExportHealthExcel}
                className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                title="Export Project Health Registry in Microsoft Excel format"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Health Sheet (.xlsx)</span>
              </button>
              <div className="h-5 w-px bg-slate-200 hidden sm:block" />
              <UserProfileDropdown showBell={true} onShowToast={showToast} />
            </div>
          </div>

          {/* Page Header Banner */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mx-6">
            <h1 className="text-[26px] font-bold text-[#262626] font-heading tracking-tight">
              Underlying Project Health Sheet — All Monitored Sites ({kpiCounts.total})
            </h1>
          </div>

          {/* 4 Summary Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Sites</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{kpiCounts.total}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Commercial, Industrial, Infra</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs">
              <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Healthy / Normal</div>
              <div className="text-2xl font-black text-blue-600 mt-1">{kpiCounts.healthyCount}</div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                {kpiCounts.total > 0 ? ((kpiCounts.healthyCount / kpiCounts.total) * 100).toFixed(1) : '0.0'}% of Portfolio
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-red-200 shadow-xs">
              <div className="text-[11px] font-bold text-red-600 uppercase tracking-wider">At Risk</div>
              <div className="text-2xl font-black text-red-600 mt-1">{kpiCounts.atRiskCount}</div>
              <div className="text-[10px] text-red-500 font-semibold mt-0.5">Requires Mitigation</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Progress</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {summaryProjects.length > 0 ? (summaryProjects.reduce((s, p) => s + p.progress, 0) / summaryProjects.length).toFixed(1) : '0.0'}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Schedule Target Met</div>
            </div>
          </div>

          {/* Table with Search & Status Tabs */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm mx-6 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-lg">
                {(['All', 'Normal', 'At Risk'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setHealthFilterTab(tab)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      healthFilterTab === tab 
                        ? 'bg-white text-slate-900 shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab === 'All' ? `All Sites (${kpiCounts.total})` : tab === 'Normal' ? `Healthy (${kpiCounts.healthyCount})` : `At Risk (${kpiCounts.atRiskCount})`}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by project, code, or personnel..."
                  value={healthSearchTerm}
                  onChange={(e) => setHealthSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Interactive Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold text-[10px] tracking-wider">
                    <th className="py-3 px-4">S.No</th>
                    <th className="py-3 px-4">Project ID</th>
                    <th className="py-3 px-4">Project Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Project Manager / In-Charge</th>
                    <th className="py-3 px-4 text-center">Health Status</th>
                    <th className="py-3 px-4">Progress</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Target Date</th>
                    <th className="py-3 px-4">Operational & Risk Mitigation Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {healthFilteredProjects.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-slate-400 tracking-tight text-[11px]">{idx + 1}</td>
                      <td className="py-3 px-4 tracking-tight font-bold text-blue-600">{p.code}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                      <td className="py-3 px-4 text-slate-600">{p.category}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{p.personnel}</td>
                      <td className="py-3 px-4 text-center">
                        {p.health === 'Normal' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <span className="w-2 h-2 rounded-full bg-[#6088F5]" />
                            Healthy
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            At Risk
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                            <div 
                              className={`h-full ${p.health === 'Normal' ? 'bg-[#6088F5]' : 'bg-red-500'}`} 
                              style={{ width: `${p.progress}%` }} 
                            />
                          </div>
                          <span className="tracking-tight font-bold text-[11px]">{p.progress}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                          p.status === 'Ongoing' ? 'bg-blue-100 text-blue-800' :
                          p.status === 'Onhold' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 tracking-tight text-slate-500 text-[11px]">{p.date}</td>
                      <td className="py-3 px-4 text-slate-600 text-[11px] max-w-xs">{p.notes}</td>
                    </tr>
                  ))}
                  {healthFilteredProjects.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        No projects match the selected criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CheckCheck className="w-4 h-4 text-emerald-600" />
                <span>Synchronized with active Primavera P6 & WBS milestone trackers</span>
              </div>
              <button
                onClick={() => setIsUnderlyingHealthPageView(false)}
                className="p-2 text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center justify-center"
                title="Return to Dashboard"
                aria-label="Return to Dashboard"
              >
                <ArrowLeft className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Main Company Dashboard View (Edge-to-edge seamless) */
        <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
          {/* Executive Header with Title, Telemetry Pill, Segmented Tabs, Project Filter & Actions */}
          <div className="px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 bg-white/95 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-20 shadow-2xs">
            {/* Left: Title + Operational / Financial segmented pill + Project Filter */}
            <div className="flex items-center gap-3.5 flex-wrap">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-[26px] font-black text-slate-900 font-heading tracking-tight">Dashboard</h1>
              </div>

              {/* Segmented Control Pill */}
              <div className="inline-flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/90 shadow-2xs">
                <button
                  onClick={() => setActiveTab('operational')}
                  className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'operational' 
                      ? 'bg-white text-slate-900 shadow-xs font-black' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Activity className={`w-3.5 h-3.5 ${activeTab === 'operational' ? 'text-rose-600' : 'text-slate-400'}`} />
                  <span>Operational</span>
                </button>
                <button
                  onClick={() => setActiveTab('financial')}
                  className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'financial' 
                      ? 'bg-white text-slate-900 shadow-xs font-black' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <DollarSign className={`w-3.5 h-3.5 ${activeTab === 'financial' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>Financial</span>
                </button>
              </div>

              {/* Project Name Filter in Header */}
              {activeTab === 'operational' && (
                <div className="flex items-center gap-2">
                  <div className="h-5 w-px bg-slate-200 hidden md:block" />
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <FolderKanban className="w-3.5 h-3.5 text-blue-600" />
                    <span className="hidden sm:inline">Project:</span>
                  </div>
                  <div className="w-44 sm:w-56 text-xs">
                    <CustomSelect
                      value={selectedProjectFilter}
                      onChange={(val) => setSelectedProjectFilter(val)}
                      options={[
                        { label: 'All Projects', value: 'All' },
                        ...summaryProjects.map(p => ({ label: p.name, value: p.name }))
                      ]}
                      triggerClassName="py-1.5 px-3 rounded-xl text-xs bg-slate-50 hover:bg-white border-slate-200 shadow-2xs font-medium"
                    />
                  </div>
                </div>
              )}

              {/* Status Filter Pill in Header if selected */}
              {activeTab === 'operational' && selectedStatusFilter !== 'All' && (
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-900 text-white shadow-xs">
                    <span>{selectedStatusFilter}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedStatusFilter('All')}
                      className="hover:text-red-300 transition-colors ml-0.5 cursor-pointer"
                      title="Clear status filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                </div>
              )}
            </div>

            {/* Right: Chat, Fullscreen, Refresh & User Profile */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('booshnam_open_chat'))}
                title="Open WhatsApp Chat (Messages & Contacts)"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-xs shadow-xs transition-all cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-white" />
                <span className="hidden sm:inline font-bold">Chat</span>
              </button>

              <button 
                type="button"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen" : "Full Screen"}
                aria-label={isFullscreen ? "Exit Fullscreen" : "Full Screen"}
                className={`p-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer ${
                  isFullscreen 
                    ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {isFullscreen ? <ArrowsDiagonalMinimizeIcon size={16} /> : <ArrowsDiagonalRotatedIcon size={16} />}
              </button>

              <button 
                onClick={() => window.location.reload()}
                title="Refresh Dashboard"
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <div className="h-5 w-px bg-slate-200 hidden sm:block" />
              <UserProfileDropdown showBell={true} onShowToast={showToast} />
            </div>
          </div>

        {/* OPERATIONAL TAB CONTENT */}
        {activeTab === 'operational' && (
          <div className="p-6 space-y-6">

            {/* Today's Tasks Reminder Notification Banner (Only for Staff Members & Project Assignees, Never for Super Admin) */}
            <TodayTasksReminderBanner
              projects={projects}
              onSelectProject={onSelectProject}
              onNavigate={onNavigate}
              onShowToast={showToast}
            />

            {/* 4 Status KPI Cards (Executive Modern Design with Depth, Top Accent Borders & Telemetry Equalizers) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  status: 'Not Started',
                  label: 'Not Started',
                  count: kpiCounts.notStarted,
                  stage: 'Queue',
                  subtext: 'Pending kickoff',
                  topBorder: 'border-t-[3px] border-t-rose-500',
                  icon: <Clock className="w-5 h-5 stroke-[2.3]" />,
                  iconBg: 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/25 ring-1 ring-white/50',
                  barColor: 'bg-rose-500',
                  stageBadge: 'bg-rose-50 text-rose-700 border border-rose-200/80',
                  dotColor: 'bg-rose-500',
                  hoverBorder: 'hover:border-rose-300 hover:shadow-lg hover:shadow-rose-500/10',
                  activeRing: 'ring-2 ring-rose-500 border-rose-400 bg-rose-50/15 shadow-md',
                  glowColor: 'from-rose-500/10 via-transparent to-transparent',
                },
                {
                  status: 'Ongoing',
                  label: 'Ongoing',
                  count: kpiCounts.ongoing,
                  stage: 'Active',
                  subtext: 'Live on site',
                  topBorder: 'border-t-[3px] border-t-emerald-500',
                  icon: <PlayCircle className="w-5 h-5 stroke-[2.3]" />,
                  iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25 ring-1 ring-white/50',
                  barColor: 'bg-emerald-500',
                  stageBadge: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
                  dotColor: 'bg-emerald-500',
                  hoverBorder: 'hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/10',
                  activeRing: 'ring-2 ring-emerald-500 border-emerald-400 bg-emerald-50/15 shadow-md',
                  glowColor: 'from-emerald-500/10 via-transparent to-transparent',
                },
                {
                  status: 'Onhold',
                  label: 'On Hold',
                  count: kpiCounts.onhold,
                  stage: 'On Hold',
                  subtext: 'Awaiting action',
                  topBorder: 'border-t-[3px] border-t-amber-500',
                  icon: <PauseCircle className="w-5 h-5 stroke-[2.3]" />,
                  iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/25 ring-1 ring-white/50',
                  barColor: 'bg-amber-500',
                  stageBadge: 'bg-amber-50 text-amber-700 border border-amber-200/80',
                  dotColor: 'bg-amber-500',
                  hoverBorder: 'hover:border-amber-300 hover:shadow-lg hover:shadow-amber-500/10',
                  activeRing: 'ring-2 ring-amber-500 border-amber-400 bg-amber-50/15 shadow-md',
                  glowColor: 'from-amber-500/10 via-transparent to-transparent',
                },
                {
                  status: 'Completed',
                  label: 'Completed',
                  count: kpiCounts.completed,
                  stage: 'Delivered',
                  subtext: 'Handed over',
                  topBorder: 'border-t-[3px] border-t-blue-600',
                  icon: <CheckCircle2 className="w-5 h-5 stroke-[2.3]" />,
                  iconBg: 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-white/50',
                  barColor: 'bg-blue-600',
                  stageBadge: 'bg-blue-50 text-blue-700 border border-blue-200/80',
                  dotColor: 'bg-blue-600',
                  hoverBorder: 'hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10',
                  activeRing: 'ring-2 ring-blue-600 border-blue-400 bg-blue-50/15 shadow-md',
                  glowColor: 'from-blue-500/10 via-transparent to-transparent',
                },
              ].map((card) => {
                const isSelected = searchStatus === card.status;
                const sharePercent = kpiCounts.total > 0 ? Math.round((card.count / kpiCounts.total) * 100) : 0;
                return (
                  <div
                    key={card.status}
                    onClick={() => {
                      const next = isSelected ? 'All' : card.status;
                      setSearchStatus(next);
                      showToast(next === 'All' ? 'Showing all projects' : `Filtered to ${card.label} projects`);
                    }}
                    className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-b from-white via-white to-slate-50/50 border transition-all duration-300 cursor-pointer group select-none shadow-xs hover:shadow-xl hover:-translate-y-1 ${card.topBorder} ${
                      isSelected
                        ? `${card.activeRing}`
                        : `border-slate-200/90 ${card.hoverBorder}`
                    }`}
                  >
                    {/* Ambient corner glow */}
                    <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${card.glowColor} blur-xl pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity duration-300`} />

                    {/* Top Right Mini Equalizer Bar Animation */}
                    <div className="absolute top-4 right-4 flex items-end gap-1 h-4 z-10">
                      <span className={`w-1 rounded-full transition-all duration-300 ${card.barColor} h-2 group-hover:h-3 opacity-60`} />
                      <span className={`w-1 rounded-full transition-all duration-300 ${card.barColor} h-3.5 group-hover:h-4 opacity-80`} />
                      <span className={`w-1 rounded-full transition-all duration-300 ${card.barColor} h-4 group-hover:h-4.5 opacity-100`} />
                    </div>

                    {/* Top Row: 3D Squircle Icon + Metric + Share Badge */}
                    <div className="flex items-center gap-3.5 z-10 relative">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 ${card.iconBg}`}>
                        {card.icon}
                      </div>
                      <div className="min-w-0 flex-1 pr-6">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate block">
                          {card.label}
                        </span>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-3xl sm:text-4xl font-black text-slate-900 font-display tracking-tight leading-none">
                            {card.count}
                          </span>
                          <span className="text-xs font-semibold text-slate-400">
                            {card.count === 1 ? 'Project' : 'Projects'}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100/90 text-slate-600 rounded-md border border-slate-200/70 ml-auto mr-3">
                            {sharePercent}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Stage Badge & Subtext */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs z-10 relative">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${card.stageBadge}`}>
                        {card.stage}
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                        <span className={`w-1.5 h-1.5 rounded-full ${card.dotColor}`} />
                        <span className="truncate">{card.subtext}</span>
                      </div>
                    </div>

                    {/* Bottom Edge Micro Progress Bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100">
                      <div 
                        className={`h-full transition-all duration-500 ${card.barColor}`}
                        style={{ width: `${Math.max(card.count > 0 ? 10 : 0, sharePercent)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mid-Row: Project Health Telemetry (Executive Cockpit Command Center) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4 relative overflow-hidden">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
                    <HeartPulse className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base font-display">Project Health & Operational Telemetry</h3>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {healthStats.total === 0
                        ? 'No project sites currently provisioned in portfolio'
                        : 'Real-time performance index, milestone schedule adherence, and risk monitoring'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 text-slate-900 relative">
                  {/* Status Badge */}
                  <span className={`px-3 py-1 rounded-xl text-xs font-bold inline-flex items-center gap-2 border shadow-2xs ${
                    healthStats.total === 0 
                      ? 'bg-slate-100 text-slate-600 border-slate-200' 
                      : healthStats.isAtRisk 
                      ? 'bg-rose-50 text-rose-700 border-rose-200' 
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      healthStats.total === 0 
                        ? 'bg-slate-400' 
                        : healthStats.isAtRisk 
                        ? 'bg-rose-500 animate-ping' 
                        : 'bg-emerald-500 animate-pulse'
                    }`} />
                    <span>{healthStats.total === 0 ? 'PORTFOLIO STANDBY' : healthStats.isAtRisk ? 'ACTION REQUIRED' : 'PORTFOLIO OPTIMAL'}</span>
                  </span>

                  {/* Three Dots Menu Button & Dropdown */}
                  <div className="relative" ref={healthDotsMenuRef}>
                    <button
                      type="button"
                      onClick={() => setShowHealthMenuDropdown(prev => !prev)}
                      className={`p-1.5 rounded-lg border border-slate-200/80 transition-colors cursor-pointer text-slate-700 hover:text-black hover:bg-slate-50 flex items-center justify-center ${
                        showHealthMenuDropdown 
                          ? 'bg-slate-100 text-black font-bold' 
                          : 'bg-white'
                      }`}
                      title="More options"
                      aria-label="More options"
                    >
                      <MoreVertical className="w-4 h-4 text-slate-700" />
                    </button>

                    {showHealthMenuDropdown && (
                      <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-40 animate-in fade-in select-none">
                        <button
                          type="button"
                          onClick={() => {
                            setShowHealthMenuDropdown(false);
                            handleExportHealthExcel();
                          }}
                          className="w-full px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2.5 transition-colors text-left cursor-pointer font-medium"
                        >
                          <Download className="w-4 h-4 text-slate-400" />
                          <span>Export Health Sheet (.xlsx)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3-Section Command Center: Left (Stability Briefing) | Center (Precision Speedometer Dial) | Right (Distribution Breakdown) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center py-2">
                {/* Left: Operational Stability Briefing Panel */}
                <div className="flex flex-col justify-between space-y-3 p-4 rounded-xl bg-gradient-to-br from-slate-50/90 via-white to-slate-50/40 border border-slate-200/80 shadow-2xs h-full">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      Operational Stability
                    </span>
                    <span className={`text-[11px] font-bold inline-flex items-center gap-1.5 ${
                      healthStats.isAtRisk 
                        ? 'text-rose-600' 
                        : healthStats.total === 0
                        ? 'text-slate-500'
                        : 'text-emerald-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        healthStats.isAtRisk 
                          ? 'bg-rose-500 animate-ping' 
                          : healthStats.total === 0
                          ? 'bg-slate-400'
                          : 'bg-emerald-500 animate-pulse'
                      }`} />
                      {healthStats.statusLabel}
                    </span>
                  </div>

                  <div>
                    <div className="text-sm font-bold text-slate-800 font-display">
                      Portfolio Health Rating
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {healthStats.total === 0
                        ? 'No active projects currently available in portfolio. Launch new sites to initiate live risk telemetry.'
                        : healthStats.isAtRisk
                        ? `${healthStats.atRiskCount} site(s) currently flagged with milestone risks or operational delays requiring supervisor intervention.`
                        : 'All active project sites are progressing within schedule targets and normal health tolerances.'
                      }
                    </p>
                  </div>

                  {/* Micro Telemetry Metrics */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
                    <div className="flex items-center gap-1.5">
                      <FolderKanban className="w-3.5 h-3.5 text-blue-600" />
                      <span className="font-bold text-slate-800">{healthStats.total}</span>
                      <span className="text-slate-400">{healthStats.total === 1 ? 'Site' : 'Sites'}</span>
                    </div>
                    <span className="text-slate-300">•</span>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${healthStats.total === 0 ? 'text-slate-400' : 'text-emerald-600'}`} />
                      <span className="font-bold text-slate-800">{healthStats.percent}%</span>
                      <span className="text-slate-400">Velocity</span>
                    </div>
                  </div>

                  {/* Micro Progress Track */}
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ${
                        healthStats.isAtRisk 
                          ? 'bg-gradient-to-r from-amber-500 to-rose-500' 
                          : 'bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500'
                      }`}
                      style={{ width: `${Math.max(healthStats.percent, 0)}%` }}
                    />
                  </div>
                </div>

                {/* Center: Precision Telemetry Speedometer Gauge */}
                <div className="flex flex-col items-center justify-center">
                  <div className="relative w-64 sm:w-72 h-36 flex items-end justify-center overflow-hidden animate-in fade-in duration-300">
                    <svg viewBox="0 0 200 105" className="w-full h-full">
                      <defs>
                        <linearGradient id="telemetryGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#3B82F6" />
                          <stop offset="40%" stopColor="#06B6D4" />
                          <stop offset="100%" stopColor="#10B981" />
                        </linearGradient>
                        <linearGradient id="telemetryRiskGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#EF4444" />
                          <stop offset="50%" stopColor="#F59E0B" />
                          <stop offset="100%" stopColor="#DC2626" />
                        </linearGradient>
                        <filter id="gaugeNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow 
                            dx="0" 
                            dy="4" 
                            stdDeviation="6" 
                            floodColor={healthStats.isAtRisk ? "#EF4444" : "#06B6D4"} 
                            floodOpacity="0.35" 
                          />
                        </filter>
                      </defs>

                      {/* Calibrated Radial Dots / Ticks along the arc circumference */}
                      {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((step) => {
                        const angleDeg = 180 - (step / 100) * 180;
                        const angleRad = (angleDeg * Math.PI) / 180;
                        const cx = 100 - 80 * Math.cos(angleRad);
                        const cy = 100 - 80 * Math.sin(angleRad);
                        const isActive = healthStats.percent > 0 && step <= healthStats.percent;
                        return (
                          <circle
                            key={step}
                            cx={cx}
                            cy={cy}
                            r={step % 50 === 0 ? "2.5" : "1.5"}
                            fill={isActive ? (healthStats.isAtRisk ? "#f43f5e" : "#06b6d4") : "#cbd5e1"}
                            opacity={isActive ? 1 : 0.55}
                          />
                        );
                      })}

                      {/* Background Arc Track */}
                      <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke="#F1F5F9"
                        strokeWidth="20"
                        strokeLinecap="round"
                      />

                      {/* Active Gradient Glowing Arc */}
                      <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke={healthStats.isAtRisk ? "url(#telemetryRiskGrad)" : "url(#telemetryGrad)"}
                        strokeWidth="20"
                        strokeLinecap="round"
                        strokeDasharray="251.32"
                        strokeDashoffset={251.32 - (251.32 * Math.max(0, Math.min(100, healthStats.percent))) / 100}
                        filter="url(#gaugeNeonGlow)"
                        className="transition-all duration-700 ease-out"
                      />

                      {/* Arc Base Scale Labels */}
                      <text x="20" y="104" textAnchor="middle" fontSize="7" fill="#94A3B8" fontWeight="bold">0%</text>
                      <text x="180" y="104" textAnchor="middle" fontSize="7" fill="#94A3B8" fontWeight="bold">100%</text>
                    </svg>

                    {/* Central Display Readout */}
                    <div className="absolute bottom-1 flex flex-col items-center justify-center pointer-events-none">
                      <span className={`text-3xl sm:text-4xl font-black font-display tracking-tight leading-none ${
                        healthStats.isAtRisk 
                          ? 'bg-gradient-to-r from-red-600 via-amber-600 to-rose-600 bg-clip-text text-transparent' 
                          : healthStats.total === 0 || healthStats.percent === 0
                          ? 'text-slate-500'
                          : 'bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-600 bg-clip-text text-transparent'
                      }`}>
                        {healthStats.percent}%
                      </span>
                      <span className={`text-xs font-bold mt-1 inline-flex items-center gap-1.5 ${
                        healthStats.isAtRisk
                          ? 'text-rose-600'
                          : healthStats.total === 0
                          ? 'text-slate-500'
                          : 'text-emerald-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          healthStats.isAtRisk 
                            ? 'bg-rose-500 animate-ping' 
                            : healthStats.total === 0
                            ? 'bg-slate-400'
                            : 'bg-emerald-500 animate-pulse'
                        }`} />
                        {healthStats.statusLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Distribution Breakdown Cards */}
                <div className="flex flex-col gap-2.5 w-full max-w-sm mx-auto md:mx-0 md:ml-auto text-xs">
                  <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">
                    <span>Distribution Breakdown</span>
                    <span className="text-slate-400">{kpiCounts.total} Total Sites</span>
                  </div>

                  {/* Healthy Sites Tile */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-emerald-50/70 via-white to-blue-50/30 border-l-[3px] border-l-emerald-500 border-y border-r border-slate-200/80 shadow-2xs group hover:border-emerald-300 transition-all">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100/90 text-emerald-700 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 text-xs block">Healthy Sites</span>
                        <span className="text-[10px] text-slate-400 font-medium">On-schedule & compliant</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-black font-display text-base text-emerald-700 bg-emerald-50/80 px-2.5 py-0.5 rounded-lg border border-emerald-200/60 inline-block">
                        {healthStats.healthyCount}
                      </span>
                      <span className="block text-[9.5px] text-slate-400 font-semibold mt-0.5">
                        {kpiCounts.healthyPercent}% of sites
                      </span>
                    </div>
                  </div>

                  {/* At Risk Tile */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-rose-50/70 via-white to-amber-50/30 border-l-[3px] border-l-rose-500 border-y border-r border-slate-200/80 shadow-2xs group hover:border-rose-300 transition-all">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-rose-100/90 text-rose-700 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 text-xs block">At Risk</span>
                        <span className="text-[10px] text-slate-400 font-medium">Action alert required</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-black font-display text-base text-rose-600 bg-rose-50/80 px-2.5 py-0.5 rounded-lg border border-rose-200/60 inline-block">
                        {healthStats.atRiskCount}
                      </span>
                      <span className="block text-[9.5px] text-slate-400 font-semibold mt-0.5">
                        {healthStats.total > 0 ? Math.round((healthStats.atRiskCount / healthStats.total) * 100) : 0}% of sites
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom: Project Operational Summary Dashboard Table (Executive Command Bar + Crisp Data Grid) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              {/* Table Card Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100 shadow-2xs">
                    <FolderKanban className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">Project Operational Summary</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Real-time status, health monitoring, and delivery milestones</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200/60">
                    {filteredSummary.length} {filteredSummary.length === 1 ? 'Project Listed' : 'Projects Listed'}
                  </span>
                  {(searchName || searchCategory || searchPersonnel || (searchStatus && searchStatus !== 'All') || (searchHealth && searchHealth !== 'All') || searchDueDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchName('');
                        setSearchCategory('');
                        setSearchPersonnel('');
                        setSearchStatus('All');
                        setSearchHealth('All');
                        setSearchDueDate('');
                      }}
                      className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Filters</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Dedicated Filter Command Bar (Above the Table) */}
              <div className="p-3.5 sm:p-4 bg-slate-50/70 border-b border-slate-200/80">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {/* 1. Search Project Name */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search project..."
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100 shadow-2xs transition-colors"
                    />
                  </div>

                  {/* 2. Filter Category */}
                  <div className="relative">
                    <Layers className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Filter category..."
                      value={searchCategory}
                      onChange={(e) => setSearchCategory(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100 shadow-2xs transition-colors"
                    />
                  </div>

                  {/* 3. Filter Personnel */}
                  <div className="relative">
                    <Users className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Filter personnel..."
                      value={searchPersonnel}
                      onChange={(e) => setSearchPersonnel(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100 shadow-2xs transition-colors"
                    />
                  </div>

                  {/* 4. Filter Status */}
                  <div>
                    <CustomSelect
                      value={searchStatus}
                      onChange={(val) => setSearchStatus(val)}
                      options={['All', 'Ongoing', 'Not Started', 'Onhold', 'Completed']}
                      triggerClassName="w-full !rounded-xl !py-1.5 !px-3 text-xs font-semibold border border-slate-200 bg-white shadow-2xs text-slate-700"
                    />
                  </div>

                  {/* 5. Filter Health */}
                  <div>
                    <CustomSelect
                      value={searchHealth}
                      onChange={(val) => setSearchHealth(val)}
                      options={['All', 'Normal', 'At Risk']}
                      triggerClassName="w-full !rounded-xl !py-1.5 !px-3 text-xs font-semibold border border-slate-200 bg-white shadow-2xs text-slate-700"
                    />
                  </div>

                  {/* 6. Target Due Date */}
                  <div>
                    <CustomDatePicker
                      value={searchDueDate}
                      onChange={(d) => setSearchDueDate(d)}
                      placeholder="Target Date"
                      align="right"
                      inputClassName="w-full !rounded-xl !py-1.5 !px-3 text-xs font-semibold border border-slate-200 bg-white shadow-2xs text-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* Modern Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#f8fafc] text-slate-600 font-bold border-b border-slate-200/90 uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4 w-16 text-center text-slate-500 font-bold">S.No.</th>
                      <th className="py-3 px-4 text-slate-700 font-bold">Project Name</th>
                      <th className="py-3 px-4 text-slate-700 font-bold">Project Category</th>
                      <th className="py-3 px-4 text-slate-700 font-bold">Key Personnel</th>
                      <th className="py-3 px-4 text-slate-700 font-bold">Project Status</th>
                      <th className="py-3 px-4 text-slate-700 font-bold">Project Health</th>
                      <th className="py-3 px-4 text-right text-slate-700 font-bold whitespace-nowrap">Target Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
                    {filteredSummary.map((p, idx) => (
                      <tr 
                        key={p.id} 
                        className={`hover:bg-slate-50/80 transition-colors group ${
                          p.status === 'Ongoing' ? 'border-l-[3px] border-l-emerald-500' :
                          p.status === 'Not Started' ? 'border-l-[3px] border-l-rose-500' :
                          p.status === 'Onhold' ? 'border-l-[3px] border-l-amber-500' :
                          'border-l-[3px] border-l-blue-600'
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:text-red-600 transition-colors">{p.name}</td>
                        <td className="py-3.5 px-4 text-slate-600">{p.category}</td>
                        <td className="py-3.5 px-4 text-slate-600">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[9px] shrink-0 border border-slate-200">
                              {p.personnel.slice(0, 2).toUpperCase()}
                            </span>
                            <span>{p.personnel}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                            p.status === 'Ongoing' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70' :
                            p.status === 'Not Started' ? 'bg-rose-50 text-rose-700 border-rose-200/70' :
                            p.status === 'Onhold' ? 'bg-amber-50 text-amber-700 border-amber-200/70' :
                            'bg-blue-50 text-blue-700 border-blue-200/70'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              p.status === 'Ongoing' ? 'bg-emerald-500' :
                              p.status === 'Not Started' ? 'bg-rose-500' :
                              p.status === 'Onhold' ? 'bg-amber-500' :
                              'bg-blue-500'
                            }`} />
                            <span>{p.status}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                            p.health === 'At Risk' 
                              ? 'bg-rose-50 text-rose-700 border-rose-200/70 animate-pulse' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${p.health === 'At Risk' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                            <span>{p.health}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right tracking-tight text-slate-600 font-medium whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{p.date}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredSummary.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-16 text-center">
                          <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                            <div className="relative mb-3.5">
                              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-200/80 border border-slate-200 flex items-center justify-center text-slate-500 shadow-inner">
                                <FolderKanban className="w-8 h-8 text-slate-400 stroke-[1.6]" />
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-center text-emerald-600">
                                <Sparkles className="w-3.5 h-3.5" />
                              </div>
                            </div>
                            <h4 className="text-base font-bold text-slate-900 font-display">
                              {summaryProjects.length === 0 ? 'No Active Projects in Portfolio' : 'No Projects Match Current Filters'}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed text-center max-w-sm">
                              {summaryProjects.length === 0 
                                ? 'New construction sites and commercial projects created in Site Operations will automatically sync here with real-time milestone progress and health telemetry.'
                                : 'Try adjusting your search query, status filters, or date range to inspect matching portfolio records.'}
                            </p>
                            {(searchName || searchCategory || searchPersonnel || (searchStatus && searchStatus !== 'All') || (searchHealth && searchHealth !== 'All') || searchDueDate) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSearchName('');
                                  setSearchCategory('');
                                  setSearchPersonnel('');
                                  setSearchStatus('All');
                                  setSearchHealth('All');
                                  setSearchDueDate('');
                                }}
                                className="mt-4 px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reset All Filters</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* FINANCIAL TAB CONTENT */}
        {activeTab === 'financial' && (
          <div className="p-6 space-y-6">
            {/* Top Multi-Column Filter Bar (Clean layout without enclosing background card) */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                {/* Project Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Project Name:</label>
                  <CustomSelect
                    value={finProjectFilter}
                    onChange={(val) => setFinProjectFilter(val)}
                    options={[
                      { label: 'All Projects', value: 'All' },
                      ...summaryProjects.map(p => ({ label: p.name, value: p.name }))
                    ]}
                    triggerClassName="py-1.5 px-3 rounded-xl font-semibold shadow-xs"
                  />
                </div>

                {/* From Date (Separate Column per user voice request) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">From Date:</label>
                  <CustomDatePicker
                    value={fromDate}
                    onChange={(d) => setFromDate(d)}
                    inputClassName="px-3 py-1.5 rounded-xl font-semibold shadow-xs"
                  />
                </div>

                {/* To Date (Separate Column per user voice request) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">To Date:</label>
                  <CustomDatePicker
                    value={toDate}
                    onChange={(d) => setToDate(d)}
                    inputClassName="px-3 py-1.5 rounded-xl font-semibold shadow-xs"
                  />
                </div>
              </div>

              {/* Single Download Button with Dropdown (PDF, Excel, CSV) per User Request */}
              <div className="relative shrink-0" ref={finDownloadRef}>
                <button
                  type="button"
                  onClick={() => setShowFinDownloadDropdown(prev => !prev)}
                  className="px-4 py-2 bg-[#dc2626] hover:bg-[#b9151b] active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-red-200 transition-all flex items-center gap-2 cursor-pointer"
                  title="Download Financial Report"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {showFinDownloadDropdown && (
                  <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-40 animate-in fade-in select-none">
                    <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      Select Download Format
                    </div>

                    {/* 1. PDF Report */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowFinDownloadDropdown(false);
                        handleExportPDF();
                      }}
                      className="w-full px-3.5 py-2.5 text-xs text-left hover:bg-rose-50 flex items-center gap-3 transition-colors cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 text-xs">Download PDF Report</div>
                        <div className="text-[10px] text-slate-500 truncate">Direct file download (.pdf)</div>
                      </div>
                    </button>

                    {/* 2. Excel Spreadsheet */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowFinDownloadDropdown(false);
                        handleExportExcel();
                      }}
                      className="w-full px-3.5 py-2.5 text-xs text-left hover:bg-emerald-50 flex items-center gap-3 transition-colors cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 text-xs">Download Excel Sheet</div>
                        <div className="text-[10px] text-slate-500 truncate">Detailed financial ledger (.xlsx)</div>
                      </div>
                    </button>

                    {/* 3. CSV File */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowFinDownloadDropdown(false);
                        handleExportCSV();
                      }}
                      className="w-full px-3.5 py-2.5 text-xs text-left hover:bg-blue-50 flex items-center gap-3 transition-colors cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Download className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 text-xs">Download CSV File</div>
                        <div className="text-[10px] text-slate-500 truncate">Raw numerical ledger data (.csv)</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ROW 1: Sales, Expense & Margin (All Unified to Trend Line per User Request) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* 1. Sales Chart Card */}
              <div className="bg-white rounded-[5px] border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">Sales</h3>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-[5px] border border-emerald-100 uppercase tracking-wide">
                        Trend Line
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-900 relative">
                      {/* More Options (Three Dots) Button & Dropdown */}
                      <div className="relative" ref={salesDotsMenuRef}>
                        <button
                          type="button"
                          onClick={() => setShowSalesMoreMenu(prev => !prev)}
                          className={`p-1.5 rounded-[5px] transition-colors cursor-pointer flex items-center justify-center text-slate-900 hover:text-black hover:bg-slate-100 ${
                            showSalesMoreMenu ? 'bg-slate-100 text-black font-bold' : ''
                          }`}
                          title="More Options"
                          aria-label="More Options"
                        >
                          <MoreVertical className="w-4 h-4 text-slate-900" />
                        </button>

                        {showSalesMoreMenu && (
                          <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-[5px] shadow-2xl border border-slate-200 py-1.5 z-40 animate-in fade-in select-none">
                            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                              Sales Options
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setShowSalesMoreMenu(false);
                                handleExportExcel();
                              }}
                              className="w-full px-3 py-2 text-xs flex items-center gap-2 text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Export Sales Data</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowSalesMoreMenu(false);
                                handleExportPDF();
                              }}
                              className="w-full px-3 py-2 text-xs flex items-center gap-2 text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 text-rose-600" />
                              <span>Download PDF Report</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Trend Line Chart View */}
                  <div className="h-44 pt-4 pb-2 border-b border-slate-100 flex flex-col justify-between">
                    <div className="h-32 w-full relative">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 280 100" preserveAspectRatio="none">
                        <line x1="0" y1="20" x2="280" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
                        <line x1="0" y1="50" x2="280" y2="50" stroke="#f1f5f9" strokeDasharray="3 3" />
                        <line x1="0" y1="80" x2="280" y2="80" stroke="#f1f5f9" strokeDasharray="3 3" />
                        <polyline
                          fill="none"
                          stroke="#059669"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={salesPointsStr}
                        />
                        {salesChartPoints.map((pt, idx) => (
                          <g key={idx}>
                            <circle cx={pt.x} cy={pt.y} r="4" fill="#059669" stroke="#ffffff" strokeWidth="1.5" />
                            <text x={pt.x} y={pt.y - 8} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#047857">
                              {pt.val.toFixed(2)}M
                            </text>
                          </g>
                        ))}
                      </svg>
                    </div>
                    <div className="flex items-center justify-between text-center select-none pt-1">
                      {finMonthlyData.map((d) => (
                        <div key={d.month} className="flex-1 flex flex-col items-center">
                          <span className="text-[10px] font-bold text-slate-700 leading-none">{d.month.split(' ')[0]}</span>
                          <span className="text-[8px] font-medium text-slate-400 leading-tight mt-0.5">{d.month.split(' ')[1]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Total Sales Banner Card */}
                <div className="mt-5 p-3 bg-emerald-50/80 rounded-[5px] border border-emerald-200/70 text-center">
                  <div className="text-[11px] font-bold text-emerald-800">Total Sales</div>
                  <div className="text-2xl font-black text-emerald-600 tracking-tight mt-0.5 tracking-tight">
                    ₹ {totalFinSales.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* 2. Expense Chart Card */}
              <div className="bg-white rounded-[5px] border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">Expense</h3>
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-[5px] border border-rose-100 uppercase tracking-wide">
                        Trend Line
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-900 relative">
                      <div className="relative" ref={expenseDotsMenuRef}>
                        <button
                          type="button"
                          onClick={() => setShowExpenseMoreMenu(prev => !prev)}
                          className={`p-1.5 rounded-[5px] transition-colors cursor-pointer flex items-center justify-center text-slate-900 hover:text-black hover:bg-slate-100 ${
                            showExpenseMoreMenu ? 'bg-slate-100 text-black font-bold' : ''
                          }`}
                          title="More Options"
                          aria-label="More Options"
                        >
                          <MoreVertical className="w-4 h-4 text-slate-900" />
                        </button>

                        {showExpenseMoreMenu && (
                          <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-[5px] shadow-2xl border border-slate-200 py-1.5 z-40 animate-in fade-in select-none">
                            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                              Expense Options
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setShowExpenseMoreMenu(false);
                                handleExportExcel();
                              }}
                              className="w-full px-3 py-2 text-xs flex items-center gap-2 text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Export Expense Data</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowExpenseMoreMenu(false);
                                handleExportPDF();
                              }}
                              className="w-full px-3 py-2 text-xs flex items-center gap-2 text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 text-rose-600" />
                              <span>Download PDF Report</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expense Trend Line Chart */}
                  <div className="h-44 pt-4 pb-2 border-b border-slate-100 flex flex-col justify-between">
                    <div className="h-32 w-full relative">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 280 100" preserveAspectRatio="none">
                        <line x1="0" y1="20" x2="280" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
                        <line x1="0" y1="50" x2="280" y2="50" stroke="#f1f5f9" strokeDasharray="3 3" />
                        <line x1="0" y1="80" x2="280" y2="80" stroke="#f1f5f9" strokeDasharray="3 3" />
                        <polyline
                          fill="none"
                          stroke="#e11d48"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={expensePointsStr}
                        />
                        {expenseChartPoints.map((pt, idx) => (
                          <g key={idx}>
                            <circle cx={pt.x} cy={pt.y} r="4" fill="#e11d48" stroke="#ffffff" strokeWidth="1.5" />
                            <text x={pt.x} y={pt.y - 8} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#be123c">
                              {pt.val.toFixed(2)}M
                            </text>
                          </g>
                        ))}
                      </svg>
                    </div>
                    <div className="flex items-center justify-between text-center select-none pt-1">
                      {finMonthlyData.map((d) => (
                        <div key={d.month} className="flex-1 flex flex-col items-center">
                          <span className="text-[10px] font-bold text-slate-700 leading-none">{d.month.split(' ')[0]}</span>
                          <span className="text-[8px] font-medium text-slate-400 leading-tight mt-0.5">{d.month.split(' ')[1]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Total Expense Banner Card */}
                <div className="mt-5 p-3 bg-rose-50/80 rounded-[5px] border border-rose-200/70 text-center">
                  <div className="text-[11px] font-bold text-rose-800">Total Expense</div>
                  <div className="text-2xl font-black text-rose-600 tracking-tight mt-0.5 tracking-tight">
                    ₹ {totalFinExpense.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* 3. Margin Chart Card */}
              <div className="bg-white rounded-[5px] border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">Margin</h3>
                      <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-[5px] border border-teal-100 uppercase tracking-wide">
                        Trend Line
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-900 relative">
                      <div className="relative" ref={marginDotsMenuRef}>
                        <button
                          type="button"
                          onClick={() => setShowMarginMoreMenu(prev => !prev)}
                          className={`p-1.5 rounded-[5px] transition-colors cursor-pointer flex items-center justify-center text-slate-900 hover:text-black hover:bg-slate-100 ${
                            showMarginMoreMenu ? 'bg-slate-100 text-black font-bold' : ''
                          }`}
                          title="More Options"
                          aria-label="More Options"
                        >
                          <MoreVertical className="w-4 h-4 text-slate-900" />
                        </button>

                        {showMarginMoreMenu && (
                          <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-[5px] shadow-2xl border border-slate-200 py-1.5 z-40 animate-in fade-in select-none">
                            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                              Margin Options
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setShowMarginMoreMenu(false);
                                handleExportExcel();
                              }}
                              className="w-full px-3 py-2 text-xs flex items-center gap-2 text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Export Margin Data</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowMarginMoreMenu(false);
                                handleExportPDF();
                              }}
                              className="w-full px-3 py-2 text-xs flex items-center gap-2 text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 text-rose-600" />
                              <span>Download PDF Report</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Margin Trend Line Chart */}
                  <div className="h-44 pt-4 pb-2 border-b border-slate-100 flex flex-col justify-between">
                    <div className="h-32 w-full relative">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 280 100" preserveAspectRatio="none">
                        <line x1="0" y1="20" x2="280" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
                        <line x1="0" y1="50" x2="280" y2="50" stroke="#f1f5f9" strokeDasharray="3 3" />
                        <line x1="0" y1="80" x2="280" y2="80" stroke="#f1f5f9" strokeDasharray="3 3" />
                        <polyline
                          fill="none"
                          stroke="#0d9488"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={marginPointsStr}
                        />
                        {marginChartPoints.map((pt, idx) => (
                          <g key={idx}>
                            <circle cx={pt.x} cy={pt.y} r="4" fill="#0d9488" stroke="#ffffff" strokeWidth="1.5" />
                            <text x={pt.x} y={pt.y - 8} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#0f766e">
                              {pt.val.toFixed(2)}M
                            </text>
                          </g>
                        ))}
                      </svg>
                    </div>
                    <div className="flex items-center justify-between text-center select-none pt-1">
                      {finMonthlyData.map((d) => (
                        <div key={d.month} className="flex-1 flex flex-col items-center">
                          <span className="text-[10px] font-bold text-slate-700 leading-none">{d.month.split(' ')[0]}</span>
                          <span className="text-[8px] font-medium text-slate-400 leading-tight mt-0.5">{d.month.split(' ')[1]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Total Margin Banner Card */}
                <div className="mt-5 p-3 bg-teal-50/80 rounded-[5px] border border-teal-200/70 text-center">
                  <div className="text-[11px] font-bold text-teal-800">Total Margin</div>
                  <div className="text-2xl font-black text-teal-700 tracking-tight mt-0.5 tracking-tight">
                    ₹ {totalFinMargin.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 2: Payments & Expense Breakdown (Matching Screenshot 2) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Payments Multi-Bar Card */}
              <div className="bg-white rounded-[5px] border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-900">Payments</h3>
                    <div className="flex items-center gap-3 text-xs">
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showPaymentIn}
                          onChange={(e) => setShowPaymentIn(e.target.checked)}
                          className="w-3.5 h-3.5 text-emerald-600 rounded-[3px] focus:ring-0 cursor-pointer"
                        />
                        <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500"></span>
                        Payment In
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showPaymentOut}
                          onChange={(e) => setShowPaymentOut(e.target.checked)}
                          className="w-3.5 h-3.5 text-rose-600 rounded-[3px] focus:ring-0 cursor-pointer"
                        />
                        <span className="w-2.5 h-2.5 rounded-[2px] bg-rose-500"></span>
                        Payment Out
                      </label>
                    </div>
                  </div>

                  {/* Dual Bar Chart with Concrete Tracks */}
                  <div className="h-44 flex items-end justify-between gap-2 pt-6 pb-2 border-b border-slate-100">
                    {finMonthlyData.map((d) => {
                      const maxPay = Math.max(...finMonthlyData.map(m => Math.max(m.payIn, m.payOut)), 1);
                      const inHeight = d.payIn > 0 ? Math.min(100, Math.max(12, (d.payIn / maxPay) * 100)) : 0;
                      const outHeight = d.payOut > 0 ? Math.min(100, Math.max(12, (d.payOut / maxPay) * 100)) : 0;
                      return (
                        <div key={d.month} className="flex-1 flex flex-col items-center group">
                          {/* Dual bar container with concrete height */}
                          <div className="w-full h-32 flex items-end justify-center gap-1.5 bg-slate-50/60 rounded-t-[3px] px-1">
                            {showPaymentIn && (
                              <div className="flex-1 max-w-[14px] h-full flex flex-col justify-end items-center group/in">
                                <span className="text-[8px] font-bold text-emerald-700 mb-1 opacity-90 group-hover/in:scale-110 transition-transform">
                                  {d.payIn > 0 ? `${d.payIn.toFixed(1)}M` : '-'}
                                </span>
                                <div
                                  className="w-full bg-gradient-to-t from-emerald-600 to-teal-500 rounded-t-[3px] shadow-xs transition-all duration-500 hover:brightness-110"
                                  style={{ height: `${inHeight}%` }}
                                />
                              </div>
                            )}
                            {showPaymentOut && (
                              <div className="flex-1 max-w-[14px] h-full flex flex-col justify-end items-center group/out">
                                <span className="text-[8px] font-bold text-rose-600 mb-1 opacity-90 group-hover/out:scale-110 transition-transform">
                                  {d.payOut > 0 ? `${d.payOut.toFixed(1)}M` : '-'}
                                </span>
                                <div
                                  className="w-full bg-gradient-to-t from-rose-500 to-pink-500 rounded-t-[3px] shadow-xs transition-all duration-500 hover:brightness-110"
                                  style={{ height: `${outHeight}%` }}
                                />
                              </div>
                            )}
                          </div>
                          {/* Month & Year Label */}
                          <div className="flex flex-col items-center mt-2 select-none">
                            <span className="text-[10px] font-bold text-slate-700 leading-none">{d.month.split(' ')[0]}</span>
                            <span className="text-[8px] font-medium text-slate-400 leading-tight">{d.month.split(' ')[1]}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Expense Type Donut Card */}
              <div className="bg-white rounded-[5px] border border-slate-200 shadow-xs p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900">Expense Type</h3>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* SVG Donut */}
                  <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      {/* Background circle */}
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#F1F5F9" strokeWidth="6" />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">Total</span>
                      <span className="text-base font-black text-slate-900 leading-none mt-0.5">0.00</span>
                    </div>
                  </div>

                  {/* Legend breakdown list */}
                  <div className="flex-1 space-y-2 text-xs w-full">
                    <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={showSubconExp} onChange={(e) => setShowSubconExp(e.target.checked)} className="rounded text-blue-600" />
                        <span className="w-2.5 h-2.5 rounded-sm bg-blue-500"></span>
                        <span className="font-semibold text-slate-700">Subcon Expense</span>
                      </div>
                      <span className="tracking-tight font-bold text-slate-900">0.00</span>
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={showOtherExp} onChange={(e) => setShowOtherExp(e.target.checked)} className="rounded text-teal-600" />
                        <span className="w-2.5 h-2.5 rounded-sm bg-teal-500"></span>
                        <span className="font-semibold text-slate-700">Other Expense</span>
                      </div>
                      <span className="tracking-tight font-bold text-slate-900">0.00</span>
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={showSalaryExp} onChange={(e) => setShowSalaryExp(e.target.checked)} className="rounded text-rose-600" />
                        <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
                        <span className="font-semibold text-slate-700">Salary Expense</span>
                      </div>
                      <span className="tracking-tight font-bold text-slate-900">0.00</span>
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={showSiteExp} onChange={(e) => setShowSiteExp(e.target.checked)} className="rounded text-amber-600" />
                        <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span>
                        <span className="font-semibold text-slate-700">Site Expense</span>
                      </div>
                      <span className="tracking-tight font-bold text-slate-900">0.00</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Company Party Balance Card (Matching Screenshot 2 Bottom) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">Company Party Balance (All Projects)</h3>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Visual Gauge */}
                <div className="w-52 h-44 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#F1F5F9" strokeWidth="5.5" />
                  </svg>
                </div>

                {/* Legend Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 flex-1 text-xs w-full">
                  <div className="p-3 rounded-xl border border-slate-150 bg-slate-50/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      <span className="font-semibold text-slate-700">To Pay</span>
                    </div>
                    <span className="tracking-tight font-bold text-blue-600">0.00</span>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-150 bg-slate-50/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-400"></span>
                      <span className="font-semibold text-slate-700">To Receive</span>
                    </div>
                    <span className="tracking-tight font-bold text-teal-600">0.00</span>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-150 bg-slate-50/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                      <span className="font-semibold text-slate-700">Advance Paid</span>
                    </div>
                    <span className="tracking-tight font-bold text-rose-600">0.00</span>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-150 bg-slate-50/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                      <span className="font-semibold text-slate-700">Advance Received</span>
                    </div>
                    <span className="tracking-tight font-bold text-amber-600">0.00</span>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-150 bg-slate-50/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                      <span className="font-semibold text-slate-700">Settled</span>
                    </div>
                    <span className="tracking-tight font-bold text-slate-500">0.00</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 3: 4 Financial KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 shadow-xs text-center">
                <div className="text-xs font-bold text-emerald-800">Advance Paid</div>
                <div className="text-2xl font-black text-emerald-600 mt-1 tracking-tight">0.00</div>
              </div>

              <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/50 shadow-xs text-center">
                <div className="text-xs font-bold text-rose-800">To Pay</div>
                <div className="text-2xl font-black text-rose-600 mt-1 tracking-tight">0.00</div>
              </div>

              <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/50 shadow-xs text-center">
                <div className="text-xs font-bold text-rose-800">To Receive</div>
                <div className="text-2xl font-black text-rose-600 mt-1 tracking-tight">0.00</div>
              </div>

              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 shadow-xs text-center">
                <div className="text-xs font-bold text-emerald-800">Advance Received</div>
                <div className="text-2xl font-black text-emerald-600 mt-1 tracking-tight">0.00</div>
              </div>
            </div>

            {/* ROW 4: Project Financial Summary Table (Matching Screenshot 3) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Project Financial Summary - Dashboard</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Export Excel (.xlsx)</span>
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                    className={`p-1 rounded-lg transition-colors cursor-pointer ${
                      isFullscreen ? 'bg-red-50 text-red-600' : 'hover:bg-slate-100'
                    }`}
                  >
                    {isFullscreen ? (
                      <ArrowsDiagonalMinimizeIcon size={16} className="text-red-600" />
                    ) : (
                      <ArrowsDiagonalRotatedIcon size={16} className="text-slate-400 hover:text-slate-700" />
                    )}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left min-w-[1450px]">
                  <thead className="bg-red-700 text-white font-semibold select-none sticky top-0 z-10 shadow-xs">
                    {/* Header Titles (12 columns) */}
                    <tr className="border-b border-red-800/40 text-[11px]">
                      <th className="py-2.5 px-3 w-12 text-center">#</th>
                      <th className="py-2.5 px-3 min-w-[240px]">Project Name</th>
                      <th className="py-2.5 px-3 min-w-[110px]">Project Status</th>
                      <th className="py-2.5 px-3 min-w-[95px]">Project Health</th>
                      <th className="py-2.5 px-3 text-right min-w-[125px]">Project Budget</th>
                      <th className="py-2.5 px-3 text-right min-w-[125px]">Total Expense</th>
                      <th className="py-2.5 px-3 text-right min-w-[130px]">Budget Remaining</th>
                      <th className="py-2.5 px-3 text-right min-w-[125px]">Total Sales</th>
                      <th className="py-2.5 px-3 text-right min-w-[125px]">Project Margin</th>
                      <th className="py-2.5 px-3 text-right min-w-[125px]">Payment In</th>
                      <th className="py-2.5 px-3 text-right min-w-[125px]">Payment Out</th>
                      <th className="py-2.5 px-3 text-right min-w-[125px]">Cash Balance</th>
                    </tr>

                    {/* Header Filter Inputs */}
                    <tr className="bg-red-800 text-[10px]">
                      <th className="py-1 px-3 text-center">
                        <Filter className="w-3 h-3 mx-auto text-red-200" />
                      </th>
                      <th className="py-1 px-2">
                        <input
                          type="text"
                          placeholder="Filter Name..."
                          value={finSearchName}
                          onChange={(e) => setFinSearchName(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-white text-slate-800 text-[11px] focus:outline-none placeholder-slate-400 shadow-xs"
                        />
                      </th>
                      <th className="py-1 px-2 min-w-[115px]">
                        <CustomSelect
                          value={finSearchStatus}
                          onChange={(val) => setFinSearchStatus(val)}
                          options={['All', 'Ongoing', 'Complete', 'Onhold']}
                          triggerClassName="py-1 px-2 text-[11px] rounded shadow-xs"
                        />
                      </th>
                      <th className="py-1 px-2 min-w-[105px]">
                        <CustomSelect
                          value={finSearchHealth}
                          onChange={(val) => setFinSearchHealth(val)}
                          options={['All', '-', 'Normal', 'At Risk']}
                          triggerClassName="py-1 px-2 text-[11px] rounded shadow-xs"
                        />
                      </th>
                      <th className="py-1 px-2">
                        <input
                          type="text"
                          placeholder="Budget..."
                          value={finSearchBudget}
                          onChange={(e) => setFinSearchBudget(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-white text-slate-800 text-[11px] text-right focus:outline-none placeholder-slate-400 shadow-xs"
                        />
                      </th>
                      <th className="py-1 px-2">
                        <input
                          type="text"
                          placeholder="Expense..."
                          value={finSearchExpense}
                          onChange={(e) => setFinSearchExpense(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-white text-slate-800 text-[11px] text-right focus:outline-none placeholder-slate-400 shadow-xs"
                        />
                      </th>
                      <th className="py-1 px-2 text-right text-red-200 tracking-tight text-[10px]">
                        Remaining
                      </th>
                      <th className="py-1 px-2 text-right text-red-200 tracking-tight text-[10px]">
                        Sales
                      </th>
                      <th className="py-1 px-2 text-right text-red-200 tracking-tight text-[10px]">
                        Margin
                      </th>
                      <th className="py-1 px-2 text-right text-red-200 tracking-tight text-[10px]">
                        Inflow
                      </th>
                      <th className="py-1 px-2 text-right text-red-200 tracking-tight text-[10px]">
                        Outflow
                      </th>
                      <th className="py-1 px-2 text-right text-red-200 tracking-tight text-[10px]">
                        Balance
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
                    {filteredFinRows.map((r, idx) => {
                      const budgetRem = r.budget > 0 ? (r.budget - r.expense) : 0;
                      const margin = r.sales - r.expense;
                      const cashBal = r.paymentIn - r.paymentOut;

                      return (
                        <tr key={r.id} className="hover:bg-red-50/25 transition-colors">
                          {/* 1. Serial Number */}
                          <td className="py-2.5 px-3 text-center tracking-tight text-slate-400">{idx + 1}</td>
                          
                          {/* 2. Project Name */}
                          <td className="py-2.5 px-3 font-semibold text-slate-900 truncate max-w-[260px]" title={r.name}>
                            {r.name}
                          </td>
                          
                          {/* 3. Project Status */}
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.status === 'Ongoing' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              r.status === 'Complete' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          
                          {/* 4. Project Health */}
                          <td className="py-2.5 px-3">
                            <span className={`text-xs font-bold ${
                              r.health === 'Normal' ? 'text-emerald-600' :
                              r.health === 'At Risk' ? 'text-rose-600' :
                              'text-slate-400'
                            }`}>
                              {r.health}
                            </span>
                          </td>
                          
                          {/* 5. Project Budget */}
                          <td className="py-2.5 px-3 text-right tracking-tight text-slate-800">
                            {r.budget.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          
                          {/* 6. Total Expense */}
                          <td className="py-2.5 px-3 text-right tracking-tight text-rose-600 font-semibold">
                            {r.expense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          
                          {/* 7. Budget Remaining */}
                          <td className={`py-2.5 px-3 text-right tracking-tight font-semibold ${budgetRem < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {budgetRem.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          
                          {/* 8. Total Sales */}
                          <td className="py-2.5 px-3 text-right tracking-tight text-slate-900 font-semibold">
                            {r.sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          
                          {/* 9. Project Margin */}
                          <td className={`py-2.5 px-3 text-right tracking-tight font-bold ${margin < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {margin.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          
                          {/* 10. Payment In */}
                          <td className="py-2.5 px-3 text-right tracking-tight text-emerald-600 font-semibold">
                            {r.paymentIn.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          
                          {/* 11. Payment Out */}
                          <td className="py-2.5 px-3 text-right tracking-tight text-rose-600 font-semibold">
                            {r.paymentOut.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          
                          {/* 12. Cash Balance */}
                          <td className={`py-2.5 px-3 text-right tracking-tight font-black ${cashBal < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {cashBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Summary Totals Row */}
                  <tfoot className="bg-slate-100/90 font-bold border-t-2 border-slate-200 text-[11px] text-slate-800">
                    <tr>
                      <td colSpan={4} className="py-3 px-3 text-slate-900 font-bold">
                        Total Summary ({filteredFinRows.length} Projects)
                      </td>
                      <td className="py-3 px-3 text-right tracking-tight text-slate-900">
                        {filteredFinRows.reduce((a, b) => a + b.budget, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right tracking-tight text-rose-600">
                        {filteredFinRows.reduce((a, b) => a + b.expense, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right tracking-tight text-emerald-600">
                        {filteredFinRows.reduce((a, b) => a + (b.budget > 0 ? b.budget - b.expense : 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right tracking-tight text-slate-900">
                        {filteredFinRows.reduce((a, b) => a + b.sales, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right tracking-tight text-emerald-600">
                        {filteredFinRows.reduce((a, b) => a + (b.sales - b.expense), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right tracking-tight text-emerald-600">
                        {filteredFinRows.reduce((a, b) => a + b.paymentIn, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right tracking-tight text-rose-600">
                        {filteredFinRows.reduce((a, b) => a + b.paymentOut, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right tracking-tight text-emerald-700">
                        {filteredFinRows.reduce((a, b) => a + (b.paymentIn - b.paymentOut), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Extract Details Modal */}
            {showExtractModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
                <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Extracted Financial Report</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Selected Range: <strong className="text-slate-800">{fromDate}</strong> to <strong className="text-slate-800">{toDate}</strong> • Project: <strong className="text-slate-800">{finProjectFilter}</strong>
                      </p>
                    </div>
                    <button onClick={() => setShowExtractModal(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* KPI Highlights */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                        <div className="text-[11px] font-semibold text-emerald-800">Extracted Sales</div>
                        <div className="text-lg font-black text-emerald-600 mt-0.5">₹24.24M</div>
                      </div>
                      <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                        <div className="text-[11px] font-semibold text-rose-800">Extracted Expense</div>
                        <div className="text-lg font-black text-rose-600 mt-0.5">₹21.38M</div>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="text-[11px] font-semibold text-blue-800">Net Margin</div>
                        <div className="text-lg font-black text-blue-600 mt-0.5">₹2.87M</div>
                      </div>
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                        <div className="text-[11px] font-semibold text-amber-800">Records Found</div>
                        <div className="text-lg font-black text-amber-600 mt-0.5">{filteredFinRows.length}</div>
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">Project</th>
                            <th className="py-2 px-3">Status</th>
                            <th className="py-2 px-3 text-right">Budget</th>
                            <th className="py-2 px-3 text-right">Expense</th>
                            <th className="py-2 px-3 text-right">Sales</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                          {filteredFinRows.slice(0, 6).map((r) => (
                            <tr key={r.id}>
                              <td className="py-2 px-3 font-semibold text-slate-900 truncate max-w-[200px]">{r.name}</td>
                              <td className="py-2 px-3">{r.status}</td>
                              <td className="py-2 px-3 text-right tracking-tight">{r.budget.toLocaleString()}</td>
                              <td className="py-2 px-3 text-right tracking-tight">{r.expense.toLocaleString()}</td>
                              <td className="py-2 px-3 text-right tracking-tight text-emerald-600 font-bold">{r.sales.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setShowExtractModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        handleExportCSV();
                      }}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                      <span>Export CSV</span>
                    </button>
                    <button
                      onClick={() => {
                        handleExportExcel();
                        setShowExtractModal(false);
                      }}
                      className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Download Excel (.xlsx)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Floating Hover Tooltip: Purely informational showing Date and Present count */}
        {hoveredAttendanceBar && (
          <div 
            className="fixed z-[999] pointer-events-none transition-all duration-75 ease-out"
            style={{ 
              left: `${Math.min(typeof window !== 'undefined' ? window.innerWidth - 240 : 800, hoveredAttendanceBar.x + 14)}px`, 
              top: `${Math.max(12, hoveredAttendanceBar.y - 100)}px` 
            }}
          >
            <div className="bg-slate-900/95 text-white rounded-xl shadow-2xl px-3.5 py-2.5 text-xs border border-slate-700/80 backdrop-blur-md min-w-[200px] space-y-2 select-none">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 gap-2">
                <span className="text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  {hoveredAttendanceBar.fullDate}
                </span>
                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
                  {hoveredAttendanceBar.present} Present
                </span>
              </div>
              <div className="flex items-baseline justify-between pt-0.5">
                <span className="text-[11px] text-slate-400 font-medium">Workers Present:</span>
                <span className="text-sm font-bold tracking-tight text-emerald-400">
                  {hoveredAttendanceBar.present}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-slate-800">
                <div className="text-emerald-400 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>{hoveredAttendanceBar.present} Present</span>
                </div>
                <div className="text-rose-400 flex items-center gap-1 justify-end font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  <span>{hoveredAttendanceBar.absent} Absent</span>
                </div>
              </div>
              {hoveredAttendanceBar.otHours > 0 && (
                <div className="text-[9px] text-slate-400 pt-0.5 flex items-center justify-between border-t border-slate-800/60">
                  <span>Overtime: <strong className="text-red-300">{hoveredAttendanceBar.otHours} hrs</strong></span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )}
  </div>
);
};
