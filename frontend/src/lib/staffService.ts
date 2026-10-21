import { normalizeDepartmentId } from './departmentService';

export interface StaffMember {
  id: string;
  employee_code: string;
  name: string;
  role_code: string;
  role_name: string;
  department: string;
  departments?: string[];
  designation: string;
  dob: string; // Date of Birth YYYY-MM-DD
  doj: string; // Date of Joining YYYY-MM-DD
  phone: string;
  email: string;
  employment_type: 'Full-time' | 'Contract' | 'Part-time';
  salary: number;
  salary_type: 'Month' | 'Day';
  status: 'ACTIVE' | 'INACTIVE';
  has_login_account?: boolean;
  username?: string;
  created_at: string;
  staff_type?: 'OFFICE' | 'SITE';
  custom_allowed_pages?: string[];
  has_custom_permissions?: boolean;
}

export function getStaffDepartmentNames(staff: StaffMember): string[] {
  const depts: string[] = [];
  if (Array.isArray(staff.departments) && staff.departments.length > 0) {
    staff.departments.forEach(d => {
      if (d && d.includes(',')) depts.push(...d.split(',').map(x => x.trim()));
      else if (d) depts.push(d.trim());
    });
  } else if (staff.department) {
    if (staff.department.includes(',')) depts.push(...staff.department.split(',').map(x => x.trim()));
    else depts.push(staff.department.trim());
  }
  return Array.from(new Set(depts.filter(Boolean)));
}

export function isStaffInDepartment(staff: StaffMember, targetDeptIdOrName: string): boolean {
  const targetNorm = normalizeDepartmentId(targetDeptIdOrName);
  if (targetNorm === 'booshnam_associates') return true;
  const depts = getStaffDepartmentNames(staff);
  if (depts.length === 0) return true;
  if (depts.some(d => {
    const rawLower = (d || '').toLowerCase().trim();
    if (rawLower === 'operations' || rawLower === 'all' || rawLower.includes('all')) return true;
    const norm = normalizeDepartmentId(d);
    return norm === targetNorm || norm === 'booshnam_associates';
  })) {
    return true;
  }
  return depts.some(d => normalizeDepartmentId(d) === targetNorm);
}

export function getStaffCategory(s: StaffMember): 'OFFICE' | 'SITE' {
  if (s.staff_type) return s.staff_type;
  const code = (s.role_code || '').toUpperCase();
  const desig = (s.designation || '').toLowerCase();
  if (
    code === 'SITE_ENGINEER' || 
    code === 'SUPERVISOR' || 
    desig.includes('site') || 
    desig.includes('supervisor') || 
    desig.includes('field') ||
    desig.includes('engineer')
  ) {
    return 'SITE';
  }
  return 'OFFICE';
}

