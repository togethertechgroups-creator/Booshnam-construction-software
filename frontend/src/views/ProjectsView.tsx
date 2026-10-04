import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, CheckCircle2, Clock, AlertCircle, FileText, 
  Calendar, Layers, Flag, Download, Check, Search, 
  ThumbsUp, ShoppingCart, ListTodo, ArrowLeft, Pin, 
  MoreVertical, Bell, Settings,
  User, ExternalLink, ChevronRight, Filter, TrendingUp,
  CheckSquare, Sparkles, Phone, Mail, MapPin, Briefcase,
  DollarSign, PlusCircle, UserCheck, ShieldCheck, X, Users, Edit2, Building2, ChevronLeft, ArrowRight, Maximize2, Minimize2, Compass,
  Trash2, AlertTriangle
} from 'lucide-react';
import { ProjectTopNav, WorkspaceTabId, isSoilDepartmentProject, SOIL_EXCLUDED_TABS } from '../components/project-workspace/ProjectTopNav';
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
import { Project, WBSTask, ApprovalRequest, MaterialRequest, ProjectTeamMember, PredefinedTaskTemplate, Department } from '../types';
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
  getIndividualDepartments,
  getOrInitializeProjects
} from '../lib/departmentService';
import { getCurrentUserAccount, UserAccount } from '../lib/authService';
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

  // Auto-redirect to dashboard if current workspace tab is excluded for Soil Investigation projects
  useEffect(() => {
    if (activeProject && isSoilDepartmentProject(activeProject) && SOIL_EXCLUDED_TABS.includes(workspaceTab)) {
      setWorkspaceTab('dashboard');
    }
  }, [activeProject, workspaceTab]);

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
  const [newEstimatedBudget, setNewEstimatedBudget] = useState('');
  const [newDepartment, setNewDepartment] = useState<string>(() => {
    const current = getActiveDepartmentId();
    return current === 'booshnam_associates' ? 'SOIL_INVESTIGATION' : current;
  });
  const [newProjectType, setNewProjectType] = useState('Private Construction');

  useEffect(() => {
    if (activeDeptId !== 'booshnam_associates') {
      setNewDepartment(activeDeptId);
    }
  }, [activeDeptId]);
  const [selectedPM, setSelectedPM] = useState('');
  const [selectedEngineer, setSelectedEngineer] = useState('');
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState('');

  // Auto-open Create Project Wizard when triggered from Quick Access
  useEffect(() => {
    const handleOpenCreateProject = () => {
      const curDept = getActiveDepartmentId();
      setNewDepartment(curDept === 'booshnam_associates' ? 'SOIL_INVESTIGATION' : curDept);
      setNewProjectName('');
      setNewClientName('');
      setNewAddress('');
      setNewCity('');
      setNewEstimatedBudget('');
      setSelectedPM('');
      setSelectedEngineer('');
      setSelectedSupervisor('');
      setSelectedAccounts('');
      setWizardError('');
      setWizardStep(1);
      setViewMode('create');
    };

    if (sessionStorage.getItem('booshnam_auto_open_create_project')) {
      sessionStorage.removeItem('booshnam_auto_open_create_project');
      handleOpenCreateProject();
    }

    window.addEventListener('booshnam_open_create_project', handleOpenCreateProject);
    return () => window.removeEventListener('booshnam_open_create_project', handleOpenCreateProject);
  }, []);
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
  const [taskDeptFilter, setTaskDeptFilter] = useState<'ALL' | Department>('ALL');
  const [isWizardFullscreen, setIsWizardFullscreen] = useState(false);

  useEffect(() => {
    const handleFs = () => setIsWizardFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFs);
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  const toggleWizardFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const formatINR = (val: string | number) => {
    const num = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(num) || num === 0) return '₹ 0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
  };

  const getLakhsCroresText = (val: string | number) => {
    const num = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(num) || num === 0) return '';
    if (num >= 10000000) {
      return `≈ ${(num / 10000000).toFixed(2)} Cr`;
    }
    if (num >= 100000) {
      return `≈ ${(num / 100000).toFixed(2)} Lakhs`;
    }
    return '';
  };

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

  // Default company accountant assigned to all projects automatically if available
  const defaultAccountsStaff = useMemo(() => {
    return staffList.find(s => s.role_code === 'ACCOUNTS' || s.department?.toLowerCase().includes('account')) 
      || staffList.find(s => s.role_name?.toLowerCase().includes('account'))
      || null;
  }, [staffList]);

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
    return getOrInitializeProjects();
  });

  const allProjects = useMemo(() => {
    const list = (propProjects && propProjects.length > 0) ? propProjects : localProjects;
    return list.filter((p: any) => 
      !['Prestige Boulevard', 'Royal Palm', 'Green Valley', 'Sunrise Industrial', 'Urban Metro', 'Skyline Contemporary', 'Heritage Courtyard', 'Highway Overpass', 'Government Medical College', 'High-Rise Commercial', 'Coastal Highway'].some(t => (p.name || p.title || p.client_name || '').includes(t))
    );
  }, [propProjects, localProjects]);

  // Listen for project updates from other tabs or components
  useEffect(() => {
    const handleProjectsUpdated = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        const clean = e.detail.filter((p: any) => 
          !['Prestige Boulevard', 'Royal Palm', 'Green Valley', 'Sunrise Industrial', 'Urban Metro', 'Skyline Contemporary', 'Heritage Courtyard', 'Highway Overpass', 'Government Medical College', 'High-Rise Commercial', 'Coastal Highway'].some(t => (p.name || p.title || p.client_name || '').includes(t))
        );
        setLocalProjects(clean);
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

  const [activeAccount, setActiveAccount] = useState<UserAccount | null>(() => getCurrentUserAccount());

  useEffect(() => {
    const handleUserUpdate = (e: any) => {
      if (e.detail) setCurrentUser(e.detail);
      setActiveAccount(getCurrentUserAccount());
    };
    const handleSessionChange = () => {
      setActiveAccount(getCurrentUserAccount());
    };
    window.addEventListener('siteops_user_updated', handleUserUpdate);
    window.addEventListener('booshnam_session_changed', handleSessionChange);
    window.addEventListener('storage', handleSessionChange);
    return () => {
      window.removeEventListener('siteops_user_updated', handleUserUpdate);
      window.removeEventListener('booshnam_session_changed', handleSessionChange);
      window.removeEventListener('storage', handleSessionChange);
    };
  }, []);

  const userDept = activeAccount?.department;
  const isCompanyWideSuperAdmin = (currentUser.role_code === 'SUPER_ADMIN' || activeAccount?.role_code === 'SUPER_ADMIN') && 
    (!userDept || userDept === 'Executive Management' || userDept === 'Booshnam Associates' || userDept.toLowerCase().includes('all') || userDept.toLowerCase().includes('director'));
  const isRestrictedDeptUser = !isCompanyWideSuperAdmin && Boolean(userDept);

  const departmentFilterOptions = useMemo(() => {
    if (isRestrictedDeptUser && userDept) {
      const normId = normalizeDepartmentId(userDept);
      const deptObj = ORGANIZATION_DEPARTMENTS.find(d => d.id === normId) || ORGANIZATION_DEPARTMENTS[1];
      const count = allProjects.filter(p => normalizeDepartmentId(p.department as string) === deptObj.id).length;
      return [
        {
          label: `${deptObj.shortName} (${count})`,
          value: deptObj.id,
        }
      ];
    }
    return [
      { label: `All Departments (${allProjects.length})`, value: 'booshnam_associates' },
      ...ORGANIZATION_DEPARTMENTS.filter(d => !d.isMainOverview).map(d => ({
        label: `${d.shortName} (${allProjects.filter(p => normalizeDepartmentId(p.department as string) === d.id).length})`,
        value: d.id,
      }))
    ];
  }, [isRestrictedDeptUser, userDept, allProjects]);

  const handleUpdateProjects = (newProjs: Project[]) => {
    try {
      localStorage.setItem('booshnam_projects_v2', JSON.stringify(newProjs));
    } catch (e) {}
    try {
      window.dispatchEvent(new CustomEvent('booshnam_projects_updated', { detail: newProjs }));
    } catch (e) {
      console.warn('Failed to dispatch booshnam_projects_updated event', e);
    }
    if (setProjects) {
      try {
        setProjects(newProjs);
      } catch (e) {
        console.warn('Failed to call setProjects', e);
      }
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

  const isSuperAdmin = !currentUser?.role_code || 
    currentUser?.role_code === 'SUPER_ADMIN' || 
    currentUser?.role_code === 'ADMIN' || 
    currentUser?.role_name?.toLowerCase() === 'super admin' ||
    currentUser?.role_name?.toLowerCase().includes('admin') ||
    currentUser?.role_name === 'Owner / Director' ||
    currentUser?.first_name?.toLowerCase() === 'priya' ||
    currentUser?.first_name?.toLowerCase() === 'rajesh';

  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  const handleDeleteProject = (proj?: Project | null) => {
    const targetProj = proj || projectToDelete || activeProject;
    if (!targetProj || !targetProj.id) {
      console.warn('handleDeleteProject called without valid project');
      setProjectToDelete(null);
      return;
    }

    if (!isSuperAdmin) {
      onShowToast?.('Permission Denied: Only Admin or Super Admin can delete projects.');
      return;
    }

    setIsDeletingProject(true);
    try {
      const targetId = targetProj.id;
      const updated = (allProjects || []).filter(p => p && p.id !== targetId);

      // Clean up project-specific local storage
      const cleanupKeys = [
        `booshnam_wbs_tasks_v2_${targetId}`,
        `booshnam_cost_plan_v2_${targetId}`,
        `booshnam_material_req_v2_${targetId}`,
        `booshnam_purchase_orders_v2_${targetId}`,
        `booshnam_grn_receipts_v2_${targetId}`,
        `booshnam_invoices_v2_${targetId}`,
        `booshnam_snags_v2_${targetId}`,
        `booshnam_dpr_v2_${targetId}`,
        `booshnam_mom_v1_${targetId}`,
        `booshnam_drawings_v2_${targetId}`,
        `booshnam_soil_samples_v2_${targetId}`,
        `booshnam_soil_tests_v2_${targetId}`,
        `booshnam_soil_reports_v2_${targetId}`,
      ];
      cleanupKeys.forEach(k => {
        try { localStorage.removeItem(k); } catch (e) {}
      });

      // Purge directly from localStorage 'booshnam_projects_v2' to ensure persistent deletion
      try {
        const storedRaw = localStorage.getItem('booshnam_projects_v2');
        if (storedRaw) {
          const storedList = JSON.parse(storedRaw);
          if (Array.isArray(storedList)) {
            const filteredStored = storedList.filter((p: any) => p && p.id !== targetId);
            localStorage.setItem('booshnam_projects_v2', JSON.stringify(filteredStored));
          }
        }
      } catch (e) {
        console.warn('Failed to update localStorage', e);
      }

      handleUpdateProjects(updated);

      setPinnedIds(prev => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });

      if (activeProject?.id === targetId) {
        setActiveProject(null);
      }
      if (propSelectedProject?.id === targetId && onSelectProject) {
        onSelectProject(updated[0] || null);
      }

      onShowToast?.(`Project "${formatProjectTitle(targetProj)}" deleted successfully.`);
      setProjectToDelete(null);
      setIsSettingsModalOpen(false);
    } catch (err) {
      console.error('Failed to delete project', err);
      onShowToast?.('Failed to delete project. Please try again.');
    } finally {
      setIsDeletingProject(false);
    }
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
        const isAssigned = p.assigned_team?.some((m: any) => 
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

      // Category / Project Type
      if (categoryFilter !== 'All') {
        const pCat = (p.category || '').toLowerCase();
        const pType = (p.project_type || '').toLowerCase();
        const targetCat = categoryFilter.toLowerCase();
        const matchesCat = pCat.includes(targetCat) || pType.includes(targetCat);
        if (!matchesCat) return false;
      }

      // Active Department Filter (When specific department is selected or user is restricted)
      if (isRestrictedDeptUser && userDept) {
        const userNormDept = normalizeDepartmentId(userDept);
        const pDept = normalizeDepartmentId(p.department as string);
        if (pDept !== userNormDept) return false;
      } else if (activeDeptId !== 'booshnam_associates') {
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
  }, [allProjects, searchQuery, statusFilter, stageFilter, categoryFilter, pinnedIds, isSuperOrAdmin, currentStaffName, tasks, activeDeptId, isRestrictedDeptUser, userDept]);

  const filteredProjectIds = useMemo(() => new Set(filteredProjects.map(p => p.id)), [filteredProjects]);
  const deptPendingApprovals = useMemo(() => {
    return approvals.filter(a => 
      a.status === 'PENDING' && 
      (activeDeptId === 'booshnam_associates' || filteredProjectIds.has(a.project || a.project_id || ''))
    ).length;
  }, [approvals, activeDeptId, filteredProjectIds]);

  const deptPendingMaterials = useMemo(() => {
    return filteredProjects.reduce((sum, p) => sum + (p.material_pending_count || 0), 0);
  }, [filteredProjects]);

  const deptPendingTodos = useMemo(() => {
    return filteredProjects.reduce((sum, p) => {
      const stats = getProjectLiveStats(p);
      return sum + (stats.todo || 0);
    }, 0);
  }, [filteredProjects, tasks]);


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
    setNewEstimatedBudget('');
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

    const targetDeptId = (isRestrictedDeptUser && userDept)
      ? normalizeDepartmentId(userDept)
      : (activeDeptId !== 'booshnam_associates' ? activeDeptId : newDepartment);

    const deptObj = ORGANIZATION_DEPARTMENTS.find(d => d.id === targetDeptId) || ORGANIZATION_DEPARTMENTS.find(d => !d.isMainOverview) || ORGANIZATION_DEPARTMENTS[0];
    const prefix = deptObj.codePrefix || 'PRJ';
    const nextNum = 2484 + Math.floor(Math.random() * 50);
    const code = `${prefix}-${nextNum}`;
    const initials = newProjectName.slice(0, 2).toUpperCase() || 'PR';

    const assignedTeam: ProjectTeamMember[] = [];
    const findStaff = (nameStr: string) => staffList.find(s => s.name.toLowerCase().trim() === nameStr.toLowerCase().trim());

    if (selectedPM.trim()) {
      const s = findStaff(selectedPM);
      assignedTeam.push({
        id: s?.id || `team-pm-${Date.now()}`,
        name: selectedPM.trim(),
        role: s?.designation || s?.role_name || 'Project Manager',
        phone: s?.phone ? `+91 ${s.phone}` : '',
        email: s?.email || ''
      });
    }
    if (selectedEngineer.trim()) {
      const s = findStaff(selectedEngineer);
      assignedTeam.push({
        id: s?.id || `team-eng-${Date.now()}`,
        name: selectedEngineer.trim(),
        role: s?.designation || s?.role_name || 'Site Engineer',
        phone: s?.phone ? `+91 ${s.phone}` : '',
        email: s?.email || ''
      });
    }
    if (selectedSupervisor.trim()) {
      const s = findStaff(selectedSupervisor);
      assignedTeam.push({
        id: s?.id || `team-sup-${Date.now()}`,
        name: selectedSupervisor.trim(),
        role: s?.designation || s?.role_name || 'Site Supervisor',
        phone: s?.phone ? `+91 ${s.phone}` : '',
        email: s?.email || ''
      });
    }
    // Automatically assign the default company accountant to manage project accounts if available
    if (defaultAccountsStaff) {
      assignedTeam.push({
        id: defaultAccountsStaff.id || `team-acc-default`,
        name: defaultAccountsStaff.name,
        role: (defaultAccountsStaff as any).designation || (defaultAccountsStaff as any).role_name || 'Accounts',
        phone: defaultAccountsStaff.phone ? `+91 ${defaultAccountsStaff.phone}` : '',
        email: defaultAccountsStaff.email || ''
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

    const lowerType = (newProjectType || '').toLowerCase();
    const resolvedCategory = lowerType.includes('gov') ? 'Government Projects' : 'Private Construction';

    const newProj: Project = {
      id: newProjId,
      code: code,
      name: displayName,
      client_name: cleanClientName || cleanProjName,
      department: targetDeptId,
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
    setNewEstimatedBudget('');
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


  // AFC Drawings list
  const drawings: any[] = [];

  // ==========================================
  // VIEW 2: "Creating Project" Full-Screen Setup Studio
  // ==========================================
  if (viewMode === 'create') {
    const activeTasksCount = wizardTasks.filter(t => selectedTaskIds.includes(t.id)).length;
    const effectiveDeptId = (isRestrictedDeptUser && userDept)
      ? normalizeDepartmentId(userDept)
      : (activeDeptId !== 'booshnam_associates' ? activeDeptId : newDepartment);
    const currentDeptObj = ORGANIZATION_DEPARTMENTS.find(d => d.id === effectiveDeptId || d.name === effectiveDeptId) || ORGANIZATION_DEPARTMENTS[1];
    const displayedWizardTasks = taskDeptFilter === 'ALL'
      ? wizardTasks
      : wizardTasks.filter(t => t.department === taskDeptFilter);

    return (
      <div className="min-h-screen w-full bg-slate-100/75 flex flex-col antialiased">
        {/* ── TOP FULL-SCREEN HEADER BAR ── */}
        <header className="w-full bg-white border-b border-slate-200/90 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          {/* Left: Branding & Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCancelWizard}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Back to Projects"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-[21px] font-bold text-[#262626] font-heading tracking-tight">Creating Project</h1>
            </div>
          </div>

          {/* Center: Modern Stepper */}
          <div className="flex items-center gap-1 sm:gap-2 bg-slate-50 border border-slate-200/80 px-2 sm:px-3 py-1.5 rounded-2xl shadow-2xs">
            {/* Step 1 Pill */}
            <button
              type="button"
              onClick={() => setWizardStep(1)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                wizardStep === 1
                  ? 'bg-red-600 text-white shadow-xs'
                  : wizardStep > 1
                  ? 'text-slate-700 hover:bg-slate-200/60'
                  : 'text-slate-400'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                wizardStep === 1 ? 'bg-white/20 text-white' : wizardStep > 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
              }`}>
                {wizardStep > 1 ? <Check className="w-3 h-3" /> : '1'}
              </span>
              <span className="hidden md:inline">1. Details</span>
            </button>

            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />

            {/* Step 2 Pill */}
            <button
              type="button"
              onClick={() => {
                if (newProjectName.trim()) setWizardStep(2);
                else setWizardError('Please enter a Project Name');
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                wizardStep === 2
                  ? 'bg-red-600 text-white shadow-xs'
                  : wizardStep > 2
                  ? 'text-slate-700 hover:bg-slate-200/60'
                  : 'text-slate-400'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                wizardStep === 2 ? 'bg-white/20 text-white' : wizardStep > 2 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
              }`}>
                {wizardStep > 2 ? <Check className="w-3 h-3" /> : '2'}
              </span>
              <span className="hidden md:inline">2. Team</span>
            </button>

            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />

            {/* Step 3 Pill */}
            <button
              type="button"
              onClick={() => {
                if (newProjectName.trim()) setWizardStep(3);
                else setWizardError('Please enter a Project Name');
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                wizardStep === 3
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-400'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                wizardStep === 3 ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                3
              </span>
              <span className="hidden md:inline">3. Predefined Tasks</span>
            </button>
          </div>

          {/* Right: Fullscreen Mode & Close Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleWizardFullscreen}
              className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
              title={isWizardFullscreen ? "Exit Fullscreen" : "Fullscreen Studio Mode"}
            >
              {isWizardFullscreen ? <Minimize2 className="w-4 h-4 text-red-600" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button 
              type="button"
              onClick={handleCancelWizard}
              className="p-2 hover:bg-red-50 hover:text-red-600 rounded-xl text-slate-400 transition-colors cursor-pointer border border-transparent hover:border-red-100"
              title="Close Wizard"
              aria-label="Close Wizard"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* ── MAIN EXPANSIVE 12-COLUMN STUDIO CANVAS ── */}
        <main className="flex-1 w-full max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ── LEFT/CENTER (8 COLUMNS): ACTIVE WIZARD STEP ── */}
            <div className="lg:col-span-8 space-y-6">

              {/* STEP 1: Project Details */}
              {wizardStep === 1 && (
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-7 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                        Project Details
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Enter key project parameters, commercial classification, and client contact information.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                      Step 1 of 3
                    </span>
                  </div>

                  {wizardError && (
                    <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                      <span className="font-semibold">{wizardError}</span>
                    </div>
                  )}

                  {/* Section A: Project Identity */}
                  <div className="space-y-4">
                    <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-3.5 bg-red-600 rounded-full" />
                      General Identity
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Project Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newProjectName}
                        onChange={(e) => {
                          setNewProjectName(e.target.value);
                          if (wizardError) setWizardError('');
                        }}
                        className="w-full px-4 py-3 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/10 transition shadow-2xs"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Client Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Apex Living Developers"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/10 transition"
                      />
                    </div>
                  </div>

                  {/* Section B: Location & Financials */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-3.5 bg-red-600 rounded-full" />
                      Location & Financials
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Address / Site Location</label>
                        <input
                          type="text"
                          value={newAddress}
                          onChange={(e) => setNewAddress(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/10 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">City</label>
                        <input
                          type="text"
                          value={newCity}
                          onChange={(e) => setNewCity(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/10 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700">Estimated Budget (₹ INR)</label>
                        {newEstimatedBudget && parseFloat(newEstimatedBudget) > 0 && (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                            {formatINR(newEstimatedBudget)} {getLakhsCroresText(newEstimatedBudget)}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <span className="absolute left-3.5 top-2.5 text-base font-bold text-slate-500 select-none">₹</span>
                        <input
                          type="number"
                          min="0"
                          value={newEstimatedBudget}
                          onChange={(e) => setNewEstimatedBudget(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/10 transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Continue Button */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleCancelWizard}
                      className="px-5 py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleWizardContinueToStep2}
                      className="px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl shadow-md shadow-red-600/20 hover:shadow-lg hover:shadow-red-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-98"
                    >
                      <span>Continue to Team Assignment (Step 2)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Team Assignment */}
              {wizardStep === 2 && (
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-7 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Users className="w-5 h-5 text-red-600" />
                        Assign Key Team Members
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Designate site engineers, project managers, and supervisors for daily field operations.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                      Step 2 of 3
                    </span>
                  </div>

                  {/* 3-Column Grid of Key Leadership Roles - Perfectly Aligned */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-stretch">
                    {/* Project Manager */}
                    <div className="p-4 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/90 rounded-2xl flex flex-col justify-between transition-all">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                            <Briefcase className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-100 whitespace-nowrap">
                            Execution Lead
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 leading-tight">
                          Project Manager
                        </h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed mt-1 h-8 line-clamp-2">
                          Oversees timelines, project coordination, and client updates.
                        </p>
                      </div>
                      <div className="mt-3.5 pt-1">
                        <SelectOrTypeInput
                          value={selectedPM}
                          onChange={setSelectedPM}
                          options={pmOptions}
                          placeholder="Select Project Manager..."
                        />
                      </div>
                    </div>

                    {/* Site Engineer */}
                    <div className="p-4 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/90 rounded-2xl flex flex-col justify-between transition-all">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                            <UserCheck className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-100 whitespace-nowrap">
                            Field Technical
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 leading-tight">
                          Site Engineer
                        </h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed mt-1 h-8 line-clamp-2">
                          Manages structural measurements, drawings, and daily DPRs.
                        </p>
                      </div>
                      <div className="mt-3.5 pt-1">
                        <SelectOrTypeInput
                          value={selectedEngineer}
                          onChange={setSelectedEngineer}
                          options={engineerOptions}
                          placeholder="Select Site Engineer..."
                        />
                      </div>
                    </div>

                    {/* Site Supervisor */}
                    <div className="p-4 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/90 rounded-2xl flex flex-col justify-between transition-all">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100 whitespace-nowrap">
                            Manpower & Safety
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 leading-tight">
                          Site Supervisor / Safety
                        </h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed mt-1 h-8 line-clamp-2">
                          Manages worker attendance, material unloading, and safety checklist.
                        </p>
                      </div>
                      <div className="mt-3.5 pt-1">
                        <SelectOrTypeInput
                          value={selectedSupervisor}
                          onChange={setSelectedSupervisor}
                          options={supervisorOptions}
                          placeholder="Select Site Supervisor..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Key Team Members Section */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-indigo-600" />
                          Additional Team Members ({additionalTeam.length})
                        </span>
                        <p className="text-[11px] text-slate-500">Add draftsmen, safety officers, quality auditors, or sub-engineers.</p>
                      </div>
                      {!showAddExtraMember && (
                        <button
                          type="button"
                          onClick={() => setShowAddExtraMember(true)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-indigo-200/60 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add More Staff</span>
                        </button>
                      )}
                    </div>

                    {/* List of Added Members */}
                    {additionalTeam.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {additionalTeam.map((m, idx) => (
                          <div key={idx} className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center">
                                {m.name.slice(0, 1).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-slate-800 block leading-tight">{m.name}</span>
                                <span className="text-[10px] text-indigo-600 font-medium">{m.role}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAdditionalTeam(prev => prev.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inline Form to Add Extra Member */}
                    {showAddExtraMember && (
                      <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-3">
                        <div className="text-xs font-bold text-indigo-900">
                          Assign Staff Member with Designation
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
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
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              Designation / Role on Project
                            </label>
                            <input
                              type="text"
                              value={extraMemberRole}
                              onChange={(e) => setExtraMemberRole(e.target.value)}
                              placeholder="e.g. Architect, Quality Auditor..."
                              className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-medium bg-white focus:outline-none focus:border-indigo-600"
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
                            className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleAddExtraMember}
                            disabled={!extraMemberName.trim()}
                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Assign Staff</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Navigation Buttons */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="px-5 py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Back to Details</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleWizardContinueToStep3}
                      className="px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl shadow-md shadow-red-600/20 hover:shadow-lg hover:shadow-red-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-98"
                    >
                      <span>Continue to Predefined Tasks (Step 3)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Predefined Tasks */}
              {wizardStep === 3 && (
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                        Automatic Predefined Tasks & Workflow
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Tasks pre-populated for this project. Check or uncheck to include, click Edit to customize, or add new tasks.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-slate-700 bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-xl">
                        {selectedTaskIds.length} / {wizardTasks.length} Active
                      </span>
                    </div>
                  </div>

                  {/* Filter Tabs & Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2">
                    {/* Department Filter Tabs */}
                    <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl overflow-x-auto no-scrollbar">
                      {(['ALL', 'MATERIAL_TESTING', 'STRUCTURAL', 'SOIL_INVESTIGATION', 'ARCHITECTURE', 'CONSTRUCTION', 'SURVEY', 'MARKETING', 'ACCOUNTS'] as const).map((deptKey) => {
                        const isTabActive = taskDeptFilter === deptKey;
                        const label = deptKey === 'ALL' ? 'All' 
                          : deptKey === 'MATERIAL_TESTING' ? 'Material Test'
                          : deptKey === 'STRUCTURAL' ? 'Structural'
                          : deptKey === 'SOIL_INVESTIGATION' ? 'Soil Test' 
                          : deptKey === 'CONSTRUCTION' ? 'Civil' 
                          : deptKey === 'ARCHITECTURE' ? 'Architecture'
                          : deptKey === 'SURVEY' ? 'Survey'
                          : deptKey === 'MARKETING' ? 'Marketing'
                          : 'Accounts';
                        return (
                          <button
                            key={deptKey}
                            type="button"
                            onClick={() => setTaskDeptFilter(deptKey as any)}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                              isTabActive
                                ? 'bg-white text-red-600 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllTasks}
                        className="text-xs font-bold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 transition cursor-pointer"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={deselectAllTasks}
                        className="text-xs font-bold text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                      >
                        Deselect All
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingCustomTask(true)}
                        className="text-xs font-bold text-white px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Task</span>
                      </button>
                    </div>
                  </div>

                  {/* Inline Form to Add Custom Predefined Task */}
                  {isAddingCustomTask && (
                    <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3 animate-in fade-in">
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
                          <label className="block font-bold text-slate-700 mb-1">Task Title *</label>
                          <input
                            type="text"
                            value={customTaskForm.title}
                            onChange={(e) => setCustomTaskForm({ ...customTaskForm, title: e.target.value })}
                            placeholder="e.g. Concrete Cube Testing or Borehole Drilling"
                            className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-xs font-medium"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Department</label>
                          <CustomSelect
                            value={customTaskForm.department}
                            onChange={(val) => setCustomTaskForm({ ...customTaskForm, department: val as any })}
                            options={[
                              { label: 'Material Testing', value: 'MATERIAL_TESTING' },
                              { label: 'Structural', value: 'STRUCTURAL' },
                              { label: 'Soil Investigation', value: 'SOIL_INVESTIGATION' },
                              { label: 'Architecture', value: 'ARCHITECTURE' },
                              { label: 'Construction', value: 'CONSTRUCTION' },
                              { label: 'Survey', value: 'SURVEY' },
                              { label: 'Marketing', value: 'MARKETING' },
                              { label: 'Accounts', value: 'ACCOUNTS' },
                            ]}
                            size="sm"
                            variant="brand"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Priority</label>
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
                        <label className="block font-bold text-slate-700 mb-1 text-xs">Description</label>
                        <input
                          type="text"
                          value={customTaskForm.description}
                          onChange={(e) => setCustomTaskForm({ ...customTaskForm, description: e.target.value })}
                          placeholder="Brief details about the task execution..."
                          className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-xs font-medium"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsAddingCustomTask(false)}
                          className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleAddCustomPredefinedTask}
                          disabled={!customTaskForm.title.trim()}
                          className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add to Tasks</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tasks Grid */}
                  <div className="max-h-[500px] overflow-y-auto pr-1 space-y-2.5 scrollbar-thin scrollbar-thumb-slate-200">
                    {displayedWizardTasks.map((t) => {
                      const isChecked = selectedTaskIds.includes(t.id);

                      if (editingTask && editingTask.id === t.id) {
                        return (
                          <div key={t.id} className="p-4 bg-red-50/40 border border-red-200 rounded-2xl space-y-3">
                            <div className="font-bold text-xs text-red-900">Edit Predefined Task</div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-1">Title</label>
                                <input
                                  type="text"
                                  value={editingTask.title}
                                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                                  className="w-full h-9 px-2.5 border border-slate-200 rounded-lg text-xs bg-white font-medium"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-1">Department</label>
                                <CustomSelect
                                  value={editingTask.department}
                                  onChange={(val) => setEditingTask({ ...editingTask, department: val as any })}
                                  options={[
                                    { label: 'Material Testing', value: 'MATERIAL_TESTING' },
                                    { label: 'Structural', value: 'STRUCTURAL' },
                                    { label: 'Soil Investigation', value: 'SOIL_INVESTIGATION' },
                                    { label: 'Architecture', value: 'ARCHITECTURE' },
                                    { label: 'Construction', value: 'CONSTRUCTION' },
                                    { label: 'Survey', value: 'SURVEY' },
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
                                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-xs font-medium resize-none"
                              />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setEditingTask(null)}
                                className="px-3.5 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditedTask(editingTask)}
                                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-2xs"
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
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                            isChecked 
                              ? 'bg-white border-red-200 hover:border-red-300 shadow-xs' 
                              : 'bg-slate-50/70 border-slate-200 opacity-60 hover:opacity-90'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleTaskSelection(t.id);
                            }}
                            className="mt-1 w-4 h-4 rounded text-red-600 border-slate-300 focus:ring-red-500 cursor-pointer accent-red-600"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-bold ${isChecked ? 'text-slate-900' : 'text-slate-600'}`}>
                                  {t.title}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                  {t.department}
                                </span>
                                {t.default_priority && (
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                    t.default_priority === 'URGENT' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                    t.default_priority === 'HIGH' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                    t.default_priority === 'MEDIUM' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                                    'bg-slate-100 text-slate-600'
                                  }`}>
                                    {t.default_priority}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => setEditingTask({ ...t })}
                                  className="px-2.5 py-1 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg border border-transparent hover:border-slate-200 transition cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
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
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="px-5 py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Back to Team</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleWizardSubmit}
                      className="px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl shadow-md shadow-red-600/25 hover:shadow-lg hover:shadow-red-600/35 transition-all flex items-center gap-2 cursor-pointer active:scale-98"
                    >
                      <Check className="w-4 h-4" />
                      <span>Create Project ({selectedTaskIds.length} Tasks)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT (4 COLUMNS): LIVE PROJECT SUMMARY PREVIEW ── */}
            <div className="lg:col-span-4 sticky top-20 space-y-4">
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Live Project Preview
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    Step {wizardStep} of 3
                  </span>
                </div>

                {/* Identity Preview Card */}
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm shadow-red-500/25">
                    {newProjectName.trim() ? newProjectName.slice(0, 2).toUpperCase() : 'PR'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      {newProjectName.trim() || <span className="text-slate-400 italic font-normal">Untitled Project</span>}
                    </h4>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {newClientName.trim() ? `Client: ${newClientName}` : 'Client not specified'}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-100">
                        {currentDeptObj?.shortName || currentDeptObj?.name || 'Department'}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 truncate max-w-[140px]">
                        {newProjectType}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Parameters Grid */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Site Location</div>
                    <div className="text-xs font-bold text-slate-800 truncate mt-1">
                      {newCity.trim() || (newAddress.trim() ? newAddress : 'Location TBD')}
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Est. Budget</div>
                    <div className="text-xs font-bold text-emerald-700 truncate mt-1">
                      {formatINR(newEstimatedBudget)}
                    </div>
                    {getLakhsCroresText(newEstimatedBudget) && (
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        {getLakhsCroresText(newEstimatedBudget)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Team Allocation Summary */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                    <span>Key Leadership</span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {[selectedPM, selectedEngineer, selectedSupervisor].filter(Boolean).length} / 3 Assigned
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400 text-[11px] flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-red-500" /> PM:
                      </span>
                      <span className="font-semibold truncate max-w-[160px] text-slate-800">
                        {selectedPM || <span className="text-slate-400 italic font-normal">Pending</span>}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400 text-[11px] flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-sky-500" /> Engineer:
                      </span>
                      <span className="font-semibold truncate max-w-[160px] text-slate-800">
                        {selectedEngineer || <span className="text-slate-400 italic font-normal">Pending</span>}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400 text-[11px] flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-amber-500" /> Supervisor:
                      </span>
                      <span className="font-semibold truncate max-w-[160px] text-slate-800">
                        {selectedSupervisor || <span className="text-slate-400 italic font-normal">Pending</span>}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400 text-[11px] flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-emerald-500" /> Accounts:
                      </span>
                      {defaultAccountsStaff ? (
                        <span className="font-semibold truncate max-w-[160px] text-emerald-700 flex items-center gap-1">
                          {defaultAccountsStaff.name}
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">Default</span>
                        </span>
                      ) : (
                        <span className="font-semibold truncate max-w-[160px] text-slate-800">
                          {selectedAccounts || <span className="text-slate-400 italic font-normal">Pending</span>}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Readiness Checklist */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="text-[11px] font-bold text-slate-800">Setup Readiness</div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      {newProjectName.trim() ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span className={newProjectName.trim() ? 'text-slate-800 font-semibold' : 'text-slate-400'}>
                        Project Name & Identity
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {newDepartment ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span className={newDepartment ? 'text-slate-800 font-semibold' : 'text-slate-400'}>
                        Department & Classification
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {(selectedPM || selectedEngineer) ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span className={(selectedPM || selectedEngineer) ? 'text-slate-800 font-semibold' : 'text-slate-400'}>
                        Site Leadership Assigned
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedTaskIds.length > 0 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span className={selectedTaskIds.length > 0 ? 'text-slate-800 font-semibold' : 'text-slate-400'}>
                        {selectedTaskIds.length} Workflow Tasks Selected
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </main>
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
            const curDept = getActiveDepartmentId();
            setNewDepartment(curDept === 'booshnam_associates' ? 'SOIL_INVESTIGATION' : curDept);
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
          userRole={currentUser.role_code}
          userRoleName={currentUser.role_name}
        />

        {/* Workspace Content Router (13 Functional Pages) */}
        <div className="px-6 py-5 flex-1 min-w-0">
          {workspaceTab === 'dashboard' && (
            <DashboardTab
              project={activeProject}
              tasks={tasks.filter(t => t.project === activeProject.id || t.project_id === activeProject.id)}
              approvals={approvals.filter(a => a.project === activeProject.id || a.project_id === activeProject.id)}
              materialRequests={materialRequests.filter(m => m.project === activeProject.id || m.project_id === activeProject.id)}
              onNavigateTab={setWorkspaceTab}
              onOpenTeamModal={() => setIsTeamModalOpen(true)}
            />
          )}

          {workspaceTab === 'design' && !isSoilDepartmentProject(activeProject) && (
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

          {workspaceTab === 'attendance' && !isSoilDepartmentProject(activeProject) && (
            <AttendanceTab
              project={activeProject}
              onShowToast={onShowToast}
            />
          )}

          {workspaceTab === 'material' && !isSoilDepartmentProject(activeProject) && (
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

          {workspaceTab === 'equipment' && !isSoilDepartmentProject(activeProject) && (
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
          onDeleteProject={handleDeleteProject}
          isSuperAdmin={isSuperAdmin}
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


  // Deterministic Avatar Generator ensuring solid background & clear contrast
  const getProjectAvatar = (p: Project) => {
    const title = formatProjectTitle(p);
    const initials = p.initials || title.split('(')[0].trim().slice(0, 2).toUpperCase() || 'PR';
    const palette = [
      'bg-emerald-600',
      'bg-teal-600',
      'bg-red-600',
      'bg-sky-600',
      'bg-indigo-600',
      'bg-amber-600',
      'bg-purple-600',
      'bg-rose-600',
    ];
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    const fallbackColor = palette[Math.abs(hash) % palette.length];
    const resolvedColor = (p.avatar_color && p.avatar_color.startsWith('bg-')) ? p.avatar_color : fallbackColor;
    return { initials, colorClass: resolvedColor };
  };

  // ==========================================
  // ==========================================
  // EMPLOYEE VIEW: Card-based assigned projects
  // ==========================================
  if (!isSuperOrAdmin) {
    const userFirstName = currentUser.first_name || 'Employee';
    const userRoleName = currentUser.role_name || 'Staff';
    const today = new Date();
    const greeting = today.getHours() < 12 ? 'Good Morning' : today.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

    const formatDate = (dateStr?: string) => {
      if (!dateStr) return '-';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
        {/* Employee Top Bar */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-10 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              {userFirstName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs text-slate-500">{greeting},</p>
              <h1 className="text-sm font-bold text-slate-900 leading-tight">{userFirstName} <span className="text-slate-400 font-normal">· {userRoleName}</span></h1>
            </div>
          </div>
          <UserProfileDropdown showBell={true} onShowToast={onShowToast} />
        </div>

        {/* Home Content */}
        <div className="flex-1 px-4 sm:px-6 py-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">My Assigned Projects</h2>
              <p className="text-xs text-slate-500 mt-0.5">{filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} assigned to you</p>
            </div>
            <div className="relative w-48">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 shadow-xs focus:outline-none focus:border-red-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-400 flex items-center justify-center shadow-xs">
                <Layers className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-800">No projects assigned</p>
                <p className="text-xs text-slate-500 mt-1">You haven't been assigned to any projects yet.<br/>Contact your admin to get assigned.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredProjects.map((p) => {
                const stats = getProjectLiveStats(p);
                const avatar = getProjectAvatar(p);
                const sc = stats.status === 'COMPLETED'
                  ? { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Completed' }
                  : stats.status === 'PLANNING'
                  ? { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400', label: 'Planning' }
                  : stats.status === 'ON_HOLD'
                  ? { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500', label: 'On Hold' }
                  : { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500 animate-pulse', label: 'Ongoing' };

                return (
                  <div key={p.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden group">
                    <div className={`h-1.5 ${avatar.colorClass}`} />
                    <div className="p-5 flex-1 flex flex-col gap-3.5">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl ${avatar.colorClass} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm`}>
                          {avatar.initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-red-600 transition-colors">
                            {formatProjectTitle(p)}
                          </h3>
                          {p.code && (
                            <p className="text-[10px] text-slate-400 tracking-tight mt-0.5 tracking-wide">{p.code}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {(p.location || p.city) && (
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{p.location || p.city}</span>
                          </div>
                        )}
                        {p.client_name && p.client_name !== p.name && (
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{p.client_name}</span>
                          </div>
                        )}
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${sc.bg} ${sc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          {sc.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-3 py-3 border-t border-slate-100 text-xs">
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Start</p>
                          <p className="font-medium text-slate-700 mt-0.5">{formatDate(p.start_date)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">End</p>
                          <p className="font-medium text-slate-700 mt-0.5">{formatDate(p.end_date)}</p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 font-semibold uppercase tracking-wide">Progress</span>
                          <span className="font-bold text-slate-700 tracking-tight">{stats.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${stats.progress === 100 ? 'bg-blue-500' : 'bg-red-500'}`} style={{ width: `${stats.progress}%` }} />
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenProjectDetails(p)}
                        className="w-full mt-auto py-2.5 bg-slate-900 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm hover:shadow"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View Project
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <ProjectSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          project={activeProject || allProjects[0] || project || ({} as Project)}
          onUpdateProject={(upd) => {
            setActiveProject(upd);
            handleUpdateProjects(allProjects.map(p => p.id === upd.id ? upd : p));
          }}
          onDeleteProject={handleDeleteProject}
          isSuperAdmin={false}
          onShowToast={onShowToast}
        />
      </div>
    );
  }

  // VIEW 1: Projects List / Hub (Matching Screenshot 1)
  // ==========================================
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
      {/* Top Header Bar Inside Full-Bleed View */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white sticky top-0 z-10">
        <div>
          <h1 className="text-[21px] font-bold text-[#262626] font-heading tracking-tight">Projects</h1>
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
              {deptPendingApprovals}
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
            <div className="text-2xl font-bold text-slate-900">{deptPendingMaterials}</div>
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
            <div className="text-2xl font-bold text-slate-900">{deptPendingTodos}</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
            <ListTodo className="w-5 h-5" />
          </div>
        </div>
      </div>



      {/* ── UNIFIED FILTER & ACTION TOOLBAR ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* Left: Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Dropdown */}
          <div className="w-28">
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
          <div className="w-52">
            <CustomSelect
              value={isRestrictedDeptUser && userDept ? normalizeDepartmentId(userDept) : activeDeptId}
              onChange={(val) => {
                if (!isRestrictedDeptUser) {
                  setActiveDepartmentId(val as any);
                  setActiveDeptId(val);
                }
              }}
              disabled={isRestrictedDeptUser}
              options={departmentFilterOptions}
              prefix="Dept: "
              size="sm"
              variant="brand"
            />
          </div>

          {/* Project Type Dropdown */}
          <div className="w-44">
            <CustomSelect
              value={categoryFilter}
              onChange={(val) => setCategoryFilter(val)}
              options={[
                { label: 'Type: All', value: 'All' },
                { label: 'Private Construction', value: 'Private Construction' },
                { label: 'Government Projects', value: 'Government Projects' },
              ]}
              placeholder="Project Type"
              size="sm"
              variant="brand"
            />
          </div>

          {/* Stage Dropdown */}
          <div className="w-44">
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

          {/* Count Badge */}
          <span className="h-8 px-3 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-200/80 shadow-2xs flex items-center justify-center gap-1">
            <span className="text-slate-500 font-normal">Total:</span> {filteredProjects.length}
          </span>
        </div>

        {/* Right: Search, Download, and + New Project */}
        <div className="flex items-center gap-2.5">
          {/* Search Projects Input */}
          <div className="relative w-52">
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
              const curDept = getActiveDepartmentId();
              setNewDepartment(curDept === 'booshnam_associates' ? 'SOIL_INVESTIGATION' : curDept);
              setNewProjectName('');
              setNewClientName('');
              setNewAddress('');
              setNewCity('');
              setNewEstimatedBudget('');
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

      {/* ── PROJECTS LIST TABLE (PERFECT ALIGNMENT & DESIGN) ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden mt-3">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-600 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider select-none">
              <tr>
                <th className="py-3.5 px-6 w-[35%]">Name</th>
                <th className="py-3.5 px-4 w-36 text-center">Status</th>
                <th className="py-3.5 px-5 w-44 text-center">Progress</th>
                <th className="py-3.5 px-5 w-48 text-center">In / Out</th>
                <th className="py-3.5 px-5 w-20 text-center">Pin</th>
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
                  const avatar = getProjectAvatar(p);

                  return (
                    <tr 
                      key={p.id} 
                      className={`hover:bg-slate-50/80 transition-colors group align-middle ${
                        isPinned ? 'bg-red-50/20' : ''
                      }`}
                    >
                      {/* Name Column with Clean Subtitle */}
                      <td className="py-4 px-6 align-middle">
                        <div className="flex items-center gap-3.5">
                          {/* Name Text - Clickable to open Project Details */}
                          <div className="min-w-0 flex-1 max-w-2xl">
                            <button
                              onClick={() => handleOpenProjectDetails(p)}
                              className="text-left font-bold text-slate-900 hover:text-red-600 transition-colors cursor-pointer leading-snug group-hover:text-red-600 text-[15px]"
                              title="Click to view overall project details, pending work, and finances"
                            >
                              {formatProjectTitle(p)}
                            </button>
                            <div className="flex items-center gap-2 mt-1 flex-wrap text-slate-500">
                              {p.client_name && p.client_name !== p.name && (
                                <span className="text-[11px] text-slate-700 font-medium">
                                  {p.client_name}
                                </span>
                              )}
                              {(p.client_name && p.client_name !== p.name) && (p.location || p.city) && (
                                <span className="text-slate-300">•</span>
                              )}
                              {(p.location || p.city) && (
                                <span className="text-[11px] text-slate-400">
                                  {p.location || p.city}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="py-4 px-4 text-center align-middle whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-700">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            stats.status === 'COMPLETED' ? 'bg-blue-500' :
                            stats.status === 'PLANNING' ? 'bg-amber-500' :
                            stats.status === 'ON_HOLD' ? 'bg-rose-500' :
                            'bg-emerald-500 animate-pulse'
                          }`} />
                          <span>
                            {stats.status === 'COMPLETED' ? 'Completed' :
                             stats.status === 'PLANNING' ? 'Planning' :
                             stats.status === 'ON_HOLD' ? 'On Hold' : 'Ongoing'}
                          </span>
                        </span>
                      </td>

                      {/* Progress Column */}
                      <td className="py-4 px-5 align-middle whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2.5">
                          <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                progressVal === 100 ? 'bg-blue-600' : progressVal > 0 ? 'bg-emerald-500' : 'bg-slate-200'
                              }`}
                              style={{ width: `${progressVal}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-800 tracking-tight w-9 text-right">
                            {progressVal}%
                          </span>
                        </div>
                      </td>

                      {/* In / Out Column - Clean stacked display with aligned numbers */}
                      <td className="py-4 px-5 text-center align-middle whitespace-nowrap">
                        <div className="inline-flex flex-col items-start tracking-tight text-[13px] leading-tight gap-1.5">
                          <div className="flex items-center gap-1.5 text-emerald-700 font-bold whitespace-nowrap">
                            <span className="text-[10px] text-slate-400 font-sans font-semibold tracking-wider w-8 text-left">IN:</span>
                            <span>₹ {(p.cash_in !== undefined ? p.cash_in : 0).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-700 font-semibold whitespace-nowrap">
                            <span className="text-[10px] text-slate-400 font-sans font-semibold tracking-wider w-8 text-left">OUT:</span>
                            <span>₹ {(p.cash_out !== undefined ? p.cash_out : 0).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </td>

                      {/* Actions Column (Pin & Super Admin Delete Buttons) */}
                      <td className="py-4 px-5 text-center align-middle whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => togglePin(p.id)}
                            className={`p-2 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center ${
                              isPinned 
                                ? 'text-red-600 bg-red-50 hover:bg-red-100 shadow-2xs' 
                                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                            }`}
                            title={isPinned ? 'Unpin Project' : 'Pin Project to top'}
                          >
                            <Pin className={`w-4 h-4 transition-transform ${isPinned ? 'fill-red-600 rotate-45' : 'group-hover:scale-110'}`} />
                          </button>

                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setProjectToDelete(p);
                              }}
                              className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer inline-flex items-center justify-center group"
                              title="Delete Project"
                            >
                              <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            </button>
                          )}
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
        onDeleteProject={handleDeleteProject}
        isSuperAdmin={isSuperAdmin}
        onShowToast={onShowToast}
      />

      {/* Delete Project Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-red-100 p-6 overflow-hidden space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-xs">
                <Trash2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 text-base">Delete Project</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to permanently delete <strong className="text-slate-800">{formatProjectTitle(projectToDelete)}</strong>?
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 text-[11px] text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                This action <strong>cannot be undone</strong>. All tasks, DPR reports, material requests, and budget records associated with this project will be permanently erased.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                disabled={isDeletingProject}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteProject(projectToDelete)}
                disabled={isDeletingProject}
                className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-98 rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingProject ? 'Deleting...' : 'Yes, Delete Project'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
