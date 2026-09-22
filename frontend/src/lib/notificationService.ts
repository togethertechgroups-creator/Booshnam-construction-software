export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'PROJECT_ASSIGNED' | 'TASK_ASSIGNED' | 'TASK_COMPLETED' | 'PAYMENT_REQUEST' | 'GENERAL';
  recipient: string; // e.g. 'Madhumitha', 'Pavani', 'Likson', 'Site Engineer', 'ADMIN', 'ALL'
  sender?: string;
  projectName?: string;
  projectId?: string;
  taskName?: string;
  proofUrl?: string;
  amount?: number;
  requestCode?: string;
  timestamp: string;
  read: boolean;
}

const NOTIFICATIONS_STORAGE_KEY = 'siteops_notifications_v4';

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

export function getAllRawNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return INITIAL_NOTIFICATIONS;
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
    // Clean any legacy storage keys so old dummy notifications are purged
    localStorage.removeItem('siteops_notifications_v3');
    localStorage.removeItem('siteops_notifications_v2');
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify([]));
    return [];
  } catch (e) {
    console.error('Failed to parse notifications', e);
    return [];
  }
}

export function isNotificationForUser(
  n: AppNotification,
  recipientName?: string,
  roleCode?: string,
  roleName?: string
): boolean {
  const cleanName = (recipientName || '').toLowerCase().trim();
  const cleanRole = (roleCode || '').toLowerCase().trim();
  const cleanRoleName = (roleName || '').toLowerCase().trim();
  const rec = (n.recipient || '').toLowerCase().trim();

  const isAdmin = !roleCode || cleanRole === 'super_admin' || cleanRole === 'admin' || 
    cleanRoleName.includes('admin') || cleanRoleName.includes('owner') || cleanName === 'admin' || cleanName === 'priya';

  // 1. Task Assigned & Project Assigned:
  // ONLY for the specific individual or role assigned! Admin/Super Admin NEVER receives other people's assignment notifications.
  if (n.type === 'TASK_ASSIGNED' || n.type === 'PROJECT_ASSIGNED') {
    if (!rec || rec === 'all') return false;
    // Direct personal match
    if (cleanName && (rec === cleanName || rec.includes(cleanName) || cleanName.includes(rec))) {
      return true;
    }
    // Check parts of name (e.g., 'likson' matches 'Likson - Field Ops' or 'Likson (Site Eng)')
    const nameParts = cleanName.split(/[\s\-()]+/);
    if (nameParts.some(p => p.length >= 3 && (rec === p || rec.includes(p) || p.includes(rec)))) {
      return true;
    }
    const recParts = rec.split(/[\s\-()]+/);
    if (cleanName && recParts.some(p => p.length >= 3 && cleanName.includes(p))) {
      return true;
    }
    // Role title match (e.g. "Site Engineer", "Project Lead", "Project Manager", "Estimator")
    if (cleanRoleName && (rec === cleanRoleName || cleanRoleName.includes(rec) || rec.includes(cleanRoleName))) {
      return true;
    }
    if (cleanRole && (rec === cleanRole || cleanRole.includes(rec) || rec.includes(cleanRole))) {
      return true;
    }
    return false;
  }

  // 2. Payment Requests:
  // Primary operational notification for Admin / Super Admin and Accounts
  if (n.type === 'PAYMENT_REQUEST') {
    if (isAdmin) return true;
    if (cleanRole.includes('account') || cleanRoleName.includes('account') || cleanRoleName.includes('finance')) return true;
    if (cleanName && rec === cleanName) return true;
    return false;
  }

  // 3. Task Completed (with proof):
  // Management notification sent to Admin to review site proofs & task completion
  if (n.type === 'TASK_COMPLETED') {
    if (isAdmin) return true;
    if (rec === 'admin' || rec === 'all') return true;
    if (cleanName && rec === cleanName) return true;
    return false;
  }

  // 4. General / Other notifications
  if (rec === 'all') return true;
  if (isAdmin && rec === 'admin') return true;
  if (cleanName && rec === cleanName) return true;
  if (cleanRoleName && rec === cleanRoleName) return true;

  return false;
}

