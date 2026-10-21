import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowLeft, Check, CheckCircle2, Lock, Eye, RefreshCw,
  LayoutGrid, Home, Layers, ListTodo, UserCheck, Users, 
  CreditCard, ShoppingCart, Truck, BookOpen, FileText, 
  Settings, Shield, ArrowRight, Calendar, 
  Phone, Mail, Briefcase, Building2, AlertCircle,
  Download, X, Image as ImageIcon, ChevronDown, ChevronLeft, ChevronRight,
  ShieldCheck, Smartphone, CheckCircle, Clock, MapPin, Plus, FileSpreadsheet,
  Gift, Bell, User
} from 'lucide-react';
import { 
  StaffMember, 
  saveStaffMember, 
  markStaffLoginCreated,
  getStaffAllocatedProjects,
  toggleStaffProjectAllocation
} from '../lib/staffService';
import { ALL_SYSTEM_MODULES, DEFAULT_ROLE_PERMISSIONS } from '../lib/roleAccess';
import { getUserAccounts, saveUserAccount } from '../lib/authService';
import { MOCK_ROLES } from '../lib/mockData';
import { confirmAction } from '../lib/dialogService';
import { 
  exportPayslipToPDF, 
  exportPayslipToWord, 
  exportPayslipToPNG 
} from '../lib/payslipExportService';
import { 
  getAllStaffAttendanceRecords, 
  saveStaffAttendancePunch, 
  updateStaffAttendanceStatus,
  formatTime12h,
  getTodayDateString,
  StaffAttendanceRecord
} from '../lib/staffAttendanceService';

interface StaffOverviewViewProps {
  staff: StaffMember;
  initialTab?: 'people' | 'attendance' | 'team_leaves' | 'my_leaves' | 'holidays' | 'details' | 'access' | 'leave_dashboard';
  onBack: () => void;
  onNavigateTab?: (tab: 'people' | 'attendance' | 'team_leaves' | 'my_leaves' | 'holidays') => void;
  onUpdateStaff: (updated: StaffMember) => void;
  onShowToast: (msg: string) => void;
  allStaff?: StaffMember[];
  onSelectStaff?: (staff: StaffMember) => void;
}

import { Loader } from './kokonutui/loader';

