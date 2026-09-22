import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, Search, Calendar, ChevronDown, GitBranch, RefreshCw, 
  Download, MessageSquare, Clock, User, Users, Check, CheckCircle2, 
  Trash2, Edit3, MoreVertical, X, List, Flag, Layers, PlusCircle, 
  ArrowRight, ShieldCheck, Sparkles, AlertTriangle,
  Upload, FileText, Image as ImageIcon, Eye, ExternalLink, Camera
} from 'lucide-react';
import { Project, WBSTask } from '../../../types';
import { getStaffMembers } from '../../../lib/staffService';
import { addNotification } from '../../../lib/notificationService';
import { addProjectPhoto } from '../../../lib/projectPhotoUtils';
import { confirmAction, setFormDirty, clearFormDirty, confirmNavigationIfDirty } from '../../../lib/dialogService';
import { CustomSelect } from '../../CustomSelect';

interface TaskTabProps {
  project: Project;
  tasks?: WBSTask[];
  onShowToast?: (msg: string) => void;
}

const SEED_TASKS: WBSTask[] = [];

export const TaskTab: React.FC<TaskTabProps> = ({
  project,
  tasks: propTasks,
  onShowToast
}) => {
  const registeredStaff = getStaffMembers();
  const storageKey = `booshnam_wbs_tasks_v2_${project?.id || 'default'}`;

  const [taskList, setTaskList] = useState<WBSTask[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return propTasks && propTasks.length > 0 ? propTasks : SEED_TASKS;
  });

  // Save changes to localStorage and synchronize project progress
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(taskList));

      if (project?.id && Array.isArray(taskList) && taskList.length > 0) {
        const storedProjectsRaw = localStorage.getItem('booshnam_projects_v2');
        if (storedProjectsRaw) {
          const storedProjects: Project[] = JSON.parse(storedProjectsRaw);
          const total = taskList.length;
          const completed = taskList.filter(t => t.status === 'COMPLETED').length;
          const progress = Math.round((completed / total) * 100);
          const todo = Math.max(0, total - completed);
          const newStatus = progress === 100 ? 'COMPLETED' : 'ACTIVE';

          let changed = false;
          const updatedProjects = storedProjects.map(p => {
            if (p.id === project.id) {
              changed = true;
              return {
                ...p,
                progress_percentage: progress,
                tasks_count: total,
                completed_tasks_count: completed,
                todo_count: todo,
                status: newStatus
              };
            }
            return p;
          });

          if (changed) {
            localStorage.setItem('booshnam_projects_v2', JSON.stringify(updatedProjects));
            window.dispatchEvent(new Event('booshnam_projects_updated'));
          }
        }
      }
    } catch {
      // ignore
    }
  }, [taskList, storageKey, project?.id]);

  // Top bar filters (Image 1)
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'TODO'>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [tagFilter, setTagFilter] = useState<string>('ALL');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Dropdowns
  const [openDropdown, setOpenDropdown] = useState<'status' | 'assignee' | 'tag' | null>(null);

  // Modals & Drawers
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<WBSTask | null>(null);
  const [activeCommentTask, setActiveCommentTask] = useState<WBSTask | null>(null);
  const [activeDependencyTask, setActiveDependencyTask] = useState<WBSTask | null>(null);
  const [hoveredTaskTooltip, setHoveredTaskTooltip] = useState<{ id: string; x: number; y: number } | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formStartDate, setFormStartDate] = useState('2026-09-17');
  const [formEndDate, setFormEndDate] = useState('2026-09-18');
  const [formDuration, setFormDuration] = useState<number>(1);
  const [formTag, setFormTag] = useState('Field Survey');
  const [formAssigned, setFormAssigned] = useState('Pavani');
  const [formDelayStatus, setFormDelayStatus] = useState<'On Time' | '1d' | 'At Risk' | 'On Track' | 'Delayed'>('On Track');
  const [formProofUrl, setFormProofUrl] = useState<string | null>(null);
  const [formRemarks, setFormRemarks] = useState('');
  const [previewProofModal, setPreviewProofModal] = useState<string | null>(null);
  const proofFileInputRef = useRef<HTMLInputElement>(null);

  const currentUser = useMemo(() => {
    try {
      const stored = localStorage.getItem('siteops_user');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return { first_name: 'Priya', username: 'admin', role_name: 'Owner / Director', role_code: 'SUPER_ADMIN' };
  }, [isTaskDrawerOpen]);

  // New Comment input
  const [commentInput, setCommentInput] = useState('');

  // Format date helper: "17 Sep 26"
  const formatDateSnippet = (dStr?: string) => {
    if (!dStr) return '- - -';
    try {
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return dStr;
      const day = d.getDate();
      const month = d.toLocaleDateString('en-GB', { month: 'short' });
      const year = String(d.getFullYear()).slice(-2);
      return `${day} ${month} ${year}`;
    } catch {
      return dStr;
    }
  };

  // Format schedule range: "17 Sep 26 – 18 Sep 26"
  const formatScheduleRange = (start?: string, end?: string) => {
    if (!start || !end) return '- - -';
    return `${formatDateSnippet(start)} – ${formatDateSnippet(end)}`;
  };

  // Handle Proof File Change
  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormProofUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Filter tasks
  const filteredTasks = taskList.filter((item) => {
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'COMPLETED' && item.status !== 'COMPLETED') return false;
      if (statusFilter === 'IN_PROGRESS' && item.status !== 'IN_PROGRESS') return false;
      if (statusFilter === 'TODO' && item.status !== 'TODO') return false;
    }

    if (assigneeFilter !== 'ALL') {
      const teamMatch = item.assigned_team?.some(m => m.name.toLowerCase().includes(assigneeFilter.toLowerCase()) || m.initials.toLowerCase() === assigneeFilter.toLowerCase());
      const nameMatch = (item.assigned_to_name || item.assigned_to || '').toLowerCase().includes(assigneeFilter.toLowerCase());
      if (!teamMatch && !nameMatch) return false;
    }

    if (tagFilter !== 'ALL' && item.tag !== tagFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchAssignee = (item.assigned_to_name || item.assigned_to || '').toLowerCase().includes(q) || false;
      const matchTag = item.tag?.toLowerCase().includes(q) || false;
      if (!matchTitle && !matchAssignee && !matchTag) return false;
    }

    if (startDateFilter && item.start_date < startDateFilter) return false;
    if (endDateFilter && item.end_date > endDateFilter) return false;

    return true;
  });

  // Toggle task status (Image 1: Start -> Completed -> Reopen)
  const handleToggleStatus = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTaskList((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const isDone = t.status === 'COMPLETED';
          const nextStatus = isDone ? 'TODO' : 'COMPLETED';
          const nextProgress = isDone ? 0 : 100;
          const nextActual = isDone ? '' : t.end_date;
          const nextDelay = isDone ? 'At Risk' : 'On Time';
          onShowToast?.(isDone ? `Reopened task: "${t.title}"` : `Completed task: "${t.title}"`);
          return {
            ...t,
            status: nextStatus,
            progress_percentage: nextProgress,
            progress_label: isDone ? '0/1 lumpsum' : '1/1 lumpsum',
            actual_start: isDone ? '' : t.start_date,
            actual_end: nextActual,
            delay_status: nextDelay
          };
        }
        return t;
      })
    );
  };

  // Open Drawer for Create
  const handleOpenCreate = () => {
    setEditingTask(null);
    setFormTitle('');
    setFormStartDate('2026-09-17');
    setFormEndDate('2026-09-18');
    setFormDuration(1);
    setFormTag('Field Survey');
    setFormAssigned('Pavani');
    setFormDelayStatus('On Track');
    setFormProofUrl(null);
    setFormRemarks('');
    setIsTaskDrawerOpen(true);
  };

  // Open Drawer for Edit
  const handleOpenEdit = (t: WBSTask) => {
    setEditingTask(t);
    setFormTitle(t.title);
    setFormStartDate(t.start_date || '2026-09-17');
    setFormEndDate(t.end_date || '2026-09-18');
    setFormDuration(t.duration_days || 1);
    setFormTag(t.tag || 'Field Survey');
    setFormAssigned(t.assigned_to_name || 'Pavani');
    setFormDelayStatus(t.delay_status || 'On Track');
    setFormProofUrl(t.completion_proof_url || null);
    setFormRemarks(t.completion_remarks || '');
    setIsTaskDrawerOpen(true);
  };

  // Dirty state tracking for Task Drawer
  useEffect(() => {
    if (!isTaskDrawerOpen) {
      clearFormDirty();
      return;
    }
    const isDirty = Boolean(
      (formTitle.trim() && formTitle.trim() !== (editingTask?.title || '')) ||
      (formRemarks.trim() && formRemarks.trim() !== (editingTask?.completion_remarks || '')) ||
      formProofUrl !== (editingTask?.completion_proof_url || null)
    );
    if (isDirty) {
      setFormDirty(true, 'Task form');
    } else {
      clearFormDirty();
    }
    return () => {
      clearFormDirty();
    };
  }, [isTaskDrawerOpen, formTitle, formRemarks, formProofUrl, editingTask]);

  const handleCloseTaskDrawer = async () => {
    const canLeave = await confirmNavigationIfDirty();
    if (canLeave) {
      clearFormDirty();
      setIsTaskDrawerOpen(false);
      setEditingTask(null);
    }
  };

  // Complete Task with Proof Handler
  const handleCompleteTaskWithProof = async () => {
    if (!editingTask) return;
    const confirmed = await confirmAction({
      title: 'Complete Task',
      message: `Are you sure you want to mark task "${formTitle.trim() || editingTask.title}" as Completed?`,
      confirmText: 'Complete Task',
      cancelText: 'Cancel',
      variant: 'primary',
      icon: 'info'
    });
    if (!confirmed) return;

    clearFormDirty();
    const completedAtStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const completedByStr = currentUser.first_name || currentUser.username || formAssigned || 'Staff';

    const updatedTask: WBSTask = {
      ...editingTask,
      title: formTitle.trim(),
      start_date: formStartDate,
      end_date: formEndDate,
      duration_days: formDuration,
      tag: formTag,
      assigned_to_name: formAssigned,
      delay_status: 'On Time',
      status: 'COMPLETED',
      progress_percentage: 100,
      progress_label: '1/1 lumpsum',
      actual_end: formEndDate || completedAtStr,
      completion_proof_url: formProofUrl || undefined,
      completion_remarks: formRemarks.trim() || undefined,
      completed_by: completedByStr,
      completed_at: completedAtStr
    };

    setTaskList(prev => prev.map(t => t.id === editingTask.id ? updatedTask : t));

    // 1. Sync proof image to Centralized Project Photos on Dashboard
    if (formProofUrl) {
      addProjectPhoto(project.id || project.code, {
        url: formProofUrl,
        title: `Task Proof: ${updatedTask.title}`,
        source: 'Task',
        category: updatedTask.tag || 'Execution',
        details: `Completed by ${completedByStr} on ${completedAtStr}. Remarks: ${formRemarks || 'Completed'}`
      });
    }

    // 2. Dispatch Notification to Project Creator & Admin
    addNotification({
      title: `Task Completed: ${updatedTask.title}`,
      message: `${completedByStr} completed task "${updatedTask.title}" in project "${project.name}"${formProofUrl ? ' with proof attachment.' : '.'}`,
      type: 'TASK_COMPLETED',
      recipient: 'ADMIN',
      sender: completedByStr,
      projectName: project.name,
      projectId: project.id,
      taskName: updatedTask.title,
      proofUrl: formProofUrl || undefined
    });

    onShowToast?.(`Task "${updatedTask.title}" marked as Completed with proof!`);
    setIsTaskDrawerOpen(false);
  };

  // Reopen Completed Task
  const handleReopenTask = async () => {
    if (!editingTask) return;
    const confirmed = await confirmAction({
      title: 'Reopen Task',
      message: `Are you sure you want to reopen task "${editingTask.title}"?`,
      confirmText: 'Reopen Task',
      cancelText: 'Cancel',
      variant: 'warning',
      icon: 'info'
    });
    if (!confirmed) return;

    const reopened: WBSTask = {
      ...editingTask,
      status: 'IN_PROGRESS',
      progress_percentage: 50,
      progress_label: '0/1 lumpsum',
      actual_end: ''
    };
    setTaskList(prev => prev.map(t => t.id === editingTask.id ? reopened : t));
    onShowToast?.(`Task "${editingTask.title}" reopened`);
    setIsTaskDrawerOpen(false);
  };

  // Save Task (Create or Update)
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      onShowToast?.('Please enter a Task Name');
      return;
    }

    const confirmed = await confirmAction({
      title: editingTask ? 'Update Task' : 'Save Task',
      message: editingTask 
        ? `Are you sure you want to update task "${formTitle.trim()}"?`
        : `Are you sure you want to save and assign task "${formTitle.trim()}" to ${formAssigned}?`,
      confirmText: editingTask ? 'Update Task' : 'Save Task',
      cancelText: 'Cancel',
      variant: 'primary',
      icon: 'info'
    });
    if (!confirmed) return;

    clearFormDirty();

    if (editingTask) {
      const prevAssignee = editingTask.assigned_to_name;
      const isNewAssignee = formAssigned && formAssigned !== prevAssignee;

      setTaskList((prev) =>
        prev.map((t) => {
          if (t.id === editingTask.id) {
            return {
              ...t,
              title: formTitle.trim(),
              start_date: formStartDate,
              end_date: formEndDate,
              duration_days: formDuration,
              tag: formTag,
              assigned_to_name: formAssigned,
              delay_status: formDelayStatus,
              completion_proof_url: formProofUrl || t.completion_proof_url,
              completion_remarks: formRemarks.trim() || t.completion_remarks
            };
          }
          return t;
        })
      );

      if (isNewAssignee) {
        addNotification({
          title: 'Task Assigned to You',
          message: `Task "${formTitle.trim()}" assigned to you in project "${project.name}".`,
          type: 'TASK_ASSIGNED',
          recipient: formAssigned,
          sender: currentUser.first_name || 'Admin',
          projectName: project.name,
          projectId: project.id,
          taskName: formTitle.trim()
        });
      }

      onShowToast?.(`Task updated: "${formTitle}"`);
    } else {
      const nextNo = taskList.length + 1;
      const newTask: WBSTask = {
        id: `tsk-${Date.now()}`,
        s_no: nextNo,
        project: project.id,
        title: formTitle.trim(),
        wbs_code: `1.${nextNo}`,
        created_by: currentUser.first_name || 'Admin',
        created_date: new Date().toLocaleDateString('en-GB'),
        start_date: formStartDate,
        end_date: formEndDate,
        actual_start: '',
        actual_end: '',
        forecast_end: 'Insufficient data',
        duration_days: formDuration,
        progress_percentage: 0,
        progress_label: '0/1 lumpsum',
        comments_count: 0,
        status: 'TODO',
        delay_status: formDelayStatus,
        is_milestone: false,
        assigned_to_name: formAssigned,
        assigned_team: [{ name: formAssigned, initials: formAssigned.slice(0, 2).toUpperCase() }],
        dependencies: [],
        tag: formTag,
        completion_proof_url: formProofUrl || undefined,
        completion_remarks: formRemarks.trim() || undefined
      };

      setTaskList((prev) => [...prev, newTask]);

      if (formAssigned) {
        addNotification({
          title: 'New Task Assigned',
          message: `Task "${newTask.title}" assigned to you in project "${project.name}".`,
          type: 'TASK_ASSIGNED',
          recipient: formAssigned,
          sender: currentUser.first_name || 'Admin',
          projectName: project.name,
          projectId: project.id,
          taskName: newTask.title
        });
      }

      onShowToast?.(`Task added: "${newTask.title}"`);
    }

    setIsTaskDrawerOpen(false);
  };

  // Delete task
  const handleDeleteTask = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const taskItem = taskList.find(t => t.id === id);
    const confirmed = await confirmAction({
      title: 'Delete Task',
      message: `Are you sure you want to delete task "${taskItem?.title || 'this task'}"?\nAny task dependencies and logs linked to this task will be removed.`,
      confirmText: 'Delete Task',
      cancelText: 'Cancel',
      variant: 'danger',
      icon: 'trash'
    });
    if (!confirmed) return;

    setTaskList((prev) => prev.filter((t) => t.id !== id));
    onShowToast?.('Task deleted');
  };

  // Add comment
  const handleAddComment = () => {
    if (!commentInput.trim() || !activeCommentTask) return;
    setTaskList((prev) =>
      prev.map((t) => {
        if (t.id === activeCommentTask.id) {
          return {
            ...t,
            comments_count: (t.comments_count || 0) + 1
          };
        }
        return t;
      })
    );
    setCommentInput('');
    onShowToast?.('Note added to task');
    setActiveCommentTask(null);
  };

  // Link dependency
  const handleLinkDependency = (predId: string) => {
    if (!activeDependencyTask) return;
    setTaskList((prev) =>
      prev.map((t) => {
        if (t.id === activeDependencyTask.id) {
          const currentDeps = t.dependencies || [];
          const exists = currentDeps.includes(predId);
          const nextDeps = exists ? currentDeps.filter((d) => d !== predId) : [...currentDeps, predId];
          return { ...t, dependencies: nextDeps };
        }
        return t;
      })
    );
    onShowToast?.('Dependency updated');
  };

  // Baseline action
  const handleCreateBaseline = () => {
    onShowToast?.('Project baseline created successfully! All schedules locked.');
  };

  // Replan action
  const handleReplan = () => {
    onShowToast?.('Recalculating critical path & forecast dates...');
  };

  // Reset demo data
  const handleResetDemoData = () => {
    setTaskList(SEED_TASKS);
    onShowToast?.('Reset demo tasks');
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-task-dropdown]')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* 1. TOP ACTION & FILTER TOOLBAR (EXACT MATCH OF IMAGE 1)                   */}
      {/* ========================================================================= */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Left Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher Icon (Image 1) */}
          <button
            type="button"
            className="w-9 h-9 border border-slate-200 hover:border-slate-300 rounded-xl flex items-center justify-center text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
            title="List View"
          >
            <List className="w-4 h-4 text-slate-700" />
          </button>

          {/* Search Icon / Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 hover:border-slate-300 rounded-xl focus:outline-none focus:border-red-600 w-36 sm:w-44 text-slate-800 placeholder-slate-400 shadow-2xs"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* All Status ▾ Dropdown Filter (Image 1) */}
          <div className="relative" data-task-dropdown>
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                statusFilter !== 'ALL'
                  ? 'bg-red-50 text-red-600 border border-red-300'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <span>{statusFilter === 'ALL' ? 'All Status' : statusFilter === 'COMPLETED' ? 'Completed' : statusFilter === 'IN_PROGRESS' ? 'In Progress' : 'Start'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {openDropdown === 'status' && (
              <div className="absolute left-0 top-full mt-1.5 w-36 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1.5 text-xs animate-in fade-in duration-100">
                {[
                  { id: 'ALL', label: 'All Status' },
                  { id: 'COMPLETED', label: 'Completed' },
                  { id: 'IN_PROGRESS', label: 'In Progress' },
                  { id: 'TODO', label: 'Start (Pending)' }
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      setStatusFilter(st.id as any);
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3.5 py-1.5 font-medium transition-colors cursor-pointer ${
                      statusFilter === st.id ? 'bg-red-50 text-red-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Assignee ▾ Dropdown Filter (Image 1) */}
          <div className="relative" data-task-dropdown>
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'assignee' ? null : 'assignee')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                assigneeFilter !== 'ALL'
                  ? 'bg-red-50 text-red-600 border border-red-300'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <span>{assigneeFilter === 'ALL' ? 'Assignee' : assigneeFilter}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {openDropdown === 'assignee' && (
              <div className="absolute left-0 top-full mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1.5 text-xs animate-in fade-in duration-100 max-h-56 overflow-y-auto">
                {['ALL', 'Pavani', 'Likson', 'Karthik', 'Suresh', 'Dinesh', 'Mohan', 'Madhan'].map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => {
                      setAssigneeFilter(a);
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3.5 py-1.5 font-medium transition-colors cursor-pointer ${
                      assigneeFilter === a ? 'bg-red-50 text-red-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {a === 'ALL' ? 'All Assignees' : a}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tag ▾ Dropdown Filter (Image 1) */}
          <div className="relative" data-task-dropdown>
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'tag' ? null : 'tag')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                tagFilter !== 'ALL'
                  ? 'bg-red-50 text-red-600 border border-red-300'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <span>{tagFilter === 'ALL' ? 'Tag' : tagFilter}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {openDropdown === 'tag' && (
              <div className="absolute left-0 top-full mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1.5 text-xs animate-in fade-in duration-100">
                {['ALL', 'Estimating', 'Field Survey', 'Client Reporting', 'Lab Testing', 'Documentation', 'QA / QC', 'Final Delivery'].map((tg) => (
                  <button
                    key={tg}
                    type="button"
                    onClick={() => {
                      setTagFilter(tg);
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3.5 py-1.5 font-medium transition-colors cursor-pointer ${
                      tagFilter === tg ? 'bg-red-50 text-red-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {tg === 'ALL' ? 'All Tags' : tg}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Create Baseline Button (Image 1 - Outlined Pill) */}
          <button
            type="button"
            onClick={handleCreateBaseline}
            className="px-3.5 py-1.5 border border-red-300 hover:border-red-400 bg-red-50/50 hover:bg-red-50 text-red-700 rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-red-600" />
            <span>Create Baseline</span>
          </button>

          {/* Date Range Picker (Image 1: From 📅 - To 📅) */}
          <div className="flex items-center border border-slate-200 rounded-xl px-2.5 py-1 bg-white shadow-2xs text-xs text-slate-600 gap-1.5">
            <span className="text-slate-400">From</span>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="bg-transparent text-slate-800 text-[11px] focus:outline-none w-24"
            />
            <span className="text-slate-300">-</span>
            <span className="text-slate-400">To</span>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="bg-transparent text-slate-800 text-[11px] focus:outline-none w-24"
            />
          </div>
        </div>

        {/* Right Tools (Image 1) */}
        <div className="flex items-center gap-2">
          {/* Dependency Branching Tool */}
          <button
            type="button"
            onClick={() => onShowToast?.('Dependency graph viewer enabled')}
            className="w-9 h-9 border border-slate-200 hover:border-slate-300 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
            title="Dependency View"
          >
            <GitBranch className="w-4 h-4" />
          </button>

          {/* Download/Export Icon */}
          <button
            type="button"
            onClick={() => onShowToast?.('Exporting task schedule to Excel...')}
            className="w-9 h-9 border border-slate-200 hover:border-slate-300 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
            title="Export Excel"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* ⟳ Replan Button (Image 1) */}
          <button
            type="button"
            onClick={handleReplan}
            className="px-3 py-1.5 border border-red-300 hover:border-red-400 bg-red-50/50 hover:bg-red-50 text-red-700 rounded-xl text-xs font-semibold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Replan</span>
          </button>

          {/* + Task Button (Image 1 - Solid Red in Red Theme) */}
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Task</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. HORIZONTALLY SCROLLABLE TASK TABLE (IMAGES 1, 2, 3)                     */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden relative">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
          <table className="w-full text-left text-xs min-w-[1300px] border-collapse">
            {/* Table Header (Images 1-3) */}
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3.5 w-12 text-center">S NO.</th>
                <th className="py-3 px-4 w-60">TASK NAME</th>
                <th className="py-3 px-3.5 w-28 text-center">Status</th>
                <th className="py-3 px-3.5 w-36 text-center">PROGRESS</th>
                <th className="py-3 px-3.5 w-24 text-center">Delay</th>
                <th className="py-3 px-3.5 w-32 text-center">ASSIGNED TO</th>
                <th className="py-3 px-3.5 w-20 text-center">DURATION</th>
                <th className="py-3 px-3.5 w-44 text-center">SCHEDULE</th>
                <th className="py-3 px-3.5 w-40 text-center">ACTUAL</th>
                <th className="py-3 px-3.5 w-32 text-center">FORECAST END</th>
                <th className="py-3 px-3.5 w-24 text-center">DEPENDENCIES</th>
                <th className="py-3 px-3.5 w-28 text-center">Tag</th>
                <th className="py-3 px-3 w-10 text-center text-slate-400">
                  <button
                    type="button"
                    onClick={() => onShowToast?.('Add Custom Column')}
                    className="hover:text-red-600 cursor-pointer"
                    title="Add Custom Column"
                  >
                    <PlusCircle className="w-4 h-4" />
                  </button>
                </th>
                <th className="py-3 px-2 w-8 text-center"></th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-24 text-center">
                    <p className="text-sm font-semibold text-slate-700">No project tasks created yet</p>
                    <p className="text-xs text-slate-400 mt-1">Add tasks to track execution progress, dates, and milestones.</p>
                    <button
                      type="button"
                      onClick={handleOpenCreate}
                      className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
                    >
                      + Create First Task
                    </button>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t, idx) => {
                  const isDone = t.status === 'COMPLETED';

                  return (
                    <tr
                      key={t.id}
                      onClick={() => handleOpenEdit(t)}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                    >
                      {/* 1. S NO. */}
                      <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-500 text-xs">
                        {t.s_no || idx + 1}
                      </td>

                      {/* 2. TASK NAME (with hover tooltip as in Image 1) */}
                      <td 
                        className="py-3 px-4 relative"
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredTaskTooltip({ id: t.id, x: rect.left, y: rect.top - 38 });
                        }}
                        onMouseLeave={() => setHoveredTaskTooltip(null)}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`font-bold transition-colors group-hover:text-red-600 ${
                            isDone ? 'text-slate-900 font-semibold' : 'text-slate-900'
                          }`}>
                            {t.title}
                          </span>

                          {/* Proof Badge if completion proof attached */}
                          {t.completion_proof_url && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewProofModal(t.completion_proof_url || null);
                              }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold cursor-pointer transition-colors shadow-2xs"
                              title="Click to view attached completion proof"
                            >
                              <Camera className="w-3 h-3" />
                              <span>Proof</span>
                            </button>
                          )}
                        </div>

                        {/* Tooltip on hover (matching Image 1) */}
                        {hoveredTaskTooltip?.id === t.id && (
                          <div className="absolute left-4 -top-8 z-40 bg-slate-900 text-white text-[11px] px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95">
                            <span className="font-bold">{t.title}</span>
                            <span className="text-slate-300 ml-1.5 font-normal">
                              | Created By: {t.created_by || 'Pavani'} on {t.created_date || '17/09/2026'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 3. Status (Completed or Start button, Image 1) */}
                      <td className="py-3 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        {isDone ? (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(t)}
                            className="inline-flex items-center gap-1.5 text-emerald-600 font-bold text-xs hover:opacity-80 transition-opacity cursor-pointer"
                            title="Completed — Click to view proof / details"
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                            <span>Completed</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(t)}
                            className="px-3.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-[5px] text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                            title="Click to open task and attach completion proof"
                          >
                            Start
                          </button>
                        )}
                      </td>

                      {/* 4. PROGRESS (e.g. 1/1 lumpsum + Comment Bubble, Image 1) */}
                      <td className="py-3 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            isDone 
                              ? 'bg-red-50 text-red-700 border-red-200' 
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {t.progress_label || (isDone ? '1/1 lumpsum' : '0/1 lumpsum')}
                          </span>

                          {/* Comment bubble with badge (Image 1) */}
                          <button
                            type="button"
                            onClick={() => setActiveCommentTask(t)}
                            className="relative p-1 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                            title="View/Add Comments"
                          >
                            <MessageSquare className="w-4 h-4" />
                            {(t.comments_count || 0) > 0 && (
                              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                                {t.comments_count}
                              </span>
                            )}
                          </button>
                        </div>
                      </td>

                      {/* 5. Delay (On Time, 1d, At Risk, On Track, Image 1) */}
                      <td className="py-3 px-3.5 text-center">
                        <span className={`font-semibold text-xs ${
                          t.delay_status === 'On Time' ? 'text-emerald-600' :
                          t.delay_status === '1d' ? 'text-red-600 font-bold' :
                          t.delay_status === 'At Risk' ? 'text-amber-600' :
                          'text-emerald-600'
                        }`}>
                          {t.delay_status || (isDone ? 'On Time' : 'On Track')}
                        </span>
                      </td>

                      {/* 6. ASSIGNED TO (Avatar stack, Image 1) */}
                      <td className="py-3 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        {t.assigned_team && t.assigned_team.length > 0 ? (
                          <div className="flex items-center justify-center -space-x-1.5">
                            {t.assigned_team.slice(0, 2).map((m, mIdx) => (
                              <div
                                key={mIdx}
                                className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-700 shadow-2xs"
                                title={m.name}
                              >
                                {m.initials}
                              </div>
                            ))}
                            {t.assigned_team.length > 2 && (
                              <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[9px] font-bold text-slate-500 shadow-2xs">
                                +{t.assigned_team.length - 2}
                              </div>
                            )}
                          </div>
                        ) : (t.assigned_to_name || t.assigned_to) ? (
                          <span className="text-xs text-slate-700 font-medium truncate max-w-[120px] inline-block">
                            {t.assigned_to_name || t.assigned_to}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-bold">—</span>
                        )}
                      </td>

                      {/* 7. DURATION (Image 1 & 2) */}
                      <td className="py-3 px-3.5 text-center font-bold text-slate-700 text-xs">
                        {t.duration_days} wd
                      </td>

                      {/* 8. SCHEDULE (Image 2) */}
                      <td className="py-3 px-3.5 text-center font-mono text-[11px] text-slate-600">
                        {formatScheduleRange(t.start_date, t.end_date)}
                      </td>

                      {/* 9. ACTUAL (Image 2) */}
                      <td className="py-3 px-3.5 text-center font-mono text-[11px] text-slate-600">
                        {t.actual_start && t.actual_end ? (
                          formatScheduleRange(t.actual_start, t.actual_end)
                        ) : (
                          <span className="text-slate-300 font-bold">- - -</span>
                        )}
                      </td>

                      {/* 10. FORECAST END (Image 2) */}
                      <td className="py-3 px-3.5 text-center font-mono text-xs">
                        {t.forecast_end === 'Insufficient data' ? (
                          <span className="text-slate-400 font-normal italic text-[11px]">
                            Insufficient data
                          </span>
                        ) : (
                          <span className="font-bold text-red-600">
                            {t.forecast_end || formatDateSnippet(t.end_date)}
                          </span>
                        )}
                      </td>

                      {/* 11. DEPENDENCIES (Branch icon with tooltip, Image 2 & 3) */}
                      <td className="py-3 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="group/dep relative inline-block">
                          <button
                            type="button"
                            onClick={() => setActiveDependencyTask(t)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              t.dependencies && t.dependencies.length > 0
                                ? 'text-red-600 hover:bg-red-50'
                                : 'text-slate-400 hover:text-red-600 hover:bg-slate-100'
                            }`}
                          >
                            <GitBranch className="w-4 h-4" />
                          </button>

                          {/* Hover Tooltip: "Add Dependency" (Image 3) */}
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover/dep:block z-30 bg-slate-900 text-white text-[10px] font-semibold px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none">
                            Add Dependency
                          </div>
                        </div>
                      </td>

                      {/* 12. Tag (Image 3) */}
                      <td className="py-3 px-3.5 text-center">
                        {t.tag ? (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-semibold truncate max-w-[100px] inline-block">
                            {t.tag}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-bold">—</span>
                        )}
                      </td>

                      {/* Custom column placeholder */}
                      <td className="py-3 px-3 text-center text-slate-300">—</td>

                      {/* 13. Actions Menu (Image 1-3) */}
                      <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(t)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer transition-colors"
                          title="Task Options"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ADD / EDIT TASK DRAWER                                                 */}
      {/* ========================================================================= */}
      {isTaskDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">
                  {editingTask ? 'EDIT TASK DETAILS' : 'CREATE NEW TASK'}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                  {editingTask ? editingTask.title : 'New Project Work Item'}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseTaskDrawer}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Red Accent Stripe */}
            <div className="h-1 bg-red-600 w-full" />

            {/* Form */}
            <form onSubmit={handleSaveTask} className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Task Name */}
              <div className="relative border border-slate-300 rounded-xl p-3 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-600 transition-all bg-white">
                <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  TASK NAME *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Foundation Soil Investigation"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full text-xs text-slate-900 bg-transparent focus:outline-none placeholder-slate-400"
                />
              </div>

              {/* Schedule Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="relative border border-slate-300 rounded-xl p-3 bg-white">
                  <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    START DATE
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full text-xs text-slate-900 bg-transparent focus:outline-none"
                  />
                </div>

                <div className="relative border border-slate-300 rounded-xl p-3 bg-white">
                  <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    END DATE
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full text-xs text-slate-900 bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              {/* Duration & Delay */}
              <div className="grid grid-cols-2 gap-3">
                <div className="relative border border-slate-300 rounded-xl p-3 bg-white">
                  <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    DURATION (DAYS)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formDuration}
                    onChange={(e) => setFormDuration(Number(e.target.value))}
                    className="w-full text-xs text-slate-900 bg-transparent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Delay Status
                  </label>
                  <CustomSelect
                    value={formDelayStatus}
                    onChange={(val) => setFormDelayStatus(val as any)}
                    options={[
                      { label: 'On Time', value: 'On Time', dotColor: 'bg-emerald-500' },
                      { label: 'On Track', value: 'On Track', dotColor: 'bg-teal-500' },
                      { label: 'At Risk', value: 'At Risk', dotColor: 'bg-rose-500' },
                      { label: '1d Delay', value: '1d', dotColor: 'bg-amber-500' },
                    ]}
                    size="md"
                    variant="brand"
                  />
                </div>
              </div>

              {/* Assignee */}
              <div className="relative border border-slate-300 rounded-xl p-3 bg-white">
                <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  ASSIGNED TO
                </label>
                <input
                  type="text"
                  list="staff-tab-assignees"
                  placeholder="e.g. Pavani, Madhu, Likson..."
                  value={formAssigned}
                  onChange={(e) => setFormAssigned(e.target.value)}
                  className="w-full text-xs text-slate-900 bg-transparent focus:outline-none"
                />
                <datalist id="staff-tab-assignees">
                  {registeredStaff.map(s => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.designation || s.role_name})
                    </option>
                  ))}
                </datalist>
              </div>

              {/* Tag */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Tag / Category
                </label>
                <CustomSelect
                  value={formTag}
                  onChange={(val) => setFormTag(val)}
                  options={[
                    'Field Survey',
                    'Estimating',
                    'Client Reporting',
                    'Lab Testing',
                    'Documentation',
                    'QA / QC',
                    'Final Delivery',
                  ]}
                  size="md"
                  variant="brand"
                />
              </div>

              {/* Task Completion & Proof Verification Section */}
              <div className="border border-slate-200 rounded-[5px] p-3.5 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-red-600" />
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Task Completion & Proof
                    </span>
                  </div>
                  {editingTask?.status === 'COMPLETED' && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-[4px] text-[10px] font-bold">
                      Completed
                    </span>
                  )}
                </div>

                {editingTask?.status === 'COMPLETED' ? (
                  /* ALREADY COMPLETED STATE */
                  <div className="space-y-2.5 pt-1">
                    <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-[5px] text-xs text-emerald-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                        <Check className="w-3.5 h-3.5" />
                        <span>Completed on {editingTask.completed_at || editingTask.actual_end}</span>
                      </div>
                      <div className="text-[11px] text-emerald-700">
                        Verified by: <span className="font-semibold">{editingTask.completed_by || editingTask.assigned_to_name || 'Staff'}</span>
                      </div>
                    </div>

                    {/* Proof thumbnail if available */}
                    {(editingTask.completion_proof_url || formProofUrl) && (
                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 block mb-1">Attached Completion Proof:</span>
                        <div 
                          className="relative group/proof rounded-[5px] overflow-hidden border border-slate-200 w-full max-h-40 bg-slate-900 flex items-center justify-center cursor-pointer"
                          onClick={() => setPreviewProofModal(editingTask.completion_proof_url || formProofUrl)}
                        >
                          <img 
                            src={editingTask.completion_proof_url || formProofUrl || ''} 
                            alt="Completion Proof" 
                            className="max-h-40 w-auto object-contain"
                          />
                          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover/proof:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-xs font-semibold">
                            <Eye className="w-4 h-4" />
                            <span>Click to View Full Proof</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {editingTask.completion_remarks && (
                      <div className="text-xs bg-white p-2 rounded-[5px] border border-slate-200 text-slate-700">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Remarks:</span>
                        {editingTask.completion_remarks}
                      </div>
                    )}

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={handleReopenTask}
                        className="text-xs text-slate-600 hover:text-red-600 font-semibold underline cursor-pointer"
                      >
                        Reopen Task (Change to In Progress)
                      </button>
                    </div>
                  </div>
                ) : (
                  /* PENDING / TO COMPLETE STATE */
                  <div className="space-y-3 pt-1">
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Attach quotation copy, estimation document, or site photo proof sent to the client to mark this task as completed.
                    </p>

                    {/* Upload Dropzone */}
                    <div>
                      <input
                        type="file"
                        ref={proofFileInputRef}
                        accept="image/*,.pdf,.dwg"
                        onChange={handleProofFileChange}
                        className="hidden"
                      />
                      {formProofUrl ? (
                        <div className="relative rounded-[5px] border border-emerald-300 bg-emerald-50/30 p-2.5 flex items-center gap-3">
                          <img
                            src={formProofUrl}
                            alt="Proof"
                            onClick={() => setPreviewProofModal(formProofUrl)}
                            className="w-14 h-14 object-cover rounded-[3px] border border-emerald-200 cursor-pointer hover:scale-105 transition-transform"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-emerald-800 block truncate">Proof Document Attached</span>
                            <span className="text-[10px] text-emerald-600">Click image to preview</span>
                            <div className="flex items-center gap-2 mt-1">
                              <button
                                type="button"
                                onClick={() => proofFileInputRef.current?.click()}
                                className="text-[10px] text-red-600 font-bold hover:underline cursor-pointer"
                              >
                                Change File
                              </button>
                              <span className="text-slate-300">•</span>
                              <button
                                type="button"
                                onClick={() => setFormProofUrl(null)}
                                className="text-[10px] text-slate-500 hover:text-red-600 font-semibold cursor-pointer"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => proofFileInputRef.current?.click()}
                          className="border-2 border-dashed border-slate-300 hover:border-red-500 hover:bg-red-50/30 rounded-[5px] p-3.5 text-center cursor-pointer transition-all bg-white"
                        >
                          <Camera className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                          <span className="text-xs font-bold text-slate-700 block">Click to Upload Completion Proof</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Quotation estimate, client WhatsApp/email screenshot, or photo
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Completion Remarks */}
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                        Completion Remarks / Notes
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Quotation estimation sent to client via WhatsApp and email"
                        value={formRemarks}
                        onChange={(e) => setFormRemarks(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-[5px] focus:outline-none focus:border-red-600 text-slate-900"
                      />
                    </div>

                    {/* Prominent Complete Task Button */}
                    {editingTask && (
                      <button
                        type="button"
                        onClick={handleCompleteTaskWithProof}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-[5px] text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Complete Task (Submit Proof & Mark Done)</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                {editingTask && (
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteTask(editingTask.id);
                      setIsTaskDrawerOpen(false);
                    }}
                    className="px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-xl font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={handleCloseTaskDrawer}
                    className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-colors"
                  >
                    Save Task
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TASK COMMENTS POPUP (TRIGGERED FROM 💬 ICON)                           */}
      {/* ========================================================================= */}
      {activeCommentTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-red-600" />
                <h4 className="text-xs font-bold text-slate-900 truncate max-w-[200px]">
                  {activeCommentTask.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveCommentTask(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-500">
                Current Comments: <span className="font-bold text-slate-800">{activeCommentTask.comments_count || 0}</span>
              </p>
              <textarea
                rows={3}
                placeholder="Type note or update comment for this task..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-red-600 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveCommentTask(null)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 rounded-xl"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleAddComment}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              >
                Add Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. DEPENDENCIES POPUP (TRIGGERED FROM ⑂ ICON)                             */}
      {/* ========================================================================= */}
      {activeDependencyTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-red-600" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Task Dependencies</h4>
                  <p className="text-[11px] text-slate-400">{activeDependencyTask.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveDependencyTask(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs max-h-60 overflow-y-auto">
              <p className="text-slate-500 font-medium">Select Predecessor Tasks:</p>
              {taskList
                .filter((other) => other.id !== activeDependencyTask.id)
                .map((other) => {
                  const isLinked = activeDependencyTask.dependencies?.includes(other.id);
                  return (
                    <div
                      key={other.id}
                      onClick={() => handleLinkDependency(other.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                        isLinked
                          ? 'bg-red-50 border-red-300 text-red-900 font-semibold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400 text-[10px]">#{other.s_no}</span>
                        <span className="truncate max-w-[240px]">{other.title}</span>
                      </div>
                      {isLinked && <Check className="w-4 h-4 text-red-600" />}
                    </div>
                  );
                })}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveDependencyTask(null)}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. LIGHTBOX MODAL FOR COMPLETION PROOF */}
      {previewProofModal && (
        <div 
          onClick={() => setPreviewProofModal(null)}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs cursor-pointer animate-in fade-in"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-slate-900 rounded-[5px] max-w-3xl w-full max-h-[88vh] overflow-hidden shadow-2xl border border-slate-700 flex flex-col cursor-default"
          >
            <div className="flex justify-between items-center px-4 py-3 bg-slate-900 border-b border-slate-800 text-white text-xs font-bold shrink-0">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Task Completion Proof Document</span>
              </span>
              <button 
                type="button"
                onClick={() => setPreviewProofModal(null)}
                className="p-1 hover:bg-slate-800 rounded-[4px] cursor-pointer text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-[#070a12] max-h-[75vh] overflow-auto">
              <img 
                src={previewProofModal} 
                alt="Proof Full View" 
                className="max-h-[70vh] max-w-full object-contain rounded-[4px] shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
