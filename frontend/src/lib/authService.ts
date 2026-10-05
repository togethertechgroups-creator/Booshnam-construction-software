import { ALL_SYSTEM_MODULES, getStoredRolePermissions } from './roleAccess';
import { getStaffMembers } from './staffService';
import { setActiveDepartmentId, normalizeDepartmentId } from './departmentService';

export interface UserAccount {
  id: string;
  username: string;
  password: string;
  phone?: string;
  department?: string;
  staff_id?: string;
  staff_name: string;
  staff_code?: string;
  role_code: string;
  role_name: string;
  allowedPages: string[];
  created_at: string;
}

const DEFAULT_ACCOUNTS: UserAccount[] = [
  {
    id: 'usr-super',
    username: 'superadmin',
    password: 'password123',
    phone: '9840123456',
    staff_id: 'super-admin-master',
    staff_name: 'Super Administrator',
    staff_code: 'EMP-0001',
    role_code: 'SUPER_ADMIN',
    role_name: 'Super Admin',
    department: 'Executive Management',
    allowedPages: ALL_SYSTEM_MODULES.map(m => m.id),
    created_at: '2024-01-01'
  },
  {
    id: 'usr-1',
    username: 'admin',
    password: 'password123',
    phone: '9840000001',
    staff_id: 'admin-master',
    staff_name: 'Administrator',
    staff_code: 'EMP-0002',
    role_code: 'ADMIN',
    role_name: 'Admin',
    department: 'Executive Management',
    allowedPages: ALL_SYSTEM_MODULES.map(m => m.id),
    created_at: '2024-01-01'
  },
  {
    id: 'usr-mkt',
    username: 'marketing',
    password: 'password123',
    phone: '9840000002',
    staff_id: 'mkt-master',
    staff_name: 'Marketing Team',
    staff_code: 'EMP-0003',
    role_code: 'MARKETING',
    role_name: 'Marketing',
    department: 'Marketing',
    allowedPages: ['dashboard', 'quotation', 'setting'],
    created_at: '2024-01-01'
  }
];

const ACCOUNTS_STORAGE_KEY = 'booshnam_user_accounts_v2';
const CURRENT_SESSION_KEY = 'booshnam_active_session_v2';

export function getUserAccounts(): UserAccount[] {
  if (typeof window === 'undefined') return DEFAULT_ACCOUNTS;
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    let parsed: UserAccount[] = raw ? JSON.parse(raw) : DEFAULT_ACCOUNTS;
    // Purge obsolete mock accounts from previous seeds
    let cleaned = parsed.filter(a => 
      a.id !== 'usr-2' && a.id !== 'usr-3' && a.id !== 'usr-4' && a.id !== 'usr-5' &&
      !['anandhi.admin', 'arun.verma', 'ravi.kumar', 'kavitha.accounts'].includes(a.username)
    );

    // Ensure superadmin exists
    if (!cleaned.some(a => a.username === 'superadmin' || a.phone === '9840123456')) {
      cleaned.unshift(DEFAULT_ACCOUNTS[0]);
    }
    // Ensure admin exists
    if (!cleaned.some(a => a.username === 'admin')) {
      cleaned.push(DEFAULT_ACCOUNTS[1]);
    }
    // Ensure marketing exists
    if (!cleaned.some(a => a.username === 'marketing')) {
      cleaned.push(DEFAULT_ACCOUNTS[2]);
    }

    const storedPerms = getStoredRolePermissions();
    const allStaff = getStaffMembers();
    let hasChanges = cleaned.length !== parsed.length;

    cleaned = cleaned.map(a => {
      // Never allow Super Admin accounts to be altered by staff member records
      if (a.role_code === 'SUPER_ADMIN' || a.username === 'superadmin' || a.id === 'usr-super') {
        return a;
      }

      // Find linked staff member
      const aPhone = (a.phone || '').replace(/\D/g, '');
      const aUser = a.username.replace(/\D/g, '');
      const linkedStaff = allStaff.find(s => 
        (a.staff_id && s.id === a.staff_id) || 
        (aPhone && aPhone.length >= 7 && (s.phone || '').replace(/\D/g, '').endsWith(aPhone)) ||
        (aUser && aUser.length >= 7 && (s.phone || '').replace(/\D/g, '').endsWith(aUser))
      );

      if (linkedStaff) {
        if (a.role_code !== linkedStaff.role_code) {
          hasChanges = true;
          a = {
            ...a,
            role_code: linkedStaff.role_code,
            role_name: linkedStaff.role_name || linkedStaff.designation
          };
        }
        if (linkedStaff.department && a.department !== linkedStaff.department) {
          hasChanges = true;
          a = {
            ...a,
            department: linkedStaff.department
          };
        }
      } else if (a.username === 'admin' && a.role_code !== 'ADMIN') {
        hasChanges = true;
        a = { ...a, role_code: 'ADMIN', role_name: 'Admin' };
      }

      const rolePerm = storedPerms[a.role_code];
      if (rolePerm && Array.isArray(rolePerm.allowedPages)) {
        if (!a.allowedPages || JSON.stringify(a.allowedPages) !== JSON.stringify(rolePerm.allowedPages)) {
          hasChanges = true;
          return { ...a, allowedPages: rolePerm.allowedPages };
        }
      }
      return a;
    });

    if (hasChanges) {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(cleaned));
      return cleaned;
    }
    return parsed;
  } catch (e) {
    console.error('Failed to parse user accounts', e);
    return DEFAULT_ACCOUNTS;
  }
}

