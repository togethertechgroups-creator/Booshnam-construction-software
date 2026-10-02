import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutGrid, FileText, Home, Users, Briefcase, CreditCard, 
  Package, ShoppingCart, Archive, Truck, ClipboardCheck, 
  BookOpen, Settings, ChevronDown, ArrowLeft, Shield,
  Layers, ListTodo, Calculator, ShieldCheck, Menu, LogOut,
  Landmark, Compass, BarChart3, HardHat, DollarSign, Building2, CheckCircle2, Bell
} from 'lucide-react';
import { Role } from '../types';
import { MOCK_ROLES } from '../lib/mockData';
import { isPageAllowedForRole, getStoredRolePermissions } from '../lib/roleAccess';
import { isPageAllowedForActiveUser, logoutUser, getCurrentUserAccount, UserAccount } from '../lib/authService';
import { confirmSignOut } from '../lib/dialogService';
import { ORGANIZATION_DEPARTMENTS, getActiveDepartment, setActiveDepartmentId, normalizeDepartmentId, DepartmentEntity } from '../lib/departmentService';
import { DepartmentLogo } from './DepartmentLogo';
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
            label: 'Quotation', 
            icon: Calculator, 
            badge: followUpsCount > 0 ? `${followUpsCount}` : null,
            hasBell: followUpsCount > 0
          }
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
          { id: 'equipment', label: 'Fleet & Assets', icon: Truck }
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
      (itemId === 'setting' && currentView === 'setting')
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

      {/* Sidebar — expanded (w-[248px] / increased by 5mm) or mini icon rail (w-[68px]) */}
      <aside className={`bg-[#C61D45] text-white border-r border-[#A81538] flex flex-col h-screen fixed left-0 top-0 z-40 select-none transition-all duration-300 ease-in-out shadow-lg shadow-black/10 ${
        isOpen ? 'w-[248px]' : 'w-[68px]'
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
            <div className="px-2.5 py-2.5 border-b border-white/15 relative bg-[#B91C3B]/30" ref={headerDropdownRef}>
              {isOpen ? (
                /* EXPANDED: Logo + Active Department / Booshnam Associates + Dropdown Chevron + hamburger toggle */
                <div className="flex items-center justify-between gap-1.5">
                  {/* Clickable Brand / Entity Dropdown Trigger */}
                  <button
                    type="button"
                    onClick={() => {
                      if (canSwitchDepartment) {
                        setIsHeaderDropdownOpen(!isHeaderDropdownOpen);
                      }
                    }}
                    className={`flex items-center gap-2 min-w-0 flex-1 py-1 px-1 rounded-lg transition-colors text-left group ${
                      canSwitchDepartment ? 'hover:bg-white/10 cursor-pointer' : 'cursor-default'
                    }`}
                    title={canSwitchDepartment ? "Switch between Super Admin Overview & Departments" : `${activeDeptEntity.name} • ${displayRole}`}
                  >
                    <DepartmentLogo type={activeDeptEntity.logoType} size="md" className="ring-1 ring-white/30" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <div className="text-[12.5px] font-bold text-white truncate font-heading group-hover:text-rose-100 transition-colors leading-tight">
                          {activeDeptEntity.name}
                        </div>
                        {canSwitchDepartment && (
                          <ChevronDown className={`w-3.5 h-3.5 text-white/80 shrink-0 transition-transform duration-200 ${isHeaderDropdownOpen ? 'rotate-180 text-white' : 'group-hover:text-white'}`} />
                        )}
                      </div>
                      <div 
                        className="text-[10.5px] text-rose-100/90 font-medium truncate mt-0.5 leading-tight" 
                        title={isCompanyWideSuperAdmin && activeDeptEntity.isMainOverview ? 'Super Admin Overview' : isSuperAdminUser ? `Super Admin • ${activeDeptEntity.name}` : `${displayRole} • ${displayName}`}
                      >
                        {isCompanyWideSuperAdmin && activeDeptEntity.isMainOverview ? (
                          <span>Super Admin Overview</span>
                        ) : isSuperAdminUser ? (
                          <span>Super Admin • {activeDeptEntity.name}</span>
                        ) : (
                          <span>{displayRole} • {displayName}</span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Right: Hamburger toggle button */}
                  {onToggle && (
                    <button
                      type="button"
                      onClick={onToggle}
                      title="Collapse Sidebar"
                      className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0"
                    >
                      <Menu className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                /* COLLAPSED MINI: Just the logo centered, clicking opens dropdown */
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (canSwitchDepartment) {
                        setIsHeaderDropdownOpen(!isHeaderDropdownOpen);
                      }
                    }}
                    title={`${activeDeptEntity.name} - ${canSwitchDepartment ? 'Switch Department' : `${displayRole} (${displayName})`}`}
                    className={canSwitchDepartment ? "cursor-pointer hover:scale-105 transition-transform" : "cursor-default"}
                  >
                    <DepartmentLogo type={activeDeptEntity.logoType} size="md" className="ring-1 ring-white/30" />
                  </button>
                  {onToggle && (
                    <button
                      type="button"
                      onClick={onToggle}
                      title="Expand Sidebar"
                      className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer relative"
                    >
                      <Menu className="w-4 h-4" />
                      {unacknowledgedLowStockCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                        </span>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* ── DROPDOWN MENU: Only available when multi-department access is permitted ── */}
              {isHeaderDropdownOpen && canSwitchDepartment && (
                <div className={`absolute ${isOpen ? 'left-2 w-[calc(100%-16px)]' : 'left-16 w-80'} top-[calc(100%+4px)] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 text-slate-800`}>
                  <div className="max-h-[75vh] overflow-y-auto divide-y divide-slate-100/80 scrollbar-thin scrollbar-thumb-slate-200">
                    {finalAvailableDepts.map((dept) => {
                      const isSelected = activeDeptEntity.id === dept.id;
                      const itemSubtitle = dept.isMainOverview 
                        ? `Owner: ${dept.owner}` 
                        : `${dept.codePrefix} Division`;

                      return (
                        <button
                          key={dept.id}
                          type="button"
                          onClick={() => {
                            setActiveDepartmentId(dept.id);
                            setIsHeaderDropdownOpen(false);
                            onSelectView('company_dashboard');
                          }}
                          className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between transition-colors cursor-pointer group ${
                            isSelected ? 'bg-slate-50 font-bold' : 'hover:bg-slate-50/70'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <DepartmentLogo type={dept.logoType} size="md" className="group-hover:scale-105 transition-transform" />
                            <div className="min-w-0">
                              {/* Department Badge (Clean, NO redundant SUPER ADMIN) */}
                              {dept.isMainOverview ? (
                                <div className="text-[10px] font-bold text-teal-600 tracking-wide uppercase leading-tight">
                                  Super Admin Overview
                                </div>
                              ) : (
                                <div className="text-[10px] font-bold text-slate-400 tracking-wide uppercase leading-tight">
                                  {dept.codePrefix}
                                </div>
                              )}
                              {/* Department / Company Title */}
                              <div className="text-[12.5px] font-bold text-slate-800 truncate leading-snug">
                                {dept.name}
                              </div>
                              {/* Role / Owner Subtitle */}
                              <div className="text-[11px] text-slate-500 font-normal truncate leading-tight">
                                {itemSubtitle}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-teal-500 shrink-0 ml-1.5 shadow-xs" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Navigation Menu (Light Red Background with All White Text) ── */}
        <nav 
          className="flex-1 overflow-y-auto pt-2 pb-16 px-2 space-y-1 no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-0.5">
              {/* Category Header Label */}
              {section.title && isOpen && (
                <div className="text-[10px] font-bold text-rose-200/80 tracking-wider uppercase px-2.5 pt-2 pb-0.5 select-none font-display">
                  {section.title}
                </div>
              )}

              {/* Collapsed Mode Divider */}
              {!isOpen && sIdx > 0 && (
                <div className="w-6 h-px bg-white/20 my-1 mx-auto" />
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
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[12.5px] transition-all cursor-pointer group relative overflow-hidden ${
                          isActive
                            ? 'bg-white/22 text-white font-bold backdrop-blur-xs border border-white/30 shadow-xs'
                            : 'text-white/90 hover:text-white hover:bg-white/12 font-medium'
                        }`}
                      >
                        {isActive && item.id === 'dashboard' && (
                          <img
                            src="/city-sketch.jpg"
                            alt=""
                            aria-hidden="true"
                            className="absolute right-0 top-0 h-full w-full object-cover opacity-15 mix-blend-screen pointer-events-none select-none"
                          />
                        )}
                        <div className="flex items-center gap-2.5 min-w-0 relative z-10">
                          <div className="w-5 h-5 flex items-center justify-center shrink-0">
                            <Icon className={`w-4 h-4 transition-colors shrink-0 ${isActive ? 'text-white' : 'text-white/80 group-hover:text-white'}`} />
                          </div>
                          <span className="truncate leading-normal">{item.label}</span>
                        </div>

                        {item.badge && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1 transition-all shadow-2xs shrink-0 ${
                            isActive ? 'bg-white text-[#C61D45]' : 'bg-white/20 text-white border border-white/30'
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
                          ? 'bg-white/25 text-white shadow-sm border border-white/35 font-bold'
                          : 'text-white/70 hover:text-white hover:bg-white/12'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-white" />
                      {(item.badge || item.hasDot) && (
                        <span className="absolute top-0.5 right-0.5 flex h-2.5 w-2.5">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${item.hasDot ? 'bg-amber-300' : 'bg-white'} opacity-75`}></span>
                          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${item.hasDot ? 'bg-amber-400' : 'bg-white'} border border-[#C61D45]`}></span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};
