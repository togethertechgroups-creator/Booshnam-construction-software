import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, User, MapPin, CheckCircle2, AlertTriangle, Shield,
  Clock, DollarSign, Plus, Check, Search, Calendar,
  UserPlus, Mail, Phone, Briefcase, Filter, X, Lock,
  Trash2, ArrowRight, ArrowLeft, ShieldCheck, Sparkles, Building2, Info,
  Camera, Eye, HardHat, Smartphone,
  Maximize2, Minimize2, Layers,
  ChevronLeft, ChevronRight, ChevronDown
} from 'lucide-react';
import { Project, Worker, AttendanceRecord } from '../types';
import { UserProfileDropdown } from '../components/UserProfileDropdown';
import { toggleBrowserFullscreen, addFullscreenChangeListener } from '../lib/fullscreenService';
import { Loader } from '../components/kokonutui/loader';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { CustomSelect } from '../components/CustomSelect';
import { DepartmentMultiSelectFilter } from '../components/DepartmentMultiSelectFilter';
import {
  getStaffMembers,
  saveStaffMember,
  deleteStaffMember,
  StaffMember,
  getStaffAllocatedProjects,
  toggleStaffProjectAllocation,
  getStaffCategory,
  isStaffInDepartment,
  getStaffDepartmentNames
} from '../lib/staffService';
import {
  getActiveDepartment,
  normalizeDepartmentId,
  getIndividualDepartments,
  DepartmentEntity,
  isUserCompanyWideSuperAdmin,
  getUserAllowedDepartmentIds
} from '../lib/departmentService';
import { confirmAction, setFormDirty, clearFormDirty } from '../lib/dialogService';
import { MOCK_ROLES } from '../lib/mockData';
import { StaffOverviewView } from '../components/StaffOverviewView';
import { getStoredRolePermissions, ALL_SYSTEM_MODULES } from '../lib/roleAccess';
import { saveUserAccount, UserAccount, getCurrentUserAccount } from '../lib/authService';
import { LivePhotoViewModal } from '../components/LivePhotoViewModal';
import {
  getAllStaffAttendanceRecords,
  getStaffLatestRecordToday,
  updateStaffAttendanceStatus,
  StaffAttendanceRecord,
  getTodayDateString
} from '../lib/staffAttendanceService';
import { HolidaysManager } from '../components/HolidaysManager';


interface WorkforceViewProps {
  project: Project | null;
  workers: Worker[];
  attendance: AttendanceRecord[];
  canViewCost: boolean;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  initialTab?: 'staff' | 'payroll';
  onNavigate?: (view: string) => void;
  onShowToast?: (msg: string) => void;
}

