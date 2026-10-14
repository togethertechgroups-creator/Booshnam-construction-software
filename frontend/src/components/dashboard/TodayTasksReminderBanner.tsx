import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calendar, CheckCircle2, Clock, AlertTriangle, Check, 
  ChevronDown, ChevronUp, ArrowRight, PlayCircle, FolderKanban, 
  RotateCcw, Sparkles, ListTodo, ShieldAlert, X, AlertCircle,
  Hourglass, CheckCheck
} from 'lucide-react';
import { Project, WBSTask } from '../../types';
import { getCurrentUserAccount, UserAccount } from '../../lib/authService';
import { formatProjectTitle } from '../../lib/mockData';
import { syncTodayTasksReminderNotifications } from '../../lib/notificationService';

export interface TodayTaskItem extends WBSTask {
  projectName: string;
  projectCode?: string;
  projectDept?: string;
  projectId: string;
  isOverdue?: boolean;
  daysOverdue?: number;
  assignedDateStr?: string;
}

interface TodayTasksReminderBannerProps {
  projects?: Project[];
  onSelectProject?: (p: Project) => void;
  onNavigate?: (view: string) => void;
  onShowToast?: (msg: string) => void;
}

/**
 * Returns true if the account is a Super Admin / Director who should NOT see staff task reminders.
 */
export function isSuperAdminAccount(user: UserAccount | null): boolean {
  if (!user) return true; // Default fallback to safe
  const code = (user.role_code || '').toUpperCase().trim();
  const rName = (user.role_name || '').toLowerCase().trim();
  const uName = (user.username || '').toLowerCase().trim();
  const sName = (user.staff_name || '').toLowerCase().trim();

  return (
    code === 'SUPER_ADMIN' ||
    code === 'ADMIN' ||
    code === 'OWNER_DIRECTOR' ||
    rName === 'super admin' ||
    rName.includes('admin') ||
    rName === 'owner / director' ||
    uName === 'superadmin' ||
    uName === 'admin' ||
    sName === 'super administrator' ||
    sName === 'admin' ||
    sName === 'priya' ||
    sName === 'rajesh'
  );
}

