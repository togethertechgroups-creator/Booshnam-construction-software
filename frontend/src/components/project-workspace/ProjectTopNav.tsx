import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronDown, ThumbsUp, Bell, 
  User, Check, Plus, Search, Building2,
  Share2, Shield, CircleDot, ArrowLeft,
  MapPin, CheckSquare, UserCheck, Package,
  Menu, X, LayoutDashboard, Wrench, FileText,
  Users, Layers, DollarSign, Briefcase,
  Maximize2, Minimize2
} from 'lucide-react';
import { Project } from '../../types';
import { UserProfileDropdown } from '../UserProfileDropdown';
import { formatProjectTitle } from '../../lib/mockData';

export type WorkspaceTabId = 
  | 'dashboard'
  | 'design'
  | 'boq'
  | 'party'
  | 'transaction'
  | 'todo'
  | 'task'
  | 'attendance'
  | 'material'
  | 'subcon'
  | 'equipment'
  | 'files'
  | 'mom';

interface TabDefinition {
  id: WorkspaceTabId;
  label: string;
  badge?: string | number;
  icon?: React.ReactNode;
}

export const WORKSPACE_TABS: TabDefinition[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'design', label: 'Design' },
  { id: 'boq', label: 'BOQ' },
  { id: 'party', label: 'Party' },
  { id: 'transaction', label: 'Transaction' },
  { id: 'todo', label: 'To Do' },
  { id: 'task', label: 'Task' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'material', label: 'Material' },
  { id: 'subcon', label: 'Subcon' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'files', label: 'Files' },
  { id: 'mom', label: 'MOM' },
];

/**
 * Helper to check if a project belongs to the Soil Investigation department
 */
export function isSoilDepartmentProject(project?: Project | null): boolean {
  if (!project) return false;
  const dept = String(project.department || '').toUpperCase().trim();
  const deptName = String(project.department_name || '').toLowerCase().trim();
  const projType = String(project.project_type || '').toLowerCase().trim();
  const projCode = String(project.code || '').toUpperCase().trim();
  const projName = String(project.name || '').toLowerCase().trim();

  return (
    dept === 'SOIL_INVESTIGATION' ||
    dept === 'COIMBATORE_SOIL' ||
    dept === 'CBE_SOIL_INVESTIGATION' ||
    dept.includes('SOIL') ||
    deptName.includes('soil') ||
    projType.includes('soil') ||
    projCode.startsWith('SOIL') ||
    projCode.startsWith('CBE-S') ||
    projName.includes('borehole') ||
    projName.includes('stratum') ||
    projName.includes('soil')
  );
}

/**
 * Tabs specifically excluded for Soil Investigation projects per requirement:
 * - Design, Material, Attendance, Equipment are removed.
 * - Dashboard, Task, BOQ, Party, Transaction, To Do, Subcon, Files, MOM remain.
 */
export const SOIL_EXCLUDED_TABS: WorkspaceTabId[] = ['design', 'material', 'attendance', 'equipment'];

/**
 * Role-wise Tab Access Rules (Requirement 7):
 * - Super Admin / Admin: All 13 tabs
 * - Project Manager: Dashboard, BOQ, Party, Transaction, To Do, Task, Attendance, Material, Subcon, Equipment, Files, MOM
 * - Site Engineer: Dashboard, Design, BOQ, To Do, Task, Attendance, Material, Equipment, Files, MOM (financial/party/subcon hidden)
 * - PM / Site Engineer: Combined (Dashboard, Design, BOQ, Party, Transaction, To Do, Task, Attendance, Material, Subcon, Equipment, Files, MOM)
 * - Site Supervisor: Daily site work only: Dashboard, To Do, Task, Attendance, Material, Equipment, Files, MOM (financial/sensitive modules hidden)
 * Note: If project belongs to Soil Investigation department, Design, Material, Attendance, Equipment are excluded.
 */
