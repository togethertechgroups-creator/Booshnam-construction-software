import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  X, Users, UserPlus, Search, Check, Trash2, Phone, Mail, 
  Briefcase, HardHat, Plus, Calendar, ChevronDown, CheckCircle2,
  Shield, UserCheck, AlertCircle
} from 'lucide-react';
import { Project, ProjectTeamMember } from '../../types';
import { getStaffMembers, StaffMember, getStaffCategory } from '../../lib/staffService';
import { addNotification } from '../../lib/notificationService';
import { UserAccount } from '../../lib/authService';
import { formatProjectTitle } from '../../lib/mockData';

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onUpdateProject: (updated: Project) => void;
  onShowToast?: (msg: string) => void;
  currentUser?: UserAccount | null;
}

const COMMON_PROJECT_ROLES = [
  'Site Engineer',
  'Site Supervisor',
  'Project Manager',
  'Project Lead',
  'Safety Officer',
  'Quality Surveyor',
  'Billing Engineer',
  'Accounts & Finance',
  'Foreman',
  'Project Coordinator'
];

export const AddStaffModal: React.FC<AddStaffModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateProject,
  onShowToast,
  currentUser
}) => {
  // Dynamic staff directory from workforce
  const [staffList, setStaffList] = useState<StaffMember[]>(() => getStaffMembers());

  useEffect(() => {
    const handleStaffUpdate = () => setStaffList(getStaffMembers());
    window.addEventListener('booshnam_staff_updated', handleStaffUpdate);
    return () => window.removeEventListener('booshnam_staff_updated', handleStaffUpdate);
  }, []);

  // Form State
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [customRole, setCustomRole] = useState<string>('');
  const [assignmentDate, setAssignmentDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );

  // Custom Stylish Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'SITE' | 'OFFICE'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Search filter for currently assigned staff list
  const [assignedSearchQuery, setAssignedSearchQuery] = useState('');

  // Close dropdown on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDropdownOpen) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  // Selected staff object
  const selectedStaff = useMemo(() => {
    return staffList.find(s => s.id === selectedStaffId) || null;
  }, [staffList, selectedStaffId]);

  // When staff is selected, prefill their role
  useEffect(() => {
    if (selectedStaff) {
      setCustomRole(selectedStaff.designation || selectedStaff.role_name || 'Site Engineer');
    }
  }, [selectedStaff]);

  // Reset form when modal opens/closes or project changes
  useEffect(() => {
    if (isOpen) {
      setSelectedStaffId('');
      setCustomRole('');
      setStaffSearchQuery('');
      setAssignedSearchQuery('');
      setIsDropdownOpen(false);
      setAssignmentDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, project?.id]);

  const currentTeam: ProjectTeamMember[] = useMemo(() => {
    return (project && Array.isArray(project.assigned_team)) 
      ? project.assigned_team 
      : [];
  }, [project?.assigned_team]);

  const isStaffAssigned = (staffName: string) => {
    const clean = (staffName || '').toLowerCase().trim();
    return currentTeam.some(m => {
      const mName = (m.name || '').toLowerCase().trim();
      return mName === clean || mName.includes(clean) || clean.includes(mName);
    });
  };

  const getAssignedRole = (staffName: string) => {
    const clean = (staffName || '').toLowerCase().trim();
    const found = currentTeam.find(m => {
      const mName = (m.name || '').toLowerCase().trim();
      return mName === clean || mName.includes(clean) || clean.includes(mName);
    });
    return found?.role;
  };

  // Filtered staff list for the stylish dropdown
  const activeStaff = useMemo(() => {
    return staffList.filter(s => s.status !== 'INACTIVE');
  }, [staffList]);

  const filteredStaffList = useMemo(() => {
    return activeStaff.filter(staff => {
      if (categoryFilter !== 'ALL') {
        const cat = getStaffCategory(staff);
        if (cat !== categoryFilter) return false;
      }
      if (staffSearchQuery.trim()) {
        const q = staffSearchQuery.toLowerCase().trim();
        const matchName = staff.name.toLowerCase().includes(q);
        const matchRole = (staff.designation || staff.role_name || '').toLowerCase().includes(q);
        const matchDept = (staff.department || '').toLowerCase().includes(q);
        const matchPhone = (staff.phone || '').includes(q);
        return matchName || matchRole || matchDept || matchPhone;
      }
      return true;
    });
  }, [activeStaff, categoryFilter, staffSearchQuery]);

  // Filtered currently assigned staff list
  const filteredCurrentTeam = useMemo(() => {
    if (!assignedSearchQuery.trim()) return currentTeam;
    const q = assignedSearchQuery.toLowerCase().trim();
    return currentTeam.filter(m => 
      (m.name || '').toLowerCase().includes(q) ||
      (m.role || '').toLowerCase().includes(q) ||
      (m.phone || '').includes(q)
    );
  }, [currentTeam, assignedSearchQuery]);

  if (!isOpen || !project) return null;

  // Handle Assign Staff
  const handleAssignStaff = () => {
    if (!selectedStaff) return;
    const cleanName = selectedStaff.name.trim();
    const finalRole = (customRole || selectedStaff.designation || selectedStaff.role_name || 'Project Staff').trim();

    const existingIndex = currentTeam.findIndex(m => {
      const mName = (m.name || '').toLowerCase().trim();
      return mName === cleanName.toLowerCase();
    });

    let updatedTeam: ProjectTeamMember[];
    if (existingIndex >= 0) {
      // Update their role in the project
      updatedTeam = [...currentTeam];
      updatedTeam[existingIndex] = {
        ...updatedTeam[existingIndex],
        role: finalRole,
        assignment_date: assignmentDate || updatedTeam[existingIndex].assignment_date,
        phone: selectedStaff.phone ? `+91 ${selectedStaff.phone}` : updatedTeam[existingIndex].phone,
        email: selectedStaff.email || updatedTeam[existingIndex].email
      };
      onShowToast?.(`Updated role for ${cleanName} to "${finalRole}"`);
    } else {
      // Add new member
      const newMember: ProjectTeamMember = {
        id: selectedStaff.id || `team-${Date.now()}`,
        name: cleanName,
        role: finalRole,
        phone: selectedStaff.phone ? `+91 ${selectedStaff.phone}` : undefined,
        email: selectedStaff.email || undefined,
        assignment_date: assignmentDate || new Date().toISOString().split('T')[0]
      };
      updatedTeam = [...currentTeam, newMember];
      onShowToast?.(`Assigned ${cleanName} as ${finalRole} to project`);

      // In-app notification
      addNotification({
        title: 'Assigned to Project',
        message: `You have been added to project "${project.name}" as ${finalRole}.`,
        type: 'PROJECT_ASSIGNED',
        recipient: cleanName,
        sender: currentUser?.staff_name || currentUser?.username || 'Admin',
        projectName: project.name,
        projectId: project.id,
      });
    }

    const updatedProject: Project = {
      ...project,
      assigned_team: updatedTeam
    };

    onUpdateProject(updatedProject);
    setSelectedStaffId('');
    setCustomRole('');
    setStaffSearchQuery('');
  };

  // Remove staff handler
  const handleRemoveStaff = (memberIndex: number) => {
    const member = currentTeam[memberIndex];
    const updatedTeam = currentTeam.filter((_, idx) => idx !== memberIndex);
    const updatedProject: Project = {
      ...project,
      assigned_team: updatedTeam
    };
    onUpdateProject(updatedProject);
    onShowToast?.(`Removed ${member.name} from project team`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* ── MODAL HEADER ── */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold shrink-0 shadow-2xs border border-red-100">
              <UserPlus className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">
                  Add Staff to Project
                </h3>
                {project.code && (
                  <span className="text-[11px] font-bold text-red-700 bg-red-50 border border-red-200/80 px-2 py-0.5 rounded-md">
                    {project.code}
                  </span>
                )}
                {project.department && (
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md capitalize">
                    {String(project.department_name || project.department).replace(/_/g, ' ')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                {formatProjectTitle(project)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── MODAL BODY (NO TABS, CLEAN & DYNAMIC) ── */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* ASSIGN FORM CARD */}
          <div className="bg-gradient-to-b from-slate-50/90 to-slate-50/40 border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <UserCheck className="w-4 h-4 text-red-600" />
                <span>Select & Assign Staff Member</span>
              </div>
              {selectedStaff && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  <span>Ready to Assign</span>
                </span>
              )}
            </div>

            {/* STYLISH CUSTOM SEARCHABLE DROPDOWN */}
            <div className="space-y-1.5" ref={dropdownRef}>
              <label className="block text-xs font-semibold text-slate-700">
                Staff Member *
              </label>

              <div className="relative">
                {/* Dropdown Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(prev => !prev)}
                  className={`w-full min-h-[46px] px-3.5 py-2 rounded-xl border text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer shadow-2xs ${
                    isDropdownOpen 
                      ? 'border-red-500 ring-2 ring-red-500/15 bg-white' 
                      : selectedStaff 
                        ? 'border-slate-300 bg-white hover:border-slate-400' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {selectedStaff ? (
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                        {selectedStaff.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {selectedStaff.name}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                          {selectedStaff.designation || selectedStaff.role_name}
                        </span>
                        {selectedStaff.department && (
                          <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                            • {selectedStaff.department}
                          </span>
                        )}
                        {isStaffAssigned(selectedStaff.name) && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded ml-auto">
                            Already in Project
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 text-slate-400 text-xs">
                      <Search className="w-4 h-4 text-slate-400" />
                      <span>Choose a staff member from directory...</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 shrink-0">
                    {selectedStaff && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStaffId('');
                          setCustomRole('');
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                        title="Clear selection"
                      >
                        <X className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-red-600' : ''}`} />
                  </div>
                </button>

                {/* Stylish Floating Popover Menu */}
                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    
                    {/* Popover Header with Search Box & Category Filters */}
                    <div className="p-3 border-b border-slate-100 bg-slate-50/70 space-y-2.5">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          ref={searchInputRef}
                          type="text"
                          placeholder="Search staff by name, role, department..."
                          value={staffSearchQuery}
                          onChange={(e) => setStaffSearchQuery(e.target.value)}
                          className="w-full h-9 pl-9 pr-8 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        />
                        {staffSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setStaffSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Quick Category Filter Pills */}
                      <div className="flex items-center gap-1">
                        {(['ALL', 'SITE', 'OFFICE'] as const).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setCategoryFilter(cat)}
                            className={`px-2.5 py-1 text-[10.5px] font-bold rounded-lg transition-all cursor-pointer ${
                              categoryFilter === cat
                                ? 'bg-red-600 text-white shadow-2xs'
                                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {cat === 'ALL' ? 'All Staff' : cat === 'SITE' ? 'Site Staff' : 'Office Staff'}
                          </button>
                        ))}
                        <span className="ml-auto text-[10.5px] text-slate-400 font-medium">
                          {filteredStaffList.length} found
                        </span>
                      </div>
                    </div>

                    {/* Staff List Options */}
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                      {filteredStaffList.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">
                          No active staff members match "{staffSearchQuery}".
                        </div>
                      ) : (
                        filteredStaffList.map((staff, idx) => {
                          const assigned = isStaffAssigned(staff.name);
                          const isCurrent = staff.id === selectedStaffId;
                          const category = getStaffCategory(staff);

                          return (
                            <div
                              key={`${staff.id || 'staff'}-${idx}`}
                              onClick={() => {
                                setSelectedStaffId(staff.id);
                                setIsDropdownOpen(false);
                                setStaffSearchQuery('');
                              }}
                              className={`p-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 cursor-pointer select-none ${
                                isCurrent ? 'bg-red-50/40' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                  category === 'SITE'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200/80'
                                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200/80'
                                }`}>
                                  {category === 'SITE' ? <HardHat className="w-3.5 h-3.5" /> : <Briefcase className="w-3.5 h-3.5" />}
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-bold text-slate-900 truncate">
                                      {staff.name}
                                    </span>
                                    {staff.department && (
                                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-medium">
                                        {staff.department}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                    <span>{staff.designation || staff.role_name || 'Staff'}</span>
                                    {staff.phone && (
                                      <>
                                        <span className="text-slate-300">•</span>
                                        <span>{staff.phone}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-2">
                                {assigned && (
                                  <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <Check className="w-3 h-3 stroke-[2.5]" />
                                    <span>Assigned</span>
                                  </span>
                                )}
                                {isCurrent && (
                                  <span className="w-2 h-2 rounded-full bg-red-600"></span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* DYNAMIC SELECTED STAFF PREVIEW BANNER */}
            {selectedStaff && (
              <div className="bg-white border border-slate-200/90 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs animate-in fade-in duration-150">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {selectedStaff.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {selectedStaff.name}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {selectedStaff.designation || selectedStaff.role_name}
                      {selectedStaff.phone && ` • +91 ${selectedStaff.phone}`}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10.5px] font-semibold text-slate-400 block">
                    {getStaffCategory(selectedStaff) === 'SITE' ? 'Field Staff' : 'Office Staff'}
                  </span>
                </div>
              </div>
            )}

            {/* TWO COLUMNS: PROJECT ROLE & ASSIGNMENT DATE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {/* Project Role Input */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Project Role / Designation *
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. Site Engineer, Supervisor"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    className="w-full h-11 pl-9 pr-3.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* Assignment Date */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Assignment Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    value={assignmentDate}
                    onChange={(e) => setAssignmentDate(e.target.value)}
                    className="w-full h-11 pl-9 pr-3.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* COMMON ROLE SUGGESTIONS */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] text-slate-500 font-semibold block">
                Quick Role Suggestions:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_PROJECT_ROLES.map((r) => {
                  const isSelected = customRole.toLowerCase().trim() === r.toLowerCase();
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setCustomRole(r)}
                      className={`text-[10.5px] px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-red-50 text-red-700 border-red-300 font-bold shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ASSIGN ACTION BUTTON */}
            <div className="pt-2">
              <button
                type="button"
                disabled={!selectedStaffId}
                onClick={handleAssignStaff}
                className="w-full py-3 bg-red-600 hover:bg-red-700 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>
                  {isStaffAssigned(selectedStaff?.name || '') 
                    ? 'Update Staff Assignment on Project' 
                    : 'Assign Staff Member to Project'}
                </span>
              </button>
            </div>
          </div>

          {/* ── CURRENTLY ASSIGNED STAFF SECTION ── */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <span>Currently Assigned Staff</span>
                <span className="text-[11px] font-bold bg-red-100 text-red-700 px-2 py-0.2 rounded-full">
                  {currentTeam.length}
                </span>
              </h4>

              {/* Quick Search in assigned members if multiple */}
              {currentTeam.length > 2 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter assigned..."
                    value={assignedSearchQuery}
                    onChange={(e) => setAssignedSearchQuery(e.target.value)}
                    className="h-7 pl-7 pr-2.5 rounded-lg border border-slate-200 bg-white text-[11px] font-medium text-slate-700 focus:border-red-500 w-36"
                  />
                </div>
              )}
            </div>

            {/* Cards Grid with clean vertical scrolling & bottom padding */}
            {currentTeam.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 text-slate-400 space-y-2">
                <Users className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-medium text-slate-600">
                  No staff members currently assigned to this project.
                </p>
                <p className="text-[11px] text-slate-400">
                  Choose a staff member from the dropdown above and click "Assign Staff Member".
                </p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto pr-1 pb-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredCurrentTeam.map((member, idx) => (
                    <div
                      key={`${member.id || 'mem'}-${idx}`}
                      className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-red-300 hover:shadow-xs transition-all flex items-start justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                          {member.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs font-bold text-slate-900 truncate">
                            {member.name}
                          </h5>
                          <span className="inline-block text-[11px] font-semibold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-md mt-1">
                            {member.role || 'Project Staff'}
                          </span>
                          
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap text-[10.5px] text-slate-400">
                            {member.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{member.phone}</span>
                              </div>
                            )}
                            {member.assignment_date && (
                              <div className="flex items-center gap-1 text-slate-400">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <span>{member.assignment_date}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveStaff(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Remove member from project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ── MODAL FOOTER ── */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="text-xs text-slate-500 font-medium">
            Assigned Staff: <strong className="text-slate-800">{currentTeam.length}</strong> member{currentTeam.length === 1 ? '' : 's'}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
