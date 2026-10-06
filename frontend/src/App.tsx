import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { CompanyDashboardView } from './views/CompanyDashboardView';
import { DashboardView } from './views/DashboardView';
import { ProjectsView } from './views/ProjectsView';
import { ProcurementView } from './views/ProcurementView';
import { WorkforceView } from './views/WorkforceView';
import { EquipmentView } from './views/EquipmentView';
import { SiteOpsView } from './views/SiteOpsView';
import { SnagsView } from './views/SnagsView';
import { ApprovalsView } from './views/ApprovalsView';
import { SettingsView } from './views/SettingsView';
import { DocumentsView } from './views/DocumentsView';
import { DepartmentsView } from './views/DepartmentsView';
import { ClientPortalView } from './views/ClientPortalView';
import { TasksView } from './views/TasksView';
import { PaymentsView } from './views/PaymentsView';
import { AccountsFinanceView } from './views/AccountsFinanceView';
import { QuotationView } from './views/QuotationView';
import { TeamScheduleView } from './views/TeamScheduleView';
import { LoginView } from './views/LoginView';
import { NotFound404View } from './components/common/NotFound404View';
import { globalErrorService, Http404Details, clear404Error, trigger404Error } from './lib/errorService';
import { MobileSiteSimulatorModal } from './components/MobileSiteSimulatorModal';
import { GlobalConfirmationModal } from './components/GlobalConfirmationModal';
import { GlobalToastNotification } from './components/GlobalToastNotification';
import { confirmNavigationIfDirty, getIsFormDirty, clearFormDirty } from './lib/dialogService';

import { api } from './lib/api';
import { 
  Project, Role, User, WBSTask, CostPlanItem, 
  ChangeOrder, MaterialRequest, PurchaseOrder, 
  GoodsReceiptNote, Invoice, StockItem, Worker, 
  AttendanceRecord, DPR, Snag, ApprovalRequest, Lead, Asset 
} from './types';
import { 
  MOCK_USER, MOCK_PROJECTS, MOCK_TASKS, MOCK_BOQ, 
  MOCK_CHANGE_ORDERS, MOCK_MATERIAL_REQUESTS, MOCK_PURCHASE_ORDERS, 
  MOCK_GRN, MOCK_INVOICES, MOCK_STOCK, MOCK_WORKERS, 
  MOCK_ATTENDANCE, MOCK_DPR, MOCK_SNAGS, MOCK_APPROVALS, 
  MOCK_LEADS, MOCK_ASSETS, MOCK_ROLES 
} from './lib/mockData';
import { 
  getCurrentUserAccount, 
  setCurrentUserAccount, 
  logoutUser, 
  UserAccount, 
  isPageAllowedForActiveUser 
} from './lib/authService';
import { syncProjectAssignmentNotifications, getNotifications } from './lib/notificationService';
import { getOrInitializeProjects } from './lib/departmentService';


const KNOWN_VIEWS = new Set([
  'company_dashboard',
  'dashboard',
  'projects',
  'procurement',
  'warehouse',
  'workforce',
  'payroll',
  'equipment',
  'asset',
  'site_ops',
  'report',
  'snags',
  'setting',
  'settings',
  'approvals',
  'quotation',
  'schedule',
  'timesheet',
  'team_schedule',
  'schedule_timesheet',
  'documents',
  'library',
  'departments',
  'soil_investigation',
  'architecture',
  'marketing',
  'construction_dept',
  'accounts_dept',
  'client_portal',
  'tasks',
  'finance',
  'accounts_finance',
  'expenses',
  'account_transfer',
  'account-transfer',
  'payments'
]);

const isKnownView = (view: string) => {
  return KNOWN_VIEWS.has(view) || view.startsWith('dept_');
};