export function getAllowedTabsForRole(roleCode?: string, roleName?: string, project?: Project | null): WorkspaceTabId[] {
  const code = (roleCode || '').toUpperCase().trim();
  const name = (roleName || '').toLowerCase().trim();

  let tabs: WorkspaceTabId[];

  // Super Admin / Admin / Director
  if (
    code === 'SUPER_ADMIN' || 
    code === 'ADMIN' || 
    name.includes('super admin') || 
    name.includes('owner') || 
    name.includes('director') || 
    name.includes('admin')
  ) {
    tabs = ['dashboard', 'design', 'boq', 'party', 'transaction', 'todo', 'task', 'attendance', 'material', 'subcon', 'equipment', 'files', 'mom'];
  } else if (
    code === 'PM_SITE_ENGINEER' || 
    (name.includes('pm') && name.includes('engineer')) || 
    name.includes('project manager / site engineer') ||
    (code.includes('PM') && code.includes('ENGINEER'))
  ) {
    // PM + Site Engineer Combined
    tabs = ['dashboard', 'design', 'boq', 'party', 'transaction', 'todo', 'task', 'attendance', 'material', 'subcon', 'equipment', 'files', 'mom'];
  } else if (code === 'PROJECT_MANAGER' || code === 'PM' || name.includes('project manager')) {
    // Project Manager
    tabs = ['dashboard', 'boq', 'party', 'transaction', 'todo', 'task', 'attendance', 'material', 'subcon', 'equipment', 'files', 'mom'];
  } else if (code === 'SITE_ENGINEER' || name.includes('site engineer') || name.includes('engineer')) {
    // Site Engineer
    tabs = ['dashboard', 'design', 'boq', 'todo', 'task', 'attendance', 'material', 'equipment', 'files', 'mom'];
  } else if (code === 'SUPERVISOR' || code === 'SITE_SUPERVISOR' || name.includes('supervisor')) {
    // Site Supervisor
    tabs = ['dashboard', 'todo', 'task', 'attendance', 'material', 'equipment', 'files', 'mom'];
  } else {
    // Default Employee / Staff fallback
    tabs = ['dashboard', 'todo', 'task', 'attendance', 'material', 'equipment', 'files', 'mom'];
  }

  // Filter out excluded tabs if this project is in the Soil Department
  if (isSoilDepartmentProject(project)) {
    tabs = tabs.filter(tab => !SOIL_EXCLUDED_TABS.includes(tab));
  }

  return tabs;
}

