import { User, UserPermissions, SystemModuleId } from '../types';

export interface DepartmentInfo {
  id: string;
  name: string;
  code: string;
  icon: string;
  description: string;
  primaryModules: SystemModuleId[];
}

export interface RoleInfo {
  code: string;
  name: string;
  defaultDepartment: string;
  description: string;
  defaultModules: SystemModuleId[];
  defaultPermissions: UserPermissions;
}

export const DEPARTMENTS: DepartmentInfo[] = [
  {
    id: 'dept-civil',
    name: 'Civil Engineering',
    code: 'CIVIL',
    icon: '🏗️',
    description: 'Site engineering, structural works, quality vetting & execution',
    primaryModules: ['dashboard', 'projects', 'tasks', 'attendance', 'materials', 'equipment', 'mom', 'files', 'dpr'],
  },
  {
    id: 'dept-ops',
    name: 'Site Operations',
    code: 'SITE_OPS',
    icon: '👷',
    description: 'Field execution, daily workforce attendance, equipment & safety',
    primaryModules: ['dashboard', 'projects', 'tasks', 'attendance', 'equipment', 'mom', 'dpr'],
  },
  {
    id: 'dept-fin',
    name: 'Finance & Accounts',
    code: 'FINANCE',
    icon: '💳',
    description: 'Cash flow, payments, project invoicing, party ledgers & approvals',
    primaryModules: ['dashboard', 'projects', 'finance', 'files'],
  },
  {
    id: 'dept-pm',
    name: 'Project Management',
    code: 'PM',
    icon: '📊',
    description: 'Schedule leadership, WBS milestones, resource allocation & DPR',
    primaryModules: ['dashboard', 'projects', 'tasks', 'attendance', 'materials', 'equipment', 'mom', 'files', 'dpr'],
  },
  {
    id: 'dept-exec',
    name: 'Executive Management',
    code: 'EXEC',
    icon: '🏢',
    description: 'Company direction, enterprise governance, high-level financials & audit',
    primaryModules: ['dashboard', 'projects', 'tasks', 'attendance', 'materials', 'equipment', 'mom', 'files', 'finance', 'dpr', 'users_admin'],
  },
  {
    id: 'dept-proc',
    name: 'Procurement & Materials',
    code: 'PROC',
    icon: '📦',
    description: 'Vendor orders, material requisitions, GRN delivery & warehouse stock',
    primaryModules: ['dashboard', 'projects', 'materials', 'files'],
  },
  {
    id: 'dept-wh',
    name: 'Warehouse & Logistics',
    code: 'WAREHOUSE',
    icon: '🏬',
    description: 'Stock management, site store keeping, dispatch & material returns',
    primaryModules: ['dashboard', 'projects', 'materials', 'equipment', 'files'],
  },
  {
    id: 'dept-arch',
    name: 'Architecture & Design',
    code: 'ARCH',
    icon: '📐',
    description: 'Architectural drawings, 3D renderings & design specifications',
    primaryModules: ['dashboard', 'projects', 'files', 'mom'],
  },
  {
    id: 'dept-admin',
    name: 'Office Administration',
    code: 'ADMIN',
    icon: '⚙️',
    description: 'User access control, staff roster, settings & organizational setup',
    primaryModules: ['dashboard', 'projects', 'tasks', 'attendance', 'materials', 'equipment', 'mom', 'files', 'finance', 'dpr', 'users_admin'],
  },
  {
    id: 'dept-client',
    name: 'Client Portal',
    code: 'CLIENT',
    icon: '🤝',
    description: 'Dedicated client interface: milestone approvals & progress documents',
    primaryModules: ['dashboard', 'projects', 'files'],
  },
];

