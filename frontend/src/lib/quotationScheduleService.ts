import { WBSTask, Project } from '../types';
import { QuotationScheduleTask } from './timesheetService';
export type { QuotationScheduleTask };

const QUOTATION_SCHEDULE_STORAGE_KEY = 'booshnam_quotation_schedule_tasks_v3';

// Default realistic sample quotation tasks matching user image exactly
export const DEFAULT_QUOTATION_SCHEDULE_TASKS: QuotationScheduleTask[] = [
  {
    id: 'q-task-01',
    task_name: 'Quotation',
    project_id: 'proj-01',
    project_name: 'Project',
    assignee: 'Sunil Kumar',
    status: 'NOT_STARTED',
    start_date: '2026-09-10',
    end_date: '2026-09-10',
    milestone_date: '10 Sep',
    stage_label: 'Send Quotation',
    color_theme: 'red',
    duration_days: 1,
    progress_percentage: 0,
    remarks: 'Send finalized commercial quotation to client.',
    group_name: 'Unassigned'
  },
  {
    id: 'q-task-02',
    task_name: 'Collect Client Details',
    project_id: 'proj-02',
    project_name: 'Project',
    assignee: 'Sunil Kumar',
    status: 'NOT_STARTED',
    start_date: '2026-09-15',
    end_date: '2026-09-15',
    milestone_date: '15 Sep',
    stage_label: 'Collect Details',
    color_theme: 'red',
    duration_days: 1,
    progress_percentage: 0,
    remarks: 'Collect site measurements and client requirements.',
    group_name: 'Unassigned'
  },
  {
    id: 'q-task-03',
    task_name: 'Quotation',
    project_id: 'proj-03',
    project_name: 'Navalur Residential Enclave',
    assignee: 'Dasari Uma Sridevi',
    status: 'NOT_STARTED',
    start_date: '2026-06-10',
    end_date: '2026-06-10',
    milestone_date: '10 Jun',
    stage_label: 'Prepare Quotation',
    color_theme: 'blue',
    duration_days: 1,
    progress_percentage: 0,
    remarks: 'Prepare BOQ quotation drafts.',
    group_name: 'Unassigned'
  },
  {
    id: 'q-task-04',
    task_name: 'Quotation',
    project_id: 'proj-04',
    project_name: 'Tambaram Commercial Hub',
    assignee: 'Dasari Uma Sridevi',
    status: 'NOT_STARTED',
    start_date: '2026-06-18',
    end_date: '2026-06-18',
    milestone_date: '18 Jun',
    stage_label: 'Client Meeting',
    color_theme: 'green',
    duration_days: 1,
    progress_percentage: 0,
    remarks: 'Client consultation & scope agreement.',
    group_name: 'Unassigned'
  },
  {
    id: 'q-task-05',
    task_name: 'Quotation',
    project_id: 'proj-05',
    project_name: 'Medavakkam Villa Plots',
    assignee: 'Sunil Kumar',
    status: 'NOT_STARTED',
    start_date: '2026-07-12',
    end_date: '2026-07-12',
    milestone_date: '12 Jul',
    stage_label: 'Follow Up',
    color_theme: 'orange',
    duration_days: 1,
    progress_percentage: 0,
    remarks: 'Commercial negotiation follow up with client.',
    group_name: 'Unassigned'
  },
  {
    id: 'q-task-06',
    task_name: 'Quotation',
    project_id: 'proj-06',
    project_name: 'Velachery Tech Park Extension',
    assignee: 'Nivedhitha Arumugam',
    status: 'NOT_STARTED',
    start_date: '2026-05-20',
    end_date: '2026-05-20',
    milestone_date: '20 May',
    stage_label: 'Review & Update',
    color_theme: 'red',
    duration_days: 1,
    progress_percentage: 0,
    remarks: 'Review site rate deviations and revision.',
    group_name: 'Unassigned'
  },
  {
    id: 'q-task-07',
    task_name: 'Quotation',
    project_id: 'proj-07',
    project_name: 'Guindy Industrial Shed',
    assignee: 'Sunil Kumar',
    status: 'NOT_STARTED',
    start_date: '2026-05-28',
    end_date: '2026-05-28',
    milestone_date: '28 May',
    stage_label: 'Client Discussion',
    color_theme: 'blue',
    duration_days: 1,
    progress_percentage: 0,
    remarks: 'Structural steel quote technical discussion.',
    group_name: 'Unassigned'
  },
  {
    id: 'q-task-08',
    task_name: 'Quotation',
    project_id: 'proj-08',
    project_name: 'Chromepet IT Complex',
    assignee: 'Sunil Kumar',
    status: 'NOT_STARTED',
    start_date: '2026-07-26',
    end_date: '2026-07-26',
    milestone_date: '26 Jul',
    stage_label: 'Final Submission',
    color_theme: 'purple',
    duration_days: 1,
    progress_percentage: 0,
    remarks: 'Final submission of quotation package.',
    group_name: 'Unassigned'
  }
];

