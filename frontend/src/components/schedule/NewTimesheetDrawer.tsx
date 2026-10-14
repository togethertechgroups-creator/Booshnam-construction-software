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
  formatDisplayDateTime,
  TimesheetEntry 
} from '../../lib/timesheetService';
import { getStaffMembers, StaffMember } from '../../lib/staffService';
import { getCurrentUserAccount } from '../../lib/authService';

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

/**
 * Fetch the logged-in user's display name from their active account session,
 * matching to staff records or account profile.
 */
export function getLoggedInUserPartyName(): string {
  try {
    const active = getCurrentUserAccount();
    if (active) {
      const allStaff = getStaffMembers();
      const accountName = (active.staff_name || active.username || '').trim();
      const matched = allStaff.find(s => 
        (active.staff_id && s.id === active.staff_id) ||
        (accountName && s.name.trim().toLowerCase() === accountName.toLowerCase()) ||
        (active.username && s.name.trim().toLowerCase() === active.username.trim().toLowerCase())
      );
      if (matched) {
        return matched.designation ? `${matched.designation} - ${matched.name}` : matched.name;
      }
      if (accountName) return accountName;
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('siteops_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.name) return parsed.name;
      }
    }
  } catch (err) {
    console.error('Failed to get logged-in user party name', err);
  }
  return '';
}

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

interface TimePickerDropdownProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  isOpen: boolean;
  onClose: () => void;
  defaultPeriod?: 'AM' | 'PM';
  presets?: string[];
  align?: 'left' | 'right';
}

const HOURS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

function getCurrentFormattedTime(): string {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const hStr = String(hours).padStart(2, '0');
  const mStr = String(minutes).padStart(2, '0');
  return `${hStr}:${mStr} ${period}`;
}

function parseTimeString(val: string, defaultPeriod: 'AM' | 'PM' = 'AM'): { hour: string; minute: string; period: 'AM' | 'PM' } {
  if (!val) {
    return { hour: defaultPeriod === 'AM' ? '09' : '05', minute: '00', period: defaultPeriod };
  }
  const clean = val.trim().toUpperCase();
  const period: 'AM' | 'PM' = clean.includes('PM') ? 'PM' : clean.includes('AM') ? 'AM' : defaultPeriod;
  const timeOnly = clean.replace(/AM|PM/g, '').trim();
  const parts = timeOnly.split(':');
  let h = parts[0] ? String(parseInt(parts[0], 10)) : '09';
  if (isNaN(Number(h)) || Number(h) < 1 || Number(h) > 12) h = '09';
  h = h.padStart(2, '0');
  
  let m = parts[1] ? String(parseInt(parts[1], 10)) : '00';
  if (isNaN(Number(m)) || Number(m) < 0 || Number(m) > 59) m = '00';
  m = m.padStart(2, '0');

  return { hour: h, minute: m, period };
}

