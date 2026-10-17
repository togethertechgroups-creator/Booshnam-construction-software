import {
  sendProjectAssignedPush,
  sendTaskAssignedPush,
  sendMaterialRequestPushToAdmin,
} from './pushNotificationService';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'PROJECT_ASSIGNED' | 'TASK_ASSIGNED' | 'TASK_COMPLETED' | 'PAYMENT_REQUEST' | 'MATERIAL_REQUEST' | 'GENERAL';
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

export interface DynamicPaymentRequestNotificationParams {
  requestCode: string;
  amount: number;
  partyName?: string;
  projectName?: string;
  senderName?: string;
  requestType?: string;
  dueDate?: string;
}

/**
 * Generates a clean, dynamic, context-aware notification title and message for payment requests.
 * Avoids redundant text (e.g. "for bala" when bala is requester), strips awkward threshold tags,
 * and dynamically explains workflow routing.
 */
export function formatDynamicPaymentRequestNotification(params: DynamicPaymentRequestNotificationParams): {
  title: string;
  message: string;
  recipient: 'ADMIN' | 'ADMIN_AND_SUPER_ADMIN';
  amount: number;
  requestCode: string;
  projectName?: string;
  sender?: string;
} {
  const { requestCode, amount, partyName, projectName, senderName, requestType } = params;
  const isAboveThreshold = amount > 2000;
  const recipient = isAboveThreshold ? 'ADMIN_AND_SUPER_ADMIN' : 'ADMIN';
  const routedText = isAboveThreshold ? 'Admin & Super Admin' : 'Admin';
  
  const sender = (senderName || 'Staff Member').trim();
  const party = (partyName || '').trim();
  const project = (projectName || '').trim();
  const reqType = (requestType || '').trim();
  const formattedAmt = `₹${amount.toLocaleString('en-IN')}`;

  // Dynamic Title: clean, professional, includes project name if available
  const title = project 
    ? `Payment Request: ${requestCode} • ${project}`
    : `Payment Request: ${requestCode}`;

  // Smart phrasing: if party is same as sender, avoid awkward "for <sender>"
  let partyPhrase = '';
  if (party && party.toLowerCase() !== sender.toLowerCase()) {
    partyPhrase = ` for "${party}"`;
  }
  const typePhrase = reqType ? ` (${reqType})` : '';
  const projectPhrase = project ? ` on project "${project}"` : '';

  const message = `${sender} requested ${formattedAmt}${typePhrase}${partyPhrase}${projectPhrase}. Routed to ${routedText} for approval.`;

  return {
    title,
    message,
    recipient,
    amount,
    requestCode,
    projectName: project,
    sender
  };
}