export const SYSTEM_ROLES: RoleInfo[] = [
  {
    code: 'SUPER_ADMIN',
    name: 'Super Admin',
    defaultDepartment: 'Executive Management',
    description: 'Complete workspace access to entire company system, all departments & settings',
    defaultModules: ['dashboard', 'projects', 'tasks', 'attendance', 'materials', 'equipment', 'mom', 'files', 'finance', 'dpr', 'users_admin'],
    defaultPermissions: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, approval_limit: 10000000 },
  },
  {
    code: 'ADMIN',
    name: 'Admin',
    defaultDepartment: 'Office Administration',
    description: 'Full operational access across projects, financials & user management',
    defaultModules: ['dashboard', 'projects', 'tasks', 'attendance', 'materials', 'equipment', 'mom', 'files', 'finance', 'dpr', 'users_admin'],
    defaultPermissions: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, approval_limit: 5000000 },
  },
  {
    code: 'PROJECT_MANAGER',
    name: 'Project Manager',
    defaultDepartment: 'Project Management',
    description: 'Project leadership, WBS task delegation, resource tracking & milestone sign-offs',
    defaultModules: ['dashboard', 'projects', 'tasks', 'attendance', 'materials', 'equipment', 'mom', 'files', 'dpr'],
    defaultPermissions: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_approve: true, approval_limit: 2500000 },
  },
  {
    code: 'SITE_ENGINEER',
    name: 'Site Engineer',
    defaultDepartment: 'Civil Engineering',
    description: 'Site progress monitoring, subcontractor bills, site expense entries & material stock control',
    defaultModules: ['dashboard', 'projects', 'tasks', 'attendance', 'materials', 'equipment', 'finance', 'mom', 'files', 'dpr'],
    defaultPermissions: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_approve: false, approval_limit: 0 },
  },
  {
    code: 'SUPERVISOR',
    name: 'Site Supervisor',
    defaultDepartment: 'Site Operations',
    description: 'Daily labor roster, worker attendance check-in, equipment operation logs',
    defaultModules: ['dashboard', 'projects', 'tasks', 'attendance', 'equipment', 'mom', 'dpr'],
    defaultPermissions: { can_view: true, can_create: true, can_edit: false, can_delete: false, can_approve: false, approval_limit: 0 },
  },
  {
    code: 'FINANCE',
    name: 'Finance / Accounts',
    defaultDepartment: 'Finance & Accounts',
    description: 'Payment requests, party ledgers, cashflow & invoice approvals',
    defaultModules: ['dashboard', 'projects', 'finance', 'files'],
    defaultPermissions: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_approve: true, approval_limit: 1000000 },
  },
  {
    code: 'PROCUREMENT',
    name: 'Purchase Officer',
    defaultDepartment: 'Procurement & Materials',
    description: 'Material orders, vendor RFQs, purchase receipts & inventory management',
    defaultModules: ['dashboard', 'projects', 'materials', 'files'],
    defaultPermissions: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_approve: false, approval_limit: 200000 },
  },
  {
    code: 'STORE_KEEPER',
    name: 'Store Keeper',
    defaultDepartment: 'Warehouse & Logistics',
    description: 'Site warehouse, physical stock verification & machinery checkouts',
    defaultModules: ['dashboard', 'projects', 'materials', 'equipment', 'files'],
    defaultPermissions: { can_view: true, can_create: true, can_edit: false, can_delete: false, can_approve: false, approval_limit: 0 },
  },
  {
    code: 'CLIENT',
    name: 'Client Representative',
    defaultDepartment: 'Client Portal',
    description: 'View project progress, drawings, meeting minutes & milestones',
    defaultModules: ['dashboard', 'projects', 'files'],
    defaultPermissions: { can_view: true, can_create: false, can_edit: false, can_delete: false, can_approve: true, approval_limit: 0 },
  },
];

