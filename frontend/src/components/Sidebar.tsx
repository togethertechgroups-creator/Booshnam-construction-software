import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutGrid, FileText, Home, Users, Briefcase, CreditCard, 
  Package, ShoppingCart, Archive, Truck, ClipboardCheck, 
  BookOpen, Settings, ChevronDown, ArrowLeft, Shield, Smartphone,
  Layers, ListTodo, UserCheck, Calculator, ShieldCheck, Menu, LogOut,
  Landmark
} from 'lucide-react';
import { Role } from '../types';
import { MOCK_ROLES } from '../lib/mockData';
import { isPageAllowedForRole, getStoredRolePermissions } from '../lib/roleAccess';
import { isPageAllowedForActiveUser, logoutUser, getCurrentUserAccount } from '../lib/authService';
import { confirmSignOut } from '../lib/dialogService';

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
}

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
  const [availableRoles, setAvailableRoles] = useState<Role[]>(MOCK_ROLES);
  const [, setRolePermissionsTick] = useState(0);
  const activeAccount = getCurrentUserAccount();

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

  // Dynamic Navigation Groups matching Role-Based Access & User Account Specific Allowed Pages
  const getNavGroups = (): NavGroupItem[][] => {
    // 1. Client-specific portal view
    if (activeRole.code === 'CLIENT') {
      const portalGroup: NavGroupItem[] = [];
      if (isPageAllowedForRole('CLIENT', 'projects') && isPageAllowedForActiveUser('projects')) {
        portalGroup.push({ id: 'client_portal', label: 'My Project Portal', icon: Home });
      }
      if (isPageAllowedForRole('CLIENT', 'approvals') && isPageAllowedForActiveUser('approvals')) {
        portalGroup.push({ id: 'approvals', label: 'Design Approvals', icon: ShieldCheck, badge: '1' });
      }
      if (isPageAllowedForRole('CLIENT', 'documents') && isPageAllowedForActiveUser('documents')) {
        portalGroup.push({ id: 'documents', label: 'Project Documents', icon: BookOpen });
      }
      const settingsGroup: NavGroupItem[] = [];
      if (isPageAllowedForRole('CLIENT', 'setting') && isPageAllowedForActiveUser('setting')) {
        settingsGroup.push({ id: 'setting', label: 'Profile Settings', icon: Settings });
      }
      return [portalGroup, settingsGroup].filter(g => g.length > 0);
    }

    // 2. Dynamic granular permissions for all other roles
    const allGroups: NavGroupItem[][] = [
      // Group 1: Core Operations
      [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
        { id: 'projects', label: 'Projects', icon: Home },
        { id: 'departments', label: 'Departments', icon: Layers },
        { id: 'tasks', label: 'Tasks', icon: ListTodo, badge: '11' }
      ],
      // Group 2: Clients & People
      [
        { id: 'clients', label: 'Clients', icon: UserCheck },
        { id: 'workforce', label: 'Staff & Payroll', icon: Users }
      ],
      // Group 3: Financials & Supply Chain
      [
        { id: 'finance', label: 'Accounts & Finance', icon: Landmark },
        { id: 'payments', label: 'Payments & Ledger', icon: CreditCard },
        { id: 'procurement', label: 'Procurement', icon: ShoppingCart },
        { id: 'equipment', label: 'Fleet & Assets', icon: Truck }
      ],
      // Group 4: Repository, Governance & Config
      [
        { id: 'documents', label: 'Documents', icon: BookOpen },
        { id: 'approvals', label: 'Approvals', icon: ShieldCheck, badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount}` : null },
        { id: 'site_ops', label: 'Reports (DPR)', icon: FileText },
        { id: 'snags', label: 'Snags & QA', icon: ClipboardCheck },
        { id: 'setting', label: 'Settings', icon: Settings }
      ]
    ];

    // Filter each group based on permissions: if user account has specific allowedPages, use isPageAllowedForActiveUser
    return allGroups
      .map(group => group.filter(item => {
        if (activeAccount && activeAccount.role_code !== 'SUPER_ADMIN') {
          return isPageAllowedForActiveUser(item.id);
        }
        return isPageAllowedForRole(activeRole.code, item.id) && isPageAllowedForActiveUser(item.id);
      }))
      .filter(group => group.length > 0);
  };

  const navGroups = getNavGroups();

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
        isOpen ? 'w-64 shadow-2xl' : 'w-[72px] shadow-lg'
      }`}>

        {/* ── Brand Header ── */}
        <div className="p-3 border-b border-slate-100 relative bg-white">
          {isOpen ? (
            /* EXPANDED: Logo + Booshnam Associates + Staff Name & Role + hamburger toggle */
            <div className="flex items-center justify-between">
              {/* Left: Logo circle + text */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Red Circle Logo */}
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-black text-[9px] tracking-tighter shrink-0 shadow-md shadow-red-600/30 uppercase select-none ring-2 ring-red-100">
                  BOOSHNAM
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 tracking-wide truncate">
                    Booshnam Associates
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5" title={`${activeAccount?.staff_name || 'Admin'} • ${activeAccount?.role_name || activeRole.name || 'Admin'}`}>
                    {activeAccount?.staff_name ? `${activeAccount.staff_name} • ` : ''}{activeAccount?.role_name || activeRole.name || 'Admin'}
                  </div>
                </div>
              </div>

              {/* Right: Hamburger toggle button */}
              {onToggle && (
                <button
                  type="button"
                  onClick={onToggle}
                  title="Collapse Sidebar"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0 ml-1"
                >
                  <Menu className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            /* COLLAPSED MINI: Just the circle logo centered, hamburger below */
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-black text-[9px] tracking-tighter shrink-0 shadow-md shadow-red-600/30 uppercase select-none ring-2 ring-red-100">
                B
              </div>
              {onToggle && (
                <button
                  type="button"
                  onClick={onToggle}
                  title="Expand Sidebar"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <Menu className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Navigation Menu ── */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-200" style={{ paddingLeft: isOpen ? '12px' : '8px', paddingRight: isOpen ? '12px' : '8px' }}>
          {navGroups.map((group, gIdx) => (
            <React.Fragment key={gIdx}>
              <div className="space-y-0.5">
                {group.map((item) => {
                  const Icon = item.icon;
                  const isActive = 
                    currentView === item.id ||
                    (item.id === 'finance' && (currentView === 'finance' || currentView === 'accounts_finance')) ||
                    (item.id === 'dashboard' && (currentView === 'company_dashboard' || currentView === 'dashboard')) ||
                    (item.id === 'site_ops' && (currentView === 'site_ops' || currentView === 'report')) ||
                    (item.id === 'workforce' && (currentView === 'workforce' || currentView === 'payroll')) ||
                    (item.id === 'procurement' && (currentView === 'procurement' || currentView === 'warehouse')) ||
                    (item.id === 'equipment' && (currentView === 'equipment' || currentView === 'asset')) ||
                    (item.id === 'documents' && (currentView === 'documents' || currentView === 'library')) ||
                    (item.id === 'setting' && currentView === 'setting');

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectView(item.id === 'dashboard' ? 'company_dashboard' : item.id)}
                      title={!isOpen ? item.label : undefined}
                      className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                        isOpen ? 'justify-between px-3.5 py-2.5' : 'justify-center py-2.5 px-0'
                      } ${
                        isActive
                          ? 'bg-red-600 text-white shadow-sm shadow-red-600/25 font-bold'
                          : 'text-slate-700 hover:text-red-600 hover:bg-red-50/70'
                      }`}
                    >
                      <div className={`flex items-center ${isOpen ? 'gap-3' : ''}`}>
                        <Icon className={`w-4 h-4 transition-colors shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-red-600'}`} />
                        {isOpen && (
                          <span className="tracking-wide text-xs">{item.label}</span>
                        )}
                      </div>

                      {isOpen && item.badge && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold transition-colors ${
                          isActive ? 'bg-white text-red-600' : 'bg-red-600 text-white'
                        }`}>
                          {item.badge}
                        </span>
                      )}

                      {/* Mini mode: badge as small dot */}
                      {!isOpen && item.badge && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-600" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Dotted Divider between groups */}
              {gIdx < navGroups.length - 1 && (
                <div className={`border-b border-dotted border-slate-200 my-2 ${isOpen ? 'mx-1' : 'mx-0'}`} />
              )}
            </React.Fragment>
          ))}
        </nav>

        {/* ── Mobile Site Companion Launcher & Sign Out ── */}
        <div className={`border-t border-slate-100 bg-slate-50/70 space-y-1.5 ${isOpen ? 'p-3' : 'p-2'}`}>
          <button
            type="button"
            onClick={onOpenMobileSim}
            title={!isOpen ? 'Mobile App View' : undefined}
            className={`w-full flex items-center gap-2 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 border border-red-200 rounded-xl text-xs font-semibold transition-all shadow-2xs hover:border-red-300 cursor-pointer ${
              isOpen ? 'justify-center px-3 py-2' : 'justify-center py-2 px-0'
            }`}
          >
            <Smartphone className="w-4 h-4 text-red-500 shrink-0" />
            {isOpen && <span>Mobile App View</span>}
          </button>

          {/* Removed Sign Out button */}

          {isOpen && (
            <div className="text-center text-[10px] text-slate-400 pt-1">
              Booshnam Associates © 2026
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
