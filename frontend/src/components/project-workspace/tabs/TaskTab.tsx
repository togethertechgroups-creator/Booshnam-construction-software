import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, Search, Calendar, ChevronDown, ChevronRight, ChevronUp, GitBranch, RefreshCw, 
  Download, MessageSquare, Clock, User, Users, Check, CheckCircle2, 
  Trash2, Edit3, MoreVertical, X, Flag, Layers, PlusCircle, 
  ArrowRight, ShieldCheck, Sparkles, AlertTriangle,
  Upload, FileText, Image as ImageIcon, Eye, ExternalLink, Camera,
  Send, Package, HardHat, Truck, CheckSquare, Square,
  CornerDownRight, GripVertical, Info
} from 'lucide-react';
import { Project, WBSTask, Department } from '../../../types';
import { getStaffMembers } from '../../../lib/staffService';
import { addNotification } from '../../../lib/notificationService';
import { addProjectPhoto } from '../../../lib/projectPhotoUtils';
import { confirmAction, setFormDirty, clearFormDirty, confirmNavigationIfDirty } from '../../../lib/dialogService';
import { CustomSelect } from '../../CustomSelect';
import { PREDEFINED_TASKS_TEMPLATE } from '../../../lib/mockData';

interface TaskTabProps {
  project: Project;
  tasks?: WBSTask[];
  onShowToast?: (msg: string) => void;
}

export interface TaskToDoItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskMaterialResource {
  id: string;
  name: string;
  quantity: string;
  unit: string;
}

export interface TaskWorkforceResource {
  id: string;
  role: string;
  count: number;
}

export interface TaskEquipmentResource {
  id: string;
  name: string;
  count: number;
}

export interface TaskProgressEntry {
  id: string;
  user: string;
  amount: string;
  date: string;
  note?: string;
  proof_url?: string;
}

export interface TaskMessageEntry {
  id: string;
  user: string;
  text: string;
  time: string;
}

export interface TaskStatusLogEntry {
  id: string;
  text: string;
  timestamp: string;
  user?: string;
}

export interface TaskExtraMeta {
  todos?: TaskToDoItem[];
  materials?: TaskMaterialResource[];
  workforce?: TaskWorkforceResource[];
  equipment?: TaskEquipmentResource[];
  progressUpdates?: TaskProgressEntry[];
  messages?: TaskMessageEntry[];
  statusLogs?: TaskStatusLogEntry[];
}

export const TASK_DEPARTMENT_OPTIONS: { id: Department; label: string }[] = [
  { id: 'MATERIAL_TESTING', label: 'Material Testing' },
  { id: 'STRUCTURAL', label: 'Structural' },
  { id: 'SOIL_INVESTIGATION', label: 'Soil Investigation' },
  { id: 'ARCHITECTURE', label: 'Architecture' },
  { id: 'CONSTRUCTION', label: 'Construction' },
  { id: 'SURVEY', label: 'Survey' },
  { id: 'ACCOUNTS', label: 'Accounts & Finance' },
  { id: 'MARKETING', label: 'Marketing' },
  { id: 'GOVERNMENT_PROJECT', label: 'Government Projects' },
  { id: 'ART_SCULPTURE', label: 'Art & Sculpture' },
];

export const getDeptLabel = (dept?: string): string => {
  if (!dept) return 'Construction';
  const found = TASK_DEPARTMENT_OPTIONS.find(d => d.id === dept);
  if (found) return found.label;
  if (dept === 'CBE_SOIL_INVESTIGATION') return 'Soil Investigation';
  if (dept === 'MARKETING') return 'Marketing';
  return dept;
};

