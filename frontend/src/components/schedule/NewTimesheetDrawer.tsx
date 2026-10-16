import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Calendar, Clock, Search, ChevronDown, 
  UploadCloud, X, Check, FileText 
} from 'lucide-react';
import { Project } from '../../types';
import { 
  getStoredTimesheets,
  saveTimesheet, 
  calculateDurationString, 
  formatDisplayDate,
  TimesheetEntry 
} from '../../lib/timesheetService';
import { getStaffMembers, StaffMember } from '../../lib/staffService';

interface NewTimesheetDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (entry: TimesheetEntry) => void;
  projects?: Project[];
  onShowToast?: (msg: string) => void;
  editEntry?: TimesheetEntry | null;
}

const COMMON_PARTIES = [
  'Site Supervisor - 1 - Sunil Kumar',
  'Site Supervisor - 2 - Ramesh Babu',
  'Senior Architect - Nivedhitha Arumugam',
  'Project Engineer - K. Balaji',
  'Geotechnical Engineer - Dr. V. Murugesan',
  'QC / Testing Specialist - S. Karthik',
  'Accounts Lead - R. Meenakshi'
];

const COMMON_TASKS = [
  'Quotation',
  'Site Topographical & Soil Inspection',
  'Boundary & DGPS Demarcation',
  'Structural Foundation Vetting',
  'Architectural Drawings & 3D Render Review',
  'Civil Construction & Earthwork Execution',
  'Concrete Cube & Rebar Tensile Test',
  'Project Schedule Coordination',
  'Billing, Invoicing & Sign-off Dossier',
  'Daily Progress Report & Site Log'
];

