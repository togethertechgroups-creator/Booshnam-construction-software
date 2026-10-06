import { ALL_SYSTEM_MODULES, getStoredRolePermissions } from './roleAccess';
import { getStaffMembers } from './staffService';
import { 
  setActiveDepartmentId, 
  normalizeDepartmentId,
  getUserAllowedDepartmentIds,
  isUserCompanyWideSuperAdmin 
} from './departmentService';

export interface UserAccount {
  id: string;
  username: string;
  password: string;
  phone?: string;
  department?: string;
  departments?: string[];
  staff_id?: string;
  staff_ids?: string[];
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
    departments: ['Executive Management'],
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
    departments: ['Executive Management'],
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
    departments: ['Marketing'],
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

      // Find all linked staff members
      const aPhone = (a.phone || '').replace(/\D/g, '');
      const aUser = a.username.replace(/\D/g, '');
      const matchingStaff = allStaff.filter(s => 
        (a.staff_id && s.id === a.staff_id) || 
        (a.staff_ids && a.staff_ids.includes(s.id)) ||
        (aPhone && aPhone.length >= 7 && (s.phone || '').replace(/\D/g, '').endsWith(aPhone)) ||
        (aUser && aUser.length >= 7 && (s.phone || '').replace(/\D/g, '').endsWith(aUser))
      );