export function syncProjectAssignmentNotifications(): void {
  if (typeof window === 'undefined') return;
  try {
    const rawProjects = localStorage.getItem('booshnam_projects_v2');
    if (!rawProjects) return;
    const projects = JSON.parse(rawProjects);
    if (!Array.isArray(projects)) return;

    const currentNotifs = getAllRawNotifications();
    let hasNew = false;
    let updated = [...currentNotifs];

    // 1. Remove redundant auto-generated initial TASK_ASSIGNED notifications
    // User instruction: When assigning a project, only send ONE message saying the project is assigned. Do not send individual notifications for every default/initial task.
    const beforeLength = updated.length;
    updated = updated.filter(n => {
      if (n.type === 'TASK_ASSIGNED') {
        // Remove all task notifications from initial project setup
        return false;
      }
      return true;
    });
    if (updated.length !== beforeLength) {
      hasNew = true;
    }

    // 2. Ensure each assigned team member has exactly one PROJECT_ASSIGNED notification
    projects.forEach((proj: any) => {
      const projTitle = proj.name || 'Project';
      const projId = proj.id || `p-${projTitle}`;
      const team = Array.isArray(proj.assigned_team) ? proj.assigned_team : [];
      
      // Also check tasks for this project if assigned
      const taskAssignees: Array<{ name: string; role: string }> = [];
      try {
        const rawTasks = localStorage.getItem(`booshnam_wbs_tasks_v2_${projId}`);
        if (rawTasks) {
          const tList = JSON.parse(rawTasks);
          if (Array.isArray(tList)) {
            tList.forEach((t: any) => {
              const aName = t.assigned_to_name || t.assigned_to;
              if (aName && typeof aName === 'string' && aName !== '—' && !aName.toLowerCase().includes('lead') && !aName.toLowerCase().includes('engineer')) {
                taskAssignees.push({ name: aName.trim(), role: 'Site Engineer' });
              }
            });
          }
        }
      } catch (e) {}

      const allMembersToNotify: Array<{ name: string; role: string }> = [
        ...team.map((m: any) => ({ name: m.name, role: m.role || 'Team Member' })),
        ...taskAssignees
      ];

      allMembersToNotify.forEach(member => {
        if (!member.name) return;
        const memberClean = member.name.toLowerCase().trim();
        if (memberClean === 'all' || memberClean === 'admin' || memberClean === 'priya') return;

        // Check if a PROJECT_ASSIGNED notification already exists for this member and this project
        const exists = updated.some(n => 
          n.type === 'PROJECT_ASSIGNED' && 
          (n.projectId === projId || n.projectName === projTitle) && 
          (n.recipient?.toLowerCase().trim() === memberClean || 
           memberClean.includes(n.recipient?.toLowerCase().trim() || '') ||
           (n.recipient && n.recipient.toLowerCase().trim().includes(memberClean)))
        );

        if (!exists) {
          updated.unshift({
            id: `notif-proj-${projId}-${memberClean.replace(/[^a-z0-9]/g, '-')}`,
            title: 'Assigned to Project',
            message: `You have been added to project "${projTitle}" as ${member.role || 'Site Engineer'}.`,
            type: 'PROJECT_ASSIGNED',
            recipient: member.name,
            sender: 'Admin',
            projectName: projTitle,
            projectId: projId,
            timestamp: 'Just now',
            read: false
          });
          hasNew = true;
        }
      });
    });

    if (hasNew) {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Failed to sync project assignment notifications', e);
  }
}

export function getNotifications(
  recipientName?: string,
  roleCode?: string,
  roleName?: string
): AppNotification[] {
  syncProjectAssignmentNotifications();

  const all = getAllRawNotifications();
  let sessionStaffName: string | undefined;
  let sessionUsername: string | undefined;
  let sessionRoleCode: string | undefined;
  let sessionRoleName: string | undefined;

  try {
    const raw = localStorage.getItem('booshnam_active_session_v2');
    if (raw) {
      const sess = JSON.parse(raw);
      sessionStaffName = sess.staff_name;
      sessionUsername = sess.username;
      sessionRoleCode = sess.role_code;
      sessionRoleName = sess.role_name;
    }
  } catch (e) {}

  try {
    const rawUser = localStorage.getItem('siteops_user');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      if (!sessionStaffName && u.first_name) sessionStaffName = u.first_name;
      if (!sessionUsername && u.username) sessionUsername = u.username;
      if (!sessionRoleCode && u.role_code) sessionRoleCode = u.role_code;
      if (!sessionRoleName && u.role_name) sessionRoleName = u.role_name;
    }
  } catch (e) {}

  const activeRoleCode = roleCode || sessionRoleCode;
  const activeRoleName = roleName || sessionRoleName;
  const activeName = recipientName || sessionStaffName || sessionUsername;

  return all.filter(n => {
    if (activeName && isNotificationForUser(n, activeName, activeRoleCode, activeRoleName)) return true;
    if (sessionStaffName && isNotificationForUser(n, sessionStaffName, activeRoleCode, activeRoleName)) return true;
    if (sessionUsername && isNotificationForUser(n, sessionUsername, activeRoleCode, activeRoleName)) return true;
    if (!activeName && !sessionStaffName) return isNotificationForUser(n, recipientName, roleCode, roleName);
    return false;
  });
}