export const DEFAULT_STAFF_MEMBERS: StaffMember[] = [
  {
    id: 'staff-chithra',
    employee_code: 'EMP-01',
    name: 'Chithra',
    role_code: 'STAFF',
    role_name: 'Maintenance',
    department: 'Operations',
    departments: ['Operations', 'Soil Investigation (Chennai)', 'Material Testing (Chennai)', 'Surveying', 'Structural', 'Architectural', 'Sculpture', 'Private Construction', 'Government Projects'],
    designation: 'Maintanance',
    dob: '1995-05-12',
    doj: '2023-01-10',
    phone: '9840123456',
    email: 'chithra@booshnam.com',
    employment_type: 'Full-time',
    salary: 10000,
    salary_type: 'Month',
    status: 'ACTIVE',
    staff_type: 'OFFICE',
    created_at: new Date().toISOString()
  },
  {
    id: 'staff-robin',
    employee_code: 'EMP-02',
    name: 'Robin Richard',
    role_code: 'STAFF',
    role_name: 'Staff',
    department: 'Operations',
    departments: ['Operations', 'Soil Investigation (Chennai)', 'Material Testing (Chennai)', 'Surveying', 'Structural', 'Architectural', 'Sculpture', 'Private Construction', 'Government Projects'],
    designation: '',
    dob: '1993-08-20',
    doj: '2023-03-15',
    phone: '9840234567',
    email: 'robin@booshnam.com',
    employment_type: 'Full-time',
    salary: 28000,
    salary_type: 'Month',
    status: 'ACTIVE',
    staff_type: 'OFFICE',
    created_at: new Date().toISOString()
  },
  {
    id: 'staff-teki',
    employee_code: 'EMP-03',
    name: 'Teki Vijay Yogesh Kumar',
    role_code: 'ENGINEER',
    role_name: 'Technical Engineer',
    department: 'Engineering',
    departments: ['Engineering', 'Operations', 'Soil Investigation (Chennai)', 'Material Testing (Chennai)', 'Surveying', 'Structural', 'Architectural', 'Sculpture', 'Private Construction', 'Government Projects'],
    designation: 'Technical Engineer',
    dob: '1990-11-05',
    doj: '2022-06-01',
    phone: '9840345678',
    email: 'teki@booshnam.com',
    employment_type: 'Full-time',
    salary: 35000,
    salary_type: 'Month',
    status: 'ACTIVE',
    staff_type: 'OFFICE',
    created_at: new Date().toISOString()
  }
];

export interface StaffSelectOption {
  name: string;
  label?: string;
  roleHint?: string;
  staffId?: string;
  phone?: string;
  email?: string;
  designation?: string;
  role_code?: string;
  role_name?: string;
}

export function getStaffTeamOptions(
  category: 'PM' | 'ENGINEER' | 'SUPERVISOR' | 'ACCOUNTS' | 'ALL',
  staffOverride?: StaffMember[]
): StaffSelectOption[] {
  const staffSource = (staffOverride && staffOverride.length >= 0) ? staffOverride : getStaffMembers();
  // Strictly include only active staff members currently present in Staff & Payroll
  const staff = staffSource.filter(s => s.status !== 'INACTIVE');
  const result: StaffSelectOption[] = [];
  const seenNames = new Set<string>();

  const addOption = (s: StaffMember, hint?: string) => {
    const key = s.name.toLowerCase().trim();
    if (seenNames.has(key)) return;
    seenNames.add(key);
    result.push({
      name: s.name,
      label: s.name,
      roleHint: hint || s.designation || s.role_name,
      staffId: s.id,
      phone: s.phone,
      email: s.email,
      designation: s.designation,
      role_code: s.role_code,
      role_name: s.role_name
    });
  };

  if (category === 'PM') {
    // 1. Primary: Project Manager / Director / Lead matches from current staff
    staff.filter(s => {
      const d = (s.designation || '').toLowerCase();
      const r = (s.role_name || '').toLowerCase();
      const c = (s.role_code || '').toUpperCase();
      return c === 'PROJECT_MANAGER' || c === 'SUPER_ADMIN' || c === 'ADMIN' ||
             d.includes('project manager') || d.includes('pm') || d.includes('director') || d.includes('lead') ||
             r.includes('project manager');
    }).forEach(s => addOption(s, s.designation || s.role_name || 'Project Manager'));

    // 2. Append all other active staff members so any existing staff in the company can be assigned
    staff.forEach(s => addOption(s, s.designation || s.role_name));
  } else if (category === 'ENGINEER') {
    // 1. Site Engineer matches from current staff
    staff.filter(s => {
      const d = (s.designation || '').toLowerCase();
      const r = (s.role_name || '').toLowerCase();
      const c = (s.role_code || '').toUpperCase();
      return c === 'SITE_ENGINEER' || d.includes('engineer') || r.includes('site engineer') || r.includes('engineer');
    }).forEach(s => addOption(s, s.designation || s.role_name || 'Site Engineer'));

    // 2. Append other active staff
    staff.forEach(s => addOption(s, s.designation || s.role_name));
  } else if (category === 'SUPERVISOR') {
    // 1. Supervisor matches from current staff
    staff.filter(s => {
      const d = (s.designation || '').toLowerCase();
      const r = (s.role_name || '').toLowerCase();
      const c = (s.role_code || '').toUpperCase();
      return c === 'SUPERVISOR' || d.includes('supervisor') || d.includes('safety') || d.includes('foreman') || r.includes('supervisor');
    }).forEach(s => addOption(s, s.designation || s.role_name || 'Site Supervisor'));

    // 2. Append other active staff
    staff.forEach(s => addOption(s, s.designation || s.role_name));
  } else if (category === 'ACCOUNTS') {
    // 1. Accounts matches from current staff
    staff.filter(s => {
      const d = (s.designation || '').toLowerCase();
      const r = (s.role_name || '').toLowerCase();
      const c = (s.role_code || '').toUpperCase();
      return c === 'ACCOUNTS' || d.includes('account') || d.includes('finance') || d.includes('billing') || r.includes('accounts');
    }).forEach(s => addOption(s, s.designation || s.role_name || 'Accounts'));

    // 2. Append other active staff
    staff.forEach(s => addOption(s, s.designation || s.role_name));
  } else {
    // 'ALL'
    staff.forEach(s => addOption(s, s.designation || s.role_name));
  }

  return result;
}

