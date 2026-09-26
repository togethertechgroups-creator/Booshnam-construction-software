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
import { CRMView } from './views/CRMView';
import { DocumentsView } from './views/DocumentsView';
import { DepartmentsView } from './views/DepartmentsView';
import { ClientPortalView } from './views/ClientPortalView';
import { TasksView } from './views/TasksView';
import { PaymentsView } from './views/PaymentsView';
import { AccountsFinanceView } from './views/AccountsFinanceView';
import { QuotationView } from './views/QuotationView';
import { LoginView } from './views/LoginView';
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


export function App() {
  const [currentUserAccount, setCurrentUserAccountState] = useState<UserAccount | null>(() => getCurrentUserAccount());
  const [currentView, setCurrentView] = useState<string>('company_dashboard');
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
      localStorage.setItem('booshnam_projects_v2', JSON.stringify(projects));
    } catch (e) {}
  }, [projects]);

  // Sync projects from external updates (e.g. from TaskTab or ProjectsView)
  useEffect(() => {
    const handleProjectsUpdated = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setProjects(e.detail);
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

  const showToast = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  useEffect(() => {
    const handleToastEvent = (e: any) => {
      if (e.detail) showToast(e.detail);
    };
    window.addEventListener('siteops_toast', handleToastEvent);
    return () => window.removeEventListener('siteops_toast', handleToastEvent);
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
    if (currentUserAccount && currentUserAccount.role_code !== 'SUPER_ADMIN') {
      if (!isPageAllowedForActiveUser(currentView)) {
        const first = currentUserAccount.allowedPages[0];
        if (first) {
          setCurrentView(first === 'dashboard' ? 'company_dashboard' : first);
        }
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
    <div className="min-h-screen bg-white text-site-text flex flex-col">
      {/* Toast Notification */}
      {notificationMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-brand"></span>
          <span>{notificationMsg}</span>
        </div>
      )}

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
      }`}>
        {/* View Router */}
        <main className="flex-1 w-full min-w-0 bg-[#f8fafc]">
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
              assets={assets}
              isSidebarOpen={isSidebarOpen}
              onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
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

          {currentView === 'setting' && (
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

          {currentView === 'crm' && (
            <CRMView
              leads={leads}
              onConvertSuccess={handleConvertLeadSuccess}
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

          {currentView === 'clients' && (
            <CRMView
              leads={leads}
              onConvertSuccess={handleConvertLeadSuccess}
              isSidebarOpen={isSidebarOpen}
              onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            />
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

      {/* Global In-App Toast Notifications */}
      <GlobalToastNotification />
    </div>
  );
}

export default App;
