import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, CheckCircle2, Clock, AlertCircle, FileText, 
  Calendar, Layers, Flag, Download, Check, Search, 
  ThumbsUp, ShoppingCart, ListTodo, ArrowLeft, Pin, 
  MoreVertical, Bell, Settings, BarChart2,
  User, ExternalLink, ChevronRight, Filter, TrendingUp,
  CheckSquare, Sparkles, Phone, Mail, MapPin, Briefcase,
  DollarSign, PlusCircle, UserCheck, ShieldCheck, X, Users, Edit2, Building2, ChevronLeft, ArrowRight, Maximize2, Minimize2, Compass,
  Trash2, AlertTriangle, ChevronDown, Lock
} from 'lucide-react';
import { ProjectTopNav, WorkspaceTabId, isSoilDepartmentProject, SOIL_EXCLUDED_TABS } from '../components/project-workspace/ProjectTopNav';
import { ProjectSettingsModal } from '../components/project-workspace/ProjectSettingsModal';
import { ProjectTeamModal } from '../components/project-workspace/ProjectTeamModal';
import { AddStaffModal } from '../components/project-workspace/AddStaffModal';
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
import { Project, WBSTask, ApprovalRequest, MaterialRequest, ProjectTeamMember, PredefinedTaskTemplate, Department, SubconWorkOrder } from '../types';
import { SelectOrTypeInput, SelectOption } from '../components/SelectOrTypeInput';
import { CustomSelect } from '../components/CustomSelect';
import { DepartmentMultiSelectFilter } from '../components/DepartmentMultiSelectFilter';
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
  getOrInitializeProjects,
  isUserCompanyWideSuperAdmin,
  getUserAllowedDepartmentIds
} from '../lib/departmentService';
import { getCurrentUserAccount, UserAccount } from '../lib/authService';
import { DepartmentLogo } from '../components/DepartmentLogo';
import { toggleBrowserFullscreen, addFullscreenChangeListener } from '../lib/fullscreenService';
import { syncAllProjectsFinancials } from '../lib/projectFinanceUtils';
import StatsAndButton from '../components/StatsAndButton';
import { ensurePartyExists, getFinanceParties } from '../lib/financeSyncService';
import { markProjectDeleted, isProjectDeleted } from '../lib/projectAccessService';

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
const BUDGET_PRESETS = [
  { label: '₹10 L', value: 1000000 },
  { label: '₹25 L', value: 2500000 },
  { label: '₹50 L', value: 5000000 },
  { label: '₹1 Cr', value: 10000000 },
  { label: '₹2.5 Cr', value: 25000000 },
  { label: '₹5 Cr', value: 50000000 },
];

