import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Calendar, ChevronDown, X, Trash2, 
  Edit3, FileText, Printer, Check, User, Users, RefreshCw, 
  ArrowLeft, CheckCircle2, MapPin, Clock, Tag
} from 'lucide-react';
import { Project, MOMRecord } from '../../../types';
import { confirmAction, setFormDirty, clearFormDirty, confirmNavigationIfDirty } from '../../../lib/dialogService';

interface MOMTabProps {
  project: Project;
  onShowToast?: (msg: string) => void;
}

const DEFAULT_MOM: MOMRecord[] = [];

const SUGGESTED_ATTENDEES = [
  'Likson (Site Eng)',
  'Priya',
  'Babu Aditya (Builder)',
  'Arun Verma (PM)',
  'Ravi Kumar (Supervisor)',
  'Kavitha Selvan (Accounts)',
  'Thangavelu M (Safety)',
  'Ar. Nivedita (Architect)',
  'Client Representative'
];

export const MOMTab: React.FC<MOMTabProps> = ({ project, onShowToast }) => {
  const storageKey = `booshnam_mom_v2_${project?.id || 'default'}`;

  const [meetings, setMeetings] = useState<MOMRecord[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return DEFAULT_MOM;
  });

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(meetings));
    } catch {
      // ignore
    }
  }, [meetings, storageKey]);

  // Search & Filter states (Image 1)
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [attendeeFilter, setAttendeeFilter] = useState<string>('ALL');

  // Dropdown toggles
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [isAttendeeDropdownOpen, setIsAttendeeDropdownOpen] = useState(false);

  // Modals / Selection
  const [isNewMOMOpen, setIsNewMOMOpen] = useState(false);
  // When selectedMeeting is not null, opens FULL SCREEN view (as requested by user)
  const [selectedMeeting, setSelectedMeeting] = useState<MOMRecord | null>(null);

  // Form states (Image 2)
  const [meetingName, setMeetingName] = useState('');
  const [meetingDate, setMeetingDate] = useState('2026-09-17');
  const [attendeeInput, setAttendeeInput] = useState('');
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [isAttendeeSuggestionsOpen, setIsAttendeeSuggestionsOpen] = useState(false);
  const [agenda, setAgenda] = useState('');
  const [resolution, setResolution] = useState('');

  // Project label display
  const projectLabel = project.name || 'Project';

  // Filter meetings
  const filteredMeetings = meetings.filter((item) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (item.meeting_name || item.title).toLowerCase().includes(q);
      const matchAttendees = item.attendees?.some((a) => a.toLowerCase().includes(q));
      const matchAgenda = item.agenda?.toLowerCase().includes(q);
      const matchResolution = item.resolution?.toLowerCase().includes(q);
      const matchNotes = item.notes?.toLowerCase().includes(q);
      if (!matchName && !matchAttendees && !matchAgenda && !matchResolution && !matchNotes) return false;
    }

    // Date filter
    if (dateFilter === 'TODAY') {
      const today = new Date().toISOString().split('T')[0];
      if (item.date !== today) return false;
    } else if (dateFilter === 'WEEK') {
      const today = new Date();
      const itemDate = new Date(item.date);
      const diffDays = (today.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
      if (diffDays > 7 || diffDays < 0) return false;
    } else if (dateFilter === 'MONTH') {
      const todayMonth = new Date().toISOString().slice(0, 7);
      if (!item.date.startsWith(todayMonth)) return false;
    }

    // Attendee filter
    if (attendeeFilter !== 'ALL') {
      if (!item.attendees?.some((a) => a.toLowerCase().includes(attendeeFilter.toLowerCase()))) {
        return false;
      }
    }

    return true;
  });

  // Open New MOM modal
  const handleOpenNewMOM = () => {
    setMeetingName('');
    setMeetingDate(new Date().toISOString().split('T')[0]);
    setSelectedAttendees([]);
    setAttendeeInput('');
    setAgenda('');
    setResolution('');
    setIsNewMOMOpen(true);
  };

  // Add attendee chip in form
  const handleAddAttendee = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !selectedAttendees.includes(trimmed)) {
      setSelectedAttendees([...selectedAttendees, trimmed]);
    }
    setAttendeeInput('');
    setIsAttendeeSuggestionsOpen(false);
  };

  // Remove attendee chip
  const handleRemoveAttendee = (name: string) => {
    setSelectedAttendees(selectedAttendees.filter((a) => a !== name));
  };

  // Dirty state tracking for MOM modal
  useEffect(() => {
    if (!isNewMOMOpen) {
      clearFormDirty();
      return;
    }
    const isDirty = Boolean(meetingName.trim() || agenda.trim() || resolution.trim());
    if (isDirty) {
      setFormDirty(true, 'MOM form');
    } else {
      clearFormDirty();
    }
    return () => {
      clearFormDirty();
    };
  }, [isNewMOMOpen, meetingName, agenda, resolution]);

  const handleCloseNewMOM = async () => {
    const canLeave = await confirmNavigationIfDirty();
    if (canLeave) {
      clearFormDirty();
      setIsNewMOMOpen(false);
    }
  };

  // Save New MOM Form
  const handleSaveMOM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingName.trim()) {
      onShowToast?.('Please enter a Meeting Name');
      return;
    }

    const confirmed = await confirmAction({
      title: 'Save Meeting Minutes',
      message: `Are you sure you want to save meeting minutes for "${meetingName.trim()}"?`,
      confirmText: 'Save MOM',
      cancelText: 'Cancel',
      variant: 'primary',
      icon: 'info'
    });
    if (!confirmed) return;

    clearFormDirty();
    const newRecord: MOMRecord = {
      id: `mom-${Date.now()}`,
      mom_number: `MOM-2026-${String(meetings.length + 1).padStart(3, '0')}`,
      meeting_name: meetingName.trim(),
      title: meetingName.trim(),
      date: meetingDate || '2026-09-17',
      project_name: projectLabel,
      attendees: selectedAttendees,
      agenda: agenda.trim(),
      resolution: resolution.trim(),
      notes: resolution.trim() || agenda.trim() || 'Meeting notes recorded.',
      created_at: new Date().toISOString().split('T')[0]
    };

    setMeetings([newRecord, ...meetings]);
    setIsNewMOMOpen(false);
    onShowToast?.(`MOM saved: "${newRecord.meeting_name}"`);
  };

  // Delete MOM
  const handleDeleteMOM = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const meeting = meetings.find(m => m.id !== id);
    const confirmed = await confirmAction({
      title: 'Delete Minutes of Meeting',
      message: 'Are you sure you want to delete this MOM record?\nThis action cannot be undone.',
      confirmText: 'Delete Record',
      cancelText: 'Cancel',
      variant: 'danger',
      icon: 'trash'
    });
    if (!confirmed) return;

    setMeetings((prev) => prev.filter((m) => m.id !== id));
    if (selectedMeeting?.id === id) {
      setSelectedMeeting(null);
    }
    onShowToast?.('MOM record deleted');
  };

  // Reset to default seed
  const handleResetDemoData = () => {
    setMeetings(DEFAULT_MOM);
    onShowToast?.('Reset default MOM records');
  };

  // =========================================================================
  // VIEW MODE 1: FULL SCREEN MOM DETAIL PREVIEW (Requested by User)
  // =========================================================================
  if (selectedMeeting) {
    return (
      <div className="space-y-4 animate-in fade-in duration-150">
        {/* Top Action Bar (Back to List, Delete, Print) */}
        <div className="bg-white px-5 py-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedMeeting(null)}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
              title="Back to MOM List"
              aria-label="Back to MOM List"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </button>

            <span className="text-xs text-slate-400">|</span>

            <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold rounded">
              MINUTES OF MEETING
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleDeleteMOM(selectedMeeting.id)}
              className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 border border-red-200 rounded-xl font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete MOM</span>
            </button>

            <button
              type="button"
              onClick={() => onShowToast?.(`Printing/Exporting MOM: "${selectedMeeting.meeting_name || selectedMeeting.title}"...`)}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Export MOM</span>
            </button>
          </div>
        </div>

        {/* Full-Page Main Content Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Top Brand Accent Stripe */}
          <div className="h-1 bg-red-600 w-full" />

          <div className="p-6 sm:p-8 space-y-6">
            {/* Meeting Title Banner */}
            <div className="border-b border-slate-100 pb-5">
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block mb-1">
                MINUTES OF MEETING
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                {selectedMeeting.meeting_name || selectedMeeting.title}
              </h1>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200/90 text-xs">
              <div>
                <span className="text-slate-400 font-medium block">Date</span>
                <p className="font-semibold text-slate-800 text-sm mt-0.5 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span>{selectedMeeting.date}</span>
                </p>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">Meeting Number</span>
                <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                  {selectedMeeting.mom_number || 'MOM-2026-001'}
                </p>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">Project</span>
                <p className="font-semibold text-slate-700 text-xs mt-1 truncate">
                  {selectedMeeting.project_name || projectLabel}
                </p>
              </div>
            </div>

            {/* Attendees Section */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 uppercase text-xs tracking-wider">
                  ATTENDEES ({selectedMeeting.attendees?.length || 0})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedMeeting.attendees && selectedMeeting.attendees.length > 0 ? (
                  selectedMeeting.attendees.map((att, i) => (
                    <span
                      key={i}
                      className="px-3.5 py-1.5 bg-slate-100/90 text-slate-800 rounded-xl text-xs font-medium flex items-center gap-2 border border-slate-200"
                    >
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>{att}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">No attendees recorded</span>
                )}
              </div>
            </div>

            {/* Agenda Points Card */}
            <div className="space-y-2">
              <span className="font-bold text-slate-900 uppercase text-xs tracking-wider block">
                AGENDA POINTS
              </span>
              <div className="p-5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 leading-relaxed whitespace-pre-line shadow-2xs font-normal">
                {selectedMeeting.agenda || 'No specific agenda points recorded.'}
              </div>
            </div>

            {/* Decisions & Resolution Card */}
            <div className="space-y-2">
              <span className="font-bold text-slate-900 uppercase text-xs tracking-wider block">
                DECISIONS & RESOLUTION
              </span>
              <div className="p-5 bg-red-50/20 border border-red-200 rounded-2xl text-xs text-slate-800 leading-relaxed whitespace-pre-line font-medium shadow-2xs">
                {selectedMeeting.resolution || selectedMeeting.notes || 'No resolution recorded.'}
              </div>
            </div>

            {/* Additional Notes (if present) */}
            {selectedMeeting.notes && selectedMeeting.notes !== selectedMeeting.resolution && (
              <div className="space-y-2">
                <span className="font-bold text-slate-900 uppercase text-xs tracking-wider block">
                  NOTES & SUMMARY
                </span>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {selectedMeeting.notes}
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSelectedMeeting(null)}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to All Meetings</span>
            </button>

            <button
              type="button"
              onClick={() => onShowToast?.(`Printing/Exporting MOM: "${selectedMeeting.meeting_name || selectedMeeting.title}"...`)}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Export MOM</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE 2: MAIN MOM LIST & TABLE (IMAGE 1)
  // =========================================================================
  return (
    <div className="space-y-4">
      {/* 1. FILTER & ACTION TOOLBAR (IMAGE 1) */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Left Filter Controls (Image 1) */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Icon Button / Input */}
          <div className="relative">
            {isSearchOpen ? (
              <div className="flex items-center border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white shadow-2xs">
                <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search MOM..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs text-slate-800 bg-transparent focus:outline-none w-44"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 ml-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="w-9 h-9 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl flex items-center justify-center text-slate-700 transition-colors cursor-pointer"
                title="Search MOM"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Date Filter Button (Image 1) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                dateFilter !== 'ALL'
                  ? 'bg-red-50 text-red-600 border border-red-300'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <span>{dateFilter === 'ALL' ? 'Date Filter' : `Date: ${dateFilter}`}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isDateDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-36 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1.5 text-xs animate-in fade-in duration-100">
                {[
                  { id: 'ALL', label: 'All Dates' },
                  { id: 'TODAY', label: 'Today' },
                  { id: 'WEEK', label: 'This Week' },
                  { id: 'MONTH', label: 'This Month' }
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setDateFilter(d.id as any);
                      setIsDateDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-1.5 font-medium transition-colors cursor-pointer ${
                      dateFilter === d.id ? 'bg-red-50 text-red-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Attendee ⌵ Dropdown Button (Image 1) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsAttendeeDropdownOpen(!isAttendeeDropdownOpen)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                attendeeFilter !== 'ALL'
                  ? 'bg-red-50 text-red-600 border border-red-300'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <span>{attendeeFilter === 'ALL' ? 'Attendee' : attendeeFilter}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isAttendeeDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1.5 text-xs animate-in fade-in duration-100 max-h-60 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    setAttendeeFilter('ALL');
                    setIsAttendeeDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-1.5 font-medium transition-colors cursor-pointer ${
                    attendeeFilter === 'ALL' ? 'bg-red-50 text-red-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  All Attendees
                </button>
                {SUGGESTED_ATTENDEES.map((att) => (
                  <button
                    key={att}
                    type="button"
                    onClick={() => {
                      setAttendeeFilter(att);
                      setIsAttendeeDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-1.5 font-medium transition-colors cursor-pointer truncate ${
                      attendeeFilter === att ? 'bg-red-50 text-red-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {att}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Action: New MOM + Button (Image 1) */}
        <button
          type="button"
          onClick={handleOpenNewMOM}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1 cursor-pointer"
        >
          <span>New MOM +</span>
        </button>
      </div>

      {/* 2. TABLE VIEW (IMAGE 1): Name | Attendee | Notes */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Header (Image 1) */}
        <div className="grid grid-cols-12 px-6 py-3.5 bg-slate-50/70 border-b border-slate-200 text-xs font-semibold text-slate-600">
          <div className="col-span-5 sm:col-span-4">Name</div>
          <div className="col-span-4 sm:col-span-4">Attendee</div>
          <div className="col-span-3 sm:col-span-4">Notes</div>
        </div>

        {/* Table Body */}
        {filteredMeetings.length === 0 ? (
          /* Empty State (Image 1) */
          <div className="py-32 flex flex-col items-center justify-center text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No MOM Available</p>
            <p className="text-xs text-slate-400 mt-1">Record meeting minutes, key decisions, and attendee registers.</p>
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={handleOpenNewMOM}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                + Create First MOM
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredMeetings.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedMeeting(item)}
                className="grid grid-cols-12 px-6 py-4 items-center text-xs hover:bg-slate-50/80 transition-colors cursor-pointer group"
              >
                {/* Name Column */}
                <div className="col-span-5 sm:col-span-4 pr-3 min-w-0">
                  <p className="font-bold text-slate-900 group-hover:text-red-600 transition-colors truncate">
                    {item.meeting_name || item.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-slate-500 font-medium">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {item.date}
                    </span>
                    {item.mom_number && (
                      <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px] font-mono">
                        {item.mom_number}
                      </span>
                    )}
                  </div>
                </div>

                {/* Attendee Column */}
                <div className="col-span-4 sm:col-span-4 pr-3 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.attendees && item.attendees.length > 0 ? (
                      item.attendees.slice(0, 3).map((a, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] truncate max-w-[140px]"
                        >
                          <User className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                          <span className="truncate">{a}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 text-xs">No attendees</span>
                    )}
                    {item.attendees && item.attendees.length > 3 && (
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">
                        +{item.attendees.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Notes Column */}
                <div className="col-span-3 sm:col-span-4 flex items-center justify-between gap-3 min-w-0">
                  <p className="text-slate-600 truncate flex-1 leading-relaxed">
                    {item.notes || item.resolution || item.agenda || 'No notes available'}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteMOM(item.id, e)}
                    className="p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 shrink-0 cursor-pointer"
                    title="Delete MOM"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. "NEW MOM" MODAL (IMAGE 2) */}
      {isNewMOMOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header (Image 2): ✕ NEW MOM (left), Save button (right) */}
            <div className="px-5 py-3.5 flex items-center justify-between bg-white border-b border-slate-100">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCloseNewMOM}
                  className="p-1 text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <span className="text-sm font-bold text-slate-900 tracking-wide">NEW MOM</span>
              </div>

              {/* Red Save Button (Image 2 in red theme) */}
              <button
                type="button"
                onClick={handleSaveMOM}
                className="px-5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-colors"
              >
                Save
              </button>
            </div>

            {/* Accent Red Stripe directly under Header (Image 2) */}
            <div className="h-1 bg-red-600 w-full" />

            {/* Form Fields (Image 2) */}
            <form onSubmit={handleSaveMOM} className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Field 1: MEETING NAME * */}
              <div className="relative border border-slate-300 rounded-xl p-3 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-600 transition-all bg-white">
                <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  MEETING NAME *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter meeting name..."
                  value={meetingName}
                  onChange={(e) => setMeetingName(e.target.value)}
                  className="w-full text-xs text-slate-900 bg-transparent focus:outline-none placeholder-slate-400"
                />
              </div>

              {/* Field 2: DATE * */}
              <div className="relative border border-slate-300 rounded-xl p-3 bg-white">
                <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  DATE *
                </label>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-900 font-medium">
                    <Calendar className="w-4 h-4 text-slate-600" />
                    <span>{meetingDate}</span>
                  </div>
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                  />
                  <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Field 3: SELECT PROJECT * (Image 2) */}
              <div className="relative border border-slate-300 rounded-xl p-3 bg-white">
                <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  SELECT PROJECT *
                </label>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-800 font-medium truncate">
                    {projectLabel}
                  </span>
                  <div className="p-1.5 bg-slate-100 text-slate-500 rounded-lg shrink-0 cursor-default">
                    <Edit3 className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Field 4: ATTENDEE (Image 2) */}
              <div className="relative border border-slate-300 rounded-xl p-3 bg-white focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-600 transition-all">
                <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  ATTENDEE
                </label>

                {/* Selected Attendee Chips */}
                {selectedAttendees.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedAttendees.map((att) => (
                      <span
                        key={att}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-50 text-red-700 rounded-lg text-[11px] font-medium border border-red-200"
                      >
                        <User className="w-2.5 h-2.5" />
                        <span>{att}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttendee(att)}
                          className="hover:text-red-900 cursor-pointer ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    placeholder="Type name & press Enter, or click icon..."
                    value={attendeeInput}
                    onChange={(e) => {
                      setAttendeeInput(e.target.value);
                      setIsAttendeeSuggestionsOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (attendeeInput.trim()) {
                          handleAddAttendee(attendeeInput);
                        }
                      }
                    }}
                    className="w-full text-xs text-slate-900 bg-transparent focus:outline-none placeholder-slate-400 pr-2"
                  />
                  <button
                    type="button"
                    onClick={() => setIsAttendeeSuggestionsOpen(!isAttendeeSuggestionsOpen)}
                    className="text-slate-500 hover:text-red-600 cursor-pointer shrink-0"
                    title="Browse Attendees"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>

                {/* Suggestions dropdown */}
                {isAttendeeSuggestionsOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-40 py-1.5 text-xs max-h-48 overflow-y-auto">
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase">
                      Select Team Members
                    </div>
                    {SUGGESTED_ATTENDEES.map((name) => {
                      const isSelected = selectedAttendees.includes(name);
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              handleRemoveAttendee(name);
                            } else {
                              handleAddAttendee(name);
                            }
                          }}
                          className={`w-full text-left px-3.5 py-1.5 flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected ? 'bg-red-50 text-red-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-red-600" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Field 5: AGENDA (Image 2) */}
              <div className="relative border border-slate-300 rounded-xl p-3 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-600 transition-all bg-white">
                <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  AGENDA
                </label>
                <textarea
                  rows={4}
                  placeholder="Key topics, discussion items, and site agenda points..."
                  value={agenda}
                  onChange={(e) => setAgenda(e.target.value)}
                  className="w-full text-xs text-slate-900 bg-transparent focus:outline-none placeholder-slate-400 resize-none"
                />
              </div>

              {/* Field 6: RESOLUTION (Image 2) */}
              <div className="relative border border-slate-300 rounded-xl p-3 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-600 transition-all bg-white">
                <label className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  RESOLUTION
                </label>
                <textarea
                  rows={4}
                  placeholder="Decisions agreed upon, approved resolutions, and next actions..."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full text-xs text-slate-900 bg-transparent focus:outline-none placeholder-slate-400 resize-none"
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
