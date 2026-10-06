import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Bell, User as UserIcon, Settings, UserX, LogOut, X, Pencil, ChevronDown,
  CheckCircle2, FileText, Briefcase, Check, Sparkles, Eye, ArrowRight, CreditCard
} from 'lucide-react';
import { User } from '../types';
import { MOCK_USER } from '../lib/mockData';
import { logoutUser, getCurrentUserAccount, saveUserAccount, setCurrentUserAccount, UserAccount } from '../lib/authService';
import { getStaffMembers, saveStaffMember } from '../lib/staffService';
import { confirmSignOut } from '../lib/dialogService';
import { 
  getNotifications, markAllNotificationsRead, markNotificationRead, AppNotification 
} from '../lib/notificationService';

interface UserProfileDropdownProps {
  showBell?: boolean;
  user?: User;
  onShowToast?: (msg: string) => void;
  avatarSizeClass?: string;
}

export const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({
  showBell = true,
  user: initialUser,
  onShowToast,
  avatarSizeClass = 'w-8 h-8',
}) => {
  const resolveActiveUser = (): User => {
    try {
      const active = getCurrentUserAccount();
      const stored = typeof window !== 'undefined' ? localStorage.getItem('siteops_user') : null;
      const parsedStored = stored ? JSON.parse(stored) : null;
      const cachedAvatar = typeof window !== 'undefined' ? localStorage.getItem('siteops_user_avatar') || '' : '';
      const resolvedAvatar = (active as any)?.avatar_url || parsedStored?.avatar_url || cachedAvatar || '';

      if (active) {
        const parts = (active.staff_name || active.username || 'Staff').split(' ');
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
          role_name: active.role_name,
          role_code: active.role_code,
          phone: phoneFormatted,
          avatar_url: resolvedAvatar,
          is_org_admin: active.role_code === 'SUPER_ADMIN' || active.role_code === 'ADMIN',
          is_site_worker: active.role_code === 'SITE_ENGINEER' || active.role_code === 'SUPERVISOR',
          active_role: {
            id: active.role_code,
            name: active.role_name,
            code: active.role_code,
            description: active.role_name
          }
        };
      }
      if (parsedStored) {
        return {
          ...parsedStored,
          avatar_url: resolvedAvatar,
        };
      }
    } catch (e) {
      console.warn('Failed to parse active user from localStorage', e);
    }
    return initialUser || MOCK_USER;
  };

  const [currentUser, setCurrentUser] = useState<User>(resolveActiveUser);

  const [notifications, setNotifications] = useState<AppNotification[]>(() => 
    getNotifications(currentUser.first_name || currentUser.username, currentUser.role_code, currentUser.role_name)
  );

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
      setNotifications(fetched);
      if (!fetched.some(n => !n.read)) {
        setHasViewedInCurrentSession(true);
      }
    };

    window.addEventListener('siteops_user_updated', handleSync);
    window.addEventListener('booshnam_session_changed', handleSync);
    window.addEventListener('siteops_notifications_updated', handleSync);

    return () => {
      window.removeEventListener('siteops_user_updated', handleSync);
      window.removeEventListener('booshnam_session_changed', handleSync);
      window.removeEventListener('siteops_notifications_updated', handleSync);
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
    'Owner / Director',
    'Project Manager',
    'Site Engineer',
    'Finance Manager',
    'Procurement Manager',
    'Labour Supervisor',
    'QA / Safety Officer',
  ];

  const [hasViewedInCurrentSession, setHasViewedInCurrentSession] = useState(false);

  return (
    <div className="flex items-center gap-2 sm:gap-2.5 relative" ref={containerRef}>
      {/* Notifications Bell */}
      {showBell && (
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              const willOpen = !showNotificationDropdown;
              setShowNotificationDropdown(willOpen);
              setShowProfileDropdown(false);
              if (willOpen) {
                setHasViewedInCurrentSession(true);
                const currentIds = notifications.map(n => n.id);
                markAllNotificationsRead(
                  currentUser.first_name || currentUser.username, 
                  currentUser.role_code, 
                  currentUser.role_name,
                  currentIds
                );
                setNotifications(prev => prev.map(n => ({ ...n, read: true })));
              }
            }}
            className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-[5px] relative transition-colors cursor-pointer"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && !showNotificationDropdown && !hasViewedInCurrentSession && (
              <span className="absolute top-1 right-1 sm:top-1 sm:right-1 min-w-[15px] h-3.5 px-1 bg-red-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotificationDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-[5px] shadow-2xl border border-slate-200 p-3.5 z-50 animate-in fade-in select-none max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">Notifications</span>
                  {unreadCount > 0 && !hasViewedInCurrentSession && (
                    <span className="px-1.5 py-0.2 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setHasViewedInCurrentSession(true);
                    markAllNotificationsRead(
                      currentUser.first_name || currentUser.username, 
                      currentUser.role_code, 
                      currentUser.role_name,
                      notifications.map(n => n.id)
                    );
                    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                    triggerToast('All notifications marked as read');
                  }}
                  className="text-[10px] text-red-600 font-semibold cursor-pointer hover:underline"
                >
                  Mark all read
                </button>
              </div>

              <div className="py-2 space-y-2 text-xs overflow-y-auto max-h-[60vh]">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <Bell className="w-6 h-6 mx-auto mb-1 opacity-40" />
                    <p className="text-xs">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markNotificationRead(n.id);
                        setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
                      }}
                      className={`p-2.5 rounded-[5px] border transition-all cursor-pointer ${
                        !n.read 
                          ? 'bg-red-50/40 border-red-150 hover:bg-red-50/70' 
                          : 'bg-slate-50/60 border-slate-100 hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`w-7 h-7 rounded-[4px] flex items-center justify-center shrink-0 mt-0.5 ${
                          n.type === 'TASK_COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                          n.type === 'PROJECT_ASSIGNED' ? 'bg-blue-100 text-blue-700' :
                          n.type === 'PAYMENT_REQUEST' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {n.type === 'TASK_COMPLETED' ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                           n.type === 'PROJECT_ASSIGNED' ? <Briefcase className="w-3.5 h-3.5" /> :
                           n.type === 'PAYMENT_REQUEST' ? <CreditCard className="w-3.5 h-3.5" /> :
                           <FileText className="w-3.5 h-3.5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h5 className="font-bold text-[11px] text-slate-900 truncate">{n.title}</h5>
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

                          {/* Payment Request details pill */}
                          {n.type === 'PAYMENT_REQUEST' && (n.amount !== undefined || n.requestCode) && (
                            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                              {n.amount !== undefined && (
                                <span className="px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded text-[9px] font-bold">
                                  ₹{n.amount.toLocaleString('en-IN')}
                                </span>
                              )}
                              {n.requestCode && (
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[9px] tracking-tight font-semibold">
                                  {n.requestCode}
                                </span>
                              )}
                              {n.projectName && (
                                <span className="text-[9px] text-slate-400 font-medium truncate max-w-[150px]">
                                  {n.projectName}
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
          className={`${avatarSizeClass} rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center font-bold text-xs shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 cursor-pointer shrink-0 overflow-hidden`}
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
          <div className="absolute right-0 mt-2 w-68 bg-white rounded-[5px] shadow-2xl border border-slate-200 p-3.5 z-50 select-none animate-in fade-in">
            <div className="flex items-center gap-3 p-1">
              <div className="w-11 h-11 rounded-full bg-orange-500 flex items-center justify-center text-white shrink-0 shadow-sm overflow-hidden">
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