const STAFF_STORAGE_KEY = 'booshnam_staff_members_v2';

const LEGACY_MOCK_STAFF_NAMES = [
  'Rajesh Chandran',
  'Anandhi Venkatesh',
  'Arun Verma',
  'Ravi Kumar',
  'Kavitha Selvan',
  'Meena Kumari',
  'Balaji Govind',
  'Likson',
];

const LEGACY_MOCK_STAFF_IDS = [
  'staff-1',
  'staff-2',
  'staff-3',
  'staff-4',
  'staff-5',
  'staff-6',
  'staff-7',
  'staff-8',
];

export function getStaffMembers(): StaffMember[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STAFF_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(DEFAULT_STAFF_MEMBERS));
      return DEFAULT_STAFF_MEMBERS;
    }
    const parsed: StaffMember[] = JSON.parse(raw);
    // Filter out the legacy pre-seeded mock staff members by exact ID or name
    const cleaned = parsed.filter(s => 
      !LEGACY_MOCK_STAFF_IDS.includes(s.id) &&
      !LEGACY_MOCK_STAFF_NAMES.includes(s.name)
    );
    if (cleaned.length === 0) {
      localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(DEFAULT_STAFF_MEMBERS));
      return DEFAULT_STAFF_MEMBERS;
    }
    const withDepts = cleaned.map(s => {
      if (s.id === 'staff-chithra') {
        const def = DEFAULT_STAFF_MEMBERS.find(d => d.id === s.id);
        return {
          ...s,
          salary: s.salary === 22000 ? 10000 : (s.salary || 10000),
          designation: 'Maintanance',
          departments: (s.departments && s.departments.length > 1) ? s.departments : (def?.departments || s.departments)
        };
      }
      if (s.id === 'staff-robin' || s.id === 'staff-teki') {
        const def = DEFAULT_STAFF_MEMBERS.find(d => d.id === s.id);
        if (def && (!s.departments || s.departments.length <= 1)) {
          return { ...s, departments: def.departments };
        }
      }
      return s;
    });
    if (cleaned.length !== parsed.length || JSON.stringify(withDepts) !== JSON.stringify(parsed)) {
      localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(withDepts));
      return withDepts;
    }
    return withDepts;
  } catch (e) {
    console.error('Failed to get staff members', e);
    return DEFAULT_STAFF_MEMBERS;
  }
}

