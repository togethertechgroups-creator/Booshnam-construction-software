export interface SystemModule {
  id: string;
  name: string;
  category: 'Core Operations' | 'Financials & Supply' | 'Repository & Quality' | 'Administration';
  description: string;
}

export const ALL_SYSTEM_MODULES: SystemModule[] = [
  { id: 'dashboard', name: 'Dashboard', category: 'Core Operations', description: 'Company performance KPIs, active projects count, revenue & operations overview' },
  { id: 'projects', name: 'Projects', category: 'Core Operations', description: 'Project directory, WBS scheduling, task execution & site progress tracking' },
  { id: 'quotation', name: 'Leads & Quotation', category: 'Core Operations', description: 'Commercial cost estimation, quotations & client lead inquiries' },
  { id: 'schedule', name: 'Schedule & Timesheet', category: 'Core Operations', description: 'Team Gantt schedule for quotation tasks & staff timesheets' },
  { id: 'departments', name: 'Departments', category: 'Core Operations', description: 'Soil investigation, Architectural design hub, Marketing & Accounts' },
  { id: 'workforce', name: 'Staff & Payroll', category: 'Financials & Supply', description: 'Workforce roster, daily biometric attendance, muster roll & wage payouts' },
  { id: 'finance', name: 'Accounts & Finance', category: 'Financials & Supply', description: 'Payment requests, party ledgers, cash & bank transactions, Tally/Zoho sync' },
  { id: 'payments', name: 'Payments & Ledger', category: 'Financials & Supply', description: 'Project cashflow ledger, client receipts, vendor invoices & payment processing' },
  { id: 'procurement', name: 'Procurement', category: 'Financials & Supply', description: 'Material requisitions, purchase orders (PO), GRN deliveries & stock inventory' },
  { id: 'equipment', name: 'Assets', category: 'Financials & Supply', description: 'Machinery tracking, vehicle fleet, equipment allocation & maintenance logs' },
  { id: 'documents', name: 'Documents', category: 'Repository & Quality', description: 'Engineering drawings, architectural specs, agreements & compliance file vault' },
  { id: 'approvals', name: 'Approvals', category: 'Repository & Quality', description: 'Multi-tiered authorization workflow for expenses, drawings & change orders' },
  { id: 'site_ops', name: 'Reports (DPR)', category: 'Repository & Quality', description: 'Daily Progress Reports (DPR), site photos, weather logs & labour counts' },
  { id: 'setting', name: 'Settings', category: 'Administration', description: 'Company profile, branches, business configuration, roles & permissions' },
];

export interface RoleAccessPermission {
  roleCode: string;
  roleName: string;
  description: string;
  allowedPages: string[];
  department?: string;
  isSystemRole?: boolean;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<string, RoleAccessPermission> = {
  SUPER_ADMIN: {
    roleCode: 'SUPER_ADMIN',
    roleName: 'Super Admin',
    description: 'Complete workspace access to entire company system & settings',
    allowedPages: ALL_SYSTEM_MODULES.map(m => m.id),
    isSystemRole: true,
  },
  ADMIN: {
    roleCode: 'ADMIN',
    roleName: 'Admin',
    description: 'Full operational access across all projects, financials & staff management',
    allowedPages: ALL_SYSTEM_MODULES.map(m => m.id),
    isSystemRole: true,
  },
  PROJECT_MANAGER: {
    roleCode: 'PROJECT_MANAGER',
    roleName: 'Project Manager',
    description: 'Overall project leadership, team delegation, budget & schedule execution',
    allowedPages: ['dashboard', 'projects', 'quotation', 'schedule', 'site_ops', 'workforce', 'finance', 'payments', 'procurement', 'equipment', 'documents', 'approvals', 'setting'],
    isSystemRole: true,
  },
  SUPERVISOR: {
    roleCode: 'SUPERVISOR',
    roleName: 'Supervisor',
    description: 'Assigned project supervision, daily progress, attendance & site operations',
    allowedPages: ['projects', 'schedule', 'workforce', 'site_ops', 'documents', 'approvals', 'setting'],
    isSystemRole: true,
  },
  SITE_ENGINEER: {
    roleCode: 'SITE_ENGINEER',
    roleName: 'Site Engineer',
    description: 'Assigned project execution, daily DPR updates, material tracking & payment requests',
    allowedPages: ['projects', 'schedule', 'site_ops', 'finance', 'payments', 'documents', 'approvals', 'setting'],
    isSystemRole: true,
  },
  ARCHITECT: {
    roleCode: 'ARCHITECT',
    roleName: 'Architect',
    description: 'Drawings, 3D models, architectural hub version management & drawing approvals',
    allowedPages: ['projects', 'departments', 'approvals', 'documents', 'setting'],
    isSystemRole: true,
  },
  CLIENT: {
    roleCode: 'CLIENT',
    roleName: 'Client',
    description: 'Dedicated Client Portal: view project progress, approve designs & documents',
    allowedPages: ['projects', 'approvals', 'documents', 'setting'],
    isSystemRole: true,
  },
  ACCOUNTS: {
    roleCode: 'ACCOUNTS',
    roleName: 'Accounts',
    description: 'Financial ledger, payment processing, vendor invoices, BOQ & payroll',
    allowedPages: ['dashboard', 'finance', 'payments', 'workforce', 'procurement', 'approvals', 'setting'],
    isSystemRole: true,
  },
  EMPLOYEE: {
    roleCode: 'EMPLOYEE',
    roleName: 'Other Staff / Employee',
    description: 'Field task execution, attendance, daily work logs & documents',
    allowedPages: ['projects', 'site_ops', 'documents', 'setting'],
    isSystemRole: true,
  },
  MARKETING: {
    roleCode: 'MARKETING',
    roleName: 'Marketing',
    description: 'Lead generation, CRM management, assign leads to sales or specific departments',
    allowedPages: ['quotation'],
    isSystemRole: true,
    department: 'Marketing',
  },
};

const STORAGE_KEY = 'booshnam_role_permissions_v2';

export function getStoredRolePermissions(): Record<string, RoleAccessPermission> {
  if (typeof window === 'undefined') return DEFAULT_ROLE_PERMISSIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('booshnam_role_permissions_v1');
    if (!raw) return DEFAULT_ROLE_PERMISSIONS;
    const parsed = JSON.parse(raw);
    const merged: Record<string, RoleAccessPermission> = { ...DEFAULT_ROLE_PERMISSIONS, ...parsed };
    // Filter out obsolete 'tasks' and 'snags' standalone module IDs
    const sanitized: Record<string, RoleAccessPermission> = {};
    for (const [code, perm] of Object.entries(merged)) {
      const pages = (perm.allowedPages || []).filter(p => p !== 'tasks' && p !== 'snags');
      if (code !== 'CLIENT' && !pages.includes('schedule')) {
        pages.push('schedule');
      }
      sanitized[code] = {
        ...perm,
        allowedPages: pages
      };
    }
    return sanitized;
  } catch (e) {
    console.error('Failed to parse stored role permissions', e);
    return DEFAULT_ROLE_PERMISSIONS;
  }
}