export const TodayTasksReminderBanner: React.FC<TodayTasksReminderBannerProps> = ({
  projects: propProjects,
  onSelectProject,
  onNavigate,
  onShowToast,
}) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => getCurrentUserAccount());
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'all' | 'overdue' | 'today'>('all');
  const [isCompletedDismissed, setIsCompletedDismissed] = useState(false);

  // Listen to session changes or staff switching
  useEffect(() => {
    const handleSessionChange = () => {
      setCurrentUser(getCurrentUserAccount());
      setIsCompletedDismissed(false);
    };
    window.addEventListener('booshnam_active_session_v2', handleSessionChange);
    window.addEventListener('booshnam_user_accounts_updated', handleSessionChange);
    return () => {
      window.removeEventListener('booshnam_active_session_v2', handleSessionChange);
      window.removeEventListener('booshnam_user_accounts_updated', handleSessionChange);
    };
  }, []);

  // Listen to task updates across the app
  useEffect(() => {
    const handleTasksUpdate = () => {
      setRefreshTrigger(prev => prev + 1);
    };
    window.addEventListener('booshnam_wbs_tasks_updated', handleTasksUpdate);
    window.addEventListener('booshnam_projects_updated', handleTasksUpdate);
    return () => {
      window.removeEventListener('booshnam_wbs_tasks_updated', handleTasksUpdate);
      window.removeEventListener('booshnam_projects_updated', handleTasksUpdate);
    };
  }, []);

  // Strictly verify target user: ONLY available for staff members and project assignees!
  // MUST NOT APPEAR on Super Admin dashboard!
  const isSuperAdmin = useMemo(() => isSuperAdminAccount(currentUser), [currentUser]);

  // Today's date string in YYYY-MM-DD format
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Formatted date label for display (e.g. "Wednesday, 14 Oct 2026")
  const formattedTodayLabel = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }, []);

  // Compute all scheduled tasks for today and incomplete tasks from past dates assigned to this staff member
  const { todayTasks, overdueCount, todayDueCount, completedTodayCount } = useMemo(() => {
    if (isSuperAdmin || !currentUser) {
      return { todayTasks: [], overdueCount: 0, todayDueCount: 0, completedTodayCount: 0 };
    }

    const cleanUserName = (currentUser.staff_name || currentUser.username || '').toLowerCase().trim();
    const cleanUserRole = (currentUser.role_name || '').toLowerCase().trim();

    // Collect all active projects
    let allProjectsList: Project[] = [];
    if (propProjects && propProjects.length > 0) {
      allProjectsList = propProjects;
    } else {
      try {
        const raw = localStorage.getItem('booshnam_projects_v2');
        if (raw) allProjectsList = JSON.parse(raw);
      } catch (e) {}
    }

    const pendingTasksList: TodayTaskItem[] = [];
    let completedCount = 0;
    let overdueTasksCount = 0;
    let todayDueTasksCount = 0;

    allProjectsList.forEach(proj => {
      if (!proj || !proj.id) return;
      const pid = proj.id;
      const projTitle = formatProjectTitle(proj);

      // Check if user is in project's assigned team
      const team = Array.isArray(proj.assigned_team) ? proj.assigned_team : [];
      const userInTeam = team.find(m => {
        const mName = (m.name || '').toLowerCase().trim();
        return mName === cleanUserName || mName.includes(cleanUserName) || cleanUserName.includes(mName);
      });
      const userTeamRole = (userInTeam?.role || '').toLowerCase().trim();

      // Read tasks for this project
      let tasksList: WBSTask[] = [];
      try {
        const rawTasks = localStorage.getItem(`booshnam_wbs_tasks_v2_${pid}`) || 
                         localStorage.getItem(`booshnam_wbs_tasks_v10_${pid}`);
        if (rawTasks) tasksList = JSON.parse(rawTasks);
      } catch (e) {}

      if (!Array.isArray(tasksList)) return;

      tasksList.forEach(t => {
        // 1. Check if assigned to this user
        const aName = (t.assigned_to_name || t.assigned_to || '').toLowerCase().trim();
        const teamAssignees = Array.isArray(t.assigned_team) 
          ? t.assigned_team.map(m => (m.name || '').toLowerCase().trim()) 
          : [];

        let isAssigned = false;
        if (cleanUserName) {
          if (aName === cleanUserName || aName.includes(cleanUserName) || cleanUserName.includes(aName)) {
            isAssigned = true;
          } else if (teamAssignees.some(m => m === cleanUserName || m.includes(cleanUserName) || cleanUserName.includes(m))) {
            isAssigned = true;
          }
        }

        // If assigned by role (e.g. "Site Engineer") and user has that role in this project or company
        if (!isAssigned) {
          if (userInTeam && userTeamRole && (aName === userTeamRole || aName.includes(userTeamRole) || userTeamRole.includes(aName))) {
            isAssigned = true;
          } else if (userInTeam && cleanUserRole && (aName === cleanUserRole || aName.includes(cleanUserRole) || cleanUserRole.includes(aName))) {
            isAssigned = true;
          }
        }

        if (!isAssigned) return;

        // 2. Dates
        const startDate = t.start_date || t.planned_start || '';
        const endDate = t.end_date || t.planned_end || '';
        const assignDate = (t as any).assignment_date || '';

        const targetDate = endDate || assignDate || startDate || '';
        const activationDate = startDate || assignDate || endDate || '';

        // If task is purely scheduled for the future, skip it
        if (activationDate > todayStr && targetDate > todayStr) return;

        // 3. Check status
        const isCompleted = t.status === 'COMPLETED' || (typeof t.progress_percentage === 'number' && t.progress_percentage >= 100);

        if (isCompleted) {
          const completedAtDate = (t.completed_at || '').substring(0, 10);
          if (completedAtDate === todayStr || targetDate === todayStr || assignDate === todayStr || !completedAtDate) {
            completedCount++;
          }
        } else {
          // Task is incomplete and assigned for past or today
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
          } else if (assignDate && assignDate < todayStr && (!endDate || endDate <= todayStr)) {
            isOverdue = true;
            try {
              const refTime = new Date(`${(endDate || assignDate).slice(0, 10)}T00:00:00`).getTime();
              const todayTime = new Date(`${todayStr}T00:00:00`).getTime();
              daysOverdue = Math.max(1, Math.floor((todayTime - refTime) / (1000 * 60 * 60 * 24)));
            } catch {
              daysOverdue = 1;
            }
          }

          if (isOverdue) {
            overdueTasksCount++;
          } else {
            todayDueTasksCount++;
          }

          pendingTasksList.push({
            ...t,
            projectName: projTitle,
            projectCode: proj.code,
            projectDept: proj.department_name || (proj.department as string),
            projectId: pid,
            isOverdue,
            daysOverdue,
            assignedDateStr: assignDate || startDate || targetDate
          });
        }
      });
    });

    // Sort: overdue tasks first (highest days overdue at the top), then today's tasks
    pendingTasksList.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      if (a.isOverdue && b.isOverdue) {
        return (b.daysOverdue || 0) - (a.daysOverdue || 0);
      }
      return 0;
    });

    return { 
      todayTasks: pendingTasksList, 
      overdueCount: overdueTasksCount, 
      todayDueCount: todayDueTasksCount, 
      completedTodayCount: completedCount 
    };
  }, [isSuperAdmin, currentUser, propProjects, todayStr, refreshTrigger]);

  // Handle Mark In Progress
  const handleStartTask = useCallback((task: TodayTaskItem) => {
    try {
      const key = `booshnam_wbs_tasks_v2_${task.projectId}`;
      const raw = localStorage.getItem(key) || localStorage.getItem(`booshnam_wbs_tasks_v10_${task.projectId}`);
      if (raw) {
        const list: WBSTask[] = JSON.parse(raw);
        const updated = list.map(t => {
          if (t.id === task.id) {
            return { ...t, status: 'IN_PROGRESS' as const, progress_percentage: t.progress_percentage || 25 };
          }
          return t;
        });
        localStorage.setItem(key, JSON.stringify(updated));
        if (localStorage.getItem(`booshnam_wbs_tasks_v10_${task.projectId}`)) {
          localStorage.setItem(`booshnam_wbs_tasks_v10_${task.projectId}`, JSON.stringify(updated));
        }
        window.dispatchEvent(new Event('booshnam_wbs_tasks_updated'));
        onShowToast?.(`Task "${task.title || task.name}" is now In Progress.`);
      }
    } catch (e) {
      console.error('Failed to update task status', e);
    }
  }, [onShowToast]);

  // Handle Mark Complete
  // Once marked as completed, task immediately disappears from pending task reminders!
  const handleCompleteTask = useCallback((task: TodayTaskItem) => {
    try {
      const key = `booshnam_wbs_tasks_v2_${task.projectId}`;
      const raw = localStorage.getItem(key) || localStorage.getItem(`booshnam_wbs_tasks_v10_${task.projectId}`);
      if (raw) {
        const list: WBSTask[] = JSON.parse(raw);
        const nowIso = new Date().toISOString();
        const updated = list.map(t => {
          if (t.id === task.id) {
            return { 
              ...t, 
              status: 'COMPLETED' as const, 
              progress_percentage: 100,
              completed_at: nowIso,
              completed_by: currentUser?.staff_name || currentUser?.username || 'Staff'
            };
          }
          return t;
        });
        localStorage.setItem(key, JSON.stringify(updated));
        if (localStorage.getItem(`booshnam_wbs_tasks_v10_${task.projectId}`)) {
          localStorage.setItem(`booshnam_wbs_tasks_v10_${task.projectId}`, JSON.stringify(updated));
        }

        // Trigger notifications sync to immediately update or remove the reminder notification
        syncTodayTasksReminderNotifications();

        window.dispatchEvent(new Event('booshnam_wbs_tasks_updated'));
        window.dispatchEvent(new Event('booshnam_projects_updated'));
        window.dispatchEvent(new CustomEvent('siteops_notifications_updated'));

        onShowToast?.(`Great job! Marked "${task.title || task.name}" as Completed.`);
      }
    } catch (e) {
      console.error('Failed to complete task', e);
    }
  }, [currentUser, onShowToast]);

  // Handle Open Project
  const handleOpenProject = useCallback((task: TodayTaskItem) => {
    let allProjectsList: Project[] = propProjects || [];
    if (allProjectsList.length === 0) {
      try {
        const raw = localStorage.getItem('booshnam_projects_v2');
        if (raw) allProjectsList = JSON.parse(raw);
      } catch (e) {}
    }
    const targetProj = allProjectsList.find(p => p.id === task.projectId);
    if (targetProj) {
      sessionStorage.setItem('booshnam_auto_open_project_id', targetProj.id);
      onSelectProject?.(targetProj);
      onNavigate?.('projects');
    }
  }, [propProjects, onSelectProject, onNavigate]);

  // Filter tasks based on active filter tab
  const filteredTasks = useMemo(() => {
    if (activeFilter === 'overdue') {
      return todayTasks.filter(t => t.isOverdue);
    }
    if (activeFilter === 'today') {
      return todayTasks.filter(t => !t.isOverdue);
    }
    return todayTasks;
  }, [todayTasks, activeFilter]);

  // If Super Admin, or no tasks scheduled today and none completed: return null
  if (isSuperAdmin || !currentUser) {
    return null;
  }

  // If no pending tasks and none completed, don't show banner
  if (todayTasks.length === 0 && completedTodayCount === 0) {
    return null;
  }

  // If all tasks completed and user dismissed the congratulatory card
  if (todayTasks.length === 0 && isCompletedDismissed) {
    return null;
  }

  return (
    <div className="w-full bg-white rounded-2xl border border-red-200/90 shadow-md shadow-red-500/5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
      
      {/* ── HEADER NOTIFICATION BANNER BAR ── */}
      <div className={`px-5 py-4 flex items-center justify-between gap-4 text-white ${
        overdueCount > 0 
          ? 'bg-gradient-to-r from-red-600 via-rose-600 to-rose-700' 
          : 'bg-gradient-to-r from-red-600 via-rose-600 to-rose-700'
      }`}>
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-inner">
            {overdueCount > 0 ? (
              <AlertTriangle className="w-5 h-5 text-amber-200 animate-pulse" />
            ) : (
              <Calendar className="w-5 h-5 text-white animate-pulse" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              {overdueCount > 0 ? (
                <span className="text-[10px] uppercase tracking-wider font-extrabold bg-amber-400 text-amber-950 px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>Pending Tasks Reminder</span>
                </span>
              ) : (
                <span className="text-[10px] uppercase tracking-wider font-extrabold bg-white/20 px-2 py-0.5 rounded text-white">
                  Today's Tasks
                </span>
              )}

              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight truncate">
                {todayTasks.length > 0 ? (
                  overdueCount > 0 && todayDueCount > 0 ? (
                    `You have ${todayTasks.length} pending tasks (${overdueCount} overdue, ${todayDueCount} due today) needing completion`
                  ) : overdueCount > 0 ? (
                    `You have ${overdueCount} pending ${overdueCount === 1 ? 'task' : 'tasks'} not completed on assigned date`
                  ) : (
                    `You have ${todayDueCount} ${todayDueCount === 1 ? 'task' : 'tasks'} scheduled for completion today`
                  )
                ) : (
                  'All assigned & pending tasks completed!'
                )}
              </h2>
            </div>
            
            <p className="text-xs text-white/85 mt-0.5 truncate flex items-center gap-2">
              <span>{formattedTodayLabel}</span>
              <span>•</span>
              <span>Assigned to: <strong>{currentUser.staff_name || currentUser.username}</strong> ({currentUser.role_name})</span>
              <span className="hidden md:inline">• Incomplete tasks continue to appear daily until completed</span>
            </p>
          </div>
        </div>

        {/* Right Action Icons: Count Badges & Collapse/Expand */}
        <div className="flex items-center gap-2 shrink-0">
          {todayTasks.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5">
              {overdueCount > 0 && (
                <span className="text-xs font-black bg-amber-300 text-amber-950 px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-700 animate-ping inline-block" />
                  <span>{overdueCount} Overdue</span>
                </span>
              )}
              <span className="text-xs font-black bg-white text-red-700 px-3 py-1 rounded-full shadow-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping inline-block" />
                <span>{todayTasks.length} Pending</span>
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed(prev => !prev)}
            className="p-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold"
            title={isCollapsed ? 'Expand tasks' : 'Collapse tasks'}
          >
            {isCollapsed ? (
              <>
                <span className="hidden sm:inline">View Tasks</span>
                <ChevronDown className="w-4 h-4" />
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Hide</span>
                <ChevronUp className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── EXPANDABLE TASKS LIST CONTENT ── */}
      {!isCollapsed && (
        <div className="p-5 bg-gradient-to-b from-slate-50/70 to-white space-y-4">
          
          {/* Summary status text & Filter Tabs */}
          <div className="flex items-center justify-between gap-3 text-xs text-slate-500 border-b border-slate-100 pb-2.5 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-700">
                Tasks requiring your completion:
              </span>

              {/* Filter tabs if both overdue and today tasks exist */}
              {todayTasks.length > 0 && overdueCount > 0 && todayDueCount > 0 && (
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px]">
                  <button
                    type="button"
                    onClick={() => setActiveFilter('all')}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                      activeFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    All ({todayTasks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('overdue')}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                      activeFilter === 'overdue'
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'text-rose-600 hover:bg-rose-50'
                    }`}
                  >
                    <span>Overdue</span>
                    <span className="text-[10px] bg-rose-200/50 text-rose-900 px-1 rounded-full">{overdueCount}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('today')}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                      activeFilter === 'today'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    Due Today ({todayDueCount})
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span>
                Completed: <strong className="text-emerald-600 font-bold">{completedTodayCount}</strong>
              </span>
            </div>
          </div>

          {/* If all tasks completed */}
          {todayTasks.length === 0 ? (
            <div className="p-6 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0 shadow-inner">
                  <CheckCheck className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-bold text-emerald-900">
                    All assigned & pending tasks completed!
                  </h3>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Great job, {currentUser.staff_name || currentUser.username}. You have no pending tasks remaining. Reminders have been automatically cleared.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCompletedDismissed(true)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-emerald-100/50 transition-all cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Active Pending Tasks Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredTasks.map((task) => {
                const priorityColor = 
                  task.priority === 'URGENT' ? 'bg-rose-100 text-rose-700 border-rose-200' :
                  task.priority === 'HIGH' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                  task.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                  'bg-slate-100 text-slate-600 border-slate-200';

                const isProgressing = task.status === 'IN_PROGRESS';

                return (
                  <div
                    key={task.id}
                    className={`p-4 bg-white rounded-2xl border transition-all flex flex-col justify-between gap-3 group shadow-2xs ${
                      task.isOverdue 
                        ? 'border-rose-200 bg-gradient-to-br from-rose-50/30 via-white to-white hover:border-rose-400 hover:shadow-xs' 
                        : 'border-slate-200/90 hover:border-red-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="space-y-2">
                      {/* Project Tag & Priority Row */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[150px]">
                            {task.projectName}
                          </span>
                          {task.projectCode && (
                            <span className="text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200/60 px-1.5 py-0.2 rounded">
                              {task.projectCode}
                            </span>
                          )}
                          {task.wbs_code && (
                            <span className="text-[10px] font-mono text-slate-400">
                              #{task.wbs_code}
                            </span>
                          )}
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${priorityColor}`}>
                          {task.priority || 'MEDIUM'}
                        </span>
                      </div>

                      {/* Task Title */}
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-red-600 transition-colors line-clamp-2 leading-snug">
                        {task.title || task.name}
                      </h4>

                      {/* Overdue / Due status badge banner */}
                      {task.isOverdue ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200/80 text-rose-700 text-[11px] font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600 animate-pulse" />
                          <span>Overdue by {task.daysOverdue} {task.daysOverdue === 1 ? 'day' : 'days'} • Needs Completion</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-700 text-[11px] font-bold">
                          <Clock className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                          <span>Scheduled for Today • Due Today</span>
                        </div>
                      )}

                      {/* Schedule and status details */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                        {task.assignedDateStr && (
                          <span className="font-medium text-slate-600">
                            Assigned: <strong className="text-slate-800">{task.assignedDateStr}</strong>
                          </span>
                        )}
                        <span>•</span>
                        <span className={`font-semibold ${isProgressing ? 'text-amber-600' : 'text-slate-500'}`}>
                          Status: {isProgressing ? 'In Progress' : 'Pending'}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleOpenProject(task)}
                        className="text-[11px] font-semibold text-slate-600 hover:text-red-600 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>View in Project</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>

                      <div className="flex items-center gap-1.5">
                        {!isProgressing && (
                          <button
                            type="button"
                            onClick={() => handleStartTask(task)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-700 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                            title="Start Task"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>Start</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleCompleteTask(task)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Mark Complete & Remove from Reminders"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Complete</span>
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}
    </div>
  );
};