const TimePickerDropdown: React.FC<TimePickerDropdownProps> = ({
  label,
  value,
  onChange,
  isOpen,
  onClose,
  defaultPeriod = 'AM',
  presets = [],
  align = 'left'
}) => {
  if (!isOpen) return null;

  const { hour, minute, period } = parseTimeString(value, defaultPeriod);

  const handleSelectHour = (h: string) => {
    onChange(`${h}:${minute} ${period}`);
  };

  const handleSelectMinute = (m: string) => {
    onChange(`${hour}:${m} ${period}`);
  };

  const handleSelectPeriod = (p: 'AM' | 'PM') => {
    onChange(`${hour}:${minute} ${p}`);
  };

  const handleSetNow = () => {
    onChange(getCurrentFormattedTime());
  };

  const minuteList = (() => {
    if (minute && !MINUTES.includes(minute)) {
      return [...MINUTES, minute].sort((a, b) => parseInt(a) - parseInt(b));
    }
    return MINUTES;
  })();

  return (
    <div 
      onClick={(e) => e.stopPropagation()}
      className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-2 z-50 w-[260px] sm:w-[275px] bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150 select-none`}
    >
      {/* Dropdown Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-red-600" />
          <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleSetNow}
            className="text-[10px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded transition-colors cursor-pointer"
            title="Set to Current Time"
          >
            Now
          </button>
          <span className="text-[11px] font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
            {value || `${hour}:${minute} ${period}`}
          </span>
        </div>
      </div>

      {/* 3 Selectable Columns: Hour | Minute | AM/PM */}
      <div className="grid grid-cols-3 gap-1.5 text-center">
        
        {/* Hours Column */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Hour
          </div>
          <div className="h-40 overflow-y-auto space-y-1 pr-0.5">
            {HOURS.map((h) => {
              const isSelected = hour === h;
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => handleSelectHour(h)}
                  className={`w-full py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-red-600 text-white font-bold shadow-xs' 
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {h}
                </button>
              );
            })}
          </div>
        </div>

        {/* Minutes Column */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Minute
          </div>
          <div className="h-40 overflow-y-auto space-y-1 pr-0.5">
            {minuteList.map((m) => {
              const isSelected = minute === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleSelectMinute(m)}
                  className={`w-full py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-red-600 text-white font-bold shadow-xs' 
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        {/* AM/PM Period Column */}
        <div className="space-y-1 flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Period
          </div>
          <div className="space-y-2 py-1">
            <button
              type="button"
              onClick={() => handleSelectPeriod('AM')}
              className={`w-full py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                period === 'AM'
                  ? 'bg-red-600 text-white shadow-xs ring-2 ring-red-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => handleSelectPeriod('PM')}
              className={`w-full py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                period === 'PM'
                  ? 'bg-red-600 text-white shadow-xs ring-2 ring-red-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              PM
            </button>
          </div>

          {/* Done Confirmation button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full mt-2 py-1.5 bg-slate-900 hover:bg-black text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Done</span>
          </button>
        </div>

      </div>

      {/* Quick Presets Row */}
      {presets.length > 0 && (
        <div className="pt-2.5 mt-2.5 border-t border-slate-100">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 text-left">
            Quick Presets
          </div>
          <div className="flex flex-wrap gap-1">
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  onChange(preset);
                  onClose();
                }}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border transition-all cursor-pointer ${
                  value === preset
                    ? 'bg-red-50 text-red-700 border-red-300 font-bold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

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
  
  const [partyName, setPartyName] = useState<string>(() => getLoggedInUserPartyName());
  const [partyDropdownOpen, setPartyDropdownOpen] = useState(false);
  const [partySearchQuery, setPartySearchQuery] = useState('');

  const [startTime, setStartTime] = useState<string>('');
  const [stopTime, setStopTime] = useState<string>('');
  const [duration, setDuration] = useState<string>('');

  const [startDropdownOpen, setStartDropdownOpen] = useState(false);
  const [stopDropdownOpen, setStopDropdownOpen] = useState(false);

  const [projectName, setProjectName] = useState<string>('');
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');

  const [taskName, setTaskName] = useState<string>('');
  const [taskDropdownOpen, setTaskDropdownOpen] = useState(false);

  const [remarks, setRemarks] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; size?: string; url?: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const partyRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<HTMLDivElement>(null);
  const stopRef = useRef<HTMLDivElement>(null);
  const projectRef = useRef<HTMLDivElement>(null);
  const taskRef = useRef<HTMLDivElement>(null);

  // Populate state when editEntry changes or drawer opens
  useEffect(() => {
    if (editEntry && isOpen) {
      setDate(editEntry.date || new Date().toISOString().split('T')[0]);
      setPartyName(editEntry.party_name || getLoggedInUserPartyName());
      setStartTime(editEntry.start_time || '');
      setStopTime(editEntry.end_time || '');
      setDuration(editEntry.duration || '');
      setProjectName(editEntry.project_name || '');
      setTaskName(editEntry.task_name || '');
      setRemarks(editEntry.remarks || '');
      setUploadedFiles(editEntry.files || []);
      setStartDropdownOpen(false);
      setStopDropdownOpen(false);
    } else if (!editEntry && isOpen) {
      // Clean state for new entry with logged-in user automatically populated
      setDate(new Date().toISOString().split('T')[0]);
      setPartyName(getLoggedInUserPartyName());
      setStartTime('');
      setStopTime('');
      setDuration('');
      setProjectName(projects[0]?.name || '');
      setTaskName('');
      setRemarks('');
      setUploadedFiles([]);
      setStartDropdownOpen(false);
      setStopDropdownOpen(false);
    }
  }, [editEntry, isOpen, projects]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (partyRef.current && !partyRef.current.contains(e.target as Node)) {
        setPartyDropdownOpen(false);
      }
      if (startRef.current && !startRef.current.contains(e.target as Node)) {
        setStartDropdownOpen(false);
      }
      if (stopRef.current && !stopRef.current.contains(e.target as Node)) {
        setStopDropdownOpen(false);
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

  // Registered staff combined with defaults and active user
  const availableParties = (() => {
    const fromStaff = getStaffMembers().map((s: StaffMember) => s.designation ? `${s.designation} - ${s.name}` : s.name);
    const combined = [...fromStaff];
    COMMON_PARTIES.forEach((p: string) => {
      if (!combined.includes(p)) combined.push(p);
    });
    const loggedUserParty = getLoggedInUserPartyName();
    if (loggedUserParty && !combined.includes(loggedUserParty)) {
      combined.unshift(loggedUserParty);
    }
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
      const now = Date.now();
      const formattedDateTime = formatDisplayDateTime(now);
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
        files: uploadedFiles,
        updated_at: now,
        last_updated_at: formattedDateTime
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
      <div className="relative w-full max-w-[500px] bg-white h-full shadow-2xl z-10 flex flex-col justify-between animate-in slide-in-from-right duration-300">
        
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

          {/* START & STOP TIME (Side by Side with Interactive Time Dropdowns) */}
          <div className="grid grid-cols-2 gap-4">
            {/* START */}
            <div 
              ref={startRef}
              onClick={() => {
                setStartDropdownOpen(prev => !prev);
                setStopDropdownOpen(false);
              }}
              className={`relative border rounded-xl px-4 pt-3 pb-2.5 bg-white transition-all cursor-pointer select-none ${
                startDropdownOpen 
                  ? 'border-red-600 ring-2 ring-red-100' 
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <label className="absolute -top-2.5 left-3 bg-white px-1.5 text-[11px] font-bold text-slate-500 tracking-wide uppercase pointer-events-none">
                START
              </label>
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="04:00 PM"
                  readOnly
                  className="w-full text-sm text-slate-800 font-semibold bg-transparent outline-none pr-2 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStartDropdownOpen(prev => !prev);
                    setStopDropdownOpen(false);
                  }}
                  className={`p-1 rounded-lg transition-colors cursor-pointer ${
                    startDropdownOpen ? 'bg-red-50 text-red-600' : 'text-slate-400 hover:text-red-600'
                  }`}
                  title="Select Start Time"
                >
                  <Clock className="w-4 h-4 shrink-0" />
                </button>
              </div>

              {/* Time Picker Dropdown for START */}
              <TimePickerDropdown
                label="Start Time"
                value={startTime}
                onChange={(val) => {
                  setStartTime(val);
                }}
                isOpen={startDropdownOpen}
                onClose={() => setStartDropdownOpen(false)}
                defaultPeriod="AM"
                presets={['08:00 AM', '09:00 AM', '10:00 AM', '01:00 PM', '02:00 PM']}
                align="left"
              />
            </div>

            {/* STOP */}
            <div 
              ref={stopRef}
              onClick={() => {
                setStopDropdownOpen(prev => !prev);
                setStartDropdownOpen(false);
              }}
              className={`relative border rounded-xl px-4 pt-3 pb-2.5 bg-white transition-all cursor-pointer select-none ${
                stopDropdownOpen 
                  ? 'border-red-600 ring-2 ring-red-100' 
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <label className="absolute -top-2.5 left-3 bg-white px-1.5 text-[11px] font-bold text-slate-500 tracking-wide uppercase pointer-events-none">
                STOP
              </label>
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={stopTime}
                  onChange={(e) => setStopTime(e.target.value)}
                  placeholder="04:25 PM"
                  readOnly
                  className="w-full text-sm text-slate-800 font-semibold bg-transparent outline-none pr-2 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStopDropdownOpen(prev => !prev);
                    setStartDropdownOpen(false);
                  }}
                  className={`p-1 rounded-lg transition-colors cursor-pointer ${
                    stopDropdownOpen ? 'bg-red-50 text-red-600' : 'text-slate-400 hover:text-red-600'
                  }`}
                  title="Select Stop Time"
                >
                  <Clock className="w-4 h-4 shrink-0" />
                </button>
              </div>

              {/* Time Picker Dropdown for STOP */}
              <TimePickerDropdown
                label="Stop Time"
                value={stopTime}
                onChange={(val) => {
                  setStopTime(val);
                }}
                isOpen={stopDropdownOpen}
                onClose={() => setStopDropdownOpen(false)}
                defaultPeriod="PM"
                presets={['01:00 PM', '04:00 PM', '05:00 PM', '05:30 PM', '06:00 PM']}
                align="right"
              />
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
                <div className="flex items-center gap-1.5 shrink-0">
                  {projectName !== 'All Projects' ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectName('All Projects');
                        setProjectDropdownOpen(false);
                        setProjectSearchQuery('');
                      }}
                      className="text-[11px] font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded transition-colors cursor-pointer"
                      title="Select all projects at once"
                    >
                      Select All
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      All Projects
                    </span>
                  )}
                  <Search className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Dropdown suggestions */}
            {projectDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95">
                {/* Select All Option at top */}
                {(!projectSearchQuery || 'select all'.includes(projectSearchQuery.toLowerCase()) || 'all projects'.includes(projectSearchQuery.toLowerCase())) && (
                  <div className="p-1 border-b border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setProjectName('All Projects');
                        setProjectDropdownOpen(false);
                        setProjectSearchQuery('');
                      }}
                      className={`w-full px-3 py-2 text-left text-xs font-semibold rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                        projectName === 'All Projects'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-slate-50 hover:bg-red-50/80 text-slate-800 hover:text-red-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center justify-center w-4 h-4 rounded border transition-colors ${
                          projectName === 'All Projects'
                            ? 'bg-red-600 border-red-600 text-white'
                            : 'border-slate-300 bg-white text-transparent'
                        }`}>
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                        <span>Select All (All Projects)</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
                        {availableProjectOptions.length} Projects
                      </span>
                    </button>
                  </div>
                )}

                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Available Projects</span>
                  <span className="text-[10px] text-slate-400">{filteredProjects.length}</span>
                </div>

                {filteredProjects.length === 0 ? (
                  <div className="px-3.5 py-3 text-center text-xs text-slate-400">
                    No matching projects found
                  </div>
                ) : (
                  filteredProjects.map((p) => (
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
                  ))
                )}
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