export function saveStaffMember(staff: StaffMember): StaffMember[] {
  const current = getStaffMembers();
  const index = current.findIndex(s => s.id === staff.id);
  let updated: StaffMember[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = staff;
  } else {
    updated = [staff, ...current];
  }
  try {
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(updated));

    // Synchronize linked user accounts with updated staff role and name
    try {
      const accRaw = localStorage.getItem('booshnam_user_accounts_v2');
      if (accRaw) {
        const accounts = JSON.parse(accRaw);
        const cleanPhone = (staff.phone || '').replace(/\D/g, '');
        let hasAccChange = false;
        const updatedAccounts = accounts.map((a: any) => {
          // Never modify SUPER_ADMIN accounts through staff update
          if (a.role_code === 'SUPER_ADMIN' || a.username === 'superadmin' || a.id === 'usr-super') {
            return a;
          }
          const aPhone = (a.phone || '').replace(/\D/g, '');
          const aUser = a.username.replace(/\D/g, '');
          const isMatch = (a.staff_id && a.staff_id === staff.id) || 
                          (cleanPhone && cleanPhone.length >= 7 && (aPhone.endsWith(cleanPhone) || cleanPhone.endsWith(aPhone) || aUser.endsWith(cleanPhone) || cleanPhone.endsWith(aUser)));
          if (isMatch) {
            hasAccChange = true;
            const existingDepts = Array.isArray(a.departments) && a.departments.length > 0 
              ? a.departments 
              : (a.department ? [a.department] : []);
            const mergedDepts = Array.from(new Set([...existingDepts, staff.department].filter(Boolean)));
            return {
              ...a,
              role_code: staff.role_code,
              role_name: staff.role_name || staff.designation,
              staff_name: staff.name,
              department: a.department || staff.department,
              departments: mergedDepts
            };
          }
          return a;
        });
        if (hasAccChange) {
          localStorage.setItem('booshnam_user_accounts_v2', JSON.stringify(updatedAccounts));
          window.dispatchEvent(new CustomEvent('booshnam_accounts_updated', { detail: updatedAccounts }));
        }
      }
    } catch (err) {}

    window.dispatchEvent(new CustomEvent('booshnam_staff_updated', { detail: updated }));
  } catch (e) {
    console.error('Failed to save staff member', e);
  }
  return updated;
}

export function deleteStaffMember(id: string): StaffMember[] {
  const current = getStaffMembers();
  const target = current.find(s => s.id === id);
  const updated = current.filter(s => s.id !== id);
  try {
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(updated));
    if (target?.phone) {
      try {
        const accRaw = localStorage.getItem('booshnam_user_accounts_v2');
        if (accRaw) {
          const accounts = JSON.parse(accRaw);
          const cleanTargetPhone = target.phone.replace(/\D/g, '');
          const remainingStaffForPhone = updated.filter(s => {
            const sPhone = (s.phone || '').replace(/\D/g, '');
            return sPhone && cleanTargetPhone && (sPhone.endsWith(cleanTargetPhone) || cleanTargetPhone.endsWith(sPhone));
          });

          let updatedAccounts: any[];
          if (remainingStaffForPhone.length > 0) {
            // Staff still exists in other departments! Do not delete account, just remove deleted staff's department
            const remainingDepts = Array.from(new Set(remainingStaffForPhone.map(s => s.department).filter(Boolean)));
            const primaryRemaining = remainingStaffForPhone[0];
            updatedAccounts = accounts.map((a: any) => {
              if (a.role_code === 'SUPER_ADMIN' || a.username === 'superadmin' || a.id === 'usr-super') return a;
              const aPhone = (a.phone || '').replace(/\D/g, '');
              const aUser = a.username.replace(/\D/g, '');
              const isMatch = (a.staff_id === id) || (cleanTargetPhone && (aPhone.endsWith(cleanTargetPhone) || aUser.endsWith(cleanTargetPhone)));
              if (isMatch) {
                return {
                  ...a,
                  staff_id: primaryRemaining.id,
                  department: remainingDepts[0] || primaryRemaining.department,
                  departments: remainingDepts
                };
              }
              return a;
            });
          } else {
            // No other staff exist for this phone, remove non-admin account
            updatedAccounts = accounts.filter((a: any) => 
              a.role_code === 'SUPER_ADMIN' || a.username === 'superadmin' || a.id === 'usr-super' || (
                a.staff_id !== id && 
                a.username !== target.phone && 
                a.phone !== target.phone
              )
            );
          }
          localStorage.setItem('booshnam_user_accounts_v2', JSON.stringify(updatedAccounts));
          window.dispatchEvent(new CustomEvent('booshnam_accounts_updated', { detail: updatedAccounts }));
        }
      } catch (err) {}
    }
    window.dispatchEvent(new CustomEvent('booshnam_staff_updated', { detail: updated }));
  } catch (e) {
    console.error('Failed to delete staff member', e);
  }
  return updated;
}

