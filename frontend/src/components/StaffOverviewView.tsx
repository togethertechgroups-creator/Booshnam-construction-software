import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowLeft, User, ShieldCheck, Check, CheckCircle2, Lock, Eye, EyeOff, 
  RefreshCw, LayoutGrid, Home, Layers, ListTodo, UserCheck, Users, 
  Calculator, CreditCard, ShoppingCart, Truck, BookOpen, FileText, 
  ClipboardCheck, Settings, Shield, ArrowRight, Save, Calendar, 
  Phone, Mail, Briefcase, Building2, KeyRound, AlertCircle, Info, Landmark,
  Download, X, Image as ImageIcon, ChevronDown
} from 'lucide-react';
import { 
  StaffMember, 
  saveStaffMember, 
  markStaffLoginCreated,
  getStaffAllocatedProjects,
  toggleStaffProjectAllocation
} from '../lib/staffService';
import { ALL_SYSTEM_MODULES, DEFAULT_ROLE_PERMISSIONS, SystemModule } from '../lib/roleAccess';
import { getUserAccounts, saveUserAccount, UserAccount } from '../lib/authService';
import { MOCK_ROLES } from '../lib/mockData';
import { confirmAction } from '../lib/dialogService';
import { CustomMonthPicker } from './CustomMonthPicker';
import { 
  calculatePayslip, 
  exportPayslipToPDF, 
  exportPayslipToWord, 
  exportPayslipToPNG 
} from '../lib/payslipExportService';

interface StaffOverviewViewProps {
  staff: StaffMember;
  initialTab?: 'details' | 'access' | 'leave_dashboard';
  onBack: () => void;
  onUpdateStaff: (updated: StaffMember) => void;
  onShowToast: (msg: string) => void;
}