export function getAllRawNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return INITIAL_NOTIFICATIONS;
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      const parsed: AppNotification[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(n => {
          if (n.type === 'PAYMENT_REQUEST') {
            let cleanTitle = (n.title || '').replace(/\s*\([><≤≥=].*?\)/g, '').trim();
            if (n.projectName && !cleanTitle.includes(n.projectName)) {
              cleanTitle = `${cleanTitle} • ${n.projectName}`;
            }
            let cleanMsg = (n.message || '')
              .replace(/\s*Routed to Admin and Super Admin\./gi, ' Routed to Admin & Super Admin for approval.')
              .replace(/\s*Routed to Admin\./gi, ' Routed to Admin for approval.');
            if (n.sender && cleanMsg.includes(`for "${n.sender}"`)) {
              cleanMsg = cleanMsg.replace(`for "${n.sender}" on `, 'on ').replace(`for "${n.sender}" in `, 'in ');
            }
            return {
              ...n,
              title: cleanTitle || n.title,
              message: cleanMsg
            };
          }
          return n;
        });
      }
      return parsed;
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

  const isSuperAdmin = cleanRole === 'super_admin' || cleanRoleName === 'super admin' || cleanName === 'superadmin' || cleanName === 'super administrator';
  const isRegularAdmin = !isSuperAdmin && (cleanRole === 'admin' || cleanRoleName.includes('admin') || cleanName === 'admin');
  const isOwnerDirector = cleanRole === 'owner_director' || cleanRoleName.includes('owner') || cleanRoleName.includes('director') || cleanName === 'priya' || cleanName === 'rajesh';

  const isAdmin = !roleCode || isSuperAdmin || isRegularAdmin || isOwnerDirector;

  // 0. Today's Tasks & Pending Tasks Reminder:
  // Must NEVER appear on Super Admin dashboard or notifications! Only for staff members and project assignees.
  if (n.title?.includes("Today's Tasks") || n.title?.includes("Pending Tasks") || n.id?.startsWith('notif-pending-tasks-') || n.id?.startsWith('notif-today-tasks-')) {
    if (isAdmin) return false;
  }

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
  // Amount-based routing:
  // - If amount > ₹2,000: notification sent to both Admin and Super Admin.
  // - If amount <= ₹2,000: notification sent ONLY to Admin. Super Admin MUST NOT receive any notification.
  if (n.type === 'PAYMENT_REQUEST') {
    // If targeted explicitly to ADMIN only:
    if (rec === 'admin') {
      if (isSuperAdmin && !isRegularAdmin) return false;
      if (isRegularAdmin || (!roleCode && !isSuperAdmin)) return true;
    }

    // If targeted to both Admin & Super Admin:
    if (rec === 'admin_and_super_admin' || rec === 'super_admin' || rec === 'superadmin') {
      if (isSuperAdmin || isRegularAdmin || isOwnerDirector || !roleCode) return true;
    }

    // Amount-based rule evaluation:
    if (typeof n.amount === 'number') {
      if (n.amount <= 2000) {
        // ₹2,000 or below: strictly Admin only! No notification sent to Super Admin.
        if (isSuperAdmin && !isRegularAdmin) return false;
        if (isRegularAdmin || (!roleCode && !isSuperAdmin)) return true;
        if (cleanRole.includes('account') || cleanRoleName.includes('account') || cleanRoleName.includes('finance')) return true;
        if (cleanName && (rec === cleanName || n.sender?.toLowerCase().trim() === cleanName)) return true;
        return false;
      } else {
        // Above ₹2,000: sent to both Admin and Super Admin
        if (isSuperAdmin || isRegularAdmin || isOwnerDirector || !roleCode) return true;
        if (cleanRole.includes('account') || cleanRoleName.includes('account') || cleanRoleName.includes('finance')) return true;
        if (cleanName && (rec === cleanName || n.sender?.toLowerCase().trim() === cleanName)) return true;
        return false;
      }
    }

    // Fallback if amount is not specified on notification
    if (isSuperAdmin && !isRegularAdmin) return false;
    if (isAdmin) return true;
    if (cleanRole.includes('account') || cleanRoleName.includes('account') || cleanRoleName.includes('finance')) return true;
    if (cleanName && rec === cleanName) return true;
    return false;
  }

  // Material Requests
  if (n.type === 'MATERIAL_REQUEST') {
    if (isAdmin) return true;
    if (cleanRole.includes('procure') || cleanRoleName.includes('procure') || cleanRoleName.includes('purchase')) return true;
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
    const parsed = JSON.parse(rawProjects);
    if (!Array.isArray(parsed)) return;
    const projects = parsed.filter((p: any) => 
      !p.id?.startsWith('proj-') &&
      !['Prestige Boulevard', 'Royal Palm', 'Green Valley', 'Sunrise Industrial', 'Urban Metro', 'Skyline Contemporary', 'Heritage Courtyard', 'Highway Overpass', 'Government Medical College', 'High-Rise Commercial', 'Coastal Highway'].some(t => (p.name || p.title || p.client_name || '').includes(t))
    );

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

/**
 * Automatically syncs Today's Tasks & Pending Tasks reminder notification for staff members and project assignees.
 * - If a task is not completed on its assigned date, it continues to appear and updates daily until completed.
 * - Once marked completed, it automatically disappears from pending task reminders.
 * - Strictly NEVER generates notifications for Super Admin.
 */
export function syncTodayTasksReminderNotifications(): void {
  if (typeof window === 'undefined') return;
  try {
    let sessionUser: any = null;
    const rawSess = localStorage.getItem('booshnam_active_session_v2');
    if (rawSess) sessionUser = JSON.parse(rawSess);
    if (!sessionUser) {
      const rawUser = localStorage.getItem('siteops_user');
      if (rawUser) sessionUser = JSON.parse(rawUser);
    }
    if (!sessionUser) return;

    const uName = (sessionUser.staff_name || sessionUser.first_name || sessionUser.username || '').toLowerCase().trim();
    const uRole = (sessionUser.role_name || '').toLowerCase().trim();
    const uCode = (sessionUser.role_code || '').toUpperCase().trim();

    // MUST NOT RUN FOR SUPER ADMIN / ADMIN
    const isAdmin = !uCode || uCode === 'SUPER_ADMIN' || uCode === 'ADMIN' || uCode === 'OWNER_DIRECTOR' ||
      uRole.includes('admin') || uRole.includes('owner') || uName === 'admin' || uName === 'superadmin' || uName === 'priya' || uName === 'rajesh' || uName === 'super administrator';
    
    if (isAdmin) {
      // Purge any reminder notifications if previously saved for admin
      const allNotifs = getAllRawNotifications();
      const cleaned = allNotifs.filter(n => !(n.title?.includes("Today's Tasks") || n.title?.includes("Pending Tasks") || n.id?.startsWith('notif-pending-tasks-') || n.id?.startsWith('notif-today-tasks-')));
      if (cleaned.length !== allNotifs.length) {
        saveNotifications(cleaned);
      }
      return;
    }

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    // Read projects
    let projects: any[] = [];
    const rawProjs = localStorage.getItem('booshnam_projects_v2');
    if (rawProjs) projects = JSON.parse(rawProjs);
    if (!Array.isArray(projects)) return;

    const pendingTasksForUser: Array<{ 
      id: string; 
      title: string; 
      projectName: string; 
      projectId: string; 
      isOverdue: boolean; 
      daysOverdue: number;
      assignedDateStr?: string;
    }> = [];

    projects.forEach((proj: any) => {
      const pid = proj.id;
      if (!pid) return;
      const team = Array.isArray(proj.assigned_team) ? proj.assigned_team : [];
      const userInTeam = team.find((mem: any) => {
        const memName = (mem.name || '').toLowerCase().trim();
        return memName === uName || memName.includes(uName) || uName.includes(memName);
      });
      const teamRole = (userInTeam?.role || '').toLowerCase().trim();

      const rawTasks = localStorage.getItem(`booshnam_wbs_tasks_v2_${pid}`) || 
                       localStorage.getItem(`booshnam_wbs_tasks_v10_${pid}`);
      if (!rawTasks) return;
      try {
        const tList = JSON.parse(rawTasks);
        if (!Array.isArray(tList)) return;

        tList.forEach((t: any) => {
          const aName = (t.assigned_to_name || t.assigned_to || '').toLowerCase().trim();
          let isAssigned = false;
          if (uName && (aName === uName || aName.includes(uName) || uName.includes(aName))) {
            isAssigned = true;
          } else if (Array.isArray(t.assigned_team) && t.assigned_team.some((mem: any) => (mem.name || '').toLowerCase().includes(uName))) {
            isAssigned = true;
          } else if (userInTeam && teamRole && (aName === teamRole || aName.includes(teamRole))) {
            isAssigned = true;
          } else if (userInTeam && uRole && (aName === uRole || aName.includes(uRole))) {
            isAssigned = true;
          }

          if (!isAssigned) return;

          // Check if already completed
          const isDone = t.status === 'COMPLETED' || (typeof t.progress_percentage === 'number' && t.progress_percentage >= 100);
          if (isDone) return;

          const sDate = t.start_date || t.planned_start || '';
          const eDate = t.end_date || t.planned_end || '';
          const aDate = t.assignment_date || '';

          const targetDate = eDate || aDate || sDate || '';
          const activationDate = sDate || aDate || eDate || '';

          // If task is scheduled strictly in the future, skip
          if (activationDate > todayStr && targetDate > todayStr) return;

          let isOverdue = false;
          let daysOverdue = 0;

          if (targetDate && targetDate < todayStr) {
            isOverdue = true;
            try {
              const targetTime = new Date(`${targetDate.slice(0, 10)}T00:00:00`).getTime();
              const todayTime = new Date(`${todayStr}T00:00:00`).getTime();
              daysOverdue = Math.max(1, Math.floor((todayTime - targetTime) / (1000 * 60 * 60 * 24)));
            } catch {
              daysOverdue = 1;
            }
          } else if (aDate && aDate < todayStr && (!eDate || eDate <= todayStr)) {
            isOverdue = true;
            try {
              const refTime = new Date(`${(eDate || aDate).slice(0, 10)}T00:00:00`).getTime();
              const todayTime = new Date(`${todayStr}T00:00:00`).getTime();
              daysOverdue = Math.max(1, Math.floor((todayTime - refTime) / (1000 * 60 * 60 * 24)));
            } catch {
              daysOverdue = 1;
            }
          }

          pendingTasksForUser.push({
            id: t.id,
            title: t.title || t.name,
            projectName: proj.name || 'Project',
            projectId: pid,
            isOverdue,
            daysOverdue,
            assignedDateStr: aDate || sDate || targetDate
          });
        });
      } catch (e) {}
    });

    const allNotifs = getAllRawNotifications();
    const uClean = uName.replace(/[^a-z0-9]/g, '-');
    const notifKey = `notif-pending-tasks-${uClean}`;

    // CASE 1: All tasks completed (or none assigned)
    // Automatically remove reminder notifications for this user!
    if (pendingTasksForUser.length === 0) {
      const filtered = allNotifs.filter(n => {
        const isReminder = n.id === notifKey || 
                           n.id.startsWith(`notif-pending-tasks-${uClean}`) || 
                           n.id.startsWith(`notif-today-tasks-${uClean}`) ||
                           ((n.title?.includes("Today's Tasks") || n.title?.includes("Pending Tasks")) &&
                            (n.recipient?.toLowerCase().trim() === uName || uName.includes(n.recipient?.toLowerCase().trim() || '')));
        return !isReminder;
      });

      if (filtered.length !== allNotifs.length) {
        saveNotifications(filtered);
      }
      return;
    }

    // CASE 2: User has pending tasks needing completion!
    const overdueList = pendingTasksForUser.filter(t => t.isOverdue);
    const todayList = pendingTasksForUser.filter(t => !t.isOverdue);
    const totalPending = pendingTasksForUser.length;

    let notifTitle = "Pending Tasks Reminder";
    let notifMessage = "";

    if (overdueList.length > 0 && todayList.length > 0) {
      const maxOverdue = Math.max(...overdueList.map(t => t.daysOverdue));
      notifTitle = `Pending Tasks Reminder (${totalPending} Pending • ${overdueList.length} Overdue)`;
      const sampleNames = overdueList.slice(0, 2).map(t => `"${t.title}"`).join(', ');
      notifMessage = `Reminder: You have ${totalPending} pending task(s) needing completion (${overdueList.length} overdue by up to ${maxOverdue} day(s), including ${sampleNames}, plus ${todayList.length} scheduled for today). Please complete them.`;
    } else if (overdueList.length > 0) {
      const maxOverdue = Math.max(...overdueList.map(t => t.daysOverdue));
      notifTitle = `Pending Tasks Reminder (${overdueList.length} Overdue)`;
      const sampleNames = overdueList.slice(0, 2).map(t => `"${t.title}"`).join(', ');
      const extra = overdueList.length > 2 ? ` +${overdueList.length - 2} more` : '';
      notifMessage = `Reminder: ${overdueList.length} task(s) (${sampleNames}${extra}) were not completed on their assigned date (overdue up to ${maxOverdue} day(s)). Please complete them as soon as possible.`;
    } else {
      notifTitle = `Today's Tasks Reminder (${todayList.length} Scheduled)`;
      const sampleNames = todayList.slice(0, 2).map(t => `"${t.title}"`).join(', ');
      const extra = todayList.length > 2 ? ` +${todayList.length - 2} more` : '';
      notifMessage = `You have ${todayList.length} task(s) scheduled for completion today (${sampleNames}${extra}). Please complete them.`;
    }

    // Clean any prior versions of reminders for this user
    const remainingNotifs = allNotifs.filter(n => {
      if (n.id === notifKey) return false;
      const isOldReminder = n.id.startsWith(`notif-pending-tasks-${uClean}`) || 
                            n.id.startsWith(`notif-today-tasks-${uClean}`) ||
                            ((n.title?.includes("Today's Tasks") || n.title?.includes("Pending Tasks")) &&
                             (n.recipient?.toLowerCase().trim() === uName || uName.includes(n.recipient?.toLowerCase().trim() || '')));
      return !isOldReminder;
    });

    const activeReminderNotif: AppNotification = {
      id: notifKey,
      title: notifTitle,
      message: notifMessage,
      type: 'TASK_ASSIGNED',
      recipient: sessionUser.staff_name || sessionUser.username,
      sender: 'SiteOps System',
      projectName: pendingTasksForUser[0].projectName,
      projectId: pendingTasksForUser[0].projectId,
      taskName: pendingTasksForUser[0].title,
      timestamp: 'Today (Daily update)',
      read: false
    };

    saveNotifications([activeReminderNotif, ...remainingNotifs]);
  } catch (e) {
    console.error('Failed to sync today task reminder notifications', e);
  }
}

export const syncPendingTasksReminderNotifications = syncTodayTasksReminderNotifications;

export function getNotifications(
  recipientName?: string,
  roleCode?: string,
  roleName?: string
): AppNotification[] {
  syncProjectAssignmentNotifications();
  syncTodayTasksReminderNotifications();

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

  let formattedTitle = notif.title;
  let formattedMessage = notif.message;
  if (notif.type === 'PAYMENT_REQUEST') {
    formattedTitle = (notif.title || '').replace(/\s*\([><≤≥=].*?\)/g, '').trim();
    if (notif.projectName && !formattedTitle.includes(notif.projectName)) {
      formattedTitle = `${formattedTitle} • ${notif.projectName}`;
    }
    formattedMessage = (notif.message || '')
      .replace(/\s*Routed to Admin and Super Admin\./gi, ' Routed to Admin & Super Admin for approval.')
      .replace(/\s*Routed to Admin\./gi, ' Routed to Admin for approval.');
    if (notif.sender && formattedMessage.includes(`for "${notif.sender}"`)) {
      formattedMessage = formattedMessage.replace(`for "${notif.sender}" on `, 'on ').replace(`for "${notif.sender}" in `, 'in ');
    }
  }

  const newNotif: AppNotification = {
    ...notif,
    title: formattedTitle,
    message: formattedMessage,
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

      if (!notif.silentToast && activeName && isNotificationForUser(newNotif, activeName, activeRoleCode, activeRoleName)) {
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

  // Automatically dispatch push notification to mobile devices
  try {
    if (newNotif.type === 'PROJECT_ASSIGNED') {
      sendProjectAssignedPush(
        newNotif.recipient,
        newNotif.projectName || 'Project',
        newNotif.projectId
      );
    } else if (newNotif.type === 'TASK_ASSIGNED') {
      sendTaskAssignedPush(
        newNotif.recipient,
        newNotif.taskName || 'Task',
        newNotif.projectName || 'Project',
        undefined,
        newNotif.projectId
      );
    } else if (newNotif.type === 'MATERIAL_REQUEST') {
      sendMaterialRequestPushToAdmin(
        newNotif.sender || 'Site Engineer',
        newNotif.taskName || 'Materials',
        newNotif.amount || 1,
        'units',
        newNotif.projectName || 'Project',
        newNotif.requestCode || 'MR'
      );
    } else if (newNotif.type === 'PAYMENT_REQUEST') {
      // Kept strictly within in-app bell notification dropdown (Image 1).
      // External push / secondary black notification card (Image 2) is disabled per user request.
    }
  } catch (err) {
    console.error('Failed to trigger mobile push notification', err);
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