export function clearAllStaffMembers(): StaffMember[] {
  try {
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify([]));
    window.dispatchEvent(new CustomEvent('booshnam_staff_updated', { detail: [] }));
  } catch (e) {}
  return [];
}

export function markStaffLoginCreated(staffId: string, username: string): void {
  const current = getStaffMembers();
  const updated = current.map(s => s.id === staffId ? { ...s, has_login_account: true, username } : s);
  try {
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('booshnam_staff_updated', { detail: updated }));
  } catch (e) {
    console.error('Failed to mark staff login created', e);
  }
}

export interface StaffProjectAllocation {
  totalProjects: number;
  allocatedProjects: Array<{
    id: string;
    name: string;
    code: string;
    stage?: string;
    role?: string;
    category?: string;
    status?: string;
  }>;
  isAllAccess: boolean;
}

export function getStaffAllocatedProjects(staffName: string, roleCode?: string): StaffProjectAllocation {
  if (typeof window === 'undefined') {
    return { totalProjects: 0, allocatedProjects: [], isAllAccess: false };
  }
  try {
    const raw = localStorage.getItem('booshnam_projects_v2');
    const parsed = raw ? JSON.parse(raw) : [];
    const projects = Array.isArray(parsed)
      ? parsed.filter((p: any) => 
          !p.id?.startsWith('proj-') &&
          !['Prestige Boulevard', 'Royal Palm', 'Green Valley', 'Sunrise Industrial', 'Urban Metro', 'Skyline Contemporary', 'Heritage Courtyard', 'Highway Overpass', 'Government Medical College', 'High-Rise Commercial', 'Coastal Highway'].some(t => (p.name || p.title || p.client_name || '').includes(t))
        )
      : [];
    if (projects.length === 0) {
      return { totalProjects: 0, allocatedProjects: [], isAllAccess: false };
    }

    const cleanName = (staffName || '').toLowerCase().trim();
    const cleanRole = (roleCode || '').toUpperCase().trim();
    const isSuperOrAdmin = cleanRole === 'SUPER_ADMIN' || cleanRole === 'ADMIN' || cleanRole === 'OWNER_DIRECTOR' || cleanName === 'admin' || cleanName === 'priya' || cleanName.includes('rajesh');

    if (isSuperOrAdmin) {
      return {
        totalProjects: projects.length,
        allocatedProjects: projects.map(p => ({
          id: p.id,
          name: p.name,
          code: p.code || 'PRJ',
          stage: p.stage || p.status,
          role: 'Full Access (Admin)',
          category: p.category,
          status: p.status || 'ACTIVE'
        })),
        isAllAccess: true
      };
    }

    const matched = projects.filter(p => {
      const team = Array.isArray(p.assigned_team) ? p.assigned_team : [];
      const inTeam = team.some((m: any) => {
        const mName = (m.name || '').toLowerCase().trim();
        return mName && (mName === cleanName || mName.includes(cleanName) || cleanName.includes(mName));
      });
      if (inTeam) return true;

      // Check tasks
      try {
        const rawTasks = localStorage.getItem(`booshnam_wbs_tasks_v2_${p.id}`);
        if (rawTasks) {
          const tList = JSON.parse(rawTasks);
          if (Array.isArray(tList)) {
            const hasTask = tList.some((t: any) => {
              const aName = (t.assigned_to_name || t.assigned_to || '').toLowerCase().trim();
              return aName && (aName === cleanName || aName.includes(cleanName) || cleanName.includes(aName));
            });
            if (hasTask) return true;
          }
        }
      } catch (e) {}

      return false;
    });

    return {
      totalProjects: matched.length,
      allocatedProjects: matched.map(p => {
        const teamMember = Array.isArray(p.assigned_team) 
          ? p.assigned_team.find((m: any) => (m.name || '').toLowerCase().includes(cleanName) || cleanName.includes((m.name || '').toLowerCase()))
          : null;
        return {
          id: p.id,
          name: p.name,
          code: p.code || 'PRJ',
          stage: p.stage || p.status,
          role: teamMember?.role || 'Project Staff',
          category: p.category,
          status: p.status || 'ACTIVE'
        };
      }),
      isAllAccess: false
    };
  } catch (e) {
    console.error('Failed to get staff allocated projects', e);
    return { totalProjects: 0, allocatedProjects: [], isAllAccess: false };
  }
}

