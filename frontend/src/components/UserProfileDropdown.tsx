import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Bell, User as UserIcon, Settings, UserX, LogOut, X, Pencil, ChevronDown,
  CheckCircle2, FileText, Briefcase, Check, Sparkles, Eye, ArrowRight, CreditCard,
  AlertTriangle, Clock, UserCheck
} from 'lucide-react';
import { User } from '../types';
import { MOCK_USER } from '../lib/mockData';
import { logoutUser, getCurrentUserAccount, saveUserAccount, setCurrentUserAccount, getUserAccounts, UserAccount } from '../lib/authService';
import { getStaffMembers, saveStaffMember } from '../lib/staffService';
import { confirmSignOut } from '../lib/dialogService';
import { 
  getNotifications, markAllNotificationsRead, markNotificationRead, AppNotification 
} from '../lib/notificationService';
import { ALL_SYSTEM_MODULES, isPageAllowedForRole } from '../lib/roleAccess';
import { isPageAllowedForActiveUser } from '../lib/authService';

interface UserProfileDropdownProps {
  showBell?: boolean;
  user?: User;
  onShowToast?: (msg: string) => void;
  avatarSizeClass?: string;
  avatarBgClass?: string;
}

export const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({
  showBell = true,
  user: initialUser,
  onShowToast,
  avatarSizeClass = 'w-8 h-8',
  avatarBgClass = 'bg-red-600 hover:bg-red-700 text-white ring-2 ring-red-100 focus:ring-red-400',
}) => {
  const resolveActiveUser = (): User => {
    try {
      const active = getCurrentUserAccount();
      const stored = typeof window !== 'undefined' ? localStorage.getItem('siteops_user') : null;
      const parsedStored = stored ? JSON.parse(stored) : null;
      const cachedAvatar = typeof window !== 'undefined' ? localStorage.getItem('siteops_user_avatar') || '' : '';
      const resolvedAvatar = (active as any)?.avatar_url || parsedStored?.avatar_url || cachedAvatar || '';

      if (active) {
        const isSuper = active.role_code === 'SUPER_ADMIN' || active.username === 'superadmin' || active.id === 'usr-super';
        const roleCode = isSuper ? 'SUPER_ADMIN' : active.role_code;
        const roleName = isSuper ? 'Super Admin' : active.role_name;
        const staffName = isSuper ? (active.staff_name && active.staff_name !== 'Teki' ? active.staff_name : 'Super Administrator') : (active.staff_name || active.username || 'Staff');
        const parts = staffName.split(' ');
        const rawDigits = (active.phone || '').replace(/\D/g, '');
        const phoneFormatted = rawDigits.length >= 10 
          ? `+91 ${rawDigits.slice(-10, -5)} ${rawDigits.slice(-5)}` 
          : (active.phone || '+91 94440 06047');

        return {
          id: active.id,
          first_name: parts[0] || 'Staff',
          last_name: parts.slice(1).join(' ') || '',
          username: active.username,
          email: `${active.username.toLowerCase()}@booshnam.com`,
          role_name: roleName,
          role_code: roleCode,
          phone: phoneFormatted,
          avatar_url: resolvedAvatar,
          is_org_admin: isSuper || active.role_code === 'ADMIN',
          is_site_worker: !isSuper && (active.role_code === 'SITE_ENGINEER' || active.role_code === 'SUPERVISOR'),
          active_role: {
            id: roleCode,
            name: roleName,
            code: roleCode,
            description: roleName
          }
        };
      }
      if (parsedStored) {
        const isSuper = parsedStored.role_code === 'SUPER_ADMIN' || parsedStored.username === 'superadmin' || parsedStored.id === 'usr-super';
        return {
          ...parsedStored,
          role_code: isSuper ? 'SUPER_ADMIN' : parsedStored.role_code,
          role_name: isSuper ? 'Super Admin' : parsedStored.role_name,
          first_name: isSuper && (parsedStored.first_name === 'Teki' || !parsedStored.first_name) ? 'Super' : parsedStored.first_name,
          last_name: isSuper && (parsedStored.first_name === 'Teki' || !parsedStored.last_name) ? 'Admin' : parsedStored.last_name,
          avatar_url: resolvedAvatar,
        };
      }
    } catch (e) {
      console.warn('Failed to parse active user from localStorage', e);
    }
    return initialUser || MOCK_USER;
  };

  const [currentUser, setCurrentUser] = useState<User>(resolveActiveUser);

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const list = getNotifications(currentUser.first_name || currentUser.username, currentUser.role_code, currentUser.role_name);
    return list.filter(n => !n.read);
  });

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isAccessBlocked, setIsAccessBlocked] = useState(false);
  const [selectedProofPreview, setSelectedProofPreview] = useState<string | null>(null);

  const [editName, setEditName] = useState(currentUser.first_name || 'Staff');
  const [editPhone, setEditPhone] = useState(currentUser.phone || '9444006047');
  const [editDesignation, setEditDesignation] = useState(currentUser.role_name || 'Site Engineer');
  const [editAvatar, setEditAvatar] = useState<string>(currentUser.avatar_url || '');

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerToast = (msg: string) => {
    if (onShowToast) {
      onShowToast(msg);
    } else {
      window.dispatchEvent(new CustomEvent('siteops_toast', { detail: msg }));
    }
  };

  const handleNotificationClick = (n: AppNotification) => {
    // 1. Mark notification as read in storage
    markNotificationRead(n.id);
    // 2. Remove immediately from visible dropdown list
    setNotifications(prev => prev.filter(item => item.id !== n.id));

    // 3. Dismiss dropdown immediately
    setShowNotificationDropdown(false);

    const roleCode = currentUser.role_code || 'SITE_ENGINEER';

    // PAYMENT REQUEST notification
    if (
      n.type === 'PAYMENT_REQUEST' ||
      n.requestCode ||
      (n.title && n.title.toLowerCase().includes('payment request'))
    ) {
      const targetView = 'finance';

      if (n.requestCode) {
        try {
          (window as any).__booshnam_pending_req_code = n.requestCode;
          sessionStorage.setItem('booshnam_pending_req_code', n.requestCode);
        } catch {}
      }

      window.dispatchEvent(new CustomEvent('booshnam_navigate', {
        detail: {
          view: targetView,
          financeTab: 'payment_requests',
          requestCode: n.requestCode,
          projectName: n.projectName,
          projectId: n.projectId,
        }
      }));

      window.dispatchEvent(new CustomEvent('booshnam_open_finance_tab', {
        detail: {
          tab: 'payment_requests',
          requestCode: n.requestCode,
          projectName: n.projectName
        }
      }));

      triggerToast('Opening Payment Requests...');
      return;
    }

    // PROJECT_ASSIGNED or general project notification
    if (
      n.type === 'PROJECT_ASSIGNED' ||
      (n.title && n.title.toLowerCase().includes('assigned to project'))
    ) {
      if (n.projectId) {
        try {
          sessionStorage.setItem('booshnam_auto_open_project_id', n.projectId);
          sessionStorage.setItem('booshnam_auto_open_workspace_tab', 'task');
        } catch {}
      }
      window.dispatchEvent(new CustomEvent('booshnam_navigate', {
        detail: {
          view: 'projects',
          projectId: n.projectId,
          projectName: n.projectName,
          workspaceTab: 'task'
        }
      }));
      triggerToast(`Opening project: ${n.projectName || 'Projects'}`);
      return;
    }

    // TASK_ASSIGNED or TASK_COMPLETED
    if (n.type === 'TASK_ASSIGNED' || n.type === 'TASK_COMPLETED') {
      if (n.projectId) {
        try {
          sessionStorage.setItem('booshnam_auto_open_project_id', n.projectId);
          sessionStorage.setItem('booshnam_auto_open_workspace_tab', 'task');
        } catch {}
      }
      window.dispatchEvent(new CustomEvent('booshnam_navigate', {
        detail: {
          view: 'projects',
          projectId: n.projectId,
          projectName: n.projectName,
          taskName: n.taskName,
          workspaceTab: 'task'
        }
      }));
      triggerToast(`Opening task on ${n.projectName || 'Project'}`);
      return;
    }

    // MATERIAL REQUEST
    if (n.type === 'MATERIAL_REQUEST') {
      const allowedProc = isPageAllowedForActiveUser('procurement');
      const targetView = allowedProc ? 'procurement' : 'projects';
      window.dispatchEvent(new CustomEvent('booshnam_navigate', {
        detail: {
          view: targetView,
          projectId: n.projectId,
          projectName: n.projectName
        }
      }));
      triggerToast(allowedProc ? 'Opening Procurement...' : 'Opening Projects...');
      return;
    }

    // Schedule / Timesheet / Reminders
    if (
      n.title?.includes("Pending Tasks") ||
      n.id?.startsWith('notif-pending-tasks-') ||
      n.title?.includes("Today's Tasks") ||
      n.id?.startsWith('notif-today-tasks-')
    ) {
      if (n.projectId || n.projectName) {
        if (n.projectId) {
          try {
            sessionStorage.setItem('booshnam_auto_open_project_id', n.projectId);
            sessionStorage.setItem('booshnam_auto_open_workspace_tab', 'task');
          } catch {}
        }
        window.dispatchEvent(new CustomEvent('booshnam_navigate', {
          detail: {
            view: 'projects',
            projectId: n.projectId,
            projectName: n.projectName,
            taskName: n.taskName,
            workspaceTab: 'task'
          }
        }));
        triggerToast(`Opening tasks for ${n.projectName || 'Project'}...`);
        return;
      }

      const allowedSched = isPageAllowedForActiveUser('schedule');
      const targetView = allowedSched ? 'schedule' : 'projects';
      window.dispatchEvent(new CustomEvent('booshnam_navigate', {
        detail: {
          view: targetView,
          projectId: n.projectId,
          projectName: n.projectName
        }
      }));
      triggerToast('Opening Schedule & Tasks...');
      return;
    }

    // LEAD_ASSIGNED notification
    if (
      n.type === 'LEAD_ASSIGNED' ||
      (n.title && n.title.toLowerCase().includes('lead assigned'))
    ) {
      const leadIdToOpen = (n as any).leadId || n.requestCode;
      if (leadIdToOpen) {
        try {
          sessionStorage.setItem('booshnam_auto_open_lead_id', leadIdToOpen);
        } catch {}
      }
      window.dispatchEvent(new CustomEvent('booshnam_navigate', {
        detail: {
          view: 'quotation',
          quotationTab: 'leads',
          leadId: leadIdToOpen,
          leadName: n.projectName
        }
      }));
      window.dispatchEvent(new CustomEvent('booshnam_open_lead_tab', {
        detail: {
          leadId: leadIdToOpen,
          leadName: n.projectName
        }
      }));
      triggerToast(`Opening Lead: ${n.projectName || 'Lead'}...`);
      return;
    }

    // Fallback if project is mentioned
    if (n.projectId || n.projectName) {
      if (n.projectId) {
        try {
          sessionStorage.setItem('booshnam_auto_open_project_id', n.projectId);
          sessionStorage.setItem('booshnam_auto_open_workspace_tab', 'task');
        } catch {}
      }
      window.dispatchEvent(new CustomEvent('booshnam_navigate', {
        detail: {
          view: 'projects',
          projectId: n.projectId,
          projectName: n.projectName,
          workspaceTab: 'task'
        }
      }));
      triggerToast(`Opening ${n.projectName || 'Projects'}`);
      return;
    }

    triggerToast('Notification marked as read');
  };

  useEffect(() => {
    if (initialUser) {
      setCurrentUser(prev => ({ ...prev, ...initialUser }));
    }
  }, [initialUser]);

  // Synchronize on user update, session switch, or notifications change
  useEffect(() => {
    const handleSync = () => {
      const u = resolveActiveUser();
      setCurrentUser(u);
      setEditName(u.first_name || 'Staff');
      setEditPhone(u.phone || '9444006047');
      setEditDesignation(u.role_name || 'Site Engineer');
      setEditAvatar(u.avatar_url || '');
      const fetched = getNotifications(u.first_name || u.username, u.role_code, u.role_name);
      setNotifications(fetched.filter(n => !n.read));
    };

    window.addEventListener('siteops_user_updated', handleSync);
    window.addEventListener('booshnam_session_changed', handleSync);
    window.addEventListener('siteops_notifications_updated', handleSync);
    window.addEventListener('booshnam_wbs_tasks_updated', handleSync);
    window.addEventListener('booshnam_projects_updated', handleSync);

    return () => {
      window.removeEventListener('siteops_user_updated', handleSync);
      window.removeEventListener('booshnam_session_changed', handleSync);
      window.removeEventListener('siteops_notifications_updated', handleSync);
      window.removeEventListener('booshnam_wbs_tasks_updated', handleSync);
      window.removeEventListener('booshnam_projects_updated', handleSync);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowProfileDropdown(false);
        setShowNotificationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openProfileModal = () => {
    setShowProfileDropdown(false);
    setShowNotificationDropdown(false);
    setEditName(currentUser.first_name || 'Staff');
    const digitsOnly = (currentUser.phone || '').replace(/\D/g, '').slice(-10);
    setEditPhone(digitsOnly || '9444006047');
    setEditDesignation(currentUser.role_name || 'Owner / Director');
    const avatar = currentUser.avatar_url || localStorage.getItem('siteops_user_avatar') || '';
    setEditAvatar(avatar);
    setShowProfileModal(true);
    // Tell parent to close the hamburger / sidebar
    window.dispatchEvent(new CustomEvent('siteops_profile_modal_open'));
  };

  const closeProfileModal = () => {
    setShowProfileModal(false);
    // Tell parent to restore the hamburger / sidebar as usual
    window.dispatchEvent(new CustomEvent('siteops_profile_modal_close'));
  };

  const switchUserRole = (name: string, roleCode: string, roleName: string) => {
    const updated: User = {
      ...currentUser,
      first_name: name,
      username: name.toLowerCase(),
      role_code: roleCode,
      role_name: roleName,
    };
    try {
      localStorage.setItem('siteops_user', JSON.stringify(updated));
    } catch (e) {}
    setCurrentUser(updated);
    window.dispatchEvent(new CustomEvent('siteops_user_updated', { detail: updated }));
    setShowProfileDropdown(false);
    triggerToast(`Switched active view to ${name} (${roleName})`);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleSwitchToSuperAdmin = () => {
    const accounts = getUserAccounts();
    const superAcc = accounts.find(a => a.id === 'usr-super' || a.username === 'superadmin') || {
      id: 'usr-super',
      username: 'superadmin',
      password: 'password123',
      phone: '9840123456',
      staff_id: 'super-admin-master',
      staff_name: 'Super Administrator',
      staff_code: 'EMP-0001',
      role_code: 'SUPER_ADMIN',
      role_name: 'Super Admin',
      department: 'Executive Management',
      departments: ['Executive Management'],
      allowedPages: ALL_SYSTEM_MODULES.map(m => m.id),
      created_at: '2024-01-01'
    };
    superAcc.role_code = 'SUPER_ADMIN';
    superAcc.role_name = 'Super Admin';
    superAcc.staff_name = 'Super Administrator';
    superAcc.allowedPages = ALL_SYSTEM_MODULES.map(m => m.id);
    saveUserAccount(superAcc);
    setCurrentUserAccount(superAcc);
    const updatedUser: User = {
      id: superAcc.id,
      first_name: 'Super',
      last_name: 'Admin',
      username: 'superadmin',
      email: 'superadmin@booshnam.com',
      role_name: 'Super Admin',
      role_code: 'SUPER_ADMIN',
      phone: '+91 98401 23456',
      avatar_url: superAcc.avatar_url || '',
      is_org_admin: true,
      is_site_worker: false,
      active_role: {
        id: 'SUPER_ADMIN',
        name: 'Super Admin',
        code: 'SUPER_ADMIN',
        description: 'Super Admin'
      }
    };
    try {
      localStorage.setItem('siteops_user', JSON.stringify(updatedUser));
    } catch (e) {}
    setCurrentUser(updatedUser);
    window.dispatchEvent(new CustomEvent('siteops_user_updated', { detail: updatedUser }));
    window.dispatchEvent(new CustomEvent('booshnam_session_changed', { detail: superAcc }));
    setShowProfileDropdown(false);
    triggerToast('Switched to Super Administrator mode');
  };

  useEffect(() => {
    if (!showProfileModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeProfileModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showProfileModal]);

  // Handle image upload from file picker
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      triggerToast('Image size should be less than 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditAvatar(reader.result);
        triggerToast('Profile photo selected');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone10 = editPhone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone10 || cleanPhone10.length !== 10) {
      triggerToast('Please enter a valid 10-digit mobile number');
      return;
    }
    const formattedPhone = `+91 ${cleanPhone10.slice(0, 5)} ${cleanPhone10.slice(5)}`;
    const updated: User = {
      ...currentUser,
      first_name: editName,
      username: editName,
      phone: formattedPhone,
      role_name: editDesignation,
      avatar_url: editAvatar,
    };
    setCurrentUser(updated);
    try {
      localStorage.setItem('siteops_user', JSON.stringify(updated));
      if (editAvatar) {
        localStorage.setItem('siteops_user_avatar', editAvatar);
      }
      const activeAcc = getCurrentUserAccount();
      if (activeAcc) {
        const updatedAcc: UserAccount = {
          ...activeAcc,
          staff_name: editName,
          phone: cleanPhone10,
          role_name: editDesignation,
          avatar_url: editAvatar,
        };
        saveUserAccount(updatedAcc);
        setCurrentUserAccount(updatedAcc);
      }
      const allStaff = getStaffMembers();
      const matchedStaff = allStaff.find(s => 
        (activeAcc?.staff_id && s.id === activeAcc.staff_id) || 
        (s.phone && s.phone.replace(/\D/g, '').endsWith(cleanPhone10))
      );
      if (matchedStaff) {
        saveStaffMember({
          ...matchedStaff,
          name: editName,
          designation: editDesignation,
        });
      }
    } catch (err) {
      console.warn('Failed to save user to localStorage', err);
    }
    window.dispatchEvent(new CustomEvent('siteops_user_updated', { detail: updated }));
    closeProfileModal();
    triggerToast('Profile updated successfully');
  };

  const designationOptions = [
    'Super Admin',
    'Admin',
    'Owner / Director',
    'Project Manager',
    'Site Engineer',
    'Finance Manager',
    'Procurement Manager',
    'Labour Supervisor',
    'QA / Safety Officer',
  ];

  return (
    <div className="flex items-center gap-2 sm:gap-2.5 relative" ref={containerRef}>
      {/* Notifications Bell */}
      {showBell && (
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowNotificationDropdown(prev => !prev);
              setShowProfileDropdown(false);
            }}
            className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-[5px] relative transition-colors cursor-pointer"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && !showNotificationDropdown && (
              <span className="absolute top-1 right-1 sm:top-1 sm:right-1 min-w-[15px] h-3.5 px-1 bg-red-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotificationDropdown && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 p-3.5 z-50 animate-in fade-in select-none max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      markAllNotificationsRead(
                        currentUser.first_name || currentUser.username, 
                        currentUser.role_code, 
                        currentUser.role_name,
                        notifications.map(n => n.id)
                      );
                      setNotifications([]);
                      triggerToast('All notifications marked as read');
                    }}
                    className="text-[10px] text-red-600 font-semibold cursor-pointer hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="py-2 space-y-2 text-xs overflow-y-auto max-h-[60vh]">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-90" />
                    <p className="text-xs font-semibold text-slate-700">No new notifications</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">You're all caught up!</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className="group p-2.5 rounded-[6px] border transition-all cursor-pointer relative hover:shadow-xs bg-red-50/50 border-red-200/90 hover:bg-red-50/90 hover:border-red-300"
                      title="Click to view details"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`w-7 h-7 rounded-[4px] flex items-center justify-center shrink-0 mt-0.5 transition-transform group-hover:scale-105 ${
                          n.type === 'TASK_COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                          n.type === 'PROJECT_ASSIGNED' ? 'bg-blue-100 text-blue-700' :
                          n.type === 'PAYMENT_REQUEST' ? 'bg-red-100 text-red-700' :
                          n.type === 'LEAD_ASSIGNED' ? 'bg-rose-100 text-rose-700' :
                          (n.title?.includes("Pending Tasks") || n.id?.startsWith('notif-pending-tasks-')) ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                          (n.title?.includes("Today's Tasks") || n.id?.startsWith('notif-today-tasks-')) ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {n.type === 'TASK_COMPLETED' ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                           n.type === 'PROJECT_ASSIGNED' ? <Briefcase className="w-3.5 h-3.5" /> :
                           n.type === 'PAYMENT_REQUEST' ? <CreditCard className="w-3.5 h-3.5" /> :
                           n.type === 'LEAD_ASSIGNED' ? <UserCheck className="w-3.5 h-3.5" /> :
                           (n.title?.includes("Pending Tasks") || n.id?.startsWith('notif-pending-tasks-')) ? <AlertTriangle className="w-3.5 h-3.5" /> :
                           (n.title?.includes("Today's Tasks") || n.id?.startsWith('notif-today-tasks-')) ? <Clock className="w-3.5 h-3.5" /> :
                           <FileText className="w-3.5 h-3.5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h5 className="font-bold text-[11px] text-slate-900 truncate group-hover:text-red-700 transition-colors flex items-center gap-1">
                              <span>{n.title}</span>
                              <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-red-600 shrink-0" />
                            </h5>
                            <span className="text-[9px] text-slate-400 shrink-0 font-medium">{n.timestamp}</span>
                          </div>
                          <p className="text-slate-600 text-[10px] mt-0.5 leading-snug">{n.message}</p>
                          
                          {/* Project & Task Assignment details pill */}
                          {(n.type === 'PROJECT_ASSIGNED' || n.type === 'TASK_ASSIGNED') && (n.projectName || n.taskName) && (
                            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                              {n.projectName && (
                                <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[9px] font-semibold truncate max-w-[200px]">
                                  📁 {n.projectName}
                                </span>
                              )}
                              {n.taskName && (
                                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[9px] font-medium truncate max-w-[150px]">
                                  📋 {n.taskName}
                                </span>
                              )}
                            </div>
                          )}


                          {/* Proof thumbnail if attached */}
                          {n.proofUrl && (
                            <div className="mt-2 flex items-center gap-2">
                              <img
                                src={n.proofUrl}
                                alt="Proof preview"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProofPreview(n.proofUrl || null);
                                }}
                                className="w-12 h-12 rounded-[3px] object-cover border border-slate-200 hover:scale-105 transition-transform cursor-pointer shadow-2xs"
                              />
                              <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Proof attached
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Profile Avatar Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowProfileDropdown(prev => !prev);
            setShowNotificationDropdown(false);
          }}
          title="User Profile"
          aria-label="User Profile"
          className={`${avatarSizeClass} rounded-full ${avatarBgClass} flex items-center justify-center font-bold text-xs shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer shrink-0 overflow-hidden`}
        >
          {currentUser.avatar_url ? (
            <img 
              src={currentUser.avatar_url} 
              alt={currentUser.first_name || 'Profile'} 
              className="w-full h-full object-cover rounded-full" 
            />
          ) : (
            <UserIcon className="w-4 h-4 fill-white text-white" />
          )}
        </button>

        {showProfileDropdown && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 p-3.5 z-50 select-none animate-in fade-in">
            <div className="flex items-center gap-3 p-1">
              <div className="w-11 h-11 rounded-full bg-red-600 flex items-center justify-center text-white shrink-0 shadow-sm overflow-hidden">
                {currentUser.avatar_url ? (
                  <img 
                    src={currentUser.avatar_url} 
                    alt={currentUser.first_name || 'Profile'} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <UserIcon className="w-5 h-5 fill-white text-white" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate leading-tight">
                  {currentUser.first_name || 'Priya'}
                </div>
                <div className="text-[11px] text-red-600 font-semibold truncate mt-0.5">
                  {currentUser.role_name || 'Owner / Director'}
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100 my-2.5"></div>

            {/* Removed User Switcher */}

            <div className="space-y-0.5">
              {currentUser.role_code !== 'SUPER_ADMIN' && (
                <button
                  type="button"
                  onClick={handleSwitchToSuperAdmin}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-xl transition-colors font-bold text-left cursor-pointer border border-amber-200/80 mb-1"
                >
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Switch to Super Admin</span>
                </button>
              )}

              <button
                type="button"
                onClick={openProfileModal}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors font-medium text-left cursor-pointer"
              >
                <Settings className="w-4 h-4 text-slate-500" />
                <span>Profile Settings</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const nextBlocked = !isAccessBlocked;
                  setIsAccessBlocked(nextBlocked);
                  setShowProfileDropdown(false);
                  triggerToast(nextBlocked ? 'User access blocked for this session' : 'User access restored');
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors font-medium text-left cursor-pointer"
              >
                <UserX className="w-4 h-4 text-slate-500" />
                <span>{isAccessBlocked ? 'Unblock Access' : 'Block Access'}</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  setShowProfileDropdown(false);
                  const confirmed = await confirmSignOut();
                  if (confirmed) {
                    triggerToast('Logged out successfully');
                    logoutUser();
                  }
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors font-medium text-left cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-slate-500" />
                <span>Log Out</span>
              </button>

              {/* Removed Log Out From All Devices button */}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================
          Profile Settings Modal — Red & White Theme with Image Upload
      ================================================================ */}
      {showProfileModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden w-screen h-screen bg-[#dc2626]">

          {/* Full-screen Red & White Backdrop exactly matching Screenshot */}
          <div className="absolute inset-0 bg-[#dc2626] overflow-hidden pointer-events-none">
            {/* Smooth curved white arc on the left */}
            <svg
              className="absolute left-0 top-0 h-full w-[46vw] min-w-[340px] max-w-[620px] pointer-events-none"
              viewBox="0 0 500 1000"
              preserveAspectRatio="none"
              fill="none"
            >
              <path
                d="M 0,0 L 230,0 C 470,250 470,750 230,1000 L 0,1000 Z"
                fill="#FFFFFF"
              />
            </svg>

            {/* Decorative diamond accents on the red background matching screenshot */}
            {/* Top right overlapping diamonds */}
            <div className="absolute top-6 right-12 opacity-80 pointer-events-none">
              <div className="relative w-16 h-12">
                <div className="absolute top-0 left-1 w-9 h-9 border-2 border-white/60 rotate-45 rounded-[3px]" />
                <div className="absolute top-3 left-6 w-9 h-9 border-2 border-white/60 rotate-45 rounded-[3px]" />
              </div>
            </div>

            {/* Mid right diamond */}
            <div className="absolute top-1/2 right-10 -translate-y-1/2 opacity-70 pointer-events-none">
              <div className="w-8 h-8 border-2 border-white/50 rotate-45 rounded-[3px]" />
            </div>

            {/* Bottom right diamonds */}
            <div className="absolute bottom-32 right-24 opacity-60 pointer-events-none">
              <div className="w-6 h-6 border-2 border-white/50 rotate-45 rounded-[3px]" />
            </div>
            <div className="absolute bottom-16 right-10 opacity-75 pointer-events-none">
              <div className="w-7 h-7 border-2 border-white/50 rotate-45 rounded-[3px]" />
            </div>
          </div>

          {/* Left-side Booshnam Associates Brand Logo inside the white curve */}
          <div className="absolute left-6 sm:left-10 md:left-14 lg:left-20 top-1/2 -translate-y-1/2 z-10 hidden sm:flex flex-col items-center max-w-[240px] md:max-w-[280px] pointer-events-none select-none text-center">
            <img
              src="/logo@2x.png"
              alt="Booshnam Associates"
              className="h-14 sm:h-16 md:h-20 w-auto object-contain drop-shadow-sm"
            />
            <div className="mt-4 px-3 py-1 bg-red-50 border border-red-200 rounded-full shadow-2xs">
              <span className="text-[10px] font-black text-red-700 tracking-wider uppercase">
                Booshnam Associates
              </span>
            </div>
            <p className="mt-2 text-[11px] font-medium text-slate-500 leading-snug">
              User Profile & Role Settings
            </p>
          </div>

          {/* Top-Right Cancel/Close Button */}
          <button
            type="button"
            onClick={closeProfileModal}
            className="absolute top-5 right-5 z-20 w-8 h-8 bg-white/20 hover:bg-white/30 active:scale-95 text-white rounded-md flex items-center justify-center transition-all cursor-pointer shadow-sm"
            title="Close and return"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          {/* Hidden File Input for Image Upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="hidden"
          />

          {/* Centered White Card with Balanced Right-Leaning Alignment */}
          <div className="relative z-10 w-full max-w-[350px] mx-4 sm:ml-auto sm:mr-[8vw] md:mr-[12vw] lg:mr-[18vw] animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">

              {/* Title & Red Underline */}
              <div className="px-6 pt-7 pb-2 text-center">
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  Edit Your Details
                </h2>
                <div className="mx-auto mt-2 w-9 h-[3px] rounded-full bg-[#dc2626]" />
              </div>

              {/* Avatar with Edit Pencil Badge (Clickable to Upload Photo) */}
              <div className="flex justify-center py-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative cursor-pointer group"
                  title="Click to upload profile photo"
                >
                  <div className="w-[74px] h-[74px] rounded-full bg-[#ea384c] flex items-end justify-center overflow-hidden shadow-lg border-2 border-white ring-2 ring-red-100/70 group-hover:ring-red-300 transition-all">
                    {editAvatar ? (
                      <img 
                        src={editAvatar} 
                        alt="Profile preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg viewBox="0 0 72 72" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="36" cy="24" r="13" fill="white" fillOpacity="0.95" />
                        <path d="M4 72 Q4 50 36 50 Q68 50 68 72 Z" fill="white" fillOpacity="0.95" />
                      </svg>
                    )}
                  </div>

                  {/* Edit Pencil Badge */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="absolute bottom-0 right-0 w-6 h-6 bg-white border border-slate-200 rounded-md flex items-center justify-center shadow-md hover:bg-red-50 hover:border-red-300 active:scale-90 transition-all cursor-pointer"
                    title="Upload profile photo"
                  >
                    <Pencil className="w-3 h-3 text-slate-700" />
                  </button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveProfile}>
                <div className="px-6 space-y-3.5">
                  {/* User Name */}
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      USER NAME <span className="text-red-500">*</span>
                    </label>
                    <div className="border border-slate-200 rounded-lg px-3.5 py-2.5 bg-white focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-400 transition-all">
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full text-xs text-slate-800 font-medium bg-transparent focus:outline-none placeholder:text-slate-300"
                        placeholder="Your name"
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        PHONE NUMBER (10 DIGITS)
                      </label>
                      <span className={`text-[9px] tracking-tight font-bold ${editPhone.length === 10 ? 'text-green-600' : 'text-amber-600'}`}>
                        {editPhone.length}/10
                      </span>
                    </div>
                    <div className="flex items-center border border-slate-200 rounded-lg bg-white focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-400 transition-all overflow-hidden">
                      <span className="px-3 py-2.5 bg-slate-50 border-r border-slate-200 text-xs font-bold text-slate-600 select-none">
                        +91
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]{10}"
                        maxLength={10}
                        required
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        onKeyDown={(e) => {
                          if (['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) return;
                          if (e.ctrlKey || e.metaKey) return;
                          if (!/^[0-9]$/.test(e.key)) e.preventDefault();
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(-10);
                          setEditPhone(paste);
                        }}
                        className="w-full px-3 py-2.5 text-xs text-slate-800 font-medium bg-transparent focus:outline-none placeholder:text-slate-300"
                        placeholder="9444006047"
                      />
                    </div>
                  </div>

                  {/* Designation */}
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      DESIGNATION
                    </label>
                    <div className="relative border border-slate-200 rounded-lg px-3.5 py-2.5 bg-white focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-400 transition-all">
                      <select
                        value={editDesignation}
                        onChange={(e) => setEditDesignation(e.target.value)}
                        className="w-full text-xs text-slate-700 font-medium bg-transparent focus:outline-none appearance-none cursor-pointer pr-6"
                      >
                        {designationOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Update Button */}
                <div className="px-6 pt-5 pb-7">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#dc2626] hover:bg-[#b9151b] active:scale-[0.98] text-white rounded-lg text-xs font-bold shadow-md shadow-red-200 transition-all cursor-pointer tracking-wide"
                  >
                    Update
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