export const WorkforceView: React.FC<WorkforceViewProps> = ({
  project,
  workers,
  attendance,
  canViewCost,
  isSidebarOpen,
  onToggleSidebar,
  initialTab = 'payroll',
  onNavigate,
  onShowToast
}) => {
  type TopNavTab = 'people' | 'attendance' | 'team_leaves' | 'my_leaves' | 'holidays';
  const [activeTab, setActiveTab] = useState<TopNavTab>(() => {
    if (initialTab === 'staff') return 'people';
    return 'attendance';
  });

  const setMainTab = (t: 'staff' | 'payroll') => {
    setActiveTab(t === 'staff' ? 'people' : 'attendance');
  };
  const setPayrollTab = (t: 'attendance' | 'team_leaves' | 'my_leaves' | 'holidays') => {
    setActiveTab(t);
  };
  const mainTab = activeTab === 'people' ? 'staff' : 'payroll';
  const payrollTab = activeTab === 'people' ? 'attendance' : activeTab;

  useEffect(() => {
    if (initialTab) {
      if (initialTab === 'staff') {
        setActiveTab('people');
        setSelectedStaffForOverview(null);
      } else {
        setActiveTab('attendance');
        const list = getStaffMembers();
        const chithra = list.find(s => s.name.toLowerCase().includes('chithra')) || list[0] || null;
        setSelectedStaffForOverview(chithra);
      }
    }
  }, [initialTab]);

  useEffect(() => {
    const handleOpenPayroll = () => {
      setActiveTab('attendance');
      const list = getStaffMembers();
      const chithra = list.find(s => s.name.toLowerCase().includes('chithra')) || list[0] || null;
      setSelectedStaffForOverview(chithra);
    };
    if (sessionStorage.getItem('booshnam_auto_open_payroll')) {
      sessionStorage.removeItem('booshnam_auto_open_payroll');
      handleOpenPayroll();
    }
    window.addEventListener('booshnam_open_payroll', handleOpenPayroll);
    return () => window.removeEventListener('booshnam_open_payroll', handleOpenPayroll);
  }, []);

  const [staffList, setStaffList] = useState<StaffMember[]>(() => getStaffMembers());
  const [searchStaffQuery, setSearchStaffQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [selectedStaffForOverview, setSelectedStaffForOverview] = useState<StaffMember | null>(() => {
    const list = getStaffMembers();
    const chithra = list.find(s => s.name.toLowerCase().includes('chithra')) || list[0] || null;
    return initialTab === 'staff' ? null : chithra;
  });
  const [overviewInitialTab, setOverviewInitialTab] = useState<'people' | 'attendance' | 'details' | 'access' | 'leave_dashboard' | 'team_leaves' | 'my_leaves' | 'holidays'>('attendance');
  const [selectedStaffForProjectModal, setSelectedStaffForProjectModal] = useState<StaffMember | null>(null);

  // Live Photo Verification Proof Modal State
  const [viewPhotoRecord, setViewPhotoRecord] = useState<StaffAttendanceRecord | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<StaffAttendanceRecord[]>(() => getAllStaffAttendanceRecords());

  // Listen to live staff attendance updates across modals / mobile simulator
  useEffect(() => {
    const handleAttendanceUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setAttendanceRecords(e.detail);
      } else {
        setAttendanceRecords(getAllStaffAttendanceRecords());
      }
    };
    window.addEventListener('booshnam_staff_attendance_updated', handleAttendanceUpdate);
    return () => window.removeEventListener('booshnam_staff_attendance_updated', handleAttendanceUpdate);
  }, []);

  // Attendance status per staff member & date
  type AttendanceStatus = 'Present' | 'Absent' | 'Weekoff' | 'Paid Leave' | 'Late' | 'Half-day' | 'Overtime' | 'On Duty' | 'Not Marked';
  const [staffAttendanceStatus, setStaffAttendanceStatus] = useState<Record<string, AttendanceStatus>>({});
  const [openAttendanceDropdown, setOpenAttendanceDropdown] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);

  // New Attendance UI state variables
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState<Date>(() => new Date());
  const [staffTypeFilter, setStaffTypeFilter] = useState<'OFFICE' | 'SITE'>('OFFICE');
  const [staffStatusFilter, setStaffStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [isStaffStatusDropdownOpen, setIsStaffStatusDropdownOpen] = useState(false);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [openRowDropdownId, setOpenRowDropdownId] = useState<string | null>(null);
  const [payrollSearchQuery, setPayrollSearchQuery] = useState('');

  const formattedDateStr = useMemo(() => {
    const y = selectedAttendanceDate.getFullYear();
    const m = String(selectedAttendanceDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedAttendanceDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [selectedAttendanceDate]);

  const handlePrevDay = () => {
    setSelectedAttendanceDate(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 1);
      return next;
    });
  };

  const handleNextDay = () => {
    setSelectedAttendanceDate(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 1);
      return next;
    });
  };

  const getStaffInitials = (name: string): string => {
    if (!name) return 'S';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  const ATTENDANCE_SELECT_OPTIONS: {
    status: 'Present' | 'Absent' | 'Weekoff' | 'Paid Leave';
    label: string;
    hover: string;
    activeClass: string;
  }[] = [
    {
      status: 'Present',
      label: 'Present',
      hover: 'hover:bg-emerald-50 hover:text-emerald-700',
      activeClass: 'bg-emerald-50 text-emerald-700 font-bold',
    },
    {
      status: 'Absent',
      label: 'Absent',
      hover: 'hover:bg-red-50 hover:text-red-700',
      activeClass: 'bg-red-50 text-red-700 font-bold',
    },
    {
      status: 'Weekoff',
      label: 'Weekoff',
      hover: 'hover:bg-slate-100 hover:text-slate-900',
      activeClass: 'bg-slate-100 text-slate-900 font-bold',
    },
    {
      status: 'Paid Leave',
      label: 'Paid Leave',
      hover: 'hover:bg-purple-50 hover:text-purple-700',
      activeClass: 'bg-purple-50 text-purple-700 font-bold',
    },
  ];

  const getStatusButtonConfig = (st: AttendanceStatus) => {
    switch (st) {
      case 'Present':
        return {
          btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs font-semibold',
          chevronClass: 'text-white',
          rowBorder: 'border-l-4 border-l-emerald-500 bg-emerald-50/15',
        };
      case 'Absent':
        return {
          btnClass: 'bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-xs font-semibold',
          chevronClass: 'text-white',
          rowBorder: 'border-l-4 border-l-red-500 bg-red-50/15',
        };
      case 'Weekoff':
        return {
          btnClass: 'bg-[#1e1b4b] hover:bg-slate-900 text-white border-[#1e1b4b] shadow-xs font-semibold',
          chevronClass: 'text-white',
          rowBorder: 'border-l-4 border-l-[#1e1b4b] bg-slate-50/20',
        };
      case 'Paid Leave':
        return {
          btnClass: 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600 shadow-xs font-semibold',
          chevronClass: 'text-white',
          rowBorder: 'border-l-4 border-l-purple-500 bg-purple-50/15',
        };
      default:
        return {
          btnClass: 'bg-white hover:border-slate-300 text-slate-700 border-slate-200 shadow-2xs font-medium',
          chevronClass: 'text-slate-400',
          rowBorder: 'border-l-4 border-l-transparent hover:bg-red-50/20',
        };
    }
  };

  const getStatusDotColor = (st: string) => {
    switch (st) {
      case 'Present': return 'bg-emerald-500';
      case 'Absent': return 'bg-red-500';
      case 'Paid Leave': return 'bg-purple-500';
      case 'Weekoff': return 'bg-[#1e1b4b]';
      case 'Half-day': return 'bg-amber-500';
      case 'Overtime': return 'bg-purple-500';
      case 'On Duty': return 'bg-blue-500';
      default: return 'bg-slate-300';
    }
  };

  const getAttendanceStatusForDate = (staffId: string): AttendanceStatus => {
    const key = `${staffId}_${formattedDateStr}`;
    if (staffAttendanceStatus[key]) return staffAttendanceStatus[key];
    const rec = attendanceRecords.find(r => r.staff_id === staffId && r.date === formattedDateStr);
    if (rec && rec.status) return rec.status as AttendanceStatus;
    return 'Not Marked';
  };

  const handleSetStatus = (staffId: string, status: AttendanceStatus) => {
    const key = `${staffId}_${formattedDateStr}`;
    setStaffAttendanceStatus(prev => ({ ...prev, [key]: status }));
    updateStaffAttendanceStatus(staffId, status as any, formattedDateStr);
    setOpenRowDropdownId(null);
    triggerToast(`Attendance marked as ${status}`);
  };

  const getAttendanceStatus = (staffId: string): AttendanceStatus => {
    return getAttendanceStatusForDate(staffId);
  };

  const setAttendanceStatus = (staffId: string, status: AttendanceStatus) => {
    handleSetStatus(staffId, status);
    setOpenAttendanceDropdown(null);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = () => {
      setOpenAttendanceDropdown(null);
      setDropdownPos(null);
      setOpenRowDropdownId(null);
      setIsStaffStatusDropdownOpen(false);
      setShowCalendarPicker(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleToggleAttendanceDropdown = (staffId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (openAttendanceDropdown === staffId) {
      setOpenAttendanceDropdown(null);
      setDropdownPos(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
      setOpenAttendanceDropdown(staffId);
    }
  };

  const attendanceOptions: { label: AttendanceStatus; color: string; bg: string; border: string }[] = [
    { label: 'Not Marked', color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200' },
    { label: 'Present', color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-200' },
    { label: 'Absent', color: 'text-red-700', bg: 'bg-red-100', border: 'border-red-200' },
    { label: 'Paid Leave', color: 'text-teal-700', bg: 'bg-teal-100', border: 'border-teal-200' },
    { label: 'Weekoff', color: 'text-indigo-700', bg: 'bg-indigo-100', border: 'border-indigo-200' },
    { label: 'Half-day', color: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-200' },
    { label: 'Overtime', color: 'text-purple-700', bg: 'bg-purple-100', border: 'border-purple-200' },
    { label: 'On Duty', color: 'text-cyan-700', bg: 'bg-cyan-100', border: 'border-cyan-200' },
  ];

  const allProjectsList = useMemo(() => {
    try {
      const raw = localStorage.getItem('booshnam_projects_v2');
      if (raw) {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) {
          return p.filter((x: any) =>
            !x.id?.startsWith('proj-') &&
            !['Prestige Boulevard', 'Royal Palm', 'Green Valley', 'Sunrise Industrial', 'Urban Metro', 'Skyline Contemporary', 'Heritage Courtyard', 'Highway Overpass', 'Government Medical College', 'High-Rise Commercial', 'Coastal Highway'].some(t => (x.name || x.title || x.client_name || '').includes(t))
          );
        }
      }
    } catch (e) { }
    return [];
  }, [staffList]);

  const handleOpenStaffOverview = (
    staff: StaffMember,
    defaultTab: 'people' | 'details' | 'access' | 'leave_dashboard' | 'team_leaves' | 'my_leaves' | 'holidays' = 'people'
  ) => {
    setSelectedStaffForOverview(staff);
    setOverviewInitialTab(defaultTab);
  };

  // Active Department Management
  const [activeDept, setActiveDept] = useState<DepartmentEntity>(() => getActiveDepartment());
  useEffect(() => {
    const syncDept = () => setActiveDept(getActiveDepartment());
    window.addEventListener('booshnam_active_dept_changed', syncDept);
    window.addEventListener('storage', syncDept);
    return () => {
      window.removeEventListener('booshnam_active_dept_changed', syncDept);
      window.removeEventListener('storage', syncDept);
    };
  }, []);

  const isOverview = activeDept.isMainOverview || activeDept.id === 'booshnam_associates';

  // Multi-department filter for company-wide overview (Booshnam Associates Super Admin)
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>(['ALL']);

  useEffect(() => {
    setSelectedDepartmentIds(['ALL']);
  }, [activeDept.id]);

  const departmentFilterItems = useMemo(() => {
    const activeAccount = getCurrentUserAccount();
    const isSuperAdmin = isUserCompanyWideSuperAdmin(activeAccount);
    const allowedDepts = getUserAllowedDepartmentIds(activeAccount);

    let depts = getIndividualDepartments();
    if (!isSuperAdmin && allowedDepts && allowedDepts.length > 0) {
      depts = depts.filter(d => allowedDepts.includes(d.id));
    }
    return depts.map(d => ({
      id: d.id,
      name: d.name,
      shortName: d.shortName,
      count: staffList.filter(s => isStaffInDepartment(s, d.id)).length
    }));
  }, [staffList]);

  // Filtered by department: If overview (Booshnam Associates), show all or multi-filter by selectedDepartmentIds. Otherwise filter strictly to active department.
  const departmentStaffList = useMemo(() => {
    const activeAccount = getCurrentUserAccount();
    const isSuperAdmin = isUserCompanyWideSuperAdmin(activeAccount);
    const allowedDepts = getUserAllowedDepartmentIds(activeAccount);

    let baseList = staffList;
    if (!isSuperAdmin && allowedDepts && allowedDepts.length > 0) {
      baseList = staffList.filter(s => allowedDepts.some(dId => isStaffInDepartment(s, dId)));
    }

    if (!isOverview) {
      const normActive = normalizeDepartmentId(activeDept.id);
      return baseList.filter(s => isStaffInDepartment(s, normActive));
    }
    if (selectedDepartmentIds.includes('ALL') || selectedDepartmentIds.length === 0) {
      return baseList;
    }
    const normSelected = new Set(selectedDepartmentIds.map(id => normalizeDepartmentId(id)));
    return baseList.filter(s => {
      const sDepts = getStaffDepartmentNames(s);
      return sDepts.some(d => normSelected.has(normalizeDepartmentId(d)));
    });
  }, [staffList, isOverview, activeDept.id, selectedDepartmentIds]);

  // Office Staff vs Site Staff filter
  const [staffCategoryFilter, setStaffCategoryFilter] = useState<'ALL' | 'OFFICE' | 'SITE'>('ALL');
  const [attendanceActiveFilter, setAttendanceActiveFilter] = useState<'active' | 'all'>('active');
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState('');

  // New Staff Form State
  const [newStaffForm, setNewStaffForm] = useState<{
    name: string;
    role_code: string;
    department: string;
    departments: string[];
    designation: string;
    dob: string;
    doj: string;
    phone: string;
    email: string;
    employment_type: 'Full-time' | 'Contract' | 'Part-time';
    salary: number;
    salary_type: 'Month' | 'Day';
    staff_type: 'OFFICE' | 'SITE';
  }>({
    name: '',
    role_code: 'SITE_ENGINEER',
    department: 'Soil Investigation (Chennai)',
    departments: ['Soil Investigation (Chennai)'],
    designation: 'Site Engineer',
    dob: '1995-05-15',
    doj: new Date().toISOString().split('T')[0],
    phone: '',
    email: '',
    employment_type: 'Full-time',
    salary: 45000,
    salary_type: 'Month',
    staff_type: 'SITE'
  });

  const handleOpenAddStaffModal = (defaultType?: 'OFFICE' | 'SITE') => {
    const chosenType = defaultType || (staffCategoryFilter === 'OFFICE' ? 'OFFICE' : 'SITE');
    const defaultDeptName = !isOverview 
      ? activeDept.name 
      : (getIndividualDepartments()[0]?.name || 'Soil Investigation (Chennai)');

    setNewStaffForm({
      name: '',
      role_code: chosenType === 'SITE' ? 'SITE_ENGINEER' : 'ADMIN',
      department: defaultDeptName,
      departments: [defaultDeptName],
      designation: chosenType === 'SITE' ? 'Site Engineer' : 'Office Administrator',
      dob: '1995-05-15',
      doj: new Date().toISOString().split('T')[0],
      phone: '',
      email: '',
      employment_type: 'Full-time',
      salary: 45000,
      salary_type: 'Month',
      staff_type: chosenType
    });
    setShowAddStaffModal(true);
  };

  useEffect(() => {
    if (initialTab) setMainTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const handleStaffUpdate = () => setStaffList(getStaffMembers());
    window.addEventListener('booshnam_staff_updated', handleStaffUpdate);
    return () => window.removeEventListener('booshnam_staff_updated', handleStaffUpdate);
  }, []);

  const triggerToast = (msg: string) => {
    if (onShowToast) onShowToast(msg);
    else window.dispatchEvent(new CustomEvent('siteops_toast', { detail: msg }));
  };

  // Track dirty form state when entering staff details
  useEffect(() => {
    if (showAddStaffModal) {
      const isDirty = Boolean(newStaffForm.name.trim() || newStaffForm.phone.trim() || newStaffForm.email.trim());
      setFormDirty(isDirty, 'Staff Member profile');
    } else {
      clearFormDirty();
    }
  }, [showAddStaffModal, newStaffForm.name, newStaffForm.phone, newStaffForm.email]);

  const handleCloseAddStaffModal = async () => {
    const isDirty = Boolean(newStaffForm.name.trim() || newStaffForm.phone.trim() || newStaffForm.email.trim());
    if (isDirty) {
      const canLeave = await confirmAction({
        title: 'Leave Form?',
        message: 'Are you sure you want to leave this page?\nYour entered data will be lost.',
        confirmText: 'Leave',
        cancelText: 'Stay in Form',
        variant: 'warning',
        icon: 'alert'
      });
      if (!canLeave) return;
    }
    clearFormDirty();
    setShowAddStaffModal(false);
  };

  const handleCreateStaff = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!newStaffForm.name.trim()) return triggerToast('Please enter staff full name');
    if (!newStaffForm.phone || newStaffForm.phone.length !== 10) return triggerToast('Phone number must be exactly 10 digits (used for login)');
    if (newStaffForm.email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(newStaffForm.email.trim())) {
      return triggerToast('Invalid email format');
    }
    const selectedDepts = newStaffForm.departments && newStaffForm.departments.length > 0
      ? newStaffForm.departments
      : (newStaffForm.department ? [newStaffForm.department] : []);

    if (selectedDepts.length === 0) {
      return triggerToast('Please select at least one department for the staff member');
    }

    const rolesMap = getStoredRolePermissions();
    const isSite = newStaffForm.staff_type === 'SITE';
    const computedRoleCode = isSite ? 'SITE_ENGINEER' : 'ADMIN';
    const roleObj = rolesMap[computedRoleCode] || { roleName: isSite ? 'Site Engineer' : 'Office Staff' };
    const generatedCode = `EMP-0${100 + staffList.length + 1}`;
    const targetDept = selectedDepts.join(', ');

    const newStaff: StaffMember = {
      id: `emp-${Date.now()}`,
      employee_code: generatedCode,
      name: newStaffForm.name.trim(),
      role_code: computedRoleCode,
      role_name: roleObj.roleName || (isSite ? 'Site Engineer' : 'Office Staff'),
      department: targetDept,
      departments: selectedDepts,
      designation: newStaffForm.designation || (isSite ? 'Site Engineer' : 'Office Administrator'),
      dob: newStaffForm.dob,
      doj: newStaffForm.doj,
      phone: newStaffForm.phone,
      email: newStaffForm.email || `${newStaffForm.name.toLowerCase().replace(/\s+/g, '.')}@booshnam.com`,
      employment_type: newStaffForm.employment_type,
      salary: Number(newStaffForm.salary) || 40000,
      salary_type: newStaffForm.salary_type,
      status: 'ACTIVE',
      staff_type: newStaffForm.staff_type,
      has_login_account: false, // Role and login account are manually assigned by admin in Settings > Roles & Access
      created_at: new Date().toISOString().split('T')[0]
    };

    const deptSummary = selectedDepts.length > 1
      ? `${selectedDepts.length} departments (${targetDept})`
      : targetDept;

    const confirmed = await confirmAction({
      title: `Create ${isSite ? 'Site Staff' : 'Office Staff'}`,
      message: `Add "${newStaff.name}" to ${deptSummary}?`,
      confirmText: 'Save Staff',
      cancelText: 'Cancel',
      variant: 'primary',
      icon: 'info'
    });
    if (!confirmed) return;

    saveStaffMember(newStaff);

    clearFormDirty();
    setStaffList(getStaffMembers());
    setShowAddStaffModal(false);
    triggerToast(`Staff "${newStaff.name}" added to ${deptSummary}! Role & login access can be assigned from Settings > Roles & Access.`);
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    const confirmed = await confirmAction({
      title: 'Remove Staff Member',
      message: `Are you sure you want to remove staff member "${name}"?\nThis will revoke their system login and project assignments.`,
      confirmText: 'Remove Staff',
      cancelText: 'Cancel',
      variant: 'danger',
      icon: 'trash',
    });

    if (confirmed) {
      deleteStaffMember(id);
      setStaffList(getStaffMembers());
      triggerToast(`Staff "${name}" removed successfully`);
    }
  };

  const attendanceStaffSource = useMemo(() => {
    const deptMatches = (departmentStaffList || []).filter(s => getStaffCategory(s) === staffTypeFilter);
    if (deptMatches.length > 0) return departmentStaffList;
    return staffList;
  }, [departmentStaffList, staffList, staffTypeFilter]);

  const displayedAttendanceStaff = useMemo(() => {
    return attendanceStaffSource.filter(s => {
      const cat = getStaffCategory(s);
      if (staffTypeFilter === 'OFFICE' && cat !== 'OFFICE') return false;
      if (staffTypeFilter === 'SITE' && cat !== 'SITE') return false;

      if (staffStatusFilter === 'active' && s.status === 'INACTIVE') return false;
      if (staffStatusFilter === 'inactive' && s.status !== 'INACTIVE') return false;

      if (payrollSearchQuery.trim()) {
        const q = payrollSearchQuery.toLowerCase();
        const matchName = (s.name || '').toLowerCase().includes(q);
        const matchCode = (s.employee_code || '').toLowerCase().includes(q);
        const matchDesig = (s.designation || '').toLowerCase().includes(q);
        const matchDept = (s.department || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchDesig && !matchDept) return false;
      }

      return true;
    });
  }, [attendanceStaffSource, staffTypeFilter, staffStatusFilter, payrollSearchQuery]);

  const attendanceDayStats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let paidLeave = 0;
    let weekoff = 0;

    displayedAttendanceStaff.forEach(s => {
      const st = getAttendanceStatusForDate(s.id);
      if (st === 'Present' || st === 'Late' || st === 'Half-day' || st === 'Overtime') {
        present++;
      } else if (st === 'Absent') {
        absent++;
      } else if (st === 'Paid Leave') {
        paidLeave++;
      } else if (st === 'Weekoff') {
        weekoff++;
      }
    });

    return { present, absent, paidLeave, weekoff };
  }, [displayedAttendanceStaff, staffAttendanceStatus, attendanceRecords, formattedDateStr]);

  const filteredStaff = useMemo(() => {
    return departmentStaffList.filter(s => {
      const matchesCategory =
        staffCategoryFilter === 'ALL' ||
        getStaffCategory(s) === staffCategoryFilter;
      const matchesQuery =
        s.name.toLowerCase().includes(searchStaffQuery.toLowerCase()) ||
        s.employee_code.toLowerCase().includes(searchStaffQuery.toLowerCase()) ||
        s.department.toLowerCase().includes(searchStaffQuery.toLowerCase()) ||
        s.designation.toLowerCase().includes(searchStaffQuery.toLowerCase());
      const matchesRole = selectedRoleFilter === 'ALL' || s.role_code === selectedRoleFilter;
      return matchesCategory && matchesQuery && matchesRole;
    });
  }, [departmentStaffList, staffCategoryFilter, searchStaffQuery, selectedRoleFilter]);

  const attendanceStaffList = useMemo(() => {
    return departmentStaffList.filter(s => {
      if (staffCategoryFilter !== 'ALL' && getStaffCategory(s) !== staffCategoryFilter) {
        return false;
      }
      if (attendanceSearchQuery.trim()) {
        const q = attendanceSearchQuery.toLowerCase();
        const matches =
          s.name.toLowerCase().includes(q) ||
          s.employee_code.toLowerCase().includes(q) ||
          s.designation.toLowerCase().includes(q) ||
          s.department.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [departmentStaffList, staffCategoryFilter, attendanceSearchQuery]);

  const attendanceStats = useMemo(() => {
    const list = staffCategoryFilter === 'ALL'
      ? departmentStaffList
      : departmentStaffList.filter(s => getStaffCategory(s) === staffCategoryFilter);
    const presentCount = list.filter(s => {
      const st = getAttendanceStatus(s.id);
      return st === 'Present' || st === 'Late' || st === 'Half-day' || st === 'Overtime';
    }).length;
    const absentCount = list.filter(s => getAttendanceStatus(s.id) === 'Absent').length;
    const leaveCount = list.filter(s => getAttendanceStatus(s.id) === 'Paid Leave').length;
    const weekoffCount = list.filter(s => getAttendanceStatus(s.id) === 'Weekoff').length;
    return {
      total: list.length,
      present: presentCount,
      absent: absentCount,
      leave: leaveCount,
      weekoff: weekoffCount
    };
  }, [departmentStaffList, staffCategoryFilter, attendanceRecords, staffAttendanceStatus]);

  const liveVerifiedCount = useMemo(() => {
    return departmentStaffList.filter(s => {
      const rec = attendanceRecords.find(r => r.staff_id === s.id && r.date === getTodayDateString()) || getStaffLatestRecordToday(s.id);
      return rec && rec.verification_photo;
    }).length;
  }, [departmentStaffList, attendanceRecords]);

  const departmentAttendanceBreakdown = useMemo(() => {
    const depts = getIndividualDepartments();
    return depts.map(d => {
      const dStaff = staffList.filter(s => isStaffInDepartment(s, d.id));
      const present = dStaff.filter(s => {
        const st = getAttendanceStatus(s.id);
        return st === 'Present' || st === 'Late' || st === 'Half-day' || st === 'Overtime';
      }).length;
      return {
        id: d.id,
        name: d.name,
        shortName: d.shortName,
        total: dStaff.length,
        present,
        rate: dStaff.length > 0 ? Math.round((present / dStaff.length) * 100) : 0
      };
    });
  }, [staffList, attendanceRecords, staffAttendanceStatus]);

  const totalPresent = attendance.filter(a => a.status !== 'ABSENT').length;
  const insideGeofenceCount = attendance.filter(a => a.is_inside_geofence).length;

  // Fullscreen State & Toggle
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const unsub = addFullscreenChangeListener((fs) => { setIsFullscreen(fs); });
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false); };
    window.addEventListener('keydown', handleKeyDown);
    return () => { unsub(); window.removeEventListener('keydown', handleKeyDown); };
  }, [isFullscreen]);

  const toggleFullscreen = async () => {
    setIsFullscreen(prev => !prev);
    try { await toggleBrowserFullscreen(); } catch (e) {}
  };

  // 2-second initial loading state for Kokonut UI loader animation
  const [isWorkforceLoading, setIsWorkforceLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsWorkforceLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (isWorkforceLoading) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center min-h-screen h-full w-full bg-white transition-all duration-300 animate-in fade-in ${
        isFullscreen ? `fixed top-0 right-0 bottom-0 z-[100] ${isSidebarOpen ? 'left-64' : 'left-[72px]'}` : ''
      }`}>
        <Loader
          size="lg"
          title="Loading Workforce & Attendance..."
          subtitle="Fetching staff roster, attendance records and biometric logs"
          className="text-red-600"
        />
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col min-w-0 bg-slate-50/50 pb-16 transition-all duration-300 ${
      isFullscreen ? `fixed top-0 right-0 bottom-0 z-[100] overflow-y-auto bg-slate-50 ${isSidebarOpen ? 'left-64' : 'left-[72px]'}` : ''
    }`}>
      {/* ── SELECTED STAFF OVERVIEW OR MAIN CONTENT ── */}
      {selectedStaffForOverview ? (
        <StaffOverviewView
          staff={selectedStaffForOverview}
          initialTab={overviewInitialTab}
          onBack={() => {
            setSelectedStaffForOverview(null);
            setActiveTab('people');
          }}
          onNavigateTab={(tab) => {
            if (tab === 'people') {
              setSelectedStaffForOverview(null);
              setActiveTab('people');
            } else if (tab === 'attendance') {
              setActiveTab('attendance');
            } else {
              setSelectedStaffForOverview(null);
              setActiveTab(tab);
            }
          }}
          onUpdateStaff={(updated) => {
            setSelectedStaffForOverview(updated);
            setStaffList(getStaffMembers());
          }}
          onShowToast={triggerToast}
          allStaff={staffList}
          onSelectStaff={(target) => {
            setSelectedStaffForOverview(target);
          }}
        />
      ) : (
        <>
          {/* Top Header Bar */}
          <div className="bg-white border-b border-slate-100 px-6 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
            {/* Left: 5 Unified Navigation Tabs */}
            <div className="flex items-center gap-6 sm:gap-8 text-sm">
              <button
                type="button"
                onClick={() => {
                  setSelectedStaffForOverview(null);
                  setActiveTab('people');
                }}
                className={`py-2 transition-colors cursor-pointer border-b-2 ${
                  activeTab === 'people'
                    ? 'text-red-600 font-bold border-red-600'
                    : 'text-slate-600 hover:text-slate-900 font-medium border-transparent'
                }`}
              >
                People
              </button>
              <button
                type="button"
                onClick={() => {
                  const chithra = staffList.find(s => s.name.toLowerCase().includes('chithra')) || staffList[0] || null;
                  setSelectedStaffForOverview(chithra);
                  setActiveTab('attendance');
                }}
                className={`py-2 transition-colors cursor-pointer border-b-2 ${
                  activeTab === 'attendance'
                    ? 'text-red-600 font-bold border-red-600'
                    : 'text-slate-600 hover:text-slate-900 font-medium border-transparent'
                }`}
              >
                Attendance
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('team_leaves')}
                className={`py-2 transition-colors cursor-pointer border-b-2 ${
                  activeTab === 'team_leaves'
                    ? 'text-red-600 font-bold border-red-600'
                    : 'text-slate-600 hover:text-slate-900 font-medium border-transparent'
                }`}
              >
                Team Leaves
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('my_leaves')}
                className={`py-2 transition-colors cursor-pointer border-b-2 ${
                  activeTab === 'my_leaves'
                    ? 'text-red-600 font-bold border-red-600'
                    : 'text-slate-600 hover:text-slate-900 font-medium border-transparent'
                }`}
              >
                My Leaves
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('holidays')}
                className={`py-2 transition-colors cursor-pointer border-b-2 ${
                  activeTab === 'holidays'
                    ? 'text-red-600 font-bold border-red-600'
                    : 'text-slate-600 hover:text-slate-900 font-medium border-transparent'
                }`}
              >
                Holidays
              </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleOpenAddStaffModal(staffTypeFilter === 'SITE' ? 'SITE' : 'OFFICE')}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add Staff</span>
              </button>
              <div className="h-5 w-px bg-slate-200 hidden sm:block" />
              <button
                type="button"
                onClick={toggleFullscreen}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isFullscreen ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
                title={isFullscreen ? 'Exit Fullscreen' : 'Full Screen'}
                aria-label={isFullscreen ? 'Exit Fullscreen' : 'Full Screen'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4 text-red-600" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <UserProfileDropdown showBell={true} onShowToast={triggerToast} />
            </div>
          </div>
          {/* ── SECTION 1: STAFF & ACCESS ── */}
          {activeTab === 'people' && (
            <div className="p-4 sm:p-6 space-y-6 flex-1">
              {/* Quick Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    {isOverview 
                      ? (selectedDepartmentIds.includes('ALL') || selectedDepartmentIds.length === 0
                        ? 'Total Company Staff'
                        : `${selectedDepartmentIds.length} Selected Depts Staff`)
                      : `${activeDept.name} Staff`}
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-1">{departmentStaffList.length}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {isOverview 
                      ? (selectedDepartmentIds.includes('ALL') || selectedDepartmentIds.length === 0
                        ? 'All Departments Combined'
                        : `Filtered to ${selectedDepartmentIds.length} department(s)`)
                      : 'Enrolled in active department'}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Site Workforce</div>
                  <div className="text-2xl font-black text-emerald-700 mt-1">
                    {departmentStaffList.filter(s => getStaffCategory(s) === 'SITE').length} On Site
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Engineers & Field Staff</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Office & Administration</div>
                  <div className="text-2xl font-black text-indigo-700 mt-1">
                    {departmentStaffList.filter(s => getStaffCategory(s) === 'OFFICE').length} Staff
                  </div>
                  <div className="text-[10px] text-indigo-600 font-medium mt-0.5">Desk & Office Staff</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Workspace Access</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {departmentStaffList.filter(s => s.has_login_account).length} / {departmentStaffList.length} Active
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Configured via Roles & Access</div>
                </div>
              </div>

              {/* Action Header: Search + Category Filter + Role Filter + Add Staff Button */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 flex-wrap">
                  {/* Category Filter: All / Office / Site */}
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setStaffCategoryFilter('ALL')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        staffCategoryFilter === 'ALL'
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({departmentStaffList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStaffCategoryFilter('OFFICE')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        staffCategoryFilter === 'OFFICE'
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Office Staff ({departmentStaffList.filter(s => getStaffCategory(s) === 'OFFICE').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStaffCategoryFilter('SITE')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        staffCategoryFilter === 'SITE'
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Site Staff ({departmentStaffList.filter(s => getStaffCategory(s) === 'SITE').length})
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="relative flex-1 w-full sm:max-w-xs">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search staff by name, code..."
                      value={searchStaffQuery}
                      onChange={(e) => setSearchStaffQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                    {searchStaffQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchStaffQuery('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Role Filter */}
                  <div className="w-full sm:w-48">
                    <CustomSelect
                      value={selectedRoleFilter}
                      onChange={(val) => setSelectedRoleFilter(val)}
                      options={[
                        { label: `All Roles (${departmentStaffList.length})`, value: 'ALL' },
                        ...MOCK_ROLES.map(r => ({
                          label: r.name,
                          value: r.code
                        }))
                      ]}
                      variant="brand"
                      triggerClassName="h-9 px-3 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 shadow-2xs"
                    />
                  </div>

                  {/* Department Filter (Overview) */}
                  {isOverview && (
                    <div className="w-full sm:w-auto">
                      <DepartmentMultiSelectFilter
                        selectedIds={selectedDepartmentIds}
                        onChange={setSelectedDepartmentIds}
                        departments={departmentFilterItems}
                        totalCount={staffList.length}
                        labelPrefix="Dept"
                      />
                    </div>
                  )}
                </div>

                {/* + Add Staff Button */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenAddStaffModal(staffCategoryFilter === 'SITE' ? 'SITE' : 'OFFICE')}
                    className="w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer hover:shadow-md"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ Add {staffCategoryFilter === 'SITE' ? 'Site Staff' : staffCategoryFilter === 'OFFICE' ? 'Office Staff' : 'Staff'}</span>
                  </button>
                </div>
              </div>

              {/* Staff Roster Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3.5 px-6 whitespace-nowrap">Staff Member</th>
                        <th className="py-3.5 px-6 whitespace-nowrap">Role Assignment</th>
                        <th className="py-3.5 px-6 whitespace-nowrap">Department & Role</th>
                        <th className="py-3.5 px-6 whitespace-nowrap">Contact</th>
                        <th className="py-3.5 px-6 whitespace-nowrap">Workspace Login</th>
                        <th className="py-3.5 px-6 text-right whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredStaff.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                            No staff members found matching "{searchStaffQuery}". Click "+ Add Staff" to register.
                          </td>
                        </tr>
                      ) : (
                        filteredStaff.map((staff) => (
                          <tr
                            key={staff.id}
                            onClick={() => handleOpenStaffOverview(staff, 'details')}
                            className="hover:bg-red-50/40 transition-colors cursor-pointer group"
                          >
                            {/* Staff Name & Avatar */}
                            <td className="py-4 px-6 align-middle">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-red-100 text-red-700 border border-red-200 font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                  {staff.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 truncate group-hover:text-red-600 text-xs sm:text-sm">{staff.name}</div>
                                  <div className="text-[11px] text-slate-400 truncate">{staff.email}</div>
                                </div>
                              </div>
                            </td>

                            {/* Assigned Role */}
                            <td className="py-4 px-6 whitespace-nowrap align-middle">
                              <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold ${
                                staff.role_code === 'SUPER_ADMIN'
                                  ? 'bg-red-100 text-red-700 border border-red-200'
                                  : staff.role_code === 'ADMIN'
                                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                    : staff.role_code === 'SUPERVISOR'
                                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                      : staff.role_code === 'SITE_ENGINEER'
                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}>
                                {staff.role_name}
                              </span>
                            </td>

                            {/* Department & Designation */}
                            <td className="py-4 px-6 align-middle">
                              <div className="font-semibold text-slate-800 leading-tight">{staff.designation}</div>
                              {getStaffDepartmentNames(staff).length > 1 ? (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {getStaffDepartmentNames(staff).map(dep => (
                                    <span key={dep} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded border border-slate-200">
                                      {dep}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-[11px] text-slate-400 leading-tight mt-0.5">{staff.department}</div>
                              )}
                            </td>

                            {/* Contact */}
                            <td className="py-4 px-6 tracking-tight text-slate-700 whitespace-nowrap align-middle">
                              <div className="inline-flex items-center gap-2 text-xs">
                                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="tabular-nums font-medium">{staff.phone}</span>
                              </div>
                            </td>

                            {/* Workspace Login Status */}
                            <td
                              className="py-4 px-6 whitespace-nowrap align-middle"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenStaffOverview(staff, 'access');
                              }}
                            >
                              {staff.has_login_account ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[11px] font-bold hover:bg-emerald-100 transition-colors">
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" /> Account Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[11px] font-semibold hover:bg-amber-100 transition-colors">
                                  <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" /> Pending Setup
                                </span>
                              )}
                            </td>

                            {/* Action buttons (Only Delete) */}
                            <td className="py-4 px-6 text-right whitespace-nowrap align-middle">
                              <div className="inline-flex items-center justify-end">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteStaff(staff.id, staff.name);
                                  }}
                                  title="Delete Staff"
                                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4 shrink-0" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── SECTION 2: ATTENDANCE UI ── */}
          {activeTab === 'attendance' && (
            <div className="p-6 max-w-7xl mx-auto w-full space-y-6 animate-in fade-in duration-150">
              {/* Row 1: Filter Pills */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setStaffTypeFilter('OFFICE')}
                  className={`px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    staffTypeFilter === 'OFFICE'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-red-600 hover:bg-red-50'
                  }`}
                >
                  Office Staff
                </button>
                <button
                  type="button"
                  onClick={() => setStaffTypeFilter('SITE')}
                  className={`px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    staffTypeFilter === 'SITE'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-red-600 hover:bg-red-50'
                  }`}
                >
                  Site Staff
                </button>

                {/* Active (count) ▾ Dropdown */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setIsStaffStatusDropdownOpen(prev => !prev)}
                    className="px-4 py-2 rounded-full border border-red-200 bg-white hover:bg-red-50/50 text-xs font-semibold text-red-600 flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                  >
                    <span>
                      {staffStatusFilter === 'active'
                        ? `Active (${attendanceStaffSource.filter(s => s.status !== 'INACTIVE' && getStaffCategory(s) === staffTypeFilter).length})`
                        : staffStatusFilter === 'inactive'
                        ? `Inactive (${attendanceStaffSource.filter(s => s.status === 'INACTIVE' && getStaffCategory(s) === staffTypeFilter).length})`
                        : `All (${attendanceStaffSource.filter(s => getStaffCategory(s) === staffTypeFilter).length})`}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-red-600" />
                  </button>

                  {isStaffStatusDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1 overflow-hidden animate-in fade-in duration-100">
                      <button
                        type="button"
                        onClick={() => { setStaffStatusFilter('active'); setIsStaffStatusDropdownOpen(false); }}
                        className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors hover:bg-red-50 cursor-pointer ${
                          staffStatusFilter === 'active' ? 'text-red-600 font-bold bg-red-50/70' : 'text-slate-700'
                        }`}
                      >
                        Active ({attendanceStaffSource.filter(s => s.status !== 'INACTIVE' && getStaffCategory(s) === staffTypeFilter).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => { setStaffStatusFilter('inactive'); setIsStaffStatusDropdownOpen(false); }}
                        className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors hover:bg-red-50 cursor-pointer ${
                          staffStatusFilter === 'inactive' ? 'text-red-600 font-bold bg-red-50/70' : 'text-slate-700'
                        }`}
                      >
                        Inactive ({attendanceStaffSource.filter(s => s.status === 'INACTIVE' && getStaffCategory(s) === staffTypeFilter).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => { setStaffStatusFilter('all'); setIsStaffStatusDropdownOpen(false); }}
                        className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors hover:bg-red-50 cursor-pointer ${
                          staffStatusFilter === 'all' ? 'text-red-600 font-bold bg-red-50/70' : 'text-slate-700'
                        }`}
                      >
                        All Staff ({attendanceStaffSource.filter(s => getStaffCategory(s) === staffTypeFilter).length})
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: Date Selector & Search Input on Left, Stats on Right */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
                {/* Left: < [ 19 Mon ] > | [ 📅 Oct ] | [ 🔍 Search Payroll ] */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Prev day */}
                  <button
                    type="button"
                    onClick={handlePrevDay}
                    className="h-11 w-9 flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors border border-slate-200 bg-white shadow-2xs"
                    title="Previous day"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Green Date Badge */}
                  <div className="h-11 px-3 min-w-[50px] rounded-lg bg-emerald-600 text-white flex flex-col items-center justify-center select-none shadow-xs font-sans">
                    <span className="text-sm font-bold leading-tight">{selectedAttendanceDate.getDate()}</span>
                    <span className="text-[11px] font-medium leading-tight">{selectedAttendanceDate.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  </div>

                  {/* Next day */}
                  <button
                    type="button"
                    onClick={handleNextDay}
                    className="h-11 w-9 flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors border border-slate-200 bg-white shadow-2xs"
                    title="Next day"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Month picker button */}
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setShowCalendarPicker(prev => !prev)}
                      className="h-11 px-3.5 rounded-lg border border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30 text-slate-700 flex flex-col items-center justify-center cursor-pointer shadow-2xs transition-colors group"
                      title="Select month / date"
                    >
                      <Calendar className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 mb-0.5 transition-colors" />
                      <span className="text-[11px] font-bold text-slate-700 group-hover:text-emerald-600 leading-tight transition-colors">
                        {selectedAttendanceDate.toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                    </button>
                    {showCalendarPicker && (
                      <div className="absolute top-12 left-0 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-3">
                        <CustomDatePicker
                          value={formattedDateStr}
                          onChange={(val) => {
                            if (val) {
                              const [y, m, d] = val.split('-').map(Number);
                              setSelectedAttendanceDate(new Date(y, m - 1, d));
                            }
                            setShowCalendarPicker(false);
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Search Payroll input */}
                  <div className="relative w-64 sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search Payroll"
                      value={payrollSearchQuery}
                      onChange={(e) => setPayrollSearchQuery(e.target.value)}
                      className="w-full h-11 pl-10 pr-8 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-2xs"
                    />
                    {payrollSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setPayrollSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Right: 0 Present | ■ 0 Absent  ■ 0 Paid Leave  ■ 0 Weekoff */}
                <div className="text-right flex flex-col items-end">
                  <div className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    {attendanceDayStats.present} Present
                  </div>
                  <div className="flex items-center gap-2.5 text-[11px] font-medium text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-[2px] bg-red-500" />
                      <span>{attendanceDayStats.absent} Absent</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-[2px] bg-purple-500" />
                      <span>{attendanceDayStats.paidLeave} Paid Leave</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-[2px] bg-[#1e1b4b]" />
                      <span>{attendanceDayStats.weekoff} Weekoff</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 3: Staff Attendance Table */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs relative">
                {/* Header Strip */}
                <div className="bg-red-50/50 px-6 py-3.5 flex items-center justify-between text-xs font-semibold text-slate-700 border-b border-red-100/60 rounded-t-xl">
                  <span>Name</span>
                  <div className="flex items-center gap-3">
                    <span className="min-w-[130px] text-center">Attendance Status</span>
                    <span className="w-8 shrink-0" aria-hidden="true" />
                  </div>
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-slate-100 rounded-b-xl">
                  {displayedAttendanceStaff.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      No {staffTypeFilter === 'OFFICE' ? 'office' : 'site'} staff members found.
                    </div>
                  ) : (
                    displayedAttendanceStaff.map((staff, idx) => {
                      const initials = getStaffInitials(staff.name);
                      const currentStatus = getAttendanceStatusForDate(staff.id);
                      const isDropdownOpen = openRowDropdownId === staff.id;
                      const isLast = idx === displayedAttendanceStaff.length - 1;
                      const statusConfig = getStatusButtonConfig(currentStatus);

                      return (
                        <div
                          key={staff.id}
                          className={`px-6 py-4 flex items-center justify-between transition-all duration-150 ${statusConfig.rowBorder} ${
                            isLast ? 'rounded-b-xl' : ''
                          }`}
                        >
                          {/* Left: Avatar + Name + Subtitle */}
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-full bg-red-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                              {initials}
                            </div>
                            <div>
                              <div
                                onClick={() => handleOpenStaffOverview(staff, 'people')}
                                className="text-sm font-semibold text-slate-900 hover:text-red-600 cursor-pointer transition-colors"
                              >
                                {staff.name}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {staff.designation || '--'}
                              </div>
                            </div>
                          </div>

                          {/* Right: Status Dropdown + Chevron Right Button */}
                          <div className="flex items-center gap-3">
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => setOpenRowDropdownId(isDropdownOpen ? null : staff.id)}
                                className={`min-w-[130px] px-3.5 py-2 rounded-lg border text-xs flex items-center justify-between gap-2 cursor-pointer transition-all duration-150 ${statusConfig.btnClass}`}
                              >
                                <span>{currentStatus}</span>
                                <ChevronDown className={`w-3.5 h-3.5 ${statusConfig.chevronClass} shrink-0 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                              </button>

                              {isDropdownOpen && (
                                <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-1.5 overflow-hidden animate-in fade-in duration-100">
                                  {ATTENDANCE_SELECT_OPTIONS.map((opt) => (
                                    <button
                                      key={opt.status}
                                      type="button"
                                      onClick={() => handleSetStatus(staff.id, opt.status)}
                                      className={`w-full text-left px-4 py-2.5 text-xs transition-colors cursor-pointer ${opt.hover} ${
                                        currentStatus === opt.status ? opt.activeClass : 'text-slate-700 font-medium'
                                      }`}
                                    >
                                      <span>{opt.label}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Open Profile Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenStaffOverview(staff, 'people')}
                              title="View Profile"
                              className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 flex items-center justify-center text-slate-400 shadow-2xs transition-colors cursor-pointer shrink-0"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── SECTION 3: TEAM LEAVES ── */}
          {activeTab === 'team_leaves' && (
            <div className="p-6 max-w-7xl mx-auto w-full flex flex-col items-center justify-center h-64 text-slate-400 animate-in fade-in">
              <Calendar className="w-12 h-12 mb-4 opacity-20" />
              <p>Team Leaves view is under construction</p>
            </div>
          )}

          {/* ── SECTION 4: MY LEAVES ── */}
          {activeTab === 'my_leaves' && (
            <div className="p-6 max-w-7xl mx-auto w-full flex flex-col items-center justify-center h-64 text-slate-400 animate-in fade-in">
              <User className="w-12 h-12 mb-4 opacity-20" />
              <p>My Leaves view is under construction</p>
            </div>
          )}

          {/* ── SECTION 5: HOLIDAYS ── */}
          {activeTab === 'holidays' && (
            <div className="p-6 max-w-7xl mx-auto w-full animate-in fade-in">
              <HolidaysManager onShowToast={triggerToast} />
            </div>
          )}
        </>
      )}

      {/* ── MODAL: ADD NEW STAFF MEMBER ── */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs overflow-y-auto flex items-start justify-center p-0 sm:p-6 md:p-8">
          <div className="bg-white w-full max-w-2xl min-h-screen sm:min-h-0 sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col my-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 flex items-center justify-between bg-white border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-wide uppercase">
                  ADD NEW STAFF MEMBER
                </h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCreateStaff}
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Staff</span>
                  </button>
                </div>

                <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>

                <button
                  type="button"
                  onClick={handleCloseAddStaffModal}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Accent Line */}
            <div className="h-1 bg-red-600 w-full" />

            {/* Modal Form Content */}
            <div className="p-6 md:p-8 space-y-4 flex-1 overflow-y-auto max-h-[75vh]">
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleCreateStaff(); }}>
                  {/* 1. Staff Category Selection (Office vs Site) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Staff Category *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {/* 1. Office Staff */}
                      <button
                        type="button"
                        onClick={() => setNewStaffForm(prev => ({
                          ...prev,
                          staff_type: 'OFFICE',
                          role_code: 'ADMIN',
                          designation: prev.designation === 'Site Engineer' ? 'Office Administrator' : (prev.designation || 'Office Administrator')
                        }))}
                        className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                          newStaffForm.staff_type === 'OFFICE'
                            ? 'border-[#5833ea] bg-purple-50/40 text-slate-900 ring-2 ring-[#5833ea]/20 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                        }`}
                      >
                        {/* Radio selection circle */}
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                          newStaffForm.staff_type === 'OFFICE'
                            ? 'border-[#5833ea] bg-[#5833ea]'
                            : 'border-slate-300 bg-white'
                        }`}>
                          {newStaffForm.staff_type === 'OFFICE' && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <div className="text-left">
                          <div className={`text-xs font-bold ${newStaffForm.staff_type === 'OFFICE' ? 'text-[#5833ea]' : 'text-slate-800'}`}>
                            Office Staff
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Administration & Desk Staff</div>
                        </div>
                      </button>

                      {/* 2. Site Staff */}
                      <button
                        type="button"
                        onClick={() => setNewStaffForm(prev => ({
                          ...prev,
                          staff_type: 'SITE',
                          role_code: 'SITE_ENGINEER',
                          designation: prev.designation === 'Office Administrator' ? 'Site Engineer' : (prev.designation || 'Site Engineer')
                        }))}
                        className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                          newStaffForm.staff_type === 'SITE'
                            ? 'border-[#5833ea] bg-purple-50/40 text-slate-900 ring-2 ring-[#5833ea]/20 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                        }`}
                      >
                        {/* Radio selection circle */}
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                          newStaffForm.staff_type === 'SITE'
                            ? 'border-[#5833ea] bg-[#5833ea]'
                            : 'border-slate-300 bg-white'
                        }`}>
                          {newStaffForm.staff_type === 'SITE' && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <div className="text-left">
                          <div className={`text-xs font-bold ${newStaffForm.staff_type === 'SITE' ? 'text-[#5833ea]' : 'text-slate-800'}`}>
                            Site Staff
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Field Engineers & Supervisors</div>
                        </div>
                      </button>
                    </div>
                  </div>



                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Govind"
                      value={newStaffForm.name}
                      onChange={(e) => setNewStaffForm({ ...newStaffForm, name: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Designation / Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Senior Site Engineer"
                        value={newStaffForm.designation}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, designation: e.target.value })}
                        className="w-full h-11 px-3.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:border-red-500"
                      />
                    </div>
                  </div>

                  {/* ── DEPARTMENT SELECTION (CHECKBOXES) ── */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-red-600" />
                        <span>Select Department(s) for Staff *</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const allDepts = getIndividualDepartments().map(d => d.name);
                            setNewStaffForm(prev => {
                              const isAllSelected = prev.departments.length === allDepts.length;
                              const next = isAllSelected ? [] : allDepts;
                              return {
                                ...prev,
                                departments: next,
                                department: next.join(', ')
                              };
                            });
                          }}
                          className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                        >
                          {newStaffForm.departments.length === getIndividualDepartments().length ? 'Deselect All' : 'Select All'}
                        </button>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          newStaffForm.departments.length > 0
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {newStaffForm.departments.length} selected
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Tick the department(s) to assign this staff member. You can select multiple departments:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-50/70 border border-slate-200 rounded-xl max-h-48 overflow-y-auto">
                      {getIndividualDepartments().map(dept => {
                        const isChecked = newStaffForm.departments.includes(dept.name);
                        return (
                          <label
                            key={dept.id}
                            className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-red-50/80 border-red-300 text-red-950 shadow-2xs ring-1 ring-red-400/30'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setNewStaffForm(prev => {
                                  const next = isChecked
                                    ? prev.departments.filter(d => d !== dept.name)
                                    : [...prev.departments, dept.name];
                                  return {
                                    ...prev,
                                    departments: next,
                                    department: next.join(', ')
                                  };
                                });
                              }}
                              className="w-4 h-4 rounded text-red-600 border-slate-300 focus:ring-red-500 accent-red-600 cursor-pointer"
                            />
                            <span className="truncate flex-1 text-xs">{dept.name}</span>
                          </label>
                        );
                      })}
                    </div>
                    {newStaffForm.departments.length === 0 && (
                      <p className="text-[10px] font-semibold text-red-600">
                        * Please tick at least one department for the staff member.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Date of Birth (DOB) *
                      </label>
                      <CustomDatePicker
                        value={newStaffForm.dob}
                        onChange={(d) => setNewStaffForm({ ...newStaffForm, dob: d })}
                        placeholder="Select DOB"
                        inputClassName="h-11 px-3.5 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Date of Joining (DOJ) *
                      </label>
                      <CustomDatePicker
                        value={newStaffForm.doj}
                        onChange={(d) => setNewStaffForm({ ...newStaffForm, doj: d })}
                        placeholder="Select DOJ"
                        inputClassName="h-11 px-3.5 rounded-lg text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700">Phone Number (10 Digits) *</label>
                        {newStaffForm.phone && (
                          <span className={`text-[10px] tracking-tight font-bold ${newStaffForm.phone.length === 10 ? 'text-green-600' : 'text-amber-600'}`}>
                            {newStaffForm.phone.length}/10
                          </span>
                        )}
                      </div>
                      <input
                        type="tel"
                        maxLength={10}
                        required
                        placeholder="e.g. 9840123456"
                        value={newStaffForm.phone}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        className="w-full h-11 px-3.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        placeholder="staff@booshnam.in"
                        value={newStaffForm.email}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, email: e.target.value.trim() })}
                        className="w-full h-11 px-3.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Salary / Wage (₹)</label>
                      <input
                        type="number"
                        value={newStaffForm.salary}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, salary: Number(e.target.value) })}
                        className="w-full h-11 px-3.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:border-red-500"
                      />
                    </div>
                  </div>
                  <button type="submit" className="hidden">Save Staff</button>
                </form>
            </div>
          </div>
        </div>
      )}

      {/* ── MANAGE PROJECT ACCESS MODAL ── */}
      {selectedStaffForProjectModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 border border-red-200 font-bold flex items-center justify-center text-sm">
                  {selectedStaffForProjectModal.name
                    .split(' ')
                    .map((n) => n[0])
                    .filter(Boolean)
                    .join('')
                    .substring(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Project Access: {selectedStaffForProjectModal.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedStaffForProjectModal.role_name} • {selectedStaffForProjectModal.phone}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStaffForProjectModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {(() => {
                const alloc = getStaffAllocatedProjects(
                  selectedStaffForProjectModal.name,
                  selectedStaffForProjectModal.role_code
                );
                return (
                  <>
                    <div className="flex items-center justify-between bg-red-50/70 border border-red-200/80 rounded-xl p-3.5 text-xs text-red-900">
                      <div>
                        <span className="font-bold">Allocated Projects: </span>
                        <span>
                          {alloc.isAllAccess
                            ? 'All Projects (Admin Privilege)'
                            : `${alloc.totalProjects} Projects Assigned`}
                        </span>
                      </div>
                      <span className="text-[11px] bg-red-100 text-red-800 font-bold px-2.5 py-0.5 rounded-md border border-red-200">
                        {alloc.totalProjects} Active
                      </span>
                    </div>

                    {alloc.isAllAccess && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          This team member has an <strong>Admin / Director</strong> role, granting company-wide visibility to all projects by default.
                        </span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Select Projects to Assign / Unassign
                      </div>
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto bg-white">
                        {allProjectsList.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400">
                            No projects found in the system.
                          </div>
                        ) : (
                          allProjectsList.map((proj: any) => {
                            const isAssigned = alloc.allocatedProjects.some((p) => p.id === proj.id);
                            return (
                              <div
                                key={proj.id}
                                onClick={() => {
                                  toggleStaffProjectAllocation(
                                    selectedStaffForProjectModal.name,
                                    selectedStaffForProjectModal.role_code,
                                    proj.id
                                  );
                                  setStaffList(getStaffMembers());
                                  triggerToast(
                                    isAssigned
                                      ? `Unassigned from "${proj.name}"`
                                      : `Assigned to "${proj.name}"`
                                  );
                                }}
                                className="p-3.5 hover:bg-slate-50/80 flex items-center justify-between cursor-pointer transition select-none"
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={isAssigned}
                                    readOnly
                                    className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 cursor-pointer pointer-events-none"
                                  />
                                  <div>
                                    <div className="font-bold text-slate-800 text-xs">{proj.name}</div>
                                    <div className="text-[11px] text-slate-400">
                                      {proj.code || proj.id} • {proj.location || 'Site Location'}
                                    </div>
                                  </div>
                                </div>
                                <span
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded ${isAssigned
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-slate-100 text-slate-500'
                                    }`}
                                >
                                  {isAssigned ? 'Assigned' : 'Unassigned'}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedStaffForProjectModal(null)}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: LIVE PHOTO PROOF VIEWER ── */}
      <LivePhotoViewModal
        record={viewPhotoRecord}
        onClose={() => setViewPhotoRecord(null)}
      />
    </div>
  );
};

