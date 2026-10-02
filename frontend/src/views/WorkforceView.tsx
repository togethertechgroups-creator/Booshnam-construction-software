import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, User, MapPin, CheckCircle2, AlertTriangle, Shield,
  Clock, DollarSign, Plus, Check, Search, Calendar,
  UserPlus, Mail, Phone, Briefcase, Filter, X, Lock,
  Trash2, ArrowRight, ArrowLeft, ShieldCheck, Sparkles, Building2, Info,
  Camera, Eye
} from 'lucide-react';
import { Project, Worker, AttendanceRecord } from '../types';
import { UserProfileDropdown } from '../components/UserProfileDropdown';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { CustomSelect } from '../components/CustomSelect';
import {
  getStaffMembers,
  saveStaffMember,
  deleteStaffMember,
  StaffMember,
  getStaffAllocatedProjects,
  toggleStaffProjectAllocation
} from '../lib/staffService';
import { confirmAction, setFormDirty, clearFormDirty } from '../lib/dialogService';
import { MOCK_ROLES } from '../lib/mockData';
import { StaffOverviewView } from '../components/StaffOverviewView';
import { getStoredRolePermissions, ALL_SYSTEM_MODULES } from '../lib/roleAccess';
import { saveUserAccount, UserAccount } from '../lib/authService';
import { LivePhotoAttendanceModal } from '../components/LivePhotoAttendanceModal';
import { LivePhotoViewModal } from '../components/LivePhotoViewModal';
import {
  getAllStaffAttendanceRecords,
  getStaffLatestRecordToday,
  updateStaffAttendanceStatus,
  StaffAttendanceRecord,
  getTodayDateString
} from '../lib/staffAttendanceService';


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
  const [payrollTab, setPayrollTab] = useState<'attendance' | 'team_leaves' | 'my_leaves' | 'holidays'>('attendance');
  const [staffList, setStaffList] = useState<StaffMember[]>(() => getStaffMembers());
  const [searchStaffQuery, setSearchStaffQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [selectedStaffForOverview, setSelectedStaffForOverview] = useState<StaffMember | null>(null);
  const [overviewInitialTab, setOverviewInitialTab] = useState<'details' | 'access' | 'leave_dashboard'>('details');
  const [selectedStaffForProjectModal, setSelectedStaffForProjectModal] = useState<StaffMember | null>(null);

  // Live Photo Punch & Verification Modals State
  const [isPunchModalOpen, setIsPunchModalOpen] = useState(false);
  const [punchModalStaffId, setPunchModalStaffId] = useState<string | undefined>(undefined);
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

  // New Staff Form State & Wizard State
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [staffPassword, setStaffPassword] = useState('');
  const [staffConfirmPassword, setStaffConfirmPassword] = useState('');
  const [newStaffForm, setNewStaffForm] = useState({
    name: '',
    role_code: 'SITE_ENGINEER',
    department: 'Soil Investigation',
    designation: 'Site Engineer',
    dob: '1995-05-15',
    doj: new Date().toISOString().split('T')[0],
    phone: '',
    email: '',
    employment_type: 'Full-time' as 'Full-time' | 'Contract' | 'Part-time',
    salary: 45000,
    salary_type: 'Month' as 'Month' | 'Day'
  });

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
    setWizardStep(1);
    setStaffPassword('');
    setStaffConfirmPassword('');
    setSelectedPages([]);
  };

  const handleNextStep = () => {
    if (wizardStep === 1) {
      if (!newStaffForm.name.trim()) return triggerToast('Please enter staff full name');
      if (!newStaffForm.phone || newStaffForm.phone.length !== 10) return triggerToast('Phone number must be exactly 10 digits (used for login)');
      if (newStaffForm.email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(newStaffForm.email.trim())) {
        return triggerToast('Invalid email format');
      }

      // Initialize selected pages based on the default role if not already set
      if (selectedPages.length === 0) {
        const rolesMap = getStoredRolePermissions();
        if (rolesMap[newStaffForm.role_code]) {
          setSelectedPages(rolesMap[newStaffForm.role_code].allowedPages);
        }
      }

      setWizardStep(2);
    } else if (wizardStep === 2) {
      if (!newStaffForm.role_code) return triggerToast('Please select a role');
      setWizardStep(3);
    } else if (wizardStep === 3) {
      setWizardStep(4);
    }
  };

  const handleCreateStaff = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (wizardStep < 4) {
      handleNextStep();
      return;
    }

    // Step 4 validations
    if (staffPassword.length < 4) {
      triggerToast('Password must be at least 4 characters');
      return;
    }
    if (staffPassword !== staffConfirmPassword) {
      triggerToast('Passwords do not match');
      return;
    }

    const rolesMap = getStoredRolePermissions();
    const roleObj = rolesMap[newStaffForm.role_code] || { roleName: newStaffForm.role_code };
    const generatedCode = `EMP-0${100 + staffList.length + 1}`;

    const newStaff: StaffMember = {
      id: `emp-${Date.now()}`,
      employee_code: generatedCode,
      name: newStaffForm.name.trim(),
      role_code: newStaffForm.role_code,
      role_name: roleObj.roleName || newStaffForm.role_code,
      department: newStaffForm.department,
      designation: newStaffForm.designation || roleObj.roleName || newStaffForm.role_code,
      dob: newStaffForm.dob,
      doj: newStaffForm.doj,
      phone: newStaffForm.phone,
      email: newStaffForm.email || `${newStaffForm.name.toLowerCase().replace(/\s+/g, '.')}@booshnam.com`,
      employment_type: newStaffForm.employment_type,
      salary: Number(newStaffForm.salary) || 40000,
      salary_type: newStaffForm.salary_type,
      status: 'ACTIVE',
      has_login_account: true, // we are creating one now
      created_at: new Date().toISOString().split('T')[0]
    };

    const confirmed = await confirmAction({
      title: 'Create Staff & Login Account',
      message: `Create account for "${newStaff.name}"\nThey will log in using phone: ${newStaff.phone}`,
      confirmText: 'Save Staff',
      cancelText: 'Cancel',
      variant: 'primary',
      icon: 'info'
    });
    if (!confirmed) return;

    saveStaffMember(newStaff);

    // Create user account
    const newAccount: UserAccount = {
      id: `usr-${Date.now()}`,
      username: newStaff.phone, // Login using phone number
      phone: newStaff.phone,
      password: staffPassword,
      staff_id: newStaff.id,
      staff_name: newStaff.name,
      staff_code: newStaff.employee_code,
      role_code: newStaff.role_code,
      role_name: newStaff.role_name,
      department: newStaff.department,
      allowedPages: selectedPages,
      created_at: new Date().toISOString().split('T')[0]
    };
    saveUserAccount(newAccount);

    clearFormDirty();
    setShowAddStaffModal(false);
    setWizardStep(1);
    setStaffPassword('');
    setStaffConfirmPassword('');
    setSelectedPages([]);
    setNewStaffForm({
      name: '',
      role_code: 'SITE_ENGINEER',
      department: 'Civil Construction',
      designation: 'Site Engineer',
      dob: '1995-05-15',
      doj: new Date().toISOString().split('T')[0],
      phone: '',
      email: '',
      employment_type: 'Full-time',
      salary: 45000,
      salary_type: 'Month'
    });
    triggerToast(`Staff "${newStaff.name}" added successfully!`);
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
      triggerToast(`Staff "${name}" removed successfully`);
    }
  };

  const filteredStaff = staffList.filter(s => {
    const matchesQuery =
      s.name.toLowerCase().includes(searchStaffQuery.toLowerCase()) ||
      s.employee_code.toLowerCase().includes(searchStaffQuery.toLowerCase()) ||
      s.department.toLowerCase().includes(searchStaffQuery.toLowerCase()) ||
      s.designation.toLowerCase().includes(searchStaffQuery.toLowerCase());
    const matchesRole = selectedRoleFilter === 'ALL' || s.role_code === selectedRoleFilter;
    return matchesQuery && matchesRole;
  });

  const totalPresent = attendance.filter(a => a.status !== 'ABSENT').length;
  const insideGeofenceCount = attendance.filter(a => a.is_inside_geofence).length;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 pb-16">
      {/* Top Header Bar */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white sticky top-0 z-10 shadow-2xs">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              {selectedStaffForOverview ? (
                <button
                  type="button"
                  onClick={() => setSelectedStaffForOverview(null)}
                  className="mr-2 p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer transition-colors flex items-center shadow-xs bg-white"
                  title="Back to Directory"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              ) : (
                <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-black rounded uppercase tracking-wider">
                  SITE WORKFORCE
                </span>
              )}
              <h1 className="text-xl font-bold text-slate-900">
                {selectedStaffForOverview ? `Staff Profile: ${selectedStaffForOverview.name}` : "Staff & Payroll Management"}
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage office and site staff profiles, biometric GPS geofence clock-ins, and salary batches.
            </p>
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
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Enrolled Staff</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">{staffList.length}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Civil, Architecture & Operations</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Site Workforce</div>
                  <div className="text-2xl font-black text-emerald-700 mt-1">
                    {staffList.filter(s => s.role_code === 'SITE_ENGINEER' || s.role_code === 'SUPERVISOR').length} On Site
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Engineers & Supervisors</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Office & Administration</div>
                  <div className="text-2xl font-black text-red-700 mt-1">
                    {staffList.filter(s => s.role_code === 'ADMIN' || s.role_code === 'ACCOUNTS' || s.role_code === 'ARCHITECT').length} Staff
                  </div>
                  <div className="text-[10px] text-red-600 font-medium mt-0.5">Admin, Design & Accounts</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Workspace Access</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {staffList.filter(s => s.has_login_account).length} / {staffList.length} Active
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Configured via Roles & Access</div>
                </div>
              </div>

              {/* Action Header: Search + Filter + Add Staff Button */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
                  {/* Search Bar */}
                  <div className="relative flex-1 w-full sm:max-w-md">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search staff by name, code, designation, department..."
                      value={searchStaffQuery}
                      onChange={(e) => setSearchStaffQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                    {searchStaffQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchStaffQuery('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Role Filter */}
                  <div className="w-full sm:w-52">
                    <CustomSelect
                      value={selectedRoleFilter}
                      onChange={(val) => setSelectedRoleFilter(val)}
                      options={[
                        { label: `All Roles (${staffList.length})`, value: 'ALL' },
                        ...MOCK_ROLES.map(r => ({
                          label: r.name,
                          value: r.code
                        }))
                      ]}
                      variant="brand"
                      triggerClassName="h-9 px-3 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 shadow-2xs"
                    />
                  </div>
                </div>

                {/* + Add Staff Button */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddStaffModal(true)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer hover:shadow-md"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add Staff</span>
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
                            <td className="py-4 px-6 font-mono text-slate-700 whitespace-nowrap align-middle">
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
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-full shadow-xs">Office Staff</button>
                  <button className="px-3 py-1.5 bg-white text-indigo-600 border border-slate-200 text-xs font-semibold rounded-full hover:bg-slate-50">Site Staff</button>
                  <div className="w-px h-4 bg-slate-300 mx-1"></div>
                  <CustomSelect
                    value="active"
                    onChange={() => { }}
                    options={[{ label: 'Active Staff', value: 'active' }, { label: 'All Staff', value: 'all' }]}
                    triggerClassName="text-xs font-semibold text-indigo-600 border-none bg-transparent hover:bg-slate-50 px-2 rounded"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPunchModalStaffId(undefined);
                      setIsPunchModalOpen(true);
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shadow-emerald-600/20 transition cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Punch Attendance (Live Photo)</span>
                  </button>

                  <div className="relative w-56 hidden sm:block">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search Staff / Code..."
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="text-right ml-2">
                    <div className="text-sm font-bold text-slate-900">
                      {staffList.filter(s => {
                        const st = getAttendanceStatus(s.id);
                        return st === 'Present' || st === 'Late' || st === 'Half-day' || st === 'Overtime';
                      }).length} Present / {staffList.length} Total
                    </div>
                    <div className="text-[10px] font-medium text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-red-400 rounded-sm"></span>
                        {staffList.filter(s => getAttendanceStatus(s.id) === 'Absent').length} Absent
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-teal-500 rounded-sm"></span>
                        {staffList.filter(s => getAttendanceStatus(s.id) === 'Paid Leave').length} Leave
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-sm"></span>
                        {staffList.filter(s => getAttendanceStatus(s.id) === 'Weekoff').length} Weekoff
                      </span>
                    </div>
                  </div>
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
                      {staffList.map((staff, idx) => {
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
                                  <div
                                    className="font-semibold text-slate-800 text-sm cursor-pointer hover:text-indigo-600 transition-colors"
                                    onClick={() => handleOpenStaffOverview(staff, 'leave_dashboard')}
                                  >
                                    {staff.name}
                                  </div>
                                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                    <span className="font-mono text-slate-400">({staff.employee_code})</span>
                                    <span>•</span>
                                    <span>{staff.designation}</span>
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
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPunchModalStaffId(staff.id);
                                    setIsPunchModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                                >
                                  <Camera className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Punch Live Selfie</span>
                                </button>
                              )}
                            </td>

                            {/* 3. Punch Time (In / Out) */}
                            <td className="py-4 px-6">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-xs font-mono">
                                  <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>In: {staffRecord?.clock_in_time || '--:--'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-mono">
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
                                    <span>{staffRecord.distance_from_site_meters}m from site</span>
                                  </div>
                                  <div className="text-[10px] text-emerald-600 font-medium">
                                    Inside Geofence Verified
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
                                {/* Quick Punch button for this specific staff */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPunchModalStaffId(staff.id);
                                    setIsPunchModalOpen(true);
                                  }}
                                  title="Punch with live photo"
                                  className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
                                >
                                  <Camera className="w-4 h-4" />
                                </button>

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
                      })}
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
            <div className="p-6 max-w-7xl mx-auto w-full flex flex-col items-center justify-center h-64 text-slate-400 animate-in fade-in">
              <Sparkles className="w-12 h-12 mb-4 opacity-20" />
              <p>Holidays view is under construction</p>
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
                <p className="text-[11px] text-slate-500">
                  Step {wizardStep} of 4
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  {wizardStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setWizardStep(prev => prev - 1)}
                      className="text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                  )}
                  {wizardStep < 4 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Next</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCreateStaff}
                      className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Staff</span>
                    </button>
                  )}
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
            <div className="h-1 bg-red-600 w-full" style={{ width: `${(wizardStep / 4) * 100}%`, transition: 'width 0.3s ease' }} />

            {/* Modal Form Content */}
            <div className="p-6 md:p-8 space-y-4 flex-1 overflow-y-auto max-h-[75vh]">
              {wizardStep === 1 && (
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleNextStep(); }}>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Department
                      </label>
                      <CustomSelect
                        value={newStaffForm.department}
                        onChange={(val) => setNewStaffForm({ ...newStaffForm, department: val })}
                        options={[
                          { label: 'Soil Investigation', value: 'Soil Investigation' },
                          { label: 'Material Testing', value: 'Material Testing' },
                          { label: 'Surveying', value: 'Surveying' },
                          { label: 'Structural', value: 'Structural' },
                          { label: 'Architectural', value: 'Architectural' },
                          { label: 'Sculpture', value: 'Sculpture' },
                          { label: 'Construction (All)', value: 'Construction (All)' },
                          { label: 'Coimbatore – Soil Investigation', value: 'Coimbatore – Soil Investigation' },
                          { label: 'Coimbatore – Material Testing', value: 'Coimbatore – Material Testing' },
                        ]}
                        variant="brand"
                        triggerClassName="h-11 px-3.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:border-red-500"
                      />
                    </div>
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
                          <span className={`text-[10px] font-mono font-bold ${newStaffForm.phone.length === 10 ? 'text-green-600' : 'text-amber-600'}`}>
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
                  <button type="submit" className="hidden">Next</button>
                </form>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Select Staff Role</h3>
                  <p className="text-xs text-slate-500 mb-4">Choose the primary role. This determines their default page access, which you can customize in the next step.</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.values(getStoredRolePermissions()).map(role => (
                      <div
                        key={role.roleCode}
                        onClick={() => {
                          setNewStaffForm({ ...newStaffForm, role_code: role.roleCode });
                          setSelectedPages(role.allowedPages);
                        }}
                        className={`p-4 border rounded-xl cursor-pointer transition-all ${newStaffForm.role_code === role.roleCode
                            ? 'border-red-500 bg-red-50 shadow-sm'
                            : 'border-slate-200 hover:border-red-200 hover:bg-red-50/50'
                          }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm text-slate-900">{role.roleName}</span>
                          {newStaffForm.role_code === role.roleCode && <CheckCircle2 className="w-4 h-4 text-red-600" />}
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">{role.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Page Permissions</h3>
                  <p className="text-xs text-slate-500 mb-4">
                    The following pages are recommended for the <strong>{getStoredRolePermissions()[newStaffForm.role_code]?.roleName || newStaffForm.role_code}</strong> role. You can check or uncheck modules to customize access for {newStaffForm.name}.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ALL_SYSTEM_MODULES.map(module => (
                      <label
                        key={module.id}
                        className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${selectedPages.includes(module.id) ? 'bg-red-50/50 border-red-200' : 'bg-white border-slate-200 hover:border-red-200 hover:bg-red-50/30'
                          }`}
                      >
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            checked={selectedPages.includes(module.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedPages([...selectedPages, module.id]);
                              else setSelectedPages(selectedPages.filter(id => id !== module.id));
                            }}
                            className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300 cursor-pointer"
                          />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">{module.name}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{module.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Setup Login Credentials</h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Configure login credentials for {newStaffForm.name}. They will log in using their mobile number.
                  </p>

                  <div className="space-y-4 max-w-sm">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Username (Mobile Number)</label>
                      <input
                        type="text"
                        value={newStaffForm.phone}
                        readOnly
                        className="w-full h-11 px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Create Password *</label>
                      <input
                        type="password"
                        placeholder="Enter a secure password"
                        value={staffPassword}
                        onChange={(e) => setStaffPassword(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-lg border border-slate-200 text-xs font-medium focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password *</label>
                      <input
                        type="password"
                        placeholder="Re-enter password"
                        value={staffConfirmPassword}
                        onChange={(e) => setStaffConfirmPassword(e.target.value)}
                        className={`w-full h-11 px-3.5 rounded-lg border text-xs font-medium focus:border-red-500 ${staffConfirmPassword && staffPassword !== staffConfirmPassword ? 'border-red-500 bg-red-50' : 'border-slate-200'
                          }`}
                      />
                      {staffConfirmPassword && staffPassword !== staffConfirmPassword && (
                        <p className="text-[10px] text-red-600 mt-1">Passwords do not match.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
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

      {/* ── MODAL: LIVE PHOTO ATTENDANCE PUNCH ── */}
      <LivePhotoAttendanceModal
        isOpen={isPunchModalOpen}
        onClose={() => setIsPunchModalOpen(false)}
        staffList={staffList}
        initialStaffId={punchModalStaffId}
        onSuccess={(msg) => triggerToast(msg)}
      />

      {/* ── MODAL: LIVE PHOTO PROOF VIEWER ── */}
      <LivePhotoViewModal
        record={viewPhotoRecord}
        onClose={() => setViewPhotoRecord(null)}
        onRecapture={(staffId) => {
          setViewPhotoRecord(null);
          setPunchModalStaffId(staffId);
          setIsPunchModalOpen(true);
        }}
      />
    </div>
  );
};