export function saveUserAccount(account: UserAccount): void {
  const current = getUserAccounts();
  const existingIdx = current.findIndex(a => 
    a.username.toLowerCase() === account.username.toLowerCase() || 
    (account.phone && a.phone === account.phone) ||
    (account.staff_id && a.staff_id === account.staff_id)
  );
  let updated: UserAccount[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = account;
  } else {
    updated = [account, ...current];
  }
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('booshnam_accounts_updated', { detail: updated }));
  } catch (e) {
    console.error('Failed to save user account', e);
  }
}

export function deleteUserAccount(identifier: string): void {
  const current = getUserAccounts();
  const clean = identifier.trim().toLowerCase();
  const cleanDigits = identifier.replace(/\D/g, '');
  const updated = current.filter(a => 
    a.role_code === 'SUPER_ADMIN' || a.username === 'superadmin' || a.id === 'usr-super' || (
      a.id !== identifier && 
      a.staff_id !== identifier && 
      a.username.toLowerCase() !== clean &&
      (!cleanDigits || a.phone?.replace(/\D/g, '') !== cleanDigits)
    )
  );
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('booshnam_accounts_updated', { detail: updated }));
  } catch (e) {}
}

export function syncStaffRoleToAccount(staffId: string, phone: string, newRoleCode: string, newRoleName: string, allowedPages?: string[]): void {
  const accounts = getUserAccounts();
  const cleanPhone = (phone || '').replace(/\D/g, '');
  const storedPerms = getStoredRolePermissions();
  const targetPages = allowedPages || storedPerms[newRoleCode]?.allowedPages || ALL_SYSTEM_MODULES.map(m => m.id);

  const updatedAccounts = accounts.map(a => {
    // Never allow staff sync to mutate Super Admin accounts
    if (a.role_code === 'SUPER_ADMIN' || a.username === 'superadmin' || a.id === 'usr-super') {
      return a;
    }
    const aPhone = (a.phone || '').replace(/\D/g, '');
    const aUser = a.username.replace(/\D/g, '');
    const isMatch = (a.staff_id && a.staff_id === staffId) || (cleanPhone && cleanPhone.length >= 7 && (aPhone.endsWith(cleanPhone) || cleanPhone.endsWith(aPhone) || aUser.endsWith(cleanPhone) || cleanPhone.endsWith(aUser)));
    if (isMatch) {
      return {
        ...a,
        role_code: newRoleCode,
        role_name: newRoleName,
        allowedPages: targetPages
      };
    }
    return a;
  });

  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updatedAccounts));
    window.dispatchEvent(new CustomEvent('booshnam_accounts_updated', { detail: updatedAccounts }));

    // Never demote or change the active session if currently logged in as Super Admin
    const active = getCurrentUserAccount();
    if (active && active.role_code !== 'SUPER_ADMIN' && active.username !== 'superadmin' && active.id !== 'usr-super') {
      const activePhone = (active.phone || '').replace(/\D/g, '');
      const activeUser = active.username.replace(/\D/g, '');
      if ((active.staff_id && active.staff_id === staffId) || (cleanPhone && cleanPhone.length >= 7 && (activePhone.endsWith(cleanPhone) || cleanPhone.endsWith(activePhone) || activeUser.endsWith(cleanPhone) || cleanPhone.endsWith(activeUser)))) {
        const updatedActive = {
          ...active,
          role_code: newRoleCode,
          role_name: newRoleName,
          allowedPages: targetPages
        };
        localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(updatedActive));
        window.dispatchEvent(new CustomEvent('booshnam_session_changed', { detail: updatedActive }));
      }
    }
  } catch (e) {
    console.error('Failed to sync staff role to account', e);
  }
}

