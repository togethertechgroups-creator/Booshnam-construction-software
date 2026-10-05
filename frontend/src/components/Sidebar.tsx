import React, { useState, useEffect, useRef } from 'react';
import type { SVGProps } from 'react';
import { 
  LayoutGrid, FileText, Home, Users, Briefcase, CreditCard, 
  Package, ShoppingCart, Archive, Truck, ClipboardCheck, 
  BookOpen, Settings, ChevronDown, ArrowLeft, Shield,
  Layers, ListTodo, Calculator, ShieldCheck, Menu, LogOut,
  Landmark, Compass, BarChart3, HardHat, DollarSign, Building2, CheckCircle2, Bell,
  FolderPlus, Calendar
} from 'lucide-react';

export function ChevronLeftIcon({ size = 24, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12l7 -7M8 12l7 7" />
    </svg>
  );
}
import { Role } from '../types';
import { MOCK_ROLES } from '../lib/mockData';
import { isPageAllowedForRole, getStoredRolePermissions } from '../lib/roleAccess';
import { isPageAllowedForActiveUser, logoutUser, getCurrentUserAccount, UserAccount } from '../lib/authService';
import { confirmSignOut } from '../lib/dialogService';
import { ORGANIZATION_DEPARTMENTS, getActiveDepartment, setActiveDepartmentId, normalizeDepartmentId, DepartmentEntity } from '../lib/departmentService';
import { getDueFollowUpsCount } from '../lib/leadsNotificationService';
import { getUnacknowledgedLowStockItems } from '../lib/stockNotificationService';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  activeRole: Role;
  onSwitchRole: (role: Role) => void;
  onOpenMobileSim: () => void;
  pendingApprovalsCount: number;
  isOpen?: boolean;
  onToggle?: () => void;
}

interface NavGroupItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | null;
  hasBell?: boolean;
  hasDot?: boolean;
}