export function saveStoredRolePermission(permission: RoleAccessPermission): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredRolePermissions();
    current[permission.roleCode] = permission;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));

    // Synchronize all user accounts with this role code
    try {
      const accountsRaw = localStorage.getItem('booshnam_user_accounts_v2');
      if (accountsRaw) {
        const accounts = JSON.parse(accountsRaw);
        const updatedAccounts = accounts.map((a: any) => {
          if (a.role_code === permission.roleCode || (permission.roleCode === 'ADMIN' && a.username === 'admin')) {
            return { ...a, allowedPages: permission.allowedPages };
          }
          return a;
        });
        localStorage.setItem('booshnam_user_accounts_v2', JSON.stringify(updatedAccounts));
      }
    } catch (e) {}

    // Synchronize active session if current user has this role
    try {
      const sessRaw = localStorage.getItem('booshnam_active_session_v2');
      if (sessRaw) {
        const sess = JSON.parse(sessRaw);
        if (sess && (sess.role_code === permission.roleCode || (permission.roleCode === 'ADMIN' && sess.username === 'admin'))) {
          const updatedSess = { ...sess, allowedPages: permission.allowedPages };
          localStorage.setItem('booshnam_active_session_v2', JSON.stringify(updatedSess));
          window.dispatchEvent(new CustomEvent('booshnam_session_changed', { detail: updatedSess }));
        }
      }
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('siteops_role_access_updated', { detail: permission }));
  } catch (e) {
    console.error('Failed to save role permission', e);
  }
}

export function resetRolePermissions(): Record<string, RoleAccessPermission> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    // Reset admin accounts to default permissions
    try {
      const accountsRaw = localStorage.getItem('booshnam_user_accounts_v2');
      if (accountsRaw) {
        const accounts = JSON.parse(accountsRaw);
        const updatedAccounts = accounts.map((a: any) => {
          const defaultPerm = DEFAULT_ROLE_PERMISSIONS[a.role_code];
          if (defaultPerm) {
            return { ...a, allowedPages: defaultPerm.allowedPages };
          }
          return a;
        });
        localStorage.setItem('booshnam_user_accounts_v2', JSON.stringify(updatedAccounts));
      }
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('siteops_role_access_updated'));
  }
  return DEFAULT_ROLE_PERMISSIONS;
}

export function isPageAllowedForRole(roleCode: string, pageId: string): boolean {
  if (roleCode === 'SUPER_ADMIN' || roleCode === 'ADMIN') return true;

  let targetId = pageId;
  if (pageId === 'company_dashboard') targetId = 'dashboard';
  if (pageId === 'payroll') targetId = 'workforce';
  if (pageId === 'crm') targetId = 'clients';
  if (pageId === 'warehouse') targetId = 'procurement';
  if (pageId === 'asset') targetId = 'equipment';
  if (pageId === 'report') targetId = 'site_ops';
  if (pageId === 'library') targetId = 'documents';
  if (pageId === 'finance' || pageId === 'accounts_finance') targetId = 'payments';
  if (pageId === 'timesheet' || pageId === 'team_schedule' || pageId === 'schedule_timesheet') targetId = 'schedule';
  if (pageId.startsWith('dept_') || pageId === 'soil_investigation' || pageId === 'architecture' || pageId === 'marketing' || pageId === 'construction_dept' || pageId === 'accounts_dept') targetId = 'departments';

  if (targetId === 'schedule') {
    return roleCode !== 'CLIENT';
  }

  const permissions = getStoredRolePermissions();
  const config = permissions[roleCode];
  if (!config) return true; // default allow if unknown

  return config.allowedPages.includes(pageId) || config.allowedPages.includes(targetId);
}