// Load quotation tasks, merging with any live project tasks matching "Quotation"
export function getQuotationScheduleTasks(projects: Project[] = []): QuotationScheduleTask[] {
  let stored: QuotationScheduleTask[] = [];
  try {
    const raw = localStorage.getItem(QUOTATION_SCHEDULE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        stored = parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load quotation schedule tasks', e);
  }

  if (stored.length === 0) {
    stored = [...DEFAULT_QUOTATION_SCHEDULE_TASKS];
    try {
      localStorage.setItem(QUOTATION_SCHEDULE_STORAGE_KEY, JSON.stringify(stored));
    } catch (e) {}
  }

  // 1. Gather all projects from passed props, localStorage booshnam_projects_v2, and storage keys
  const allProjectsMap = new Map<string, Project>();
  projects.forEach(p => { if (p?.id) allProjectsMap.set(p.id, p); });
  try {
    const rawProjs = localStorage.getItem('booshnam_projects_v2');
    if (rawProjs) {
      const parsedProjs: Project[] = JSON.parse(rawProjs);
      if (Array.isArray(parsedProjs)) {
        parsedProjs.forEach(p => { if (p?.id && !allProjectsMap.has(p.id)) allProjectsMap.set(p.id, p); });
      }
    }
  } catch (e) {}

  // Also collect any project IDs from booshnam_wbs_tasks_v2_* keys
  const projectIds = new Set<string>(allProjectsMap.keys());
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('booshnam_wbs_tasks_v2_')) {
        const pid = k.replace('booshnam_wbs_tasks_v2_', '');
        if (pid) projectIds.add(pid);
      }
    }
  } catch (e) {}

  // 2. Scan live project tasks from localStorage for each project
  const projectTasks: QuotationScheduleTask[] = [];
  projectIds.forEach(pid => {
    try {
      const p = allProjectsMap.get(pid);
      const pName = p?.name || 'Project';
      const key = `booshnam_wbs_tasks_v2_${pid}`;
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const tasks: WBSTask[] = JSON.parse(raw);
      if (!Array.isArray(tasks)) return;

      // Also read extra metadata if available
      let taskMetaMap: Record<string, any> = {};
      try {
        const rawMeta = localStorage.getItem(`booshnam_task_meta_${pid}`);
        if (rawMeta) taskMetaMap = JSON.parse(rawMeta);
      } catch (e) {}

      tasks.forEach(t => {
        const titleLower = (t.title || '').toLowerCase();
        const tagLower = (t.tag || '').toLowerCase();
        const isQuotation = 
          titleLower.includes('quot') || 
          tagLower.includes('quot') || 
          titleLower.includes('scope') ||
          t.department === 'MARKETING';

        if (isQuotation) {
          const meta = taskMetaMap[t.id] || {};
          
          // Image resolution: priority is completion_proof_url, then meta progress proof_url, then fallback
          const proofImage = t.completion_proof_url || 
            meta.progressUpdates?.find((u: any) => u.proof_url)?.proof_url || 
            (t as any).image_url || 
            undefined;

          const progressUpdatesList = meta.progressUpdates || (t.status === 'COMPLETED' ? [
            {
              id: `prog-${t.id}`,
              user: t.completed_by || t.assigned_to_name || 'Dasari Uma Sridevi',
              amount: t.progress_label || `${t.progress_percentage || 100}%`,
              date: t.completed_at || t.end_date || 'Recent',
              note: t.completion_remarks || t.description || 'Quotation completed.',
              proof_url: proofImage
            }
          ] : []);

          const extractedTask: QuotationScheduleTask = {
            id: `proj-task-${t.id}`,
            wbs_task_id: t.id,
            task_name: t.title || 'Quotation',
            project_id: pid,
            project_name: pName,
            assignee: t.assigned_to_name || t.assigned_to || (t.assigned_team && t.assigned_team[0]?.name) || 'Staff',
            status: t.status === 'COMPLETED' ? 'COMPLETED' : t.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'PENDING',
            start_date: t.start_date || p?.start_date || new Date().toISOString().split('T')[0],
            end_date: (t.status === 'COMPLETED' && t.actual_end) ? t.actual_end.substring(0, 10) : (t.end_date || new Date().toISOString().split('T')[0]),
            actual_start: t.actual_start || t.start_date,
            actual_end: t.actual_end || (t.status === 'COMPLETED' ? (t.end_date || 'Completed') : undefined),
            forecast_end: t.forecast_end || t.end_date,
            completed_at: t.status === 'COMPLETED' ? (t.completed_at || (t.actual_end ? `${t.actual_end}, 05:00 PM` : 'Completed')) : undefined,
            milestone_date: (t.status === 'COMPLETED' && (t.actual_end || t.completed_at))
              ? new Date(t.actual_end || t.completed_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
              : (t.start_date || p?.start_date)
              ? new Date(t.start_date || p?.start_date || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
              : '05 Oct',
            stage_label: t.status === 'COMPLETED' ? 'Completed' : t.status === 'IN_PROGRESS' ? 'Ongoing' : 'Prepare Quotation',
            color_theme: t.status === 'COMPLETED' ? 'green' : t.status === 'IN_PROGRESS' ? 'blue' : 'red',
            duration_days: t.duration_days || 1,
            progress_percentage: t.progress_percentage !== undefined ? t.progress_percentage : (t.status === 'COMPLETED' ? 100 : 0),
            remarks: t.completion_remarks || t.description || 'Project quotation milestone.',
            tag: t.tag || '--',
            group_name: pName || 'Unassigned',
            image_url: proofImage,
            progress_user: t.completed_by || meta.progressUpdates?.[0]?.user || t.assigned_to_name || 'Staff',
            progress_date: t.completed_at || meta.progressUpdates?.[0]?.date || t.end_date,
            todos: meta.todos?.map((td: any) => ({ id: td.id, text: td.text, done: Boolean(td.completed) })),
            materials: meta.materials,
            workforce: meta.workforce,
            equipment: meta.equipment,
            progressUpdates: progressUpdatesList,
            statusLogs: meta.statusLogs,
            messages: meta.messages
          };

          projectTasks.push(extractedTask);
        }
      });
    } catch (e) {}
  });

  // 3. Ensure every created project in allProjectsMap has a Quotation Task
  allProjectsMap.forEach((p, pid) => {
    const hasTaskInProject = projectTasks.some(pt => pt.project_id === pid);
    const hasTaskInStored = stored.some(st => st.project_id === pid);
    if (!hasTaskInProject && !hasTaskInStored) {
      const isCompleted = p.status === 'COMPLETED' || (p.progress_percentage !== undefined && p.progress_percentage >= 100);
      const isOngoing = p.status === 'ACTIVE' || (p.progress_percentage !== undefined && p.progress_percentage > 0);
      const sDate = p.start_date || new Date().toISOString().split('T')[0];
      const dateObj = new Date(sDate);
      const milestoneStr = isNaN(dateObj.getTime()) 
        ? '10 Oct' 
        : dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

      projectTasks.push({
        id: `proj-quotation-${pid}`,
        task_name: 'Quotation',
        project_id: pid,
        project_name: p.name || 'Project',
        assignee: (p.assigned_team && p.assigned_team[0]?.name) || 'Project Lead',
        status: isCompleted ? 'COMPLETED' : isOngoing ? 'IN_PROGRESS' : 'PENDING',
        start_date: sDate,
        end_date: sDate,
        milestone_date: milestoneStr,
        stage_label: isCompleted ? 'Completed' : isOngoing ? 'Ongoing' : 'Prepare Quotation',
        color_theme: isCompleted ? 'green' : isOngoing ? 'blue' : 'red',
        progress_percentage: isCompleted ? 100 : (p.progress_percentage || 0),
        remarks: p.description || 'Project quotation milestone.',
        group_name: 'Unassigned'
      });
    }
  });

  // 4. Combine: Live project tasks take precedence and update any stored tasks
  const combined: QuotationScheduleTask[] = [];

  // First add all live project tasks
  projectTasks.forEach(pt => {
    combined.push(pt);
  });

  // Then append any stored tasks that are not already matched by a live project task
  stored.forEach(st => {
    const isAlreadyCovered = combined.some(c => 
      c.id === st.id || 
      (c.wbs_task_id && st.wbs_task_id && c.wbs_task_id === st.wbs_task_id) ||
      (c.project_id === st.project_id && c.task_name === st.task_name)
    );
    if (!isAlreadyCovered) {
      combined.push(st);
    }
  });

  // 5. Sync each task's progress and status directly with its live project state
  combined.forEach(t => {
    if (t.project_id && allProjectsMap.has(t.project_id)) {
      const p = allProjectsMap.get(t.project_id)!;
      if (p.status === 'COMPLETED' || (p.progress_percentage !== undefined && p.progress_percentage >= 100)) {
        t.status = 'COMPLETED';
        t.progress_percentage = 100;
        t.color_theme = 'green';
        t.stage_label = 'Completed';
      } else if (p.status === 'ACTIVE' || (p.progress_percentage !== undefined && p.progress_percentage > 0)) {
        if (t.status !== 'COMPLETED') {
          t.status = 'IN_PROGRESS';
          t.progress_percentage = t.progress_percentage || p.progress_percentage || 50;
          t.color_theme = 'blue';
          t.stage_label = 'Ongoing';
        }
      }
    }
  });

  return combined;
}

export function saveQuotationScheduleTask(task: QuotationScheduleTask): QuotationScheduleTask[] {
  const current = getQuotationScheduleTasks();
  const exists = current.some(t => t.id === task.id);
  const updated = exists 
    ? current.map(t => t.id === task.id ? task : t)
    : [task, ...current];
  try {
    localStorage.setItem(QUOTATION_SCHEDULE_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('booshnam_quotation_schedule_updated', { detail: updated }));
  } catch (e) {}
  return updated;
}

export function updateQuotationTaskStatus(
  taskId: string, 
  newStatus: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'NOT_STARTED'
): QuotationScheduleTask[] {
  const current = getQuotationScheduleTasks();
  const isComp = newStatus === 'COMPLETED';
  const updated = current.map(t => {
    if (t.id === taskId) {
      return {
        ...t,
        status: newStatus,
        progress_percentage: isComp ? 100 : newStatus === 'IN_PROGRESS' ? 50 : 0,
        completed_at: isComp 
          ? (t.completed_at || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ', 04:30 PM')
          : undefined
      };
    }
    return t;
  });
  try {
    localStorage.setItem(QUOTATION_SCHEDULE_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('booshnam_quotation_schedule_updated', { detail: updated }));
  } catch (e) {}
  return updated;
}

export function addQuotationScheduleTask(taskData: Partial<QuotationScheduleTask>): QuotationScheduleTask[] {
  const current = getQuotationScheduleTasks();
  const newTask: QuotationScheduleTask = {
    id: `q-task-${Date.now()}`,
    task_name: taskData.task_name || 'Quotation',
    project_id: taskData.project_id || 'proj-01',
    project_name: taskData.project_name || 'Project',
    assignee: taskData.assignee || 'Sunil Kumar',
    status: taskData.status || 'NOT_STARTED',
    start_date: taskData.start_date || new Date().toISOString().split('T')[0],
    end_date: taskData.end_date || new Date().toISOString().split('T')[0],
    milestone_date: taskData.milestone_date || '15 Jun',
    stage_label: taskData.stage_label || 'Prepare Quotation',
    color_theme: taskData.color_theme || 'blue',
    duration_days: taskData.duration_days || 1,
    progress_percentage: taskData.status === 'COMPLETED' ? 100 : 0,
    remarks: taskData.remarks || 'Quotation milestone',
    group_name: 'Unassigned'
  };
  const updated = [...current, newTask];
  try {
    localStorage.setItem(QUOTATION_SCHEDULE_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('booshnam_quotation_schedule_updated', { detail: updated }));
  } catch (e) {}
  return updated;
}

/**
 * Two-way sync: Synchronizes updates made in the Quotation Drawer back to the Project's WBS Tasks
 * and task extra metadata so both Project -> TaskTab and Team Schedule stay 100% in sync.
 */
export function syncQuotationTaskToProject(task: QuotationScheduleTask): void {
  // 1. Update in quotation schedule storage
  saveQuotationScheduleTask(task);

  // 2. If this task belongs to a project, update the project's task list in localStorage
  if (task.project_id) {
    try {
      const taskStorageKey = `booshnam_wbs_tasks_v2_${task.project_id}`;
      const rawTasks = localStorage.getItem(taskStorageKey);
      if (rawTasks) {
        const tasks: WBSTask[] = JSON.parse(rawTasks);
        if (Array.isArray(tasks)) {
          const targetWbsId = task.wbs_task_id || task.id.replace('proj-task-', '');
          let taskFound = false;
          const updatedTasks = tasks.map(t => {
            if (t.id === targetWbsId || t.title === task.task_name) {
              taskFound = true;
              return {
                ...t,
                status: task.status === 'COMPLETED' ? ('COMPLETED' as const) : task.status === 'IN_PROGRESS' ? ('IN_PROGRESS' as const) : ('TODO' as const),
                progress_percentage: task.progress_percentage,
                progress_label: `${task.progress_percentage}/100 lumpsum`,
                completion_proof_url: task.image_url || t.completion_proof_url,
                completion_remarks: task.remarks || t.completion_remarks,
                assigned_to_name: task.assignee || t.assigned_to_name,
                duration_days: task.duration_days || t.duration_days,
                start_date: task.start_date || t.start_date,
                end_date: task.end_date || t.end_date,
                actual_start: task.actual_start || t.actual_start,
                actual_end: task.actual_end || t.actual_end,
                forecast_end: task.forecast_end || t.forecast_end,
                tag: task.tag || t.tag,
                completed_by: task.progress_user || t.completed_by,
                completed_at: task.progress_date || t.completed_at
              };
            }
            return t;
          });

          if (taskFound) {
            localStorage.setItem(taskStorageKey, JSON.stringify(updatedTasks));
          }
        }
      }

      // Update extra metadata
      const metaKey = `booshnam_task_meta_${task.project_id}`;
      const rawMeta = localStorage.getItem(metaKey);
      const metaMap: Record<string, any> = rawMeta ? JSON.parse(rawMeta) : {};
      const targetWbsId = task.wbs_task_id || task.id.replace('proj-task-', '');
      const existingTaskMeta = metaMap[targetWbsId] || {};

      metaMap[targetWbsId] = {
        ...existingTaskMeta,
        todos: task.todos || existingTaskMeta.todos,
        materials: task.materials || existingTaskMeta.materials,
        workforce: task.workforce || existingTaskMeta.workforce,
        equipment: task.equipment || existingTaskMeta.equipment,
        progressUpdates: task.progressUpdates || existingTaskMeta.progressUpdates,
        statusLogs: task.statusLogs || existingTaskMeta.statusLogs,
        messages: task.messages || existingTaskMeta.messages
      };
      localStorage.setItem(metaKey, JSON.stringify(metaMap));

      // Dispatch event to inform Project view
      window.dispatchEvent(new Event('booshnam_projects_updated'));
    } catch (e) {
      console.error('Error syncing quotation task to project', e);
    }
  }
}