export function toggleStaffProjectAllocation(staffName: string, staffRole: string, projectId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem('booshnam_projects_v2');
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return false;
    const projects = parsed.filter((p: any) => 
      !p.id?.startsWith('proj-') &&
      !['Prestige Boulevard', 'Royal Palm', 'Green Valley', 'Sunrise Industrial', 'Urban Metro', 'Skyline Contemporary', 'Heritage Courtyard', 'Highway Overpass', 'Government Medical College', 'High-Rise Commercial', 'Coastal Highway'].some(t => (p.name || p.title || p.client_name || '').includes(t))
    );

    const cleanName = staffName.toLowerCase().trim();
    let isNowAllocated = false;

    const updated = projects.map((p: any) => {
      if (p.id === projectId) {
        const team = Array.isArray(p.assigned_team) ? [...p.assigned_team] : [];
        const existingIdx = team.findIndex((m: any) => {
          const mName = (m.name || '').toLowerCase().trim();
          return mName === cleanName || mName.includes(cleanName) || cleanName.includes(mName);
        });

        if (existingIdx >= 0) {
          // Remove from project
          team.splice(existingIdx, 1);
          isNowAllocated = false;
        } else {
          // Add to project
          team.push({
            id: `team-${Date.now()}`,
            name: staffName.trim(),
            role: staffRole || 'Site Engineer'
          });
          isNowAllocated = true;
        }
        return { ...p, assigned_team: team };
      }
      return p;
    });

    localStorage.setItem('booshnam_projects_v2', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('booshnam_projects_updated', { detail: updated }));
    return isNowAllocated;
  } catch (e) {
    console.error('Failed to toggle staff project allocation', e);
    return false;
  }
}

export function removeAllStaffProjectAllocations(staffName: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('booshnam_projects_v2');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    const projects = parsed.filter((p: any) => 
      !p.id?.startsWith('proj-') &&
      !['Prestige Boulevard', 'Royal Palm', 'Green Valley', 'Sunrise Industrial', 'Urban Metro', 'Skyline Contemporary', 'Heritage Courtyard', 'Highway Overpass', 'Government Medical College', 'High-Rise Commercial', 'Coastal Highway'].some(t => (p.name || p.title || p.client_name || '').includes(t))
    );

    const cleanName = staffName.toLowerCase().trim();

    const updated = projects.map((p: any) => {
      const team = Array.isArray(p.assigned_team) ? [...p.assigned_team] : [];
      const filteredTeam = team.filter((m: any) => {
        const mName = (m.name || '').toLowerCase().trim();
        return !(mName === cleanName || mName.includes(cleanName) || cleanName.includes(mName));
      });
      return { ...p, assigned_team: filteredTeam };
    });

    localStorage.setItem('booshnam_projects_v2', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('booshnam_projects_updated', { detail: updated }));
  } catch (e) {
    console.error('Failed to remove all staff project allocations', e);
  }
}

