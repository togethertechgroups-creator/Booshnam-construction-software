/**
 * Project Access Service
 * Handles user-based project visibility and deleted project filtering.
 * Ensures that:
 * 1. Deleted projects are never shown anywhere in the application.
 * 2. Only projects accessible to the currently logged-in user (by role, department, and team/task allocation) are shown.
 */

import { Project } from '../types';
import { getCurrentUserAccount } from './authService';
import { 
  isUserCompanyWideSuperAdmin, 
  getUserAllowedDepartmentIds, 
  normalizeDepartmentId 
} from './departmentService';

const DELETED_PROJECTS_KEY = 'booshnam_deleted_project_ids';

/**
 * Returns the Set of deleted project identifiers (IDs, codes, and normalized names)
 */
export function getDeletedProjectIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELETED_PROJECTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.map(s => String(s).toLowerCase().trim()));
      }
    }
  } catch (e) {}
  return new Set();
}

/**
 * Marks a project as deleted permanently across the entire application
 */
export function markProjectDeleted(projectId?: string | null, projectCode?: string | null, projectName?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const deletedSet = getDeletedProjectIds();
    if (projectId) deletedSet.add(projectId.toLowerCase().trim());
    if (projectCode) deletedSet.add(projectCode.toLowerCase().trim());
    if (projectName) deletedSet.add(projectName.toLowerCase().trim());

    localStorage.setItem(DELETED_PROJECTS_KEY, JSON.stringify(Array.from(deletedSet)));

    // Clean from booshnam_projects_v2
    const raw = localStorage.getItem('booshnam_projects_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((p: any) => {
          if (!p) return false;
          const pId = (p.id || '').toLowerCase().trim();
          const pCode = (p.code || '').toLowerCase().trim();
          const pName = (p.name || '').toLowerCase().trim();
          if (projectId && pId === projectId.toLowerCase().trim()) return false;
          if (projectCode && pCode === projectCode.toLowerCase().trim()) return false;
          if (projectName && pName === projectName.toLowerCase().trim()) return false;
          return true;
        });
        localStorage.setItem('booshnam_projects_v2', JSON.stringify(cleaned));
      }
    }

    // Broadcast project update event
    window.dispatchEvent(new CustomEvent('booshnam_projects_deleted', { 
      detail: { projectId, projectCode, projectName } 
    }));
  } catch (e) {
    console.error('Failed to mark project as deleted', e);
  }
}

/**
 * Check if a project is deleted or is a dummy placeholder project
 */
export function isProjectDeleted(p: any): boolean {
  if (!p) return true;
  if (p.is_deleted === true || p.deleted === true || p.status === 'DELETED') return true;

  const deletedSet = getDeletedProjectIds();
  const pId = (p.id || '').toLowerCase().trim();
  const pCode = (p.code || '').toLowerCase().trim();
  const pName = (p.name || '').toLowerCase().trim();

  if (pId && deletedSet.has(pId)) return true;
  if (pCode && deletedSet.has(pCode)) return true;
  if (pName && deletedSet.has(pName)) return true;

  // Filter legacy dummy projects
  const dummyNames = [
    'prestige boulevard', 'royal palm', 'green valley', 'sunrise industrial',
    'urban metro', 'skyline contemporary', 'heritage courtyard', 'highway overpass',
    'government medical college', 'high-rise commercial', 'coastal highway'
  ];
  if (pName && dummyNames.some(d => pName.includes(d))) return true;

  return false;
}

/**
 * Returns all active, non-deleted projects from storage or supplied list
 */
export function getAllActiveProjects(sourceProjects?: Project[]): Project[] {
  let list = sourceProjects && sourceProjects.length > 0 ? sourceProjects : [];

  if (list.length === 0 && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('booshnam_projects_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) list = parsed;
      }
    } catch (e) {}
  }

  return list.filter(p => !isProjectDeleted(p));
}

/**
 * Filters projects strictly according to the currently logged-in user's role, department,
 * and project allocations/tasks. Deleted projects are always excluded.
 */