export const StaffOverviewView: React.FC<StaffOverviewViewProps> = ({
  staff,
  initialTab = 'attendance',
  onBack,
  onNavigateTab,
  onUpdateStaff,
  onShowToast,
  allStaff = [],
  onSelectStaff
}) => {
  // Normalize initial tab: default to 'attendance'
  const normalizedInitial = (initialTab === 'leave_dashboard' || !initialTab || initialTab === 'people') ? 'attendance' : initialTab;
  const [activeTab, setActiveTab] = useState<'people' | 'attendance' | 'team_leaves' | 'my_leaves' | 'holidays' | 'details' | 'access'>(normalizedInitial);

  // 2-second initial loading state for Kokonut UI loader animation
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  useEffect(() => {
    setIsProfileLoading(true);
    const timer = setTimeout(() => {
      setIsProfileLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [staff.id]);

  // Selected Month (Default: '2026-10' as in user reference image)
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(9); // 0-indexed: 9 = October
  const [showFullSheet, setShowFullSheet] = useState<boolean>(false);

  // Dropdowns state
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isSalaryBreakupModalOpen, setIsSalaryBreakupModalOpen] = useState(false);
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);

  // Apply Leave Modal state
  const [isApplyLeaveOpen, setIsApplyLeaveOpen] = useState(false);
  const [newLeaveType, setNewLeaveType] = useState<'Casual' | 'Sick' | 'Earned'>('Casual');
  const [newLeaveStartDate, setNewLeaveStartDate] = useState('2026-10-15');
  const [newLeaveEndDate, setNewLeaveEndDate] = useState('2026-10-16');
  const [newLeaveReason, setNewLeaveReason] = useState('');

  // Attendance Records state & sync
  const [attendanceRecords, setAttendanceRecords] = useState<StaffAttendanceRecord[]>(() => getAllStaffAttendanceRecords());

  useEffect(() => {
    const handleUpdate = () => {
      setAttendanceRecords(getAllStaffAttendanceRecords());
    };
    window.addEventListener('booshnam_staff_attendance_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('booshnam_staff_attendance_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const downloadRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target as Node)) {
        setIsDownloadOpen(false);
      }
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Month navigation helpers
  const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthNamesLong = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const currentMonthShort = monthNamesShort[selectedMonthIndex];
  const currentMonthCode = `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, '0')}`;

  const handlePrevMonth = () => {
    if (selectedMonthIndex === 0) {
      setSelectedMonthIndex(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonthIndex(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonthIndex === 11) {
      setSelectedMonthIndex(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonthIndex(prev => prev + 1);
    }
  };

  // Days in selected month
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();
  }, [selectedYear, selectedMonthIndex]);

  // Attendance statistics for selected month
  const monthStats = useMemo(() => {
    const staffRecordsForMonth = attendanceRecords.filter(
      r => r.staff_id === staff.id && r.date.startsWith(currentMonthCode)
    );

    const present = staffRecordsForMonth.filter(
      r => r.status === 'Present' || r.status === 'Late' || r.status === 'Overtime'
    ).length;

    const halfDays = staffRecordsForMonth.filter(r => r.status === 'Half-day').length;
    const effectivePresent = present + (halfDays * 0.5);

    const absent = staffRecordsForMonth.filter(r => r.status === 'Absent').length;

    // Paid Leaves (PL) and Week Offs (WO)
    const pl = staffRecordsForMonth.filter(r => r.status === 'Paid Leave').length;
    const wo = staffRecordsForMonth.filter(r => r.status === 'Weekoff').length;

    const salary = Number(staff.salary || 10000);
    const dailyRate = salary / daysInMonth;

    // Total Paid Days: Present + PL + WO
    const totalPaidDays = effectivePresent + pl + wo;
    const amount = totalPaidDays > 0 ? (totalPaidDays * dailyRate) : 0;

    return {
      records: staffRecordsForMonth,
      present: effectivePresent,
      absent,
      pl,
      wo,
      amount,
      dailyRate
    };
  }, [attendanceRecords, staff.id, staff.salary, currentMonthCode, daysInMonth, selectedYear, selectedMonthIndex]);

  const [openRowStatusDropdown, setOpenRowStatusDropdown] = useState<string | null>(null);
  const [selectedDayRecordForDetail, setSelectedDayRecordForDetail] = useState<any | null>(null);

  const displayRows = useMemo(() => {
    const records = attendanceRecords.filter(
      r => r.staff_id === staff.id && r.date.startsWith(currentMonthCode)
    );

    if (records.length > 0) {
      return [...records].sort((a, b) => b.date.localeCompare(a.date)).map(rec => {
        const [y, m, d] = rec.date.split('-').map(Number);
        const dayDate = new Date(y, m - 1, d);
        const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
        const monthShort = dayDate.toLocaleDateString('en-US', { month: 'short' });
        return {
          dateStr: rec.date,
          dayFormatted: `${d} ${monthShort}, ${dayName}`,
          entryBy: 'Sofia Margret',
          dailyAmount: monthStats.dailyRate,
          shift: '1 Shift',
          status: rec.status,
          record: rec
        };
      });
    }

    const rows = [];
    const maxDay = (selectedYear === 2026 && selectedMonthIndex === 9) ? 18 : daysInMonth;
    for (let dayNum = maxDay; dayNum >= 1; dayNum--) {
      const dateStr = `${currentMonthCode}-${String(dayNum).padStart(2, '0')}`;
      const dayDate = new Date(selectedYear, selectedMonthIndex, dayNum);
      const isSunday = dayDate.getDay() === 0;
      const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
      const monthShort = dayDate.toLocaleDateString('en-US', { month: 'short' });
      rows.push({
        dateStr,
        dayFormatted: `${dayNum} ${monthShort}, ${dayName}`,
        entryBy: 'Sofia Margret',
        dailyAmount: monthStats.dailyRate,
        shift: '1 Shift',
        status: isSunday ? 'Weekoff' : 'Present',
        record: undefined
      });
    }
    return rows;
  }, [attendanceRecords, staff.id, currentMonthCode, daysInMonth, selectedYear, selectedMonthIndex, monthStats.dailyRate]);

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case 'Present':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200/70';
      case 'Weekoff':
        return 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-2xs';
      case 'Absent':
        return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200/70';
      case 'Paid Leave':
        return 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200/70';
      case 'Half-day':
        return 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200/70';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Fast Attendance Marking on any calendar day
  const handleMarkDayAttendance = (dayNum: number, status: 'Present' | 'Late' | 'Half-day' | 'Overtime' | 'Absent') => {
    const dateStr = `${currentMonthCode}-${String(dayNum).padStart(2, '0')}`;
    updateStaffAttendanceStatus(staff.id, status, dateStr);
    onShowToast(`Marked ${status} for ${dateStr}`);
  };

  // Tab 1 & Tab 2 (Details & System Access states preserved)
  const [detailsForm, setDetailsForm] = useState({
    name: staff.name,
    employee_code: staff.employee_code,
    department: staff.department,
    designation: staff.designation,
    role_code: staff.role_code,
    dob: staff.dob || '1995-01-01',
    doj: staff.doj || '2024-01-01',
    phone: staff.phone || '',
    email: staff.email || '',
    employment_type: staff.employment_type || 'Full-time',
    salary: staff.salary || 33000,
    salary_type: staff.salary_type || 'Month'
  });

  const [allowedPages, setAllowedPages] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [accessStep, setAccessStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('password123');
  const [confirmPassword, setConfirmPassword] = useState<string>('password123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [existingAccountId, setExistingAccountId] = useState<string | null>(null);

  useEffect(() => {
    const accounts = getUserAccounts();
    const existing = accounts.find(
      a => a.staff_id === staff.id ||
      (staff.username && a.username.toLowerCase() === staff.username.toLowerCase()) ||
      a.username.toLowerCase() === staff.name.toLowerCase().replace(/[^a-z0-9]/g, '.')
    );

    if (existing) {
      setExistingAccountId(existing.id);
      setAllowedPages(existing.allowedPages || []);
      setUsername(existing.username);
      setPassword(existing.password || 'password123');
      setConfirmPassword(existing.password || 'password123');
    } else {
      setExistingAccountId(null);
      const rolePerm = DEFAULT_ROLE_PERMISSIONS[staff.role_code];
      setAllowedPages(rolePerm ? rolePerm.allowedPages : ['projects', 'site_ops', 'documents']);
      const suggestedUsername = staff.username || staff.name.toLowerCase().replace(/[^a-z0-9]/g, '.');
      setUsername(suggestedUsername);
      setPassword('password123');
      setConfirmPassword('password123');
    }
  }, [staff]);

  const [projectRefreshTrigger, setProjectRefreshTrigger] = useState(0);

  const allProjects = useMemo(() => {
    try {
      const raw = localStorage.getItem('booshnam_projects_v2');
      if (raw) {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) {
          return p.filter((x: any) => 
            !x.id?.startsWith('proj-') &&
            !['Prestige Boulevard', 'Royal Palm', 'Green Valley', 'Sunrise Industrial'].some(t => (x.name || x.title || '').includes(t))
          );
        }
      }
    } catch (e) {}
    return [];
  }, [projectRefreshTrigger]);

  const alloc = useMemo(() => {
    return getStaffAllocatedProjects(staff.name, staff.role_code);
  }, [staff.name, staff.role_code, projectRefreshTrigger]);

  // Handlers for Tab 1: Staff Details Form
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailsForm.name.trim()) {
      onShowToast('Staff name is required');
      return;
    }

    const roleObj = MOCK_ROLES.find(r => r.code === detailsForm.role_code) || { name: detailsForm.role_code };
    const updated: StaffMember = {
      ...staff,
      name: detailsForm.name.trim(),
      employee_code: detailsForm.employee_code.trim(),
      department: detailsForm.department.trim(),
      designation: detailsForm.designation.trim(),
      role_code: detailsForm.role_code,
      role_name: roleObj.name,
      dob: detailsForm.dob,
      doj: detailsForm.doj,
      phone: detailsForm.phone.trim(),
      email: detailsForm.email.trim(),
      employment_type: detailsForm.employment_type as 'Full-time' | 'Contract' | 'Part-time',
      salary: Number(detailsForm.salary) || 33000,
      salary_type: detailsForm.salary_type as 'Month' | 'Day'
    };

    saveStaffMember(updated);
    onUpdateStaff(updated);
    onShowToast(`Staff profile for "${updated.name}" updated successfully!`);
    setActiveTab('people');
  };

  const handleToggleModule = (modId: string) => {
    setAllowedPages(prev =>
      prev.includes(modId) ? prev.filter(id => id !== modId) : [...prev, modId]
    );
  };

  const handleSaveAccessAndCredentials = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim()) {
      onShowToast('Please enter a username for this staff member');
      return;
    }
    const cleanUsername = username.toLowerCase().trim().replace(/\s+/g, '');
    const cleanEmail = staff.email || `${cleanUsername}@booshnam.com`;

    saveUserAccount({
      id: existingAccountId || `acc-${Date.now()}`,
      username: cleanUsername,
      password: password,
      phone: staff.phone,
      role_code: staff.role_code,
      role_name: staff.role_name || staff.designation,
      staff_name: staff.name,
      staff_code: staff.employee_code,
      department: staff.department,
      allowedPages: allowedPages,
      staff_id: staff.id,
      created_at: new Date().toISOString()
    });

    markStaffLoginCreated(staff.id, cleanUsername);
    onUpdateStaff({
      ...staff,
      has_login_account: true,
      username: cleanUsername
    });

    onShowToast(`Workspace credentials updated for ${staff.name}! (Username: ${cleanUsername})`);
    setActiveTab('people');
  };

  // Staff Initials for Avatar
  const staffInitials = useMemo(() => {
    const parts = staff.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return staff.name.substring(0, 2).toUpperCase();
  }, [staff.name]);

  // Salary calculations
  const monthlySalary = Number(staff.salary || 33000);
  const basicSalary = Math.round(monthlySalary * 0.5);
  const hra = Math.round(monthlySalary * 0.2);
  const conveyance = Math.round(monthlySalary * 0.1);
  const specialAllowance = monthlySalary - (basicSalary + hra + conveyance);
  const pfDeduction = Math.round(basicSalary * 0.12);
  const netTakeHome = monthlySalary - pfDeduction;

  if (isProfileLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[75vh] bg-white animate-in fade-in duration-200">
        <Loader
          size="lg"
          title={`Loading ${staff.name}'s Profile...`}
          subtitle="Fetching attendance records, salary breakup and leaves"
          className="text-red-600"
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white min-h-screen">
      {/* ══════════════════════════════════════════════════════════════════
          1. TOP APP BAR (MATCHING USER REFERENCE IMAGE)
          Payroll      [Book Demo] [Integrate Tally/Zoho] [Refer & Earn] Leaderboard (🔔) (👤)
         ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white border-b border-slate-100 px-6 sm:px-8 py-3.5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Payroll</h1>

        <div className="flex items-center gap-5 sm:gap-6 text-xs">
          <button
            type="button"
            onClick={() => onShowToast('Book Demo scheduled with product specialist')}
            className="text-purple-700 hover:text-purple-900 font-medium flex items-center gap-1.5 transition cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-600" />
            <span>Book Demo</span>
          </button>
          <button
            type="button"
            onClick={() => onShowToast('Tally / Zoho integration sync active')}
            className="text-purple-700 hover:text-purple-900 font-medium flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-purple-600" />
            <span>Integrate Tally/Zoho</span>
          </button>
          <button
            type="button"
            onClick={() => onShowToast('Referral program link copied!')}
            className="text-purple-700 hover:text-purple-900 font-medium flex items-center gap-1.5 transition cursor-pointer"
          >
            <Gift className="w-3.5 h-3.5 text-purple-600" />
            <span>Refer & Earn</span>
          </button>
          <button
            type="button"
            onClick={() => onShowToast('Staff Leaderboard opened')}
            className="text-slate-700 hover:text-slate-900 font-medium transition cursor-pointer hidden sm:block"
          >
            Leaderboard
          </button>
          <div className="relative cursor-pointer" onClick={() => onShowToast('No unread payroll notifications')}>
            <Bell className="w-4 h-4 text-slate-700 hover:text-slate-900 transition" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red-500" />
          </div>
          <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-2xs select-none">
            <User className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          2. NAVIGATION TABS (MATCHING USER REFERENCE IMAGE)
          People   Attendance (active)   Team Leaves   My Leaves   Holidays
         ══════════════════════════════════════════════════════════════════ */}
      <div className="border-b border-slate-200/80 px-6 sm:px-8 bg-white flex items-center justify-between">
        <div className="flex items-center gap-6 sm:gap-8 overflow-x-auto text-sm font-semibold">
          <button
            type="button"
            onClick={() => {
              if (onNavigateTab) onNavigateTab('people');
              else onBack();
            }}
            className="py-3 px-1 transition-all cursor-pointer whitespace-nowrap text-slate-600 hover:text-slate-900 border-b-2 border-transparent font-medium"
          >
            People
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`py-3 px-1 transition-all cursor-pointer whitespace-nowrap border-b-2 font-bold ${
              activeTab === 'attendance'
                ? 'text-[#5833ea] border-[#5833ea]'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            Attendance
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('team_leaves')}
            className={`py-3 px-1 transition-all cursor-pointer whitespace-nowrap border-b-2 font-medium ${
              activeTab === 'team_leaves'
                ? 'text-[#5833ea] border-[#5833ea] font-bold'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            Team Leaves
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my_leaves')}
            className={`py-3 px-1 transition-all cursor-pointer whitespace-nowrap border-b-2 font-medium ${
              activeTab === 'my_leaves'
                ? 'text-[#5833ea] border-[#5833ea] font-bold'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            My Leaves
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('holidays')}
            className={`py-3 px-1 transition-all cursor-pointer whitespace-nowrap border-b-2 font-medium ${
              activeTab === 'holidays'
                ? 'text-[#5833ea] border-[#5833ea] font-bold'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            Holidays
          </button>
        </div>

        {/* Administration quick tools (Profile & Permissions) */}
        <div className="flex items-center gap-2 py-1.5">
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'details' ? 'attendance' : 'details')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              activeTab === 'details'
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Profile Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'access' ? 'attendance' : 'access')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer flex items-center gap-1 ${
              activeTab === 'access'
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Login Access</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          3. STAFF HERO (MATCHING USER REFERENCE IMAGE)
          ←  (C) Chithra
                 Monthly Salary: ₹ 10,000
                 [Maintanance] [Active ▾] [Apply latest Salary breakup ▾]
          Right: Download ⇣   < [Oct 2026] >   [ Amount ₹ 5,161.28 | Present 12 | Absent 0 | PL/WO 1/3 ]
         ══════════════════════════════════════════════════════════════════ */}
      <div className="px-6 sm:px-8 py-5 border-b border-slate-100 bg-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left: Back button + Avatar + Staff Info + Pill Buttons */}
          <div className="flex items-center gap-4">
            {/* Back Button ← */}
            <button
              type="button"
              onClick={onBack}
              className="p-1 -ml-1 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
              title="Back to Staff Directory"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Circular Purple Avatar */}
            <div className="w-12 h-12 rounded-full bg-[#5833ea] text-white flex items-center justify-center font-bold text-base shrink-0 shadow-2xs">
              {staffInitials}
            </div>

            {/* Staff Titles & Metadata */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900">
                  {staff.name}
                </h2>
                {allStaff && allStaff.length > 1 && onSelectStaff && (
                  <div className="relative inline-block">
                    <select
                      value={staff.id}
                      onChange={(e) => {
                        const target = allStaff.find(s => s.id === e.target.value);
                        if (target) onSelectStaff(target);
                      }}
                      className="text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 cursor-pointer hover:border-slate-300"
                    >
                      {allStaff.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.designation || 'Staff'})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="text-xs text-slate-500 font-normal">
                Monthly Salary: <span className="font-semibold text-slate-700">₹ {Number(staff.salary || 10000).toLocaleString('en-IN')}</span>
              </div>

              {/* Badges / Pill Buttons */}
              <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                {/* Maintanance Pill */}
                <span className="px-2.5 py-0.5 rounded-md text-xs font-normal border border-purple-200 text-purple-700 bg-purple-50/50">
                  {staff.designation || 'Maintanance'}
                </span>

                {/* Status Dropdown Pill (Active ▾) */}
                <div ref={statusRef} className="relative inline-block">
                  <button
                    type="button"
                    onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                    className="px-2 py-0.5 rounded-md text-xs font-normal border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100/70 transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>{staff.status === 'ACTIVE' ? 'Active' : staff.status || 'Active'}</span>
                    <ChevronDown className="w-3 h-3 text-emerald-600" />
                  </button>

                  {isStatusDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-32 bg-white rounded-lg shadow-xl border border-slate-200 z-50 py-1 text-xs text-slate-700">
                      {['ACTIVE', 'ON_LEAVE', 'INACTIVE'].map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => {
                            const updated = { ...staff, status: st as any };
                            saveStaffMember(updated);
                            onUpdateStaff(updated);
                            setIsStatusDropdownOpen(false);
                            onShowToast(`Status updated to ${st}`);
                          }}
                          className="w-full px-3 py-1.5 text-left hover:bg-slate-50 font-medium text-xs flex items-center justify-between"
                        >
                          <span>{st === 'ACTIVE' ? 'Active' : st === 'ON_LEAVE' ? 'On Leave' : 'Inactive'}</span>
                          {staff.status === st && <Check className="w-3 h-3 text-emerald-600" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Apply Latest Salary Breakup ▾ */}
                <button
                  type="button"
                  onClick={() => setIsSalaryBreakupModalOpen(true)}
                  className="px-2.5 py-0.5 rounded-md text-xs font-normal border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
                >
                  <span>Apply latest Salary breakup</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
              </div>
            </div>
          </div>

          {/* Right: Download + Month Navigation + KPI Summary Card */}
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap self-end lg:self-center">
            {/* Download Button */}
            <div ref={downloadRef} className="relative">
              <button
                type="button"
                onClick={() => setIsDownloadOpen(!isDownloadOpen)}
                className="inline-flex items-center gap-1 text-xs font-normal text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                <span>Download</span>
                <Download className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {isDownloadOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 py-2 text-xs text-slate-800 animate-in fade-in">
                  <div className="px-3.5 py-1.5 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <span>Export Payslip:</span>
                    <span className="font-bold text-indigo-600">{currentMonthShort} {selectedYear}</span>
                  </div>
                  <div className="p-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        exportPayslipToPDF(staff, currentMonthCode);
                        setIsDownloadOpen(false);
                        onShowToast(`PDF Payslip downloaded for ${currentMonthShort} ${selectedYear}`);
                      }}
                      className="w-full px-3 py-2 rounded-lg flex items-center gap-2.5 hover:bg-red-50 text-slate-700 hover:text-red-700 transition cursor-pointer text-left"
                    >
                      <FileText className="w-4 h-4 text-red-600" />
                      <div>
                        <div className="font-bold text-xs">Official Payslip (PDF)</div>
                        <div className="text-[10px] text-slate-400">Formal printable document</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        exportPayslipToPNG(staff, currentMonthCode);
                        setIsDownloadOpen(false);
                        onShowToast(`PNG slip downloaded`);
                      }}
                      className="w-full px-3 py-2 rounded-lg flex items-center gap-2.5 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition cursor-pointer text-left"
                    >
                      <ImageIcon className="w-4 h-4 text-emerald-600" />
                      <div>
                        <div className="font-bold text-xs">Digital Slip (.png)</div>
                        <div className="text-[10px] text-slate-400">WhatsApp and mobile sharing</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        exportPayslipToWord(staff, currentMonthCode);
                        setIsDownloadOpen(false);
                        onShowToast(`Word format downloaded`);
                      }}
                      className="w-full px-3 py-2 rounded-lg flex items-center gap-2.5 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition cursor-pointer text-left"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                      <div>
                        <div className="font-bold text-xs">Word Document (.docx)</div>
                        <div className="text-[10px] text-slate-400">Editable format</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Month-Year Navigator: < [ Oct 2026 ] > */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="text-slate-500 hover:text-slate-800 cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Green Rounded Month Card */}
              <div 
                className="bg-[#0f8c66] hover:bg-[#0c7555] text-white px-3.5 py-1 rounded-lg text-center leading-tight shadow-2xs select-none cursor-pointer transition"
                title="Selected Attendance Month"
              >
                <div className="text-xs font-bold">{currentMonthShort}</div>
                <div className="text-[10px] opacity-90">{selectedYear}</div>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="text-slate-500 hover:text-slate-800 cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* KPI Summary Metrics Box: Amount | Present | Absent | PL/WO */}
            <div className="bg-white border border-slate-200 rounded-xl px-5 py-2 flex items-center shadow-2xs divide-x divide-slate-100">
              {/* Amount */}
              <div className="pr-5 text-left">
                <div className="text-[11px] font-normal text-slate-500">Amount</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  ₹ {monthStats.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* Present */}
              <div className="px-5 text-left">
                <div className="text-[11px] font-normal text-slate-500">Present</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {monthStats.present}
                </div>
              </div>

              {/* Absent */}
              <div className="px-5 text-left">
                <div className="text-[11px] font-normal text-slate-500">Absent</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {monthStats.absent}
                </div>
              </div>

              {/* PL/WO */}
              <div className="pl-5 text-left">
                <div className="text-[11px] font-normal text-slate-500">PL/WO</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {monthStats.pl}/{monthStats.wo}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          4. ATTENDANCE TABLE (MATCHING USER REFERENCE IMAGE)
          Date                                  Attendance Status
          18 Oct, Sun   ₹ 322.58          1 Shift   [ Weekoff ▾ ]   [ > ]
          16 Oct, Fri   ₹ 322.58          1 Shift   [ Present ▾ ]   [ > ]
         ══════════════════════════════════════════════════════════════════ */}
      {(activeTab === 'attendance' || activeTab === 'people') && (
        <div className="px-6 sm:px-8 py-6 flex-1 bg-white">
          <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            {/* Table Header: Date ---------------- Attendance Status */}
            <div className="bg-[#f8f9fc] px-6 py-3 flex items-center justify-between text-xs font-semibold text-slate-600 border-b border-slate-200">
              <span>Date</span>
              <span>Attendance Status</span>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-slate-100 bg-white">
              {displayRows.map((row) => {
                const isDropdownOpen = openRowStatusDropdown === row.dateStr;
                return (
                  <div
                    key={row.dateStr}
                    className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                  >
                    {/* Left: Date + Entry By */}
                    <div className="min-w-[180px]">
                      <div className="text-xs sm:text-sm font-semibold text-slate-800">
                        {row.dayFormatted}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Entry By {row.entryBy}
                      </div>
                    </div>

                    {/* Middle: Daily Rate */}
                    <div className="text-xs sm:text-sm font-semibold text-slate-800">
                      ₹ {row.dailyAmount.toFixed(2)}
                    </div>

                    {/* Right: 1 Shift + Status Pill Dropdown + Action Arrow */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 font-normal">
                        {row.shift}
                      </span>

                      {/* Status Dropdown Pill */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenRowStatusDropdown(isDropdownOpen ? null : row.dateStr)}
                          className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-normal transition cursor-pointer border ${getStatusBadgeClasses(row.status)}`}
                        >
                          <span>{row.status}</span>
                          <ChevronDown className="w-3 h-3 text-slate-500" />
                        </button>

                        {isDropdownOpen && (
                          <div className="absolute right-0 top-full mt-1.5 w-36 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 py-1 text-xs text-slate-700 animate-in fade-in duration-100">
                            {['Present', 'Weekoff', 'Absent', 'Paid Leave', 'Half-day'].map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => {
                                  updateStaffAttendanceStatus(staff.id, st as any, row.dateStr);
                                  setAttendanceRecords(getAllStaffAttendanceRecords());
                                  setOpenRowStatusDropdown(null);
                                  onShowToast(`Marked ${st} for ${row.dayFormatted}`);
                                }}
                                className={`w-full px-3 py-2 text-left hover:bg-slate-50 text-xs flex items-center justify-between cursor-pointer ${
                                  row.status === st ? 'font-bold text-slate-900 bg-slate-50' : 'text-slate-600'
                                }`}
                              >
                                <span>{st}</span>
                                {row.status === st && <Check className="w-3 h-3 text-emerald-600" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* [ > ] Detail Chevron Button */}
                      <button
                        type="button"
                        onClick={() => setSelectedDayRecordForDetail(row)}
                        title="View Day Punch Details"
                        className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 transition cursor-pointer shadow-2xs"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Day Detail Modal */}
      {selectedDayRecordForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{selectedDayRecordForDetail.dayFormatted}</h3>
                <p className="text-[11px] text-slate-500">Attendance & Shift Breakdown</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayRecordForDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500">Status</span>
                <span className={`px-2.5 py-1 rounded-md font-semibold border ${getStatusBadgeClasses(selectedDayRecordForDetail.status)}`}>
                  {selectedDayRecordForDetail.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-slate-200">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Shift</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">1 Shift (General)</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">09:00 AM - 06:00 PM</div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Daily Wage</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">₹ {selectedDayRecordForDetail.dailyAmount.toFixed(2)}</div>
                  <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Calculated</div>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Entry Supervisor:</span>
                  <span className="font-bold text-slate-800">{selectedDayRecordForDetail.entryBy}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Punch Mode:</span>
                  <span className="font-semibold text-slate-800">Biometric / Verified</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Site / Location:</span>
                  <span className="font-semibold text-slate-800">Booshnam Head Office</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50/70 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDayRecordForDetail(null)}
                className="px-4 py-2 bg-[#5833ea] hover:bg-[#4828c4] text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          4. TAB CONTENT: TEAM LEAVES
         ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'team_leaves' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Team Leave Requests</h2>
              <p className="text-xs text-slate-500">Department leave applications pending manager review and approval.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsApplyLeaveOpen(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-xs hover:bg-indigo-700 transition cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Apply Leave</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8f9fc] border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-6">Staff Name</th>
                  <th className="py-3 px-6">Leave Type</th>
                  <th className="py-3 px-6">Duration</th>
                  <th className="py-3 px-6">Days</th>
                  <th className="py-3 px-6">Reason</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr className="hover:bg-slate-50/60">
                  <td className="py-3.5 px-6 font-bold text-slate-900">{staff.name}</td>
                  <td className="py-3.5 px-6">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                      Casual Leave
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-slate-600">12 Oct 2026 - 13 Oct 2026</td>
                  <td className="py-3.5 px-6 font-bold">2 Days</td>
                  <td className="py-3.5 px-6 text-slate-500">Personal family function in native town</td>
                  <td className="py-3.5 px-6">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                      Approved
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-right">
                    <span className="text-[11px] text-slate-400">Reviewed</span>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/60">
                  <td className="py-3.5 px-6 font-bold text-slate-900">Kavitha R (Surveyor)</td>
                  <td className="py-3.5 px-6">
                    <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold border border-purple-200">
                      Sick Leave
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-slate-600">18 Oct 2026</td>
                  <td className="py-3.5 px-6 font-bold">1 Day</td>
                  <td className="py-3.5 px-6 text-slate-500">Medical checkup & doctor appointment</td>
                  <td className="py-3.5 px-6">
                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200">
                      Pending
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onShowToast('Leave Approved for Kavitha R')}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => onShowToast('Leave Rejected')}
                        className="px-2 py-1 bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-600 rounded text-[11px] font-medium cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          5. TAB CONTENT: MY LEAVES
         ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'my_leaves' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{staff.name} — Leave Balances</h2>
              <p className="text-xs text-slate-500">Annual entitlement and remaining leave quota for Year {selectedYear}.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsApplyLeaveOpen(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-xs hover:bg-indigo-700 transition cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Apply for Leave</span>
            </button>
          </div>

          {/* Leave Balances Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Casual Leave (CL)</div>
              <div className="text-2xl font-black text-indigo-700">6 / 12 Days</div>
              <div className="text-[11px] text-slate-500">6 days remaining this financial year</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sick Leave (SL)</div>
              <div className="text-2xl font-black text-emerald-700">4 / 8 Days</div>
              <div className="text-[11px] text-slate-500">4 days available with medical certificate</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Earned Leave (EL)</div>
              <div className="text-2xl font-black text-amber-700">8 / 15 Days</div>
              <div className="text-[11px] text-slate-500">Accumulated balance eligible for encashment</div>
            </div>
          </div>

          {/* Past Leaves Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="px-6 py-3.5 border-b border-slate-200 font-bold text-xs text-slate-800 bg-[#f8f9fc]">
              Past Leave History
            </div>
            <div className="p-6 text-center text-slate-400 text-xs">
              No additional unapproved leaves recorded for this employee.
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          6. TAB CONTENT: HOLIDAYS
         ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'holidays' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Company & Public Holidays 2026</h2>
            <p className="text-xs text-slate-500">Official recognized Tamil Nadu and National construction holidays.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[
              { date: '15 Jan 2026', day: 'Thursday', title: 'Pongal / Makar Sankranti', type: 'Public Holiday' },
              { date: '16 Jan 2026', day: 'Friday', title: 'Thiruvalluvar Day', type: 'State Holiday' },
              { date: '26 Jan 2026', day: 'Monday', title: 'Republic Day', type: 'National Holiday' },
              { date: '14 Apr 2026', day: 'Tuesday', title: 'Tamil New Year / Dr. Ambedkar Jayanti', type: 'State Holiday' },
              { date: '01 May 2026', day: 'Friday', title: 'May Day (Labor Day)', type: 'National Holiday' },
              { date: '15 Aug 2026', day: 'Saturday', title: 'Independence Day', type: 'National Holiday' },
              { date: '02 Oct 2026', day: 'Friday', title: 'Gandhi Jayanti', type: 'National Holiday' },
              { date: '20 Oct 2026', day: 'Tuesday', title: 'Ayutha Pooja', type: 'Festival Holiday' },
              { date: '08 Nov 2026', day: 'Sunday', title: 'Deepavali', type: 'Festival Holiday' },
              { date: '25 Dec 2026', day: 'Friday', title: 'Christmas Day', type: 'Public Holiday' }
            ].map((hol) => (
              <div key={hol.title} className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {hol.date}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">{hol.day}</span>
                </div>
                <div className="text-xs font-bold text-slate-900 pt-1">{hol.title}</div>
                <div className="text-[10px] text-slate-400">{hol.type}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          7. TAB CONTENT: DETAILS (EDIT FORM PRESERVED)
         ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'details' && (
        <form onSubmit={handleSaveDetails} className="p-6 sm:p-8 space-y-6 max-w-4xl">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Edit Staff Profile: {staff.name}</h2>
              <p className="text-xs text-slate-500">Update contact info, department, designation, and monthly salary.</p>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition cursor-pointer"
            >
              Save Profile
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={detailsForm.name}
                onChange={(e) => setDetailsForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Employee Code</label>
              <input
                type="text"
                required
                value={detailsForm.employee_code}
                onChange={(e) => setDetailsForm(prev => ({ ...prev, employee_code: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                value={detailsForm.department}
                onChange={(e) => setDetailsForm(prev => ({ ...prev, department: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
              <input
                type="text"
                value={detailsForm.designation}
                onChange={(e) => setDetailsForm(prev => ({ ...prev, designation: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Salary (₹)</label>
              <input
                type="number"
                value={detailsForm.salary}
                onChange={(e) => setDetailsForm(prev => ({ ...prev, salary: Number(e.target.value) || 0 }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={detailsForm.phone}
                onChange={(e) => setDetailsForm(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={detailsForm.email}
                onChange={(e) => setDetailsForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-900"
              />
            </div>
          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          8. TAB CONTENT: ACCESS (WORKSPACE LOGIN & PERMISSIONS)
         ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'access' && (
        <div className="p-6 sm:p-8 space-y-6 max-w-5xl">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <span>Workspace Access & Permissions: {staff.name}</span>
              </h2>
              <p className="text-xs text-slate-500">Configure username, password, and module authorization.</p>
            </div>
            <button
              type="button"
              onClick={handleSaveAccessAndCredentials}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition cursor-pointer"
            >
              Save Access
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-slate-700">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs font-bold text-slate-900"
              />
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-slate-700">Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs font-bold text-slate-900"
              />
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-slate-700">Access Status</label>
              <div className="text-xs font-bold text-emerald-700 pt-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{staff.has_login_account ? 'Account Activated' : 'Ready to Activate'}</span>
              </div>
            </div>
          </div>

          {/* Granular Module Checkboxes */}
          <div className="space-y-3 pt-2">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Allowed Modules ({allowedPages.length} of {ALL_SYSTEM_MODULES.length})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ALL_SYSTEM_MODULES.map((mod) => {
                const isChecked = allowedPages.includes(mod.id);
                return (
                  <label
                    key={mod.id}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition ${
                      isChecked ? 'bg-indigo-50/60 border-indigo-200 text-indigo-900' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleModule(mod.id)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                    />
                    <div className="text-xs font-bold truncate">{mod.name}</div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          9. MODALS: SALARY BREAKUP & APPLY LEAVE & PHOTO LIGHTBOX
         ══════════════════════════════════════════════════════════════════ */}
      {/* Salary Breakup Modal */}
      {isSalaryBreakupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Salary Breakup — {staff.name}</h3>
              <button
                type="button"
                onClick={() => setIsSalaryBreakupModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Basic Pay (50%)</span>
                <span className="font-bold text-slate-900">₹ {basicSalary.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">House Rent Allowance (HRA 20%)</span>
                <span className="font-bold text-slate-900">₹ {hra.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Conveyance Allowance</span>
                <span className="font-bold text-slate-900">₹ {conveyance.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Special Allowances</span>
                <span className="font-bold text-slate-900">₹ {specialAllowance.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 font-bold bg-slate-50 px-2 rounded">
                <span className="text-slate-900">Gross Monthly CTC</span>
                <span className="text-slate-900">₹ {monthlySalary.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 text-red-600">
                <span>Provident Fund (PF Deduction 12%)</span>
                <span className="font-bold">- ₹ {pfDeduction.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-2 font-black text-sm text-emerald-700 bg-emerald-50 px-2.5 rounded-lg border border-emerald-200">
                <span>Net Take-Home Pay</span>
                <span>₹ {netTakeHome.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsSalaryBreakupModalOpen(false);
                  onShowToast(`Salary structure verified: ₹ ${monthlySalary.toLocaleString('en-IN')}`);
                }}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
              >
                Apply & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apply Leave Modal */}
      {isApplyLeaveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Apply Leave — {staff.name}</h3>
              <button
                type="button"
                onClick={() => setIsApplyLeaveOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Leave Type</label>
                <select
                  value={newLeaveType}
                  onChange={(e) => setNewLeaveType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-semibold text-slate-800"
                >
                  <option value="Casual">Casual Leave (6 Days available)</option>
                  <option value="Sick">Sick Leave (4 Days available)</option>
                  <option value="Earned">Earned Leave (8 Days available)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newLeaveStartDate}
                    onChange={(e) => setNewLeaveStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    value={newLeaveEndDate}
                    onChange={(e) => setNewLeaveEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reason for Leave</label>
                <textarea
                  rows={3}
                  value={newLeaveReason}
                  onChange={(e) => setNewLeaveReason(e.target.value)}
                  placeholder="State the reason for taking leave..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-medium"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsApplyLeaveOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsApplyLeaveOpen(false);
                  onShowToast(`Leave request submitted for ${staff.name} (${newLeaveType})`);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Proof Lightbox Modal */}
      {viewPhotoUrl && (
        <div 
          onClick={() => setViewPhotoUrl(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-700"
          >
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
              <div className="text-xs font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Live Verification Selfie</span>
              </div>
              <button
                type="button"
                onClick={() => setViewPhotoUrl(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="w-full aspect-square bg-slate-950 flex items-center justify-center">
              <img src={viewPhotoUrl} alt="Punch selfie" className="w-full h-full object-cover" />
            </div>
            <div className="p-3 bg-slate-50 text-center text-xs text-slate-600 font-medium">
              Verified Attendance Stamp • {staff.name}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