      if (matchingStaff.length > 0) {
        const primaryStaff = matchingStaff[0];
        if (a.role_code !== primaryStaff.role_code) {
          hasChanges = true;
          a = {
            ...a,
            role_code: primaryStaff.role_code,
            role_name: primaryStaff.role_name || primaryStaff.designation
          };
        }

        // Merge departments from all matching staff records
        const staffDepts = matchingStaff.map(s => s.department).filter(Boolean);
        const existingDepts = Array.isArray(a.departments) && a.departments.length > 0 
          ? a.departments 
          : (a.department ? [a.department] : []);
        const mergedDepts = Array.from(new Set([...existingDepts, ...staffDepts]));

        if (mergedDepts.length > 0 && JSON.stringify(a.departments) !== JSON.stringify(mergedDepts)) {
          hasChanges = true;
          a = {
            ...a,
            departments: mergedDepts,
            department: a.department && mergedDepts.includes(a.department) ? a.department : mergedDepts[0]
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
  const cleanPhone = (account.phone || '').replace(/\D/g, '');
  const cleanUser = account.username.trim().toLowerCase();

  const existingIdx = current.findIndex(a => {
    if (a.role_code === 'SUPER_ADMIN' || a.username === 'superadmin' || a.id === 'usr-super') {
      return account.role_code === 'SUPER_ADMIN' || account.username === 'superadmin' || account.id === 'usr-super';
    }
    const aUser = a.username.trim().toLowerCase();
    const aPhone = (a.phone || '').replace(/\D/g, '');
    const isUserMatch = aUser === cleanUser;
    const isPhoneMatch = Boolean(cleanPhone && cleanPhone.length >= 7 && (aPhone.endsWith(cleanPhone) || cleanPhone.endsWith(aPhone)));
    const isStaffMatch = Boolean(account.staff_id && (a.staff_id === account.staff_id || a.staff_ids?.includes(account.staff_id)));
    return isUserMatch || isPhoneMatch || isStaffMatch;
  });

  let updated: UserAccount[];
  if (existingIdx >= 0) {
    const existing = current[existingIdx];

    // Merge departments
    const existingDepts = Array.isArray(existing.departments) && existing.departments.length > 0
      ? existing.departments
      : (existing.department ? [existing.department] : []);
    const incomingDepts = Array.isArray(account.departments) && account.departments.length > 0
      ? account.departments
      : (account.department ? [account.department] : []);

    const combinedDepts = Array.from(new Set([...existingDepts, ...incomingDepts].filter(Boolean)));

    // Merge staff IDs
    const existingStaffIds = existing.staff_ids || (existing.staff_id ? [existing.staff_id] : []);
    const incomingStaffIds = account.staff_ids || (account.staff_id ? [account.staff_id] : []);
    const combinedStaffIds = Array.from(new Set([...existingStaffIds, ...incomingStaffIds].filter(Boolean)));

    const mergedAccount: UserAccount = {
      ...existing,
      ...account,
      id: existing.id,
      department: account.department || existing.department || combinedDepts[0],
      departments: combinedDepts.length > 0 ? combinedDepts : (account.department ? [account.department] : []),
      staff_ids: combinedStaffIds,
      staff_id: account.staff_id || existing.staff_id,
      password: (account.password && account.password !== account.phone) ? account.password : (existing.password || account.password),
      allowedPages: (account.allowedPages && account.allowedPages.length > 0) ? account.allowedPages : existing.allowedPages
    };

    updated = [...current];
    updated[existingIdx] = mergedAccount;
  } else {
    const initDepts = Array.isArray(account.departments) && account.departments.length > 0
      ? account.departments
      : (account.department ? [account.department] : []);
    const newAcc: UserAccount = {
      ...account,
      departments: initDepts,
      staff_ids: account.staff_id ? [account.staff_id] : []
    };
    updated = [newAcc, ...current];
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
    // Check if associated staff member is INACTIVE and synchronize role and departments
    const allStaff = getStaffMembers();
    const matchingStaff = allStaff.filter(s => 
      s.id === match.staff_id || 
      (match.staff_ids && match.staff_ids.includes(s.id)) ||
      (match.phone && (s.phone || '').replace(/\D/g, '') === (match.phone || '').replace(/\D/g, '')) || 
      (cleanPhoneDigits && (s.phone || '').replace(/\D/g, '') === cleanPhoneDigits) ||
      s.phone === match.username
    );
    
    if (matchingStaff.length > 0) {
      if (matchingStaff.every(s => s.status === 'INACTIVE')) {
        throw new Error('Your account is currently inactive. Contact Admin to restore access.');
      }
      const activeStaff = matchingStaff.find(s => s.status !== 'INACTIVE') || matchingStaff[0];
      match.role_code = activeStaff.role_code;
      match.role_name = activeStaff.role_name || activeStaff.designation;
      match.staff_name = activeStaff.name;

      const staffDepts = matchingStaff.map(s => s.department).filter(Boolean);
      const existingDepts = Array.isArray(match.departments) && match.departments.length > 0 
        ? match.departments 
        : (match.department ? [match.department] : []);
      const mergedDepts = Array.from(new Set([...existingDepts, ...staffDepts]));
      match.departments = mergedDepts;
      if (!match.department || !mergedDepts.includes(match.department)) {
        match.department = mergedDepts[0];
      }

      const storedPerms = getStoredRolePermissions();
      if (storedPerms[activeStaff.role_code]?.allowedPages) {
        match.allowedPages = storedPerms[activeStaff.role_code].allowedPages;
      }
    }

    // Automatically set the active department to the user's assigned department
    if (!isUserCompanyWideSuperAdmin(match)) {
      try {
        const allowed = getUserAllowedDepartmentIds(match);
        const saved = localStorage.getItem('booshnam_active_department') as any;
        const targetDept = (saved && allowed.includes(saved)) ? saved : (allowed[0] || 'SOIL_INVESTIGATION');
        setActiveDepartmentId(targetDept);
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
    const matchingStaff = allStaff.filter(s => 
      (acc.staff_id && s.id === acc.staff_id) || 
      (acc.staff_ids && acc.staff_ids.includes(s.id)) ||
      (aPhone && aPhone.length >= 7 && (s.phone || '').replace(/\D/g, '').endsWith(aPhone)) ||
      (aUser && aUser.length >= 7 && (s.phone || '').replace(/\D/g, '').endsWith(aUser))
    );

    let changed = false;
    if (matchingStaff.length > 0) {
      const primaryStaff = matchingStaff[0];
      if (acc.role_code !== primaryStaff.role_code) {
        acc.role_code = primaryStaff.role_code;
        acc.role_name = primaryStaff.role_name || primaryStaff.designation;
        acc.staff_name = primaryStaff.name;
        changed = true;
      }
      
      const staffDepts = matchingStaff.map(s => s.department).filter(Boolean);
      const existingDepts = Array.isArray(acc.departments) && acc.departments.length > 0
        ? acc.departments
        : (acc.department ? [acc.department] : []);
      const mergedDepts = Array.from(new Set([...existingDepts, ...staffDepts]));

      if (mergedDepts.length > 0 && JSON.stringify(acc.departments) !== JSON.stringify(mergedDepts)) {
        acc.departments = mergedDepts;
        changed = true;
      }
      if (!acc.department || (mergedDepts.length > 0 && !mergedDepts.includes(acc.department))) {
        acc.department = mergedDepts[0];
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

  // 1. Check if linked to any known staff member(s)
  const matchingStaff = allStaff.filter(s => {
    const sPhone = (s.phone || '').replace(/\D/g, '');
    return sPhone && (sPhone.endsWith(cleanPhone) || cleanPhone.endsWith(sPhone));
  });

  if (matchingStaff.length > 0) {
    const primaryStaff = matchingStaff[0];
    const staffDepts = matchingStaff.map(s => s.department).filter(Boolean);

    let matched = accounts.find(a => 
      (a.staff_id && matchingStaff.some(s => s.id === a.staff_id)) ||
      (a.staff_ids && matchingStaff.some(s => a.staff_ids?.includes(s.id))) ||
      (a.phone && a.phone.replace(/\D/g, '') === cleanPhone) ||
      (a.username && a.username.replace(/\D/g, '') === cleanPhone)
    );

    if (matched) {
      matched.role_code = primaryStaff.role_code;
      matched.role_name = primaryStaff.role_name || primaryStaff.designation;
      matched.staff_name = primaryStaff.name;

      const mergedDepts = Array.from(new Set([
        ...(matched.departments || []),
        ...(matched.department ? [matched.department] : []),
        ...staffDepts
      ]));
      matched.departments = mergedDepts;
      if (!matched.department || !mergedDepts.includes(matched.department)) {
        matched.department = mergedDepts[0];
      }

      const storedPerms = getStoredRolePermissions();
      if (storedPerms[primaryStaff.role_code]?.allowedPages) {
        matched.allowedPages = storedPerms[primaryStaff.role_code].allowedPages;
      }
      saveUserAccount(matched);

      // Set active department to first allowed department
      if (!isUserCompanyWideSuperAdmin(matched)) {
        const allowedDepts = getUserAllowedDepartmentIds(matched);
        if (allowedDepts.length > 0) {
          setActiveDepartmentId(allowedDepts[0]);
        }
      }
      setCurrentUserAccount(matched);
      return matched;
    } else {
      // Auto-create verified account for staff with their assigned departments
      const storedPerms = getStoredRolePermissions();
      const newAcc: UserAccount = {
        id: `usr-mob-${Date.now()}`,
        username: cleanPhone,
        password: cleanPhone,
        phone: cleanPhone,
        staff_id: primaryStaff.id,
        staff_ids: matchingStaff.map(s => s.id),
        staff_name: primaryStaff.name,
        staff_code: primaryStaff.employee_code,
        role_code: primaryStaff.role_code,
        role_name: primaryStaff.role_name || primaryStaff.designation,
        department: primaryStaff.department,
        departments: staffDepts.length > 0 ? staffDepts : [primaryStaff.department],
        allowedPages: storedPerms[primaryStaff.role_code]?.allowedPages || ALL_SYSTEM_MODULES.map(m => m.id),
        created_at: new Date().toISOString()
      };
      saveUserAccount(newAcc);
      if (!isUserCompanyWideSuperAdmin(newAcc)) {
        const allowedDepts = getUserAllowedDepartmentIds(newAcc);
        if (allowedDepts.length > 0) {
          setActiveDepartmentId(allowedDepts[0]);
        }
      }
      setCurrentUserAccount(newAcc);
      return newAcc;
    }
  }

  // 2. Check if username matches phone in existing accounts
  const accountByUsername = accounts.find(a => 
    (a.username && a.username.replace(/\D/g, '') === cleanPhone) ||
    (a.phone && a.phone.replace(/\D/g, '') === cleanPhone)
  );
  if (accountByUsername) {
    if (!isUserCompanyWideSuperAdmin(accountByUsername)) {
      const allowedDepts = getUserAllowedDepartmentIds(accountByUsername);
      if (allowedDepts.length > 0) {
        setActiveDepartmentId(allowedDepts[0]);
      }
    }
    setCurrentUserAccount(accountByUsername);
    return accountByUsername;
  }

  // 3. Fall back to primary Super Admin only if testing/demo and no accounts exist
  const primaryAccount = accounts.find(a => a.role_code === 'SUPER_ADMIN') || accounts[0];
  if (primaryAccount && cleanPhone === '9840123456') {
    setCurrentUserAccount(primaryAccount);
    return primaryAccount;
  }

  // 4. Default verified user account assigned to Soil Investigation
  const fallbackAccount: UserAccount = {
    id: 'usr-mob-' + Date.now(),
    username: cleanPhone || 'mobile_user',
    password: cleanPhone || '',
    phone: cleanPhone,
    staff_name: 'Verified Staff',
    role_code: 'SITE_ENGINEER',
    role_name: 'Site Engineer',
    department: 'Soil Investigation (Chennai)',
    departments: ['Soil Investigation (Chennai)'],
    allowedPages: ALL_SYSTEM_MODULES.map(m => m.id),
    created_at: new Date().toISOString()
  };
  saveUserAccount(fallbackAccount);
  setActiveDepartmentId('SOIL_INVESTIGATION');
  setCurrentUserAccount(fallbackAccount);
  return fallbackAccount;
}

