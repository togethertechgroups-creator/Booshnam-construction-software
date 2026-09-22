export interface StaffMember {
  id: string;
  employee_code: string;
  name: string;
  role_code: string;
  role_name: string;
  department: string;
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
}

const DEFAULT_STAFF_MEMBERS: StaffMember[] = [
  {
    id: 'staff-1',
    employee_code: 'EMP-0101',
    name: 'Rajesh Chandran',
    role_code: 'SUPER_ADMIN',
    role_name: 'Super Admin',
    department: 'Executive Management',
    designation: 'Managing Director',
    dob: '1982-05-14',
    doj: '2018-01-10',
    phone: '9840123456',
    email: 'rajesh@booshnam.com',
    employment_type: 'Full-time',
    salary: 150000,
    salary_type: 'Month',
    status: 'ACTIVE',
    has_login_account: true,
    username: 'admin',
    created_at: '2024-01-01'
  },
  {
    id: 'staff-2',
    employee_code: 'EMP-0103',
    name: 'Anandhi Venkatesh',
    role_code: 'ADMIN',
    role_name: 'Admin',
    department: 'Office Administration',
    designation: 'Operations Admin',
    dob: '1990-08-22',
    doj: '2021-03-15',
    phone: '9840234567',
    email: 'anandhi@booshnam.com',
    employment_type: 'Full-time',
    salary: 45000,
    salary_type: 'Month',
    status: 'ACTIVE',
    has_login_account: true,
    username: 'anandhi.admin',
    created_at: '2024-01-01'
  },
  {
    id: 'staff-3',
    employee_code: 'EMP-0111',
    name: 'Arun Verma',
    role_code: 'SITE_ENGINEER',
    role_name: 'Site Engineer',
    department: 'Civil Engineering',
    designation: 'Lead Site Engineer',
    dob: '1993-11-04',
    doj: '2022-07-01',
    phone: '9840345678',
    email: 'arun@booshnam.com',
    employment_type: 'Full-time',
    salary: 55000,
    salary_type: 'Month',
    status: 'ACTIVE',
    has_login_account: true,
    username: 'arun.verma',
    created_at: '2024-01-01'
  },
  {
    id: 'staff-4',
    employee_code: 'EMP-0116',
    name: 'Ravi Kumar',
    role_code: 'SUPERVISOR',
    role_name: 'Supervisor',
    department: 'Site Operations',
    designation: 'Site Operations Supervisor',
    dob: '1988-02-18',
    doj: '2023-01-10',
    phone: '9840456789',
    email: 'ravi.k@booshnam.com',
    employment_type: 'Full-time',
    salary: 1200,
    salary_type: 'Day',
    status: 'ACTIVE',
    has_login_account: true,
    username: 'ravi.kumar',
    created_at: '2024-01-01'
  },
  {
    id: 'staff-5',
    employee_code: 'EMP-0107',
    name: 'Kavitha Selvan',
    role_code: 'ACCOUNTS',
    role_name: 'Accounts',
    department: 'Finance & Accounts',
    designation: 'Senior Accountant',
    dob: '1991-09-30',
    doj: '2022-10-15',
    phone: '9840567890',
    email: 'kavitha@booshnam.com',
    employment_type: 'Full-time',
    salary: 40000,
    salary_type: 'Month',
    status: 'ACTIVE',
    has_login_account: false,
    created_at: '2024-01-01'
  },
  {
    id: 'staff-6',
    employee_code: 'EMP-0105',
    name: 'Meena Kumari',
    role_code: 'ARCHITECT',
    role_name: 'Architect',
    department: 'Architecture & Design',
    designation: 'Architectural Designer',
    dob: '1994-06-12',
    doj: '2023-05-02',
    phone: '9840678901',
    email: 'meena@booshnam.com',
    employment_type: 'Full-time',
    salary: 48000,
    salary_type: 'Month',
    status: 'ACTIVE',
    has_login_account: false,
    created_at: '2024-01-01'
  },
  {
    id: 'staff-7',
    employee_code: 'EMP-0112',
    name: 'Balaji Govind',
    role_code: 'PROJECT_MANAGER',
    role_name: 'Project Manager',
    department: 'Project Management',
    designation: 'Project Manager',
    dob: '1989-03-21',
    doj: '2021-06-15',
    phone: '9840567890',
    email: 'balaji@booshnam.com',
    employment_type: 'Full-time',
    salary: 85000,
    salary_type: 'Month',
    status: 'ACTIVE',
    has_login_account: false,
    created_at: '2024-01-01'
  },
  {
    id: 'staff-8',
    employee_code: 'EMP-0113',
    name: 'Likson',
    role_code: 'SITE_ENGINEER',
    role_name: 'Site Engineer',
    department: 'Civil Engineering',
    designation: 'Site Engineer - Field Ops',
    dob: '1995-08-10',
    doj: '2023-02-01',
    phone: '9444006047',
    email: 'likson@booshnam.com',
    employment_type: 'Full-time',
    salary: 48000,
    salary_type: 'Month',
    status: 'ACTIVE',
    has_login_account: false,
    created_at: '2024-01-01'
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

export function getStaffMembers(): StaffMember[] {
  if (typeof window === 'undefined') return DEFAULT_STAFF_MEMBERS;
  try {
    const raw = localStorage.getItem(STAFF_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(DEFAULT_STAFF_MEMBERS));
      return DEFAULT_STAFF_MEMBERS;
    }
    return JSON.parse(raw);
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
    window.dispatchEvent(new CustomEvent('booshnam_staff_updated', { detail: updated }));
  } catch (e) {
    console.error('Failed to save staff member', e);
  }
  return updated;
}

export function deleteStaffMember(id: string): StaffMember[] {
  const current = getStaffMembers();
  const updated = current.filter(s => s.id !== id);
  try {
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('booshnam_staff_updated', { detail: updated }));
  } catch (e) {
    console.error('Failed to delete staff member', e);
  }
  return updated;
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
    const projects = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(projects) || projects.length === 0) {
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
    const projects = JSON.parse(raw);
    if (!Array.isArray(projects)) return false;

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
    const projects = JSON.parse(raw);
    if (!Array.isArray(projects)) return;

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