export function authenticateUser(usernameOrPhone: string, password: string): UserAccount | null {
  const accounts = getUserAccounts();
  const cleanInput = usernameOrPhone.trim().toLowerCase();
  const cleanPhoneDigits = usernameOrPhone.replace(/\D/g, '');
  const cleanPassword = password.trim();

  const match = accounts.find(a => {
    const aUser = a.username.toLowerCase();
    const aPhoneDigits = (a.phone || '').replace(/\D/g, '');
    const aUserDigits = a.username.replace(/\D/g, '');

    const isUsernameMatch = aUser === cleanInput;
    const isPhoneMatch = cleanPhoneDigits && cleanPhoneDigits.length >= 7 && (
      aPhoneDigits.endsWith(cleanPhoneDigits) || 
      cleanPhoneDigits.endsWith(aPhoneDigits) || 
      aUserDigits.endsWith(cleanPhoneDigits) ||
      cleanPhoneDigits.endsWith(aUserDigits)
    );

    return (isUsernameMatch || isPhoneMatch) && a.password === cleanPassword;
  });
  
  if (match) {
    // Check if associated staff member is INACTIVE and synchronize role
    const allStaff = getStaffMembers();
    const staff = allStaff.find(s => 
      s.id === match.staff_id || 
      (match.phone && (s.phone || '').replace(/\D/g, '') === (match.phone || '').replace(/\D/g, '')) || 
      (cleanPhoneDigits && (s.phone || '').replace(/\D/g, '') === cleanPhoneDigits) ||
      s.phone === match.username
    );
    
    if (staff) {
      if (staff.status === 'INACTIVE') {
        throw new Error('Your account is currently inactive. Contact Admin to restore access.');
      }
      match.role_code = staff.role_code;
      match.role_name = staff.role_name || staff.designation;
      match.staff_name = staff.name;
      if (staff.department) {
        match.department = staff.department;
      }
      const storedPerms = getStoredRolePermissions();
      if (storedPerms[staff.role_code]?.allowedPages) {
        match.allowedPages = storedPerms[staff.role_code].allowedPages;
      }
    }

    // Automatically set the active department to the user's assigned department
    if (match.department && match.role_code !== 'SUPER_ADMIN') {
      try {
        const deptId = normalizeDepartmentId(match.department);
        setActiveDepartmentId(deptId);
      } catch (e) {}
    }

    setCurrentUserAccount(match);
    return match;
  }
  return null;
}

export function getCurrentUserAccount(): UserAccount | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CURRENT_SESSION_KEY);
    if (!raw || raw === 'null' || raw === 'undefined') {
      return null;
    }
    const acc: UserAccount = JSON.parse(raw);

    // If currently logged in as Super Admin, preserve Super Admin session completely
    if (acc.role_code === 'SUPER_ADMIN' || acc.username === 'superadmin' || acc.id === 'usr-super') {
      return acc;
    }

    const allStaff = getStaffMembers();
    const aPhone = (acc.phone || '').replace(/\D/g, '');
    const aUser = acc.username.replace(/\D/g, '');
    const staff = allStaff.find(s => 
      (acc.staff_id && s.id === acc.staff_id) || 
      (aPhone && aPhone.length >= 7 && (s.phone || '').replace(/\D/g, '').endsWith(aPhone)) ||
      (aUser && aUser.length >= 7 && (s.phone || '').replace(/\D/g, '').endsWith(aUser))
    );

    let changed = false;
    if (staff) {
      if (acc.role_code !== staff.role_code) {
        acc.role_code = staff.role_code;
        acc.role_name = staff.role_name || staff.designation;
        acc.staff_name = staff.name;
        changed = true;
      }
      if (staff.department && acc.department !== staff.department) {
        acc.department = staff.department;
        changed = true;
      }
    }

    const storedPerms = getStoredRolePermissions();
    const rolePerm = storedPerms[acc.role_code];
    if (rolePerm && Array.isArray(rolePerm.allowedPages)) {
      if (!acc.allowedPages || JSON.stringify(acc.allowedPages) !== JSON.stringify(rolePerm.allowedPages)) {
        acc.allowedPages = rolePerm.allowedPages;
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(acc));
    }
    return acc;
  } catch (e) {
    console.error('Failed to read active session', e);
    return null;
  }
}