export const StaffOverviewView: React.FC<StaffOverviewViewProps> = ({
  staff,
  initialTab = 'leave_dashboard',
  onBack,
  onUpdateStaff,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'access' | 'leave_dashboard'>(initialTab);
  const [accessStep, setAccessStep] = useState<1 | 2>(1);
  const [payslipMonth, setPayslipMonth] = useState('2026-01');
  const [isPayslipDropdownOpen, setIsPayslipDropdownOpen] = useState(false);
  const payslipDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (payslipDropdownRef.current && !payslipDropdownRef.current.contains(e.target as Node)) {
        setIsPayslipDropdownOpen(false);
      }
    };
    if (isPayslipDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPayslipDropdownOpen]);

  // Tab 1: Staff Details Edit Form
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
    salary: staff.salary || 45000,
    salary_type: staff.salary_type || 'Month'
  });

  // Tab 2: Granular Page Permissions
  const [allowedPages, setAllowedPages] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Tab 2 Step 2: Login Credentials
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('password123');
  const [confirmPassword, setConfirmPassword] = useState<string>('password123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [existingAccountId, setExistingAccountId] = useState<string | null>(null);

  // Initialize permissions and credentials from existing account or role defaults
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
            !['Prestige Boulevard', 'Royal Palm', 'Green Valley', 'Sunrise Industrial', 'Urban Metro', 'Skyline Contemporary', 'Heritage Courtyard', 'Highway Overpass', 'Government Medical College', 'High-Rise Commercial', 'Coastal Highway'].some(t => (x.name || x.title || x.client_name || '').includes(t))
          );
        }
      }
    } catch (e) {}
    return [];
  }, [projectRefreshTrigger]);

  const alloc = useMemo(() => {
    return getStaffAllocatedProjects(staff.name, staff.role_code);
  }, [staff.name, staff.role_code, projectRefreshTrigger]);

  const getModuleIcon = (id: string) => {
    switch (id) {
      case 'dashboard': return LayoutGrid;
      case 'projects': return Home;
      case 'departments': return Layers;
      case 'clients': return UserCheck;
      case 'workforce': return Users;
      case 'finance': return Landmark;
      case 'payments': return CreditCard;
      case 'procurement': return ShoppingCart;
      case 'equipment': return Truck;
      case 'documents': return BookOpen;
      case 'approvals': return ShieldCheck;
      case 'site_ops': return FileText;
      case 'setting': return Settings;
      default: return Shield;
    }
  };

  // Handlers for Tab 1: Staff Details Form
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailsForm.name.trim()) {
      onShowToast('Staff name is required');
      return;
    }

    if (detailsForm.phone && detailsForm.phone.length !== 10) {
      onShowToast('Phone number must be exactly 10 digits');
      return;
    }

    if (detailsForm.email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(detailsForm.email.trim())) {
      onShowToast('Please enter a valid email address');
      return;
    }

    const confirmed = await confirmAction({
      title: 'Update Staff Profile',
      message: `Are you sure you want to save changes to "${detailsForm.name.trim()}"?`,
      confirmText: 'Save Changes',
      cancelText: 'Cancel',
      variant: 'primary',
      icon: 'info'
    });
    if (!confirmed) return;

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
      salary: Number(detailsForm.salary) || 0,
      salary_type: detailsForm.salary_type as 'Month' | 'Day'
    };

    saveStaffMember(updated);
    onUpdateStaff(updated);
    onShowToast(`Staff profile for "${updated.name}" updated successfully!`);
  };

  // Handlers for Tab 2: Granular Page Permissions
  const handleToggleModule = (modId: string) => {
    setAllowedPages(prev =>
      prev.includes(modId) ? prev.filter(id => id !== modId) : [...prev, modId]
    );
  };

  const handleSelectAllModules = () => {
    setAllowedPages(ALL_SYSTEM_MODULES.map(m => m.id));
  };

  const handleClearAllModules = () => {
    setAllowedPages([]);
  };

  const handleResetToRoleDefaults = () => {
    const rolePerm = DEFAULT_ROLE_PERMISSIONS[staff.role_code];
    if (rolePerm) {
      setAllowedPages(rolePerm.allowedPages);
      onShowToast(`Reset permissions to default for ${staff.role_name}`);
    } else {
      setAllowedPages(['projects', 'site_ops', 'documents']);
    }
  };

  const handleProceedToCredentials = () => {
    if (allowedPages.length === 0) {
      onShowToast('Please select at least 1 page before proceeding to login setup');
      return;
    }
    setAccessStep(2);
  };

  // Save Credentials and Permissions
  const handleSaveAccessAndCredentials = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!username.trim()) {
      onShowToast('Please enter a username for this staff member');
      return;
    }

    if (password.length < 4) {
      onShowToast('Password must be at least 4 characters');
      return;
    }

    if (password !== confirmPassword) {
      onShowToast('Passwords do not match');
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    const roleObj = MOCK_ROLES.find(r => r.code === staff.role_code) || { name: staff.role_name };

    const confirmed = await confirmAction({
      title: 'Save Workspace Access & Password',
      message: `Set password for "${staff.name}" with username "${cleanUsername}" and grant access to ${allowedPages.length} authorized modules?`,
      confirmText: 'Confirm & Activate',
      cancelText: 'Cancel',
      variant: 'primary',
      icon: 'info'
    });
    if (!confirmed) return;

    const newAccount: UserAccount = {
      id: existingAccountId || `usr-${Date.now()}`,
      username: cleanUsername,
      password: password.trim(),
      phone: staff.phone,
      staff_id: staff.id,
      staff_name: staff.name,
      staff_code: staff.employee_code,
      role_code: staff.role_code,
      role_name: roleObj.name,
      department: staff.department,
      departments: staff.department ? [staff.department] : [],
      staff_ids: [staff.id],
      allowedPages: allowedPages,
      created_at: new Date().toISOString().split('T')[0]
    };

    saveUserAccount(newAccount);
    markStaffLoginCreated(staff.id, cleanUsername);

    const updatedStaff: StaffMember = {
      ...staff,
      has_login_account: true,
      username: cleanUsername
    };
    saveStaffMember(updatedStaff);
    onUpdateStaff(updatedStaff);
    setExistingAccountId(newAccount.id);
    setAccessStep(1);

    onShowToast(`Workspace login & permissions activated for ${staff.name}! (Username: ${cleanUsername})`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full animate-in fade-in duration-150 pb-20">
      {/* ── Top Navigation Breadcrumb Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 pb-3 border-b border-slate-200">
        {/* Workspace Login Status Badge */}
        <div>
          {staff.has_login_account ? (
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Login Active ({staff.username})</span>
            </span>
          ) : (
            <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>Workspace Login Pending Setup</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Staff Profile Header Hero Card ── */}
      <div className="bg-gradient-to-r from-red-50/70 via-white to-slate-50 p-5 rounded-2xl border border-red-100 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-md ring-4 ring-red-100 uppercase">
            {staff.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-slate-900">{staff.name}</h2>
              <span className="px-2.5 py-0.5 bg-slate-900 text-white tracking-tight text-xs font-bold rounded-md">
                {staff.employee_code}
              </span>
              <span className="px-2.5 py-0.5 bg-red-50 text-red-700 border border-red-200 text-xs font-bold rounded-md">
                {staff.role_name}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap font-medium">
              <span>{staff.designation}</span>
              <span>•</span>
              <span>{staff.department}</span>
              <span>•</span>
              <span>{staff.phone}</span>
              <span>•</span>
              <span>{staff.email}</span>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
            {initialTab === 'leave_dashboard' ? (
              <button
                type="button"
                onClick={() => setActiveTab('leave_dashboard')}
                className={`px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'leave_dashboard'
                    ? 'bg-white text-red-600 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Leaves & Payroll</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className={`px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'details'
                      ? 'bg-white text-red-600 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('access')}
                  className={`px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'access'
                      ? 'bg-white text-red-600 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>System Access</span>
                </button>
              </>
            )}
          </div>
          
          {activeTab === 'leave_dashboard' && (
            <div className="flex items-center gap-2">
              <CustomMonthPicker 
                value={payslipMonth}
                onChange={setPayslipMonth}
                onShowToast={onShowToast}
              />
              <div ref={payslipDropdownRef} className="relative">
                <button 
                  type="button"
                  onClick={() => {
                    if (!payslipMonth) setPayslipMonth('2026-01');
                    setIsPayslipDropdownOpen(prev => !prev);
                  }}
                  className={`px-4 py-2 text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
                    isPayslipDropdownOpen ? 'bg-indigo-700 ring-2 ring-indigo-400/40' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {payslipMonth ? `Download Payslip (${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(payslipMonth.split('-')[1])-1]} ${payslipMonth.split('-')[0]})` : 'Download Payslip'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isPayslipDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isPayslipDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 z-[100] py-2 text-xs text-slate-800 animate-in fade-in zoom-in-95">
                    <div className="px-3.5 py-1.5 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                      <span>Select Format:</span>
                      <span className="tracking-tight text-indigo-600 font-bold">
                        {payslipMonth || '2026-01'}
                      </span>
                    </div>

                    <div className="p-1.5 space-y-1">
                      {/* PDF Option */}
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            exportPayslipToPDF(staff, payslipMonth || undefined);
                            onShowToast(`Payslip PDF downloaded for ${staff.name}`);
                            setIsPayslipDropdownOpen(false);
                          } catch (err) {
                            console.error('PDF export error', err);
                            onShowToast('Failed to generate PDF.');
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg flex items-center gap-3 hover:bg-red-50 text-slate-700 hover:text-red-700 transition-colors text-left group cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-md bg-red-100 text-red-600 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs">Official PDF (.pdf)</span>
                            <span className="text-[9.5px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">PDF</span>
                          </div>
                          <p className="text-[10px] text-slate-400 group-hover:text-red-600/70 truncate">
                            Printable ISO/NABL salary slip
                          </p>
                        </div>
                      </button>

                      {/* Word Option */}
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            exportPayslipToWord(staff, payslipMonth || undefined);
                            onShowToast(`Payslip Word doc downloaded for ${staff.name}`);
                            setIsPayslipDropdownOpen(false);
                          } catch (err) {
                            console.error('Word export error', err);
                            onShowToast('Failed to generate Word doc.');
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg flex items-center gap-3 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors text-left group cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs">Microsoft Word (.doc)</span>
                            <span className="text-[9.5px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">Word</span>
                          </div>
                          <p className="text-[10px] text-slate-400 group-hover:text-blue-600/70 truncate">
                            Editable salary breakdown document
                          </p>
                        </div>
                      </button>

                      {/* PNG Option */}
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            onShowToast('Generating PNG slip image...');
                            await exportPayslipToPNG(staff, payslipMonth || undefined);
                            onShowToast(`Payslip PNG image downloaded for ${staff.name}`);
                            setIsPayslipDropdownOpen(false);
                          } catch (err) {
                            console.error('PNG export error', err);
                            onShowToast('Failed to generate image.');
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg flex items-center gap-3 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition-colors text-left group cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs">Digital Slip Image (.png)</span>
                            <span className="text-[9.5px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Image</span>
                          </div>
                          <p className="text-[10px] text-slate-400 group-hover:text-emerald-600/70 truncate">
                            Quick mobile & WhatsApp sharing
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB 0: LEAVE DASHBOARD
         ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'leave_dashboard' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Leaves Taken (Sep)</div>
              <div className="text-3xl font-black text-indigo-600 mt-2">2</div>
              <div className="text-[10px] font-semibold text-slate-400 mt-1">Out of 30 days</div>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Paid Leaves</div>
              <div className="text-3xl font-black text-emerald-600 mt-2">1</div>
              <div className="text-[10px] font-semibold text-slate-400 mt-1">Approved</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Week Offs</div>
              <div className="text-3xl font-black text-slate-800 mt-2">4</div>
              <div className="text-[10px] font-semibold text-slate-400 mt-1">Total Sundays/Holidays</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Absent Days</div>
              <div className="text-3xl font-black text-red-600 mt-2">1</div>
              <div className="text-[10px] font-semibold text-slate-400 mt-1">Unpaid</div>
            </div>
          </div>

          {/* Leave History Placeholder */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-2xs flex flex-col items-center justify-center text-slate-400">
            <Calendar className="w-12 h-12 mb-4 opacity-20" />
            <h3 className="text-sm font-bold text-slate-600">No Leave History</h3>
            <p className="text-xs mt-1">Detailed leave history records will appear here.</p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 1: STAFF DETAILS
         ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'details' && (
        <form onSubmit={handleSaveDetails} className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {/* Form Section 1: Professional & Employment */}
            <div className="p-6 border-b border-slate-100 space-y-4">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-red-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Employment & Organizational Details
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={detailsForm.name}
                    onChange={(e) => setDetailsForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>

                {/* Employee Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Employee Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={detailsForm.employee_code}
                    onChange={(e) => setDetailsForm(prev => ({ ...prev, employee_code: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs tracking-tight font-bold text-slate-900 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>

                {/* Role Assignment */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assigned Role *
                  </label>
                  <select
                    value={detailsForm.role_code}
                    onChange={(e) => setDetailsForm(prev => ({ ...prev, role_code: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500 cursor-pointer"
                  >
                    {MOCK_ROLES.map(r => (
                      <option key={r.code} value={r.code}>{r.name} ({r.code})</option>
                    ))}
                  </select>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={detailsForm.department}
                    onChange={(e) => setDetailsForm(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>

                {/* Designation */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={detailsForm.designation}
                    onChange={(e) => setDetailsForm(prev => ({ ...prev, designation: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>

                {/* Employment Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Employment Type
                  </label>
                  <select
                    value={detailsForm.employment_type}
                    onChange={(e) => setDetailsForm(prev => ({ ...prev, employment_type: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-900 bg-white focus:outline-hidden focus:border-red-500 cursor-pointer"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Part-time">Part-time</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Form Section 2: Contact & Personal Dates */}
            <div className="p-6 border-b border-slate-100 space-y-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-red-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Contact & Identification
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone (10 digits) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 tracking-tight">+91</span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={detailsForm.phone}
                      onChange={(e) => setDetailsForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                      className="w-full pl-11 pr-3 py-2 rounded-lg border border-slate-200 text-xs tracking-tight text-slate-900 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={detailsForm.email}
                    onChange={(e) => setDetailsForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Birth (DOB)
                  </label>
                  <input
                    type="date"
                    value={detailsForm.dob}
                    onChange={(e) => setDetailsForm(prev => ({ ...prev, dob: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-red-500 cursor-pointer"
                  />
                </div>

                {/* Date of Joining */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Joining (DOJ)
                  </label>
                  <input
                    type="date"
                    value={detailsForm.doj}
                    onChange={(e) => setDetailsForm(prev => ({ ...prev, doj: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-red-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Form Section 3: Salary & Compensation */}
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-red-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Compensation & Payroll
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Salary Amount (₹ INR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={detailsForm.salary}
                    onChange={(e) => setDetailsForm(prev => ({ ...prev, salary: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Salary Frequency
                  </label>
                  <select
                    value={detailsForm.salary_type}
                    onChange={(e) => setDetailsForm(prev => ({ ...prev, salary_type: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-900 bg-white focus:outline-hidden focus:border-red-500 cursor-pointer"
                  >
                    <option value="Month">Per Month</option>
                    <option value="Day">Per Day</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Form Actions Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('access')}
                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Configure Workspace Access & Login &rarr;</span>
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all hover:shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>Save Staff Profile</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 2: ROLES & GRANULAR ACCESS (Exact UI from Settings)
         ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'access' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Allocated Projects & Accessibility Card (Voice Requirement: How many projects allocated / access granted) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-red-50/50 via-white to-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 border border-red-200 font-bold flex items-center justify-center">
                  <Home className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Allocated Projects ({alloc.isAllAccess ? `${alloc.totalProjects} Projects (All)` : `${alloc.totalProjects} Projects`})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Projects that {staff.name} is allocated to oversee and access on site & portal.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold shadow-2xs">
                  {alloc.isAllAccess ? `${alloc.totalProjects} Project (Full Access)` : `${alloc.totalProjects} Project Assigned`}
                </span>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {alloc.isAllAccess && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Role <strong>{staff.role_name}</strong> has company-wide administrator privileges and has access to all active and completed projects.
                  </span>
                </div>
              )}

              <div>
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Assigned Project Access:
                </div>
                {allProjects.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No projects found in the system.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {allProjects.map((proj: any) => {
                      const isAssigned = alloc.allocatedProjects.some((p: any) => p.id === proj.id);
                      return (
                        <div
                          key={proj.id}
                          onClick={() => {
                            toggleStaffProjectAllocation(staff.name, staff.role_code, proj.id);
                            setProjectRefreshTrigger((prev) => prev + 1);
                            onShowToast(
                              isAssigned ? `Unassigned from "${proj.name}"` : `Assigned to "${proj.name}"`
                            );
                          }}
                          className={`p-3 rounded-xl border transition cursor-pointer select-none flex items-center justify-between gap-2 ${
                            isAssigned
                              ? 'bg-red-50/50 border-red-200 text-slate-900 shadow-2xs hover:bg-red-50'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              readOnly
                              className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 pointer-events-none"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold truncate">{proj.name}</div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {proj.code || proj.id} • {proj.location || 'Location'}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                              isAssigned
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {isAssigned ? 'Active' : 'Add'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sub-step 1: Granular Page Permissions Checkbox Grid */}
          {accessStep === 1 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-red-600" />
                      <span>Roles & Granular Page Permissions for {staff.name}</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Assign and customize page-level access across Dashboard, Projects, Financials, and Settings for this staff member.
                    </p>
                  </div>

                  {/* Bulk Select Actions & Counter */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold px-3 py-1.5 bg-red-50 text-red-700 rounded-lg border border-red-200">
                      {allowedPages.length} / {ALL_SYSTEM_MODULES.length} Pages Allowed
                    </span>
                    <button
                      type="button"
                      onClick={handleSelectAllModules}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllModules}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Clear All
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToRoleDefaults}
                      title="Reset to role default permissions"
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Role Defaults</span>
                    </button>
                  </div>
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 mt-5 text-xs">
                  {[
                    { id: 'all', label: `All Pages (${ALL_SYSTEM_MODULES.length})` },
                    { id: 'Core Operations', label: 'Core Operations (4)' },
                    { id: 'Financials & Supply', label: 'Financials & Supply (4)' },
                    { id: 'Repository & Quality', label: 'Repository & QA (4)' },
                    { id: 'Administration', label: 'Administration (3)' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        categoryFilter === cat.id
                          ? 'bg-red-600 text-white shadow-2xs font-bold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Checkbox Card Grid for 15 System Modules */}
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {ALL_SYSTEM_MODULES
                  .filter(m => categoryFilter === 'all' || m.category === categoryFilter)
                  .map((mod) => {
                    const isChecked = allowedPages.includes(mod.id);
                    const IconComp = getModuleIcon(mod.id);

                    return (
                      <label
                        key={mod.id}
                        className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-red-50/60 border-red-300 shadow-2xs ring-1 ring-red-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleModule(mod.id)}
                          className="w-4 h-4 mt-0.5 rounded text-red-600 focus:ring-red-500 border-slate-300 cursor-pointer accent-red-600"
                        />

                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isChecked ? 'bg-red-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <IconComp className="w-4 h-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-xs font-bold ${isChecked ? 'text-red-700' : 'text-slate-900'}`}>
                              {mod.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium truncate">
                              {mod.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 leading-snug line-clamp-2">
                            {mod.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
              </div>

              {/* Step 1 Footer Action: Proceed to Credentials */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  Selected <strong className="text-slate-900">{allowedPages.length}</strong> of {ALL_SYSTEM_MODULES.length} modules for this staff member.
                </div>

                <button
                  type="button"
                  onClick={handleProceedToCredentials}
                  className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all hover:shadow-md"
                >
                  <span>Continue to Workspace Login Setup (Step 2)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Sub-step 2: Username & Password Configuration Form */}
          {accessStep === 2 && (
            <form onSubmit={handleSaveAccessAndCredentials} className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-6">
              {/* Header Banner */}
              <div className="p-6 bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-red-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-md uppercase">
                    {staff.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Step 2: Workspace Login & Credentials Setup
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Configure login credentials for <strong className="text-red-950">{staff.name}</strong> ({staff.employee_code} • {staff.role_name}).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAccessStep(1)}
                    className="px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    &larr; Back to Page Permissions
                  </button>
                </div>
              </div>

              {/* Badges of Granted Modules */}
              <div className="px-6 space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Authorized Pages ({allowedPages.length})
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {ALL_SYSTEM_MODULES
                    .filter(m => allowedPages.includes(m.id))
                    .map(m => (
                      <span key={m.id} className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 text-xs font-bold rounded-md">
                        {m.name}
                      </span>
                    ))}
                </div>
              </div>

              {/* Login Form Inputs */}
              <div className="px-6 grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
                {/* Username */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Username *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. velmurugam"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    The staff member will use this exact username to sign into the system.
                  </span>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 4 characters"
                      className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-200 text-xs tracking-tight text-slate-900 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-xs tracking-tight text-slate-900 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2 Actions Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setAccessStep(1)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  &larr; Modify Permissions
                </button>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all hover:shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm & Save Access Credentials</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