export const NewTimesheetDrawer: React.FC<NewTimesheetDrawerProps> = ({
  isOpen,
  onClose,
  onSaved,
  projects = [],
  onShowToast,
  editEntry
}) => {
  const [date, setDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const [partyName, setPartyName] = useState<string>('');
  const [partyDropdownOpen, setPartyDropdownOpen] = useState(false);
  const [partySearchQuery, setPartySearchQuery] = useState('');

  const [startTime, setStartTime] = useState<string>('');
  const [stopTime, setStopTime] = useState<string>('');
  const [duration, setDuration] = useState<string>('');

  const [projectName, setProjectName] = useState<string>('');
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');

  const [taskName, setTaskName] = useState<string>('');
  const [taskDropdownOpen, setTaskDropdownOpen] = useState(false);

  const [remarks, setRemarks] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; size?: string; url?: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const partyRef = useRef<HTMLDivElement>(null);
  const projectRef = useRef<HTMLDivElement>(null);
  const taskRef = useRef<HTMLDivElement>(null);

  // Populate state when editEntry changes
  useEffect(() => {
    if (editEntry && isOpen) {
      setDate(editEntry.date || new Date().toISOString().split('T')[0]);
      setPartyName(editEntry.party_name || '');
      setStartTime(editEntry.start_time || '');
      setStopTime(editEntry.end_time || '');
      setDuration(editEntry.duration || '');
      setProjectName(editEntry.project_name || '');
      setTaskName(editEntry.task_name || '');
      setRemarks(editEntry.remarks || '');
      setUploadedFiles(editEntry.files || []);
    } else if (!editEntry && isOpen) {
      // Clean empty state for new entry
      setDate(new Date().toISOString().split('T')[0]);
      setPartyName('');
      setStartTime('');
      setStopTime('');
      setDuration('');
      setProjectName(projects[0]?.name || '');
      setTaskName('');
      setRemarks('');
      setUploadedFiles([]);
    }
  }, [editEntry, isOpen, projects]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (partyRef.current && !partyRef.current.contains(e.target as Node)) {
        setPartyDropdownOpen(false);
      }
      if (projectRef.current && !projectRef.current.contains(e.target as Node)) {
        setProjectDropdownOpen(false);
      }
      if (taskRef.current && !taskRef.current.contains(e.target as Node)) {
        setTaskDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Recalculate duration automatically when start or stop times change
  useEffect(() => {
    const computed = calculateDurationString(startTime, stopTime);
    if (computed) {
      setDuration(computed);
    }
  }, [startTime, stopTime]);

  // Registered staff combined with defaults
  const availableParties = (() => {
    const fromStaff = getStaffMembers().map((s: StaffMember) => s.designation ? `${s.designation} - ${s.name}` : s.name);
    const combined = [...fromStaff];
    COMMON_PARTIES.forEach((p: string) => {
      if (!combined.includes(p)) combined.push(p);
    });
    return combined;
  })();

  const filteredParties = availableParties.filter(p => 
    p.toLowerCase().includes(partySearchQuery.toLowerCase())
  );

  const availableProjectOptions = (() => {
    const list: string[] = [];
    projects.forEach(p => {
      if (p.name && !list.includes(p.name)) list.push(p.name);
    });
    return list;
  })();

  const filteredProjects = availableProjectOptions.filter(p => 
    p.toLowerCase().includes(projectSearchQuery.toLowerCase())
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      selectedFiles.forEach(file => {
        const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            setUploadedFiles(prev => [...prev, { name: file.name, size: sizeStr, url: dataUrl }]);
          };
          reader.readAsDataURL(file);
        } else {
          setUploadedFiles(prev => [...prev, { name: file.name, size: sizeStr }]);
        }
      });
      onShowToast?.(`Attached ${selectedFiles.length} file(s)`);
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!partyName.trim()) {
      onShowToast?.('Please enter or select a Party Name.');
      return;
    }
    if (!projectName.trim()) {
      onShowToast?.('Please enter or select a Project Name.');
      return;
    }

    if (editEntry) {
      const updatedEntry: TimesheetEntry = {
        ...editEntry,
        date,
        display_date: formatDisplayDate(date),
        party_name: partyName.trim(),
        start_time: startTime.trim() || '09:00 AM',
        end_time: stopTime.trim() || '05:00 PM',
        duration: duration.trim() || '1 Hr',
        project_name: projectName.trim(),
        task_name: taskName.trim() || '--',
        remarks: remarks.trim(),
        files: uploadedFiles
      };
      const allUpdated = getStoredTimesheets().map((t: TimesheetEntry) => t.id === editEntry.id ? updatedEntry : t);
      localStorage.setItem('booshnam_team_timesheets_v1', JSON.stringify(allUpdated));
      window.dispatchEvent(new CustomEvent('booshnam_timesheets_updated', { detail: allUpdated }));
      onSaved(updatedEntry);
      onShowToast?.('Timesheet entry updated successfully!');
    } else {
      const savedEntry = saveTimesheet({
        date,
        display_date: formatDisplayDate(date),
        party_name: partyName.trim(),
        start_time: startTime.trim() || '09:00 AM',
        end_time: stopTime.trim() || '05:00 PM',
        duration: duration.trim() || '1 Hr',
        project_name: projectName.trim(),
        task_name: taskName.trim() || '--',
        remarks: remarks.trim(),
        files: uploadedFiles
      });
      onSaved(savedEntry);
      onShowToast?.('Timesheet entry saved successfully!');
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] overflow-hidden flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
      />

      {/* Slide-over Drawer (Image 3 design in Red & White Theme) */}
      <div className="relative w-full max-w-[500px] bg-white h-full shadow-2xl z-10 flex flex-col justify-between border-l border-slate-200 rounded-l-3xl rounded-l-drawer overflow-hidden animate-in slide-in-from-right duration-300">
        
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 -ml-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Close"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </button>
            <h2 className="text-base font-bold text-slate-900 tracking-wider uppercase">
              NEW TIMESHEET
            </h2>
          </div>

          <button
            onClick={handleSave}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-semibold rounded-lg shadow-sm transition-all hover:shadow cursor-pointer"
          >
            Save
          </button>
        </div>

        {/* Drawer Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Top Right Date Display / Selector */}
          <div className="flex justify-end">
            <div className="relative inline-flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-1.5 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <Calendar className="w-4 h-4 text-slate-500" />
              <input 
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-xs font-semibold text-slate-800 bg-transparent outline-none cursor-pointer"
              />
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* PARTY NAME * */}
          <div ref={partyRef} className="relative">
            <div 
              onClick={() => setPartyDropdownOpen(!partyDropdownOpen)}
              className="relative border border-slate-300 hover:border-slate-400 focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 rounded-xl px-4 pt-3 pb-2.5 bg-white transition-all cursor-pointer"
            >
              <label className="absolute -top-2.5 left-3 bg-white px-1.5 text-[11px] font-bold text-slate-500 tracking-wide uppercase pointer-events-none">
                PARTY NAME <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={partyName}
                  onChange={(e) => {
                    setPartyName(e.target.value);
                    setPartySearchQuery(e.target.value);
                    setPartyDropdownOpen(true);
                  }}
                  placeholder="Select or enter party name"
                  className="w-full text-sm text-slate-800 font-medium bg-transparent outline-none pr-2"
                />
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            </div>

            {/* Dropdown suggestions */}
            {partyDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95">
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Suggested Staff / Supervisors
                </div>
                {filteredParties.map((party) => (
                  <button
                    key={party}
                    type="button"
                    onClick={() => {
                      setPartyName(party);
                      setPartyDropdownOpen(false);
                    }}
                    className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer ${
                      partyName === party ? 'bg-red-50/70 text-red-700 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <span>{party}</span>
                    {partyName === party && <Check className="w-3.5 h-3.5 text-red-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* START & STOP TIME (Side by Side matching Image 3) */}
          <div className="grid grid-cols-2 gap-4">
            {/* START */}
            <div className="relative border border-slate-300 hover:border-slate-400 focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 rounded-xl px-4 pt-3 pb-2.5 bg-white transition-all">
              <label className="absolute -top-2.5 left-3 bg-white px-1.5 text-[11px] font-bold text-slate-500 tracking-wide uppercase pointer-events-none">
                START
              </label>
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="04:00 PM"
                  className="w-full text-sm text-slate-800 font-medium bg-transparent outline-none pr-2"
                />
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            </div>

            {/* STOP */}
            <div className="relative border border-slate-300 hover:border-slate-400 focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 rounded-xl px-4 pt-3 pb-2.5 bg-white transition-all">
              <label className="absolute -top-2.5 left-3 bg-white px-1.5 text-[11px] font-bold text-slate-500 tracking-wide uppercase pointer-events-none">
                STOP
              </label>
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={stopTime}
                  onChange={(e) => setStopTime(e.target.value)}
                  placeholder="04:25 PM"
                  className="w-full text-sm text-slate-800 font-medium bg-transparent outline-none pr-2"
                />
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            </div>
          </div>

          {/* DURATION */}
          <div className="relative border border-slate-300 hover:border-slate-400 focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 rounded-xl px-4 pt-3 pb-2.5 bg-white transition-all">
            <label className="absolute -top-2.5 left-3 bg-white px-1.5 text-[11px] font-bold text-slate-500 tracking-wide uppercase pointer-events-none">
              DURATION
            </label>
            <input
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 25 Min, 3 Hr 40 Min"
              className="w-full text-sm text-slate-800 font-medium bg-transparent outline-none"
            />
          </div>

          {/* PROJECT NAME * */}
          <div ref={projectRef} className="relative">
            <div 
              onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
              className="relative border border-slate-300 hover:border-slate-400 focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 rounded-xl px-4 pt-3 pb-2.5 bg-white transition-all cursor-pointer"
            >
              <label className="absolute -top-2.5 left-3 bg-white px-1.5 text-[11px] font-bold text-slate-500 tracking-wide uppercase pointer-events-none">
                PROJECT NAME <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => {
                    setProjectName(e.target.value);
                    setProjectSearchQuery(e.target.value);
                    setProjectDropdownOpen(true);
                  }}
                  placeholder="Select or enter project"
                  className="w-full text-sm text-slate-800 font-medium bg-transparent outline-none pr-2"
                />
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            </div>

            {/* Dropdown suggestions */}
            {projectDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95">
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Available Projects
                </div>
                {filteredProjects.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setProjectName(p);
                      setProjectDropdownOpen(false);
                    }}
                    className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer ${
                      projectName === p ? 'bg-red-50/70 text-red-700 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <span>{p}</span>
                    {projectName === p && <Check className="w-3.5 h-3.5 text-red-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* TASK NAME */}
          <div ref={taskRef} className="relative">
            <div 
              onClick={() => setTaskDropdownOpen(!taskDropdownOpen)}
              className="relative border border-slate-300 hover:border-slate-400 focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 rounded-xl px-4 pt-3 pb-2.5 bg-white transition-all cursor-pointer"
            >
              <label className="absolute -top-2.5 left-3 bg-white px-1.5 text-[11px] font-bold text-slate-500 tracking-wide uppercase pointer-events-none">
                TASK NAME
              </label>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${taskName ? 'font-medium text-slate-800' : 'text-slate-400'}`}>
                  {taskName || 'Add Task'}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            </div>

            {/* Dropdown options */}
            {taskDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95">
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Select Associated Task
                </div>
                {COMMON_TASKS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTaskName(t);
                      setTaskDropdownOpen(false);
                    }}
                    className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer ${
                      taskName === t ? 'bg-red-50/70 text-red-700 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <span>{t}</span>
                    {taskName === t && <Check className="w-3.5 h-3.5 text-red-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* REMARKS */}
          <div className="relative border border-slate-300 hover:border-slate-400 focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 rounded-xl px-4 pt-3 pb-2 bg-white transition-all">
            <label className="absolute -top-2.5 left-3 bg-white px-1.5 text-[11px] font-bold text-slate-500 tracking-wide uppercase pointer-events-none">
              REMARKS
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter site log, progress notes or deliverables..."
              className="w-full text-sm text-slate-800 bg-transparent outline-none resize-none pt-1"
            />
          </div>

          {/* Upload Files (Interactive matching Image 3) */}
          <div>
            <input 
              type="file" 
              ref={fileInputRef} 
              multiple 
              onChange={handleFileUpload} 
              className="hidden" 
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 border-2 border-dashed border-slate-200 hover:border-red-300 hover:bg-red-50/30 rounded-xl flex items-center justify-center gap-2.5 text-slate-600 hover:text-red-600 transition-all cursor-pointer font-medium text-sm group"
            >
              <span>Upload Files</span>
              <UploadCloud className="w-5 h-5 text-slate-400 group-hover:text-red-600 transition-colors" />
            </button>

            {/* Uploaded files preview */}
            {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {uploadedFiles.map((file, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span className="truncate">{file.name}</span>
                      {file.size && <span className="text-[10px] text-slate-400">({file.size})</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="p-1 hover:bg-slate-200 text-slate-400 hover:text-red-600 rounded transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Drawer Bottom Bar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>All timesheet logs are geofenced & synchronized.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};