const SummaryCardWave: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`absolute right-0 bottom-0 pointer-events-none select-none overflow-hidden ${className}`}>
    <svg
      className="w-28 h-18 sm:w-32 sm:h-20"
      viewBox="0 0 130 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0 80C24 72 45 46 78 56C102 64 114 42 130 30V80H0Z"
        fill="currentColor"
        fillOpacity="0.08"
      />
      <path
        d="M20 80C44 75 62 52 92 60C108 64 120 50 130 42V80H20Z"
        fill="currentColor"
        fillOpacity="0.14"
      />
      <path
        d="M48 80C72 76 88 62 108 65C118 67 125 60 130 54V80H48Z"
        fill="currentColor"
        fillOpacity="0.22"
      />
      {/* 3 ascending signal bars */}
      <rect x="113" y="26" width="2.5" height="6.5" rx="1.25" fill="currentColor" fillOpacity="0.4" />
      <rect x="118.5" y="21" width="2.5" height="11.5" rx="1.25" fill="currentColor" fillOpacity="0.6" />
      <rect x="124" y="15" width="2.5" height="17.5" rx="1.25" fill="currentColor" fillOpacity="0.85" />
    </svg>
  </div>
);

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
  const [activeProject, setActiveProject] = useState<Project | null>(propSelectedProject || null);
  const [detailTab, setDetailTab] = useState<'overview' | 'wbs' | 'gantt' | 'drawings'>('overview');
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTabId>('dashboard');
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [projectForAddStaff, setProjectForAddStaff] = useState<Project | null>(null);

  // Auto-redirect to dashboard if current workspace tab is excluded for Soil Investigation projects
  useEffect(() => {
    if (activeProject && isSoilDepartmentProject(activeProject) && SOIL_EXCLUDED_TABS.includes(workspaceTab)) {
      setWorkspaceTab('dashboard');
    }
  }, [activeProject, workspaceTab]);


  // Sync propSelectedProject changes into activeProject
  useEffect(() => {
    if (propSelectedProject) {
      setActiveProject(propSelectedProject);
      setViewMode('details');
    } else {
      setActiveProject(null);
      setViewMode('list');
    }
  }, [propSelectedProject]);

  // Listen for explicit show all projects event (e.g. from sidebar Projects click)
  useEffect(() => {
    const handleShowAll = () => {
      setActiveProject(null);
      setViewMode('list');
      onSelectProject?.(null);
    };
    window.addEventListener('booshnam_show_all_projects', handleShowAll);
    return () => window.removeEventListener('booshnam_show_all_projects', handleShowAll);
  }, [onSelectProject]);

  // Filter & Search states for Projects list
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [stageFilter, setStageFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());

  // Active Department State (Synchronized with global switcher)
  const [activeDeptId, setActiveDeptId] = useState<string>(() => getActiveDepartmentId());

  // In-view multi-department filter for Booshnam Associates (Super Admin Overview)
  const [overviewDeptIds, setOverviewDeptIds] = useState<string[]>(['ALL']);

  useEffect(() => {
    setOverviewDeptIds(['ALL']);
  }, [activeDeptId]);

  useEffect(() => {
    const handleDeptChange = (e: any) => {
      const newId = e.detail || getActiveDepartmentId();
      setActiveDeptId(newId);
      // Reset view to list when department changes so no stale project (e.g. GGG) from another department is shown
      setViewMode('list');
      setActiveProject(null);
    };
    window.addEventListener('booshnam_active_dept_changed', handleDeptChange);
    return () => window.removeEventListener('booshnam_active_dept_changed', handleDeptChange);
  }, []);

  // Listen for reset projects view event (e.g. when clicking Projects in the sidebar navigation)
  useEffect(() => {
    const handleResetView = () => {
      setViewMode('list');
      setActiveProject(null);
    };
    window.addEventListener('booshnam_reset_projects_view', handleResetView);
    return () => window.removeEventListener('booshnam_reset_projects_view', handleResetView);
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
  const [newStartDate, setNewStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newEndDate, setNewEndDate] = useState(() => new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]);
  const [newScope, setNewScope] = useState('');
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const deptDropdownRef = useRef<HTMLDivElement>(null);

  const timelineDurationDays = useMemo(() => {
    if (!newStartDate || !newEndDate) return null;
    const s = new Date(newStartDate).getTime();
    const e = new Date(newEndDate).getTime();
    if (isNaN(s) || isNaN(e) || e <= s) return null;
    const diffDays = Math.round((e - s) / (1000 * 60 * 60 * 24));
    const months = (diffDays / 30.417).toFixed(1);
    return { days: diffDays, months };
  }, [newStartDate, newEndDate]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(e.target as Node)) {
        setIsDeptDropdownOpen(false);
      }
    };
    if (isDeptDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDeptDropdownOpen]);

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
      setNewStartDate(new Date().toISOString().split('T')[0]);
      setNewEndDate(new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]);
      setNewScope('');
      setSelectedPM('');
      setSelectedEngineer('');
      setSelectedSupervisor('');
      setSelectedAccounts('');
      setStaffAssignmentDate(new Date().toISOString().split('T')[0]);
      setSelectedSubcontractorName('');
      setSubcontractorTrade('Civil Works');
      setSubcontractorDate(new Date().toISOString().split('T')[0]);
      setAssignedSubcontractors([]);
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
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const unsub = addFullscreenChangeListener((fs) => {
      setIsFullscreen(fs);
    });
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      unsub();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  const toggleFullscreen = async () => {
    const nextState = !isFullscreen;
    setIsFullscreen(nextState);
    try {
      await toggleBrowserFullscreen();
    } catch (e) {}
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

  // Staff & Subcontractor Assignment in Create Project Wizard
  const [staffAssignmentDate, setStaffAssignmentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedSubcontractorName, setSelectedSubcontractorName] = useState('');
  const [subcontractorTrade, setSubcontractorTrade] = useState('Civil Works');
  const [subcontractorDate, setSubcontractorDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [assignedSubcontractors, setAssignedSubcontractors] = useState<Array<{
    id: string;
    name: string;
    trade_scope: string;
    assignment_date: string;
    phone?: string;
    email?: string;
  }>>([]);

  const registeredSubcontractorOptions: SelectOption[] = useMemo(() => {
    let subcons: SelectOption[] = [];
    try {
      const parties = getFinanceParties();
      subcons = parties
        .filter(p => p.type === 'Subcontractor' || (p as any).category === 'SUBCONTRACTOR')
        .map(p => ({ name: p.name, label: p.name, roleHint: 'Registered Subcontractor' }));
    } catch (e) {}

    const defaults: SelectOption[] = [
      { name: 'Sri Venkateswara Civil Works', roleHint: 'Civil & Structural' },
      { name: 'Apex Structural Fabricators', roleHint: 'Steel & PEB' },
      { name: 'Modern Electricals & MEP', roleHint: 'Electrical & Cabling' },
      { name: 'Balaji Plumbing & Sanitary', roleHint: 'Plumbing & Drainage' },
      { name: 'Royal Tiles & Granite Works', roleHint: 'Flooring & Tiling' },
      { name: 'Vertex Painting & Waterproofing', roleHint: 'Painting & Finishing' },
      { name: 'Star HVAC Solutions', roleHint: 'Ducting & Cooling' },
      { name: 'Evergreen Earthmovers', roleHint: 'Excavation & Site Grading' }
    ];

    defaults.forEach(d => {
      if (!subcons.some(s => s.name.toLowerCase() === d.name.toLowerCase())) {
        subcons.push(d);
      }
    });
    return subcons;
  }, []);

  const tradeScopeOptions: SelectOption[] = useMemo(() => [
    { name: 'Civil Works', roleHint: 'Foundations & Structure' },
    { name: 'Structural Steel & Fabrication', roleHint: 'PEB & Truss' },
    { name: 'Electrical & MEP', roleHint: 'Conduiting & Cabling' },
    { name: 'Plumbing & Sanitary', roleHint: 'Piping & Fixtures' },
    { name: 'Flooring & Tiling', roleHint: 'Vitrified & Granite' },
    { name: 'Painting & Finishing', roleHint: 'Internal & External' },
    { name: 'Waterproofing', roleHint: 'Basement & Terrace' },
    { name: 'HVAC & Ventilation', roleHint: 'Ducting & Air Conditioning' },
    { name: 'Carpentry & Joinery', roleHint: 'Doors, Windows & Woodwork' },
    { name: 'Site Excavation & Earthwork', roleHint: 'Earthmoving & Grading' },
    { name: 'Masonry & Plastering', roleHint: 'Brickwork & Mortar' }
  ], []);

  const handleAddSubcontractor = () => {
    const cleanName = selectedSubcontractorName.trim();
    if (!cleanName) return;
    const existing = assignedSubcontractors.find(
      s => s.name.toLowerCase().trim() === cleanName.toLowerCase()
    );
    if (existing) {
      onShowToast?.(`Subcontractor "${cleanName}" is already assigned.`);
      return;
    }

    let phone: string | undefined;
    let email: string | undefined;
    try {
      const parties = getFinanceParties();
      const found = parties.find(p => p.name.toLowerCase().trim() === cleanName.toLowerCase());
      if (found) {
        phone = found.phone;
        email = found.email;
      }
    } catch (e) {}

    const newSubcon = {
      id: `subcon-${Date.now()}-${assignedSubcontractors.length + 1}`,
      name: cleanName,
      trade_scope: subcontractorTrade.trim() || 'Civil Works',
      assignment_date: subcontractorDate || staffAssignmentDate || new Date().toISOString().split('T')[0],
      phone,
      email
    };

    setAssignedSubcontractors(prev => [...prev, newSubcon]);
    onShowToast?.(`Assigned Subcontractor: ${cleanName} (${newSubcon.trade_scope})`);
    setSelectedSubcontractorName('');
  };

  const handleRemoveSubcontractor = (index: number) => {
    setAssignedSubcontractors(prev => prev.filter((_, i) => i !== index));
  };

  // Local projects fallback with persistent localStorage support
  const [localProjects, setLocalProjects] = useState<Project[]>(() => {
    if (propProjects && propProjects.length > 0) return propProjects;
    return getOrInitializeProjects();
  });

  const allProjects = useMemo(() => {
    const list = (propProjects && propProjects.length > 0) ? propProjects : localProjects;
    return list.filter((p: any) => 
      !isProjectDeleted(p) &&
      !['Prestige Boulevard', 'Royal Palm', 'Green Valley', 'Sunrise Industrial', 'Urban Metro', 'Skyline Contemporary', 'Heritage Courtyard', 'Highway Overpass', 'Government Medical College', 'High-Rise Commercial', 'Coastal Highway'].some(t => (p.name || p.title || p.client_name || '').includes(t))
    );
  }, [propProjects, localProjects]);

  // Handle explicit project auto-open request (e.g. from TodayTasksReminderBanner, WBS Schedule link, or Lead conversion)
  useEffect(() => {
    const autoOpenId = sessionStorage.getItem('booshnam_auto_open_project_id');
    if (autoOpenId) {
      sessionStorage.removeItem('booshnam_auto_open_project_id');
      const matched = allProjects.find(p => p.id === autoOpenId || p.code === autoOpenId);
      if (matched) {
        setActiveProject(matched);
        onSelectProject?.(matched);
        setWorkspaceTab('dashboard');
        setViewMode('details');
        return;
      }
    }
  }, [allProjects, onSelectProject]);

  // Handle direct project select event (e.g. from Notification dropdown click)
  useEffect(() => {
    const handleSelectProject = (e: any) => {
      const { projectId, projectName, workspaceTab: targetTab } = e?.detail || {};
      const normalize = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const normTarget = projectName ? normalize(projectName) : '';

      const found = allProjects.find(p => 
        (projectId && p.id === projectId) || 
        (normTarget && (normalize(p.name || '').includes(normTarget) || normTarget.includes(normalize(p.name || ''))))
      );
      if (found) {
        setActiveProject(found);
        setViewMode('details');
        if (targetTab) {
          setWorkspaceTab(targetTab);
        }
        onSelectProject?.(found);
      }
    };
    window.addEventListener('booshnam_select_project', handleSelectProject);
    return () => window.removeEventListener('booshnam_select_project', handleSelectProject);
  }, [allProjects, onSelectProject]);

  // Synchronize all project financial totals on mount & listen for updates
  useEffect(() => {
    try {
      syncAllProjectsFinancials();
    } catch (e) {}

    const handleProjectsUpdated = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        const clean = e.detail.filter((p: any) => 
          !['Prestige Boulevard', 'Royal Palm', 'Green Valley', 'Sunrise Industrial', 'Urban Metro', 'Skyline Contemporary', 'Heritage Courtyard', 'Highway Overpass', 'Government Medical College', 'High-Rise Commercial', 'Coastal Highway'].some(t => (p.name || p.title || p.client_name || '').includes(t))
        );
        setLocalProjects(clean);
        setActiveProject((prev) => {
          if (!prev) return prev;
          const fresh = clean.find((cp: any) => cp.id === prev.id || cp.code === prev.code || cp.name === prev.name);
          return fresh || prev;
        });
      }
    };

    const handleTransactionsUpdated = () => {
      try {
        const raw = localStorage.getItem('booshnam_projects_v2');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const clean = parsed.filter((p: any) => 
              !['Prestige Boulevard', 'Royal Palm', 'Green Valley', 'Sunrise Industrial', 'Urban Metro', 'Skyline Contemporary', 'Heritage Courtyard', 'Highway Overpass', 'Government Medical College', 'High-Rise Commercial', 'Coastal Highway'].some(t => (p.name || p.title || p.client_name || '').includes(t))
            );
            setLocalProjects(clean);
            setActiveProject((prev) => {
              if (!prev) return prev;
              const fresh = clean.find((cp: any) => cp.id === prev.id || cp.code === prev.code || cp.name === prev.name);
              return fresh || prev;
            });
          }
        }
      } catch (e) {}
    };

    window.addEventListener('booshnam_projects_updated', handleProjectsUpdated);
    window.addEventListener('siteops_project_transactions_updated', handleTransactionsUpdated);
    return () => {
      window.removeEventListener('booshnam_projects_updated', handleProjectsUpdated);
      window.removeEventListener('siteops_project_transactions_updated', handleTransactionsUpdated);
    };
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
  const isCompanyWideSuperAdmin = isUserCompanyWideSuperAdmin(activeAccount);
  const allowedDeptIds = useMemo(() => getUserAllowedDepartmentIds(activeAccount), [activeAccount]);
  const isRestrictedDeptUser = !isCompanyWideSuperAdmin && allowedDeptIds !== null && allowedDeptIds.length > 0;

  // Auto-sync active department if restricted user has activeDeptId outside their permitted list
  useEffect(() => {
    if (isRestrictedDeptUser && allowedDeptIds && allowedDeptIds.length > 0) {
      if (!allowedDeptIds.includes(activeDeptId as any)) {
        const fallback = allowedDeptIds[0];
        setActiveDepartmentId(fallback);
        setActiveDeptId(fallback);
      }
    }
  }, [isRestrictedDeptUser, allowedDeptIds, activeDeptId]);

  const departmentFilterOptions = useMemo(() => {
    if (isRestrictedDeptUser && allowedDeptIds) {
      return allowedDeptIds.map(id => {
        const deptObj = ORGANIZATION_DEPARTMENTS.find(d => d.id === id) || ORGANIZATION_DEPARTMENTS[1];
        const count = allProjects.filter(p => normalizeDepartmentId(p.department as string) === deptObj.id).length;
        return {
          label: `${deptObj.shortName} (${count})`,
          value: deptObj.id,
        };
      });
    }
    return [
      { label: `All Departments (${allProjects.length})`, value: 'booshnam_associates' },
      ...ORGANIZATION_DEPARTMENTS.filter(d => !d.isMainOverview).map(d => ({
        label: `${d.shortName} (${allProjects.filter(p => normalizeDepartmentId(p.department as string) === d.id).length})`,
        value: d.id,
      }))
    ];
  }, [isRestrictedDeptUser, allowedDeptIds, allProjects]);

  const projectDepartmentFilterItems = useMemo(() => {
    return ORGANIZATION_DEPARTMENTS.filter(d => !d.isMainOverview).map(d => ({
      id: d.id,
      name: d.name,
      shortName: d.shortName,
      count: allProjects.filter(p => normalizeDepartmentId(p.department as string) === d.id).length
    }));
  }, [allProjects]);

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

  // Booshnam Master Super Admin identification
  const isBooshnamMasterSuperAdmin = Boolean(
    isCompanyWideSuperAdmin ||
    activeAccount?.role_code === 'SUPER_ADMIN' ||
    activeAccount?.username === 'superadmin' ||
    activeAccount?.id === 'usr-super' ||
    (currentUser?.role_code === 'SUPER_ADMIN' && (!userDept || userDept === 'Executive Management' || userDept === 'Booshnam Associates'))
  );

  // Department can only be selected and assigned if the user is Booshnam Master Super Admin in Booshnam Associates (Master overview).
  // For all individual department workspaces or other users, department selection is prohibited and locked to the respective department.
  const canSelectDepartment = isBooshnamMasterSuperAdmin && activeDeptId === 'booshnam_associates';

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
      markProjectDeleted(targetProj.id, targetProj.code, targetProj.name);
      const updated = (allProjects || []).filter(p => p && p.id !== targetId && !isProjectDeleted(p));

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
      if (isRestrictedDeptUser && allowedDeptIds) {
        const pDept = normalizeDepartmentId(p.department as string);
        if (!allowedDeptIds.includes(pDept as any)) return false;
        if (allowedDeptIds.includes(activeDeptId as any)) {
          if (pDept !== activeDeptId) return false;
        }
      } else if (activeDeptId === 'booshnam_associates') {
        if (!overviewDeptIds.includes('ALL') && overviewDeptIds.length > 0) {
          const normSelected = new Set(overviewDeptIds.map(id => normalizeDepartmentId(id)));
          const pDept = normalizeDepartmentId(p.department as string);
          if (!normSelected.has(pDept)) return false;
        }
      } else {
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
  }, [allProjects, searchQuery, statusFilter, stageFilter, categoryFilter, pinnedIds, isSuperOrAdmin, currentStaffName, tasks, activeDeptId, overviewDeptIds, isRestrictedDeptUser, allowedDeptIds, userDept]);

  const filteredProjectIds = useMemo(() => new Set(filteredProjects.map(p => p.id)), [filteredProjects]);
  const deptPendingApprovals = useMemo(() => {
    return approvals.filter(a => 
      a.status === 'PENDING' && 
      (activeDeptId === 'booshnam_associates' && (overviewDeptIds.includes('ALL') || overviewDeptIds.length === 0) ? true : filteredProjectIds.has(a.project || a.project_id || ''))
    ).length;
  }, [approvals, activeDeptId, overviewDeptIds, filteredProjectIds]);

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
      const isDirty = Boolean(
        newProjectName.trim() || 
        newClientName.trim() || 
        newAddress.trim() || 
        selectedPM || 
        selectedEngineer || 
        assignedSubcontractors.length > 0 || 
        selectedSubcontractorName.trim()
      );
      setFormDirty(isDirty, 'Project Details');
    } else {
      clearFormDirty();
    }
  }, [viewMode, newProjectName, newClientName, newAddress, selectedPM, selectedEngineer, assignedSubcontractors, selectedSubcontractorName]);

  const handleCancelWizard = async () => {
    const isDirty = Boolean(
      newProjectName.trim() || 
      newClientName.trim() || 
      newAddress.trim() || 
      newScope.trim() || 
      selectedPM || 
      selectedEngineer || 
      assignedSubcontractors.length > 0 || 
      selectedSubcontractorName.trim()
    );
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
    setNewStartDate(new Date().toISOString().split('T')[0]);
    setNewEndDate(new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]);
    setNewScope('');
    setSelectedPM('');
    setSelectedEngineer('');
    setSelectedSupervisor('');
    setSelectedAccounts('');
    setStaffAssignmentDate(new Date().toISOString().split('T')[0]);
    setSelectedSubcontractorName('');
    setSubcontractorTrade('Civil Works');
    setSubcontractorDate(new Date().toISOString().split('T')[0]);
    setAssignedSubcontractors([]);
    setWizardError('');
    setWizardStep(1);
    setViewMode('list');
  };

  // Handle Wizard Create Finish
  const handleWizardSubmit = async () => {
    const cleanProjName = newProjectName.trim() || 'New Project';
    const activeTasksCount = wizardTasks.filter(t => selectedTaskIds.includes(t.id)).length;

    // Gather all assigned subcontractors (including currently selected if not explicitly added)
    let finalSubcontractors = [...assignedSubcontractors];
    if (selectedSubcontractorName.trim()) {
      const alreadyIn = finalSubcontractors.some(s => s.name.toLowerCase().trim() === selectedSubcontractorName.toLowerCase().trim());
      if (!alreadyIn) {
        let phone: string | undefined;
        let email: string | undefined;
        try {
          const parties = getFinanceParties();
          const found = parties.find(p => p.name.toLowerCase().trim() === selectedSubcontractorName.toLowerCase().trim());
          if (found) {
            phone = found.phone;
            email = found.email;
          }
        } catch (e) {}
        finalSubcontractors.push({
          id: `subcon-${Date.now()}`,
          name: selectedSubcontractorName.trim(),
          trade_scope: subcontractorTrade.trim() || 'Civil Works',
          assignment_date: subcontractorDate || staffAssignmentDate || new Date().toISOString().split('T')[0],
          phone,
          email
        });
      }
    }

    const teamSummaryText = [
      selectedPM ? `${selectedPM} (PM)` : '',
      selectedEngineer ? `${selectedEngineer} (Site Engineer)` : '',
      finalSubcontractors.length > 0 ? `${finalSubcontractors.length} Subcontractor(s)` : ''
    ].filter(Boolean).join(', ') || 'the designated project team';

    // User requested confirmation popup before assigning/creating project
    const confirmed = await confirmAction({
      title: 'Create & Assign Project',
      message: `Are you sure you want to create project "${cleanProjName}" and assign it to ${teamSummaryText} with ${activeTasksCount} initial tasks?`,
      confirmText: 'Create & Assign',
      cancelText: 'Review Form',
      variant: 'primary',
      icon: 'info'
    });
    if (!confirmed) return;

    clearFormDirty();

    const targetDeptId = (isRestrictedDeptUser && allowedDeptIds)
      ? (allowedDeptIds.includes(activeDeptId as any) ? activeDeptId : allowedDeptIds[0])
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
        assignment_date: staffAssignmentDate,
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
        assignment_date: staffAssignmentDate,
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
        assignment_date: staffAssignmentDate,
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
        assignment_date: staffAssignmentDate,
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
        assignment_date: staffAssignmentDate,
        phone: extra.phone || (s?.phone ? `+91 ${s.phone}` : undefined),
        email: extra.email || s?.email
      });
    });

    // Also include any assigned subcontractors in assignedTeam:
    finalSubcontractors.forEach((sc, idx) => {
      assignedTeam.push({
        id: sc.id || `team-subcon-${Date.now()}-${idx}`,
        name: sc.name,
        role: `Subcontractor (${sc.trade_scope})`,
        assignment_date: sc.assignment_date,
        trade_scope: sc.trade_scope,
        is_subcontractor: true,
        phone: sc.phone,
        email: sc.email
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
        start_date: staffAssignmentDate || new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        duration_days: 14,
        description: pt.description,
        department: pt.department,
        status: 'TODO',
        priority: pt.default_priority,
        planned_start: staffAssignmentDate || new Date().toISOString().split('T')[0],
        planned_end: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        progress_percentage: 0,
        assigned_to: taskAssignee,
        assigned_to_name: taskAssignee,
      };
    });

    // Persist tasks in localStorage for this project
    try {
      localStorage.setItem(`booshnam_wbs_tasks_v2_${newProjId}`, JSON.stringify(generatedTasks));
      localStorage.setItem(`booshnam_wbs_tasks_v10_${newProjId}`, JSON.stringify(generatedTasks));
    } catch (e) {}

    // Persist subcontractors in localStorage & sync with Accounts & Finance parties
    if (finalSubcontractors.length > 0) {
      const subconWorkOrders: SubconWorkOrder[] = finalSubcontractors.map((sc, idx) => ({
        id: sc.id || `wo-${Date.now()}-${idx}`,
        wo_number: `WO-2026-${String(idx + 1).padStart(3, '0')}`,
        subcon_name: sc.name,
        trade_scope: sc.trade_scope,
        contract_amount: 350000,
        work_completed_percent: 0,
        billed_amount: 0,
        retention_percent: 5,
        retention_amount: 0,
        paid_amount: 0,
        balance_payable: 0,
        status: 'ACTIVE',
        start_date: sc.assignment_date,
        end_date: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0]
      }));
      try {
        localStorage.setItem(`booshnam_subcontractors_v1_${newProjId}`, JSON.stringify(subconWorkOrders));
        finalSubcontractors.forEach(sc => {
          ensurePartyExists(sc.name, cleanProjName, 'Subcontractor');
        });
      } catch (e) {}
    }

    if (setTasks) {
      setTasks(prev => [...generatedTasks, ...prev]);
    }

    const cleanClientName = (newClientName || '').trim();
    const displayName = cleanProjName;

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
      start_date: newStartDate || staffAssignmentDate || new Date().toISOString().split('T')[0],
      expected_end_date: newEndDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      estimated_budget: budgetNum,
      boq_value: budgetNum,
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
      description: newScope.trim() || `Initiated for ${newClientName || newProjectName} located at ${newAddress || ''}, ${newCity || ''}. Auto-generated ${generatedTasks.length} predefined tasks.`,
      scope_of_work: newScope.trim() || undefined,
      tasks_count: generatedTasks.length,
      assigned_team: assignedTeam,
      assigned_subcontractors: finalSubcontractors
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
    setStaffAssignmentDate(new Date().toISOString().split('T')[0]);
    setSelectedSubcontractorName('');
    setSubcontractorTrade('Civil Works');
    setSubcontractorDate(new Date().toISOString().split('T')[0]);
    setAssignedSubcontractors([]);
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
    const effectiveDeptId = (isRestrictedDeptUser && allowedDeptIds)
      ? (allowedDeptIds.includes(activeDeptId as any) ? activeDeptId : allowedDeptIds[0])
      : (activeDeptId !== 'booshnam_associates' ? activeDeptId : newDepartment);
    const currentDeptObj = ORGANIZATION_DEPARTMENTS.find(d => d.id === effectiveDeptId || d.name === effectiveDeptId) || ORGANIZATION_DEPARTMENTS[1];
    const selectableDepts = ORGANIZATION_DEPARTMENTS.filter(d => !d.isMainOverview);
    const displayedWizardTasks = wizardTasks;

    return (
      <div className={`w-full bg-slate-100 flex flex-col antialiased ${
        isFullscreen 
          ? `fixed top-0 right-0 bottom-0 z-[100] overflow-y-auto bg-slate-100 ${isSidebarOpen ? 'left-64' : 'left-[72px]'}` 
          : 'h-screen max-h-screen overflow-hidden'
      }`}>
        {/* ── TOP FULL-SCREEN HEADER BAR ── */}
        <header className="w-full bg-white border-b border-slate-200/90 px-4 sm:px-8 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-xs shrink-0">
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
              <h1 className="text-[26px] font-bold text-[#262626] font-heading tracking-tight leading-tight">Creating Project</h1>
            </div>
          </div>

          {/* Right: Fullscreen Mode & Close Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleFullscreen}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isFullscreen 
                  ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                  : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Studio Mode"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-red-600" /> : <Maximize2 className="w-4 h-4" />}
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
        <main className={`flex-1 min-h-0 w-full mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col justify-center overflow-hidden ${
          isFullscreen ? 'max-w-[1700px]' : 'max-w-[1550px]'
        }`}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full min-h-0 items-stretch">
            
            {/* ── LEFT/CENTER (7 COLUMNS): ACTIVE WIZARD STEP ── */}
            <div className="lg:col-span-7 h-full min-h-0 flex flex-col">

              {/* STEP 1: Project Details */}
              {wizardStep === 1 && (
                <div className="bg-white rounded-[26px] border border-slate-200/80 shadow-sm p-4 sm:p-5 h-full min-h-0 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 shrink-0">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">
                        Project Details
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Enter key project parameters, choose department, and budget baseline.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                      Step 1 of 3
                    </span>
                  </div>

                  {/* Scroll-free internal body */}
                  <div className="flex-1 min-h-0 py-2.5 space-y-3 overflow-y-auto no-scrollbar pr-0.5">
                    {wizardError && (
                      <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                        <span className="font-semibold">{wizardError}</span>
                      </div>
                    )}

                    {/* Department Section: Only Booshnam Master Super Admin in Booshnam Associates can select */}
                    {canSelectDepartment && (
                      <div className="space-y-1 relative" ref={deptDropdownRef}>
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-1.5 h-3 bg-red-600 rounded-full" />
                            Select Department <span className="text-red-500">*</span>
                          </label>
                          <span className="text-[11px] font-medium text-slate-400">
                            Business Division
                          </span>
                        </div>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)}
                            className={`w-full h-11 px-3.5 bg-white border rounded-xl flex items-center justify-between text-left transition-all cursor-pointer shadow-2xs ${
                              isDeptDropdownOpen 
                                ? 'border-red-600 ring-2 ring-red-600/10' 
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
                                <Building2 className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-slate-900 truncate">
                                  {currentDeptObj?.name || 'Select Department'}
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium truncate">
                                  {currentDeptObj?.role || currentDeptObj?.shortName} • Prefix: {currentDeptObj?.codePrefix}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200/60 font-bold text-[10px]">
                                {currentDeptObj?.codePrefix}
                              </span>
                              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isDeptDropdownOpen ? 'rotate-180 text-red-600' : ''}`} />
                            </div>
                          </button>

                          {/* Floating Dropdown Menu */}
                          {isDeptDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                              {selectableDepts.map((dept) => {
                                const isSelected = newDepartment === dept.id;
                                return (
                                  <button
                                    key={dept.id}
                                    type="button"
                                    onClick={() => {
                                      setNewDepartment(dept.id);
                                      if (dept.id.includes('SOIL')) setNewProjectType('Soil Investigation');
                                      else if (dept.id.includes('MATERIAL')) setNewProjectType('Material Testing');
                                      else if (dept.id === 'ARCHITECTURAL') setNewProjectType('Architectural');
                                      else if (dept.id === 'GOVERNMENT_PROJECT') setNewProjectType('Government Projects');
                                      else setNewProjectType('Private Construction');
                                      setIsDeptDropdownOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-red-50 text-red-950 font-bold border border-red-200/80 shadow-2xs'
                                        : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                                    }`}
                                  >
                                    <div className="min-w-0 flex-1 pr-2">
                                      <div className="text-xs font-bold leading-snug">
                                        {dept.name}
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-medium">
                                        {dept.role || dept.shortName} • Prefix: {dept.codePrefix}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                        isSelected ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'
                                      }`}>
                                        {dept.codePrefix}
                                      </span>
                                      {isSelected && <Check className="w-3.5 h-3.5 text-red-600 stroke-[3]" />}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Section A: Project Identity */}
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-1.5 h-3 bg-red-600 rounded-full" />
                        General Identity
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Project Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Enter project name"
                            value={newProjectName}
                            onChange={(e) => {
                              setNewProjectName(e.target.value);
                              if (wizardError) setWizardError('');
                            }}
                            className="w-full px-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/10 transition shadow-2xs"
                            autoFocus
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Client Name
                          </label>
                          <input
                            type="text"
                            placeholder="Enter client name"
                            value={newClientName}
                            onChange={(e) => setNewClientName(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/10 transition"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section B: Location & Site Details */}
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-1.5 h-3 bg-red-600 rounded-full" />
                        Location & Site Details
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Address / Site Location</label>
                          <input
                            type="text"
                            placeholder="Enter site address / location"
                            value={newAddress}
                            onChange={(e) => setNewAddress(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/10 transition"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                          <input
                            type="text"
                            placeholder="Enter city"
                            value={newCity}
                            onChange={(e) => setNewCity(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/10 transition"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section C: Project Schedule & Timeline */}
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-1.5 h-3 bg-red-600 rounded-full" />
                        Project Schedule & Dates
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
                          <input
                            type="date"
                            value={newStartDate}
                            onChange={(e) => setNewStartDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/10 transition"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Target Completion Date</label>
                          <input
                            type="date"
                            value={newEndDate}
                            min={newStartDate}
                            onChange={(e) => setNewEndDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/10 transition"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section D: Project Budget & Commercials */}
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-1.5 h-3 bg-red-600 rounded-full" />
                        Budget & Estimated Cost
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="1000"
                              placeholder="Enter estimated budget"
                              value={newEstimatedBudget}
                              onChange={(e) => setNewEstimatedBudget(e.target.value)}
                              className="w-full pl-7 pr-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/10 transition shadow-2xs"
                            />
                          </div>
                          {newEstimatedBudget && Number(newEstimatedBudget) > 0 ? (
                            <p className="text-[11px] font-bold text-emerald-600 mt-1 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{formatINR(newEstimatedBudget)} ({getLakhsCroresText(newEstimatedBudget)})</span>
                            </p>
                          ) : (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Sets the financial budget baseline for expenses and cost tracking
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Section E: Scope & Key Deliverables */}
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-1.5 h-3 bg-red-600 rounded-full" />
                        Scope & Key Notes <span className="text-[10px] font-normal text-slate-400 lowercase">(optional)</span>
                      </div>
                      <textarea
                        rows={2}
                        value={newScope}
                        onChange={(e) => setNewScope(e.target.value)}
                        placeholder="Enter brief project scope, deliverables, or site instructions..."
                        className="w-full px-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/10 transition resize-none"
                      />
                    </div>
                  </div>

                  {/* Continue Button */}
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between shrink-0 mt-auto">
                    <button
                      type="button"
                      onClick={handleCancelWizard}
                      className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleWizardContinueToStep2}
                      className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-red-600/20 hover:shadow-lg hover:shadow-red-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-98"
                    >
                      <span>Continue to Team Assignment (Step 2)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Team Assignment */}
              {wizardStep === 2 && (
                <div className="bg-white rounded-[26px] border border-slate-200/80 shadow-sm p-4 sm:p-5 h-full min-h-0 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 shrink-0">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Users className="w-5 h-5 text-red-600" />
                        Assign Key Team Members
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Designate site engineers, project managers, and supervisors for daily field operations.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                      Step 2 of 3
                    </span>
                  </div>

                  {/* Scrollable internal body */}
                  <div className="flex-1 min-h-0 py-2.5 space-y-3.5 overflow-y-auto no-scrollbar pr-0.5">

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

                  {/* Staff Assignment Date & Subcontractor Assignment Section */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                          Subcontractor Assignment ({assignedSubcontractors.length})
                        </span>
                        <p className="text-[11px] text-slate-500">
                          Appoint trade contractors with trade scope and commencement date.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-red-600" />
                          Staff Date:
                        </span>
                        <input
                          type="date"
                          value={staffAssignmentDate}
                          onChange={(e) => {
                            setStaffAssignmentDate(e.target.value);
                            if (!subcontractorDate) setSubcontractorDate(e.target.value);
                          }}
                          className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Subcontractor Input Card */}
                    <div className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-2xl space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Subcontractor Agency / Firm
                          </label>
                          <SelectOrTypeInput
                            value={selectedSubcontractorName}
                            onChange={setSelectedSubcontractorName}
                            options={registeredSubcontractorOptions}
                            placeholder="Select or type subcontractor..."
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Trade Scope
                          </label>
                          <SelectOrTypeInput
                            value={subcontractorTrade}
                            onChange={setSubcontractorTrade}
                            options={tradeScopeOptions}
                            placeholder="e.g. Civil, Electrical..."
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-indigo-600" />
                            <span>Commencement Date</span>
                          </label>
                          <input
                            type="date"
                            value={subcontractorDate}
                            onChange={(e) => setSubcontractorDate(e.target.value)}
                            className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 cursor-pointer shadow-2xs"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end pt-1">
                        <button
                          type="button"
                          onClick={handleAddSubcontractor}
                          disabled={!selectedSubcontractorName.trim()}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-98"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Subcontractor</span>
                        </button>
                      </div>

                      {assignedSubcontractors.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-indigo-100">
                          {assignedSubcontractors.map((sc, idx) => (
                            <div key={idx} className="flex items-center justify-between px-3.5 py-2.5 bg-white border border-indigo-200/80 rounded-xl text-xs shadow-2xs">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                                  <Building2 className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-bold text-slate-800 block truncate leading-tight">
                                    {sc.name}
                                  </span>
                                  <div className="flex items-center gap-1.5 text-[10px] text-indigo-600 font-medium mt-0.5">
                                    <span className="bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">{sc.trade_scope}</span>
                                    <span className="text-slate-400">•</span>
                                    <span className="text-slate-500 flex items-center gap-0.5">
                                      <Calendar className="w-2.5 h-2.5" />
                                      {sc.assignment_date}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveSubcontractor(idx)}
                                className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors shrink-0 ml-2"
                                title="Remove Subcontractor"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Key Team Members Section */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-red-600" />
                          Additional Team Members ({additionalTeam.length})
                        </span>
                        <p className="text-[11px] text-slate-500">Add draftsmen, safety officers, quality auditors, or sub-engineers.</p>
                      </div>
                      {!showAddExtraMember && (
                        <button
                          type="button"
                          onClick={() => setShowAddExtraMember(true)}
                          className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-red-200/60 transition-colors"
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
                              <div className="w-7 h-7 rounded-lg bg-red-100 text-red-700 font-bold text-[11px] flex items-center justify-center">
                                {m.name.slice(0, 1).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-slate-800 block leading-tight">{m.name}</span>
                                <span className="text-[10px] text-red-600 font-medium">{m.role}</span>
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
                      <div className="p-4 bg-red-50/50 border border-red-100 rounded-2xl space-y-3">
                        <div className="text-xs font-bold text-red-900">
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
                              placeholder="Enter designation / role"
                              className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-medium bg-white focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
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
                            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Assign Staff</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Navigation Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0 mt-auto">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Back to Details</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleWizardContinueToStep3}
                      className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-red-600/20 hover:shadow-lg hover:shadow-red-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-98"
                    >
                      <span>Continue to Predefined Tasks (Step 3)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Predefined Tasks */}
              {wizardStep === 3 && (
                <div className="bg-white rounded-[26px] border border-slate-200/80 shadow-sm p-4 sm:p-5 h-full min-h-0 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 shrink-0">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                        Tasks & Workflow
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Tasks pre-populated for this project. Check or uncheck to include, click Edit to customize, or add new tasks.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-xl">
                        {selectedTaskIds.length} / {wizardTasks.length} Active
                      </span>
                    </div>
                  </div>

                  {/* Scrollable internal body */}
                  <div className="flex-1 min-h-0 py-2 space-y-2.5 overflow-y-auto no-scrollbar pr-0.5">

                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2">
                    <p className="text-xs text-slate-500 font-medium">
                      Configure the tasks for this project schedule:
                    </p>
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
                            placeholder="Enter task title"
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

                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0 mt-auto">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Back to Team</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleWizardSubmit}
                      className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-red-600/25 hover:shadow-lg hover:shadow-red-600/35 transition-all flex items-center gap-2 cursor-pointer active:scale-98"
                    >
                      <Check className="w-4 h-4" />
                      <span>Create Project ({selectedTaskIds.length} Tasks)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT (5 COLUMNS): WIZARD SHOWCASE BANNER CARD (FULL PICTURE CARD) ── */}
            <div className="lg:col-span-5 h-full min-h-0 flex flex-col">
              <div className="bg-white rounded-[26px] border border-slate-200/90 shadow-sm relative overflow-hidden flex flex-col justify-between p-5 sm:p-6 h-full min-h-0">
                
                {/* ── FULL CARD PICTURE ARTWORK (PROJECT WIZARD BANNER) ── */}
                <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden">
                  <img
                    src="/project-wizard-banner.jpg"
                    alt="Project Studio Artwork"
                    className="w-full h-full object-cover object-top"
                  />
                  {/* Pristine gradient overlay keeping text, timeline cards, and badges crystal clear */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-white/25" />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-transparent to-white/10" />
                </div>

                {/* ── TOP: TITLE & SUBTITLE ── */}
                <div className="relative z-10 shrink-0">
                  <div className="w-8 h-1 bg-red-600 rounded-full mb-2.5" />
                  <h2 className="text-xl sm:text-[23px] font-black text-slate-900 tracking-tight leading-tight">
                    Let's Build Your<br />
                    <span className="text-red-600">Project</span>
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed max-w-[210px] font-medium">
                    Add the key details to create a new project. Next, you can assign your team and setup departments.
                  </p>

                  {/* Active Selected Department Pill */}
                  {currentDeptObj && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-xs border border-red-200/70 text-red-700 text-[11px] font-bold mt-2.5 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                      <span>{currentDeptObj.name}</span>
                      <span className="text-slate-400 font-normal">({currentDeptObj.codePrefix})</span>
                    </div>
                  )}
                </div>

                {/* ── MIDDLE: 3-STEP VERTICAL TIMELINE (EXPANDED & CENTERED) ── */}
                <div className="relative z-10 my-auto py-2 shrink-0">
                  {/* Vertical connecting line through circle centers:
                      Circle width is w-7 (28px), center is at 14px.
                      Line is w-0.5 (2px) at left-[13px] -> perfectly centered at 14px! */}
                  <div className="absolute left-[13px] top-[18px] bottom-[18px] w-0.5 bg-slate-200/90 z-0" />

                  <div className="space-y-3 relative z-10">
                    {/* Step 1: Project Details */}
                    <div
                      onClick={() => setWizardStep(1)}
                      className="flex items-center gap-3 group cursor-pointer"
                    >
                      {/* Step Number Circle */}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all z-10 ${
                        wizardStep === 1 
                          ? 'bg-red-600 text-white shadow-md shadow-red-600/30 ring-4 ring-white' 
                          : wizardStep > 1
                          ? 'bg-red-600 text-white shadow-xs ring-4 ring-white'
                          : 'bg-white border-2 border-slate-300 text-slate-500 ring-4 ring-white'
                      }`}>
                        {wizardStep > 1 ? <Check className="w-3 h-3 stroke-[2.5]" /> : '1'}
                      </div>

                      {/* Step Card */}
                      <div className={`flex-1 flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl transition-all border backdrop-blur-xs ${
                        wizardStep === 1
                          ? 'bg-white/95 border-rose-200/90 shadow-2xs ring-1 ring-red-500/20'
                          : 'bg-white/80 hover:bg-white/95 border-slate-200/60 shadow-2xs'
                      }`}>
                        {/* Icon Box */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          wizardStep === 1
                            ? 'bg-red-100/90 text-red-600'
                            : 'bg-white text-slate-500 border border-slate-200/60 shadow-2xs'
                        }`}>
                          <FileText className="w-4 h-4" />
                        </div>

                        {/* Text Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-xs font-bold leading-tight ${wizardStep === 1 ? 'text-slate-900' : 'text-slate-700'}`}>
                              Project Details
                            </h4>
                            {wizardStep === 1 && (
                              <span className="text-[9px] font-bold text-red-600 bg-red-100/60 px-1.5 py-0.5 rounded-full border border-red-200/50">
                                Active
                              </span>
                            )}
                            {wizardStep > 1 && (
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                                Done
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            Enter project name, client, and site location details.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Step 2: Team Assignment */}
                    <div
                      onClick={() => {
                        if (newProjectName.trim()) setWizardStep(2);
                        else setWizardError('Please enter a Project Name');
                      }}
                      className="flex items-center gap-3 group cursor-pointer"
                    >
                      {/* Step Number Circle */}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all z-10 ${
                        wizardStep === 2 
                          ? 'bg-red-600 text-white shadow-md shadow-red-600/30 ring-4 ring-white' 
                          : wizardStep > 2
                          ? 'bg-red-600 text-white shadow-xs ring-4 ring-white'
                          : 'bg-white border-2 border-slate-300 text-slate-500 ring-4 ring-white'
                      }`}>
                        {wizardStep > 2 ? <Check className="w-3 h-3 stroke-[2.5]" /> : '2'}
                      </div>

                      {/* Step Card */}
                      <div className={`flex-1 flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl transition-all border backdrop-blur-xs ${
                        wizardStep === 2
                          ? 'bg-white/95 border-rose-200/90 shadow-2xs ring-1 ring-red-500/20'
                          : 'bg-white/80 hover:bg-white/95 border-slate-200/60 shadow-2xs'
                      }`}>
                        {/* Icon Box */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          wizardStep === 2
                            ? 'bg-red-100/90 text-red-600'
                            : 'bg-white text-slate-500 border border-slate-200/60 shadow-2xs'
                        }`}>
                          <Users className="w-4 h-4" />
                        </div>

                        {/* Text Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-xs font-bold leading-tight ${wizardStep === 2 ? 'text-slate-900' : 'text-slate-700'}`}>
                              Team Assignment
                            </h4>
                            {wizardStep === 2 && (
                              <span className="text-[9px] font-bold text-red-600 bg-red-100/60 px-1.5 py-0.5 rounded-full border border-red-200/50">
                                Active
                              </span>
                            )}
                            {wizardStep > 2 && (
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                                Done
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            Assign PM, Engineers, Subcontractors, and Site Supervisors.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Step 3: Setup Project */}
                    <div
                      onClick={() => {
                        if (newProjectName.trim()) setWizardStep(3);
                        else setWizardError('Please enter a Project Name');
                      }}
                      className="flex items-center gap-3 group cursor-pointer"
                    >
                      {/* Step Number Circle */}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all z-10 ${
                        wizardStep === 3 
                          ? 'bg-red-600 text-white shadow-md shadow-red-600/30 ring-4 ring-white' 
                          : 'bg-white border-2 border-slate-300 text-slate-500 ring-4 ring-white'
                      }`}>
                        3
                      </div>

                      {/* Step Card */}
                      <div className={`flex-1 flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl transition-all border backdrop-blur-xs ${
                        wizardStep === 3
                          ? 'bg-white/95 border-rose-200/90 shadow-2xs ring-1 ring-red-500/20'
                          : 'bg-white/80 hover:bg-white/95 border-slate-200/60 shadow-2xs'
                      }`}>
                        {/* Icon Box */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          wizardStep === 3
                            ? 'bg-red-100/90 text-red-600'
                            : 'bg-white text-slate-500 border border-slate-200/60 shadow-2xs'
                        }`}>
                          <Settings className="w-4 h-4" />
                        </div>

                        {/* Text Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-xs font-bold leading-tight ${wizardStep === 3 ? 'text-slate-900' : 'text-slate-700'}`}>
                              Setup Project
                            </h4>
                            {wizardStep === 3 && (
                              <span className="text-[9px] font-bold text-red-600 bg-red-100/60 px-1.5 py-0.5 rounded-full border border-red-200/50">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            Configure departments, site details and start managing your project.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── BOTTOM: 3 FEATURE BENEFIT PILLARS ── */}
                <div className="relative z-10 pt-3 border-t border-slate-200/70 shrink-0 bg-white/80 backdrop-blur-xs rounded-2xl px-2 py-2">
                  <div className="grid grid-cols-3 items-center divide-x divide-slate-200/80 text-center">
                    {/* Track Progress */}
                    <div className="flex flex-col items-center gap-1 px-1">
                      <div className="w-7 h-7 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                        <BarChart2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 leading-tight">
                        Track Progress
                      </span>
                    </div>

                    {/* Manage Teams */}
                    <div className="flex flex-col items-center gap-1 px-1">
                      <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 leading-tight">
                        Manage Teams
                      </span>
                    </div>

                    {/* Organize Documents */}
                    <div className="flex flex-col items-center gap-1 px-1">
                      <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 leading-tight">
                        Organize Docs
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
      <div className={`flex-1 flex flex-col min-w-0 bg-white transition-all duration-300 ${
        isFullscreen ? `fixed top-0 right-0 bottom-0 z-[100] overflow-y-auto bg-white ${isSidebarOpen ? 'left-64' : 'left-[72px]'}` : ''
      }`}>

        {/* Project Top Navigation Bar */}
        <ProjectTopNav
          project={activeProject}
          allProjects={filteredProjects.length > 0 ? filteredProjects : allProjects}
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
          onBack={() => {
            setActiveProject(null);
            setViewMode('list');
            onSelectProject?.(null);
          }}
          userRole={currentUser.role_code}
          userRoleName={currentUser.role_name}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
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
              onNavigateTab={(tab) => setWorkspaceTab(tab as any)}
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
                  <div 
                    key={p.id} 
                    onClick={() => handleOpenProjectDetails(p)}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden group cursor-pointer"
                  >
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
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenProjectDetails(p);
                        }}
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
  const handleOpenNewProjectWizard = () => {
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

  return (
    <div className={`flex-1 flex flex-col min-w-0 bg-white transition-all duration-300 ${
      isFullscreen ? `fixed top-0 right-0 bottom-0 z-[100] overflow-y-auto bg-slate-50 ${isSidebarOpen ? 'left-64' : 'left-[72px]'}` : ''
    }`}>
      {/* Top Header Bar Inside Full-Bleed View */}
      <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white sticky top-0 z-10">
        <div>
          <h1 className="text-[26px] font-bold text-[#262626] font-heading tracking-tight">Projects</h1>
        </div>

        {/* Right Settings, Bell & User Avatar */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Fullscreen Mode Button */}
          <button 
            type="button"
            onClick={toggleFullscreen}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              isFullscreen 
                ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
            title={isFullscreen ? "Exit Fullscreen" : "Full Screen"}
            aria-label={isFullscreen ? "Exit Fullscreen" : "Full Screen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-red-600" /> : <Maximize2 className="w-4 h-4" />}
          </button>

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

        {/* 1. Modern KPI Stat Cards */}
        <StatsAndButton
          onNewProjectClick={handleOpenNewProjectWizard}
          pendingApprovals={deptPendingApprovals}
          pendingMaterials={deptPendingMaterials}
          pendingTodos={deptPendingTodos}
          totalProjects={filteredProjects.length}
          showButton={false}
          onApprovalClick={() => {
            if (activeProject) setWorkspaceTab('dashboard');
            else onShowToast?.(`Pending Approvals: ${deptPendingApprovals}`);
          }}
          onMaterialClick={() => {
            if (activeProject) setWorkspaceTab('material');
            else onShowToast?.(`Pending Materials: ${deptPendingMaterials}`);
          }}
          onTodoClick={() => {
            if (activeProject) setWorkspaceTab('todo');
            else onShowToast?.(`Pending To Do: ${deptPendingTodos}`);
          }}
          onProjectsClick={() => {
            setStatusFilter('All');
            setStageFilter('All');
            setCategoryFilter('All');
            setSearchQuery('');
            onShowToast?.(`Showing all ${filteredProjects.length} projects`);
          }}
        />

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

          {/* Department Filter: Only visible to Super Admin */}
          {isBooshnamMasterSuperAdmin && (
            activeDeptId === 'booshnam_associates' ? (
              <DepartmentMultiSelectFilter
                selectedIds={overviewDeptIds}
                onChange={setOverviewDeptIds}
                departments={projectDepartmentFilterItems}
                totalCount={allProjects.length}
                labelPrefix="Dept"
              />
            ) : (
              <div className="w-56">
                <CustomSelect
                  value={activeDeptId}
                  onChange={(val) => {
                    setActiveDepartmentId(val as any);
                    setActiveDeptId(val);
                  }}
                  disabled={isRestrictedDeptUser ? (allowedDeptIds ? allowedDeptIds.length <= 1 : true) : false}
                  options={departmentFilterOptions}
                  prefix="Dept: "
                  size="sm"
                  variant="brand"
                />
              </div>
            )
          )}



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
            onClick={handleOpenNewProjectWizard}
            className="new-project-btn"
            type="button"
          >
            <span className="plus-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </span>
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
                <th className="py-3.5 px-5 w-32 text-center">Actions</th>
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
                      onClick={() => handleOpenProjectDetails(p)}
                      className={`hover:bg-slate-50/80 transition-colors group align-middle cursor-pointer ${
                        isPinned ? 'bg-red-50/20' : ''
                      }`}
                    >
                      {/* Name Column with Clean Subtitle */}
                      <td className="py-4 px-6 align-middle">
                        <div className="flex items-center gap-3.5">
                          {/* Name Text - Clickable to open Project Details */}
                          <div className="min-w-0 flex-1 max-w-2xl">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenProjectDetails(p);
                              }}
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
                              {(Number(p.estimated_budget || 0) > 0 || Number(p.boq_value || 0) > 0) && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                    Budget: ₹ {Number(p.estimated_budget || p.boq_value).toLocaleString('en-IN')}
                                  </span>
                                </>
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

                      {/* Actions Column (Pin, Delete & Add Staff (+) Buttons) */}
                      <td className="py-4 px-5 text-center align-middle whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Pin Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePin(p.id);
                            }}
                            className={`p-2 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center ${
                              isPinned 
                                ? 'text-red-600 bg-red-50 hover:bg-red-100 shadow-2xs' 
                                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                            }`}
                            title={isPinned ? 'Unpin Project' : 'Pin Project to top'}
                          >
                            <Pin className={`w-4 h-4 transition-transform ${isPinned ? 'fill-red-600 rotate-45' : 'group-hover:scale-110'}`} />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isSuperAdmin) {
                                onShowToast?.('Permission Denied: Only Admin or Super Admin can delete projects.');
                                return;
                              }
                              setProjectToDelete(p);
                            }}
                            className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer inline-flex items-center justify-center group"
                            title="Delete Project"
                          >
                            <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          </button>

                          {/* Add Staff (+) Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProjectForAddStaff(p);
                            }}
                            className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer inline-flex items-center justify-center group"
                            title="Add Staff"
                          >
                            <Plus className="w-4 h-4 group-hover:scale-110 transition-transform stroke-[2.5]" />
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
        onDeleteProject={handleDeleteProject}
        isSuperAdmin={isSuperAdmin}
        onShowToast={onShowToast}
      />

      {/* Add Staff Modal */}
      <AddStaffModal
        isOpen={Boolean(projectForAddStaff)}
        onClose={() => setProjectForAddStaff(null)}
        project={projectForAddStaff}
        onUpdateProject={(updatedProj) => {
          setProjectForAddStaff(updatedProj);
          const updated = allProjects.map(p => p.id === updatedProj.id ? updatedProj : p);
          handleUpdateProjects(updated);
          if (activeProject && activeProject.id === updatedProj.id) {
            setActiveProject(updatedProj);
          }
        }}
        onShowToast={onShowToast}
        currentUser={currentUser}
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
