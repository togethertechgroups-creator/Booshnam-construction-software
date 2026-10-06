import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, User, MapPin, CheckCircle2, AlertTriangle, Shield,
  Clock, DollarSign, Plus, Check, Search, Calendar,
  UserPlus, Mail, Phone, Briefcase, Filter, X, Lock,
  Trash2, ArrowRight, ArrowLeft, ShieldCheck, Sparkles, Building2, Info,
  Camera, Eye, HardHat, Smartphone,
  Maximize2, Minimize2
} from 'lucide-react';
import { Project, Worker, AttendanceRecord } from '../types';
import { UserProfileDropdown } from '../components/UserProfileDropdown';
import { toggleBrowserFullscreen, addFullscreenChangeListener } from '../lib/fullscreenService';
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
  getStaffCategory
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
  const [mainTab, setMainTab] = useState<'staff' | 'payroll'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setMainTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    const handleOpenPayroll = () => {
      setMainTab('payroll');
    };
    if (sessionStorage.getItem('booshnam_auto_open_payroll')) {
      sessionStorage.removeItem('booshnam_auto_open_payroll');
      setMainTab('payroll');
    }
    window.addEventListener('booshnam_open_payroll', handleOpenPayroll);
    return () => window.removeEventListener('booshnam_open_payroll', handleOpenPayroll);
  }, []);
  const [payrollTab, setPayrollTab] = useState<'attendance' | 'team_leaves' | 'my_leaves' | 'holidays'>('attendance');
  const [staffList, setStaffList] = useState<StaffMember[]>(() => getStaffMembers());
  const [searchStaffQuery, setSearchStaffQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [selectedStaffForOverview, setSelectedStaffForOverview] = useState<StaffMember | null>(null);
  const [overviewInitialTab, setOverviewInitialTab] = useState<'details' | 'access' | 'leave_dashboard'>('details');
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

  // Attendance status per staff member
  type AttendanceStatus = 'Present' | 'Absent' | 'Weekoff' | 'Paid Leave' | 'Late' | 'Half-day' | 'Overtime';
  const [staffAttendanceStatus, setStaffAttendanceStatus] = useState<Record<string, AttendanceStatus>>({});
  const [openAttendanceDropdown, setOpenAttendanceDropdown] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);

  const getAttendanceStatus = (staffId: string): AttendanceStatus => {
    if (staffAttendanceStatus[staffId]) return staffAttendanceStatus[staffId];
    const rec = attendanceRecords.find(r => r.staff_id === staffId && r.date === getTodayDateString());
    if (rec) return rec.status as AttendanceStatus;
    return 'Present';
  };

  const setAttendanceStatus = (staffId: string, status: AttendanceStatus) => {
    setStaffAttendanceStatus(prev => ({ ...prev, [staffId]: status }));
    updateStaffAttendanceStatus(staffId, status as any);
    setOpenAttendanceDropdown(null);
    triggerToast(`Attendance marked as ${status}`);
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!openAttendanceDropdown) return;
    const handleClick = () => { setOpenAttendanceDropdown(null); setDropdownPos(null); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openAttendanceDropdown]);

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
    { label: 'Present', color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-200' },
    { label: 'Late', color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-200' },
    { label: 'Half-day', color: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-200' },
    { label: 'Overtime', color: 'text-purple-700', bg: 'bg-purple-100', border: 'border-purple-200' },
    { label: 'Absent', color: 'text-red-700', bg: 'bg-red-100', border: 'border-red-200' },
    { label: 'Weekoff', color: 'text-indigo-700', bg: 'bg-indigo-100', border: 'border-indigo-200' },
    { label: 'Paid Leave', color: 'text-teal-700', bg: 'bg-teal-100', border: 'border-teal-200' },
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

  const handleOpenStaffOverview = (staff: StaffMember, defaultTab: 'details' | 'access' | 'leave_dashboard' = 'details') => {
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
      count: staffList.filter(s => normalizeDepartmentId(s.department) === d.id).length
    }));
  }, [staffList]);

  // Filtered by department: If overview (Booshnam Associates), show all or multi-filter by selectedDepartmentIds. Otherwise filter strictly to active department.
  const departmentStaffList = useMemo(() => {
    const activeAccount = getCurrentUserAccount();
    const isSuperAdmin = isUserCompanyWideSuperAdmin(activeAccount);
    const allowedDepts = getUserAllowedDepartmentIds(activeAccount);

    let baseList = staffList;
    if (!isSuperAdmin && allowedDepts && allowedDepts.length > 0) {
      baseList = staffList.filter(s => allowedDepts.includes(normalizeDepartmentId(s.department) as any));
    }

    if (!isOverview) {
      const normActive = normalizeDepartmentId(activeDept.id);
      return baseList.filter(s => {
        const normStaffDept = normalizeDepartmentId(s.department);
        return normStaffDept === normActive;
      });
    }
    if (selectedDepartmentIds.includes('ALL') || selectedDepartmentIds.length === 0) {
      return baseList;
    }
    const normSelected = new Set(selectedDepartmentIds.map(id => normalizeDepartmentId(id)));
    return baseList.filter(s => {
      const normStaffDept = normalizeDepartmentId(s.department);
      return normSelected.has(normStaffDept);
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

    const rolesMap = getStoredRolePermissions();
    const isSite = newStaffForm.staff_type === 'SITE';
    const computedRoleCode = isSite ? 'SITE_ENGINEER' : 'ADMIN';
    const roleObj = rolesMap[computedRoleCode] || { roleName: isSite ? 'Site Engineer' : 'Office Staff' };
    const generatedCode = `EMP-0${100 + staffList.length + 1}`;
    const targetDept = !isOverview 
      ? activeDept.name 
      : (newStaffForm.department || getIndividualDepartments()[0]?.name || 'Soil Investigation (Chennai)');

    const newStaff: StaffMember = {
      id: `emp-${Date.now()}`,
      employee_code: generatedCode,
      name: newStaffForm.name.trim(),
      role_code: computedRoleCode,
      role_name: roleObj.roleName || (isSite ? 'Site Engineer' : 'Office Staff'),
      department: targetDept,
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

    const confirmed = await confirmAction({
      title: `Create ${isSite ? 'Site Staff' : 'Office Staff'}`,
      message: `Add "${newStaff.name}" to ${newStaff.department}?`,
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
    triggerToast(`Staff "${newStaff.name}" added to ${newStaff.department}! Role & login access can be assigned from Settings > Roles & Access.`);
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

  return (
    <div className={`flex-1 flex flex-col min-w-0 bg-slate-50/50 pb-16 transition-all duration-300 ${
      isFullscreen ? `fixed top-0 right-0 bottom-0 z-[100] overflow-y-auto bg-slate-50 ${isSidebarOpen ? 'left-64' : 'left-[72px]'}` : ''
    }`}>
      {/* Top Header Bar */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white sticky top-0 z-10 shadow-2xs">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              {selectedStaffForOverview && (
                <button
                  type="button"
                  onClick={() => setSelectedStaffForOverview(null)}
                  className="mr-2 p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer transition-colors flex items-center shadow-xs bg-white"
                  title="Back to Directory"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h1 className="text-[21px] font-bold text-[#262626] font-heading tracking-tight">
                {selectedStaffForOverview ? `Staff Profile: ${selectedStaffForOverview.name}` : "Staff & Payroll Management"}
              </h1>
            </div>
          </div>
        </div>

        {/* Main Tab Navigation: Payroll | Staff Management */}
        <div className="flex items-center gap-3 flex-wrap mt-2 md:mt-0">
          {!selectedStaffForOverview && (
            <div className="flex items-center text-sm font-semibold border-b-2 border-transparent">
              <button
                onClick={() => setMainTab('payroll')}
                className={`px-4 py-3 transition-all cursor-pointer ${mainTab === 'payroll'
                    ? 'text-slate-900 border-b-2 border-indigo-600 font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                  }`}
              >
                Payroll
              </button>
              <button
                onClick={() => setMainTab('staff')}
                className={`px-4 py-3 transition-all cursor-pointer ${mainTab === 'staff'
                    ? 'text-slate-900 border-b-2 border-indigo-600 font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                  }`}
              >
                Staff Management
              </button>
            </div>
          )}
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
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

      {/* ── SELECTED STAFF OVERVIEW OR MAIN CONTENT ── */}
      {selectedStaffForOverview ? (
        <StaffOverviewView
          staff={selectedStaffForOverview}
          initialTab={overviewInitialTab}
          onBack={() => setSelectedStaffForOverview(null)}
          onUpdateStaff={(updated) => {
            setSelectedStaffForOverview(updated);
            setStaffList(getStaffMembers());
          }}
          onShowToast={triggerToast}
        />
      ) : (
        <>
          {/* ── SECTION 1: STAFF & ACCESS ── */}
          {mainTab === 'staff' && (
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
                          ? 'bg-white text-slate-900 shadow-xs'
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
                          ? 'bg-indigo-600 text-white shadow-xs'
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
                          ? 'bg-emerald-600 text-white shadow-xs'
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
                              <div className="text-[11px] text-slate-400 leading-tight mt-0.5">{staff.department}</div>
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

          {/* ── SECTION 2: PAYROLL TABS ── */}
          {mainTab === 'payroll' && (
            <div className="bg-white border-b border-slate-200 sticky top-[73px] z-10 shadow-xs">
              <div className="flex items-center text-sm font-semibold max-w-7xl mx-auto px-6">
                <button
                  onClick={() => setPayrollTab('attendance')}
                  className={`px-4 py-3 transition-all cursor-pointer ${payrollTab === 'attendance'
                      ? 'text-indigo-600 border-b-2 border-indigo-600 font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                    }`}
                >
                  Attendance
                </button>
                <button
                  onClick={() => setPayrollTab('team_leaves')}
                  className={`px-4 py-3 transition-all cursor-pointer ${payrollTab === 'team_leaves'
                      ? 'text-indigo-600 border-b-2 border-indigo-600 font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                    }`}
                >
                  Team Leaves
                </button>
                <button
                  onClick={() => setPayrollTab('my_leaves')}
                  className={`px-4 py-3 transition-all cursor-pointer ${payrollTab === 'my_leaves'
                      ? 'text-indigo-600 border-b-2 border-indigo-600 font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                    }`}
                >
                  My Leaves
                </button>
                <button
                  onClick={() => setPayrollTab('holidays')}
                  className={`px-4 py-3 transition-all cursor-pointer ${payrollTab === 'holidays'
                      ? 'text-indigo-600 border-b-2 border-indigo-600 font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                    }`}
                >
                  Holidays
                </button>
              </div>
            </div>
          )}

          {/* ── SECTION 2.1: ATTENDANCE ── */}
          {mainTab === 'payroll' && payrollTab === 'attendance' && (
            <div className="p-6 space-y-6 max-w-7xl mx-auto w-full animate-in fade-in duration-150">
              {/* Action Toolbar: Filter Pills + Search + Summary Counter + Add Staff Button */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                {/* Left Side: Category Pills + Active Filter + Department Filter */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setStaffCategoryFilter('ALL')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        staffCategoryFilter === 'ALL'
                          ? 'bg-white text-slate-900 shadow-xs'
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
                          ? 'bg-indigo-600 text-white shadow-xs'
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
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Site Staff ({departmentStaffList.filter(s => getStaffCategory(s) === 'SITE').length})
                    </button>
                  </div>

                  <div className="w-px h-5 bg-slate-200 mx-1 hidden sm:block"></div>

                  <div className="w-36">
                    <CustomSelect
                      value={attendanceActiveFilter}
                      onChange={(val: any) => setAttendanceActiveFilter(val)}
                      options={[{ label: 'Active Staff', value: 'active' }, { label: 'All Staff', value: 'all' }]}
                      variant="brand"
                      triggerClassName="h-9 px-3 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 shadow-2xs"
                    />
                  </div>

                  {isOverview && (
                    <div className="shrink-0">
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

                {/* Right Side: Search + Summary Stats + Add Staff Button */}
                <div className="flex flex-wrap items-center gap-3 justify-start lg:justify-end">
                  {/* Search Bar */}
                  <div className="relative w-full sm:w-56">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search Staff / Code..."
                      value={attendanceSearchQuery}
                      onChange={(e) => setAttendanceSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-7 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    {attendanceSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setAttendanceSearchQuery('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Attendance Stats Pill */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-right shrink-0">
                    <div className="text-xs font-bold text-slate-900">
                      {attendanceStats.present} Present / {attendanceStats.total} Total
                    </div>
                    <div className="text-[10px] font-medium text-slate-500 flex items-center justify-end gap-2 mt-0.5">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        {attendanceStats.absent} Absent
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span>
                        {attendanceStats.leave} Leave
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                        {attendanceStats.weekoff} Weekoff
                      </span>
                    </div>
                  </div>

                  {/* + Add Staff Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenAddStaffModal(staffCategoryFilter === 'SITE' ? 'SITE' : 'OFFICE')}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer hover:shadow-md shrink-0"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ Add {staffCategoryFilter === 'SITE' ? 'Site Staff' : staffCategoryFilter === 'OFFICE' ? 'Office Staff' : 'Staff'}</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                      <tr>
                        <th className="py-3.5 px-6">Staff Member</th>
                        <th className="py-3.5 px-6">Live Verification Photo</th>
                        <th className="py-3.5 px-6">Punch Time (In / Out)</th>
                        <th className="py-3.5 px-6">GPS Geofence Location</th>
                        <th className="py-3.5 px-6 text-right">Attendance Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendanceStaffList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                            No {staffCategoryFilter === 'SITE' ? 'site' : staffCategoryFilter === 'OFFICE' ? 'office' : ''} staff members found in {isOverview ? 'Booshnam Associates' : activeDept.name}.
                          </td>
                        </tr>
                      ) : (
                        attendanceStaffList.map((staff, idx) => {
                          const colors = ['bg-indigo-600', 'bg-purple-600', 'bg-blue-600', 'bg-indigo-800'];
                          const color = colors[idx % colors.length];
                          const staffRecord = attendanceRecords.find(r => r.staff_id === staff.id && r.date === getTodayDateString()) || getStaffLatestRecordToday(staff.id);

                          return (
                            <tr key={staff.id} className="hover:bg-slate-50 transition-colors group">
                              {/* 1. Staff Member Info */}
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full ${color} text-white font-bold flex items-center justify-center shrink-0 shadow-xs text-sm`}>
                                    {staff.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="font-semibold text-slate-800 text-sm cursor-pointer hover:text-indigo-600 transition-colors"
                                        onClick={() => handleOpenStaffOverview(staff, 'leave_dashboard')}
                                      >
                                        {staff.name}
                                      </span>
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                                        getStaffCategory(staff) === 'SITE'
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                      }`}>
                                        {getStaffCategory(staff) === 'SITE' ? 'Site' : 'Office'}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                                      <span className="tracking-tight text-slate-400">({staff.employee_code})</span>
                                      <span>•</span>
                                      <span>{staff.designation}</span>
                                      <span>•</span>
                                      <span className="text-slate-400">{staff.department}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                            {/* 2. Live Verification Photo */}
                            <td className="py-4 px-6">
                              {staffRecord?.verification_photo ? (
                                <div className="flex items-center gap-2.5">
                                  <div
                                    onClick={() => setViewPhotoRecord(staffRecord)}
                                    className="relative group/photo cursor-pointer shrink-0 w-11 h-11 rounded-lg overflow-hidden border-2 border-emerald-400 shadow-2xs hover:scale-105 transition-transform"
                                    title="Click to view full photo proof"
                                  >
                                    <img
                                      src={staffRecord.verification_photo}
                                      alt={`${staff.name} live punch`}
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                                      <Eye className="w-3.5 h-3.5 text-white" />
                                    </div>
                                  </div>
                                  <div>
                                    <button
                                      type="button"
                                      onClick={() => setViewPhotoRecord(staffRecord)}
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded transition cursor-pointer border border-emerald-200"
                                    >
                                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                      <span>Live Verified</span>
                                    </button>
                                    <div className="text-[10px] text-slate-400 mt-0.5">Click photo to view</div>
                                  </div>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 text-slate-400 border border-slate-200/80 rounded-lg text-[11px] font-medium">
                                  <Smartphone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>Punch via Mobile</span>
                                </div>
                              )}
                            </td>

                            {/* 3. Punch Time (In / Out) */}
                            <td className="py-4 px-6">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-xs tracking-tight">
                                  <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>In: {staffRecord?.clock_in_time || '--:--'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] tracking-tight">
                                  <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>Out: {staffRecord?.clock_out_time || (staffRecord ? 'On Duty (Active)' : '--:--')}</span>
                                </div>
                              </div>
                            </td>

                            {/* 4. GPS Geofence Location */}
                            <td className="py-4 px-6">
                              {staffRecord ? (
                                <div className="space-y-0.5">
                                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>
                                      {staffRecord.distance_from_site_meters}m from {
                                        (staffRecord.location_name && (staffRecord.location_name.toLowerCase().includes('office') || staffRecord.location_name.toLowerCase().includes('pammal')))
                                          ? 'Head Office'
                                          : 'Site'
                                      }
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-emerald-600 font-medium truncate max-w-[210px]" title={staffRecord.location_name || 'Geofence Verified'}>
                                    {(staffRecord.location_name && (staffRecord.location_name.toLowerCase().includes('pammal') || staffRecord.location_name.toLowerCase().includes('office')))
                                      ? 'Office Geofence (Pammal, Chennai)'
                                      : 'Inside Geofence Verified'}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-slate-400 text-xs flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-slate-300" />
                                  <span>Pending Check-in</span>
                                </div>
                              )}
                            </td>

                            {/* 5. Attendance Status & Actions */}
                            <td className="py-4 px-6">
                              <div className="flex items-center justify-end gap-2.5">
                                {/* Attendance Status Dropdown */}
                                <div
                                  className="relative"
                                  onMouseDown={(e) => e.stopPropagation()}
                                >
                                  {(() => {
                                    const status = getAttendanceStatus(staff.id);
                                    const opt = attendanceOptions.find(o => o.label === status) ?? attendanceOptions[0];
                                    return (
                                      <>
                                        <button
                                          type="button"
                                          onClick={(e) => handleToggleAttendanceDropdown(staff.id, e)}
                                          className={opt.bg + ' ' + opt.color + ' ' + opt.border + ' border px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer text-xs transition-colors hover:opacity-90'}
                                        >
                                          {status}
                                          <span className="text-[10px]">▼</span>
                                        </button>

                                        {openAttendanceDropdown === staff.id && dropdownPos && (
                                          <div
                                            className="fixed w-36 bg-white border border-slate-200 rounded-lg shadow-xl z-[9999] overflow-hidden"
                                            style={{ top: dropdownPos.top, right: dropdownPos.right }}
                                            onMouseDown={(e) => e.stopPropagation()}
                                          >
                                            {attendanceOptions.map((option) => (
                                              <button
                                                key={option.label}
                                                type="button"
                                                onClick={() => setAttendanceStatus(staff.id, option.label)}
                                                className={'w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 transition-colors hover:bg-slate-50 ' + (status === option.label ? option.bg + ' ' + option.color : 'text-slate-700')}
                                              >
                                                <span className={'w-2 h-2 rounded-full ' + option.bg.replace('100', '500')} />
                                                {option.label}
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>

                                <button
                                  onClick={() => handleOpenStaffOverview(staff, 'leave_dashboard')}
                                  title="Staff Profile & Leave Dashboard"
                                  className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors cursor-pointer"
                                >
                                  <ArrowRight className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── SECTION 2.2: TEAM LEAVES ── */}
          {mainTab === 'payroll' && payrollTab === 'team_leaves' && (
            <div className="p-6 max-w-7xl mx-auto w-full flex flex-col items-center justify-center h-64 text-slate-400 animate-in fade-in">
              <Calendar className="w-12 h-12 mb-4 opacity-20" />
              <p>Team Leaves view is under construction</p>
            </div>
          )}

          {/* ── SECTION 2.3: MY LEAVES ── */}
          {mainTab === 'payroll' && payrollTab === 'my_leaves' && (
            <div className="p-6 max-w-7xl mx-auto w-full flex flex-col items-center justify-center h-64 text-slate-400 animate-in fade-in">
              <User className="w-12 h-12 mb-4 opacity-20" />
              <p>My Leaves view is under construction</p>
            </div>
          )}

          {/* ── SECTION 2.4: HOLIDAYS ── */}
          {mainTab === 'payroll' && payrollTab === 'holidays' && (
            <HolidaysManager onShowToast={triggerToast} />
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
                      <button
                        type="button"
                        onClick={() => setNewStaffForm(prev => ({
                          ...prev,
                          staff_type: 'SITE',
                          role_code: 'SITE_ENGINEER',
                          designation: prev.designation === 'Office Administrator' ? 'Site Engineer' : (prev.designation || 'Site Engineer')
                        }))}
                        className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                          newStaffForm.staff_type === 'SITE'
                            ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          newStaffForm.staff_type === 'SITE' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <HardHat className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <div className="text-xs font-bold">Site Staff</div>
                          <div className="text-[10px] text-slate-500">Field Engineers & Supervisors</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setNewStaffForm(prev => ({
                          ...prev,
                          staff_type: 'OFFICE',
                          role_code: 'ADMIN',
                          designation: prev.designation === 'Site Engineer' ? 'Office Administrator' : (prev.designation || 'Office Administrator')
                        }))}
                        className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                          newStaffForm.staff_type === 'OFFICE'
                            ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          newStaffForm.staff_type === 'OFFICE' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <div className="text-xs font-bold">Office Staff</div>
                          <div className="text-[10px] text-slate-500">Administration & Desk Staff</div>
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