export function setCurrentUserAccount(account: UserAccount | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (account) {
      localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(account));
      const nameParts = (account.staff_name || account.username || 'Staff').split(' ');
      const userObj = {
        id: account.id,
        first_name: nameParts[0] || 'Staff',
        last_name: nameParts.slice(1).join(' ') || '',
        username: account.username,
        role_name: account.role_name,
        role_code: account.role_code,
        phone: '+91 94440 06047',
        is_org_admin: account.role_code === 'SUPER_ADMIN' || account.role_code === 'ADMIN',
        is_site_worker: account.role_code === 'SITE_ENGINEER' || account.role_code === 'SUPERVISOR',
        active_role: {
          id: account.role_code,
          name: account.role_name,
          code: account.role_code,
          description: account.role_name
        }
      };
      localStorage.setItem('siteops_user', JSON.stringify(userObj));
      window.dispatchEvent(new CustomEvent('siteops_user_updated', { detail: userObj }));
    } else {
      localStorage.removeItem(CURRENT_SESSION_KEY);
      localStorage.removeItem('siteops_user');
      window.dispatchEvent(new CustomEvent('siteops_user_updated', { detail: null }));
    }
    window.dispatchEvent(new CustomEvent('booshnam_session_changed', { detail: account }));
    window.dispatchEvent(new CustomEvent('siteops_notifications_updated'));
  } catch (e) {
    console.error('Failed to set current user account', e);
  }
}

export function logoutUser(): void {
  setCurrentUserAccount(null);
  window.dispatchEvent(new CustomEvent('siteops_logout'));
}


export function isPageAllowedForActiveUser(pageId: string): boolean {
  const account = getCurrentUserAccount();
  if (!account) return true;
  if (account.role_code === 'SUPER_ADMIN' || account.role_code === 'ADMIN' || account.username === 'admin' || account.username === 'superadmin') return true;

  // Normalization for aliases
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
    return account.role_code !== 'CLIENT';
  }

  // 1. Strictly enforce dynamic role permissions configured in Roles & Granular Permissions
  const rolePermissions = getStoredRolePermissions();
  const roleConfig = rolePermissions[account.role_code];
  if (roleConfig && Array.isArray(roleConfig.allowedPages)) {
    const isAllowedInRole = roleConfig.allowedPages.includes(targetId) || roleConfig.allowedPages.includes(pageId);
    if (!isAllowedInRole) {
      return false;
    }
  }

  // 2. Also enforce user-specific allowed pages if defined
  if (account.allowedPages && Array.isArray(account.allowedPages)) {
    return account.allowedPages.includes(targetId) || account.allowedPages.includes(pageId);
  }

  return true;
}


export function authenticateByPhone(phone: string, _dialCode: string = '+91'): UserAccount {
  const cleanPhone = phone.replace(/\D/g, '');
  const accounts = getUserAccounts();
  const allStaff = getStaffMembers();

  // 1. Check if linked to any known staff member
  const staff = allStaff.find(s => {
    const sPhone = (s.phone || '').replace(/\D/g, '');
    return sPhone && (sPhone.endsWith(cleanPhone) || cleanPhone.endsWith(sPhone));
  });

  if (staff) {
    const matched = accounts.find(a => 
      (staff.id && a.staff_id === staff.id) || 
      (staff.username && a.username.toLowerCase() === staff.username.toLowerCase()) ||
      (a.phone && a.phone.replace(/\D/g, '') === cleanPhone)
    );
    if (matched) {
      matched.role_code = staff.role_code;
      matched.role_name = staff.role_name || staff.designation;
      matched.staff_name = staff.name;
      const storedPerms = getStoredRolePermissions();
      if (storedPerms[staff.role_code]?.allowedPages) {
        matched.allowedPages = storedPerms[staff.role_code].allowedPages;
      }
      setCurrentUserAccount(matched);
      return matched;
    }
  }

  // 2. Check if username matches phone
  const accountByUsername = accounts.find(a => a.username.replace(/\D/g, '') === cleanPhone);
  if (accountByUsername) {
    setCurrentUserAccount(accountByUsername);
    return accountByUsername;
  }

  // 3. Fall back to primary Super Admin or first available account
  const primaryAccount = accounts.find(a => a.role_code === 'SUPER_ADMIN') || accounts[0];
  if (primaryAccount) {
    setCurrentUserAccount(primaryAccount);
    return primaryAccount;
  }

  // 4. Default verified user account
  const fallbackAccount: UserAccount = {
    id: 'usr-mob-' + Date.now(),
    username: cleanPhone || 'mobile_user',
    password: '',
    staff_name: 'Verified Staff',
    role_code: 'SUPER_ADMIN',
    role_name: 'Super Admin',
    allowedPages: ALL_SYSTEM_MODULES.map(m => m.id),
    created_at: new Date().toISOString()
  };
  saveUserAccount(fallbackAccount);
  setCurrentUserAccount(fallbackAccount);
  return fallbackAccount;
}