const DEPARTMENT_SUB_ITEMS = [
  { id: 'dept_soil', label: 'Soil Investigation', icon: Compass, desc: 'Boreholes, lab tests, SBC & reports' },
  { id: 'dept_architecture', label: 'Architecture', icon: Layers, desc: 'Floor plans, elevations & AFC sets' },
  { id: 'dept_marketing', label: 'Marketing', icon: BarChart3, desc: 'Client CRM leads, inquiries & visits' },
  { id: 'dept_construction', label: 'Construction', icon: HardHat, desc: 'Daily Progress Reports (DPR) & site logs' },
  { id: 'dept_accounts', label: 'Accounts', icon: DollarSign, desc: 'Payment requests, vouchers & cashbook' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  activeRole,
  onSwitchRole,
  onOpenMobileSim,
  pendingApprovalsCount,
  isOpen = true,
  onToggle
}) => {
  const isDeptActive = 
    currentView === 'departments' || 
    currentView.startsWith('dept_') || 
    currentView === 'soil_investigation' || 
    currentView === 'architecture' || 
    currentView === 'marketing' || 
    currentView === 'construction_dept' || 
    currentView === 'accounts_dept';

  const isSuperAdminView = currentView === 'company_dashboard' || currentView === 'dashboard';

  const [activeAccount, setActiveAccount] = useState<UserAccount | null>(() => getCurrentUserAccount());

  const [activeDeptEntity, setActiveDeptEntity] = useState<DepartmentEntity>(() => {
    const acc = getCurrentUserAccount();
    if (acc && acc.department) {
      const isSuper = acc.role_code === 'SUPER_ADMIN';
      const isAll = acc.department === 'Executive Management' || acc.department === 'Booshnam Associates' || acc.department.toLowerCase().includes('all') || acc.department.toLowerCase().includes('director');
      if (!isSuper || !isAll) {
        const norm = normalizeDepartmentId(acc.department);
        return ORGANIZATION_DEPARTMENTS.find(d => d.id === norm) || ORGANIZATION_DEPARTMENTS[1];
      }
    }
    return getActiveDepartment();
  });

  useEffect(() => {
    const syncDept = () => {
      const acc = getCurrentUserAccount();
      setActiveAccount(acc);
      if (acc && acc.department) {
        const isSuper = acc.role_code === 'SUPER_ADMIN';
        const isAll = acc.department === 'Executive Management' || acc.department === 'Booshnam Associates' || acc.department.toLowerCase().includes('all') || acc.department.toLowerCase().includes('director');
        if (!isSuper || !isAll) {
          const norm = normalizeDepartmentId(acc.department);
          const found = ORGANIZATION_DEPARTMENTS.find(d => d.id === norm) || ORGANIZATION_DEPARTMENTS[1];
          setActiveDeptEntity(found);
          try {
            setActiveDepartmentId(norm);
          } catch (e) {}
          return;
        }
      }
      setActiveDeptEntity(getActiveDepartment());
    };
    syncDept();
    window.addEventListener('booshnam_active_dept_changed', syncDept);
    window.addEventListener('booshnam_session_changed', syncDept);
    window.addEventListener('siteops_user_updated', syncDept);
    window.addEventListener('storage', syncDept);
    return () => {
      window.removeEventListener('booshnam_active_dept_changed', syncDept);
      window.removeEventListener('booshnam_session_changed', syncDept);
      window.removeEventListener('siteops_user_updated', syncDept);
      window.removeEventListener('storage', syncDept);
    };
  }, []);

  const resolvedUser = (() => {
    if (activeAccount) {
      return {
        roleCode: activeAccount.role_code,
        roleName: activeAccount.role_name || (activeAccount.role_code === 'SUPER_ADMIN' ? 'Super Admin' : activeRole?.name || 'Staff'),
        name: activeAccount.staff_name || activeAccount.username || 'Staff'
      };
    }
    try {
      const stored = localStorage.getItem('siteops_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          roleCode: parsed.role_code || activeRole?.code || 'SUPER_ADMIN',
          roleName: parsed.role_name || activeRole?.name || (parsed.role_code === 'SUPER_ADMIN' ? 'Super Admin' : 'Staff'),
          name: parsed.name || parsed.first_name || 'Staff'
        };
      }
    } catch (e) {}
    return {
      roleCode: activeRole?.code || 'SUPER_ADMIN',
      roleName: activeRole?.name || 'Super Admin',
      name: 'Nivedhitha Arumugam'
    };
  })();

  const isSuperAdminUser = resolvedUser.roleCode === 'SUPER_ADMIN';
  const displayRole = resolvedUser.roleName;
  const displayName = resolvedUser.name;

  const [isHeaderDropdownOpen, setIsHeaderDropdownOpen] = useState(false);
  const headerDropdownRef = useRef<HTMLDivElement>(null);
  const [expandedBranchDepts, setExpandedBranchDepts] = useState<{ soil: boolean; material: boolean }>({
    soil: false,
    material: false,
  });

  useEffect(() => {
    if (isHeaderDropdownOpen) {
      const isSoil = activeDeptEntity.id === 'SOIL_INVESTIGATION' || activeDeptEntity.id === 'COIMBATORE_SOIL';
      const isMaterial = activeDeptEntity.id === 'MATERIAL_TESTING' || activeDeptEntity.id === 'COIMBATORE_MATERIAL_TESTING';
      setExpandedBranchDepts({
        soil: isSoil,
        material: isMaterial,
      });
    }
  }, [isHeaderDropdownOpen, activeDeptEntity.id]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (headerDropdownRef.current && !headerDropdownRef.current.contains(e.target as Node)) {
        setIsHeaderDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const getActiveDivisionLabel = () => {
    if (currentView === 'dept_soil' || currentView === 'soil_investigation') return 'Soil Investigation';
    if (currentView === 'dept_architecture' || currentView === 'architecture') return 'Architectural';
    if (currentView === 'dept_marketing' || currentView === 'marketing') return 'Marketing';
    if (currentView === 'dept_construction' || currentView === 'construction_dept') return 'Private Construction';
    if (currentView === 'dept_accounts' || currentView === 'accounts_dept') return 'Accounts';
    return null;
  };
  const activeDivisionLabel = getActiveDivisionLabel();

  const [availableRoles, setAvailableRoles] = useState<Role[]>(MOCK_ROLES);
  const [, setRolePermissionsTick] = useState(0);

  // Dynamic Follow-up Reminders Count for Quotation & Leads
  const [followUpsCount, setFollowUpsCount] = useState<number>(() => getDueFollowUpsCount());

  useEffect(() => {
    const syncFollowUps = () => {
      setFollowUpsCount(getDueFollowUpsCount());
    };
    window.addEventListener('booshnam_leads_updated', syncFollowUps);
    window.addEventListener('booshnam_reminders_viewed', syncFollowUps);
    window.addEventListener('storage', syncFollowUps);
    return () => {
      window.removeEventListener('booshnam_leads_updated', syncFollowUps);
      window.removeEventListener('booshnam_reminders_viewed', syncFollowUps);
      window.removeEventListener('storage', syncFollowUps);
    };
  }, []);

  // Dynamic Low-Stock Notification Tracking for Procurement Menu
  const [unacknowledgedLowStockCount, setUnacknowledgedLowStockCount] = useState<number>(() => {
    return getUnacknowledgedLowStockItems().length;
  });

  useEffect(() => {
    const syncLowStock = () => {
      setUnacknowledgedLowStockCount(getUnacknowledgedLowStockItems().length);
    };

    syncLowStock();

    window.addEventListener('booshnam_low_stock_updated', syncLowStock);
    window.addEventListener('booshnam_stock_updated', syncLowStock);
    window.addEventListener('storage', syncLowStock);

    return () => {
      window.removeEventListener('booshnam_low_stock_updated', syncLowStock);
      window.removeEventListener('booshnam_stock_updated', syncLowStock);
      window.removeEventListener('storage', syncLowStock);
    };
  }, []);

  // Synchronize available roles & permissions whenever configured
  useEffect(() => {
    const syncPermissions = () => {
      setRolePermissionsTick(t => t + 1);
      const stored = getStoredRolePermissions();
      const permsList = Object.values(stored).map(p => ({
        id: p.roleCode,
        name: p.roleName,
        code: p.roleCode,
        description: p.description
      }));
      const merged = [...MOCK_ROLES];
      permsList.forEach(p => {
        if (!merged.some(m => m.code === p.code)) {
          merged.push(p);
        }
      });
      setAvailableRoles(merged);
    };

    syncPermissions();
    window.addEventListener('siteops_role_access_updated', syncPermissions);
    window.addEventListener('booshnam_session_changed', syncPermissions);
    return () => {
      window.removeEventListener('siteops_role_access_updated', syncPermissions);
      window.removeEventListener('booshnam_session_changed', syncPermissions);
    };
  }, []);

  interface NavSection {
    title?: string;
    items: NavGroupItem[];
  }

  // Dynamic Navigation Groups matching Role-Based Access & User Account Specific Allowed Pages
  const getNavSections = (): NavSection[] => {
    // 1. Client-specific portal view
    if (activeRole.code === 'CLIENT') {
      const portalItems: NavGroupItem[] = [];
      if (isPageAllowedForRole('CLIENT', 'projects') && isPageAllowedForActiveUser('projects')) {
        portalItems.push({ id: 'client_portal', label: 'My Project Portal', icon: Home });
      }
      if (isPageAllowedForRole('CLIENT', 'approvals') && isPageAllowedForActiveUser('approvals')) {
        portalItems.push({ id: 'approvals', label: 'Design Approvals', icon: ShieldCheck, badge: '1' });
      }
      if (isPageAllowedForRole('CLIENT', 'documents') && isPageAllowedForActiveUser('documents')) {
        portalItems.push({ id: 'documents', label: 'Project Documents', icon: BookOpen });
      }
      const settingsItems: NavGroupItem[] = [];
      if (isPageAllowedForRole('CLIENT', 'setting') && isPageAllowedForActiveUser('setting')) {
        settingsItems.push({ id: 'setting', label: 'Profile Settings', icon: Settings });
      }

      const sections: NavSection[] = [];
      if (portalItems.length > 0) sections.push({ title: 'PORTAL', items: portalItems });
      if (settingsItems.length > 0) sections.push({ title: 'SETTINGS', items: settingsItems });
      return sections;
    }

    // 2. Dynamic granular permissions for all other roles
    const allSections: NavSection[] = [
      // Group 1: Core Operations
      {
        title: 'OPERATIONS',
        items: [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
          { id: 'projects', label: 'Projects', icon: Home },
          { 
            id: 'quotation', 
            label: 'Leads & Quotation', 
            icon: Calculator, 
            badge: followUpsCount > 0 ? `${followUpsCount}` : null,
            hasBell: followUpsCount > 0
          },
          { id: 'schedule', label: 'Schedule & Timesheet', icon: Calendar }
        ]
      },
      // Group 2: Workforce & Payroll
      {
        title: 'WORKFORCE',
        items: [
          { id: 'workforce', label: 'Staff & Payroll', icon: Users }
        ]
      },
      // Group 3: Financials & Supply Chain
      {
        title: 'FINANCE & SUPPLY',
        items: [
          { id: 'finance', label: 'Accounts & Finance', icon: Landmark },
          { id: 'payments', label: 'Payments & Ledger', icon: CreditCard },
          { 
            id: 'procurement', 
            label: 'Procurement', 
            icon: ShoppingCart,
            badge: unacknowledgedLowStockCount > 0 ? `${unacknowledgedLowStockCount}` : null,
            hasDot: unacknowledgedLowStockCount > 0
          },
          { id: 'equipment', label: 'Assets', icon: Truck }
        ]
      },
      // Group 4: Repository, Governance & Config
      {
        title: 'GOVERNANCE',
        items: [
          { id: 'documents', label: 'Documents', icon: BookOpen },
          { id: 'approvals', label: 'Approvals', icon: ShieldCheck, badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount}` : null },
          { id: 'site_ops', label: 'Reports (DPR)', icon: FileText },
          { id: 'setting', label: 'Settings', icon: Settings }
        ]
      }
    ];

    // Filter each group based on permissions
    return allSections
      .map(section => ({
        title: section.title,
        items: section.items.filter(item => {
          return isPageAllowedForActiveUser(item.id) && isPageAllowedForRole(activeRole.code, item.id);
        })
      }))
      .filter(section => section.items.length > 0);
  };

  const navSections = getNavSections();

  const isItemActive = (itemId: string) => {
    return (
      currentView === itemId ||
      (itemId === 'finance' && (currentView === 'finance' || currentView === 'accounts_finance')) ||
      (itemId === 'dashboard' && (currentView === 'company_dashboard' || currentView === 'dashboard')) ||
      (itemId === 'site_ops' && (currentView === 'site_ops' || currentView === 'report')) ||
      (itemId === 'workforce' && (currentView === 'workforce' || currentView === 'payroll')) ||
      (itemId === 'procurement' && (currentView === 'procurement' || currentView === 'warehouse')) ||
      (itemId === 'equipment' && (currentView === 'equipment' || currentView === 'asset')) ||
      (itemId === 'documents' && (currentView === 'documents' || currentView === 'library')) ||
      (itemId === 'schedule' && (currentView === 'schedule' || currentView === 'timesheet' || currentView === 'team_schedule' || currentView === 'schedule_timesheet')) ||
      (itemId === 'setting' && (currentView === 'setting' || currentView === 'settings'))
    );
  };

  return (
    <>
      {/* Backdrop for mobile / overlay */}
      {isOpen && (
        <div 
          onClick={onToggle}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs z-30 lg:hidden cursor-pointer"
        />
      )}

      {/* Sidebar — expanded (w-64) or mini icon rail (w-[72px]) */}
      <aside className={`bg-white text-slate-800 border-r border-slate-200 flex flex-col h-screen fixed left-0 top-0 z-40 select-none transition-all duration-300 ease-in-out ${
        isOpen ? 'w-64 shadow-xs' : 'w-[72px] shadow-xs'
      }`}>

        {/* ── Brand Header (Interactive Workspace & Department Switcher) ── */}
        {(() => {
          const userDept = activeAccount?.department;
          const isSuper = resolvedUser.roleCode === 'SUPER_ADMIN';
          const isAllDepts = !userDept || 
            userDept === 'Executive Management' || 
            userDept === 'Booshnam Associates' || 
            userDept.toLowerCase().includes('all') ||
            userDept.toLowerCase().includes('director');

          const isCompanyWideSuperAdmin = isSuper && isAllDepts;

          const targetDeptId = normalizeDepartmentId(userDept);
          const availableDepts = isCompanyWideSuperAdmin
            ? ORGANIZATION_DEPARTMENTS
            : ORGANIZATION_DEPARTMENTS.filter(d => !d.isMainOverview && d.id === targetDeptId);

          const finalAvailableDepts = availableDepts.length > 0 ? availableDepts : [ORGANIZATION_DEPARTMENTS[1]];
          const canSwitchDepartment = isCompanyWideSuperAdmin && finalAvailableDepts.length > 1;

          return (
            <div className="px-3.5 pt-3 pb-2.5 border-b border-slate-100 relative bg-white" ref={headerDropdownRef}>
              {isOpen ? (
                /* EXPANDED: Official Horizontal Logo + Collapse Button, and Department Selector underneath */
                <div className="space-y-2">
                  {/* Top Row: Official Booshnam Logo + Collapse toggle button */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (canSwitchDepartment) {
                          setIsHeaderDropdownOpen(!isHeaderDropdownOpen);
                        }
                      }}
                      className={`flex items-center text-left py-0.5 ${
                        canSwitchDepartment ? 'cursor-pointer' : 'cursor-default'
                      }`}
                      title={canSwitchDepartment ? "Click to switch department" : "Booshnam Associates"}
                    >
                      <img
                        src="/logo@2x.png"
                        alt="Booshnam Associates"
                        className="h-[48px] w-auto max-w-[195px] object-contain select-none"
                      />
                    </button>

                    {/* Right: Collapse toggle button */}
                    {onToggle && (
                      <button
                        type="button"
                        onClick={onToggle}
                        title="Collapse Sidebar"
                        className="p-1 rounded-lg text-slate-400 hover:text-[#C61D45] hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                      >
                        <ChevronLeftIcon size={18} />
                      </button>
                    )}
                  </div>

                  {/* Under Logo: Selected Department View & Dropdown Trigger */}
                  <button
                    type="button"
                    onClick={() => {
                      if (canSwitchDepartment) {
                        setIsHeaderDropdownOpen(!isHeaderDropdownOpen);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 mt-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 shadow-xs hover:shadow-sm hover:border-slate-300 transition-all duration-300 ease-in-out text-left group ${
                      canSwitchDepartment ? 'cursor-pointer' : 'cursor-default'
                    }`}
                    title={canSwitchDepartment ? "Switch Department" : activeDeptEntity.name}
                  >
                    <div className="flex items-center min-w-0 flex-1">
                      <span className="text-[13px] font-black font-heading text-slate-800 tracking-tight truncate group-hover:text-[#ED1C24] transition-colors duration-200">
                        {activeDeptEntity.name}
                      </span>
                    </div>
                    {canSwitchDepartment && (
                      <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 ${isHeaderDropdownOpen ? 'rotate-180 text-[#ED1C24]' : 'group-hover:text-slate-700'}`} />
                    )}
                  </button>
                </div>
              ) : (
                /* COLLAPSED MINI: Clean icon button, clicking opens dropdown */
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (canSwitchDepartment) {
                        setIsHeaderDropdownOpen(!isHeaderDropdownOpen);
                      }
                    }}
                    title={`${activeDeptEntity.name} - ${canSwitchDepartment ? 'Switch Department' : displayName}`}
                    className={canSwitchDepartment ? "cursor-pointer" : "cursor-default"}
                  >
                    <img
                      src="/booshnam-app-icon.png"
                      alt="Booshnam Associates"
                      className="w-10 h-10 object-contain drop-shadow-2xs select-none"
                    />
                  </button>
                  {onToggle && (
                    <button
                      type="button"
                      onClick={onToggle}
                      title="Expand Sidebar"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#C61D45] hover:bg-slate-100 transition-colors cursor-pointer relative"
                    >
                      <ChevronLeftIcon size={18} className="rotate-180" />
                      {unacknowledgedLowStockCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* ── DROPDOWN MENU: Clean list without PRV badges ── */}
              {isHeaderDropdownOpen && canSwitchDepartment && (
                <div className={`absolute ${isOpen ? 'left-2 w-[calc(100%-16px)]' : 'left-16 w-80'} top-[calc(100%+4px)] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 text-slate-800`}>
                  <div className="max-h-[75vh] overflow-y-auto divide-y divide-slate-100/80 scrollbar-thin scrollbar-thumb-slate-200">
                    {(() => {
                      const booshnamDept = finalAvailableDepts.find(d => d.id === 'booshnam_associates');
                      const soilDepts = finalAvailableDepts.filter(d => d.id === 'SOIL_INVESTIGATION' || d.id === 'COIMBATORE_SOIL');
                      const materialDepts = finalAvailableDepts.filter(d => d.id === 'MATERIAL_TESTING' || d.id === 'COIMBATORE_MATERIAL_TESTING');
                      const otherDepts = finalAvailableDepts.filter(d => 
                        d.id !== 'booshnam_associates' &&
                        d.id !== 'SOIL_INVESTIGATION' &&
                        d.id !== 'COIMBATORE_SOIL' &&
                        d.id !== 'MATERIAL_TESTING' &&
                        d.id !== 'COIMBATORE_MATERIAL_TESTING'
                      );

                      const isSoilActive = activeDeptEntity.id === 'SOIL_INVESTIGATION' || activeDeptEntity.id === 'COIMBATORE_SOIL';
                      const isMaterialActive = activeDeptEntity.id === 'MATERIAL_TESTING' || activeDeptEntity.id === 'COIMBATORE_MATERIAL_TESTING';

                      return (
                        <>
                          {/* 1. Main Super Admin Overview */}
                          {booshnamDept && (
                            <button
                              key={booshnamDept.id}
                              type="button"
                              onClick={() => {
                                setActiveDepartmentId(booshnamDept.id);
                                setIsHeaderDropdownOpen(false);
                                onSelectView('company_dashboard');
                              }}
                              className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors cursor-pointer group ${
                                activeDeptEntity.id === booshnamDept.id ? 'bg-slate-50 font-bold' : 'hover:bg-slate-50/70'
                              }`}
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <div className={`text-[13px] font-bold truncate leading-snug ${activeDeptEntity.id === booshnamDept.id ? 'text-[#C61D45]' : 'text-slate-800'}`}>
                                  {booshnamDept.name}
                                </div>
                              </div>
                              {activeDeptEntity.id === booshnamDept.id && (
                                <div className="w-2 h-2 rounded-full bg-[#C61D45] shrink-0 ml-1.5 shadow-xs" />
                              )}
                            </button>
                          )}

                          {/* 2. Soil Investigation (With Chennai & Coimbatore Branches) */}
                          {soilDepts.length > 0 && (
                            <div className="divide-y divide-slate-100/50">
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedBranchDepts(prev => ({ ...prev, soil: !prev.soil }));
                                }}
                                className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors cursor-pointer group ${
                                  isSoilActive ? 'bg-red-50/40 font-bold' : 'hover:bg-slate-50/70'
                                }`}
                              >
                                <div className="min-w-0 flex-1 pr-2">
                                  <div className={`text-[13px] font-bold truncate leading-snug ${isSoilActive ? 'text-[#C61D45]' : 'text-slate-800'}`}>
                                    Soil Investigation
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-medium">
                                    {activeDeptEntity.id === 'SOIL_INVESTIGATION'
                                      ? 'Active: Chennai Branch'
                                      : activeDeptEntity.id === 'COIMBATORE_SOIL'
                                      ? 'Active: Coimbatore Branch'
                                      : 'Branches: Chennai, Coimbatore'}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {isSoilActive && (
                                    <div className="w-2 h-2 rounded-full bg-[#C61D45] shadow-xs" />
                                  )}
                                  <ChevronDown
                                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                                      expandedBranchDepts.soil ? 'rotate-180 text-[#C61D45]' : 'group-hover:text-slate-600'
                                    }`}
                                  />
                                </div>
                              </button>

                              {/* Soil Branches Submenu */}
                              {expandedBranchDepts.soil && (
                                <div className="bg-slate-50/80 border-t border-slate-100 py-1 px-2.5 space-y-1 animate-in fade-in duration-150">
                                  {soilDepts.map((branch) => {
                                    const isBranchSelected = activeDeptEntity.id === branch.id;
                                    return (
                                      <button
                                        key={branch.id}
                                        type="button"
                                        onClick={() => {
                                          setActiveDepartmentId(branch.id);
                                          setIsHeaderDropdownOpen(false);
                                          onSelectView('company_dashboard');
                                        }}
                                        className={`w-full text-left pl-3.5 pr-3 py-2 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                          isBranchSelected
                                            ? 'bg-white font-bold text-[#C61D45] shadow-xs border border-red-200/80'
                                            : 'text-slate-700 hover:bg-white hover:text-slate-900 font-medium'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isBranchSelected ? 'bg-[#C61D45]' : 'bg-slate-300'}`} />
                                          <span className="truncate">{branch.name}</span>
                                        </div>
                                        {isBranchSelected && (
                                          <div className="w-1.5 h-1.5 rounded-full bg-[#C61D45] shrink-0 ml-1.5" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {/* 3. Material Testing (With Chennai & Coimbatore Branches) */}
                          {materialDepts.length > 0 && (
                            <div className="divide-y divide-slate-100/50">
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedBranchDepts(prev => ({ ...prev, material: !prev.material }));
                                }}
                                className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors cursor-pointer group ${
                                  isMaterialActive ? 'bg-red-50/40 font-bold' : 'hover:bg-slate-50/70'
                                }`}
                              >
                                <div className="min-w-0 flex-1 pr-2">
                                  <div className={`text-[13px] font-bold truncate leading-snug ${isMaterialActive ? 'text-[#C61D45]' : 'text-slate-800'}`}>
                                    Material Testing
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-medium">
                                    {activeDeptEntity.id === 'MATERIAL_TESTING'
                                      ? 'Active: Chennai Branch'
                                      : activeDeptEntity.id === 'COIMBATORE_MATERIAL_TESTING'
                                      ? 'Active: Coimbatore Branch'
                                      : 'Branches: Chennai, Coimbatore'}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {isMaterialActive && (
                                    <div className="w-2 h-2 rounded-full bg-[#C61D45] shadow-xs" />
                                  )}
                                  <ChevronDown
                                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                                      expandedBranchDepts.material ? 'rotate-180 text-[#C61D45]' : 'group-hover:text-slate-600'
                                    }`}
                                  />
                                </div>
                              </button>

                              {/* Material Branches Submenu */}
                              {expandedBranchDepts.material && (
                                <div className="bg-slate-50/80 border-t border-slate-100 py-1 px-2.5 space-y-1 animate-in fade-in duration-150">
                                  {materialDepts.map((branch) => {
                                    const isBranchSelected = activeDeptEntity.id === branch.id;
                                    return (
                                      <button
                                        key={branch.id}
                                        type="button"
                                        onClick={() => {
                                          setActiveDepartmentId(branch.id);
                                          setIsHeaderDropdownOpen(false);
                                          onSelectView('company_dashboard');
                                        }}
                                        className={`w-full text-left pl-3.5 pr-3 py-2 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                          isBranchSelected
                                            ? 'bg-white font-bold text-[#C61D45] shadow-xs border border-red-200/80'
                                            : 'text-slate-700 hover:bg-white hover:text-slate-900 font-medium'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isBranchSelected ? 'bg-[#C61D45]' : 'bg-slate-300'}`} />
                                          <span className="truncate">{branch.name}</span>
                                        </div>
                                        {isBranchSelected && (
                                          <div className="w-1.5 h-1.5 rounded-full bg-[#C61D45] shrink-0 ml-1.5" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {/* 4. Other Standard Departments */}
                          {otherDepts.map((dept) => {
                            const isSelected = activeDeptEntity.id === dept.id;
                            return (
                              <button
                                key={dept.id}
                                type="button"
                                onClick={() => {
                                  setActiveDepartmentId(dept.id);
                                  setIsHeaderDropdownOpen(false);
                                  onSelectView('company_dashboard');
                                }}
                                className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors cursor-pointer group ${
                                  isSelected ? 'bg-slate-50 font-bold' : 'hover:bg-slate-50/70'
                                }`}
                              >
                                <div className="min-w-0 flex-1 pr-2">
                                  <div className={`text-[13px] font-bold truncate leading-snug ${isSelected ? 'text-[#C61D45]' : 'text-slate-800'}`}>
                                    {dept.name}
                                  </div>
                                </div>
                                {isSelected && (
                                  <div className="w-2 h-2 rounded-full bg-[#C61D45] shrink-0 ml-1.5 shadow-xs" />
                                )}
                              </button>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Navigation Menu (White Background with #C61D45 Card Active Item) ── */}
        <nav 
          className="flex-1 overflow-y-auto pt-1.5 pb-3 px-3 space-y-1 no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-0.5">
              {/* Divider Line between sections (No headline text, clean divider) */}
              {sIdx > 0 && (
                <div className={isOpen ? "my-2 mx-1 border-t border-slate-200/80" : "w-6 h-px bg-slate-200 my-1.5 mx-auto"} />
              )}

              <div className={isOpen ? 'space-y-0.5' : 'space-y-1 flex flex-col items-center'}>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isItemActive(item.id);

                  if (isOpen) {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectView(item.id === 'dashboard' ? 'company_dashboard' : item.id)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[13px] transition-all cursor-pointer group relative overflow-hidden ${
                          isActive
                            ? 'bg-[#C61D45] text-white shadow-sm shadow-[#C61D45]/20 font-bold'
                            : 'text-slate-700 hover:text-[#C61D45] hover:bg-[#C61D45]/8 font-medium'
                        }`}
                      >
                        {isActive && item.id === 'dashboard' && (
                          <img
                            src="/city-sketch.jpg"
                            alt=""
                            aria-hidden="true"
                            className="absolute right-0 top-0 h-full w-full object-cover opacity-25 mix-blend-multiply pointer-events-none select-none"
                          />
                        )}
                        <div className="flex items-center gap-3 min-w-0 relative z-10">
                          <div className="w-5 h-5 flex items-center justify-center shrink-0">
                            <Icon className={`w-4 h-4 transition-colors shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-[#C61D45]'}`} />
                          </div>
                          <span className="truncate leading-normal">{item.label}</span>
                        </div>

                        {item.badge && (
                          <span className={`text-[10.5px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1 transition-all shadow-2xs shrink-0 ${
                            isActive ? 'bg-white text-[#C61D45]' : 'bg-[#C61D45] text-white'
                          }`}>
                            {item.hasBell && (
                              <Bell className={`w-2.5 h-2.5 shrink-0 ${isActive ? 'text-[#C61D45]' : 'text-white'} fill-current`} />
                            )}
                            <span>{item.badge}</span>
                          </span>
                        )}
                      </button>
                    );
                  }

                  /* COLLAPSED MINI RAIL MODE */
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectView(item.id === 'dashboard' ? 'company_dashboard' : item.id)}
                      title={item.label}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
                        isActive
                          ? 'bg-[#C61D45] text-white shadow-sm shadow-[#C61D45]/25 font-bold'
                          : 'text-slate-400 hover:text-[#C61D45] hover:bg-slate-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      {(item.badge || item.hasDot) && (
                        <span className="absolute top-0.5 right-0.5 flex h-2.5 w-2.5">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${item.hasDot ? 'bg-amber-400' : 'bg-[#C61D45]'} opacity-75`}></span>
                          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${item.hasDot ? 'bg-amber-500' : 'bg-[#C61D45]'} border border-white`}></span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Quick Actions: New Project & New Quotation (Box Cards matching reference UI) ── */}
        {isOpen ? (
          activeRole.code !== 'CLIENT' && (
            <div className="px-3 pt-2.5 pb-2 border-t border-slate-100/90 bg-slate-50/50 shrink-0">
              <div className="grid grid-cols-2 gap-2">
                {/* 1. New Project Box Card */}
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.setItem('booshnam_auto_open_create_project', '1');
                    onSelectView('projects');
                    window.dispatchEvent(new CustomEvent('booshnam_open_create_project'));
                  }}
                  title="Create New Project"
                  className="flex flex-col items-center justify-center py-3 px-2 rounded-2xl bg-[#C61D45] hover:bg-[#a81639] active:bg-[#941130] text-white border border-[#b0173a] transition-all cursor-pointer shadow-xs hover:shadow-md active:scale-95 group"
                >
                  <FolderPlus className="w-5 h-5 text-white mb-1.5 transition-transform group-hover:scale-110" />
                  <span className="text-[11px] font-bold text-white text-center leading-tight truncate w-full tracking-tight">
                    New Project
                  </span>
                </button>

                {/* 2. New Lead Box Card */}
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.setItem('booshnam_auto_open_create_quotation', '1');
                    onSelectView('quotation');
                    window.dispatchEvent(new CustomEvent('booshnam_open_create_quotation'));
                  }}
                  title="Create New Lead"
                  className="flex flex-col items-center justify-center py-3 px-2 rounded-2xl bg-[#C61D45] hover:bg-[#a81639] active:bg-[#941130] text-white border border-[#b0173a] transition-all cursor-pointer shadow-xs hover:shadow-md active:scale-95 group"
                >
                  <Calculator className="w-5 h-5 text-white mb-1.5 transition-transform group-hover:scale-110" />
                  <span className="text-[11px] font-bold text-white text-center leading-tight truncate w-full tracking-tight">
                    New Lead
                  </span>
                </button>
              </div>
            </div>
          )
        ) : (
          activeRole.code !== 'CLIENT' && (
            <div className="py-2.5 px-2 border-t border-slate-100/90 flex flex-col items-center gap-2 shrink-0 bg-slate-50/50">
              <button
                type="button"
                onClick={() => {
                  sessionStorage.setItem('booshnam_auto_open_create_project', '1');
                  onSelectView('projects');
                  window.dispatchEvent(new CustomEvent('booshnam_open_create_project'));
                }}
                title="Create New Project"
                className="w-10 h-10 rounded-xl bg-[#C61D45] hover:bg-[#a81639] active:bg-[#941130] border border-[#b0173a] text-white flex items-center justify-center transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <FolderPlus className="w-5 h-5 text-white" />
              </button>

              <button
                type="button"
                onClick={() => {
                  sessionStorage.setItem('booshnam_auto_open_create_quotation', '1');
                  onSelectView('quotation');
                  window.dispatchEvent(new CustomEvent('booshnam_open_create_quotation'));
                }}
                title="Create New Lead"
                className="w-10 h-10 rounded-xl bg-[#C61D45] hover:bg-[#a81639] active:bg-[#941130] border border-[#b0173a] text-white flex items-center justify-center transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <Calculator className="w-5 h-5 text-white" />
              </button>
            </div>
          )
        )}

        {/* ── Sidebar Bottom / Footer (TogetherCore Logo & Version 1.0.0) ── */}
        {isOpen ? (
          <div className="px-4 pt-2 pb-2 border-t border-slate-100/90 flex flex-col items-center justify-center gap-1 text-center shrink-0 bg-white select-none">
            <img 
              src="/togethercore-logo-tight.png" 
              alt="TogetherCore" 
              className="w-[92px] h-auto max-h-[62px] object-contain pointer-events-none select-none drop-shadow-2xs"
            />
            <span className="text-[9px] font-semibold text-slate-400 tracking-wider uppercase select-none">
              Version 1.0.0
            </span>
          </div>
        ) : (
          <div className="py-2 px-1 border-t border-slate-100/90 flex flex-col items-center justify-center gap-1 text-center shrink-0 bg-white select-none" title="TogetherCore • Version 1.0.0">
            <img 
              src="/togethercore-icon.png" 
              alt="TogetherCore" 
              className="w-[26px] h-auto object-contain pointer-events-none select-none"
            />
            <span className="text-[8px] font-semibold text-slate-400 select-none">
              v1.0.0
            </span>
          </div>
        )}
      </aside>
    </>
  );
};
