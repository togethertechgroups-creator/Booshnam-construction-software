import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, CheckCircle2, Clock, AlertCircle, FileText, 
  Calendar, Layers, Flag, Download, Check, Search, 
  ThumbsUp, ShoppingCart, ListTodo, ArrowLeft, Pin, 
  MoreVertical, Bell, Settings,
  User, ExternalLink, ChevronRight, Filter, TrendingUp,
  CheckSquare, Sparkles, Phone, Mail, MapPin, Briefcase,
  DollarSign, PlusCircle, UserCheck, ShieldCheck, X, Users, Edit2
} from 'lucide-react';
import { Project, WBSTask, ApprovalRequest, MaterialRequest, ProjectTeamMember, PredefinedTaskTemplate, Department } from '../types';
import { ProjectTopNav, WorkspaceTabId } from '../components/project-workspace/ProjectTopNav';
import { ProjectSettingsModal } from '../components/project-workspace/ProjectSettingsModal';
import { ProjectTeamModal } from '../components/project-workspace/ProjectTeamModal';
import { FeedbackModal } from '../components/project-workspace/FeedbackModal';
import { DashboardTab } from '../components/project-workspace/tabs/DashboardTab';
import { DesignTab } from '../components/project-workspace/tabs/DesignTab';
import { BOQTab } from '../components/project-workspace/tabs/BOQTab';
import { PartyTab } from '../components/project-workspace/tabs/PartyTab';
import { TransactionTab } from '../components/project-workspace/tabs/TransactionTab';
import { ToDoTab } from '../components/project-workspace/tabs/ToDoTab';
import { TaskTab } from '../components/project-workspace/tabs/TaskTab';
import { AttendanceTab } from '../components/project-workspace/tabs/AttendanceTab';
import { MaterialTab } from '../components/project-workspace/tabs/MaterialTab';
import { SubconTab } from '../components/project-workspace/tabs/SubconTab';
import { EquipmentTab } from '../components/project-workspace/tabs/EquipmentTab';
import { FilesTab } from '../components/project-workspace/tabs/FilesTab';
import { MOMTab } from '../components/project-workspace/tabs/MOMTab';
import { SelectOrTypeInput, SelectOption } from '../components/SelectOrTypeInput';
import { CustomSelect } from '../components/CustomSelect';
import { UserProfileDropdown } from '../components/UserProfileDropdown';
import { PREDEFINED_TASKS_TEMPLATE, formatProjectTitle } from '../lib/mockData';
import { getStaffMembers, getStaffTeamOptions, StaffMember } from '../lib/staffService';
import { addNotification } from '../lib/notificationService';
import { confirmAction, setFormDirty, clearFormDirty } from '../lib/dialogService';
import { 
  ORGANIZATION_DEPARTMENTS, 
  getActiveDepartmentId, 
  setActiveDepartmentId, 
  normalizeDepartmentId, 
  getIndividualDepartments 
} from '../lib/departmentService';
import { DepartmentLogo } from '../components/DepartmentLogo';

interface ProjectsViewProps {
  projects?: Project[];
  setProjects?: React.Dispatch<React.SetStateAction<Project[]>>;
  project?: Project | null;
  selectedProject?: Project | null;
  onSelectProject?: (p: Project | null) => void;
  tasks?: WBSTask[];
  setTasks?: React.Dispatch<React.SetStateAction<WBSTask[]>>;
  approvals?: ApprovalRequest[];
  materialRequests?: MaterialRequest[];
  canViewCost?: boolean;
  onNavigate?: (view: string) => void;
  onShowToast?: (msg: string) => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

// Helper options for project assignment are dynamically derived from staffService

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects: propProjects,
  setProjects,
  selectedProject: propSelectedProject,
  project,
  onSelectProject,
  tasks = [],
  setTasks,
  approvals = [],
  materialRequests = [],
  canViewCost = true,
  onNavigate,
  onShowToast,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  // Navigation / View Modes: 'list' | 'create' | 'details'
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'details'>('list');
  const [activeProject, setActiveProject] = useState<Project | null>(propSelectedProject || project || null);
  const [detailTab, setDetailTab] = useState<'overview' | 'wbs' | 'gantt' | 'drawings'>('overview');
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTabId>('dashboard');
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  // Filter & Search states for Projects list
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [stageFilter, setStageFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());

  // Active Department State (Synchronized with global switcher)
  const [activeDeptId, setActiveDeptId] = useState<string>(() => getActiveDepartmentId());

  useEffect(() => {
    const handleDeptChange = (e: any) => {
      const newId = e.detail || getActiveDepartmentId();
      setActiveDeptId(newId);
    };
    window.addEventListener('booshnam_active_dept_changed', handleDeptChange);
    return () => window.removeEventListener('booshnam_active_dept_changed', handleDeptChange);
  }, []);

