import { ALL_SYSTEM_MODULES } from './roleAccess';
import { getStaffMembers } from './staffService';

export interface UserAccount {
  id: string;
  username: string;
  password: string;
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
    id: 'usr-1',
    username: 'admin',
    password: 'password123',
    staff_id: 'staff-1',
    staff_name: 'Rajesh Chandran',
    staff_code: 'EMP-0101',
    role_code: 'SUPER_ADMIN',
    role_name: 'Super Admin',
    allowedPages: ALL_SYSTEM_MODULES.map(m => m.id),
    created_at: '2024-01-01'
  },
  {
    id: 'usr-2',
    username: 'anandhi.admin',
    password: 'password123',
    staff_id: 'staff-2',
    staff_name: 'Anandhi Venkatesh',
    staff_code: 'EMP-0103',
    role_code: 'ADMIN',
    role_name: 'Admin',
    allowedPages: ALL_SYSTEM_MODULES.map(m => m.id),
    created_at: '2024-01-01'
  },
  {
    id: 'usr-3',
    username: 'arun.verma',
    password: 'password123',
    staff_id: 'staff-3',
    staff_name: 'Arun Verma',
    staff_code: 'EMP-0111',
    role_code: 'SITE_ENGINEER',
    role_name: 'Site Engineer',
    allowedPages: ['projects', 'tasks', 'site_ops', 'payments', 'documents', 'approvals', 'snags', 'setting'],
    created_at: '2024-01-01'
  },
  {
    id: 'usr-4',
    username: 'ravi.kumar',
    password: 'password123',
    staff_id: 'staff-4',
    staff_name: 'Ravi Kumar',
    staff_code: 'EMP-0116',
    role_code: 'SUPERVISOR',
    role_name: 'Supervisor',
    allowedPages: ['projects', 'tasks', 'workforce', 'site_ops', 'snags', 'documents', 'approvals', 'setting'],
    created_at: '2024-01-01'
  }
];

const ACCOUNTS_STORAGE_KEY = 'booshnam_user_accounts_v2';
const CURRENT_SESSION_KEY = 'booshnam_active_session_v2';

export function getUserAccounts(): UserAccount[] {
  if (typeof window === 'undefined') return DEFAULT_ACCOUNTS;
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(DEFAULT_ACCOUNTS));
      return DEFAULT_ACCOUNTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse user accounts', e);
    return DEFAULT_ACCOUNTS;
  }
}

export function saveUserAccount(account: UserAccount): void {
  const current = getUserAccounts();
  const existingIdx = current.findIndex(a => a.username.toLowerCase() === account.username.toLowerCase() || (account.staff_id && a.staff_id === account.staff_id));
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

export function authenticateUser(username: string, password: string): UserAccount | null {
  const accounts = getUserAccounts();
  const cleanUsername = username.trim().toLowerCase();
  const cleanPassword = password.trim();
  const match = accounts.find(a => 
    a.username.toLowerCase() === cleanUsername && a.password === cleanPassword
  );
  
  if (match) {
    // Check if associated staff member is INACTIVE or deleted
    const allStaff = getStaffMembers();
    // The match could be linked by staff_id, or by username = phone
    const staff = allStaff.find(s => s.id === match.staff_id || s.phone === match.username);
    
    // If staff not found and it's not a standalone SUPER_ADMIN
    if (!staff && match.role_code !== 'SUPER_ADMIN') {
      throw new Error('Your account has been permanently deactivated. Contact Admin.');
    }
    
    if (staff && staff.status === 'INACTIVE') {
      throw new Error('Your account is currently inactive. Contact Admin to restore access.');
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
    return JSON.parse(raw);
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
  // If no account logged in or Super Admin, full access
  if (!account) return true;
  if (account.role_code === 'SUPER_ADMIN') return true;

  // Normalization for aliases
  let targetId = pageId;
  if (pageId === 'company_dashboard') targetId = 'dashboard';
  if (pageId === 'payroll') targetId = 'workforce';
  if (pageId === 'crm') targetId = 'clients';
  if (pageId === 'warehouse') targetId = 'procurement';
  if (pageId === 'asset') targetId = 'equipment';
  if (pageId === 'report') targetId = 'site_ops';
  if (pageId === 'library') targetId = 'documents';
  if (pageId === 'soil_investigation' || pageId === 'architecture') targetId = 'departments';

  return account.allowedPages.includes(targetId) || account.allowedPages.includes(pageId);
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
    const matched = accounts.find(a => a.staff_id === staff.id || (staff.username && a.username.toLowerCase() === staff.username.toLowerCase()));
    if (matched) {
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