// Pre-seeded database of all existing users from Backend & Web Admin
let USERS_DATABASE: User[] = [
  {
    id: 'usr-1',
    username: 'admin',
    name: 'Rajesh Chandran',
    email: 'admin@siteops.io',
    phone: '9840123456',
    role: 'Super Admin',
    role_code: 'SUPER_ADMIN',
    department: 'Executive Management',
    status: 'ACTIVE',
    allowedPages: ['dashboard', 'projects', 'tasks', 'attendance', 'materials', 'equipment', 'mom', 'files', 'finance', 'dpr', 'users_admin'],
    permissions: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, approval_limit: 10000000 },
    is_org_admin: true,
  },
  {
    id: 'usr-2',
    username: 'anandhi.admin',
    name: 'Anandhi Venkatesh',
    email: 'anandhi@booshnam.com',
    phone: '9840234567',
    role: 'Admin',
    role_code: 'ADMIN',
    department: 'Office Administration',
    status: 'ACTIVE',
    allowedPages: ['dashboard', 'projects', 'tasks', 'attendance', 'materials', 'equipment', 'mom', 'files', 'finance', 'dpr', 'users_admin'],
    permissions: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, approval_limit: 5000000 },
    is_org_admin: true,
  },
  {
    id: 'usr-3',
    username: 'arun.verma',
    name: 'Arun Verma',
    email: 'site@siteops.io',
    phone: '9840345678',
    role: 'Site Engineer',
    role_code: 'SITE_ENGINEER',
    department: 'Civil Engineering',
    status: 'ACTIVE',
    allowedPages: ['dashboard', 'projects', 'tasks', 'attendance', 'materials', 'equipment', 'mom', 'files', 'dpr'],
    permissions: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_approve: false },
    is_org_admin: false,
  },
  {
    id: 'usr-velmurugan',
    username: 'velmurugan',
    name: 'Velmurugan',
    email: 'velmurugan@booshnam.com',
    phone: '9840123499',
    role: 'Site Engineer',
    role_code: 'SITE_ENGINEER',
    department: 'Civil Engineering',
    status: 'ACTIVE',
    allowedPages: ['dashboard', 'projects', 'tasks', 'attendance', 'materials', 'equipment', 'mom', 'files', 'dpr'],
    permissions: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_approve: false },
    is_org_admin: false,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop',
  },
  {
    id: 'usr-4',
    username: 'murugan',
    name: 'Murugan V',
    email: 'murugan@booshnam.com',
    phone: '9047549682',
    role: 'Site Engineer',
    role_code: 'SITE_ENGINEER',
    department: 'Civil Engineering',
    status: 'ACTIVE',
    allowedPages: ['dashboard', 'projects', 'tasks', 'attendance', 'materials', 'equipment', 'mom', 'files', 'dpr'],
    permissions: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_approve: false },
    is_org_admin: false,
  },
  {
    id: 'usr-5',
    username: 'likson',
    name: 'Likson',
    email: 'likson@booshnam.com',
    phone: '9444006047',
    role: 'Site Engineer',
    role_code: 'SITE_ENGINEER',
    department: 'Civil Engineering',
    status: 'ACTIVE',
    allowedPages: ['dashboard', 'projects', 'tasks', 'attendance', 'materials', 'equipment', 'mom', 'files', 'dpr'],
    permissions: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_approve: false },
    is_org_admin: false,
  },
  {
    id: 'usr-6',
    username: 'ravi.kumar',
    name: 'Ravi Kumar',
    email: 'ravi.k@booshnam.com',
    phone: '9840456789',
    role: 'Site Supervisor',
    role_code: 'SUPERVISOR',
    department: 'Site Operations',
    status: 'ACTIVE',
    allowedPages: ['dashboard', 'projects', 'tasks', 'attendance', 'equipment', 'mom', 'dpr'],
    permissions: { can_view: true, can_create: true, can_edit: false, can_delete: false, can_approve: false },
    is_org_admin: false,
  },
  {
    id: 'usr-7',
    username: 'suresh',
    name: 'Suresh Kumar',
    email: 'suresh@booshnam.com',
    phone: '9840223344',
    role: 'Site Supervisor',
    role_code: 'SUPERVISOR',
    department: 'Site Operations',
    status: 'ACTIVE',
    allowedPages: ['dashboard', 'projects', 'tasks', 'attendance', 'equipment', 'mom', 'dpr'],
    permissions: { can_view: true, can_create: true, can_edit: false, can_delete: false, can_approve: false },
    is_org_admin: false,
  },
  {
    id: 'usr-8',
    username: 'kavitha.accounts',
    name: 'Kavitha Selvan',
    email: 'kavitha@booshnam.com',
    phone: '9840567890',
    role: 'Finance / Accounts',
    role_code: 'FINANCE',
    department: 'Finance & Accounts',
    status: 'ACTIVE',
    allowedPages: ['dashboard', 'projects', 'finance', 'files'],
    permissions: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_approve: true, approval_limit: 500000 },
    is_org_admin: false,
  },
  {
    id: 'usr-9',
    username: 'rajesh.pm',
    name: 'Balaji Govind',
    email: 'pm@siteops.io',
    phone: '9840678901',
    role: 'Project Manager',
    role_code: 'PROJECT_MANAGER',
    department: 'Project Management',
    status: 'ACTIVE',
    allowedPages: ['dashboard', 'projects', 'tasks', 'attendance', 'materials', 'equipment', 'mom', 'files', 'dpr'],
    permissions: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_approve: true, approval_limit: 2500000 },
    is_org_admin: false,
  },
  {
    id: 'usr-10',
    username: 'karthik',
    name: 'Karthik Nair',
    email: 'procure@siteops.io',
    phone: '9840889900',
    role: 'Purchase Officer',
    role_code: 'PROCUREMENT',
    department: 'Procurement & Materials',
    status: 'ACTIVE',
    allowedPages: ['dashboard', 'projects', 'materials', 'files'],
    permissions: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_approve: false },
    is_org_admin: false,
  },
  {
    id: 'usr-11',
    username: 'ramesh',
    name: 'Ramesh Patel',
    email: 'store@siteops.io',
    phone: '9840990011',
    role: 'Store Keeper',
    role_code: 'STORE_KEEPER',
    department: 'Warehouse & Logistics',
    status: 'ACTIVE',
    allowedPages: ['dashboard', 'projects', 'materials', 'equipment', 'files'],
    permissions: { can_view: true, can_create: true, can_edit: false, can_delete: false, can_approve: false },
    is_org_admin: false,
  },
  {
    id: 'usr-12',
    username: 'aditya',
    name: 'Aditya Birla',
    email: 'client@siteops.io',
    phone: '9840332211',
    role: 'Client Representative',
    role_code: 'CLIENT',
    department: 'Client Portal',
    status: 'ACTIVE',
    allowedPages: ['dashboard', 'projects', 'files'],
    permissions: { can_view: true, can_create: false, can_edit: false, can_delete: false, can_approve: true },
    is_org_admin: false,
  },
  {
    id: 'usr-13',
    username: 'inactive.demo',
    name: 'Inactive Site User',
    email: 'inactive@booshnam.com',
    phone: '9999900000',
    role: 'Site Engineer',
    role_code: 'SITE_ENGINEER',
    department: 'Civil Engineering',
    status: 'INACTIVE',
    allowedPages: ['dashboard', 'projects', 'tasks', 'attendance'],
    permissions: { can_view: true, can_create: false, can_edit: false, can_delete: false, can_approve: false },
    is_org_admin: false,
  },
];

