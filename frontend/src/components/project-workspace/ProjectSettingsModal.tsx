import React, { useState, useEffect } from 'react';
import { X, ChevronDown, Check, Plus, Trash2, Layers, Info, Edit2, Users, Phone, Mail, FileText, Landmark, AlertTriangle } from 'lucide-react';
import { Project, ProjectTeamMember } from '../../types';
import { AddPartyView } from './AddPartyView';
import { CustomSelect } from '../CustomSelect';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onDeleteProject?: (project: Project) => void;
  isSuperAdmin?: boolean;
  onShowToast?: (msg: string) => void;
}

type SettingsTab = 'details' | 'members' | 'locations';

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateProject,
  onDeleteProject,
  isSuperAdmin = false,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('details');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form State - Always initialized completely empty/blank as requested
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [stage, setStage] = useState('');
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [address, setAddress] = useState('');
  const [companyBranch, setCompanyBranch] = useState('');
  const [attendanceRadius, setAttendanceRadius] = useState<string>('');
  const [projectValue, setProjectValue] = useState<string>('');
  const [orientation, setOrientation] = useState('');
  const [dimension, setDimension] = useState('');
  const [scopeOfWork, setScopeOfWork] = useState('');

  // Date input focus helpers for clean placeholder display
  const [startDateType, setStartDateType] = useState('text');
  const [endDateType, setEndDateType] = useState('text');

  // Members Tab State
  const [teamMembers, setTeamMembers] = useState<ProjectTeamMember[]>([]);
  const [isAddingParty, setIsAddingParty] = useState(false);
  const [editingParty, setEditingParty] = useState<ProjectTeamMember | null>(null);
  const [editingPartyIndex, setEditingPartyIndex] = useState<number | null>(null);

  // Location Structure State
  const [locations, setLocations] = useState<string[]>([
    'Block A - Foundation',
    'Block A - Floor 1',
    'Block A - Floor 2',
    'Block B - Substructure',
    'Outer Perimeter & Yard'
  ]);
  const [newLocationName, setNewLocationName] = useState('');

  // When modal opens, keep all fields empty/blank so the user can enter new updates cleanly
  useEffect(() => {
    if (isOpen) {
      setCode('');
      setName('');
      setStage('');
      setCategory('');
      setStartDate('');
      setEndDate('');
      setAddress('');
      setCompanyBranch('');
      setAttendanceRadius('');
      setProjectValue('');
      setOrientation('');
      setDimension('');
      setScopeOfWork('');
      setStartDateType('text');
      setEndDateType('text');
      setTeamMembers(project?.assigned_team || []);
      setIsAddingParty(false);
      setEditingParty(null);
      setEditingPartyIndex(null);
    }
  }, [isOpen, project]);

  if (!isOpen) return null;

  // When in Members tab and user wants to add or edit a party/member, display the full AddPartyView matching screenshots
  if (activeTab === 'members' && (isAddingParty || editingParty !== null)) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
        <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
          <AddPartyView
            initialData={editingParty}
            onSave={(member) => {
              if (editingPartyIndex !== null) {
                const updated = [...teamMembers];
                updated[editingPartyIndex] = member;
                setTeamMembers(updated);
                onShowToast?.(`Updated details for ${member.name}`);
              } else {
                setTeamMembers([...teamMembers, member]);
                onShowToast?.(`Added ${member.name} (${member.role}) to project team`);
              }
              setIsAddingParty(false);
              setEditingParty(null);
              setEditingPartyIndex(null);
            }}
            onCancel={() => {
              setIsAddingParty(false);
              setEditingParty(null);
              setEditingPartyIndex(null);
            }}
            onShowToast={onShowToast}
          />
        </div>
      </div>
    );
  }

  // Determine avatar initials: default to 'LR' (matching reference) or user-typed name initials
  const initials = name.trim() ? name.trim().slice(0, 2).toUpperCase() : (project.initials || 'LR');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Project = {
      ...project,
      code: code.trim() || project.code,
      name: name.trim() || project.name,
      stage: stage || project.stage,
      category: category || project.category,
      start_date: startDate || project.start_date,
      expected_end_date: endDate || project.expected_end_date,
      address: address.trim() || project.address,
      location: address.trim() || project.location,
      company_branch: companyBranch || project.company_branch,
      geofence_radius_meters: attendanceRadius.trim() !== '' ? Number(attendanceRadius) : project.geofence_radius_meters,
      estimated_budget: projectValue.trim() !== '' ? Number(projectValue) : project.estimated_budget,
      project_orientation: orientation.trim() || project.project_orientation,
      project_dimension: dimension.trim() || project.project_dimension,
      scope_of_work: scopeOfWork.trim() || project.scope_of_work,
      description: scopeOfWork.trim() || project.description,
      assigned_team: teamMembers.length > 0 ? teamMembers : project.assigned_team
    };

    onUpdateProject(updated);
    onShowToast?.('Project settings updated successfully!');
    onClose();
  };

  const handleRemoveMember = (idx: number) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== idx));
  };

  const handleAddLocation = () => {
    if (!newLocationName.trim()) return;
    setLocations([...locations, newLocationName.trim()]);
    setNewLocationName('');
  };

  const handleRemoveLocation = (idx: number) => {
    setLocations(locations.filter((_, i) => i !== idx));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-5xl w-full p-7 sm:p-9 md:p-10 shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header matching Screenshot: "Project Setting" + Close Icon */}
        <div className="flex items-center justify-between pb-3 shrink-0">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Project Setting</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5 stroke-[1.75]" />
          </button>
        </div>

        {/* Tab Navigation: Project Details | Members | Location Structure */}
        <div className="flex items-center gap-8 border-b border-slate-200/80 mb-7 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer ${
              activeTab === 'details'
                ? 'text-red-600 border-b-2 border-red-600 -mb-px'
                : 'text-slate-500 hover:text-red-600'
            }`}
          >
            Project Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer ${
              activeTab === 'members'
                ? 'text-red-600 border-b-2 border-red-600 -mb-px'
                : 'text-slate-500 hover:text-red-600'
            }`}
          >
            Members
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('locations')}
            className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer ${
              activeTab === 'locations'
                ? 'text-red-600 border-b-2 border-red-600 -mb-px'
                : 'text-slate-500 hover:text-red-600'
            }`}
          >
            Location Structure
          </button>
        </div>

        {/* Modal Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto pr-2 pb-2">
          
          {/* TAB 1: Project Details (Spacious & perfectly aligned) */}
          {activeTab === 'details' && (
            <form id="project-settings-form" onSubmit={handleSubmit} className="pt-2">
              <div className="flex flex-col sm:flex-row gap-6 md:gap-7 items-start">
                
                {/* Left Side: Avatar Badge */}
                <div className="shrink-0 pt-1">
                  <div className="w-22 h-22 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center relative overflow-hidden shadow-md shadow-red-500/20 select-none">
                    {/* Decorative bubble / circle patterns */}
                    <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-white/20" />
                    <div className="absolute bottom-1 -left-3 w-12 h-12 rounded-full bg-white/20" />
                    <div className="absolute -bottom-4 right-1 w-14 h-14 rounded-full bg-white/15" />
                    <div className="absolute top-2 -right-4 w-10 h-10 rounded-full bg-white/10" />
                    <span className="text-2xl sm:text-3xl font-black text-white tracking-wider z-10">
                      {initials}
                    </span>
                  </div>
                </div>

                {/* Right Side: Fields Grid with Generous Spacing & Floating Labels */}
                <div className="flex-1 w-full space-y-5.5 sm:space-y-6">
                  
                  {/* Row 1: PROJECT CODE & PROJECT NAME */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                    {/* PROJECT CODE */}
                    <div className="relative border border-slate-200/90 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-all shadow-2xs">
                      <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider pointer-events-none z-10">
                        PROJECT CODE
                      </label>
                      <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Project Code"
                        className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none font-normal"
                      />
                    </div>

                    {/* PROJECT NAME */}
                    <div className="relative border border-slate-200/90 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-all shadow-2xs">
                      <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider pointer-events-none z-10">
                        PROJECT NAME
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Project Name"
                        className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none font-normal truncate"
                      />
                    </div>
                  </div>

                  {/* Row 2: PROJECT STAGE & PROJECT CATEGORY */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                    
                    {/* PROJECT STAGE with Non-blocking Hover Tooltip */}
                    <div className="relative border border-slate-200/90 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-all shadow-2xs">
                      <div className="absolute -top-2.5 left-3.5 bg-white px-1.5 flex items-center gap-1 z-10">
                        <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider pointer-events-none">
                          PROJECT STAGE
                        </span>
                        {/* Hoverable Info Icon for Tooltip without blocking inputs */}
                        <div className="relative group/tooltip inline-flex items-center">
                          <Info className="w-3 h-3 text-slate-400 hover:text-red-600 cursor-help transition-colors" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:flex flex-col items-center z-40 pointer-events-none transition-all">
                            <div className="bg-[#595E68] text-white text-[10.5px] font-normal leading-snug px-3 py-1.5 rounded-lg shadow-xl max-w-[240px] text-center whitespace-normal">
                              Indicates the current phase of execution (e.g., Planning, Drawing, Execution, Handover etc)
                            </div>
                            <div className="w-2 h-2 bg-[#595E68] rotate-45 -mt-1" />
                          </div>
                        </div>
                      </div>

                      <div className="relative">
                        <CustomSelect
                          value={stage}
                          onChange={(val) => setStage(val)}
                          options={[
                            'Planning',
                            'Drawing',
                            'Substructure & Earthwork',
                            'Foundation & Framing',
                            'Execution',
                            'Finishing & MEP',
                            'Handover',
                            'Closeout'
                          ]}
                          placeholder="Select Project Stage"
                          size="md"
                          variant="brand"
                          triggerClassName="border-0 shadow-none px-0 py-0 text-sm font-normal"
                        />
                      </div>
                    </div>

                    {/* PROJECT CATEGORY */}
                    <div className="relative border border-slate-200/90 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-all shadow-2xs">
                      <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider pointer-events-none z-10">
                        PROJECT CATEGORY
                      </label>
                      <div className="relative">
                        <CustomSelect
                          value={category}
                          onChange={(val) => setCategory(val)}
                          options={[
                            'Residential',
                            'Commercial',
                            'Infrastructure',
                            'Industrial',
                            'Institutional'
                          ]}
                          placeholder="Select Category"
                          size="md"
                          variant="brand"
                          triggerClassName="border-0 shadow-none px-0 py-0 text-sm font-normal"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Start Date & End Date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                    {/* Start Date */}
                    <div className="relative border border-slate-200/90 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-all shadow-2xs">
                      <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10.5px] font-semibold text-slate-500 capitalize tracking-wide pointer-events-none z-10">
                        Start Date
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={startDate ? 'date' : startDateType}
                          onFocus={() => setStartDateType('date')}
                          onBlur={() => { if (!startDate) setStartDateType('text'); }}
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          placeholder="Start Date"
                          className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none font-normal pr-7 cursor-pointer"
                        />
                        <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-0" />
                      </div>
                    </div>

                    {/* End Date */}
                    <div className="relative border border-slate-200/90 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-all shadow-2xs">
                      <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10.5px] font-semibold text-slate-500 capitalize tracking-wide pointer-events-none z-10">
                        End Date
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={endDate ? 'date' : endDateType}
                          onFocus={() => setEndDateType('date')}
                          onBlur={() => { if (!endDate) setEndDateType('text'); }}
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          placeholder="End Date"
                          className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none font-normal pr-7 cursor-pointer"
                        />
                        <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-0" />
                      </div>
                    </div>
                  </div>

                  {/* Row 4: PROJECT ADDRESS (Full Width) */}
                  <div className="relative border border-slate-200/90 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-all shadow-2xs">
                    <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider pointer-events-none z-10">
                      PROJECT ADDRESS
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Address"
                      className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none font-normal"
                    />
                  </div>

                  {/* Row 5: COMPANY BRANCH (Full Width Dropdown) */}
                  <div className="relative border border-slate-200/90 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-all shadow-2xs">
                    <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider pointer-events-none z-10">
                      COMPANY BRANCH
                    </label>
                    <div className="relative">
                      <CustomSelect
                        value={companyBranch}
                        onChange={(val) => setCompanyBranch(val)}
                        options={[
                          'Head Office - Anna Nagar, Chennai',
                          'Regional Office - RS Puram, Coimbatore',
                          'Branch Office - KK Nagar, Madurai',
                          'Tech Center - Indiranagar, Bengaluru'
                        ]}
                        placeholder="Select Company Address"
                        size="md"
                        variant="brand"
                        triggerClassName="border-0 shadow-none px-0 py-0 text-sm font-normal"
                      />
                    </div>
                  </div>

                  {/* Row 6: ATTENDANCE RADIUS & PROJECT VALUE */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                    {/* ATTENDANCE RADIUS */}
                    <div className="relative border border-slate-200/90 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-all shadow-2xs">
                      <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider pointer-events-none z-10">
                        ATTENDANCE RADIUS
                      </label>
                      <input
                        type="number"
                        value={attendanceRadius}
                        onChange={(e) => setAttendanceRadius(e.target.value)}
                        placeholder="0"
                        className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none font-normal"
                      />
                    </div>

                    {/* PROJECT VALUE */}
                    <div className="relative border border-slate-200/90 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-all shadow-2xs">
                      <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider pointer-events-none z-10">
                        PROJECT VALUE
                      </label>
                      <input
                        type="number"
                        value={projectValue}
                        onChange={(e) => setProjectValue(e.target.value)}
                        placeholder="0"
                        className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none font-normal"
                      />
                    </div>
                  </div>

                  {/* Row 7: PROJECT ORIENTATION & PROJECT DIMENSION */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                    {/* PROJECT ORIENTATION */}
                    <div className="relative border border-slate-200/90 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-all shadow-2xs">
                      <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider pointer-events-none z-10">
                        PROJECT ORIENTATION
                      </label>
                      <input
                        type="text"
                        value={orientation}
                        onChange={(e) => setOrientation(e.target.value)}
                        placeholder="Project Orientation"
                        className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none font-normal"
                      />
                    </div>

                    {/* PROJECT DIMENSION */}
                    <div className="relative border border-slate-200/90 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-all shadow-2xs">
                      <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider pointer-events-none z-10">
                        PROJECT DIMENSION
                      </label>
                      <input
                        type="text"
                        value={dimension}
                        onChange={(e) => setDimension(e.target.value)}
                        placeholder="Project Dimension"
                        className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none font-normal"
                      />
                    </div>
                  </div>

                  {/* Row 8: SCOPE OF WORK (Full Width Textarea) */}
                  <div className="relative border border-slate-200/90 rounded-xl px-4 py-3 bg-white focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 transition-all shadow-2xs">
                    <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider pointer-events-none z-10">
                      SCOPE OF WORK
                    </label>
                    <textarea
                      rows={3}
                      value={scopeOfWork}
                      onChange={(e) => setScopeOfWork(e.target.value)}
                      placeholder="Scope of Work"
                      className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none font-normal resize-none leading-relaxed"
                    />
                  </div>

                </div>
              </div>
            </form>
          )}

          {/* TAB 2: Members Tab */}
          {activeTab === 'members' && (
            <div className="space-y-5 pt-2">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Project Members & Parties</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Manage personnel, site supervisors, contractors, and statutory details</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingParty(null);
                    setEditingPartyIndex(null);
                    setIsAddingParty(true);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Party / Member</span>
                </button>
              </div>

              {/* Members List */}
              {teamMembers.length === 0 ? (
                <div className="py-14 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                  <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-3.5 shadow-xs">
                    <Users className="w-7 h-7 stroke-[1.75]" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No Members Added Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">
                    Click below to add project team members with complete statutory, banking, and contact details.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingParty(null);
                      setEditingPartyIndex(null);
                      setIsAddingParty(true);
                    }}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Party</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {teamMembers.map((member, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-white border border-slate-200/90 rounded-2xl flex flex-col justify-between hover:border-red-300 hover:shadow-xs transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                            {member.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                              {member.name}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                                {member.role}
                              </span>
                              {member.party_id && (
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                  ID: {member.party_id}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingParty(member);
                              setEditingPartyIndex(idx);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Contact & Statutory Badges */}
                      <div className="mt-3 pt-3 border-t border-slate-100/80 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        {member.phone && (
                          <span className="flex items-center gap-1 truncate">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            {member.phone}
                          </span>
                        )}
                        {member.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            {member.email}
                          </span>
                        )}
                        {member.aadhaar_number && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Aadhaar: •••• {member.aadhaar_number.slice(-4)}
                          </span>
                        )}
                        {member.pan_number && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            PAN: {member.pan_number}
                          </span>
                        )}
                        {member.bank_account && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                            <Landmark className="w-3 h-3 text-slate-400 shrink-0" />
                            •••• {member.bank_account.slice(-4)}
                          </span>
                        )}
                        {member.opening_balance !== undefined && member.opening_balance > 0 && (
                          <span className="text-[10px] font-semibold text-emerald-600">
                            Bal: ₹{Number(member.opening_balance).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Location Structure Tab */}
          {activeTab === 'locations' && (
            <div className="space-y-5 pt-2">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Project Physical Locations & Zones</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Define building blocks, levels, and operational zones for task assignment</p>
                </div>
                <span className="text-xs font-semibold px-3 py-1 bg-red-50 text-red-700 rounded-lg">
                  {locations.length} Zones Defined
                </span>
              </div>

              {/* Add Location Form */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
                <input
                  type="text"
                  placeholder="e.g. Block C - 3rd Floor Slab"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-red-600"
                />
                <button
                  type="button"
                  onClick={handleAddLocation}
                  className="py-2.5 px-5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Location</span>
                </button>
              </div>

              {/* Locations Grid / List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {locations.map((loc, idx) => (
                  <div key={idx} className="p-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-2xs hover:border-red-200 transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-800 truncate">{loc}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveLocation(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer transition"
                      title="Delete location"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3.5 pt-5 border-t border-slate-100 mt-5 shrink-0">
          <div>
            {isSuperAdmin && onDeleteProject && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2.5 text-xs font-bold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Delete Project (Super Admin Only)"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Project</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => {
                if (activeTab === 'details') {
                  const form = document.getElementById('project-settings-form') as HTMLFormElement;
                  if (form) form.requestSubmit();
                } else {
                  handleSubmit(e as any);
                }
              }}
              className="px-6 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>

      </div>

      {/* Delete Confirmation Modal - Super Admin Only */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-red-100 p-6 overflow-hidden space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-xs">
                <Trash2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base">Delete Project</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                    Super Admin Only
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to permanently delete <strong className="text-slate-800">{project?.name || 'this project'}</strong>?
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
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onClose();
                  if (project && project.id) {
                    onDeleteProject?.(project);
                  }
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-98 rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete Project</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