export function App() {
  const [currentUserAccount, setCurrentUserAccountState] = useState<UserAccount | null>(() => getCurrentUserAccount());
  const [currentView, setCurrentView] = useState<string>('company_dashboard');
  const [global404Error, setGlobal404Error] = useState<Http404Details | null>(null);

  useEffect(() => {
    // Expose helpers globally for testing/debugging
    (window as any).trigger404Error = trigger404Error;
    (window as any).clear404Error = clear404Error;

    const unsubscribe = globalErrorService.subscribe((err) => {
      setGlobal404Error(err);
    });
    return () => unsubscribe();
  }, []);

  // If clients, crm, tasks, or snags view is requested, route appropriately
  useEffect(() => {
    if (currentView === 'clients' || currentView === 'crm') {
      setCurrentView('quotation');
    }
    if (currentView === 'tasks' || currentView === 'snags') {
      setCurrentView('projects');
    }
  }, [currentView]);

  // Purge legacy mock data from browser localStorage on startup
  useEffect(() => {
    try {
      const stTxns = localStorage.getItem('booshnam_statement_transactions_v1');
      if (stTxns && (stTxns.includes('st-c-') || stTxns.includes('st-ax-'))) {
        localStorage.removeItem('booshnam_statement_transactions_v1');
      }
      const leads = localStorage.getItem('booshnam_leads_v2');
      if (leads && (leads.includes('"id":"lead-101"') || leads.includes('"id":"LD-101"'))) {
        localStorage.removeItem('booshnam_leads_v2');
      }
      const quots = localStorage.getItem('booshnam_quotations_v2');
      if (quots && (quots.includes('"id":"quo-101"') || quots.includes('"id":"QBAG/3078"'))) {
        localStorage.removeItem('booshnam_quotations_v2');
      }
      const banks = localStorage.getItem('booshnam_finance_bank_accounts_v4');
      if (banks && (banks.includes('4850000') || banks.includes('12400000') || banks.includes('17583911') || banks.includes('ba-hdfc') || banks.includes('ba-sbi') || banks.includes('ba-default-1'))) {
        localStorage.removeItem('booshnam_finance_bank_accounts_v4');
      }
      const finParties = localStorage.getItem('booshnam_finance_parties');
      if (finParties && (finParties.includes('"id":"pty-101"') || finParties.includes('"id":"pty-102"'))) {
        localStorage.removeItem('booshnam_finance_parties');
      }
      const payReqs = localStorage.getItem('booshnam_finance_payment_requests');
      if (payReqs && (payReqs.includes('"id":"pr-101"') || payReqs.includes('"id":"pr-102"'))) {
        localStorage.removeItem('booshnam_finance_payment_requests');
      }
      const finTxns = localStorage.getItem('booshnam_finance_transactions');
      if (finTxns && (finTxns.includes('"id":"tx-101"') || finTxns.includes('"id":"tx-102"'))) {
        localStorage.removeItem('booshnam_finance_transactions');
      }
      const finExps = localStorage.getItem('booshnam_finance_expenses_v1');
      if (finExps && (finExps.includes('"id":"exp-101"') || finExps.includes('"id":"exp-102"'))) {
        localStorage.removeItem('booshnam_finance_expenses_v1');
      }
      const finTrfs = localStorage.getItem('booshnam_finance_transfers_v1');
      if (finTrfs && (finTrfs.includes('"id":"trf-101"') || finTrfs.includes('"id":"trf-102"'))) {
        localStorage.removeItem('booshnam_finance_transfers_v1');
      }

      // Purge dummy timesheets and quotation schedule tasks explicitly
      const timesheets = localStorage.getItem('booshnam_team_timesheets_v1');
      if (timesheets && (timesheets.includes('"id":"ts-01"') || timesheets.includes('OVER HEADS') || timesheets.includes('sembakkkam'))) {
        try {
          const parsed = JSON.parse(timesheets);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter((t: any) => 
              !t.id?.match(/^ts-0[1-9]$/) &&
              t.project_name !== 'OVER HEADS' &&
              !(t.remarks && t.remarks.includes('sembakkkam'))
            );
            localStorage.setItem('booshnam_team_timesheets_v1', JSON.stringify(cleaned));
            window.dispatchEvent(new CustomEvent('booshnam_timesheets_updated', { detail: cleaned }));
          }
        } catch (e) {
          localStorage.removeItem('booshnam_team_timesheets_v1');
        }
      }

      const qTasks = localStorage.getItem('booshnam_quotation_schedule_tasks_v3');
      if (qTasks) {
        try {
          const parsed = JSON.parse(qTasks);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter((t: any) => 
              t.task_name !== 'Collect Client Details' &&
              t.project_name !== 'Project' &&
              t.project_id !== 'proj-01' &&
              t.project_id !== 'proj-02' &&
              !t.id?.match(/^q-task-0?[1-9]$|^q-task-1[0-9]$/) && 
              !t.id?.startsWith('proj-quotation-') &&
              t.project_name !== 'Navalur Residential Enclave' &&
              t.project_name !== 'Tambaram Commercial Hub' &&
              t.project_name !== 'Medavakkam Villa Plots' &&
              t.project_name !== 'Velachery Tech Park Extension' &&
              t.project_name !== 'Guindy Industrial Shed' &&
              t.project_name !== 'Chromepet IT Complex'
            ).map((t: any) => {
              if (t.project_id) {
                try {
                  const rawWbs = localStorage.getItem(`booshnam_wbs_tasks_v2_${t.project_id}`) || localStorage.getItem(`booshnam_wbs_tasks_v10_${t.project_id}`);
                  if (rawWbs) {
                    const wbsList = JSON.parse(rawWbs);
                    if (Array.isArray(wbsList)) {
                      const matched = wbsList.find((w: any) => 
                        w.id === t.wbs_task_id || 
                        w.id === t.id?.replace('proj-task-', '') ||
                        w.title === t.task_name ||
                        (w.title && w.title.toLowerCase().includes('quot'))
                      );
                      if (matched) {
                        const isDone = matched.status === 'COMPLETED' || (matched.progress_percentage !== undefined && matched.progress_percentage >= 100);
                        const isOngoing = !isDone && (matched.status === 'IN_PROGRESS' || (matched.progress_percentage !== undefined && matched.progress_percentage > 0));
                        if (isDone) {
                          return { ...t, status: 'COMPLETED', progress_percentage: 100, stage_label: 'Completed', color_theme: 'green' };
                        } else if (isOngoing) {
                          return { ...t, status: 'IN_PROGRESS', progress_percentage: matched.progress_percentage || 50, stage_label: 'Ongoing', color_theme: 'blue' };
                        } else {
                          return { ...t, status: 'PENDING', progress_percentage: 0, stage_label: 'Not Started Yet', color_theme: 'red' };
                        }
                      }
                    }
                  }
                } catch (e) {}
              }
              return t;
            });
            localStorage.setItem('booshnam_quotation_schedule_tasks_v3', JSON.stringify(cleaned));
            window.dispatchEvent(new CustomEvent('booshnam_quotation_schedule_updated', { detail: cleaned }));
          }
        } catch (e) {
          localStorage.removeItem('booshnam_quotation_schedule_tasks_v3');
        }
      }
      try {
        localStorage.removeItem('booshnam_quotation_schedule_tasks_v1');
        localStorage.removeItem('booshnam_quotation_schedule_tasks_v2');
        localStorage.removeItem('booshnam_wbs_tasks_v2_proj-01');
        localStorage.removeItem('booshnam_wbs_tasks_v2_proj-02');
        localStorage.removeItem('booshnam_wbs_tasks_v2_default');
      } catch (e) {}

      // Sanitize any existing project task lists in localStorage:
      // 1. Reset any auto-completed mock tasks without user completion proof to TODO (Start) with 0% progress
      // 2. Clear auto-subtask flag on Site Visit if it has no parent
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('booshnam_wbs_tasks_v2_') || k.startsWith('booshnam_wbs_tasks_v10_'))) {
            const raw = localStorage.getItem(k);
            if (raw) {
              const parsedTasks = JSON.parse(raw);
              if (Array.isArray(parsedTasks) && parsedTasks.length > 0) {
                let changed = false;
                const cleanedTasks = parsedTasks.map((t: any) => {
                  let next = { ...t };
                  if (next.title === 'Site Visit' && !next.parent_id && next.is_subtask) {
                    next.is_subtask = false;
                    changed = true;
                  }
                  const hasUserCompletion = Boolean(next.completion_remarks || next.completion_proof_url);
                  if (next.status === 'COMPLETED' && !hasUserCompletion) {
                    next.status = 'TODO';
                    next.progress_percentage = 0;
                    next.progress_label = '0/1 lumpsum';
                    next.delay_status = 'On Time';
                    next.actual_start = '';
                    next.actual_end = '';
                    next.forecast_end = 'On schedule';
                    changed = true;
                  }
                  return next;
                });
                if (changed) {
                  localStorage.setItem(k, JSON.stringify(cleanedTasks));
                }
              }
            }
          }
        }
      } catch (e) {}

      // Purge dummy projects explicitly & clean project names
      const savedProjs = localStorage.getItem('booshnam_projects_v2');
      if (savedProjs) {
         // Read it, filter it, rewrite it
         try {
           const parsed = JSON.parse(savedProjs);
           if (Array.isArray(parsed)) {
             const cleaned = parsed
               .filter((p: any) => 
                 !p.id?.startsWith('proj-') && 
                 !p.id?.startsWith('bn-') &&
                 !['Prestige Boulevard', 'Royal Palm', 'Green Valley', 'Sunrise Industrial', 'Urban Metro', 'Skyline Contemporary', 'Heritage Courtyard', 'Highway Overpass', 'Government Medical College', 'High-Rise Commercial', 'Coastal Highway'].some(t => (p.name || p.title || p.client_name || '').includes(t))
               )
               .map((p: any) => {
                 if (p && p.name && p.client_name) {
                   const escapedClient = p.client_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                   const stripped = p.name.replace(new RegExp(`\\s*\\(${escapedClient}\\)\\s*$`, 'i'), '').trim();
                   if (stripped && stripped !== p.name) {
                     return { ...p, name: stripped };
                   }
                 }
                 return p;
               });
             localStorage.setItem('booshnam_projects_v2', JSON.stringify(cleaned));
           }
         } catch(e) {}
      }

      // Ensure all 10 departments have at least one project
      const allDeptsProjs = getOrInitializeProjects();
      setProjects(allDeptsProjs);
      if (allDeptsProjs.length > 0) {
        setSelectedProject(prev => prev || allDeptsProjs[0]);
      } else {
        setSelectedProject(null);
      }
      window.dispatchEvent(new CustomEvent('booshnam_projects_updated', { detail: allDeptsProjs }));
    } catch (e) {}
  }, []);
  const [activeRole, setActiveRole] = useState<Role>(() => {
    const acc = getCurrentUserAccount();
    if (acc) {
      return MOCK_ROLES.find(r => r.code === acc.role_code) || api.getActiveRole();
    }
    return api.getActiveRole();
  });
  const [user, setUser] = useState<User>(() => {
    const acc = getCurrentUserAccount();
    if (acc) {
      const parts = acc.staff_name.split(' ');
      return {
        ...MOCK_USER,
        first_name: parts[0] || 'Staff',
        last_name: parts.slice(1).join(' ') || '',
        role_name: acc.role_name,
        role_code: acc.role_code
      };
    }
    return MOCK_USER;
  });
  const [projects, setProjects] = useState<Project[]>(() => getOrInitializeProjects());
  const [selectedProject, setSelectedProject] = useState<Project | null>(() => {
    const projs = getOrInitializeProjects();
    return projs[0] || null;
  });
  const [isMobileSimOpen, setIsMobileSimOpen] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Save projects to localStorage
  useEffect(() => {
    try {
      const clean = (projects || []).filter((p: any) => 
        !p.id?.startsWith('proj-') &&
        !p.id?.startsWith('bn-') &&
        !['Prestige Boulevard', 'Royal Palm', 'Green Valley', 'Sunrise Industrial', 'Urban Metro', 'Skyline Contemporary', 'Heritage Courtyard', 'Highway Overpass', 'Government Medical College', 'High-Rise Commercial', 'Coastal Highway'].some(t => (p.name || p.title || p.client_name || '').includes(t))
      );
      localStorage.setItem('booshnam_projects_v2', JSON.stringify(clean));
    } catch (e) {}
  }, [projects]);

  // Sync projects from external updates (e.g. from TaskTab or ProjectsView)
  useEffect(() => {
    const handleProjectsUpdated = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        const clean = e.detail.filter((p: any) => 
          !p.id?.startsWith('proj-') &&
          !p.id?.startsWith('bn-') &&
          !['Prestige Boulevard', 'Royal Palm', 'Green Valley', 'Sunrise Industrial', 'Urban Metro', 'Skyline Contemporary', 'Heritage Courtyard', 'Highway Overpass', 'Government Medical College', 'High-Rise Commercial', 'Coastal Highway'].some(t => (p.name || p.title || p.client_name || '').includes(t))
        );
        setProjects(clean);
      }
    };
    window.addEventListener('booshnam_projects_updated', handleProjectsUpdated);
    return () => window.removeEventListener('booshnam_projects_updated', handleProjectsUpdated);
  }, []);

  // Automatically hide sidebar & hamburger when Profile Settings Modal is opened,
  // and restore it to its previous state when closed (as requested)
  useEffect(() => {
    const handleProfileModalOpen = () => {
      setIsProfileModalOpen(true);
    };

    const handleProfileModalClose = () => {
      setIsProfileModalOpen(false);
    };

    window.addEventListener('siteops_profile_modal_open', handleProfileModalOpen);
    window.addEventListener('siteops_profile_modal_close', handleProfileModalClose);

    return () => {
      window.removeEventListener('siteops_profile_modal_open', handleProfileModalOpen);
      window.removeEventListener('siteops_profile_modal_close', handleProfileModalClose);
    };
  }, []);

  // Data states
  const [tasks, setTasks] = useState<WBSTask[]>(() => {
    try {
      const saved = localStorage.getItem('booshnam_global_tasks_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return MOCK_TASKS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('booshnam_global_tasks_v2', JSON.stringify(tasks));
    } catch (e) {}
  }, [tasks]);
  const [boq, setBOQ] = useState<CostPlanItem[]>(MOCK_BOQ);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>(MOCK_CHANGE_ORDERS);
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>(MOCK_MATERIAL_REQUESTS);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(MOCK_PURCHASE_ORDERS);
  const [grns, setGRNs] = useState<GoodsReceiptNote[]>(MOCK_GRN);
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [stock, setStock] = useState<StockItem[]>(MOCK_STOCK);
  const [workers, setWorkers] = useState<Worker[]>(MOCK_WORKERS);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(MOCK_ATTENDANCE);
  const [dprs, setDPRs] = useState<DPR[]>(MOCK_DPR);
  const [snags, setSnags] = useState<Snag[]>(MOCK_SNAGS);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>(MOCK_APPROVALS);
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [assets, setAssets] = useState<Asset[]>(MOCK_ASSETS);

  // Sync role switch
  const handleSwitchRole = (newRole: Role) => {
    setActiveRole(newRole);
    api.setActiveRole(newRole);
    setUser(prev => ({
      ...prev,
      role_name: newRole.name,
      role_code: newRole.code,
      active_role: newRole
    }));

    // Persona-based dedicated portal routing
    if (newRole.code === 'CLIENT') {
      setCurrentView('client_portal');
    } else if (newRole.code === 'ARCHITECT') {
      setCurrentView('departments');
    } else if (newRole.code === 'ACCOUNTS') {
      setCurrentView('payments');
    } else if (newRole.code === 'SITE_ENGINEER') {
      setCurrentView('projects');
    }
  };

  const showToast = (_msg: any) => {
    // Corner toast notifications removed globally per user request
  };

  useEffect(() => {
    // Corner toast notifications listener disabled per user request
  }, []);

  const handleConvertLeadSuccess = (projectTitle: string) => {
    const newProj: Project = {
      id: `p-${projects.length + 1}`,
      code: `PRJ-${String(projects.length + 1).padStart(3, '0')}`,
      name: projectTitle,
      client_name: 'Converted from Lead',
      project_type: 'Commercial Complex',
      location: 'Site Location Pending',
      latitude: 12.9716,
      longitude: 77.5946,
      geofence_radius_meters: 300,
      start_date: new Date().toISOString().split('T')[0],
      expected_end_date: new Date(Date.now() + 365*86400000).toISOString().split('T')[0],
      estimated_budget: 142000000,
      actual_cost: 0,
      progress_percentage: 0,
      status: 'PLANNING',
      description: 'Newly converted project from winning CRM tender.'
    };
    setProjects(prev => [newProj, ...prev]);
    setSelectedProject(newProj);
    showToast(`Project ${newProj.code} (${newProj.name}) launched!`);
  };

  const handleLoginSuccess = (account: UserAccount) => {
    setCurrentUserAccount(account);
    setCurrentUserAccountState(account);

    const matchedRole = MOCK_ROLES.find(r => r.code === account.role_code) || {
      id: account.role_code,
      name: account.role_name,
      code: account.role_code,
      description: 'Assigned Role'
    };
    setActiveRole(matchedRole);
    api.setActiveRole(matchedRole);

    const nameParts = (account.staff_name || account.username || 'Staff').split(' ');
    setUser(prev => ({
      ...prev,
      first_name: nameParts[0] || 'Staff',
      last_name: nameParts.slice(1).join(' ') || '',
      role_name: account.role_name,
      role_code: account.role_code,
      active_role: matchedRole
    }));

    // Synchronize assignment notifications from all projects for this user
    syncProjectAssignmentNotifications();

    // Check if there are any unread project assignments for this user and pop up a notification
    setTimeout(() => {
      const notifs = getNotifications(account.staff_name || account.username, account.role_code, account.role_name);
      const unreadAssign = notifs.find(n => !n.read && n.type === 'PROJECT_ASSIGNED');
      if (unreadAssign) {
        window.dispatchEvent(new CustomEvent('siteops_toast', {
          detail: {
            title: unreadAssign.title || 'Project Assigned',
            message: unreadAssign.message,
            type: 'info',
            duration: 6000
          }
        }));
      }
    }, 450);

    if (account.allowedPages && account.allowedPages.length > 0) {
      const firstAllowed = account.allowedPages[0];
      if (firstAllowed === 'dashboard') {
        setCurrentView('company_dashboard');
      } else {
        setCurrentView(firstAllowed);
      }
    } else {
      setCurrentView('company_dashboard');
    }
  };

  // Sync project assignments on mount
  useEffect(() => {
    syncProjectAssignmentNotifications();
  }, [projects]);


  useEffect(() => {
    const handleSessionChange = (e: any) => {
      const updated = e.detail as UserAccount | null;
      setCurrentUserAccountState(updated);
      if (updated) {
        const matchedRole = MOCK_ROLES.find(r => r.code === updated.role_code) || {
          id: updated.role_code,
          name: updated.role_name,
          code: updated.role_code,
          description: 'Assigned Role'
        };
        setActiveRole(matchedRole);
        api.setActiveRole(matchedRole);
        const nameParts = updated.staff_name.split(' ');
        setUser(prev => ({
          ...prev,
          first_name: nameParts[0] || 'Staff',
          last_name: nameParts.slice(1).join(' ') || '',
          role_name: updated.role_name,
          role_code: updated.role_code,
          active_role: matchedRole
        }));
      }
    };

    const handleLogoutEvent = () => {
      setCurrentUserAccountState(null);
    };

    window.addEventListener('booshnam_session_changed', handleSessionChange);
    window.addEventListener('siteops_logout', handleLogoutEvent);

    return () => {
      window.removeEventListener('booshnam_session_changed', handleSessionChange);
      window.removeEventListener('siteops_logout', handleLogoutEvent);
    };
  }, []);

  useEffect(() => {
    if (currentUserAccount) {
      if (!isPageAllowedForActiveUser(currentView)) {
        const allowed = currentUserAccount.allowedPages?.filter(p => isPageAllowedForActiveUser(p)) || [];
        const first = allowed[0] || 'setting';
        setCurrentView(first === 'dashboard' ? 'company_dashboard' : first);
      }
    }
  }, [currentUserAccount, currentView]);

  // Prevent accidental tab close or page reload when form data is dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (getIsFormDirty()) {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave this page? Your entered data will be lost.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Guard main view navigation if dirty data is pending and check permission
  const handleNavigateView = async (targetView: string) => {
    if (targetView === currentView) return;
    if (!isPageAllowedForActiveUser(targetView)) {
      showToast('Access denied: You do not have permission to access this module');
      return;
    }
    const canNavigate = await confirmNavigationIfDirty();
    if (canNavigate) {
      setCurrentView(targetView);
    }
  };

  const pendingApprovalsCount = approvals.filter(a => a.status === 'PENDING').length;
  const canViewCost = api.canViewCost();

  if (!currentUserAccount) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className={`bg-white text-site-text flex flex-col ${
      currentView === 'quotation' ? 'h-screen max-h-screen overflow-hidden' : 'min-h-screen'
    }`}>
      {/* Sidebar - completely hidden when Profile Settings Modal is open so that the screen is 100% full screen with no sidebar or hamburger */}
      {!isProfileModalOpen && (
        <Sidebar
          currentView={currentView}
          onSelectView={handleNavigateView}
          activeRole={activeRole}
          onSwitchRole={handleSwitchRole}
          onOpenMobileSim={() => setIsMobileSimOpen(true)}
          pendingApprovalsCount={pendingApprovalsCount}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      )}

      {/* Main Content Area */}
      <div className={`transition-all duration-300 ease-in-out flex flex-col flex-1 min-w-0 bg-white ${
        isProfileModalOpen ? 'pl-0' : isSidebarOpen ? 'pl-64' : 'pl-[72px]'
      } ${currentView === 'quotation' ? 'h-screen max-h-screen overflow-hidden' : ''}`}>
        {/* View Router */}
        <main className={`flex-1 w-full min-w-0 bg-[#f8fafc] ${
          currentView === 'quotation' ? 'h-full flex flex-col overflow-hidden' : ''
        }`}>
          {/* Active 404 Error State (Shown until cleared) */}
          {global404Error ? (
            <NotFound404View
              errorDetails={global404Error}
              onClearError={() => clear404Error()}
              onNavigateHome={() => {
                clear404Error();
                setCurrentView('company_dashboard');
              }}
            />
          ) : !isKnownView(currentView) ? (
            <NotFound404View
              errorDetails={{
                resourceName: currentView,
                message: `The requested view "${currentView}" does not exist (404 Not Found).`,
                timestamp: Date.now()
              }}
              onClearError={() => setCurrentView('company_dashboard')}
              onNavigateHome={() => setCurrentView('company_dashboard')}
            />
          ) : (
            <>
              {currentView === 'company_dashboard' && (
                <CompanyDashboardView
                  projects={projects}
                  onSelectProject={setSelectedProject}
                  onNavigate={handleNavigateView}
                  canViewCost={canViewCost}
                  user={user}
                  isSidebarOpen={isSidebarOpen}
                  onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                />
              )}

              {currentView === 'dashboard' && (
                <DashboardView
                  projects={projects}
                  selectedProject={selectedProject}
                  onSelectProject={setSelectedProject}
                  onNavigate={setCurrentView}
                  activeRole={activeRole}
                  canViewCost={canViewCost}
                  isSidebarOpen={isSidebarOpen}
                  onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                />
              )}

              {currentView === 'projects' && (
                <ProjectsView
                  projects={projects}
                  setProjects={setProjects}
                  selectedProject={selectedProject}
                  onSelectProject={setSelectedProject}
                  tasks={tasks}
                  setTasks={setTasks}
                  approvals={approvals}
                  materialRequests={materialRequests}
                  canViewCost={canViewCost}
                  onNavigate={setCurrentView}
                  onShowToast={showToast}
                  isSidebarOpen={isSidebarOpen}
                  onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                />
              )}

              {(currentView === 'procurement' || currentView === 'warehouse') && (
                <ProcurementView
                  materialRequests={materialRequests}
                  purchaseOrders={purchaseOrders}
                  grns={grns}
                  invoices={invoices}
                  stockItems={stock}
                  projects={projects}
                  initialTab={currentView === 'warehouse' ? 'stock' : undefined}
                  isSidebarOpen={isSidebarOpen}
                  onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                />
              )}

              {(currentView === 'workforce' || currentView === 'payroll') && (
                <WorkforceView
                  project={selectedProject}
                  workers={workers}
                  attendance={attendance}
                  canViewCost={canViewCost}
                  isSidebarOpen={isSidebarOpen}
                  onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                />
              )}

              {(currentView === 'equipment' || currentView === 'asset') && (
                <EquipmentView
                  project={selectedProject}
                  projects={projects}
                  assets={assets}
                  onUpdateAssets={setAssets}
                  isSidebarOpen={isSidebarOpen}
                  onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                  onShowToast={showToast}
                />
              )}

              {(currentView === 'site_ops' || currentView === 'report') && (
                <SiteOpsView
                  project={selectedProject}
                  dprs={dprs}
                  isSidebarOpen={isSidebarOpen}
                  onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                />
              )}

              {currentView === 'snags' && (
                <SnagsView
                  project={selectedProject}
                  snags={snags}
                  isSidebarOpen={isSidebarOpen}
                  onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                />
              )}

              {(currentView === 'setting' || currentView === 'settings') && (
                <SettingsView
                  activeRole={activeRole}
                  isSidebarOpen={isSidebarOpen}
                  onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                />
              )}

              {currentView === 'approvals' && (
                <ApprovalsView
                  approvals={approvals}
                  activeRole={activeRole}
                  isSidebarOpen={isSidebarOpen}
                  onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                />
              )}

              {currentView === 'quotation' && (
                <QuotationView
                  projects={projects}
                  onConvertSuccess={handleConvertLeadSuccess}
                  onShowToast={showToast}
                  isSidebarOpen={isSidebarOpen}
                  onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                  activeRole={activeRole?.code}
                />
              )}

              {(currentView === 'documents' || currentView === 'library') && (
                <DocumentsView
                  project={selectedProject}
                  isSidebarOpen={isSidebarOpen}
                  onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                />
              )}

              {(currentView === 'departments' || 
                currentView.startsWith('dept_') || 
                currentView === 'soil_investigation' || 
                currentView === 'architecture' || 
                currentView === 'marketing' || 
                currentView === 'construction_dept' || 
                currentView === 'accounts_dept') && (
                <DepartmentsView
                  initialDepartment={
                    currentView === 'dept_architecture' || currentView === 'architecture' ? 'ARCHITECTURE' :
                    currentView === 'dept_marketing' || currentView === 'marketing' ? 'MARKETING' :
                    currentView === 'dept_construction' || currentView === 'construction_dept' ? 'CONSTRUCTION' :
                    currentView === 'dept_accounts' || currentView === 'accounts_dept' ? 'ACCOUNTS' :
                    'SOIL_INVESTIGATION'
                  }
                  projects={projects}
                  isSidebarOpen={isSidebarOpen}
                  onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                  onShowToast={showToast}
                  onDepartmentChange={(dept) => {
                    if (dept === 'SOIL_INVESTIGATION') setCurrentView('dept_soil');
                    else if (dept === 'ARCHITECTURE') setCurrentView('dept_architecture');
                    else if (dept === 'MARKETING') setCurrentView('dept_marketing');
                    else if (dept === 'CONSTRUCTION') setCurrentView('dept_construction');
                    else if (dept === 'ACCOUNTS') setCurrentView('dept_accounts');
                  }}
                />
              )}

              {currentView === 'client_portal' && (
                <ClientPortalView
                  project={selectedProject}
                  projects={projects}
                  isSidebarOpen={isSidebarOpen}
                  onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                  onShowToast={showToast}
                />
              )}

              {currentView === 'tasks' && (
                <TasksView
                  tasks={tasks}
                  projects={projects}
                  isSidebarOpen={isSidebarOpen}
                  onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                  onShowToast={showToast}
                />
              )}

              {(currentView === 'finance' || currentView === 'accounts_finance' || currentView === 'expenses' || currentView === 'account_transfer' || currentView === 'account-transfer') && (
                <AccountsFinanceView
                  projects={projects}
                  isSidebarOpen={isSidebarOpen}
                  onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                  onShowToast={showToast}
                  initialTab={currentView === 'expenses' ? 'expenses' : (currentView === 'account_transfer' || currentView === 'account-transfer') ? 'account_transfer' : undefined}
                />
              )}

              {currentView === 'payments' && (
                <PaymentsView
                  projects={projects}
                  isSidebarOpen={isSidebarOpen}
                  onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                  onShowToast={showToast}
                />
              )}

              {(currentView === 'schedule' || currentView === 'timesheet' || currentView === 'team_schedule' || currentView === 'schedule_timesheet') && (
                <TeamScheduleView
                  projects={projects}
                  tasks={tasks}
                  activeRole={activeRole}
                  isSidebarOpen={isSidebarOpen}
                  onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                  onShowToast={showToast}
                  initialTab={currentView === 'timesheet' ? 'timesheet' : 'schedule'}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Companion Simulator Modal */}
      <MobileSiteSimulatorModal
        isOpen={isMobileSimOpen}
        onClose={() => setIsMobileSimOpen(false)}
        project={selectedProject}
      />

      {/* Global In-App Custom Confirmation & Alert Dialog System */}
      <GlobalConfirmationModal />
    </div>
  );
}

export default App;
