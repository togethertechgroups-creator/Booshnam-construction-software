import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Bell, User as UserIcon, RefreshCw, Calendar,
  ArrowUpDown, BarChart2, Maximize2, Minimize2, MoreVertical, 
  Search, CheckCircle2, AlertTriangle, Filter, ChevronDown, 
  TrendingUp, DollarSign, Layers, ArrowDownRight,
  Settings, UserX, LogOut, CheckCheck, Clock, ShieldCheck, X,
  Download, FileSpreadsheet, Check, PieChart, Wallet, CreditCard,
  ArrowLeft, Menu, LayoutDashboard, RotateCcw, FileText
} from 'lucide-react';
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
  normalizeDepartmentId 
} from '../lib/departmentService';

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

const MASTER_EMPLOYEES = [
  // Office Staff (10 employees)
  { employee_code: 'EMP-0101', name: 'Rajesh Chandran', role: 'Director', payroll_type: 'Office Staff' as const, salary: 150000, salary_type: 'Month' as const },
  { employee_code: 'EMP-0102', name: 'Vikramaditya Rao', role: 'Chief Operating Officer', payroll_type: 'Office Staff' as const, salary: 125000, salary_type: 'Month' as const },
  { employee_code: 'EMP-0103', name: 'Anandhi Venkatesh', role: 'Admin', payroll_type: 'Office Staff' as const, salary: 35000, salary_type: 'Month' as const },
  { employee_code: 'EMP-0104', name: 'Karthik Sundaram', role: 'Business Development', payroll_type: 'Office Staff' as const, salary: 45000, salary_type: 'Month' as const },
  { employee_code: 'EMP-0105', name: 'Meena Kumari', role: 'Collection Executive', payroll_type: 'Office Staff' as const, salary: 32000, salary_type: 'Month' as const },
  { employee_code: 'EMP-0106', name: 'Priya Dharshini', role: 'Digital Marketing', payroll_type: 'Office Staff' as const, salary: 38000, salary_type: 'Month' as const },
  { employee_code: 'EMP-0107', name: 'Kavitha Selvan', role: 'Accounts', payroll_type: 'Office Staff' as const, salary: 34000, salary_type: 'Month' as const },
  { employee_code: 'EMP-0108', name: 'Suresh Narayanan', role: 'Accounts', payroll_type: 'Office Staff' as const, salary: 48000, salary_type: 'Month' as const },
  { employee_code: 'EMP-0109', name: 'Anitha Sekar', role: 'Collection Executive', payroll_type: 'Office Staff' as const, salary: 33000, salary_type: 'Month' as const },
  { employee_code: 'EMP-0110', name: 'Deepa Natarajan', role: 'Digital Marketing', payroll_type: 'Office Staff' as const, salary: 40000, salary_type: 'Month' as const },

  // Site Staff (15 employees)
  { employee_code: 'EMP-0111', name: 'Arun Verma', role: 'Engineer', payroll_type: 'Site Staff' as const, salary: 55000, salary_type: 'Month' as const },
  { employee_code: 'EMP-0112', name: 'Rajesh Kannan', role: 'Engineer', payroll_type: 'Site Staff' as const, salary: 48000, salary_type: 'Month' as const },
  { employee_code: 'EMP-0113', name: 'Karthik Nair', role: 'Project Manager', payroll_type: 'Site Staff' as const, salary: 85000, salary_type: 'Month' as const },
  { employee_code: 'EMP-0114', name: 'Vikram Singhania', role: 'Project Manager', payroll_type: 'Site Staff' as const, salary: 90000, salary_type: 'Month' as const },
  { employee_code: 'EMP-0115', name: 'Priya Sharma', role: 'Project Manager', payroll_type: 'Site Staff' as const, salary: 88000, salary_type: 'Month' as const },
  { employee_code: 'EMP-0116', name: 'Ganesh Moorthy', role: 'Site Supervisor', payroll_type: 'Site Staff' as const, salary: 38000, salary_type: 'Month' as const },
  { employee_code: 'EMP-0117', name: 'Thangavelu M', role: 'Site Safety Officer', payroll_type: 'Site Staff' as const, salary: 1050, salary_type: 'Day' as const },
  { employee_code: 'EMP-0118', name: 'Murugan Subramanian', role: 'Senior Mason', payroll_type: 'Site Staff' as const, salary: 950, salary_type: 'Day' as const },
  { employee_code: 'EMP-0119', name: 'Dharmendra Yadav', role: 'Steel Fixer', payroll_type: 'Site Staff' as const, salary: 900, salary_type: 'Day' as const },
  { employee_code: 'EMP-0120', name: 'Shivaji Bhosale', role: 'Carpenter', payroll_type: 'Site Staff' as const, salary: 920, salary_type: 'Day' as const },
  { employee_code: 'EMP-0121', name: 'Mohammed Irfan', role: 'Electrician', payroll_type: 'Site Staff' as const, salary: 1000, salary_type: 'Day' as const },
  { employee_code: 'EMP-0122', name: 'Basavaraj Patil', role: 'Heavy Equipment Operator', payroll_type: 'Site Staff' as const, salary: 1200, salary_type: 'Day' as const },
  { employee_code: 'EMP-0123', name: 'Velu Pandian', role: 'Bar Bender Specialist', payroll_type: 'Site Staff' as const, salary: 850, salary_type: 'Day' as const },
  { employee_code: 'EMP-0124', name: 'Manikandan S', role: 'Plumbing Technician', payroll_type: 'Site Staff' as const, salary: 880, salary_type: 'Day' as const },
  { employee_code: 'EMP-0125', name: 'Selvaraj Mani', role: 'Finishing Mason', payroll_type: 'Site Staff' as const, salary: 950, salary_type: 'Day' as const },
];

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
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
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
  const healthChartMenuRef = useRef<HTMLDivElement>(null);
  const healthDotsMenuRef = useRef<HTMLDivElement>(null);
  const finDownloadRef = useRef<HTMLDivElement>(null);
  const salesChartMenuRef = useRef<HTMLDivElement>(null);
  const salesDotsMenuRef = useRef<HTMLDivElement>(null);

  // Sales Chart Models & Dropdown States
  type SalesChartModel = 'bar' | 'area' | 'line' | 'horizontal';
  const [salesChartType, setSalesChartType] = useState<SalesChartModel>('bar');
  const [showSalesChartDropdown, setShowSalesChartDropdown] = useState(false);
  const [showSalesMoreMenu, setShowSalesMoreMenu] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotificationDropdown(false);
      }
      if (healthChartMenuRef.current && !healthChartMenuRef.current.contains(e.target as Node)) {
        setShowChartTypeDropdown(false);
      }
      if (healthDotsMenuRef.current && !healthDotsMenuRef.current.contains(e.target as Node)) {
        setShowHealthMenuDropdown(false);
      }
      if (finDownloadRef.current && !finDownloadRef.current.contains(e.target as Node)) {
        setShowFinDownloadDropdown(false);
      }
      if (salesChartMenuRef.current && !salesChartMenuRef.current.contains(e.target as Node)) {
        setShowSalesChartDropdown(false);
      }
      if (salesDotsMenuRef.current && !salesDotsMenuRef.current.contains(e.target as Node)) {
        setShowSalesMoreMenu(false);
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
  
  // Attendance & Material filters
  const [payrollType, setPayrollType] = useState('All');
  const [workforceName, setWorkforceName] = useState('All');
  const [materialName, setMaterialName] = useState('All');
  const [materialCategory, setMaterialCategory] = useState('All');
  const [showMaterialData, setShowMaterialData] = useState(false);

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

  // Project Health Chart Models & Underlying Sheet States
  type ProjectHealthChartModel = 'gauge' | 'donut' | 'pie' | 'bar' | 'linear' | 'speedometer';
  const [healthChartType, setHealthChartType] = useState<ProjectHealthChartModel>('gauge');
  const [showChartTypeDropdown, setShowChartTypeDropdown] = useState(false);
  const [showHealthMenuDropdown, setShowHealthMenuDropdown] = useState(false);
  const [isUnderlyingHealthPageView, setIsUnderlyingHealthPageView] = useState(false);
  const [healthSearchTerm, setHealthSearchTerm] = useState('');
  const [healthFilterTab, setHealthFilterTab] = useState<'All' | 'Normal' | 'At Risk'>('All');

  // Dynamic Projects derived from projects prop (matches active department or full portfolio)
  const summaryProjects = useMemo(() => {
    const rawList = activeDeptId === 'booshnam_associates'
      ? projects
      : projects.filter(p => normalizeDepartmentId(p.department as string) === activeDeptId);

    if (rawList && rawList.length > 0) {
      return rawList.map((p, idx) => {
        const title = formatProjectTitle(p);
        const leadPerson = p.assigned_team && p.assigned_team.length > 0
          ? `${p.assigned_team[0].name} (${p.assigned_team[0].role})`
          : 'Arun Verma (PM)';
        
        let displayStatus: 'Ongoing' | 'Not Started' | 'Onhold' | 'Completed' = 'Ongoing';
        if (p.status === 'COMPLETED' || (p.progress_percentage !== undefined && p.progress_percentage >= 100)) {
          displayStatus = 'Completed';
        } else if (p.status === 'ON_HOLD') {
          displayStatus = 'Onhold';
        } else if (p.status === 'PLANNING' || (p.progress_percentage !== undefined && p.progress_percentage === 0)) {
          displayStatus = 'Not Started';
        } else {
          displayStatus = 'Ongoing';
        }

        const healthStatus: 'Normal' | 'At Risk' = (p.code === 'PRJ-003' || (p.approval_pending_count !== undefined && p.approval_pending_count > 1)) ? 'At Risk' : 'Normal';

        return {
          id: p.id || String(idx + 1),
          code: p.code || `PRJ-00${idx + 1}`,
          name: title,
          department: p.department,
          category: p.category || p.project_type || 'General',
          personnel: leadPerson,
          status: displayStatus,
          health: healthStatus,
          date: p.expected_end_date || '2026-12-31',
          progress: p.progress_percentage || 0,
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
    const healthyPercent = total > 0 ? Math.round((healthyCount / total) * 100) : 100;

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
    const matchesName = p.name.toLowerCase().includes(searchName.toLowerCase());
    const matchesCategory = searchCategory === '' || p.category.toLowerCase().includes(searchCategory.toLowerCase());
    const matchesPersonnel = searchPersonnel === '' || p.personnel.toLowerCase().includes(searchPersonnel.toLowerCase());
    const matchesStatus = (selectedStatusFilter === 'All' || p.status === selectedStatusFilter) &&
                          (searchStatus === 'All' || p.status === searchStatus);
    const matchesHealth = (selectedHealthFilter === 'All' || p.health === selectedHealthFilter) &&
                          (searchHealth === 'All' || p.health === searchHealth);
    const matchesDueDate = searchDueDate === '' || p.date === searchDueDate || p.date.includes(searchDueDate);
    return matchesName && matchesCategory && matchesPersonnel && matchesStatus && matchesHealth && matchesDueDate;
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

  // Financial Monthly Data
  const finMonthlyData = [
    { month: 'Jan 2026', sales: 0, expense: 0, margin: 0, payIn: 0, payOut: 0 },
    { month: 'Feb 2026', sales: 0, expense: 0, margin: 0, payIn: 0, payOut: 0 },
    { month: 'Mar 2026', sales: 0, expense: 0, margin: 0, payIn: 0, payOut: 0 },
    { month: 'Apr 2026', sales: 0, expense: 0, margin: 0, payIn: 0, payOut: 0 },
    { month: 'May 2026', sales: 0, expense: 0, margin: 0, payIn: 0, payOut: 0 },
    { month: 'Jun 2026', sales: 0, expense: 0, margin: 0, payIn: 0, payOut: 0 },
    { month: 'Jul 2026', sales: 0, expense: 0, margin: 0, payIn: 0, payOut: 0 },
  ];

  // Financial Table rows derived dynamically from projects
  const finSummaryRows = useMemo(() => {
    if (!projects || projects.length === 0) return [];
    return projects.map((p, idx) => {
      const budget = p.estimated_budget || 0;
      const expense = (p as any).spent_budget || p.actual_cost || 0;
      return {
        id: p.id || String(idx + 1),
        name: formatProjectTitle(p),
        status: p.status === 'COMPLETED' ? 'Complete' : 'Ongoing',
        health: '-',
        budget,
        expense,
        sales: budget,
        paymentIn: budget > 0 ? expense : 0,
        paymentOut: expense,
      };
    });
  }, [projects]);

  const filteredFinRows = finSummaryRows.filter(r => {
    const matchesName = r.name.toLowerCase().includes(finSearchName.toLowerCase());
    const matchesStatus = (finSearchStatus === 'All' || r.status === finSearchStatus);
    const matchesHealth = (finSearchHealth === 'All' || r.health === finSearchHealth);
    const matchesBudget = finSearchBudget === '' || r.budget.toString().includes(finSearchBudget);
    const matchesExpense = finSearchExpense === '' || r.expense.toString().includes(finSearchExpense);
    return matchesName && matchesStatus && matchesHealth && matchesBudget && matchesExpense;
  });

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
    <div className="flex-1 flex flex-col min-w-0 bg-white min-h-screen">
      {/* Toast Feedback Alert */}
      {toastMsg && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>{toastMsg}</span>
        </div>
      )}


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
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              Verified GPS Geofenced Attendance Log
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Underlying Attendance Roster — {attendanceData.find(d => d.date === selectedModalDate)?.fullDate || `${selectedModalDate}-2026`}
            </h1>
            <p className="text-xs text-slate-500">
              Detailed breakdown of daily worker attendance, employee codes, designations, payroll categories, and calculated wages.
            </p>
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
                  <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{rawRecords.length}</div>
                  <span className="text-[11px] text-slate-400">Enrolled workforce</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-emerald-600 font-medium">Workers Present</span>
                  <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">{presentCount}</div>
                  <span className="text-[11px] text-emerald-500 font-semibold">{rawRecords.length > 0 ? ((presentCount / rawRecords.length) * 100).toFixed(0) : 0}% Turnout</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-rose-600 font-medium">Workers Absent</span>
                  <div className="text-2xl font-bold font-mono text-rose-600 mt-1">{absentCount}</div>
                  <span className="text-[11px] text-rose-400">Leave / Unannounced</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-red-600 font-medium">Overtime Hours</span>
                  <div className="text-2xl font-bold font-mono text-red-600 mt-1">{totalOT.toFixed(1)} hrs</div>
                  <span className="text-[11px] text-red-400">Site night shift</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
                  <span className="text-xs text-blue-600 font-medium">Day Wage Cost</span>
                  <div className="text-2xl font-bold font-mono text-blue-700 mt-1">
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
                              <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                                {i + 1}
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-600">
                                {r.fullDate}
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-slate-900">
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
                              <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                                {r.salary_type === 'Month' ? (
                                  <span>₹{r.salary.toLocaleString('en-IN')} <span className="text-[10px] text-slate-400 font-normal">/ mo</span></span>
                                ) : (
                                  <span>₹{r.salary.toLocaleString('en-IN')} <span className="text-[10px] text-slate-400 font-normal">/ day</span></span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right font-mono">
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
                          <td className="py-3.5 px-4 text-center font-mono">
                            {filteredRecords.filter(r => r.status !== 'Absent').length} P / {filteredRecords.filter(r => r.status === 'Absent').length} A
                          </td>
                          <td className="py-3.5 px-4"></td>
                          <td className="py-3.5 px-4 text-right font-mono text-emerald-700">
                            ₹{filteredRecords.filter(r => r.status !== 'Absent').reduce((sum, r) => {
                              const base = r.salary_type === 'Month' ? Math.round(r.salary / 26) : r.salary;
                              const ot = r.overtime_hours * 180;
                              return sum + base + ot;
                            }, 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-red-700">
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
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-600" />
                    <span>Return to Dashboard</span>
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
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-2 mx-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                Live Project Health & Operational Risk Registry
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                83.3% Healthy Rate (5 / 6 Projects)
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Underlying Project Health Sheet — All Monitored Sites (6)
            </h1>
            <p className="text-xs text-slate-500">
              Granular inspection of project stability, milestone schedule health, responsible project engineers, and critical risk mitigation logs.
            </p>
          </div>

          {/* 4 Summary Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Sites</div>
              <div className="text-2xl font-black text-slate-900 mt-1">6</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Commercial, Industrial, Infra</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs">
              <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Healthy / Normal</div>
              <div className="text-2xl font-black text-blue-600 mt-1">5</div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">83.3% of Portfolio</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-red-200 shadow-xs">
              <div className="text-[11px] font-bold text-red-600 uppercase tracking-wider">At Risk</div>
              <div className="text-2xl font-black text-red-600 mt-1">1</div>
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
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">{p.code}</td>
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
                          <span className="font-mono font-bold text-[11px]">{p.progress}%</span>
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
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{p.date}</td>
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
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-slate-600" />
                <span>Return to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Main Company Dashboard View (Edge-to-edge seamless) */
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {/* Edge-to-edge Header with Hamburger, Title, Refresh, Share & User Profile */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-white sticky top-0 z-10">
            <div className="flex items-center gap-3">

              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
            </div>
            <div className="flex items-center gap-2.5">
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

        {/* Dual Tab Buttons: Operational & Financial */}
        <div className="px-6 pt-3 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('operational')}
            className={`pb-2.5 text-xs font-bold transition-all relative ${
              activeTab === 'operational' 
                ? 'text-brand border-b-2 border-brand font-black' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Operational
          </button>
          <button
            onClick={() => setActiveTab('financial')}
            className={`pb-2.5 text-xs font-bold transition-all relative ${
              activeTab === 'financial' 
                ? 'text-brand border-b-2 border-brand font-black' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Financial
          </button>
        </div>

        {/* OPERATIONAL TAB CONTENT */}
        {activeTab === 'operational' && (
          <div className="p-6 space-y-5">
            {/* Top Filter Bar (Clean layout without enclosing background card) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Project Name:</label>
                <CustomSelect
                  value={selectedProjectFilter}
                  onChange={(val) => setSelectedProjectFilter(val)}
                  options={[
                    { label: 'All Projects', value: 'All' },
                    ...summaryProjects.map(p => ({ label: p.name, value: p.name }))
                  ]}
                  triggerClassName="py-1.5 px-3 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Project Status:</label>
                <CustomSelect
                  value={selectedStatusFilter}
                  onChange={(val) => setSelectedStatusFilter(val)}
                  options={[
                    { label: `All (${kpiCounts.total})`, value: 'All' },
                    { label: `Ongoing (${kpiCounts.ongoing})`, value: 'Ongoing' },
                    { label: `Not Started (${kpiCounts.notStarted})`, value: 'Not Started' },
                    { label: `Onhold (${kpiCounts.onhold})`, value: 'Onhold' },
                    { label: `Completed (${kpiCounts.completed})`, value: 'Completed' },
                  ]}
                  triggerClassName="py-1.5 px-3 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Project Health:</label>
                <CustomSelect
                  value={selectedHealthFilter}
                  onChange={(val) => setSelectedHealthFilter(val)}
                  options={[
                    { label: `All (${kpiCounts.total})`, value: 'All' },
                    { label: `Normal (${kpiCounts.healthyCount})`, value: 'Normal' },
                    { label: `At Risk (${kpiCounts.atRiskCount})`, value: 'At Risk' },
                  ]}
                  triggerClassName="py-1.5 px-3 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* 4 KPI Cards (Dynamic counts matching Projects page!) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Not Started */}
              <div 
                onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'Not Started' ? 'All' : 'Not Started')}
                className={`p-4 rounded-xl border bg-white shadow-sm transition-all cursor-pointer text-center ${
                  selectedStatusFilter === 'Not Started' ? 'ring-2 ring-red-400 border-red-300' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-xs font-bold text-red-500">Not Started Projects</div>
                <div className="text-3xl font-black text-red-500 mt-2 tracking-tight">{kpiCounts.notStarted}</div>
              </div>

              {/* Ongoing Projects */}
              <div 
                onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'Ongoing' ? 'All' : 'Ongoing')}
                className={`p-4 rounded-xl border bg-white shadow-sm transition-all cursor-pointer text-center ${
                  selectedStatusFilter === 'Ongoing' ? 'ring-2 ring-emerald-500 border-emerald-300' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-xs font-bold text-emerald-600">Ongoing Projects</div>
                <div className="text-3xl font-black text-emerald-600 mt-2 tracking-tight">{kpiCounts.ongoing}</div>
              </div>

              {/* Onhold Projects */}
              <div 
                onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'Onhold' ? 'All' : 'Onhold')}
                className={`p-4 rounded-xl border bg-white shadow-sm transition-all cursor-pointer text-center ${
                  selectedStatusFilter === 'Onhold' ? 'ring-2 ring-amber-500 border-amber-300' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-xs font-bold text-amber-500">Onhold Projects</div>
                <div className="text-3xl font-black text-amber-500 mt-2 tracking-tight">{kpiCounts.onhold}</div>
              </div>

              {/* Completed Projects */}
              <div 
                onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'Completed' ? 'All' : 'Completed')}
                className={`p-4 rounded-xl border bg-white shadow-sm transition-all cursor-pointer text-center ${
                  selectedStatusFilter === 'Completed' ? 'ring-2 ring-slate-800 border-slate-400' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-xs font-bold text-slate-700">Completed Projects</div>
                <div className="text-3xl font-black text-slate-800 mt-2 tracking-tight">{kpiCounts.completed}</div>
              </div>
            </div>

            {/* Project Health Chart Widget with Multiple Models & Underlying Sheet */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-sm">Project Health</h3>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 uppercase tracking-wide">
                    {healthChartType === 'gauge' ? 'Semi-Circle Gauge' : 
                     healthChartType === 'donut' ? 'Donut Chart' :
                     healthChartType === 'pie' ? 'Pie Chart' :
                     healthChartType === 'bar' ? 'Bar Chart' :
                     healthChartType === 'linear' ? 'Linear Stacked' : 'Speedometer'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-slate-900 relative">
                  {/* Chart Model Switcher Button & Dropdown */}
                  <div className="relative" ref={healthChartMenuRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowChartTypeDropdown(prev => !prev);
                        setShowHealthMenuDropdown(false);
                      }}
                      className={`p-1.5 rounded-[5px] transition-colors cursor-pointer flex items-center gap-1 text-slate-900 hover:text-black hover:bg-slate-100 ${
                        showChartTypeDropdown 
                          ? 'bg-blue-50 text-blue-700 font-bold' 
                          : ''
                      }`}
                      title="Switch Chart Model"
                      aria-label="Switch Chart Model"
                    >
                      <BarChart2 className="w-4 h-4 text-slate-900" />
                      <ChevronDown className="w-3 h-3 text-slate-900" />
                    </button>

                    {showChartTypeDropdown && (
                      <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-[5px] shadow-xl border border-slate-200 py-1.5 z-40 animate-in fade-in select-none">
                        <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          Select Chart Model
                        </div>
                        {[
                          { id: 'gauge', label: 'Semi-Circle Gauge (Default)', icon: '🔘' },
                          { id: 'donut', label: 'Donut Chart', icon: '🍩' },
                          { id: 'pie', label: 'Pie Chart', icon: '🥧' },
                          { id: 'bar', label: 'Vertical Bar Chart', icon: '📊' },
                          { id: 'linear', label: 'Linear Stacked Bar', icon: '📏' },
                          { id: 'speedometer', label: 'Speedometer Dial', icon: '🧭' },
                        ].map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setHealthChartType(m.id as ProjectHealthChartModel);
                              setShowChartTypeDropdown(false);
                              showToast(`Chart updated to ${m.label}`);
                            }}
                            className={`w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer ${
                              healthChartType === m.id ? 'font-bold text-blue-600 bg-blue-50/50' : 'text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>{m.icon}</span>
                              <span>{m.label}</span>
                            </div>
                            {healthChartType === m.id && <Check className="w-3.5 h-3.5 text-blue-600" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Three Dots Menu Button & Dropdown */}
                  <div className="relative" ref={healthDotsMenuRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowHealthMenuDropdown(prev => !prev);
                        setShowChartTypeDropdown(false);
                      }}
                      className={`p-1.5 rounded-[5px] transition-colors cursor-pointer text-slate-900 hover:text-black hover:bg-slate-100 flex items-center justify-center ${
                        showHealthMenuDropdown 
                          ? 'bg-slate-100 text-black font-bold' 
                          : ''
                      }`}
                      title="More options"
                      aria-label="More options"
                    >
                      <MoreVertical className="w-4 h-4 text-slate-900" />
                    </button>

                    {showHealthMenuDropdown && (
                      <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-40 animate-in fade-in select-none">
                        <button
                          type="button"
                          onClick={() => {
                            setShowHealthMenuDropdown(false);
                            setIsUnderlyingHealthPageView(true); // Opens dedicated Project Health Sheet Page!
                          }}
                          className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors text-left cursor-pointer"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                          <span>View Underlying Data</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowHealthMenuDropdown(false);
                            handleExportHealthExcel();
                          }}
                          className="w-full px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2.5 transition-colors text-left cursor-pointer"
                        >
                          <Download className="w-4 h-4 text-slate-400" />
                          <span>Export Health Sheet (.xlsx)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-around py-4 gap-6 min-h-[160px]">
                {/* 1. Semi-Circle Gauge (Default Model) */}
                {healthChartType === 'gauge' && (
                  <div className="relative w-72 h-36 flex items-end justify-center overflow-hidden animate-in fade-in duration-200">
                    <svg viewBox="0 0 200 100" className="w-full h-full">
                      {/* Background Arc */}
                      <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke="#E2E8F0"
                        strokeWidth="32"
                      />
                      {/* Blue Active Fill Arc (100%) */}
                      <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke="#6088F5"
                        strokeWidth="32"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute bottom-1 font-bold text-sm text-slate-700">
                      100%
                    </div>
                  </div>
                )}

                {/* 2. Donut Chart */}
                {healthChartType === 'donut' && (
                  <div className="relative w-40 h-40 flex items-center justify-center animate-in fade-in duration-200">
                    <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                      <circle cx="80" cy="80" r="54" fill="none" stroke="#F1F5F9" strokeWidth="22" />
                      {/* Healthy: 5/6 = 83.33% */}
                      <circle 
                        cx="80" 
                        cy="80" 
                        r="54" 
                        fill="none" 
                        stroke="#6088F5" 
                        strokeWidth="22" 
                        strokeDasharray="282.7 339.3"
                        strokeDashoffset="0"
                        className="transition-all duration-500"
                      />
                      {/* At Risk: 1/6 = 16.67% */}
                      <circle 
                        cx="80" 
                        cy="80" 
                        r="54" 
                        fill="none" 
                        stroke="#F87171" 
                        strokeWidth="22" 
                        strokeDasharray="56.5 339.3"
                        strokeDashoffset="-282.7"
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl font-black text-slate-900 leading-tight">6</span>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Projects</span>
                      <span className="text-[10px] font-bold text-emerald-600 mt-0.5">83.3% Healthy</span>
                    </div>
                  </div>
                )}

                {/* 3. Pie Chart */}
                {healthChartType === 'pie' && (
                  <div className="relative w-40 h-40 flex items-center justify-center animate-in fade-in duration-200">
                    <svg viewBox="0 0 160 160" className="w-full h-full">
                      {/* Healthy Wedge (83.3%): 300 degrees from 12 o'clock */}
                      <path
                        d="M 80,80 L 80,15 A 65,65 0 1,1 23.7,112.5 Z"
                        fill="#6088F5"
                        className="transition-all duration-300 hover:opacity-90"
                      />
                      {/* At Risk Wedge (16.7%): 60 degrees */}
                      <path
                        d="M 80,80 L 23.7,112.5 A 65,65 0 0,1 80,15 Z"
                        fill="#F87171"
                        className="transition-all duration-300 hover:opacity-90"
                      />
                    </svg>
                    <div className="absolute bottom-0 text-[10px] font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded shadow-2xs">
                      5 Healthy / 1 At Risk
                    </div>
                  </div>
                )}

                {/* 4. Vertical Bar Chart */}
                {healthChartType === 'bar' && (
                  <div className="w-56 h-36 flex items-end justify-around gap-6 pb-2 border-b border-slate-200 px-4 animate-in fade-in duration-200">
                    <div className="flex flex-col items-center gap-1 flex-1 h-full justify-end group">
                      <span className="text-xs font-bold text-slate-700">5</span>
                      <div 
                        className="w-full max-w-[40px] bg-[#6088F5] rounded-t-lg transition-all duration-500 group-hover:bg-blue-600 shadow-sm"
                        style={{ height: '83%' }}
                      />
                      <span className="text-[11px] font-semibold text-slate-600 mt-1 whitespace-nowrap">Healthy</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 flex-1 h-full justify-end group">
                      <span className="text-xs font-bold text-red-500">1</span>
                      <div 
                        className="w-full max-w-[40px] bg-[#F87171] rounded-t-lg transition-all duration-500 group-hover:bg-red-500 shadow-sm"
                        style={{ height: '17%' }}
                      />
                      <span className="text-[11px] font-semibold text-red-600 mt-1 whitespace-nowrap">At Risk</span>
                    </div>
                  </div>
                )}

                {/* 5. Linear Stacked Progress Bar */}
                {healthChartType === 'linear' && (
                  <div className="w-72 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700">Project Distribution</span>
                      <span className="text-emerald-600 font-mono">83.3% Healthy</span>
                    </div>
                    <div className="h-6 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner border border-slate-200">
                      <div 
                        className="bg-[#6088F5] h-full transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                        style={{ width: '83.3%' }}
                        title="Healthy: 5 Projects (83.3%)"
                      >
                        5 Healthy
                      </div>
                      <div 
                        className="bg-[#F87171] h-full transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                        style={{ width: '16.7%' }}
                        title="At Risk: 1 Project (16.7%)"
                      >
                        1
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5 font-medium">
                      <span>5 Stable Projects</span>
                      <span>1 Delay Action</span>
                    </div>
                  </div>
                )}

                {/* 6. Speedometer Dial */}
                {healthChartType === 'speedometer' && (
                  <div className="relative w-64 h-36 flex flex-col items-center justify-end animate-in fade-in duration-200">
                    <svg viewBox="0 0 200 110" className="w-full h-full">
                      <path d="M 20 100 A 80 80 0 0 1 70 35" fill="none" stroke="#EF4444" strokeWidth="18" />
                      <path d="M 70 35 A 80 80 0 0 1 130 35" fill="none" stroke="#FBBF24" strokeWidth="18" />
                      <path d="M 130 35 A 80 80 0 0 1 180 100" fill="none" stroke="#10B981" strokeWidth="18" />
                      {/* Needle pointing to ~83.3% */}
                      <line 
                        x1="100" 
                        y1="100" 
                        x2="152" 
                        y2="46" 
                        stroke="#1E293B" 
                        strokeWidth="3.5" 
                        strokeLinecap="round" 
                      />
                      <circle cx="100" cy="100" r="7" fill="#0F172A" />
                    </svg>
                    <div className="text-center -mt-3">
                      <div className="text-sm font-black text-slate-900">83.3 / 100</div>
                      <div className="text-[10px] font-semibold text-emerald-600">Optimal Operating Health</div>
                    </div>
                  </div>
                )}

                {/* Right Legend (Matches user screenshot) */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-700">
                    <input type="checkbox" defaultChecked className="accent-blue-600 rounded" />
                    <span>Project Health</span>
                  </div>
                  <div className="flex items-center justify-between gap-6 pl-5 text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-[#6088F5]"></span>
                      <span>- (Healthy)</span>
                    </div>
                    <span className="font-bold font-mono">{kpiCounts.healthyCount}</span>
                  </div>
                  <div className="flex items-center justify-between gap-6 pl-5 text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-red-400"></span>
                      <span>At Risk</span>
                    </div>
                    <span className="font-bold font-mono text-red-500">{kpiCounts.atRiskCount}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mid-Row: Last 7 Days Attendance & Last 7 Days Material Received (Matches Image 2!) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left: Last 7 Days Attendance */}
              <div 
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 relative"
                onClick={() => setSelectedAttendanceBar(null)}
              >
                {/* Header: Clean title with Payroll and Workforce dropdowns and neatly aligned Reset button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-sm shrink-0 whitespace-nowrap">Last 7 Days Attendance</h3>
                  
                  {/* Dropdown Filters: Responsive, cleanly contained inside card */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="w-32">
                      <CustomSelect
                        value={payrollType}
                        onChange={(val) => setPayrollType(val)}
                        options={[
                          { label: 'All', value: 'All' },
                          { label: 'Office Staff', value: 'Office Staff' },
                          { label: 'Site Staff', value: 'Site Staff' },
                        ]}
                        prefix="Payroll: "
                        size="sm"
                        variant="brand"
                      />
                    </div>
                    <div className="w-36">
                      <CustomSelect
                        value={workforceName}
                        onChange={(val) => setWorkforceName(val)}
                        options={[
                          { label: 'All', value: 'All' },
                          { label: 'Accounts', value: 'Accounts' },
                          { label: 'Admin', value: 'Admin' },
                          { label: 'Business Dev', value: 'Business Development' },
                          { label: 'COO', value: 'Chief Operating Officer' },
                          { label: 'Collection Exec', value: 'Collection Executive' },
                          { label: 'Digital Mktg', value: 'Digital Marketing' },
                          { label: 'Director', value: 'Director' },
                          { label: 'Engineer', value: 'Engineer' },
                        ]}
                        prefix="Role: "
                        size="sm"
                        variant="brand"
                        searchable={true}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPayrollType('All');
                        setWorkforceName('All');
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 text-[11px] font-semibold rounded shadow-2xs cursor-pointer transition-colors shrink-0"
                      title="Reset filters"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Bar Chart Container */}
                <div className="space-y-2 pt-2 select-none">
                  <div className="flex items-stretch gap-2">
                    {/* Y-Axis Label & Grid Scale */}
                    <div className="flex items-center justify-center w-5">
                      <span className="text-[10px] font-medium text-slate-400 -rotate-90 whitespace-nowrap select-none">
                        No of Workers
                      </span>
                    </div>

                    {/* Chart Area */}
                    <div className="flex-1 relative">
                      {/* Y-Axis Gridlines */}
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] font-mono text-slate-400">
                        <div className="border-b border-dashed border-slate-200 w-full flex items-center justify-between">
                          <span className="-translate-y-2">{chartMaxWorkers > 15 ? 20 : chartMaxWorkers > 5 ? 10 : chartMaxWorkers > 0 ? chartMaxWorkers : 5}</span>
                        </div>
                        <div className="border-b border-dashed border-slate-100 w-full flex items-center justify-between">
                          <span className="-translate-y-2">{chartMaxWorkers > 15 ? 10 : chartMaxWorkers > 5 ? 5 : Math.max(1, Math.round(chartMaxWorkers / 2))}</span>
                        </div>
                        <div className="border-b border-slate-300 w-full flex items-center justify-between">
                          <span className="-translate-y-2">0</span>
                        </div>
                      </div>

                      {/* Bars */}
                      <div 
                        className="h-44 flex items-end justify-around gap-2 pb-1 relative z-10 pl-6 pr-2"
                        onMouseLeave={() => {
                          setHoveredAttendanceBar(null);
                        }}
                      >
                        {attendanceData.map((d) => {
                          const heightPercent = chartMaxWorkers > 0 ? Math.min(100, (d.count / chartMaxWorkers) * 100) : 0;
                          const isSelected = selectedAttendanceBar === d.date;
                          // White bubble ONLY shows on CLICK (when isSelected is true), NOT on hover!
                          const showBubble = isSelected;

                          return (
                            <div 
                              key={d.date} 
                              className="flex-1 flex flex-col items-center justify-end h-full relative group cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Clicking the bar selects/pins the bubble; DOES NOT open the page
                                setSelectedAttendanceBar(prev => prev === d.date ? null : d.date);
                              }}
                              onMouseEnter={(e) => {
                                setHoveredAttendanceBar({
                                  date: d.date,
                                  fullDate: d.fullDate,
                                  count: d.count,
                                  present: d.present,
                                  absent: d.absent,
                                  otHours: d.otHours,
                                  x: e.clientX,
                                  y: e.clientY,
                                });
                              }}
                              onMouseMove={(e) => {
                                setHoveredAttendanceBar(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : {
                                  date: d.date,
                                  fullDate: d.fullDate,
                                  count: d.count,
                                  present: d.present,
                                  absent: d.absent,
                                  otHours: d.otHours,
                                  x: e.clientX,
                                  y: e.clientY,
                                });
                              }}
                              onMouseLeave={() => {
                                setHoveredAttendanceBar(null);
                              }}
                            >
                              {/* "View Underlying Data" speech bubble: ONLY clicking this opens the underlying page */}
                              {showBubble && (
                                <div 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setHoveredAttendanceBar(null);
                                    setSelectedAttendanceBar(null);
                                    setSelectedModalDate(d.date);
                                    setModalPayrollFilter(payrollType);
                                    setModalWorkforceFilter(workforceName);
                                    setIsUnderlyingPageView(true); // ONLY opens when user clicks "View Underlying Data"
                                  }}
                                  className="absolute -top-11 z-30 pb-2 flex flex-col items-center cursor-pointer animate-in fade-in zoom-in-95 duration-100"
                                  title="Click to view underlying employee attendance data page"
                                >
                                  <div className="bg-white border-[1.5px] border-[#388E3C] hover:bg-[#388E3C] text-slate-800 hover:text-white px-2.5 py-1 rounded-md text-[11px] font-semibold shadow-md whitespace-nowrap transition-all flex items-center gap-1.5">
                                    <span>View Underlying Data</span>
                                  </div>
                                  {/* Pointer arrow pointing down to bar */}
                                  <div className="w-2.5 h-2.5 bg-white border-b-[1.5px] border-r-[1.5px] border-[#388E3C] rotate-45 -mt-1 shadow-2xs pointer-events-none"></div>
                                </div>
                              )}

                              {/* Workers count number */}
                              <span className="text-[10px] font-bold font-mono text-slate-600 group-hover:text-emerald-600 transition-colors mb-1">
                                {d.count.toFixed(2)}
                              </span>

                              {/* The Green Bar */}
                              <div 
                                className={`w-full max-w-[34px] rounded-t transition-all shadow-xs ${
                                  isSelected 
                                    ? 'bg-[#388E3C] ring-2 ring-emerald-400 ring-offset-1 scale-102' 
                                    : 'bg-[#4CAF50] hover:bg-[#43A047] group-hover:scale-105'
                                }`}
                                style={{ height: `${heightPercent}%` }}
                              ></div>

                              {/* X-axis Date label rotated -45 deg */}
                              <span className={`text-[9px] font-mono mt-2 truncate max-w-[44px] -rotate-45 origin-left transition-colors ${
                                isSelected ? 'text-emerald-700 font-bold' : 'text-slate-500 group-hover:text-slate-800'
                              }`}>
                                {d.date}..
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="text-center text-[10px] text-slate-400 font-semibold pt-4">
                    Attendance date
                  </div>
                </div>
              </div>

              {/* Right: Last 7 Days Material Received */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-sm">Last 7 Days Material Received</h3>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-32">
                      <CustomSelect
                        value={materialName}
                        onChange={(val) => setMaterialName(val)}
                        options={[
                          { label: 'All', value: 'All' },
                          { label: 'TMT Steel', value: 'Steel' },
                          { label: 'Cement', value: 'Cement' },
                          { label: 'RMC Concrete', value: 'RMC' },
                        ]}
                        prefix="Material: "
                        size="sm"
                        variant="brand"
                      />
                    </div>
                    <div className="w-32">
                      <CustomSelect
                        value={materialCategory}
                        onChange={(val) => setMaterialCategory(val)}
                        options={[
                          { label: 'All', value: 'All' },
                          { label: 'Civil', value: 'Civil' },
                          { label: 'Finishing', value: 'Finishing' },
                        ]}
                        prefix="Category: "
                        size="sm"
                        variant="brand"
                      />
                    </div>
                  </div>
                </div>

                {/* Display Body (Matches "No Data Available" from screenshot with toggle for verified deliveries) */}
                <div className="flex-1 flex flex-col items-center justify-center min-h-[190px]">
                  {!showMaterialData ? (
                    <div className="text-center space-y-2">
                      <div className="text-red-500 font-bold text-base">
                        No Data Available
                      </div>
                      <button 
                        onClick={() => setShowMaterialData(true)}
                        className="text-[11px] text-brand hover:underline font-semibold"
                      >
                        View Verified Gate Deliveries (3)
                      </button>
                    </div>
                  ) : (
                    <div className="w-full space-y-2">
                      <div className="flex items-center justify-between text-xs pb-1">
                        <span className="font-bold text-slate-700">Recent Gate GRN Receipts</span>
                        <button onClick={() => setShowMaterialData(false)} className="text-[10px] text-slate-400 hover:text-slate-600">Clear</button>
                      </div>
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg text-xs">
                        <div className="p-2 flex justify-between">
                          <span>16mm TMT Steel (Tata Tiscon)</span>
                          <span className="font-bold font-mono text-emerald-700">25.0 MT</span>
                        </div>
                        <div className="p-2 flex justify-between">
                          <span>Ready Mix Concrete M40</span>
                          <span className="font-bold font-mono text-emerald-700">100 CUM</span>
                        </div>
                        <div className="p-2 flex justify-between">
                          <span>PPC 53 Grade Cement</span>
                          <span className="font-bold font-mono text-emerald-700">140 Bags</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom: Project Operational Summary Dashboard Table (Matches Image 2) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">Project Operational Summary Dashboard</h3>
                <span className="text-xs text-slate-500">{filteredSummary.length} Projects Listed</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  {/* Red & Slate Table Header with Search/Filter row on TOP and Column Labels on SECOND row */}
                  <thead className="text-white font-semibold">
                    {/* Row 1: Search & Filter Controls Row */}
                    <tr className="bg-red-800 text-slate-800 border-b border-red-900">
                      <th className="py-2 px-3 text-center text-white/70 font-bold text-[10px]">
                        <Search className="w-3.5 h-3.5 mx-auto text-white/80" />
                      </th>
                      <th className="py-1.5 px-3">
                        <input
                          type="text"
                          placeholder="Search Project..."
                          value={searchName}
                          onChange={(e) => setSearchName(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-md bg-white text-slate-800 text-[11px] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-400 shadow-2xs font-normal"
                        />
                      </th>
                      <th className="py-1.5 px-3">
                        <input
                          type="text"
                          placeholder="Filter Category..."
                          value={searchCategory}
                          onChange={(e) => setSearchCategory(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-md bg-white text-slate-800 text-[11px] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-400 shadow-2xs font-normal"
                        />
                      </th>
                      <th className="py-1.5 px-3">
                        <input
                          type="text"
                          placeholder="Filter Personnel..."
                          value={searchPersonnel}
                          onChange={(e) => setSearchPersonnel(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-md bg-white text-slate-800 text-[11px] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-400 shadow-2xs font-normal"
                        />
                      </th>
                      <th className="py-1.5 px-3 min-w-[125px]">
                        <CustomSelect
                          value={searchStatus}
                          onChange={(val) => setSearchStatus(val)}
                          options={['All', 'Ongoing', 'Not Started', 'Onhold', 'Completed']}
                          triggerClassName="py-1 px-2.5 text-[11px] rounded-md shadow-2xs"
                        />
                      </th>
                      <th className="py-1.5 px-3 min-w-[110px]">
                        <CustomSelect
                          value={searchHealth}
                          onChange={(val) => setSearchHealth(val)}
                          options={['All', 'Normal', 'At Risk']}
                          triggerClassName="py-1 px-2.5 text-[11px] rounded-md shadow-2xs"
                        />
                      </th>
                      {/* Target Due Date Interactive Filter with Custom Calendar Card Input */}
                      <th className="py-1.5 px-3 min-w-[145px]">
                        <CustomDatePicker
                          value={searchDueDate}
                          onChange={(d) => setSearchDueDate(d)}
                          placeholder="Target Date"
                          align="right"
                          title="Click to filter projects by Target Due Date"
                          inputClassName="px-2 py-1 rounded-md text-[11px] shadow-2xs font-normal"
                        />
                      </th>
                    </tr>

                    {/* Row 2: Column Titles Row */}
                    <tr className="bg-red-700 text-white">
                      <th className="py-3 px-4 w-28 text-center whitespace-nowrap">Serial Number</th>
                      <th className="py-3 px-4">Project Name</th>
                      <th className="py-3 px-4">Project Category</th>
                      <th className="py-3 px-4">Key Personnel</th>
                      <th className="py-3 px-4">Project Status</th>
                      <th className="py-3 px-4">Project Health</th>
                      <th className="py-3 px-4 text-right whitespace-nowrap">Target Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
                    {filteredSummary.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-red-50/25 transition-colors">
                        <td className="py-3 px-4 text-center font-mono text-slate-500 font-bold">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                        <td className="py-3 px-4 text-slate-600">{p.category}</td>
                        <td className="py-3 px-4 text-slate-600">{p.personnel}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'Ongoing' ? 'bg-emerald-100 text-emerald-800' :
                            p.status === 'Not Started' ? 'bg-red-100 text-red-800' :
                            p.status === 'Onhold' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            p.health === 'At Risk' ? 'bg-red-100 text-red-800 animate-pulse' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {p.health}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600 font-semibold">{p.date}</td>
                      </tr>
                    ))}
                    {filteredSummary.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                          No projects found matching the selected filter criteria.
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
                      ...(projects || []).map(p => ({ label: formatProjectTitle(p), value: p.name || p.id }))
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

            {/* ROW 1: Sales, Expense & Margin (Matching Screenshot 1) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Sales Chart Card */}
              <div className="bg-white rounded-[5px] border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">Sales</h3>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-[5px] border border-emerald-100 uppercase tracking-wide">
                        {salesChartType === 'bar' ? 'Vertical Bar' :
                         salesChartType === 'area' ? 'Spline Area' :
                         salesChartType === 'line' ? 'Trend Line' : 'Horizontal Bar'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-900 relative">
                      {/* 1. Chart Model Switcher Button & Dropdown */}
                      <div className="relative" ref={salesChartMenuRef}>
                        <button
                          type="button"
                          onClick={() => {
                            setShowSalesChartDropdown(prev => !prev);
                            setShowSalesMoreMenu(false);
                          }}
                          className={`p-1.5 rounded-[5px] transition-colors cursor-pointer flex items-center gap-0.5 text-slate-900 hover:text-black hover:bg-slate-100 ${
                            showSalesChartDropdown ? 'bg-emerald-50 text-emerald-700 font-bold' : ''
                          }`}
                          title="Switch Sales Chart Model"
                          aria-label="Switch Sales Chart Model"
                        >
                          <BarChart2 className="w-4 h-4 text-slate-900" />
                          <ChevronDown className="w-3 h-3 text-slate-900" />
                        </button>

                        {showSalesChartDropdown && (
                          <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-[5px] shadow-2xl border border-slate-200 py-1.5 z-40 animate-in fade-in select-none">
                            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                              Select Chart Model
                            </div>
                            {[
                              { id: 'bar', label: 'Vertical Bar Chart', icon: '📊' },
                              { id: 'area', label: 'Spline Area Chart', icon: '📈' },
                              { id: 'line', label: 'Trend Line Chart', icon: '📉' },
                              { id: 'horizontal', label: 'Horizontal Bar Chart', icon: '📑' },
                            ].map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setSalesChartType(m.id as SalesChartModel);
                                  setShowSalesChartDropdown(false);
                                  showToast(`Sales chart updated to ${m.label}`);
                                }}
                                className={`w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer ${
                                  salesChartType === m.id ? 'font-bold text-emerald-700 bg-emerald-50/50' : 'text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span>{m.icon}</span>
                                  <span>{m.label}</span>
                                </div>
                                {salesChartType === m.id && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 2. More Options (Three Dots) Button & Dropdown */}
                      <div className="relative" ref={salesDotsMenuRef}>
                        <button
                          type="button"
                          onClick={() => {
                            setShowSalesMoreMenu(prev => !prev);
                            setShowSalesChartDropdown(false);
                          }}
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

                  {/* 1. Bar Chart View */}
                  {salesChartType === 'bar' && (
                    <div className="h-44 flex items-end justify-between gap-2 pt-6 pb-2 border-b border-slate-100">
                      {finMonthlyData.map((d) => {
                        const maxSales = 5.0;
                        const heightPercent = Math.min(100, Math.max(15, (d.sales / maxSales) * 100));
                        return (
                          <div key={d.month} className="flex-1 flex flex-col items-center gap-1 group">
                            <span className="text-[10px] font-bold text-emerald-700 opacity-90 group-hover:scale-110 transition-transform">
                              {d.sales.toFixed(2)}M
                            </span>
                            <div className="w-full max-w-[28px] h-32 bg-slate-50 flex items-end rounded-t-md overflow-hidden">
                              <div
                                className="w-full bg-gradient-to-t from-emerald-600 to-teal-500 rounded-t-md transition-all duration-500 group-hover:brightness-110 shadow-xs"
                                style={{ height: `${heightPercent}%` }}
                              />
                            </div>
                            <div className="flex flex-col items-center mt-2 select-none">
                              <span className="text-[10px] font-bold text-slate-700 leading-none">{d.month.split(' ')[0]}</span>
                              <span className="text-[8px] font-medium text-slate-400 leading-tight">{d.month.split(' ')[1]}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 2. Spline Area Chart View */}
                  {salesChartType === 'area' && (
                    <div className="h-44 pt-4 pb-2 border-b border-slate-100 flex flex-col justify-between">
                      <div className="h-32 w-full relative">
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 280 100" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#059669" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          <polygon
                            fill="url(#salesGrad)"
                            points="0,100 0,45 46,12 92,18 138,58 184,38 230,32 276,12 276,100"
                          />
                          <polyline
                            fill="none"
                            stroke="#059669"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points="0,45 46,12 92,18 138,58 184,38 230,32 276,12"
                          />
                          {[
                            { x: 0, y: 45, val: 2.75 },
                            { x: 46, y: 12, val: 4.37 },
                            { x: 92, y: 18, val: 4.12 },
                            { x: 138, y: 58, val: 2.12 },
                            { x: 184, y: 38, val: 3.11 },
                            { x: 230, y: 32, val: 3.39 },
                            { x: 276, y: 12, val: 4.38 },
                          ].map((pt, idx) => (
                            <circle key={idx} cx={pt.x} cy={pt.y} r="4" fill="#ffffff" stroke="#059669" strokeWidth="2.5" />
                          ))}
                        </svg>
                      </div>
                      <div className="flex items-center justify-between text-center select-none pt-1">
                        {finMonthlyData.map((d) => (
                          <div key={d.month} className="flex-1 flex flex-col items-center">
                            <span className="text-[10px] font-bold text-slate-700 leading-none">{d.month.split(' ')[0]}</span>
                            <span className="text-[8px] font-medium text-slate-400 leading-tight">{d.month.split(' ')[1]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Trend Line Chart View */}
                  {salesChartType === 'line' && (
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
                            points="0,45 46,12 92,18 138,58 184,38 230,32 276,12"
                          />
                          {[
                            { x: 0, y: 45, val: 2.75 },
                            { x: 46, y: 12, val: 4.37 },
                            { x: 92, y: 18, val: 4.12 },
                            { x: 138, y: 58, val: 2.12 },
                            { x: 184, y: 38, val: 3.11 },
                            { x: 230, y: 32, val: 3.39 },
                            { x: 276, y: 12, val: 4.38 },
                          ].map((pt, idx) => (
                            <g key={idx}>
                              <circle cx={pt.x} cy={pt.y} r="4" fill="#059669" stroke="#ffffff" strokeWidth="1.5" />
                              <text x={pt.x} y={pt.y - 8} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#047857">
                                {pt.val}M
                              </text>
                            </g>
                          ))}
                        </svg>
                      </div>
                      <div className="flex items-center justify-between text-center select-none pt-1">
                        {finMonthlyData.map((d) => (
                          <div key={d.month} className="flex-1 flex flex-col items-center">
                            <span className="text-[10px] font-bold text-slate-700 leading-none">{d.month.split(' ')[0]}</span>
                            <span className="text-[8px] font-medium text-slate-400 leading-tight">{d.month.split(' ')[1]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. Horizontal Bar Chart View */}
                  {salesChartType === 'horizontal' && (
                    <div className="h-44 overflow-y-auto space-y-1.5 pr-1 pt-1 border-b border-slate-100">
                      {finMonthlyData.map((d) => {
                        const maxSales = 5.0;
                        const widthPct = Math.min(100, Math.max(10, (d.sales / maxSales) * 100));
                        return (
                          <div key={d.month} className="flex items-center gap-2 text-xs">
                            <span className="w-12 text-[10px] font-bold text-slate-600 truncate">{d.month.split(' ')[0]}</span>
                            <div className="flex-1 h-3.5 bg-slate-100 rounded-[3px] overflow-hidden flex items-center">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-[3px] transition-all"
                                style={{ width: `${widthPct}%` }}
                              />
                            </div>
                            <span className="w-10 text-[10px] font-bold text-emerald-700 text-right font-mono">
                              {d.sales.toFixed(2)}M
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Total Sales Banner Card */}
                <div className="mt-5 p-3 bg-emerald-50/80 rounded-[5px] border border-emerald-200/70 text-center">
                  <div className="text-[11px] font-bold text-emerald-800">Total Sales</div>
                  <div className="text-2xl font-black text-emerald-600 tracking-tight mt-0.5">
                    {(finMonthlyData.reduce((s, d) => s + d.sales, 0)).toFixed(2)}M
                  </div>
                </div>
              </div>

              {/* Expense Chart Card */}
              <div className="bg-white rounded-[5px] border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-900">Expense</h3>
                  </div>

                  {/* SVG Bar Chart */}
                  <div className="h-44 flex items-end justify-between gap-2 pt-6 pb-2 border-b border-slate-100">
                    {finMonthlyData.map((d) => {
                      const maxExp = 5.0;
                      const heightPercent = Math.min(100, Math.max(15, (d.expense / maxExp) * 100));
                      return (
                        <div key={d.month} className="flex-1 flex flex-col items-center gap-1 group">
                          <span className="text-[10px] font-bold text-rose-600 opacity-90 group-hover:scale-110 transition-transform">
                            {d.expense.toFixed(2)}M
                          </span>
                          <div className="w-full max-w-[28px] h-32 bg-slate-50 flex items-end rounded-t-md overflow-hidden">
                            <div
                              className="w-full bg-gradient-to-t from-rose-500 to-pink-500 rounded-t-md transition-all duration-500 group-hover:brightness-110 shadow-xs"
                              style={{ height: `${heightPercent}%` }}
                            />
                          </div>
                          <div className="flex flex-col items-center mt-2 select-none">
                            <span className="text-[10px] font-bold text-slate-700 leading-none">{d.month.split(' ')[0]}</span>
                            <span className="text-[8px] font-medium text-slate-400 leading-tight">{d.month.split(' ')[1]}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Total Expense Banner Card */}
                <div className="mt-7 p-3 bg-rose-50/80 rounded-[5px] border border-rose-200/70 text-center">
                  <div className="text-[11px] font-bold text-rose-800">Total Expense</div>
                  <div className="text-2xl font-black text-rose-600 tracking-tight mt-0.5">
                    {(finMonthlyData.reduce((s, d) => s + d.expense, 0)).toFixed(2)}M
                  </div>
                </div>
              </div>

              {/* Margin Chart Card */}
              <div className="bg-white rounded-[5px] border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-900">Margin</h3>
                  </div>

                  {/* Bi-directional Bar Chart with 0 baseline */}
                  <div className="h-44 flex flex-col justify-between pt-3 pb-2 border-b border-slate-100">
                    {/* Plot area with zero center line */}
                    <div className="relative h-32 flex items-center justify-between gap-2">
                      <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-300 border-t border-dashed border-slate-400 pointer-events-none z-0" />
                      {finMonthlyData.map((d) => {
                        const isNeg = d.margin < 0;
                        const absMargin = Math.abs(d.margin);
                        const barHeightPx = Math.min(42, Math.max(8, (absMargin / 2.0) * 42));
                        return (
                          <div key={d.month} className="flex-1 flex flex-col h-full items-center justify-center relative group z-10">
                            {/* Top Half: Positive Margin Bar & Label */}
                            <div className="w-full max-w-[24px] h-1/2 flex flex-col justify-end items-center">
                              {!isNeg && (
                                <>
                                  <span className="text-[9px] font-bold text-emerald-700 mb-0.5 leading-none shrink-0 group-hover:scale-110 transition-transform">
                                    {d.margin.toFixed(2)}M
                                  </span>
                                  <div
                                    className="w-full bg-gradient-to-t from-emerald-600 to-teal-500 rounded-t-sm shadow-xs transition-all duration-300"
                                    style={{ height: `${barHeightPx}px` }}
                                  />
                                </>
                              )}
                            </div>

                            {/* Bottom Half: Negative Margin Bar & Label */}
                            <div className="w-full max-w-[24px] h-1/2 flex flex-col justify-start items-center">
                              {isNeg && (
                                <>
                                  <div
                                    className="w-full bg-gradient-to-b from-rose-500 to-pink-600 rounded-b-sm shadow-xs transition-all duration-300"
                                    style={{ height: `${barHeightPx}px` }}
                                  />
                                  <span className="text-[9px] font-bold text-rose-600 mt-1 leading-none shrink-0 group-hover:scale-110 transition-transform">
                                    {d.margin.toFixed(2)}M
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Month Labels Row (Completely separated from the plot area to prevent overlap) */}
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
                <div className="mt-7 p-3 bg-slate-50 rounded-[5px] border border-slate-200 text-center">
                  <div className="text-[11px] font-bold text-slate-600">Total Margin</div>
                  <div className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                    {(finMonthlyData.reduce((s, d) => s + d.margin, 0)).toFixed(2)}M
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
                      const maxPay = 8.5;
                      const inHeight = Math.min(100, Math.max(12, (d.payIn / maxPay) * 100));
                      const outHeight = Math.min(100, Math.max(12, (d.payOut / maxPay) * 100));
                      return (
                        <div key={d.month} className="flex-1 flex flex-col items-center group">
                          {/* Dual bar container with concrete height */}
                          <div className="w-full h-32 flex items-end justify-center gap-1.5 bg-slate-50/60 rounded-t-[3px] px-1">
                            {showPaymentIn && (
                              <div className="flex-1 max-w-[14px] h-full flex flex-col justify-end items-center group/in">
                                <span className="text-[8px] font-bold text-emerald-700 mb-1 opacity-90 group-hover/in:scale-110 transition-transform">
                                  {d.payIn.toFixed(1)}M
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
                                  {d.payOut.toFixed(1)}M
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
                      {/* Subcon 43.2% */}
                      {showSubconExp && (
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#3B82F6" strokeWidth="6"
                          strokeDasharray="38 100" strokeDashoffset="0" className="transition-all hover:stroke-[7]" />
                      )}
                      {/* Other Exp 40.7% */}
                      {showOtherExp && (
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#14B8A6" strokeWidth="6"
                          strokeDasharray="36 100" strokeDashoffset="-38" className="transition-all hover:stroke-[7]" />
                      )}
                      {/* Salary 15.9% */}
                      {showSalaryExp && (
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#F43F5E" strokeWidth="6"
                          strokeDasharray="14 100" strokeDashoffset="-74" className="transition-all hover:stroke-[7]" />
                      )}
                      {/* Site Exp 0.2% */}
                      {showSiteExp && (
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#F59E0B" strokeWidth="6"
                          strokeDasharray="2 100" strokeDashoffset="-88" className="transition-all hover:stroke-[7]" />
                      )}
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">Total</span>
                      <span className="text-base font-black text-slate-900 leading-none mt-0.5">21.38M</span>
                    </div>
                  </div>

                  {/* Legend breakdown list matching Screenshot 2 */}
                  <div className="flex-1 space-y-2 text-xs w-full">
                    <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={showSubconExp} onChange={(e) => setShowSubconExp(e.target.checked)} className="rounded text-blue-600" />
                        <span className="w-2.5 h-2.5 rounded-sm bg-blue-500"></span>
                        <span className="font-semibold text-slate-700">Subcon Expense</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900">9,246,100.00</span>
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={showOtherExp} onChange={(e) => setShowOtherExp(e.target.checked)} className="rounded text-teal-600" />
                        <span className="w-2.5 h-2.5 rounded-sm bg-teal-500"></span>
                        <span className="font-semibold text-slate-700">Other Expense</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900">8,704,027.27</span>
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={showSalaryExp} onChange={(e) => setShowSalaryExp(e.target.checked)} className="rounded text-rose-600" />
                        <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
                        <span className="font-semibold text-slate-700">Salary Expense</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900">3,389,126.53</span>
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={showSiteExp} onChange={(e) => setShowSiteExp(e.target.checked)} className="rounded text-amber-600" />
                        <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span>
                        <span className="font-semibold text-slate-700">Site Expense</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900">38,052.00</span>
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
                    {showToPay && (
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#3B82F6" strokeWidth="5.5"
                        strokeDasharray="50 100" strokeDashoffset="0" />
                    )}
                    {showToReceive && (
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#2DD4BF" strokeWidth="5.5"
                        strokeDasharray="20 100" strokeDashoffset="-50" />
                    )}
                    {showAdvancePaid && (
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#FB7185" strokeWidth="5.5"
                        strokeDasharray="18 100" strokeDashoffset="-70" />
                    )}
                    {showAdvanceReceived && (
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#FBBF24" strokeWidth="5.5"
                        strokeDasharray="4 100" strokeDashoffset="-88" />
                    )}
                  </svg>
                </div>

                {/* Legend Checklist with exact numbers from Screenshot 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 flex-1 text-xs w-full">
                  <div className="p-3 rounded-xl border border-slate-150 bg-slate-50/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      <span className="font-semibold text-slate-700">To Pay</span>
                    </div>
                    <span className="font-mono font-bold text-blue-600">12.61M</span>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-150 bg-slate-50/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-400"></span>
                      <span className="font-semibold text-slate-700">To Receive</span>
                    </div>
                    <span className="font-mono font-bold text-teal-600">4.24M</span>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-150 bg-slate-50/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                      <span className="font-semibold text-slate-700">Advance Paid</span>
                    </div>
                    <span className="font-mono font-bold text-rose-600">3.73M</span>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-150 bg-slate-50/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                      <span className="font-semibold text-slate-700">Advance Received</span>
                    </div>
                    <span className="font-mono font-bold text-amber-600">351.60K</span>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-150 bg-slate-50/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                      <span className="font-semibold text-slate-700">Settled</span>
                    </div>
                    <span className="font-mono font-bold text-slate-500">0.00</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 3: 4 Financial KPI Cards (Matching Screenshot 3) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 shadow-xs text-center">
                <div className="text-xs font-bold text-emerald-800">Advance Paid</div>
                <div className="text-2xl font-black text-emerald-600 mt-1 tracking-tight">3,728,327.38</div>
              </div>

              <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/50 shadow-xs text-center">
                <div className="text-xs font-bold text-rose-800">To Pay</div>
                <div className="text-2xl font-black text-rose-600 mt-1 tracking-tight">12,605,555.50</div>
              </div>

              <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/50 shadow-xs text-center">
                <div className="text-xs font-bold text-rose-800">To Receive</div>
                <div className="text-2xl font-black text-rose-600 mt-1 tracking-tight">4,241,112.00</div>
              </div>

              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 shadow-xs text-center">
                <div className="text-xs font-bold text-emerald-800">Advance Received</div>
                <div className="text-2xl font-black text-emerald-600 mt-1 tracking-tight">351,604.00</div>
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
                    onClick={toggleFullscreen}
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                    className="p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-4 h-4 text-brand" />
                    ) : (
                      <Maximize2 className="w-4 h-4 text-slate-400 hover:text-slate-700" />
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
                      <th className="py-1 px-2 text-right text-red-200 font-mono text-[10px]">
                        Remaining
                      </th>
                      <th className="py-1 px-2 text-right text-red-200 font-mono text-[10px]">
                        Sales
                      </th>
                      <th className="py-1 px-2 text-right text-red-200 font-mono text-[10px]">
                        Margin
                      </th>
                      <th className="py-1 px-2 text-right text-red-200 font-mono text-[10px]">
                        Inflow
                      </th>
                      <th className="py-1 px-2 text-right text-red-200 font-mono text-[10px]">
                        Outflow
                      </th>
                      <th className="py-1 px-2 text-right text-red-200 font-mono text-[10px]">
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
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                          
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
                          <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                            {r.budget.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          
                          {/* 6. Total Expense */}
                          <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-semibold">
                            {r.expense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          
                          {/* 7. Budget Remaining */}
                          <td className={`py-2.5 px-3 text-right font-mono font-semibold ${budgetRem < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {budgetRem.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          
                          {/* 8. Total Sales */}
                          <td className="py-2.5 px-3 text-right font-mono text-slate-900 font-semibold">
                            {r.sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          
                          {/* 9. Project Margin */}
                          <td className={`py-2.5 px-3 text-right font-mono font-bold ${margin < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {margin.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          
                          {/* 10. Payment In */}
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-600 font-semibold">
                            {r.paymentIn.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          
                          {/* 11. Payment Out */}
                          <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-semibold">
                            {r.paymentOut.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          
                          {/* 12. Cash Balance */}
                          <td className={`py-2.5 px-3 text-right font-mono font-black ${cashBal < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
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
                      <td className="py-3 px-3 text-right font-mono text-slate-900">
                        {filteredFinRows.reduce((a, b) => a + b.budget, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-rose-600">
                        {filteredFinRows.reduce((a, b) => a + b.expense, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-600">
                        {filteredFinRows.reduce((a, b) => a + (b.budget > 0 ? b.budget - b.expense : 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-900">
                        {filteredFinRows.reduce((a, b) => a + b.sales, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-600">
                        {filteredFinRows.reduce((a, b) => a + (b.sales - b.expense), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-600">
                        {filteredFinRows.reduce((a, b) => a + b.paymentIn, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-rose-600">
                        {filteredFinRows.reduce((a, b) => a + b.paymentOut, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-700">
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
                              <td className="py-2 px-3 text-right font-mono">{r.budget.toLocaleString()}</td>
                              <td className="py-2 px-3 text-right font-mono">{r.expense.toLocaleString()}</td>
                              <td className="py-2 px-3 text-right font-mono text-emerald-600 font-bold">{r.sales.toLocaleString()}</td>
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
                <span className="text-sm font-bold font-mono text-emerald-400">
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