// Listeners for real-time reactivity
type ListenerCallback = (users: User[]) => void;
const listeners: Set<ListenerCallback> = new Set();

function notifyListeners() {
  const current = [...USERS_DATABASE];
  listeners.forEach(cb => {
    try {
      cb(current);
    } catch (e) {
      console.error('Error notifying user listener', e);
    }
  });
}

export const UserService = {
  // Subscribe to changes in user list
  subscribe(callback: ListenerCallback): () => void {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },

  // Get all users
  getAllUsers(): User[] {
    return [...USERS_DATABASE];
  },

  // Get user by ID
  getUserById(id: string): User | undefined {
    return USERS_DATABASE.find(u => u.id === id);
  },

  // Authenticate by username, email, or phone + password
  authenticate(identifier: string, _password?: string): { success: boolean; user?: User; error?: string } {
    const clean = identifier.trim().toLowerCase();
    const cleanDigits = identifier.replace(/\D/g, '');

    const user = USERS_DATABASE.find(u => {
      const matchUname = u.username.toLowerCase() === clean;
      const matchEmail = u.email.toLowerCase() === clean;
      const matchPhone = cleanDigits.length >= 7 && u.phone.replace(/\D/g, '').includes(cleanDigits);
      return matchUname || matchEmail || matchPhone;
    });

    if (!user) {
      return {
        success: false,
        error: `No account found for "${identifier}". Please check username, email or mobile number.`,
      };
    }

    if (user.status === 'INACTIVE') {
      return {
        success: false,
        error: `Account Deactivated: The account for ${user.name} has been deactivated by Admin. Contact administrator to restore access.`,
      };
    }

    return { success: true, user };
  },

  // Authenticate via Phone OTP
  authenticateByPhone(phoneNumber: string): { success: boolean; user?: User; error?: string } {
    const cleanDigits = phoneNumber.replace(/\D/g, '');
    if (!cleanDigits || cleanDigits.length < 7) {
      return { success: false, error: 'Please enter a valid mobile number.' };
    }

    const user = USERS_DATABASE.find(u => u.phone.replace(/\D/g, '').includes(cleanDigits));

    if (!user) {
      // Default to Murugan if first-time demo test phone
      const fallback = USERS_DATABASE.find(u => u.username === 'murugan') || USERS_DATABASE[0];
      return { success: true, user: fallback };
    }

    if (user.status === 'INACTIVE') {
      return {
        success: false,
        error: `Account Deactivated: This mobile number is associated with an inactive account (${user.name}). Contact Admin.`,
      };
    }

    return { success: true, user };
  },

  // Admin: Update user details, role, department, permissions, or status
  updateUser(updatedUser: User): void {
    const idx = USERS_DATABASE.findIndex(u => u.id === updatedUser.id);
    if (idx >= 0) {
      USERS_DATABASE[idx] = { ...updatedUser };
      notifyListeners();
    }
  },

  // Admin: Toggle active/inactive status
  toggleUserStatus(userId: string): User | undefined {
    const user = USERS_DATABASE.find(u => u.id === userId);
    if (user) {
      user.status = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      notifyListeners();
      return { ...user };
    }
    return undefined;
  },

  // Admin: Create new user
  createUser(newUser: Omit<User, 'id'>): User {
    const id = `usr-${Date.now()}`;
    const user: User = {
      ...newUser,
      id,
    };
    USERS_DATABASE.unshift(user);
    notifyListeners();
    return user;
  },

  // Check if user has access to a specific module
  hasModuleAccess(user: User, moduleId: SystemModuleId): boolean {
    if (user.role_code === 'SUPER_ADMIN') return true;
    return user.allowedPages.includes(moduleId);
  },

  // Check if user has permission for an action
  hasAction(user: User, action: keyof UserPermissions): boolean {
    if (user.role_code === 'SUPER_ADMIN') return true;
    return Boolean(user.permissions[action]);
  },

  // Get all department options
  getDepartments(): DepartmentInfo[] {
    return DEPARTMENTS;
  },

  // Get all system roles
  getRoles(): RoleInfo[] {
    return SYSTEM_ROLES;
  },
};