export function saveNotifications(notifications: AppNotification[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
    window.dispatchEvent(new CustomEvent('siteops_notifications_updated', { detail: notifications }));
  } catch (e) {
    console.error('Failed to save notifications', e);
  }
}

export function addNotification(
  notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'> & { timestamp?: string; silentToast?: boolean }
): AppNotification {
  const current = getAllRawNotifications();
  const newNotif: AppNotification = {
    ...notif,
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: notif.timestamp || 'Just now',
    read: false,
  };

  const updated = [newNotif, ...current];
  saveNotifications(updated);

  // Trigger a toast event if it's relevant to the current user
  if (typeof window !== 'undefined') {
    try {
      let activeName: string | undefined;
      let activeRoleCode: string | undefined;
      let activeRoleName: string | undefined;
      const rawSess = localStorage.getItem('booshnam_active_session_v2');
      if (rawSess) {
        const sess = JSON.parse(rawSess);
        activeName = sess.staff_name || sess.username;
        activeRoleCode = sess.role_code;
        activeRoleName = sess.role_name;
      } else {
        const stored = localStorage.getItem('siteops_user');
        const currentUser = stored ? JSON.parse(stored) : null;
        if (currentUser) {
          activeName = currentUser.first_name || currentUser.username;
          activeRoleCode = currentUser.role_code;
          activeRoleName = currentUser.role_name;
        }
      }

      if (activeName && isNotificationForUser(newNotif, activeName, activeRoleCode, activeRoleName)) {
        window.dispatchEvent(new CustomEvent('siteops_toast', {
          detail: {
            title: newNotif.title,
            message: newNotif.message,
            type: 'info',
            duration: 6000
          }
        }));
      }
    } catch (e) {}
  }

  return newNotif;
}

export function markNotificationRead(id: string): void {
  const current = getAllRawNotifications();
  const updated = current.map(n => n.id === id ? { ...n, read: true } : n);
  saveNotifications(updated);
}

export function markAllNotificationsRead(
  recipientName?: string,
  roleCode?: string,
  roleName?: string,
  targetNotificationIds?: string[]
): void {
  const current = getAllRawNotifications();
  const idSet = targetNotificationIds && targetNotificationIds.length > 0 ? new Set(targetNotificationIds) : null;
  let sessionStaffName: string | undefined;
  let sessionUsername: string | undefined;
  let sessionRoleCode: string | undefined;
  let sessionRoleName: string | undefined;

  try {
    const raw = localStorage.getItem('booshnam_active_session_v2');
    if (raw) {
      const sess = JSON.parse(raw);
      sessionStaffName = sess.staff_name;
      sessionUsername = sess.username;
      sessionRoleCode = sess.role_code;
      sessionRoleName = sess.role_name;
    }
  } catch (e) {}

  try {
    const rawUser = localStorage.getItem('siteops_user');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      if (!sessionStaffName && u.first_name) sessionStaffName = u.first_name;
      if (!sessionUsername && u.username) sessionUsername = u.username;
      if (!sessionRoleCode && u.role_code) sessionRoleCode = u.role_code;
      if (!sessionRoleName && u.role_name) sessionRoleName = u.role_name;
    }
  } catch (e) {}

  const activeRoleCode = roleCode || sessionRoleCode;
  const activeRoleName = roleName || sessionRoleName;
  const activeName = recipientName || sessionStaffName || sessionUsername;

  const updated = current.map(n => {
    // If specific notification IDs are provided, match them directly
    if (idSet && idSet.has(n.id)) {
      return { ...n, read: true };
    }
    // Also match by user recipient / session
    if ((activeName && isNotificationForUser(n, activeName, activeRoleCode, activeRoleName)) ||
        (sessionStaffName && isNotificationForUser(n, sessionStaffName, activeRoleCode, activeRoleName)) ||
        (sessionUsername && isNotificationForUser(n, sessionUsername, activeRoleCode, activeRoleName))) {
      return { ...n, read: true };
    }
    return n;
  });
  saveNotifications(updated);
}

export function clearAllNotifications(): void {
  saveNotifications([]);
}