  // Wizard state for Creating Project
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [newProjectName, setNewProjectName] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newEstimatedBudget, setNewEstimatedBudget] = useState('0');
  const [newDepartment, setNewDepartment] = useState<string>(() => {
    const current = getActiveDepartmentId();
    return current === 'booshnam_associates' ? 'CONSTRUCTION' : current;
  });
  const [newProjectType, setNewProjectType] = useState('Residential Construction');

  useEffect(() => {
    if (activeDeptId !== 'booshnam_associates') {
      setNewDepartment(activeDeptId);
    }
  }, [activeDeptId]);
  const [selectedPM, setSelectedPM] = useState('');
  const [selectedEngineer, setSelectedEngineer] = useState('');
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState('');
  const [wizardTasks, setWizardTasks] = useState<PredefinedTaskTemplate[]>(() => [...PREDEFINED_TASKS_TEMPLATE]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>(() =>
    PREDEFINED_TASKS_TEMPLATE.map(t => t.id)
  );
  const [editingTask, setEditingTask] = useState<PredefinedTaskTemplate | null>(null);
  const [isAddingCustomTask, setIsAddingCustomTask] = useState(false);
  const [customTaskForm, setCustomTaskForm] = useState<{
    title: string;
    department: Department;
    default_priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    description: string;
  }>({
    title: '',
    department: 'CONSTRUCTION',
    default_priority: 'MEDIUM',
    description: ''
  });
  const [wizardError, setWizardError] = useState('');

  // Dynamic Staff Directory State
  const [staffList, setStaffList] = useState<StaffMember[]>(() => getStaffMembers());

  useEffect(() => {
    const handleStaffUpdate = () => setStaffList(getStaffMembers());
    window.addEventListener('booshnam_staff_updated', handleStaffUpdate);
    return () => window.removeEventListener('booshnam_staff_updated', handleStaffUpdate);
  }, []);

  const pmOptions = useMemo(() => getStaffTeamOptions('PM', staffList), [staffList]);
  const engineerOptions = useMemo(() => getStaffTeamOptions('ENGINEER', staffList), [staffList]);
  const supervisorOptions = useMemo(() => getStaffTeamOptions('SUPERVISOR', staffList), [staffList]);
  const accountsOptions = useMemo(() => getStaffTeamOptions('ACCOUNTS', staffList), [staffList]);
  const allStaffOptions = useMemo(() => getStaffTeamOptions('ALL', staffList), [staffList]);

  // Additional Team Members in Step 2 of wizard
  const [additionalTeam, setAdditionalTeam] = useState<Array<{ name: string; role: string; phone?: string; email?: string }>>([]);
  const [extraMemberName, setExtraMemberName] = useState('');
  const [extraMemberRole, setExtraMemberRole] = useState('');
  const [showAddExtraMember, setShowAddExtraMember] = useState(false);

  const handleAddExtraMember = () => {
    if (!extraMemberName.trim()) return;
    const found = staffList.find(s => s.name.toLowerCase().trim() === extraMemberName.toLowerCase().trim());
    const roleToUse = extraMemberRole.trim() || found?.designation || found?.role_name || 'Project Staff';
    setAdditionalTeam(prev => [
      ...prev,
      {
        name: extraMemberName.trim(),
        role: roleToUse,
        phone: found?.phone ? `+91 ${found.phone}` : undefined,
        email: found?.email
      }
    ]);
    setExtraMemberName('');
    setExtraMemberRole('');
    setShowAddExtraMember(false);
  };

  // Local projects fallback with persistent localStorage support
  const [localProjects, setLocalProjects] = useState<Project[]>(() => {
    if (propProjects && propProjects.length > 0) return propProjects;
    try {
      const saved = localStorage.getItem('booshnam_projects_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const allProjects = (propProjects && propProjects.length > 0) ? propProjects : localProjects;

  // Listen for project updates from other tabs or components
  useEffect(() => {
    const handleProjectsUpdated = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setLocalProjects(e.detail);
      }
    };
    window.addEventListener('booshnam_projects_updated', handleProjectsUpdated);
    return () => window.removeEventListener('booshnam_projects_updated', handleProjectsUpdated);
  }, []);

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('siteops_user');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return { first_name: 'Priya', role_name: 'Owner / Director', role_code: 'SUPER_ADMIN' };
  });

  useEffect(() => {
    const handleUserUpdate = (e: any) => {
      if (e.detail) setCurrentUser(e.detail);
    };
    window.addEventListener('siteops_user_updated', handleUserUpdate);
    return () => window.removeEventListener('siteops_user_updated', handleUserUpdate);
  }, []);

  const handleUpdateProjects = (newProjs: Project[]) => {
    try {
      localStorage.setItem('booshnam_projects_v2', JSON.stringify(newProjs));
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('booshnam_projects_updated', { detail: newProjs }));
    if (setProjects) {
      setProjects(newProjs);
    }
    setLocalProjects(newProjs);
  };

  // Toggle Pin
  const togglePin = (projId: string) => {
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(projId)) {
        next.delete(projId);
        onShowToast?.('Project unpinned');
      } else {
        next.add(projId);
        onShowToast?.('Project pinned to top');
      }
      return next;
    });
  };

  const isSuperOrAdmin = !currentUser.role_code || 
    currentUser.role_code === 'SUPER_ADMIN' || 
    currentUser.role_code === 'ADMIN' || 
    currentUser.role_name === 'Owner / Director' ||
    currentUser.role_name?.toLowerCase().includes('admin') ||
    currentUser.first_name?.toLowerCase() === 'priya' ||
    currentUser.first_name?.toLowerCase() === 'rajesh';

  const currentStaffName = (currentUser.first_name || '').toLowerCase().trim();

  // Helper to dynamically calculate live tasks, progress %, and pending todos for any project
  const getProjectLiveStats = (p: Project) => {
    let projTasks = tasks.filter(t => t.project === p.id || t.project_id === p.id);
    if (projTasks.length === 0) {
      try {
        const saved = localStorage.getItem(`booshnam_wbs_tasks_v2_${p.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            projTasks = parsed;
          }
        }
      } catch (e) {}
    }
    const total = projTasks.length > 0 ? projTasks.length : (p.tasks_count || 0);
    const completed = projTasks.filter(t => t.status === 'COMPLETED').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : (p.progress_percentage || 0);
    const todo = projTasks.length > 0 ? Math.max(0, total - completed) : (p.todo_count ?? 0);
    const status = progress === 100 && total > 0 ? 'COMPLETED' : (p.status || 'ACTIVE');
    return { total, completed, progress, todo, status };
  };

  // Phonetic and typo-tolerant search match (e.g. "hotal" matches "hotel")
  const isFuzzyMatch = (target: string, query: string): boolean => {
    if (!query) return true;
    const t = target.toLowerCase();
    const q = query.toLowerCase().trim();
    if (!q) return true;
    if (t.includes(q)) return true;

    // Vowel equivalence normalization (e.g. hotel <-> hotal, hostel <-> hostal)
    const normT = t.replace(/[aeiou]/g, '_');
    const normQ = q.replace(/[aeiou]/g, '_');
    if (normT.includes(normQ)) return true;

    // Word token fuzzy matching with 1-char difference tolerance
    const words = t.split(/[\s\-()]+/);
    for (const word of words) {
      if (Math.abs(word.length - q.length) <= 1 && word.length >= 3) {
        let diff = 0;
        let i = 0, j = 0;
        while (i < word.length && j < q.length) {
          if (word[i] !== q[j]) {
            diff++;
            if (word.length > q.length) i++;
            else if (q.length > word.length) j++;
            else { i++; j++; }
          } else {
            i++; j++;
          }
        }
        diff += (word.length - i) + (q.length - j);
        if (diff <= 1) return true;
      }
    }
    return false;
  };

  // Filtered and Sorted Projects (Super Admin sees all; other staff see only assigned projects)
  const filteredProjects = useMemo(() => {
    return allProjects.filter(p => {
      // 1. Staff Access Filter: If non-admin, must be in assigned_team or assigned to tasks in that project
      if (!isSuperOrAdmin && currentStaffName) {
        const isAssigned = p.assigned_team?.some(m => 
          m.name.toLowerCase().trim().includes(currentStaffName) || 
          currentStaffName.includes(m.name.toLowerCase().trim())
        );
        const hasAssignedTask = tasks.some(t => 
          (t.project === p.id || t.project_id === p.id) && 
          ((t.assigned_to_name && t.assigned_to_name.toLowerCase().includes(currentStaffName)) || 
           (t.assigned_to && t.assigned_to.toLowerCase().includes(currentStaffName)))
        );
        if (!isAssigned && !hasAssignedTask) {
          return false;
        }
      }

      // Search with typo & vowel tolerance
      if (searchQuery.trim()) {
        const matchesName = isFuzzyMatch(p.name, searchQuery);
        const matchesCode = isFuzzyMatch(p.code, searchQuery);
        const matchesClient = isFuzzyMatch(p.client_name || '', searchQuery);
        const matchesLoc = isFuzzyMatch(p.location || '', searchQuery);
        const matchesCity = isFuzzyMatch(p.city || '', searchQuery);
        if (!matchesName && !matchesCode && !matchesClient && !matchesLoc && !matchesCity) {
          return false;
        }
      }

      // Status
      if (statusFilter !== 'All') {
        const stats = getProjectLiveStats(p);
        const currentStat = (stats.status || p.status || 'ACTIVE').toUpperCase();
        if (currentStat !== statusFilter.toUpperCase()) return false;
      }

      // Stage
      if (stageFilter !== 'All') {
        const pStage = p.stage || 'Planning & Mobilization';
        if (stageFilter === 'Planning & Mobilization') {
          if (pStage !== 'Planning & Mobilization' && pStage !== 'Planning') return false;
        } else if (pStage !== stageFilter) {
          return false;
        }
      }

      // Category
      if (categoryFilter !== 'All') {
        const pCat = (p.category || 'Residential').toLowerCase();
        const pType = (p.project_type || '').toLowerCase();
        const targetCat = categoryFilter.toLowerCase();
        const matchesCat = pCat.includes(targetCat) || pType.includes(targetCat);
        if (!matchesCat) return false;
      }

      // Active Department Filter (When specific department is selected in switcher)
      if (activeDeptId !== 'booshnam_associates') {
        const pDept = normalizeDepartmentId(p.department as string);
        if (pDept !== activeDeptId) return false;
      }

      return true;
    }).sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });
  }, [allProjects, searchQuery, statusFilter, stageFilter, categoryFilter, pinnedIds, isSuperOrAdmin, currentStaffName, tasks, activeDeptId]);


  // Handle open project details
  const handleOpenProjectDetails = (p: Project) => {
    setActiveProject(p);
    onSelectProject?.(p);
    setWorkspaceTab('dashboard');
    setViewMode('details');
  };

  // Handle Wizard Proceed
  const handleWizardContinueToStep2 = () => {
    if (!newProjectName.trim()) {
      setWizardError('Please enter a Project Name');
      return;
    }
    setWizardError('');
    setWizardStep(2);
  };

  const handleWizardContinueToStep3 = () => {
    setWizardStep(3);
  };

  const toggleTaskSelection = (taskId: number) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const selectAllTasks = () => {
    setSelectedTaskIds(wizardTasks.map(t => t.id));
  };

  const deselectAllTasks = () => {
    setSelectedTaskIds([]);
  };

  const handleSaveEditedTask = (updated: PredefinedTaskTemplate) => {
    setWizardTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    setEditingTask(null);
    onShowToast?.(`Task "${updated.title}" updated successfully`);
  };

  const handleAddCustomPredefinedTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customTaskForm.title.trim()) return;
    const newId = Math.max(...wizardTasks.map(t => t.id), 0) + 1;
    const newTask: PredefinedTaskTemplate = {
      id: newId,
      code: `PRE-${newId}`,
      title: customTaskForm.title.trim(),
      department: customTaskForm.department,
      default_priority: customTaskForm.default_priority,
      description: customTaskForm.description.trim() || `Custom task for ${customTaskForm.department}`
    };
    setWizardTasks(prev => [...prev, newTask]);
    setSelectedTaskIds(prev => [...prev, newId]);
    setIsAddingCustomTask(false);
    setCustomTaskForm({
      title: '',
      department: 'CONSTRUCTION',
      default_priority: 'MEDIUM',
      description: ''
    });
    onShowToast?.(`Added task "${newTask.title}"`);
  };

  // Track dirty form state for Project Wizard
  useEffect(() => {
    if (viewMode === 'create') {
      const isDirty = Boolean(newProjectName.trim() || newClientName.trim() || newAddress.trim() || selectedPM || selectedEngineer);
      setFormDirty(isDirty, 'Project Details');
    } else {
      clearFormDirty();
    }
  }, [viewMode, newProjectName, newClientName, newAddress, selectedPM, selectedEngineer]);

  const handleCancelWizard = async () => {
    const isDirty = Boolean(newProjectName.trim() || newClientName.trim() || newAddress.trim() || selectedPM || selectedEngineer);
    if (isDirty) {
      const canLeave = await confirmAction({
        title: 'Leave Project Wizard?',
        message: 'Are you sure you want to leave this page?\nYour entered data will be lost.',
        confirmText: 'Leave',
        cancelText: 'Stay in Wizard',
        variant: 'warning',
        icon: 'alert'
      });
      if (!canLeave) return;
    }
    clearFormDirty();
    setNewProjectName('');
    setNewClientName('');
    setNewAddress('');
    setNewCity('');
    setNewEstimatedBudget('0');
    setSelectedPM('');
    setSelectedEngineer('');
    setSelectedSupervisor('');
    setSelectedAccounts('');
    setWizardError('');
    setWizardStep(1);
    setViewMode('list');
  };

  // Handle Wizard Create Finish
  const handleWizardSubmit = async () => {
    const cleanProjName = newProjectName.trim() || 'New Project';
    const activeTasksCount = wizardTasks.filter(t => selectedTaskIds.includes(t.id)).length;

    // User requested confirmation popup before assigning/creating project
    const confirmed = await confirmAction({
      title: 'Create & Assign Project',
      message: `Are you sure you want to create project "${cleanProjName}" and assign it to ${selectedPM ? `${selectedPM} (PM)` : 'the designated project team'} with ${activeTasksCount} initial tasks?`,
      confirmText: 'Create & Assign',
      cancelText: 'Review Form',
      variant: 'primary',
      icon: 'info'
    });
    if (!confirmed) return;

    clearFormDirty();

    const nextNum = 2484 + Math.floor(Math.random() * 50);
    const code = `RG33-BAGJ-${nextNum}`;
    const initials = newProjectName.slice(0, 2).toUpperCase() || 'PR';

    const assignedTeam: ProjectTeamMember[] = [];
    const findStaff = (nameStr: string) => staffList.find(s => s.name.toLowerCase().trim() === nameStr.toLowerCase().trim());

    if (selectedPM.trim()) {
      const s = findStaff(selectedPM);
      assignedTeam.push({
        id: s?.id || `team-pm-${Date.now()}`,
        name: selectedPM.trim(),
        role: s?.designation || s?.role_name || 'Project Manager',
        phone: s?.phone ? `+91 ${s.phone}` : '+91 98401 23456',
        email: s?.email || 'pm@siteops.io'
      });
    }
    if (selectedEngineer.trim()) {
      const s = findStaff(selectedEngineer);
      assignedTeam.push({
        id: s?.id || `team-eng-${Date.now()}`,
        name: selectedEngineer.trim(),
        role: s?.designation || s?.role_name || 'Site Engineer',
        phone: s?.phone ? `+91 ${s.phone}` : '+91 94440 06047',
        email: s?.email || 'engineer@siteops.io'
      });
    }
    if (selectedSupervisor.trim()) {
      const s = findStaff(selectedSupervisor);
      assignedTeam.push({
        id: s?.id || `team-sup-${Date.now()}`,
        name: selectedSupervisor.trim(),
        role: s?.designation || s?.role_name || 'Site Supervisor',
        phone: s?.phone ? `+91 ${s.phone}` : '+91 98408 12345',
        email: s?.email || 'supervisor@siteops.io'
      });
    }
    if (selectedAccounts.trim()) {
      const s = findStaff(selectedAccounts);
      assignedTeam.push({
        id: s?.id || `team-acc-${Date.now()}`,
        name: selectedAccounts.trim(),
        role: s?.designation || s?.role_name || 'Accounts',
        phone: s?.phone ? `+91 ${s.phone}` : '+91 98403 45678',
        email: s?.email || 'accounts@siteops.io'
      });
    }
    // Also include any additional team members added in Step 2:
    additionalTeam.forEach((extra, idx) => {
      if (!extra.name.trim()) return;
      const s = findStaff(extra.name);
      assignedTeam.push({
        id: s?.id || `team-extra-${Date.now()}-${idx}`,
        name: extra.name.trim(),
        role: extra.role.trim() || s?.designation || s?.role_name || 'Project Staff',
        phone: extra.phone || (s?.phone ? `+91 ${s.phone}` : undefined),
        email: extra.email || s?.email
      });
    });

    const newProjId = `p-${Date.now()}`;
    const budgetNum = parseFloat(newEstimatedBudget) || 0;

    // Generate WBSTasks for the non-excluded predefined tasks (Requirement Section 1 & 2)
    const activeTasks = wizardTasks.filter(t => selectedTaskIds.includes(t.id));
    const generatedTasks: WBSTask[] = activeTasks.map((pt, idx) => {
      const taskAssignee = pt.department === 'SOIL_INVESTIGATION' ? (selectedEngineer || 'Site Engineer') : (selectedPM || 'Project Lead');
      return {
        id: `task-${Date.now()}-${pt.id}`,
        project: newProjId,
        project_id: newProjId,
        title: pt.title,
        name: pt.title,
        wbs_code: `1.${idx + 1}`,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        duration_days: 14,
        description: pt.description,
        department: pt.department,
        status: 'TODO',
        priority: pt.default_priority,
        planned_start: new Date().toISOString().split('T')[0],
        planned_end: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        progress_percentage: 0,
        assigned_to: taskAssignee,
        assigned_to_name: taskAssignee,
      };
    });

    // Persist tasks in localStorage for this project
    try {
      localStorage.setItem(`booshnam_wbs_tasks_v2_${newProjId}`, JSON.stringify(generatedTasks));
    } catch (e) {}

    if (setTasks) {
      setTasks(prev => [...generatedTasks, ...prev]);
    }

    const cleanClientName = (newClientName || '').trim();
    const displayName = cleanClientName && cleanClientName.toLowerCase() !== cleanProjName.toLowerCase()
      ? `${cleanProjName} (${cleanClientName})`
      : cleanProjName;

    // Resolve category correctly matching filter options: 'Residential' | 'Commercial' | 'Infrastructure' | 'Testing'
    let resolvedCategory = 'Residential';
    const lowerType = newProjectType.toLowerCase();
    if (lowerType.includes('commercial')) {
      resolvedCategory = 'Commercial';
    } else if (lowerType.includes('infra')) {
      resolvedCategory = 'Infrastructure';
    } else if (lowerType.includes('soil') || lowerType.includes('test')) {
      resolvedCategory = 'Testing';
    } else {
      resolvedCategory = 'Residential';
    }

    const deptObj = ORGANIZATION_DEPARTMENTS.find(d => d.id === newDepartment) || ORGANIZATION_DEPARTMENTS[6]; // defaults to Construction

    const newProj: Project = {
      id: newProjId,
      code: code,
      name: displayName,
      client_name: cleanClientName || cleanProjName,
      department: newDepartment,
      department_name: deptObj.name,
      project_type: newProjectType,
      location: `${newAddress ? newAddress + ', ' : ''}${newCity || 'Chennai'}`,
      address: newAddress || 'Site Address',
      city: newCity || 'Chennai',
      latitude: 13.0827,
      longitude: 80.2707,
      geofence_radius_meters: 200,
      start_date: new Date().toISOString().split('T')[0],
      expected_end_date: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      estimated_budget: budgetNum,
      actual_cost: 0,
      cash_in: 0,
      cash_out: 0,
      progress_percentage: 0,
      todo_count: generatedTasks.length,
      material_pending_count: 0,
      approval_pending_count: 0,
      initials: initials,
      avatar_color: 'bg-red-600',
      stage: 'Planning & Mobilization',
      category: resolvedCategory,
      status: 'ACTIVE',
      description: `Initiated for ${newClientName || newProjectName} located at ${newAddress || ''}, ${newCity || ''}. Auto-generated ${generatedTasks.length} predefined tasks.`,
      tasks_count: generatedTasks.length,
      assigned_team: assignedTeam
    };

    const updated = [newProj, ...allProjects];
    handleUpdateProjects(updated);
    setActiveProject(newProj);
    onSelectProject?.(newProj);
    onShowToast?.(`Project "${newProjectName}" created with ${generatedTasks.length} tasks!`);

    // Notify all assigned team members (one notification per assigned member)
    assignedTeam.forEach(member => {
      addNotification({
        title: 'Assigned to Project',
        message: `You have been added to project "${displayName}" as ${member.role}.`,
        type: 'PROJECT_ASSIGNED',
        recipient: member.name,
        sender: currentUser.first_name || 'Admin',
        projectName: displayName,
        projectId: newProjId,
        silentToast: true
      });
    });

    // Reset wizard
    setNewProjectName('');
    setNewClientName('');
    setNewAddress('');
    setNewCity('');
    setNewEstimatedBudget('0');
    setSelectedPM('');
    setSelectedEngineer('');
    setSelectedSupervisor('');
    setSelectedAccounts('');
    setWizardTasks([...PREDEFINED_TASKS_TEMPLATE]);
    setSelectedTaskIds(PREDEFINED_TASKS_TEMPLATE.map(t => t.id));
    setEditingTask(null);
    setIsAddingCustomTask(false);
    setWizardError('');
    setAdditionalTeam([]);
    setExtraMemberName('');
    setExtraMemberRole('');
    setShowAddExtraMember(false);
    setWizardStep(1);
    setWorkspaceTab('dashboard');
    setViewMode('details');
  };


  // AFC Drawings mock list
  const drawings = [
    { id: 'dr-1', number: 'STR-DWG-0104', title: 'Tower A - 9th Floor Post-Tensioned Tendon Layout', discipline: 'STRUCTURAL', version: 'R2', status: 'AFC Approved', date: '2026-05-02' },
    { id: 'dr-2', number: 'ARC-DWG-0412', title: 'Typical Floor Plan Flat 401-404 Architectural Details', discipline: 'ARCHITECTURAL', version: 'R1', status: 'AFC Approved', date: '2026-04-18' },
    { id: 'dr-3', number: 'MEP-DWG-0220', title: 'Basement 2 Stormwater Sump & Pumping Stations', discipline: 'PLUMBING', version: 'R0', status: 'Under Review', date: '2026-05-10' },
    { id: 'dr-4', number: 'ELC-DWG-0315', title: 'Electrical Single Line Diagram & DG Auto Transfer', discipline: 'ELECTRICAL', version: 'R3', status: 'AFC Approved', date: '2026-04-25' },
  ];

  // ==========================================
  // VIEW 2: "Creating Project" Wizard Flow
  // ==========================================
  if (viewMode === 'create') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-start py-6 px-4">
        {/* Cancel Icon in the Right Corner */}
        <div className="w-full max-w-4xl flex items-center justify-end mb-4">
          <button 
            type="button"
            onClick={handleCancelWizard}
            className="p-2 hover:bg-slate-200/80 rounded-full text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="Cancel"
            aria-label="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Container */}
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-6">Creating Project</h1>

          {/* Stepper Header */}
          <div className="w-full max-w-md mb-8">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2 px-1">
              <span className={wizardStep === 1 ? 'text-red-600 font-bold' : 'text-slate-600'}>
                1. Details
              </span>
              <span className={wizardStep === 2 ? 'text-red-600 font-bold' : 'text-slate-600'}>
                2. Team
              </span>
              <span className={wizardStep === 3 ? 'text-red-600 font-bold' : 'text-slate-400'}>
                3. Predefined Tasks
              </span>
            </div>

            <div className="relative flex items-center justify-between">
              {/* Step 1 Circle */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 z-10 transition-all ${
                wizardStep === 1 
                  ? 'border-red-600 bg-white text-red-600 shadow-sm ring-4 ring-red-50' 
                  : 'border-red-600 bg-red-600 text-white'
              }`}>
                {wizardStep > 1 ? <Check className="w-4 h-4" /> : '1'}
              </div>

              {/* Connecting Line 1 */}
              <div className={`flex-1 h-0.5 mx-2 transition-all ${
                wizardStep >= 2 ? 'bg-red-600' : 'bg-slate-200'
              }`} />

              {/* Step 2 Circle */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 z-10 transition-all ${
                wizardStep === 2 
                  ? 'border-red-600 bg-white text-red-600 shadow-sm ring-4 ring-red-50' 
                  : wizardStep > 2 ? 'border-red-600 bg-red-600 text-white' : 'border-slate-300 bg-white text-slate-400'
              }`}>
                {wizardStep > 2 ? <Check className="w-4 h-4" /> : '2'}
              </div>

              {/* Connecting Line 2 */}
              <div className={`flex-1 h-0.5 mx-2 transition-all ${
                wizardStep === 3 ? 'bg-red-600' : 'bg-slate-200'
              }`} />

              {/* Step 3 Circle */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 z-10 transition-all ${
                wizardStep === 3 
                  ? 'border-red-600 bg-white text-red-600 shadow-sm ring-4 ring-red-50' 
                  : 'border-slate-300 bg-white text-slate-400'
              }`}>
                3
              </div>
            </div>
          </div>

          {/* STEP 1: Project Details */}
          {wizardStep === 1 && (
            <div className="w-full bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Project Details</h2>
                <p className="text-xs text-slate-500 mt-0.5">Enter key project parameters and client contact information</p>
              </div>

              {wizardError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{wizardError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Project Name *</label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => {
                      setNewProjectName(e.target.value);
                      if (wizardError) setWizardError('');
                    }}
                    placeholder="e.g. RG33 Villa Complex or Soil Testing Site Alpha"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Client Name</label>
                    <input
                      type="text"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="e.g. Anbu Foundation / Ramesh"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Department / Division *
                    </label>
                    <CustomSelect
                      value={newDepartment}
                      onChange={(val) => setNewDepartment(val)}
                      options={ORGANIZATION_DEPARTMENTS.filter(d => !d.isMainOverview).map(d => ({
                        label: d.name,
                        value: d.id,
                      }))}
                      size="md"
                      variant="brand"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Project Type / Category</label>
                  <CustomSelect
                    value={newProjectType}
                    onChange={(val) => setNewProjectType(val)}
                    options={[
                      'Residential Construction',
                      'Commercial Complex',
                      'Soil Investigation & Testing',
                      'Architectural Design & Planning',
                      'Infrastructure Project'
                    ]}
                    size="md"
                    variant="brand"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Address / Site Location</label>
                    <input
                      type="text"
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      placeholder="e.g. Plot 42, Pattabiram Main Rd"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      placeholder="e.g. Chennai, Bangalore"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Budget (₹ INR)</label>
                  <input
                    type="number"
                    min="0"
                    value={newEstimatedBudget}
                    onChange={(e) => setNewEstimatedBudget(e.target.value)}
                    onFocus={() => {
                      if (newEstimatedBudget === '0') setNewEstimatedBudget('');
                    }}
                    onBlur={() => {
                      if (!newEstimatedBudget.trim()) setNewEstimatedBudget('0');
                    }}
                    placeholder="0"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition"
                  />
                </div>
              </div>

              {/* Continue Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleWizardContinueToStep2}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center cursor-pointer"
                >
                  Continue to Team Assignment (Step 2)
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Add Team member */}
          {wizardStep === 2 && (
            <div className="w-full bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Assign Key Team Members</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assign site engineers, project managers, and supervisors for daily field operations.
                </p>
              </div>

              <div className="space-y-4">
                {/* Project Manager */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-red-600" />
                      Project Manager
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Lead / Execution</span>
                  </div>
                  <SelectOrTypeInput
                    value={selectedPM}
                    onChange={setSelectedPM}
                    options={pmOptions}
                    placeholder="Select or type Project Manager name..."
                  />
                </div>

                {/* Site Engineer */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-red-600" />
                      Site Engineer
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Technical / Field</span>
                  </div>
                  <SelectOrTypeInput
                    value={selectedEngineer}
                    onChange={setSelectedEngineer}
                    options={engineerOptions}
                    placeholder="Select or type Site Engineer name..."
                  />
                </div>

                {/* Site Supervisor */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-red-600" />
                      Site Supervisor / Safety
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Daily Manpower</span>
                  </div>
                  <SelectOrTypeInput
                    value={selectedSupervisor}
                    onChange={setSelectedSupervisor}
                    options={supervisorOptions}
                    placeholder="Select or type Site Supervisor / Safety name..."
                  />
                </div>

                {/* Accounts & Finance */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      Accounts & Billing
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Cash In / Out</span>
                  </div>
                  <SelectOrTypeInput
                    value={selectedAccounts}
                    onChange={setSelectedAccounts}
                    options={accountsOptions}
                    placeholder="Select or type Accounts Manager name..."
                  />
                </div>

                {/* Additional Key Team Members Section */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      Additional Team Members ({additionalTeam.length})
                    </span>
                    {!showAddExtraMember && (
                      <button
                        type="button"
                        onClick={() => setShowAddExtraMember(true)}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add More Staff
                      </button>
                    )}
                  </div>

                  {/* List of Added Members */}
                  {additionalTeam.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {additionalTeam.map((m, idx) => (
                        <div key={idx} className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">{m.name}</span>
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded">
                              {m.role}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAdditionalTeam(prev => prev.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inline Form to Add Extra Member */}
                  {showAddExtraMember && (
                    <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
                      <div className="text-[11px] font-semibold text-indigo-900">
                        Assign Any Staff with Custom Designation
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">
                            Staff Member *
                          </label>
                          <SelectOrTypeInput
                            value={extraMemberName}
                            onChange={(val) => {
                              setExtraMemberName(val);
                              const found = staffList.find(s => s.name.toLowerCase().trim() === val.toLowerCase().trim());
                              if (found && !extraMemberRole) {
                                setExtraMemberRole(found.designation || found.role_name || '');
                              }
                            }}
                            options={allStaffOptions}
                            placeholder="Select staff or type name..."
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">
                            Designation / Role on Project
                          </label>
                          <input
                            type="text"
                            value={extraMemberRole}
                            onChange={(e) => setExtraMemberRole(e.target.value)}
                            placeholder="e.g. Architect, Quality Auditor..."
                            className="w-full h-10 px-3 border border-slate-200 rounded-lg text-xs font-medium bg-white focus:outline-none focus:border-indigo-600"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddExtraMember(false);
                            setExtraMemberName('');
                            setExtraMemberRole('');
                          }}
                          className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleAddExtraMember}
                          disabled={!extraMemberName.trim()}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Assign Staff
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="w-1/3 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleWizardContinueToStep3}
                  className="w-2/3 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Continue to Predefined Tasks (Step 3)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Predefined Tasks & Workflow Generation (Requirements Section 1 & 2) */}
          {wizardStep === 3 && (
            <div className="w-full bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Automatic Predefined Tasks
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Uncheck any task to exclude it from this project. Click Edit to customize any task or Add Task to add new ones.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={selectAllTasks}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 transition cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={deselectAllTasks}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-800 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                  >
                    Deselect All
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomTask(true)}
                    className="text-xs font-semibold text-white px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Task</span>
                  </button>
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
                    {selectedTaskIds.length} / {wizardTasks.length} Active
                  </span>
                </div>
              </div>

              {/* Inline Form to Add Custom Predefined Task */}
              {isAddingCustomTask && (
                <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                    <span className="flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-amber-600" />
                      Add New Predefined Task to Project
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingCustomTask(false)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="sm:col-span-1">
                      <label className="block font-semibold text-slate-700 mb-1">Task Title *</label>
                      <input
                        type="text"
                        value={customTaskForm.title}
                        onChange={(e) => setCustomTaskForm({ ...customTaskForm, title: e.target.value })}
                        placeholder="e.g. Borewell Drilling & Water Testing"
                        className="w-full h-9 px-3 border border-slate-200 rounded-lg bg-white text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 text-xs">Department</label>
                      <CustomSelect
                        value={customTaskForm.department}
                        onChange={(val) => setCustomTaskForm({ ...customTaskForm, department: val as any })}
                        options={[
                          { label: 'Construction', value: 'CONSTRUCTION' },
                          { label: 'Soil Investigation', value: 'SOIL_INVESTIGATION' },
                          { label: 'Architecture', value: 'ARCHITECTURE' },
                          { label: 'Marketing', value: 'MARKETING' },
                          { label: 'Accounts', value: 'ACCOUNTS' },
                        ]}
                        size="sm"
                        variant="brand"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 text-xs">Priority</label>
                      <CustomSelect
                        value={customTaskForm.default_priority}
                        onChange={(val) => setCustomTaskForm({ ...customTaskForm, default_priority: val as any })}
                        options={[
                          { label: 'Urgent', value: 'URGENT', dotColor: 'bg-rose-500' },
                          { label: 'High', value: 'HIGH', dotColor: 'bg-amber-500' },
                          { label: 'Medium', value: 'MEDIUM', dotColor: 'bg-sky-500' },
                          { label: 'Low', value: 'LOW', dotColor: 'bg-slate-400' },
                        ]}
                        size="sm"
                        variant="brand"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 text-xs">Description</label>
                    <input
                      type="text"
                      value={customTaskForm.description}
                      onChange={(e) => setCustomTaskForm({ ...customTaskForm, description: e.target.value })}
                      placeholder="Brief details about the task execution..."
                      className="w-full h-9 px-3 border border-slate-200 rounded-lg bg-white text-xs font-medium"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingCustomTask(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomPredefinedTask}
                      disabled={!customTaskForm.title.trim()}
                      className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add to Tasks</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tasks List */}
              <div className="max-h-96 overflow-y-auto pr-1 space-y-2.5">
                {wizardTasks.map((t) => {
                  const isChecked = selectedTaskIds.includes(t.id);
                  const isBeingEdited = editingTask?.id === t.id;
                  const deptColors: Record<string, string> = {
                    SOIL_INVESTIGATION: 'bg-amber-100 text-amber-800 border-amber-200',
                    ARCHITECTURE: 'bg-red-100 text-red-800 border-red-200',
                    MARKETING: 'bg-sky-100 text-sky-800 border-sky-200',
                    CONSTRUCTION: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                    ACCOUNTS: 'bg-indigo-100 text-indigo-800 border-indigo-200',
                  };

                  if (isBeingEdited && editingTask) {
                    return (
                      <div key={t.id} className="p-3.5 rounded-xl border border-red-300 bg-red-50/20 space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <span>Edit Task #{t.id} Details</span>
                          <span className="text-[10px] text-slate-400">Inline Editing</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                          <div className="sm:col-span-1">
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">Title</label>
                            <input
                              type="text"
                              value={editingTask.title}
                              onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                              className="w-full h-8 px-2.5 border border-slate-200 rounded-lg bg-white text-xs font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">Department</label>
                            <CustomSelect
                              value={editingTask.department}
                              onChange={(val) => setEditingTask({ ...editingTask, department: val as any })}
                              options={[
                                { label: 'Construction', value: 'CONSTRUCTION' },
                                { label: 'Soil Investigation', value: 'SOIL_INVESTIGATION' },
                                { label: 'Architecture', value: 'ARCHITECTURE' },
                                { label: 'Marketing', value: 'MARKETING' },
                                { label: 'Accounts', value: 'ACCOUNTS' },
                              ]}
                              size="sm"
                              variant="brand"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">Priority</label>
                            <CustomSelect
                              value={editingTask.default_priority}
                              onChange={(val) => setEditingTask({ ...editingTask, default_priority: val as any })}
                              options={[
                                { label: 'Urgent', value: 'URGENT', dotColor: 'bg-rose-500' },
                                { label: 'High', value: 'HIGH', dotColor: 'bg-amber-500' },
                                { label: 'Medium', value: 'MEDIUM', dotColor: 'bg-sky-500' },
                                { label: 'Low', value: 'LOW', dotColor: 'bg-slate-400' },
                              ]}
                              size="sm"
                              variant="brand"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Description</label>
                          <textarea
                            rows={2}
                            value={editingTask.description}
                            onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                            className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs font-medium resize-none"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingTask(null)}
                            className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditedTask(editingTask)}
                            className="px-3.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg cursor-pointer shadow-2xs"
                          >
                            Save Task
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={t.id}
                      onClick={() => toggleTaskSelection(t.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                        isChecked 
                          ? 'bg-red-50/20 border-red-200 hover:border-red-300' 
                          : 'bg-slate-50/60 border-slate-200 opacity-60 hover:opacity-90'
                      }`}
                    >
                      {/* Checkbox with stopPropagation to prevent double toggle */}
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleTaskSelection(t.id);
                        }}
                        className="mt-1 w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300 cursor-pointer shrink-0"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-xs font-bold ${isChecked ? 'text-slate-900' : 'text-slate-500 line-through'}`}>
                              {t.id}. {t.title}
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${deptColors[t.department] || 'bg-slate-100 text-slate-700'}`}>
                              {t.department.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {t.default_priority}
                            </span>
                            {!isChecked && (
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                Excluded
                              </span>
                            )}
                          </div>

                          {/* Edit Button */}
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setEditingTask({ ...t })}
                              className="px-2 py-1 text-slate-500 hover:text-red-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition cursor-pointer flex items-center gap-1 text-[11px] font-semibold shadow-2xs"
                              title="Edit Task Details"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-600" />
                              <span>Edit</span>
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {t.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="w-1/3 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleWizardSubmit}
                  className="w-2/3 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Create Project ({selectedTaskIds.length} Tasks)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: Project Workspace (Top Nav with 13 Pages matching Screenshot)
  // ==========================================
  if (viewMode === 'details' && activeProject) {
    const handleStatusChange = (newStatus: 'ACTIVE' | 'PLANNING' | 'ON_HOLD' | 'COMPLETED') => {
      const updated: Project = { ...activeProject, status: newStatus };
      setActiveProject(updated);
      handleUpdateProjects(allProjects.map(p => p.id === updated.id ? updated : p));
      onShowToast?.(`Project status updated to ${newStatus}`);
    };
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-white">

        {/* Project Top Navigation Bar */}
        <ProjectTopNav
          project={activeProject}
          allProjects={allProjects}
          activeTab={workspaceTab}
          onSelectTab={setWorkspaceTab}
          onSelectProject={(p) => {
            setActiveProject(p);
            onSelectProject?.(p);
          }}
          onCreateNewProject={() => {
            setNewProjectName('');
            setNewAddress('');
            setNewCity('');
            setSelectedPM('');
            setSelectedEngineer('');
            setSelectedSupervisor('');
            setSelectedAccounts('');
            setWizardError('');
            setWizardStep(1);
            setViewMode('create');
          }}
          onStatusChange={handleStatusChange}
          onOpenTeamModal={() => setIsTeamModalOpen(true)}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
          onOpenFeedbackModal={() => setIsFeedbackModalOpen(true)}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={onToggleSidebar}
          onBack={() => setViewMode('list')}
        />

        {/* Workspace Content Router (13 Functional Pages) */}
        <div className="px-6 py-5 flex-1 min-w-0">
          {workspaceTab === 'dashboard' && (
            <DashboardTab
              project={activeProject}
              tasks={tasks}
              approvals={approvals}
              materialRequests={materialRequests}
              onNavigateTab={setWorkspaceTab}
              onOpenTeamModal={() => setIsTeamModalOpen(true)}
            />
          )}

          {workspaceTab === 'design' && (
            <DesignTab
              project={activeProject}
              onShowToast={onShowToast}
            />
          )}

          {workspaceTab === 'boq' && (
            <BOQTab
              project={activeProject}
              tasks={tasks}
              onShowToast={onShowToast}
            />
          )}

          {workspaceTab === 'party' && (
            <PartyTab
              project={activeProject}
              onShowToast={onShowToast}
            />
          )}

          {workspaceTab === 'transaction' && (
            <TransactionTab
              project={activeProject}
              onShowToast={onShowToast}
            />
          )}

          {workspaceTab === 'todo' && (
            <ToDoTab
              project={activeProject}
              onShowToast={onShowToast}
            />
          )}

          {workspaceTab === 'task' && (
            <TaskTab
              project={activeProject}
              tasks={tasks}
              onShowToast={onShowToast}
            />
          )}

          {workspaceTab === 'attendance' && (
            <AttendanceTab
              project={activeProject}
              onShowToast={onShowToast}
            />
          )}

          {workspaceTab === 'material' && (
            <MaterialTab
              project={activeProject}
              materialRequests={materialRequests}
              onShowToast={onShowToast}
            />
          )}

          {workspaceTab === 'subcon' && (
            <SubconTab
              project={activeProject}
              onShowToast={onShowToast}
            />
          )}

          {workspaceTab === 'equipment' && (
            <EquipmentTab
              project={activeProject}
              onShowToast={onShowToast}
            />
          )}

          {workspaceTab === 'files' && (
            <FilesTab
              project={activeProject}
              onShowToast={onShowToast}
            />
          )}

          {workspaceTab === 'mom' && (
            <MOMTab
              project={activeProject}
              onShowToast={onShowToast}
            />
          )}
        </div>

        {/* Project Modals */}
        <ProjectSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          project={activeProject}
          onUpdateProject={(upd) => {
            setActiveProject(upd);
            handleUpdateProjects(allProjects.map(p => p.id === upd.id ? upd : p));
          }}
          onShowToast={onShowToast}
        />

        <ProjectTeamModal
          isOpen={isTeamModalOpen}
          onClose={() => setIsTeamModalOpen(false)}
          project={activeProject}
          onUpdateTeam={(team) => {
            const upd = { ...activeProject, assigned_team: team };
            setActiveProject(upd);
            handleUpdateProjects(allProjects.map(p => p.id === upd.id ? upd : p));
          }}
          onShowToast={onShowToast}
        />

        <FeedbackModal
          isOpen={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
          project={activeProject}
          onSuccess={onShowToast}
        />
      </div>
    );
  }


  // ==========================================
  // VIEW 1: Projects List / Hub (Matching Screenshot 1)
  // ==========================================
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
      {/* Top Header Bar Inside Full-Bleed View */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white sticky top-0 z-10">
        <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Projects</h1>
            <p className="text-xs text-slate-500 mt-0.5">Centralized oversight of all construction & soil investigation initiatives</p>
          </div>

        {/* Right Settings, Bell & User Avatar */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Settings Cog */}
          <button 
            type="button"
            onClick={() => {
              if (!activeProject && allProjects.length > 0) {
                setActiveProject(allProjects[0]);
              }
              setIsSettingsModalOpen(true);
            }}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Project Settings"
            aria-label="Project Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User Profile & Notifications */}
          <UserProfileDropdown showBell={true} onShowToast={onShowToast} />
        </div>
      </div>

      {/* Main Single Card Content Body */}
      <div className="p-4 sm:p-6 space-y-6 flex-1">
        {/* Active Staff View Restriction Banner */}
        {!isSuperOrAdmin && (
          <div className="bg-amber-50 border border-amber-200 rounded-[5px] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900 shadow-2xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Viewing assigned projects for <strong className="font-bold">{currentUser.first_name}</strong> ({currentUser.role_name}). Only projects where you are added to the team or tasks are displayed.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const adminUser = { first_name: 'Priya', username: 'admin', role_code: 'SUPER_ADMIN', role_name: 'Owner / Director' };
                localStorage.setItem('siteops_user', JSON.stringify(adminUser));
                window.dispatchEvent(new CustomEvent('siteops_user_updated', { detail: adminUser }));
                onShowToast?.('Switched back to Super Admin view (All Projects)');
              }}
              className="px-3 py-1 bg-white hover:bg-amber-100 text-amber-800 font-bold rounded-[4px] border border-amber-300 transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
            >
              Switch to Super Admin (View All)
            </button>
          </div>
        )}

        {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Approval (Pending) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1 text-xs font-semibold text-slate-600 mb-1">
              <span>Approval (Pending)</span>
              <span className="text-slate-400 cursor-pointer" title="Approvals requiring owner/director action">ⓘ</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {approvals.filter(a => a.status === 'PENDING').length || 0}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <ThumbsUp className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Material (Pending) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1 text-xs font-semibold text-slate-600 mb-1">
              <span>Material (Pending)</span>
              <span className="text-slate-400 cursor-pointer" title="Pending material indent and purchase orders">ⓘ</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">10</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: To Do (Pending) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1 text-xs font-semibold text-slate-600 mb-1">
              <span>To Do (Pending)</span>
              <span className="text-slate-400 cursor-pointer" title="Pending tasks and action items">ⓘ</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">7</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
            <ListTodo className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Action Toolbar (Exact Screenshot 1 Match) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2">
        {/* Left: Dropdowns (All with badge, Stage, Category) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* All / Status Dropdown */}
          <div className="w-28 sm:w-32">
            <CustomSelect
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={[
                { label: 'All', value: 'All' },
                { label: 'Ongoing', value: 'ACTIVE', dotColor: 'bg-emerald-500' },
                { label: 'Planning', value: 'PLANNING', dotColor: 'bg-amber-500' },
                { label: 'On Hold', value: 'ON_HOLD', dotColor: 'bg-rose-500' },
                { label: 'Completed', value: 'COMPLETED', dotColor: 'bg-blue-500' },
              ]}
              size="sm"
              variant="brand"
            />
          </div>

          {/* Department Filter Dropdown */}
          <div className="w-44 sm:w-56">
            <CustomSelect
              value={activeDeptId}
              onChange={(val) => {
                setActiveDepartmentId(val as any);
                setActiveDeptId(val);
              }}
              options={[
                { label: `All Departments (${allProjects.length})`, value: 'booshnam_associates' },
                ...ORGANIZATION_DEPARTMENTS.filter(d => !d.isMainOverview).map(d => ({
                  label: `${d.shortName} (${allProjects.filter(p => normalizeDepartmentId(p.department as string) === d.id).length})`,
                  value: d.id,
                }))
              ]}
              prefix="Dept: "
              size="sm"
              variant="brand"
            />
          </div>

          {/* Count Badge */}
          <span className="h-8 px-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-[5px] border border-slate-200 shadow-2xs flex items-center justify-center">
            {filteredProjects.length}
          </span>

          {/* Stage Dropdown */}
          <div className="w-48 sm:w-56">
            <CustomSelect
              value={stageFilter}
              onChange={(val) => setStageFilter(val)}
              options={[
                { label: 'Stage: All', value: 'All' },
                { label: 'Foundation & Framing', value: 'Foundation & Framing' },
                { label: 'Superstructure RCC', value: 'Superstructure RCC' },
                { label: 'Brickwork & Lintel', value: 'Brickwork & Lintel' },
                { label: 'Finishing & MEP', value: 'Finishing & MEP' },
                { label: 'Planning & Mobilization', value: 'Planning & Mobilization' },
              ]}
              placeholder="Stage"
              size="sm"
              variant="brand"
            />
          </div>

          {/* Category Dropdown */}
          <div className="w-40 sm:w-48">
            <CustomSelect
              value={categoryFilter}
              onChange={(val) => setCategoryFilter(val)}
              options={[
                { label: 'Category: All', value: 'All' },
                { label: 'Residential', value: 'Residential' },
                { label: 'Commercial', value: 'Commercial' },
                { label: 'Infrastructure', value: 'Infrastructure' },
                { label: 'Testing', value: 'Testing' },
              ]}
              placeholder="Category"
              size="sm"
              variant="brand"
            />
          </div>
        </div>

        {/* Right: Search Input, Download Icon, + New Project Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search Projects Input */}
          <div className="relative min-w-[220px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Projects"
              className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 shadow-xs focus:outline-none focus:border-red-600"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
          </div>

          {/* Download Export Button */}
          <button
            onClick={() => onShowToast?.('Exporting project roster to Excel...')}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-xs transition cursor-pointer"
            title="Download Projects"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* + New Project Button */}
          <button
            onClick={() => {
              setNewProjectName('');
              setNewAddress('');
              setNewCity('');
              setSelectedPM('');
              setSelectedEngineer('');
              setSelectedSupervisor('');
              setSelectedAccounts('');
              setWizardError('');
              setWizardStep(1);
              setViewMode('create');
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Projects List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3.5 px-5">Name</th>
                <th className="py-3.5 px-5 w-48 text-center">Progress</th>
                <th className="py-3.5 px-5 w-36 text-center">In/Out</th>
                <th className="py-3.5 px-5 w-24 text-center">To Do</th>
                <th className="py-3.5 px-5 w-20 text-right">
                  <div className="flex items-center justify-end text-red-600">
                    <button
                      type="button"
                      title="Add Project"
                      onClick={() => {
                        setNewProjectName('');
                        setNewAddress('');
                        setNewCity('');
                        setSelectedPM('');
                        setSelectedEngineer('');
                        setSelectedSupervisor('');
                        setSelectedAccounts('');
                        setWizardError('');
                        setWizardStep(1);
                        setViewMode('create');
                      }}
                      className="cursor-pointer hover:opacity-80 transition"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shadow-2xs">
                        <Layers className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">No projects found</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {searchQuery || statusFilter !== 'All' || stageFilter !== 'All' || categoryFilter !== 'All'
                            ? 'No projects match your active search or filter criteria.'
                            : 'No projects created yet. Click "+ New Project" to create your first project.'}
                        </p>
                      </div>
                      {(searchQuery || statusFilter !== 'All' || stageFilter !== 'All' || categoryFilter !== 'All') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setStatusFilter('All');
                            setStageFilter('All');
                            setCategoryFilter('All');
                          }}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                        >
                          Clear Filters & Show All ({allProjects.length})
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProjects.map((p) => {
                  const isPinned = pinnedIds.has(p.id);
                  const stats = getProjectLiveStats(p);
                  const progressVal = stats.progress;
                  const todoVal = stats.todo;

                  return (
                    <tr 
                      key={p.id} 
                      className={`hover:bg-red-50/30 transition-colors group ${
                        isPinned ? 'bg-red-50/20' : ''
                      }`}
                    >
                      {/* Name Column with Avatar Initials */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3.5">
                          {/* Avatar Initials Circle */}
                          <div className={`w-9 h-9 rounded-xl ${p.avatar_color || 'bg-red-600'} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs`}>
                            {p.initials || formatProjectTitle(p).split('(')[0].trim().slice(0, 2).toUpperCase()}
                          </div>

                          {/* Name Text - Clickable to open Project Details */}
                          <div className="min-w-0 flex-1 max-w-3xl">
                            <button
                              onClick={() => handleOpenProjectDetails(p)}
                              className="text-left font-medium text-slate-900 hover:text-red-600 transition-colors line-clamp-2 cursor-pointer leading-snug group-hover:font-semibold"
                              title="Click to view overall project details, pending work, and finances"
                            >
                              {formatProjectTitle(p)}
                            </button>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {p.client_name && p.client_name !== p.name && (
                                <span className="text-[11px] text-slate-600 font-medium">
                                  {p.client_name}
                                </span>
                              )}
                              <span className="text-slate-300">•</span>
                              <span className="text-[11px] text-slate-400">
                                {p.location || p.city || 'Chennai'}
                              </span>
                              {(() => {
                                const deptId = normalizeDepartmentId(p.department as string);
                                const deptObj = ORGANIZATION_DEPARTMENTS.find(d => d.id === deptId) || ORGANIZATION_DEPARTMENTS[6];
                                return (
                                  <>
                                    <span className="text-slate-300">•</span>
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-700 bg-slate-100/90 px-2 py-0.5 rounded-full border border-slate-200">
                                      <DepartmentLogo type={deptObj.logoType} size="sm" />
                                      <span>{deptObj.shortName}</span>
                                    </span>
                                  </>
                                );
                              })()}
                              <span className="text-slate-300">•</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                stats.status === 'COMPLETED' 
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : stats.status === 'PLANNING'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : stats.status === 'ON_HOLD'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {stats.status === 'COMPLETED' ? 'Completed' :
                                 stats.status === 'PLANNING' ? 'Planning' :
                                 stats.status === 'ON_HOLD' ? 'On Hold' : 'Ongoing'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Progress Column */}
                      <td className="py-4 px-5 text-center">
                        <div className="flex flex-col items-center justify-center space-y-1.5">
                          <span className="text-xs font-bold text-slate-800 font-mono">
                            {progressVal}%
                          </span>
                          <div className="w-32 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-[#10B981] h-full rounded-full transition-all duration-300"
                              style={{ width: `${progressVal}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* In/Out Column (Matching Screenshot: ₹ 0 / ₹ 0) */}
                      <td className="py-4 px-5 text-center font-mono text-xs text-slate-700">
                        {p.cash_in !== undefined && p.cash_out !== undefined 
                          ? `₹ ${p.cash_in.toLocaleString()} / ₹ ${p.cash_out.toLocaleString()}`
                          : '₹ 0 / ₹ 0'
                        }
                      </td>

                      {/* To Do Column (Pill Badge) */}
                      <td className="py-4 px-5 text-center">
                        <span className="px-3 py-1 bg-[#EEF2FF] text-[#6366F1] font-bold text-xs rounded-full">
                          {todoVal}
                        </span>
                      </td>

                      {/* Actions Column (Pin & 3-Dots Menu) */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2 text-slate-400">
                          {/* Pin Button */}
                          <button
                            onClick={() => togglePin(p.id)}
                            className={`p-1.5 rounded-lg hover:bg-slate-100 transition ${
                              isPinned ? 'text-red-600 bg-red-50' : 'text-slate-400 hover:text-slate-700'
                            }`}
                            title={isPinned ? 'Unpin Project' : 'Pin Project to top'}
                          >
                            <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-red-600' : ''}`} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {/* Project Settings Modal (Accessible from outer list view) */}
      <ProjectSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        project={activeProject || allProjects[0] || project || ({} as Project)}
        onUpdateProject={(upd) => {
          setActiveProject(upd);
          handleUpdateProjects(allProjects.map(p => p.id === upd.id ? upd : p));
        }}
        onShowToast={onShowToast}
      />
    </div>
  );
};