interface ProjectTopNavProps {
  project: Project;
  allProjects: Project[];
  activeTab: WorkspaceTabId;
  onSelectTab: (tab: WorkspaceTabId) => void;
  onSelectProject: (project: Project) => void;
  onCreateNewProject: () => void;
  onStatusChange?: (status: 'ACTIVE' | 'PLANNING' | 'ON_HOLD' | 'COMPLETED') => void;
  onOpenTeamModal?: () => void;
  onOpenSettingsModal?: () => void;
  onOpenFeedbackModal?: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onBack?: () => void;
  userRole?: string;
  userRoleName?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const ProjectTopNav: React.FC<ProjectTopNavProps> = ({
  project,
  allProjects,
  activeTab,
  onSelectTab,
  onSelectProject,
  onCreateNewProject,
  onStatusChange,
  onOpenTeamModal,
  onOpenFeedbackModal,
  isSidebarOpen,
  onToggleSidebar,
  onBack,
  userRole,
  userRoleName,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');

  const projDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  // Resolve current active role
  const [activeUser, setActiveUser] = useState(() => {
    try {
      const stored = localStorage.getItem('siteops_user');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return {
      role_code: userRole || 'SUPER_ADMIN',
      role_name: userRoleName || 'Owner / Director',
      first_name: 'Priya'
    };
  });

  useEffect(() => {
    const handleUserUpdate = (e: any) => {
      if (e.detail) setActiveUser(e.detail);
    };
    window.addEventListener('siteops_user_updated', handleUserUpdate);
    return () => window.removeEventListener('siteops_user_updated', handleUserUpdate);
  }, []);

  const effectiveRoleCode = userRole || activeUser?.role_code || 'SUPER_ADMIN';
  const effectiveRoleName = userRoleName || activeUser?.role_name || 'Staff';

  // Allowed tabs based on employee role and project department
  const allowedTabIds = getAllowedTabsForRole(effectiveRoleCode, effectiveRoleName, project);
  const allowedTabs = WORKSPACE_TABS.filter(t => allowedTabIds.includes(t.id));

  // Auto redirect if current tab is not allowed for this employee role
  useEffect(() => {
    if (!allowedTabIds.includes(activeTab)) {
      onSelectTab('dashboard');
    }
  }, [allowedTabIds, activeTab, onSelectTab]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (projDropdownRef.current && !projDropdownRef.current.contains(e.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered projects for switcher
  const filteredProjects = allProjects.filter(p => 
    p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
    p.code.toLowerCase().includes(projectSearch.toLowerCase()) ||
    (p.client_name && p.client_name.toLowerCase().includes(projectSearch.toLowerCase()))
  );

  // Helper for status label & dot
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { label: 'Ongoing', dotColor: 'bg-emerald-500', textColor: 'text-slate-800' };
      case 'PLANNING':
        return { label: 'Planning', dotColor: 'bg-amber-500', textColor: 'text-slate-800' };
      case 'ON_HOLD':
        return { label: 'On Hold', dotColor: 'bg-rose-500', textColor: 'text-slate-800' };
      case 'COMPLETED':
        return { label: 'Completed', dotColor: 'bg-blue-500', textColor: 'text-slate-800' };
      default:
        return { label: 'Ongoing', dotColor: 'bg-emerald-500', textColor: 'text-slate-800' };
    }
  };

  const statusConfig = getStatusConfig(project.status);

  // Display title: Project Name (Client Name)
  const displayTitle = formatProjectTitle(project);
  const baseTitleForInitials = displayTitle.split('(')[0].trim();

  // Determine avatar initials (2 letters, e.g. CA)
  const projectInitials = project.initials 
    ? project.initials.slice(0, 2).toUpperCase() 
    : (baseTitleForInitials ? baseTitleForInitials.slice(0, 2).toUpperCase() : 'PR');

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 select-none px-4 sm:px-6 py-3">
        {/* Row 1: Left (Back Arrow + Badge + Title + Code + Site) and Right (Utilities) */}
        <div className="flex items-center justify-between gap-3 sm:gap-4 min-w-0">
          
          {/* Left: Back Arrow + Avatar Badge + Project Name + Code + Site */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            {/* Back arrow: return to projects list */}
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                title="Back to Assigned Projects"
                aria-label="Back to Assigned Projects"
                className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 border border-slate-200 hover:border-red-200 shadow-2xs transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            

            {/* Project Header Info: Name, Code, Site, Status (Requirement 3) */}
            <div className="flex flex-col min-w-0" ref={projDropdownRef}>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                  className="flex items-center gap-1.5 py-0.5 px-1 -ml-1 rounded-lg hover:bg-slate-100 text-slate-900 font-bold text-base sm:text-lg transition-colors cursor-pointer group text-left max-w-full"
                  title="Switch Project"
                >
                  <span className="truncate text-slate-900 font-bold tracking-tight">
                    {displayTitle}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-slate-800 transition-transform shrink-0" />
                </button>
              </div>

              {/* Subtitle: Site Location & Status */}
              <div className="flex items-center gap-2.5 text-xs sm:text-[13px] text-slate-500 mt-0.5 flex-wrap">
                <span className="flex items-center gap-1 font-medium text-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span className="font-semibold">Site:</span>
                  <strong className="text-slate-900 font-bold">{project.city || project.location || 'Site'}</strong>
                </span>

                <span className="text-slate-300 hidden sm:inline">•</span>

                <span className="hidden sm:inline-flex items-center gap-1 text-slate-600">
                  <span className="font-semibold">Client:</span>
                  <strong className="text-slate-800 font-bold">{project.client_name || 'Client'}</strong>
                </span>


              </div>

              {/* Project Switcher Dropdown */}
              {isProjectDropdownOpen && (
                <div className="absolute left-10 sm:left-14 top-14 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 pb-2 border-b border-slate-100">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search projects..."
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-red-600"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto py-1">
                    {filteredProjects.map((p) => {
                      const isSelected = p.id === project.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            onSelectProject(p);
                            setIsProjectDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs hover:bg-red-50/60 transition-colors ${
                            isSelected ? 'bg-red-50/80 font-bold text-red-900' : 'text-slate-700 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <div className={`w-6 h-6 rounded-md ${p.avatar_color || 'bg-red-600'} text-white text-[10px] font-bold flex items-center justify-center shrink-0`}>
                              {p.initials || p.name.charAt(0)}
                            </div>
                            <div className="truncate">
                              <div className="truncate text-slate-800">{formatProjectTitle(p)}</div>
                              <div className="text-[10px] text-slate-400 tracking-tight">{p.code}</div>
                            </div>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-red-600 shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-1.5 mt-1 border-t border-slate-100 px-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProjectDropdownOpen(false);
                        onCreateNewProject();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create New Project</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Utilities: Status, ThumbsUp, M+, Bell, User Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Status Dropdown */}
            <div className="relative" ref={statusDropdownRef}>
              <button
                type="button"
                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors border border-slate-200/80 cursor-pointer"
                title="Update Project Status"
              >
                <span className={`w-2 h-2 rounded-full ${statusConfig.dotColor}`} />
                <span className="text-[11px] sm:text-xs text-slate-700">{statusConfig.label}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isStatusDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-40 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Project Status
                  </div>
                  {[
                    { key: 'ACTIVE', label: 'Ongoing', dot: 'bg-emerald-500' },
                    { key: 'PLANNING', label: 'Planning', dot: 'bg-amber-500' },
                    { key: 'ON_HOLD', label: 'On Hold', dot: 'bg-rose-500' },
                    { key: 'COMPLETED', label: 'Completed', dot: 'bg-blue-500' },
                  ].map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => {
                        onStatusChange?.(s.key as any);
                        setIsStatusDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-slate-50 transition-colors ${
                        project.status === s.key ? 'font-bold text-slate-900 bg-slate-50' : 'text-slate-600'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Feedback Thumbs Up */}
            <button
              type="button"
              onClick={onOpenFeedbackModal}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              title="Give Feedback"
            >
              <ThumbsUp className="w-4 h-4" />
            </button>

            {/* Team Member M+ */}
            <button
              type="button"
              onClick={onOpenTeamModal}
              className="flex items-center justify-center w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold shadow-2xs transition-transform hover:scale-105 cursor-pointer"
              title="Manage Team Members"
            >
              <span className="leading-none">M</span>
              <span className="text-[9px] font-black leading-none ml-0.5">+</span>
            </button>

            {/* Fullscreen Expand/Minimize Button */}
            {onToggleFullscreen && (
              <button
                type="button"
                onClick={onToggleFullscreen}
                className={`p-1.5 rounded-full transition-colors cursor-pointer border ${
                  isFullscreen 
                    ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                    : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
                title={isFullscreen ? "Exit Fullscreen" : "Full Screen"}
                aria-label={isFullscreen ? "Exit Fullscreen" : "Full Screen"}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4 text-red-600" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}

            {/* User Profile & Notifications */}
            <UserProfileDropdown showBell={true} avatarSizeClass="w-7 h-7" />
          </div>

        </div>

        {/* Row 2: Horizontal Tabs with Role Permission Filtering (Requirement 3 & 7) */}
        <nav className="flex items-center gap-3.5 sm:gap-4.5 md:gap-6 pt-2.5 mt-2.5 border-t border-slate-100 overflow-x-auto no-scrollbar">
          {allowedTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`relative pb-1.5 text-[13.5px] sm:text-[14.5px] transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                  isActive 
                    ? 'text-red-600 font-bold border-b-2 border-red-600 -mb-px' 
                    : 'text-slate-700 font-semibold hover:text-slate-950'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* ── MOBILE RESPONSIVE BOTTOM NAVIGATION BAR (Requested in Audio) ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-1.5 flex items-center justify-around shadow-2xl safe-area-inset-bottom">
        {/* Tab 1: Dashboard */}
        <button
          type="button"
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'dashboard' ? 'text-red-600 font-bold scale-105' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Dashboard</span>
        </button>

        {/* Tab 2: Tasks (if allowed) */}
        {allowedTabIds.includes('task') && (
          <button
            type="button"
            onClick={() => onSelectTab('task')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'task' ? 'text-red-600 font-bold scale-105' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckSquare className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Tasks</span>
          </button>
        )}

        {/* Tab 3: Attendance (if allowed) or BOQ fallback */}
        {allowedTabIds.includes('attendance') ? (
          <button
            type="button"
            onClick={() => onSelectTab('attendance')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'attendance' ? 'text-red-600 font-bold scale-105' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Attendance</span>
          </button>
        ) : allowedTabIds.includes('boq') ? (
          <button
            type="button"
            onClick={() => onSelectTab('boq')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'boq' ? 'text-red-600 font-bold scale-105' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">BOQ</span>
          </button>
        ) : null}

        {/* Tab 4: Material (if allowed) or Files fallback */}
        {allowedTabIds.includes('material') ? (
          <button
            type="button"
            onClick={() => onSelectTab('material')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'material' ? 'text-red-600 font-bold scale-105' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Material</span>
          </button>
        ) : allowedTabIds.includes('files') ? (
          <button
            type="button"
            onClick={() => onSelectTab('files')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'files' ? 'text-red-600 font-bold scale-105' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Files</span>
          </button>
        ) : null}

        {/* Tab 5: More Drawer */}
        <button
          type="button"
          onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
            isMobileDrawerOpen || !['dashboard', 'task', allowedTabIds.includes('attendance') ? 'attendance' : 'boq', allowedTabIds.includes('material') ? 'material' : 'files'].includes(activeTab) 
              ? 'text-red-600 font-bold' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">More</span>
        </button>
      </div>

      {/* Mobile More Bottom Sheet Drawer */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150">
          <div className="bg-white rounded-t-3xl border-t border-slate-200 shadow-2xl p-5 space-y-4 max-h-[75vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Project Modules</h4>
                <p className="text-[11px] text-slate-500">Allowed for {effectiveRoleName}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5 py-1">
              {allowedTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(tab.id);
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`p-3 rounded-2xl flex flex-col items-center text-center gap-1.5 transition-all border ${
                      isActive 
                        ? 'bg-red-50 border-red-300 text-red-700 font-bold' 
                        : 'bg-slate-50/80 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-semibold">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