export function getUserAccessibleProjects(sourceProjects?: Project[]): Project[] {
  const activeProjects = getAllActiveProjects(sourceProjects);
  if (activeProjects.length === 0) return [];

  let activeAcc = getCurrentUserAccount();
  let parsedUser: any = null;

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('siteops_user');
      if (stored) parsedUser = JSON.parse(stored);
    } catch (e) {}
  }

  const staffName = (activeAcc?.staff_name || activeAcc?.username || parsedUser?.first_name || parsedUser?.name || '').trim();
  const cleanStaffName = staffName.toLowerCase().trim();
  const roleCode = (activeAcc?.role_code || parsedUser?.role_code || '').toUpperCase().trim();
  const roleName = (activeAcc?.role_name || parsedUser?.role_name || '').toLowerCase().trim();

  // 1. Company-Wide Super Admin: full access to all active projects across all departments
  const isSuper = isUserCompanyWideSuperAdmin(activeAcc) || 
                  roleCode === 'SUPER_ADMIN' || 
                  cleanStaffName === 'priya' || 
                  cleanStaffName === 'superadmin' || 
                  roleName.includes('owner') || 
                  roleName.includes('director');

  if (isSuper) {
    return activeProjects;
  }

  // 2. Department restrictions for Admin / Accounts / Staff
  const allowedDeptIds = getUserAllowedDepartmentIds(activeAcc);
  const isAdminOrAccounts = roleCode === 'ADMIN' || 
                            roleCode === 'ACCOUNTS' || 
                            roleCode === 'FINANCE' || 
                            roleName.includes('admin') || 
                            roleName.includes('account') || 
                            roleName.includes('finance');

  // Filter projects for the specific user
  return activeProjects.filter(p => {
    // Check Department allowance
    if (allowedDeptIds && allowedDeptIds.length > 0) {
      const pDept = normalizeDepartmentId(p.department as string);
      if (!allowedDeptIds.includes(pDept)) {
        return false;
      }
    }

    // Admins and Accounts staff have department-wide visibility
    if (isAdminOrAccounts) {
      return true;
    }

    // For Site Engineers, Supervisors, Field Staff: must be allocated to the project or have tasks
    if (!cleanStaffName) return false;

    // Check A: Assigned in project team
    if (Array.isArray(p.assigned_team)) {
      const userStaffId = (activeAcc?.staff_id || '').toLowerCase().trim();
      const inTeam = p.assigned_team.some((m: any) => {
        const mName = (m.name || m.staff_name || '').toLowerCase().trim();
        const mId = (m.id || m.staff_id || '').toLowerCase().trim();
        if (userStaffId && mId && userStaffId === mId) return true;
        return mName && (mName === cleanStaffName || mName.includes(cleanStaffName) || cleanStaffName.includes(mName));
      });
      if (inTeam) return true;
    }

    // Check B: Listed as site engineer, project lead, supervisor, in charge, or creator
    const leadFields = [
      (p as any).site_engineer,
      (p as any).project_lead,
      (p as any).supervisor,
      (p as any).in_charge,
      (p as any).created_by,
      (p as any).assigned_to
    ];
    const matchesLead = leadFields.some(field => {
      if (!field || typeof field !== 'string') return false;
      const fClean = field.toLowerCase().trim();
      return fClean === cleanStaffName || fClean.includes(cleanStaffName) || cleanStaffName.includes(fClean);
    });
    if (matchesLead) return true;

    // Check C: Client login matching project's client name
    if (p.client_name && cleanStaffName) {
      const cClean = p.client_name.toLowerCase().trim();
      if (cClean === cleanStaffName || cClean.includes(cleanStaffName) || cleanStaffName.includes(cClean)) {
        return true;
      }
    }

    // Check D: Has assigned task(s) in this project
    if (typeof window !== 'undefined' && p.id) {
      try {
        const rawTasks = localStorage.getItem(`booshnam_wbs_tasks_v2_${p.id}`);
        if (rawTasks) {
          const tList = JSON.parse(rawTasks);
          if (Array.isArray(tList)) {
            const hasTask = tList.some((t: any) => {
              const aName = (t.assigned_to_name || t.assigned_to || '').toLowerCase().trim();
              return aName && (aName === cleanStaffName || aName.includes(cleanStaffName) || cleanStaffName.includes(aName));
            });
            if (hasTask) return true;
          }
        }
      } catch (e) {}
    }

    return false;
  });
}