export const getDeptBadgeStyle = (dept?: string): string => {
  switch (dept) {
    case 'MATERIAL_TESTING':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'STRUCTURAL':
      return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'SOIL_INVESTIGATION':
    case 'CBE_SOIL_INVESTIGATION':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'ARCHITECTURE':
      return 'bg-purple-50 text-purple-800 border-purple-200';
    case 'SURVEY':
      return 'bg-cyan-50 text-cyan-800 border-cyan-200';
    case 'ACCOUNTS':
      return 'bg-teal-50 text-teal-800 border-teal-200';
    case 'GOVERNMENT_PROJECT':
      return 'bg-rose-50 text-rose-800 border-rose-200';
    case 'ART_SCULPTURE':
      return 'bg-orange-50 text-orange-800 border-orange-200';
    case 'MARKETING':
      return 'bg-pink-50 text-pink-800 border-pink-200';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
};

export const normalizeTaskDepartment = (t: Partial<WBSTask>): Department => {
  if (t.department) {
    if ((t.department as string) === 'CBE_SOIL_INVESTIGATION') return 'SOIL_INVESTIGATION';
    return t.department as Department;
  }
  const title = (t.title || '').toLowerCase();
  if (title.includes('concrete') || title.includes('cube') || title.includes('rebar') || title.includes('bitumen') || title.includes('material') || title.includes('laboratory') || title.includes('lab') || title.includes('durability')) {
    return 'MATERIAL_TESTING';
  }
  if (title.includes('structural') || title.includes('load') || title.includes('steel') || title.includes('vetting') || title.includes('rcc') || title.includes('foundation vetting')) {
    return 'STRUCTURAL';
  }
  if (title.includes('soil') || title.includes('borehole') || title.includes('spt') || title.includes('sbc') || title.includes('stratum') || title.includes('sample') || title.includes('investigation')) {
    return 'SOIL_INVESTIGATION';
  }
  if (title.includes('survey') || title.includes('dgps') || title.includes('boundary') || title.includes('contour')) {
    return 'SURVEY';
  }
  if (title.includes('drawing') || title.includes('cad') || title.includes('screenshot') || title.includes('architect') || title.includes('render') || title.includes('elevation')) {
    return 'ARCHITECTURE';
  }
  if (title.includes('bill') || title.includes('invoice') || title.includes('signing') || title.includes('document signing') || title.includes('accounts') || title.includes('payment')) {
    return 'ACCOUNTS';
  }
  if (title.includes('quote') || title.includes('quotation') || title.includes('client detail') || title.includes('marketing')) {
    return 'MARKETING';
  }
  return 'CONSTRUCTION';
};

export const DEFAULT_WORKFLOW_TASKS: Array<{
  s_no: number;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
  progress_percentage: number;
  progress_label: string;
  delay_status: string;
  assigned_to_name: string;
  assigned_team: Array<{ name: string; initials: string }>;
  duration_days: number;
  start_date: string;
  end_date: string;
  wbs_code: string;
  is_milestone: boolean;
  is_subtask: boolean;
  dependencies: string[];
}> = [
  {
    s_no: 1,
    title: 'Quotation',
    status: 'COMPLETED',
    progress_percentage: 100,
    progress_label: '1/1 lumpsum',
    delay_status: '1d',
    assigned_to_name: 'G',
    assigned_team: [
      { name: 'G', initials: 'G' },
      { name: 'SM', initials: 'SM' },
      { name: 'R', initials: 'R' },
      { name: '+6', initials: '+6' }
    ],
    duration_days: 1,
    start_date: '2026-08-31',
    end_date: '2026-08-31',
    wbs_code: '1.1',
    is_milestone: false,
    is_subtask: false,
    dependencies: [],
  },
  {
    s_no: 2,
    title: 'Site Visit',
    status: 'COMPLETED',
    progress_percentage: 50,
    progress_label: '1/2 lumpsum',
    delay_status: 'On Time',
    assigned_to_name: 'Sk',
    assigned_team: [
      { name: 'Sk', initials: 'Sk' },
      { name: 'G', initials: 'G' },
      { name: 'SM', initials: 'SM' },
      { name: '+6', initials: '+6' }
    ],
    duration_days: 1,
    start_date: '2026-08-30',
    end_date: '2026-08-30',
    wbs_code: '1.2',
    is_milestone: false,
    is_subtask: true,
    dependencies: [],
  },
  {
    s_no: 3,
    title: 'Site Investigation',
    status: 'TODO',
    progress_percentage: 0,
    progress_label: '0/1 lumpsum',
    delay_status: 'Early by 1d',
    assigned_to_name: 'G',
    assigned_team: [
      { name: 'G', initials: 'G' },
      { name: 'SM', initials: 'SM' },
      { name: 'Pb', initials: 'Pb' },
      { name: '+6', initials: '+6' }
    ],
    duration_days: 1,
    start_date: '2026-08-31',
    end_date: '2026-08-31',
    wbs_code: '1.3',
    is_milestone: false,
    is_subtask: false,
    dependencies: [],
  },
  {
    s_no: 4,
    title: 'Photos & Videos to Client',
    status: 'TODO',
    progress_percentage: 0,
    progress_label: '0/1 lumpsum',
    delay_status: 'Early by 1d',
    assigned_to_name: 'G',
    assigned_team: [
      { name: 'G', initials: 'G' },
      { name: 'SM', initials: 'SM' },
      { name: 'Pb', initials: 'Pb' },
      { name: '+6', initials: '+6' }
    ],
    duration_days: 2,
    start_date: '2026-09-01',
    end_date: '2026-09-01',
    wbs_code: '1.4',
    is_milestone: false,
    is_subtask: false,
    dependencies: [],
  },
  {
    s_no: 5,
    title: 'Details Collection',
    status: 'TODO',
    progress_percentage: 0,
    progress_label: '0/1 lumpsum',
    delay_status: '15d',
    assigned_to_name: '',
    assigned_team: [],
    duration_days: 2,
    start_date: '2026-08-31',
    end_date: '2026-08-31',
    wbs_code: '1.5',
    is_milestone: false,
    is_subtask: false,
    dependencies: [],
  },
  {
    s_no: 6,
    title: 'Sample Collection',
    status: 'COMPLETED',
    progress_percentage: 100,
    progress_label: '1/1 lumpsum',
    delay_status: 'Early by 1d',
    assigned_to_name: 'G',
    assigned_team: [
      { name: 'G', initials: 'G' },
      { name: 'SM', initials: 'SM' },
      { name: 'Pb', initials: 'Pb' },
      { name: '+6', initials: '+6' }
    ],
    duration_days: 1,
    start_date: '2026-08-31',
    end_date: '2026-08-31',
    wbs_code: '1.6',
    is_milestone: false,
    is_subtask: false,
    dependencies: [],
  },
  {
    s_no: 7,
    title: 'Borelog and Sample Delivery to Lab',
    status: 'COMPLETED',
    progress_percentage: 100,
    progress_label: '2/2 lumpsum',
    delay_status: 'Early by 1d',
    assigned_to_name: 'G',
    assigned_team: [
      { name: 'G', initials: 'G' },
      { name: 'SM', initials: 'SM' },
      { name: 'Pb', initials: 'Pb' },
      { name: '+6', initials: '+6' }
    ],
    duration_days: 2,
    start_date: '2026-08-31',
    end_date: '2026-08-31',
    wbs_code: '1.7',
    is_milestone: false,
    is_subtask: false,
    dependencies: [],
  },
  {
    s_no: 8,
    title: 'Laboratory Testing',
    status: 'COMPLETED',
    progress_percentage: 100,
    progress_label: '1/1 lumpsum',
    delay_status: '1d',
    assigned_to_name: 'G',
    assigned_team: [
      { name: 'G', initials: 'G' },
      { name: 'SM', initials: 'SM' },
      { name: 'Pb', initials: 'Pb' },
      { name: '+6', initials: '+6' }
    ],
    duration_days: 2,
    start_date: '2026-09-01',
    end_date: '2026-09-01',
    wbs_code: '1.8',
    is_milestone: false,
    is_subtask: false,
    dependencies: [],
  },
  {
    s_no: 9,
    title: 'Report Preparation',
    status: 'COMPLETED',
    progress_percentage: 100,
    progress_label: '1/1 lumpsum',
    delay_status: '1d',
    assigned_to_name: 'G',
    assigned_team: [
      { name: 'G', initials: 'G' },
      { name: 'SM', initials: 'SM' },
      { name: 'Pb', initials: 'Pb' },
      { name: '+6', initials: '+6' }
    ],
    duration_days: 1,
    start_date: '2026-09-02',
    end_date: '2026-09-02',
    wbs_code: '1.9',
    is_milestone: false,
    is_subtask: false,
    dependencies: [],
  },
  {
    s_no: 10,
    title: 'Report Checking',
    status: 'TODO',
    progress_percentage: 0,
    progress_label: '0/1 lumpsum',
    delay_status: '5d',
    assigned_to_name: 'G',
    assigned_team: [
      { name: 'G', initials: 'G' },
      { name: 'SM', initials: 'SM' },
      { name: 'Pb', initials: 'Pb' },
      { name: '+6', initials: '+6' }
    ],
    duration_days: 1,
    start_date: '2026-09-02',
    end_date: '2026-09-02',
    wbs_code: '1.10',
    is_milestone: false,
    is_subtask: false,
    dependencies: [],
  },
  {
    s_no: 11,
    title: 'Report Correction if Any',
    status: 'TODO',
    progress_percentage: 0,
    progress_label: '0/1 lumpsum',
    delay_status: '5d',
    assigned_to_name: 'G',
    assigned_team: [
      { name: 'G', initials: 'G' },
      { name: 'SM', initials: 'SM' },
      { name: 'Pb', initials: 'Pb' },
      { name: '+6', initials: '+6' }
    ],
    duration_days: 2,
    start_date: '2026-09-01',
    end_date: '2026-09-01',
    wbs_code: '1.11',
    is_milestone: false,
    is_subtask: false,
    dependencies: [],
  },
  {
    s_no: 12,
    title: 'Report Print',
    status: 'TODO',
    progress_percentage: 0,
    progress_label: '0/1 lumpsum',
    delay_status: '30d',
    assigned_to_name: 'G',
    assigned_team: [
      { name: 'G', initials: 'G' },
      { name: 'SM', initials: 'SM' },
      { name: 'Pb', initials: 'Pb' },
      { name: '+6', initials: '+6' }
    ],
    duration_days: 1,
    start_date: '2026-09-02',
    end_date: '2026-09-02',
    wbs_code: '1.12',
    is_milestone: false,
    is_subtask: false,
    dependencies: [],
  },
  {
    s_no: 13,
    title: 'Report Binding',
    status: 'TODO',
    progress_percentage: 0,
    progress_label: '0/1 lumpsum',
    delay_status: '31d',
    assigned_to_name: 'G',
    assigned_team: [
      { name: 'G', initials: 'G' },
      { name: 'SM', initials: 'SM' },
      { name: 'Pb', initials: 'Pb' },
      { name: '+6', initials: '+6' }
    ],
    duration_days: 1,
    start_date: '2026-09-03',
    end_date: '2026-09-03',
    wbs_code: '1.13',
    is_milestone: false,
    is_subtask: false,
    dependencies: [],
  },
  {
    s_no: 14,
    title: 'Report Signing',
    status: 'TODO',
    progress_percentage: 0,
    progress_label: '0/1 lumpsum',
    delay_status: '30d',
    assigned_to_name: 'G',
    assigned_team: [
      { name: 'G', initials: 'G' },
      { name: 'SM', initials: 'SM' },
      { name: 'Pb', initials: 'Pb' },
      { name: '+6', initials: '+6' }
    ],
    duration_days: 1,
    start_date: '2026-09-03',
    end_date: '2026-09-03',
    wbs_code: '1.14',
    is_milestone: false,
    is_subtask: false,
    dependencies: [],
  },
  {
    s_no: 15,
    title: 'Proforma Invoice',
    status: 'TODO',
    progress_percentage: 0,
    progress_label: '0/1 lumpsum',
    delay_status: 'On Time',
    assigned_to_name: 'G',
    assigned_team: [
      { name: 'G', initials: 'G' },
      { name: 'SM', initials: 'SM' },
      { name: 'Pb', initials: 'Pb' },
      { name: '+6', initials: '+6' }
    ],
    duration_days: 1,
    start_date: '2026-09-04',
    end_date: '2026-09-04',
    wbs_code: '1.15',
    is_milestone: false,
    is_subtask: false,
    dependencies: [],
  },
  {
    s_no: 16,
    title: 'Tax Invoice',
    status: 'TODO',
    progress_percentage: 0,
    progress_label: '0/1 lumpsum',
    delay_status: '11d',
    assigned_to_name: 'G',
    assigned_team: [
      { name: 'G', initials: 'G' },
      { name: 'SM', initials: 'SM' },
      { name: 'Pb', initials: 'Pb' },
      { name: '+6', initials: '+6' }
    ],
    duration_days: 1,
    start_date: '2026-09-05',
    end_date: '2026-09-05',
    wbs_code: '1.16',
    is_milestone: false,
    is_subtask: false,
    dependencies: [],
  },
  {
    s_no: 17,
    title: 'Report Delivery',
    status: 'TODO',
    progress_percentage: 0,
    progress_label: '0/1 lumpsum',
    delay_status: '29d',
    assigned_to_name: 'G',
    assigned_team: [
      { name: 'G', initials: 'G' },
      { name: 'SM', initials: 'SM' },
      { name: 'Pb', initials: 'Pb' },
      { name: '+6', initials: '+6' }
    ],
    duration_days: 1,
    start_date: '2026-09-05',
    end_date: '2026-09-05',
    wbs_code: '1.17',
    is_milestone: false,
    is_subtask: false,
    dependencies: [],
  },
  {
    s_no: 18,
    title: 'Payment Collection',
    status: 'COMPLETED',
    progress_percentage: 100,
    progress_label: '1/1 lumpsum',
    delay_status: '4d',
    assigned_to_name: 'G',
    assigned_team: [
      { name: 'G', initials: 'G' },
      { name: 'SM', initials: 'SM' },
      { name: 'Pb', initials: 'Pb' },
      { name: '+6', initials: '+6' }
    ],
    duration_days: 1,
    start_date: '2026-09-06',
    end_date: '2026-09-06',
    wbs_code: '1.18',
    is_milestone: false,
    is_subtask: false,
    dependencies: [],
  }
];

export const TaskTab: React.FC<TaskTabProps> = ({
  project,
  tasks: propTasks,
  onShowToast
}) => {
  const registeredStaff = getStaffMembers();
  const storageKey = `booshnam_wbs_tasks_v10_${project?.id || 'default'}`;

  const [taskList, setTaskList] = useState<WBSTask[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    const pId = project?.id || 'default';
    return DEFAULT_WORKFLOW_TASKS.map((t, idx) => ({
      ...t,
      id: `tsk-${pId}-${idx + 1}-${Date.now()}`,
      project: pId,
      project_id: pId,
      created_by: 'Bala',
      created_date: '31/08/2026',
      actual_start: t.status === 'COMPLETED' ? t.start_date : '',
      actual_end: t.status === 'COMPLETED' ? t.end_date : '',
      forecast_end: t.status === 'COMPLETED' ? 'Completed' : 'On schedule',
      comments_count: 0
    }));
  });

  // Save changes to localStorage and synchronize project progress
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(taskList));

      if (project?.id && Array.isArray(taskList) && taskList.length > 0) {
        const storedProjectsRaw = localStorage.getItem('booshnam_projects_v2');
        if (storedProjectsRaw) {
          const parsed = JSON.parse(storedProjectsRaw);
          const storedProjects: Project[] = Array.isArray(parsed)
            ? parsed.filter((p: any) => 
                !p.id?.startsWith('proj-') &&
                !['Prestige Boulevard', 'Royal Palm', 'Green Valley', 'Sunrise Industrial', 'Urban Metro', 'Skyline Contemporary', 'Heritage Courtyard', 'Highway Overpass', 'Government Medical College', 'High-Rise Commercial', 'Coastal Highway'].some(t => (p.name || p.title || p.client_name || '').includes(t))
              )
            : [];
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
  const [departmentFilter, setDepartmentFilter] = useState<'ALL' | Department>('ALL');
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
  const [formDepartment, setFormDepartment] = useState<Department>('CONSTRUCTION');
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

  // Drawer Tab (Progress / Resources / Delay & Status logs matching Screenshots 2 & 3)
  const [drawerTab, setDrawerTab] = useState<'progress' | 'resources' | 'logs'>('progress');
  const [isDatesExpanded, setIsDatesExpanded] = useState(true);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isAddToDoOpen, setIsAddToDoOpen] = useState(false);
  const [newToDoText, setNewToDoText] = useState('');
  const [isEditingTitleInline, setIsEditingTitleInline] = useState(false);
  const [inlineTitleValue, setInlineTitleValue] = useState('');
  const [messageInput, setMessageInput] = useState('');

  // Accordions for Resources Tab (Screenshot 3)
  const [expandedResources, setExpandedResources] = useState<{
    material: boolean;
    workforce: boolean;
    equipment: boolean;
  }>({
    material: true,
    workforce: true,
    equipment: true,
  });

  // Resource Modals (Screenshot 3: [Add] buttons)
  const [activeResourceModal, setActiveResourceModal] = useState<'material' | 'workforce' | 'equipment' | null>(null);
  const [resMatName, setResMatName] = useState('');
  const [resMatQty, setResMatQty] = useState('');
  const [resMatUnit, setResMatUnit] = useState('Bags');

  const [resWorkRole, setResWorkRole] = useState('');
  const [resWorkCount, setResWorkCount] = useState<number>(1);

  const [resEquipName, setResEquipName] = useState('');
  const [resEquipCount, setResEquipCount] = useState<number>(1);

  // Progress Modal (Screenshot 2: + Progress button)
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [progressAmountInput, setProgressAmountInput] = useState('1 lumpsum');
  const [progressNoteInput, setProgressNoteInput] = useState('');
  const [progressIsCompleted, setProgressIsCompleted] = useState(true);

  // Assignee Modal
  const [isAssigneeModalOpen, setIsAssigneeModalOpen] = useState(false);

  // Subtask Addition Modal
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [parentTaskId, setParentTaskId] = useState<string | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  // Task Extra Meta persistent storage
  const [taskMetadataMap, setTaskMetadataMap] = useState<Record<string, TaskExtraMeta>>(() => {
    try {
      const raw = localStorage.getItem(`booshnam_task_meta_${project?.id || 'default'}`);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {};
  });

  const saveTaskMeta = (taskId: string, updater: (prev: TaskExtraMeta) => TaskExtraMeta) => {
    setTaskMetadataMap((prevMap) => {
      const prevMeta = prevMap[taskId] || {};
      const updated = updater(prevMeta);
      const newMap = { ...prevMap, [taskId]: updated };
      try {
        localStorage.setItem(`booshnam_task_meta_${project?.id || 'default'}`, JSON.stringify(newMap));
      } catch (e) {}
      return newMap;
    });
  };

  const currentUser = useMemo(() => {
    try {
      const stored = localStorage.getItem('siteops_user');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return { first_name: 'Priya', username: 'admin', role_name: 'Owner / Director', role_code: 'SUPER_ADMIN' };
  }, [isTaskDrawerOpen]);

  // New Comment input
  const [commentInput, setCommentInput] = useState('');

  // Format date helper: "03 Oct 26"
  const formatDateSnippet = (dStr?: string) => {
    if (!dStr) return '- - -';
    try {
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return dStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = d.toLocaleDateString('en-GB', { month: 'short' });
      const year = String(d.getFullYear()).slice(-2);
      return `${day} ${month} ${year}`;
    } catch {
      return dStr;
    }
  };

  // Format single date for exact table UI: "31 Aug 26"
  const formatDisplayDate = (dStr?: string) => {
    if (!dStr) return '—';
    if (/^\d{2}\s[A-Za-z]{3}\s\d{2}$/.test(dStr)) return dStr;
    try {
      const parts = dStr.split('-');
      if (parts.length === 3) {
        const year = parts[0].slice(-2);
        const monthIdx = parseInt(parts[1], 10) - 1;
        const day = parts[2].padStart(2, '0');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthStr = monthNames[monthIdx] || parts[1];
        return `${day} ${monthStr} ${year}`;
      }
    } catch {}
    return formatDateSnippet(dStr);
  };

  // Format schedule range: "03 Oct 26 - 03 Oct 26"
  const formatScheduleRange = (start?: string, end?: string) => {
    if (!start || !end) return '- - -';
    return `${formatDateSnippet(start)} - ${formatDateSnippet(end)}`;
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
    if (departmentFilter !== 'ALL') {
      const itemDept = normalizeTaskDepartment(item);
      if (itemDept !== departmentFilter) return false;
    }

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
    setInlineTitleValue('');
    setIsEditingTitleInline(false);
    setFormDepartment(departmentFilter !== 'ALL' ? departmentFilter : 'MATERIAL_TESTING');
    setFormStartDate('2026-09-17');
    setFormEndDate('2026-09-18');
    setFormDuration(1);
    setFormTag('Field Survey');
    setFormAssigned('Pavani');
    setFormDelayStatus('On Track');
    setFormProofUrl(null);
    setFormRemarks('');
    setIsStatusMenuOpen(false);
    setIsMoreMenuOpen(false);
    setIsAddToDoOpen(false);
    setIsAddingSubtask(false);
    setParentTaskId(null);
    setIsTaskDrawerOpen(true);
  };

  // Open Drawer for Create Subtask
  const handleOpenCreateSubtask = (parent: WBSTask) => {
    setEditingTask(null);
    setFormTitle('');
    setInlineTitleValue('');
    setIsEditingTitleInline(false);
    setFormDepartment(parent.department || 'CONSTRUCTION');
    setFormStartDate(parent.start_date || '2026-09-17');
    setFormEndDate(parent.end_date || '2026-09-18');
    setFormDuration(1);
    setFormTag(parent.tag || 'Field Survey');
    setFormAssigned(parent.assigned_to_name || 'Pavani');
    setFormDelayStatus('On Track');
    setFormProofUrl(null);
    setFormRemarks('');
    setIsStatusMenuOpen(false);
    setIsMoreMenuOpen(false);
    setIsAddToDoOpen(false);
    setIsAddingSubtask(true);
    setParentTaskId(parent.id);
    setIsTaskDrawerOpen(true);
  };

  // Open Drawer for Edit / Detail View (Screenshots 2 & 3)
  const handleOpenEdit = (t: WBSTask) => {
    setEditingTask(t);
    setFormTitle(t.title);
    setInlineTitleValue(t.title);
    setIsEditingTitleInline(false);
    setFormDepartment(t.department || normalizeTaskDepartment(t));
    setFormStartDate(t.start_date || '2026-09-17');
    setFormEndDate(t.end_date || '2026-09-18');
    setFormDuration(t.duration_days || 1);
    setFormTag(t.tag || 'Field Survey');
    setFormAssigned(t.assigned_to_name || 'Pavani');
    setFormDelayStatus(t.delay_status || 'On Track');
    setFormProofUrl(t.completion_proof_url || null);
    setFormRemarks(t.completion_remarks || '');
    setDrawerTab('progress');
    setIsDatesExpanded(true);
    setIsStatusMenuOpen(false);
    setIsMoreMenuOpen(false);
    setIsAddToDoOpen(false);
    setIsTaskDrawerOpen(true);
  };

  // Computed current task metadata with realistic defaults matching Screenshots 2 & 3
  const currentTaskMeta = useMemo<TaskExtraMeta>(() => {
    if (!editingTask) return {};
    const meta = taskMetadataMap[editingTask.id];
    if (meta) return meta;

    const isDone = editingTask.status === 'COMPLETED';
    const defaultTodos: TaskToDoItem[] = [
      { id: 'todo-1', text: 'Prepare initial bill of quantities (BOQ)', completed: isDone },
      { id: 'todo-2', text: 'Verify material unit rates from suppliers', completed: isDone },
      { id: 'todo-3', text: 'Send formal quotation to client for review', completed: isDone },
    ];

    const defaultProgress: TaskProgressEntry[] = isDone ? [
      {
        id: 'prog-1',
        user: editingTask.completed_by || 'Dasari Uma Sri Devi',
        amount: editingTask.progress_label || '1 lumpsum ✓',
        date: editingTask.completed_at || 'Sep 30, 26',
        note: editingTask.completion_remarks || 'Quotation estimation submitted and approved by client.'
      }
    ] : [];

    const defaultLogs: TaskStatusLogEntry[] = [
      { id: 'log-1', text: `Task created by ${editingTask.created_by || 'Pavani'}`, timestamp: editingTask.created_date || '17 Sep 26, 09:30 AM' },
      ...(isDone ? [
        { id: 'log-2', text: 'Status changed to Ongoing', timestamp: '17 Sep 26, 10:00 AM' },
        { id: 'log-3', text: 'Status changed to Completed', timestamp: '30 Sep 26, 11:45 AM' },
        { id: 'log-4', text: 'Delay status: On Time', timestamp: '30 Sep 26, 11:45 AM' },
      ] : [])
    ];

    return {
      todos: defaultTodos,
      materials: [],
      workforce: [],
      equipment: [],
      progressUpdates: defaultProgress,
      messages: [],
      statusLogs: defaultLogs
    };
  }, [editingTask, taskMetadataMap]);

  // Quick Status Switcher (Screenshot 2: Completed ▾ / Ongoing ▾ / Start ▾)
  const handleQuickStatusChange = (newStatus: 'COMPLETED' | 'IN_PROGRESS' | 'TODO') => {
    if (!editingTask) return;
    setIsStatusMenuOpen(false);
    const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const isDone = newStatus === 'COMPLETED';
    const isOngoing = newStatus === 'IN_PROGRESS';

    const nextProgress = isDone ? 100 : isOngoing ? 50 : 0;
    const nextLabel = isDone ? '1/1 lumpsum' : isOngoing ? '0.5/1 lumpsum' : '0/1 lumpsum';
    const nextActualStart = isDone || isOngoing ? (editingTask.actual_start || editingTask.start_date || todayStr) : '';
    const nextActualEnd = isDone ? (editingTask.actual_end || editingTask.end_date || todayStr) : '';
    const nextDelay = isDone ? 'On Time' : isOngoing ? 'On Track' : 'At Risk';

    const updatedTask: WBSTask = {
      ...editingTask,
      status: newStatus,
      progress_percentage: nextProgress,
      progress_label: nextLabel,
      actual_start: nextActualStart,
      actual_end: nextActualEnd,
      delay_status: nextDelay,
      completed_by: isDone ? (currentUser.first_name || currentUser.username || 'Staff') : editingTask.completed_by,
      completed_at: isDone ? todayStr : editingTask.completed_at
    };

    setEditingTask(updatedTask);
    setTaskList(prev => prev.map(t => t.id === editingTask.id ? updatedTask : t));

    // Log the event in timeline
    saveTaskMeta(editingTask.id, prev => ({
      ...prev,
      statusLogs: [
        {
          id: `log-${Date.now()}`,
          text: `Status changed to ${isDone ? 'Completed' : isOngoing ? 'Ongoing' : 'Start'}`,
          timestamp: `${todayStr}, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          user: currentUser.first_name || 'Staff'
        },
        ...(prev.statusLogs || [])
      ],
      ...(isDone ? {
        progressUpdates: [
          {
            id: `prog-${Date.now()}`,
            user: currentUser.first_name || 'Dasari Uma Sri Devi',
            amount: '1 lumpsum ✓',
            date: todayStr,
            note: 'Marked completed from task status switcher.'
          },
          ...(prev.progressUpdates || [])
        ]
      } : {})
    }));

    onShowToast?.(`Task status updated to ${isDone ? 'Completed' : isOngoing ? 'Ongoing' : 'Start'}`);
  };

  // Inline Title Save
  const handleSaveInlineTitle = () => {
    if (!editingTask || !inlineTitleValue.trim()) return;
    const updated = { ...editingTask, title: inlineTitleValue.trim() };
    setEditingTask(updated);
    setTaskList(prev => prev.map(t => t.id === editingTask.id ? updated : t));
    setIsEditingTitleInline(false);
    onShowToast?.('Task name updated');
  };

  // To-Do Checklist Actions
  const handleAddToDo = () => {
    if (!editingTask || !newToDoText.trim()) return;
    const newItem: TaskToDoItem = {
      id: `todo-${Date.now()}`,
      text: newToDoText.trim(),
      completed: false
    };
    saveTaskMeta(editingTask.id, prev => ({
      ...prev,
      todos: [...(prev.todos || []), newItem]
    }));
    setNewToDoText('');
    onShowToast?.('To-Do item added');
  };

  const handleToggleToDo = (todoId: string) => {
    if (!editingTask) return;
    saveTaskMeta(editingTask.id, prev => ({
      ...prev,
      todos: (prev.todos || []).map(td => td.id === todoId ? { ...td, completed: !td.completed } : td)
    }));
  };

  const handleDeleteToDo = (todoId: string) => {
    if (!editingTask) return;
    saveTaskMeta(editingTask.id, prev => ({
      ...prev,
      todos: (prev.todos || []).filter(td => td.id !== todoId)
    }));
  };

  // Resource Actions (Screenshot 3: Material, Workforce, Equipment)
  const handleAddMaterial = () => {
    if (!editingTask || !resMatName.trim()) return;
    const newRes: TaskMaterialResource = {
      id: `mat-${Date.now()}`,
      name: resMatName.trim(),
      quantity: resMatQty.trim() || '1',
      unit: resMatUnit.trim() || 'Bags'
    };
    saveTaskMeta(editingTask.id, prev => ({
      ...prev,
      materials: [...(prev.materials || []), newRes]
    }));
    setResMatName('');
    setResMatQty('');
    setActiveResourceModal(null);
    onShowToast?.(`Material "${newRes.name}" added to task`);
  };

  const handleDeleteMaterial = (matId: string) => {
    if (!editingTask) return;
    saveTaskMeta(editingTask.id, prev => ({
      ...prev,
      materials: (prev.materials || []).filter(m => m.id !== matId)
    }));
    onShowToast?.('Material removed');
  };

  const handleAddWorkforce = () => {
    if (!editingTask || !resWorkRole.trim()) return;
    const newRes: TaskWorkforceResource = {
      id: `work-${Date.now()}`,
      role: resWorkRole.trim(),
      count: resWorkCount || 1
    };
    saveTaskMeta(editingTask.id, prev => ({
      ...prev,
      workforce: [...(prev.workforce || []), newRes]
    }));
    setResWorkRole('');
    setResWorkCount(1);
    setActiveResourceModal(null);
    onShowToast?.(`Workforce "${newRes.role}" added to task`);
  };

  const handleDeleteWorkforce = (workId: string) => {
    if (!editingTask) return;
    saveTaskMeta(editingTask.id, prev => ({
      ...prev,
      workforce: (prev.workforce || []).filter(w => w.id !== workId)
    }));
    onShowToast?.('Workforce removed');
  };

  const handleAddEquipment = () => {
    if (!editingTask || !resEquipName.trim()) return;
    const newRes: TaskEquipmentResource = {
      id: `eq-${Date.now()}`,
      name: resEquipName.trim(),
      count: resEquipCount || 1
    };
    saveTaskMeta(editingTask.id, prev => ({
      ...prev,
      equipment: [...(prev.equipment || []), newRes]
    }));
    setResEquipName('');
    setResEquipCount(1);
    setActiveResourceModal(null);
    onShowToast?.(`Equipment "${newRes.name}" added to task`);
  };

  const handleDeleteEquipment = (eqId: string) => {
    if (!editingTask) return;
    saveTaskMeta(editingTask.id, prev => ({
      ...prev,
      equipment: (prev.equipment || []).filter(e => e.id !== eqId)
    }));
    onShowToast?.('Equipment removed');
  };

  // Send Message Discussion
  const handleSendMessage = () => {
    if (!editingTask || !messageInput.trim()) return;
    const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg: TaskMessageEntry = {
      id: `msg-${Date.now()}`,
      user: currentUser.first_name || currentUser.username || 'User',
      text: messageInput.trim(),
      time: `${todayStr}, ${timeStr}`
    };
    saveTaskMeta(editingTask.id, prev => ({
      ...prev,
      messages: [...(prev.messages || []), newMsg]
    }));
    setMessageInput('');
    onShowToast?.('Message sent');
  };

  // Submit Progress Update (+ Progress button)
  const handleSaveProgressUpdate = () => {
    if (!editingTask) return;
    const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const newEntry: TaskProgressEntry = {
      id: `prog-${Date.now()}`,
      user: currentUser.first_name || currentUser.username || 'Dasari Uma Sri Devi',
      amount: progressAmountInput.trim() || '1 lumpsum',
      date: todayStr,
      note: progressNoteInput.trim() || undefined,
      proof_url: formProofUrl || undefined
    };

    saveTaskMeta(editingTask.id, prev => ({
      ...prev,
      progressUpdates: [newEntry, ...(prev.progressUpdates || [])],
      statusLogs: [
        {
          id: `log-${Date.now()}`,
          text: `Progress recorded: ${newEntry.amount}${progressNoteInput ? ` (${progressNoteInput})` : ''}`,
          timestamp: `${todayStr}, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          user: currentUser.first_name || 'Staff'
        },
        ...(prev.statusLogs || [])
      ]
    }));

    if (progressIsCompleted) {
      const updatedTask: WBSTask = {
        ...editingTask,
        status: 'COMPLETED',
        progress_percentage: 100,
        progress_label: progressAmountInput.trim() || '1/1 lumpsum',
        actual_end: editingTask.end_date || todayStr,
        delay_status: 'On Time',
        completion_proof_url: formProofUrl || editingTask.completion_proof_url,
        completion_remarks: progressNoteInput || editingTask.completion_remarks,
        completed_by: currentUser.first_name || 'Dasari Uma Sri Devi',
        completed_at: todayStr
      };
      setEditingTask(updatedTask);
      setTaskList(prev => prev.map(t => t.id === editingTask.id ? updatedTask : t));
    }

    setIsProgressModalOpen(false);
    setProgressNoteInput('');
    onShowToast?.('Progress recorded successfully');
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
      (formDepartment !== (editingTask?.department || normalizeTaskDepartment(editingTask || {}))) ||
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
  }, [isTaskDrawerOpen, formTitle, formDepartment, formRemarks, formProofUrl, editingTask]);

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
              department: formDepartment,
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
      const mainTasksCount = taskList.filter(t => !t.is_subtask).length;
      const nextNo = mainTasksCount + 1;
      const newTask: WBSTask = {
        id: `tsk-${Date.now()}`,
        s_no: isAddingSubtask ? undefined : nextNo,
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
        is_subtask: isAddingSubtask,
        assigned_to_name: formAssigned,
        assigned_team: [{ name: formAssigned, initials: formAssigned.slice(0, 2).toUpperCase() }],
        dependencies: [],
        tag: formTag,
        department: formDepartment,
        completion_proof_url: formProofUrl || undefined,
        completion_remarks: formRemarks.trim() || undefined
      };

      setTaskList((prev) => {
        if (isAddingSubtask && parentTaskId) {
          const parentIndex = prev.findIndex((t) => t.id === parentTaskId);
          if (parentIndex !== -1) {
            const nextList = [...prev];
            nextList.splice(parentIndex + 1, 0, newTask);
            return nextList;
          }
        }
        return [...prev, newTask];
      });

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

      onShowToast?.(`${isAddingSubtask ? 'Subtask' : 'Task'} added: "${newTask.title}"`);
    }

    setIsTaskDrawerOpen(false);
  };

  // Delete task
  const handleDeleteTask = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();

    const isSuperAdmin = !currentUser?.role_code || 
      currentUser?.role_code === 'SUPER_ADMIN' || 
      currentUser?.role_code === 'ADMIN' || 
      currentUser?.role_name?.toLowerCase() === 'super admin' ||
      currentUser?.role_name?.toLowerCase().includes('admin') ||
      currentUser?.role_name === 'Owner / Director' ||
      currentUser?.first_name?.toLowerCase() === 'priya' ||
      currentUser?.first_name?.toLowerCase() === 'rajesh';

    if (!isSuperAdmin) {
      onShowToast?.('Permission Denied: Only Admin or Super Admin can delete tasks.');
      return;
    }

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
    const pId = project?.id || 'default';
    const seeded = DEFAULT_WORKFLOW_TASKS.map((t, idx) => ({
      ...t,
      id: `tsk-${pId}-${idx + 1}-${Date.now()}`,
      project: pId,
      project_id: pId,
      created_by: 'Bala',
      created_date: '31/08/2026',
      actual_start: t.start_date,
      actual_end: t.end_date,
      forecast_end: 'Completed',
      comments_count: 0
    }));
    setTaskList(seeded as any);
    onShowToast?.('Reset demo tasks to exact workflow template');
  };

  // Drag-and-drop reordering state
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIndex) return;
    setTaskList((prev) => {
      const next = [...prev];
      const [moved] = next.splice(draggedIdx, 1);
      next.splice(targetIndex, 0, moved);
      let mainCounter = 1;
      return next.map((t) => {
        if (t.is_subtask) return { ...t, s_no: undefined };
        return { ...t, s_no: mainCounter++ };
      });
    });
    setDraggedIdx(null);
    onShowToast?.('Task reordered');
  };

  // "Change to Ongoing" Modal State (Image 2)
  const [startingTask, setStartingTask] = useState<WBSTask | null>(null);
  const [actualStartDateInput, setActualStartDateInput] = useState<string>('');
  const [startCommentInput, setStartCommentInput] = useState<string>('');

  const handleOpenStartModal = (task: WBSTask) => {
    setStartingTask(task);
    setActualStartDateInput(new Date().toISOString().split('T')[0]);
    setStartCommentInput('');
  };

  const handleCloseStartModal = () => {
    setStartingTask(null);
    setActualStartDateInput('');
    setStartCommentInput('');
  };

  const handleSaveStartModal = () => {
    if (!startingTask) return;
    const taskId = startingTask.id;
    const dateVal = actualStartDateInput || new Date().toISOString().split('T')[0];

    setTaskList((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const existingLogs = (t as any).statusLogs || [];
          const newLog = startCommentInput.trim()
            ? [
                {
                  id: `log-${Date.now()}`,
                  text: `Moved to Ongoing: ${startCommentInput.trim()}`,
                  timestamp: new Date().toLocaleString(),
                  user: 'Current User'
                }
              ]
            : [];

          return {
            ...t,
            status: 'IN_PROGRESS',
            actual_start: dateVal,
            delay_status: 'On Track',
            statusLogs: [...existingLogs, ...newLog]
          };
        }
        return t;
      })
    );

    onShowToast?.(`Task "${startingTask.title}" moved to Ongoing!`);
    handleCloseStartModal();
  };

  // Helper to render progress pill with bold purple numerator and regular slate denominator (Image 1)
  const renderProgressPillContent = (label?: string, percentage?: number) => {
    if (label && label.includes('/')) {
      const parts = label.split('/');
      const firstNum = parts[0].trim();
      const rest = parts.slice(1).join('/').trim();
      return (
        <span className="inline-flex items-center gap-0.5">
          <span className="font-bold text-[#6d28d9]">{firstNum}</span>
          <span className="text-slate-600 font-medium">/{rest}</span>
        </span>
      );
    }
    if (label && label.includes('%')) {
      const parts = label.split('%');
      return (
        <span className="inline-flex items-center gap-0.5">
          <span className="font-bold text-[#6d28d9]">{parts[0].trim()}</span>
          <span className="text-slate-600 font-medium"> %</span>
        </span>
      );
    }
    return <span className="font-bold text-[#6d28d9]">{label || `${percentage || 0} %`}</span>;
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
      {/* 1. TOP ACTION & FILTER TOOLBAR (EXACT MATCH OF IMAGE 2)                   */}
      {/* ========================================================================= */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Left Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Icon / Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 hover:border-slate-300 rounded-xl focus:outline-none focus:border-[#704fe6] w-36 sm:w-44 text-slate-800 placeholder-slate-400 shadow-2xs"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* All Status ▾ Dropdown Filter (Image 2) */}
          <div className="relative" data-task-dropdown>
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                statusFilter !== 'ALL'
                  ? 'bg-purple-50 text-[#704fe6] border border-purple-300'
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
                      statusFilter === st.id ? 'bg-purple-50 text-[#704fe6] font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Assignee ▾ Dropdown Filter (Image 2) */}
          <div className="relative" data-task-dropdown>
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'assignee' ? null : 'assignee')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                assigneeFilter !== 'ALL'
                  ? 'bg-purple-50 text-[#704fe6] border border-purple-300'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <span>{assigneeFilter === 'ALL' ? 'Assignee' : assigneeFilter}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {openDropdown === 'assignee' && (
              <div className="absolute left-0 top-full mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1.5 text-xs animate-in fade-in duration-100 max-h-56 overflow-y-auto">
                {['ALL', 'G', 'SM', 'SK', 'R', 'Pb', 'Pavani', 'Bala'].map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => {
                      setAssigneeFilter(a);
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3.5 py-1.5 font-medium transition-colors cursor-pointer ${
                      assigneeFilter === a ? 'bg-purple-50 text-[#704fe6] font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {a === 'ALL' ? 'All Assignees' : a}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tag ▾ Dropdown Filter (Image 2) */}
          <div className="relative" data-task-dropdown>
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'tag' ? null : 'tag')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                tagFilter !== 'ALL'
                  ? 'bg-purple-50 text-[#704fe6] border border-purple-300'
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
                      tagFilter === tg ? 'bg-purple-50 text-[#704fe6] font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {tg === 'ALL' ? 'All Tags' : tg}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Create Baseline Button (Image 2 - Outlined Pill with Purple Border) */}
          <button
            type="button"
            onClick={handleCreateBaseline}
            className="px-3.5 py-1.5 border border-[#704fe6] hover:bg-purple-50 text-[#704fe6] bg-white rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <span>Create Baseline</span>
          </button>

          {/* Date Range Picker (Image 2: From dd-mm-yyyy 📅 - To dd-mm-yyyy 📅) */}
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

        {/* Right Tools (Image 2) */}
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

          {/* ⟳ Replan Button (Image 2 - Outlined Pill with Purple Border) */}
          <button
            type="button"
            onClick={handleReplan}
            className="px-3 py-1.5 border border-[#704fe6] hover:bg-purple-50 text-[#704fe6] bg-white rounded-xl text-xs font-semibold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Replan</span>
          </button>

          {/* + Task Button (Image 2 - Solid Purple) */}
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-[#704fe6] hover:bg-[#5f3dc4] text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Task</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. HORIZONTALLY SCROLLABLE TASK TABLE (EXACT RECREATION OF IMAGES 2 & 3)   */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* 2. HORIZONTALLY SCROLLABLE TASK TABLE (EXACT RECREATION OF USER SCREENSHOT) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden relative">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
          <table className="w-full text-left text-xs min-w-[950px] border-collapse">
            {/* Table Header (Exact Match to User Screenshot) */}
            <thead className="bg-[#f8f9fc] border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px] select-none">
              <tr>
                <th className="py-3 px-3 w-16 text-center border-r border-slate-200/80">S NO.</th>
                <th className="py-3 px-4 min-w-[250px] border-r border-slate-200/80 text-left font-bold text-slate-600">TASK NAME</th>
                <th className="py-3 px-4 w-32 border-r border-slate-200/80 text-left font-semibold text-slate-600 capitalize">Status</th>
                <th className="py-3 px-4 w-44 border-r border-slate-200/80 text-left font-bold text-slate-600">PROGRESS</th>
                <th className="py-3 px-3.5 w-28 border-r border-slate-200/80 text-center font-semibold text-slate-600 capitalize">Delay</th>
                <th className="py-3 px-4 w-40 border-r border-slate-200/80 text-center font-bold text-slate-600">ASSIGNED TO</th>
                <th className="py-3 px-3.5 w-24 border-r border-slate-200/80 text-center font-bold text-slate-600">DURATION</th>
                <th className="py-3 px-4 w-28 border-r border-slate-200/80 text-center font-bold text-slate-600"></th>
                <th className="py-3 px-2 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="p-1 text-slate-500 hover:text-[#704fe6] transition-colors cursor-pointer"
                    title="Add Task"
                  >
                    <PlusCircle className="w-4 h-4 stroke-[1.6]" />
                  </button>
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-24 text-center">
                    <p className="text-sm font-semibold text-slate-700">No project tasks created yet</p>
                    <p className="text-xs text-slate-400 mt-1">Add tasks to track execution progress, dates, and milestones.</p>
                    <button
                      type="button"
                      onClick={handleOpenCreate}
                      className="mt-4 px-4 py-2 bg-[#704fe6] hover:bg-[#5f3dc4] text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
                    >
                      + Create First Task
                    </button>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t, idx) => {
                  if (t.is_subtask && t.parent_id && !expandedTasks.has(t.parent_id)) {
                    return null;
                  }
                  
                  const isDone = t.status === 'COMPLETED';
                  const isOngoing = t.status === 'IN_PROGRESS';
                  const isEarlyOrOnTime = (t.delay_status || '').includes('Early') || t.delay_status === 'On Time' || t.delay_status === 'On Track';
                  const hasSubtasks = filteredTasks.some(sub => sub.parent_id === t.id);
                  const isExpanded = expandedTasks.has(t.id);

                  return (
                    <tr
                      key={t.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      onClick={() => handleOpenEdit(t)}
                      className={`hover:bg-slate-50/70 transition-colors group cursor-pointer border-b border-slate-200/60 last:border-b-0 ${
                        draggedIdx === idx ? 'opacity-40 bg-purple-50/30' : 'bg-white'
                      }`}
                    >
                      {/* 1. S NO. (6-dots drag icon + number) */}
                      <td className="py-3.5 px-3 border-r border-slate-200/70 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <GripVertical className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 cursor-grab active:cursor-grabbing shrink-0" />
                          <span className="font-medium text-slate-800 text-[13px] w-4 text-left">
                            {t.is_subtask ? '' : (t.s_no || idx + 1)}
                          </span>
                        </div>
                      </td>

                      {/* 2. TASK NAME (Bold, dark clean text + purple arrow for subtasks) */}
                      <td className="py-3.5 px-4 border-r border-slate-200/70 relative">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {hasSubtasks && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedTasks(prev => {
                                    const next = new Set(prev);
                                    if (next.has(t.id)) next.delete(t.id);
                                    else next.add(t.id);
                                    return next;
                                  });
                                }}
                                className="p-0.5 rounded-md hover:bg-slate-200 text-slate-500 transition-colors shrink-0"
                              >
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                            )}
                            {(t.is_subtask || t.s_no === 2) && <CornerDownRight className="w-4 h-4 text-[#704fe6] shrink-0" />}
                            <span className={`font-bold text-slate-900 text-[13px] tracking-tight group-hover:text-[#704fe6] transition-colors`}>
                              {t.title}
                            </span>
                          </div>
                          {(!t.is_subtask && t.s_no !== 2) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenCreateSubtask(t);
                              }}
                              className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 bg-[#1e1b4b] hover:bg-[#2e2b5e] text-white px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer shadow-md absolute right-3"
                            >
                              Add Subtask <CornerDownRight className="w-3 h-3 text-[#b49cf5]" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* 3. Status (Green circle dot + "Completed", Blue dot + "Ongoing", or lavender "Start" button) */}
                      <td className="py-3.5 px-4 border-r border-slate-200/70 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {isDone ? (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(t.id)}
                            className="flex items-center gap-2 text-left cursor-pointer group/st hover:opacity-80 transition-opacity"
                            title="Status: Completed (click to toggle)"
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <span className="text-emerald-600 font-semibold text-xs">Completed</span>
                          </button>
                        ) : isOngoing ? (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(t.id)}
                            className="flex items-center gap-2 text-left cursor-pointer group/st hover:opacity-80 transition-opacity"
                            title="Status: Ongoing (click to toggle)"
                          >
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                            <span className="text-blue-600 font-semibold text-xs">Ongoing</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenStartModal(t)}
                            className="px-4 py-1 bg-[#ede9fe] hover:bg-[#ddd6fe] text-[#6d28d9] rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-95 inline-flex items-center justify-center"
                            title="Click to start task"
                          >
                            Start
                          </button>
                        )}
                      </td>

                      {/* 4. PROGRESS (Pill badge with bold purple numerator + outline chat bubble icon on right) */}
                      <td className="py-3.5 px-3.5 border-r border-slate-200/70 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between gap-3 px-1">
                          <div className="px-3 py-1 rounded-full text-xs font-semibold bg-[#f0edff] border border-purple-100/60 inline-flex items-center justify-center shadow-2xs">
                            {renderProgressPillContent(t.progress_label, t.progress_percentage)}
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveCommentTask(t)}
                            className="relative p-1 text-[#8b5cf6] hover:text-[#704fe6] rounded-md transition-colors cursor-pointer"
                            title="View/Add Comments"
                          >
                            <MessageSquare className="w-4 h-4 stroke-[1.6]" />
                            {(t.comments_count || 0) > 0 && (
                              <span className="absolute -top-1 -right-1 bg-[#704fe6] text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                                {t.comments_count}
                              </span>
                            )}
                          </button>
                        </div>
                      </td>

                      {/* 5. Delay (Red for delays; Green for On Time, Early by 1d) */}
                      <td className="py-3.5 px-3.5 text-center border-r border-slate-200/70 whitespace-nowrap">
                        <span className={`text-xs font-semibold ${
                          isEarlyOrOnTime ? 'text-emerald-500' : 'text-red-500'
                        }`}>
                          {t.delay_status || 'On Time'}
                        </span>
                      </td>

                      {/* 6. ASSIGNED TO (Circular avatar badges: G, SM, R, +6) */}
                      <td className="py-3.5 px-4 text-center border-r border-slate-200/70 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {t.assigned_team && t.assigned_team.length > 0 ? (
                          <div className="flex items-center justify-center -space-x-1.5">
                            {t.assigned_team.map((m, mIdx) => {
                              const getAvatarStyle = (init: string) => {
                                if (init === 'SM') return 'bg-[#e0e7ff] text-[#4338ca]';
                                if (init === '+6' || init.startsWith('+')) return 'bg-[#f1f3f9] text-[#64748b]';
                                return 'bg-[#ede9fe] text-[#6d28d9]';
                              };
                              return (
                                <div
                                  key={mIdx}
                                  className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold shadow-2xs ${getAvatarStyle(m.initials)}`}
                                  title={m.name}
                                >
                                  {m.initials}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-semibold text-xs">—</span>
                        )}
                      </td>

                      {/* 7. DURATION (1 wd, 2 wd) */}
                      <td className="py-3.5 px-3.5 text-center border-r border-slate-200/70 whitespace-nowrap text-xs text-slate-800">
                        <span className="font-bold">{t.duration_days || 1}</span>{' '}
                        <span className="font-normal text-slate-600">wd</span>
                      </td>

                      {/* 8. Date (31 Aug 26, 30 Aug 26, etc.) */}
                      <td className="py-3.5 px-4 text-center border-r border-slate-200/70 whitespace-nowrap text-xs text-slate-700 font-normal">
                        {formatDisplayDate(t.end_date || t.start_date)}
                      </td>

                      {/* 9. Actions (⋮) */}
                      <td className="py-3.5 px-2 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(t)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer transition-colors"
                          title="Task Options"
                        >
                          <MoreVertical className="w-4 h-4" />
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
      {/* 3. TASK SLIDE-OVER DRAWER (EXACT RECREATION OF SCREENSHOTS 2 & 3)        */}
      {/* ========================================================================= */}
      {isTaskDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-xl md:max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {editingTask ? (
              /* ================================================================= */
              /* A. TASK DETAIL VIEW (SCREENSHOT 2 & 3)                           */
              /* ================================================================= */
              <div className="flex flex-col h-full overflow-hidden bg-white">
                {/* Header (Screenshot 2) */}
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleCloseTaskDrawer}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                      title="Close Drawer"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    {/* Status Indicator (Screenshot 2: ● 1/1 lumpsum (Completed)) */}
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        editingTask.status === 'COMPLETED' ? 'bg-emerald-500' :
                        editingTask.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                        'bg-amber-500'
                      }`} />
                      <span>
                        {editingTask.progress_label || (editingTask.status === 'COMPLETED' ? '1/1 lumpsum' : '0/1 lumpsum')} ({
                          editingTask.status === 'COMPLETED' ? 'Completed' :
                          editingTask.status === 'IN_PROGRESS' ? 'Ongoing' : 'Start'
                        })
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Dropdown Switcher (Screenshot 2: Completed ▾) */}
                    <div className="relative" data-task-dropdown>
                      <button
                        type="button"
                        onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
                        className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                          editingTask.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : editingTask.status === 'IN_PROGRESS'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                            : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
                        }`}
                      >
                        <span>
                          {editingTask.status === 'COMPLETED' ? 'Completed' :
                           editingTask.status === 'IN_PROGRESS' ? 'Ongoing' : 'Start'}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      </button>

                      {isStatusMenuOpen && (
                        <div className="absolute right-0 top-full mt-1.5 w-36 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 text-xs animate-in fade-in duration-100">
                          <button
                            type="button"
                            onClick={() => handleQuickStatusChange('COMPLETED')}
                            className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 text-emerald-800 font-semibold flex items-center gap-2 cursor-pointer"
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>Completed</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickStatusChange('IN_PROGRESS')}
                            className="w-full text-left px-3.5 py-2 hover:bg-blue-50 text-blue-800 font-semibold flex items-center gap-2 cursor-pointer"
                          >
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            <span>Ongoing</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickStatusChange('TODO')}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-800 font-semibold flex items-center gap-2 cursor-pointer"
                          >
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <span>Start</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Options ⋮ */}
                    <div className="relative" data-task-dropdown>
                      <button
                        type="button"
                        onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                        title="Task Actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {isMoreMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 text-xs animate-in fade-in">
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingTitleInline(true);
                              setIsMoreMenuOpen(false);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                            <span>Rename Task</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              proofFileInputRef.current?.click();
                              setIsMoreMenuOpen(false);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                          >
                            <Camera className="w-3.5 h-3.5 text-slate-400" />
                            <span>Attach Proof / Photo</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAssigneeModalOpen(true);
                              setIsMoreMenuOpen(false);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                          >
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>Change Assignee</span>
                          </button>
                          <div className="border-t border-slate-100 my-1" />
                          <button
                            type="button"
                            onClick={() => {
                              handleDeleteTask(editingTask.id);
                              setIsMoreMenuOpen(false);
                              setIsTaskDrawerOpen(false);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 font-semibold"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Task</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Violet Accent Stripe */}
                <div className="h-0.5 bg-indigo-600 w-full shrink-0" />

                {/* Scrollable Upper Area: Title, 6-Box Grid, Dates Card */}
                <div className="shrink-0 bg-white">
                  {/* Task Title (Screenshot 2: Quotation) */}
                  <div className="px-6 pt-4 pb-2">
                    {isEditingTitleInline ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={inlineTitleValue}
                          onChange={(e) => setInlineTitleValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveInlineTitle();
                            if (e.key === 'Escape') setIsEditingTitleInline(false);
                          }}
                          autoFocus
                          className="text-xl font-bold text-slate-900 border-b-2 border-indigo-600 focus:outline-none flex-1 bg-transparent py-0.5"
                        />
                        <button
                          type="button"
                          onClick={handleSaveInlineTitle}
                          className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer"
                          title="Save Name"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingTitleInline(false)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <h2 
                          onClick={() => {
                            setInlineTitleValue(editingTask.title);
                            setIsEditingTitleInline(true);
                          }}
                          className="text-2xl font-extrabold text-slate-900 tracking-tight hover:text-indigo-600 transition-colors cursor-pointer group flex items-center gap-2"
                          title="Click to rename task"
                        >
                          <span>{editingTask.title}</span>
                          <Edit3 className="w-4 h-4 opacity-0 group-hover:opacity-100 text-indigo-500 transition-opacity" />
                        </h2>
                        <button
                          type="button"
                          onClick={() => proofFileInputRef.current?.click()}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer shrink-0 border border-slate-200"
                          title="Upload task photo or proof"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 6-Box Attribute Grid (Screenshot 2) */}
                  <div className="px-6 py-2">
                    <div className="grid grid-cols-3 gap-2.5 p-3 bg-slate-50/70 border border-slate-200/90 rounded-2xl">
                      {/* Box 1: ASSIGN TO */}
                      <div 
                        onClick={() => setIsAssigneeModalOpen(true)}
                        className="p-2.5 bg-white border border-slate-200/80 rounded-xl hover:border-indigo-300 hover:shadow-2xs transition-all cursor-pointer group"
                      >
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          ASSIGN TO
                        </span>
                        <div className="flex items-center gap-1.5">
                          {editingTask.assigned_team && editingTask.assigned_team.length > 0 ? (
                            <div className="flex items-center -space-x-1.5">
                              {editingTask.assigned_team.slice(0, 2).map((m, mIdx) => (
                                <div
                                  key={mIdx}
                                  className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 border-2 border-white flex items-center justify-center text-[10px] font-bold shadow-2xs"
                                  title={m.name}
                                >
                                  {m.initials}
                                </div>
                              ))}
                              {editingTask.assigned_team.length > 2 && (
                                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 border-2 border-white flex items-center justify-center text-[9px] font-bold shadow-2xs">
                                  +{editingTask.assigned_team.length - 2}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                                {(editingTask.assigned_to_name || 'P')[0].toUpperCase()}
                              </div>
                              <span className="text-xs font-semibold text-slate-800 truncate max-w-[65px]">
                                {editingTask.assigned_to_name || 'Pavani'}
                              </span>
                            </div>
                          )}
                          <Plus className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 ml-auto transition-colors" />
                        </div>
                      </div>

                      {/* Box 2: DURATION */}
                      <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          DURATION
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          {editingTask.duration_days || 1} wd
                        </span>
                      </div>

                      {/* Box 3: TO DO */}
                      <div 
                        onClick={() => setIsAddToDoOpen(!isAddToDoOpen)}
                        className="p-2.5 bg-white border border-slate-200/80 rounded-xl hover:border-indigo-300 hover:shadow-2xs transition-all cursor-pointer group"
                      >
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          TO DO
                        </span>
                        {currentTaskMeta.todos && currentTaskMeta.todos.length > 0 ? (
                          <span className="text-xs font-bold text-indigo-600 flex items-center justify-between">
                            <span>{currentTaskMeta.todos.filter(t => t.completed).length}/{currentTaskMeta.todos.length}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-indigo-600 group-hover:underline">
                            + Add To Do
                          </span>
                        )}
                      </div>

                      {/* Box 4: INSPECTION FORM */}
                      <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl cursor-pointer hover:border-slate-300 transition-colors">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          INSPECTION FORM
                        </span>
                        <span className="text-xs font-bold text-slate-600 flex items-center justify-between">
                          <span>0/0</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </span>
                      </div>

                      {/* Box 5: DEPENDENCIES */}
                      <div 
                        onClick={() => setActiveDependencyTask(editingTask)}
                        className="p-2.5 bg-white border border-slate-200/80 rounded-xl hover:border-indigo-300 hover:shadow-2xs transition-all cursor-pointer group"
                      >
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          DEPENDENCIES
                        </span>
                        <span className="text-xs font-bold text-slate-800 flex items-center justify-between">
                          <span>{editingTask.dependencies?.length || 0}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                        </span>
                      </div>

                      {/* Box 6: TAG */}
                      <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          TAG
                        </span>
                        <span className="text-xs font-semibold text-slate-700 truncate block">
                          {editingTask.tag || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expandable To-Do Checklist (Screenshot 2: Subtasks) */}
                  {isAddToDoOpen && (
                    <div className="px-6 py-2 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                            <span>To-Do Checklist ({currentTaskMeta.todos?.filter(t => t.completed).length || 0}/{currentTaskMeta.todos?.length || 0})</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsAddToDoOpen(false)}
                            className="text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer"
                          >
                            Hide
                          </button>
                        </div>

                        {/* Todo items list */}
                        <div className="space-y-1.5 max-h-44 overflow-y-auto">
                          {currentTaskMeta.todos && currentTaskMeta.todos.map((todo) => (
                            <div
                              key={todo.id}
                              className="flex items-center justify-between p-2 bg-white border border-slate-200/70 rounded-xl text-xs hover:border-indigo-200 transition-colors"
                            >
                              <div
                                onClick={() => handleToggleToDo(todo.id)}
                                className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                              >
                                <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors shrink-0 ${
                                  todo.completed ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 hover:border-indigo-500'
                                }`}>
                                  {todo.completed && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span className={`truncate ${todo.completed ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}`}>
                                  {todo.text}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteToDo(todo.id)}
                                className="p-1 text-slate-300 hover:text-red-500 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Add new todo input */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <input
                            type="text"
                            placeholder="Add a new checklist item..."
                            value={newToDoText}
                            onChange={(e) => setNewToDoText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddToDo();
                              }
                            }}
                            className="flex-1 text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800"
                          />
                          <button
                            type="button"
                            onClick={handleAddToDo}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer shrink-0"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dates Card (Screenshot 2: START 30 Sep 26 · END 30 Sep 26) */}
                  <div className="px-6 py-2">
                    <div className="border border-slate-200/90 rounded-2xl p-3.5 bg-white shadow-2xs">
                      <div className="flex items-center justify-between text-xs">
                        <div className="font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-indigo-600" />
                          <span>START {formatDateSnippet(editingTask.start_date)}  ·  END {formatDateSnippet(editingTask.end_date)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsDatesExpanded(!isDatesExpanded)}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isDatesExpanded ? 'Hide dates' : 'View dates'}</span>
                          {isDatesExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {isDatesExpanded && (
                        <div className="pt-3 mt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs animate-in fade-in">
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider mb-0.5">
                              Actual start
                            </span>
                            <span className="font-semibold text-slate-800">
                              {formatDateSnippet(editingTask.actual_start) || '- - -'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider mb-0.5">
                              Actual end
                            </span>
                            <span className="font-semibold text-slate-800">
                              {formatDateSnippet(editingTask.actual_end) || '- - -'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider mb-0.5">
                              Forecast end
                            </span>
                            <span className="font-bold text-red-600">
                              {formatDateSnippet(editingTask.end_date) || '- - -'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3 Tabs Header (Screenshot 2: Progress, Resources, Delay & Status logs) */}
                  <div className="px-6 border-b border-slate-200 mt-2">
                    <div className="flex items-center gap-6">
                      <button
                        type="button"
                        onClick={() => setDrawerTab('progress')}
                        className={`pb-2.5 text-xs font-bold transition-all relative cursor-pointer ${
                          drawerTab === 'progress'
                            ? 'text-indigo-600 border-b-2 border-indigo-600'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Progress
                      </button>
                      <button
                        type="button"
                        onClick={() => setDrawerTab('resources')}
                        className={`pb-2.5 text-xs font-bold transition-all relative cursor-pointer ${
                          drawerTab === 'resources'
                            ? 'text-indigo-600 border-b-2 border-indigo-600'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Resources
                      </button>
                      <button
                        type="button"
                        onClick={() => setDrawerTab('logs')}
                        className={`pb-2.5 text-xs font-bold transition-all relative cursor-pointer ${
                          drawerTab === 'logs'
                            ? 'text-indigo-600 border-b-2 border-indigo-600'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Delay & Status logs
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tab Body */}
                <div className="flex-1 overflow-y-auto bg-slate-50/40">
                  {/* TAB 1: PROGRESS (Screenshot 2) */}
                  {drawerTab === 'progress' && (
                    <div className="p-6 space-y-4">
                      {/* Attached Completion Proof Thumbnail */}
                      {(editingTask.completion_proof_url || formProofUrl) && (
                        <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              ATTACHED COMPLETION PROOF
                            </span>
                            <button
                              type="button"
                              onClick={() => setPreviewProofModal(editingTask.completion_proof_url || formProofUrl)}
                              className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Full Proof</span>
                            </button>
                          </div>
                          <div
                            onClick={() => setPreviewProofModal(editingTask.completion_proof_url || formProofUrl)}
                            className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center cursor-pointer max-h-48"
                          >
                            <img
                              src={editingTask.completion_proof_url || formProofUrl || ''}
                              alt="Task Completion Proof"
                              className="w-full max-h-48 object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                              <Eye className="w-4 h-4" />
                              <span>Click to Preview</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Progress Updates List (Screenshot 2: Dasari Uma Sri Devi · Sep 30, 26 -> 1 lumpsum ✓) */}
                      <div className="space-y-3">
                        {currentTaskMeta.progressUpdates && currentTaskMeta.progressUpdates.length > 0 ? (
                          currentTaskMeta.progressUpdates.map((prog) => (
                            <div
                              key={prog.id}
                              className="p-3.5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shadow-2xs">
                                    {prog.user.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <span className="text-xs font-bold text-slate-900 block leading-tight">
                                      {prog.user}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {prog.date}
                                    </span>
                                  </div>
                                </div>
                                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[11px] font-bold">
                                  {prog.amount}
                                </span>
                              </div>
                              {prog.note && (
                                <p className="text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                                  {prog.note}
                                </p>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="py-8 text-center text-slate-400 text-xs italic bg-white rounded-2xl border border-dashed border-slate-200">
                            No progress logs recorded yet. Click "+ Progress" below to record progress.
                          </div>
                        )}
                      </div>

                      {/* Discussion Messages */}
                      {currentTaskMeta.messages && currentTaskMeta.messages.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/70 space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            DISCUSSION FEED
                          </span>
                          <div className="space-y-2">
                            {currentTaskMeta.messages.map((m) => (
                              <div key={m.id} className="p-3 bg-white border border-slate-200/70 rounded-xl text-xs space-y-1 shadow-2xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-800">{m.user}</span>
                                  <span className="text-[10px] text-slate-400">{m.time}</span>
                                </div>
                                <p className="text-slate-600">{m.text}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: RESOURCES (SCREENSHOT 3: Material, Workforce, Equipment) */}
                  {drawerTab === 'resources' && (
                    <div className="p-6 space-y-4">
                      {/* Accordion 1: Material (Screenshot 3) */}
                      <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-2xs">
                        <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setExpandedResources(prev => ({ ...prev, material: !prev.material }))}
                            className="flex items-center gap-2 text-xs font-bold text-slate-800 hover:text-indigo-600 cursor-pointer"
                          >
                            {expandedResources.material ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                            <span>Material</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveResourceModal('material')}
                            className="px-2.5 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                          >
                            [Add]
                          </button>
                        </div>

                        {expandedResources.material && (
                          <div className="p-4">
                            {currentTaskMeta.materials && currentTaskMeta.materials.length > 0 ? (
                              <div className="space-y-2">
                                {currentTaskMeta.materials.map((m) => (
                                  <div key={m.id} className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                      <Package className="w-4 h-4 text-amber-600" />
                                      <div>
                                        <span className="font-bold text-slate-800 block">{m.name}</span>
                                        <span className="text-[11px] text-slate-500">{m.quantity} {m.unit}</span>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMaterial(m.id)}
                                      className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                                      title="Remove Material"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-slate-400 text-xs italic">
                                No material resources added yet.
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Accordion 2: Workforce (Screenshot 3) */}
                      <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-2xs">
                        <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setExpandedResources(prev => ({ ...prev, workforce: !prev.workforce }))}
                            className="flex items-center gap-2 text-xs font-bold text-slate-800 hover:text-indigo-600 cursor-pointer"
                          >
                            {expandedResources.workforce ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                            <span>Workforce</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveResourceModal('workforce')}
                            className="px-2.5 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                          >
                            [Add]
                          </button>
                        </div>

                        {expandedResources.workforce && (
                          <div className="p-4">
                            {currentTaskMeta.workforce && currentTaskMeta.workforce.length > 0 ? (
                              <div className="space-y-2">
                                {currentTaskMeta.workforce.map((w) => (
                                  <div key={w.id} className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                      <HardHat className="w-4 h-4 text-blue-600" />
                                      <div>
                                        <span className="font-bold text-slate-800 block">{w.role}</span>
                                        <span className="text-[11px] text-slate-500">{w.count} Workers</span>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteWorkforce(w.id)}
                                      className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                                      title="Remove Workforce"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-slate-400 text-xs italic">
                                No workforce resources added yet.
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Accordion 3: Equipment (Screenshot 3) */}
                      <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-2xs">
                        <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setExpandedResources(prev => ({ ...prev, equipment: !prev.equipment }))}
                            className="flex items-center gap-2 text-xs font-bold text-slate-800 hover:text-indigo-600 cursor-pointer"
                          >
                            {expandedResources.equipment ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                            <span>Equipment</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveResourceModal('equipment')}
                            className="px-2.5 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                          >
                            [Add]
                          </button>
                        </div>

                        {expandedResources.equipment && (
                          <div className="p-4">
                            {currentTaskMeta.equipment && currentTaskMeta.equipment.length > 0 ? (
                              <div className="space-y-2">
                                {currentTaskMeta.equipment.map((eq) => (
                                  <div key={eq.id} className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                      <Truck className="w-4 h-4 text-purple-600" />
                                      <div>
                                        <span className="font-bold text-slate-800 block">{eq.name}</span>
                                        <span className="text-[11px] text-slate-500">{eq.count} Units</span>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteEquipment(eq.id)}
                                      className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                                      title="Remove Equipment"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-slate-400 text-xs italic">
                                No equipment resources added yet.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: DELAY & STATUS LOGS */}
                  {drawerTab === 'logs' && (
                    <div className="p-6 space-y-4">
                      <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                        {currentTaskMeta.statusLogs && currentTaskMeta.statusLogs.length > 0 ? (
                          currentTaskMeta.statusLogs.map((log) => (
                            <div key={log.id} className="relative">
                              <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-indigo-600 border-2 border-white shadow-2xs" />
                              <div className="p-3.5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs text-xs space-y-1">
                                <span className="font-bold text-slate-800 block">{log.text}</span>
                                <span className="text-[10px] text-slate-400">
                                  {log.user ? `by ${log.user} · ` : ''}{log.timestamp}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-slate-400 text-xs italic bg-white p-4 rounded-xl border border-slate-200">
                            No logs recorded yet.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sticky Bottom Action Bar (Screenshot 2: + Progress, Enter Message..., Camera, Options) */}
                <div className="p-4 border-t border-slate-200 bg-white flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setProgressAmountInput(editingTask.status === 'COMPLETED' ? '1 lumpsum' : '1 lumpsum');
                      setProgressIsCompleted(true);
                      setIsProgressModalOpen(true);
                    }}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Progress</span>
                  </button>

                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Enter Message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white text-slate-800 placeholder-slate-400"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => proofFileInputRef.current?.click()}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-xl cursor-pointer transition-colors shrink-0"
                    title="Attach photo/proof"
                  >
                    <Camera className="w-4 h-4" />
                  </button>

                  {messageInput.trim() ? (
                    <button
                      type="button"
                      onClick={handleSendMessage}
                      className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer transition-colors shrink-0"
                      title="Send Message"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors border border-slate-200 shrink-0"
                      title="Options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* ================================================================= */
              /* B. CREATE NEW TASK FORM (WHEN CLICKING + Task)                   */
              /* ================================================================= */
              <div className="flex flex-col h-full overflow-hidden bg-white">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <div>
                    <span className={`text-[10px] font-bold ${isAddingSubtask ? 'text-[#704fe6]' : 'text-red-600'} uppercase tracking-wider block`}>
                      {isAddingSubtask ? 'ADDING SUB TASK' : 'CREATE NEW TASK'}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                      {isAddingSubtask ? 'New Subtask' : 'New Project Work Item'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSaveTask}
                      className="px-4 py-1.5 bg-[#704fe6] hover:bg-[#5f3dc4] text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseTaskDrawer}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Red Accent Stripe */}
                <div className={`h-1 ${isAddingSubtask ? 'bg-[#704fe6]' : 'bg-red-600'} w-full shrink-0`} />

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
                      placeholder="e.g. Quotation or Soil Investigation"
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

                  {/* Department Assignment */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Department Assignment <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      value={formDepartment}
                      onChange={(val) => setFormDepartment(val as any)}
                      options={[
                        { label: 'Material Testing', value: 'MATERIAL_TESTING' },
                        { label: 'Structural', value: 'STRUCTURAL' },
                        { label: 'Soil Investigation', value: 'SOIL_INVESTIGATION' },
                        { label: 'Architecture', value: 'ARCHITECTURE' },
                        { label: 'Construction', value: 'CONSTRUCTION' },
                        { label: 'Survey', value: 'SURVEY' },
                        { label: 'Accounts & Finance', value: 'ACCOUNTS' },
                        { label: 'Marketing', value: 'MARKETING' },
                        { label: 'Government Projects', value: 'GOVERNMENT_PROJECT' },
                        { label: 'Art & Sculpture', value: 'ART_SCULPTURE' },
                      ]}
                      size="md"
                      variant="brand"
                    />
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

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
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
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden File Input for proof / camera upload */}
      <input
        type="file"
        ref={proofFileInputRef}
        accept="image/*,.pdf,.dwg"
        onChange={handleProofFileChange}
        className="hidden"
      />

      {/* ========================================================================= */}
      {/* 3A. MODAL: UPDATE PROGRESS (+ Progress Button)                            */}
      {/* ========================================================================= */}
      {isProgressModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-900">Record Task Progress</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsProgressModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Progress Amount / Percentage
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1 lumpsum or 100%"
                  value={progressAmountInput}
                  onChange={(e) => setProgressAmountInput(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Update Note / Remarks
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Quotation estimation submitted and approved by client."
                  value={progressNoteInput}
                  onChange={(e) => setProgressNoteInput(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 resize-none text-slate-900"
                />
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center gap-2 cursor-pointer"
                   onClick={() => setProgressIsCompleted(!progressIsCompleted)}>
                <input
                  type="checkbox"
                  checked={progressIsCompleted}
                  onChange={(e) => setProgressIsCompleted(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                />
                <span className="text-xs font-bold text-emerald-800">
                  Mark task status as Completed (100%)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsProgressModalOpen(false)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProgressUpdate}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              >
                Save Progress
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3B. MODAL: ADD RESOURCE (MATERIAL / WORKFORCE / EQUIPMENT)                 */}
      {/* ========================================================================= */}
      {activeResourceModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                {activeResourceModal === 'material' ? <Package className="w-5 h-5 text-amber-600" /> :
                 activeResourceModal === 'workforce' ? <HardHat className="w-5 h-5 text-blue-600" /> :
                 <Truck className="w-5 h-5 text-purple-600" />}
                <h4 className="text-sm font-bold text-slate-900">
                  {activeResourceModal === 'material' ? 'Add Material Resource' :
                   activeResourceModal === 'workforce' ? 'Add Workforce Trade' :
                   'Add Equipment Resource'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveResourceModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {activeResourceModal === 'material' && (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Material Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ultratech Cement 53G, Sand, TMT Steel"
                      value={resMatName}
                      onChange={(e) => setResMatName(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Quantity *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 50"
                        value={resMatQty}
                        onChange={(e) => setResMatQty(e.target.value)}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Unit
                      </label>
                      <select
                        value={resMatUnit}
                        onChange={(e) => setResMatUnit(e.target.value)}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900"
                      >
                        <option value="Bags">Bags</option>
                        <option value="MT">MT (Tons)</option>
                        <option value="cu.m">cu.m (m³)</option>
                        <option value="Trucks">Trucks</option>
                        <option value="Nos">Nos</option>
                        <option value="kg">kg</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {activeResourceModal === 'workforce' && (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Trade / Role *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mason, Barbender, Helper, Carpenter"
                      value={resWorkRole}
                      onChange={(e) => setResWorkRole(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Worker Headcount *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={resWorkCount}
                      onChange={(e) => setResWorkCount(Math.max(1, Number(e.target.value)))}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900"
                    />
                  </div>
                </>
              )}

              {activeResourceModal === 'equipment' && (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Equipment Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. JCB 3DX Excavator, Concrete Mixer, Crane"
                      value={resEquipName}
                      onChange={(e) => setResEquipName(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Units Count *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={resEquipCount}
                      onChange={(e) => setResEquipCount(Math.max(1, Number(e.target.value)))}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveResourceModal(null)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activeResourceModal === 'material') handleAddMaterial();
                  if (activeResourceModal === 'workforce') handleAddWorkforce();
                  if (activeResourceModal === 'equipment') handleAddEquipment();
                }}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              >
                Add Resource
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3C. MODAL: ASSIGN STAFF MEMBER                                            */}
      {/* ========================================================================= */}
      {isAssigneeModalOpen && editingTask && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-900">Assign Staff Member</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsAssigneeModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {['Pavani', 'Likson', 'Karthik', 'Suresh', 'Dinesh', 'Mohan', 'Madhan', 'Dasari Uma Sri Devi'].map((member) => (
                <button
                  key={member}
                  type="button"
                  onClick={() => {
                    const updated = {
                      ...editingTask,
                      assigned_to_name: member,
                      assigned_team: [{ name: member, initials: member.slice(0, 2).toUpperCase() }]
                    };
                    setEditingTask(updated);
                    setTaskList(prev => prev.map(t => t.id === editingTask.id ? updated : t));
                    setIsAssigneeModalOpen(false);
                    onShowToast?.(`Assigned to ${member}`);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors cursor-pointer ${
                    (editingTask.assigned_to_name === member)
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-600">
                      {member.slice(0, 2).toUpperCase()}
                    </div>
                    <span>{member}</span>
                  </div>
                  {editingTask.assigned_to_name === member && (
                    <Check className="w-4 h-4 text-indigo-600" />
                  )}
                </button>
              ))}
            </div>
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
                        <span className="tracking-tight text-slate-400 text-[10px]">#{other.s_no}</span>
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

      {/* ========================================================================= */}
      {/* 6. "CHANGE TO ONGOING" MODAL (TRIGGERED FROM "START" BUTTON)              */}
      {/* ========================================================================= */}
      {startingTask && (
        <div 
          onClick={handleCloseStartModal}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-1">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                Change to Ongoing
              </h3>
              <button
                type="button"
                onClick={handleCloseStartModal}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Field: ACTUAL START DATE * */}
            <fieldset className="border border-purple-200/90 rounded-2xl px-4 pt-1.5 pb-2.5 relative focus-within:border-[#6440db] transition-colors">
              <legend className="text-[11px] font-bold text-slate-400 px-1 uppercase tracking-wider">
                ACTUAL START DATE <span className="text-red-500">*</span>
              </legend>
              <div className="flex items-center gap-3 mt-0.5">
                <Calendar className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                  type="date"
                  value={actualStartDateInput}
                  onChange={(e) => setActualStartDateInput(e.target.value)}
                  className="w-full text-slate-800 text-sm font-medium outline-none bg-transparent cursor-pointer"
                />
              </div>
            </fieldset>

            {/* Field: COMMENT */}
            <fieldset className="border border-purple-200/90 rounded-2xl px-4 pt-1.5 pb-2.5 relative focus-within:border-[#6440db] transition-colors">
              <legend className="text-[11px] font-bold text-slate-400 px-1 uppercase tracking-wider">
                COMMENT
              </legend>
              <textarea
                rows={4}
                value={startCommentInput}
                onChange={(e) => setStartCommentInput(e.target.value)}
                placeholder="Add a note..."
                className="w-full text-slate-800 text-sm outline-none bg-transparent resize-none placeholder:text-slate-400 font-normal leading-relaxed mt-0.5"
              />
            </fieldset>

            {/* Info Notice Box */}
            <div className="p-4 rounded-xl bg-[#f0f9ff] text-sky-900 flex items-start gap-3 border border-sky-100/80">
              <Info className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
              <p className="text-xs text-sky-900 font-normal leading-relaxed">
                Task is moving to Ongoing. Enter the date work actually started on site — you can backdate.
              </p>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveStartModal}
                className="px-7 py-2.5 bg-[#6440db] hover:bg-[#5333bf] text-white font-semibold text-sm rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
