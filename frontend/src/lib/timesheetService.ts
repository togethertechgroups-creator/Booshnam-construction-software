export interface TimesheetEntry {
  id: string;
  date: string; // ISO format '2026-10-04' or display format
  display_date: string; // e.g. '3 Oct, 2026'
  party_name: string; // e.g. 'Site Supervisor - 1 - Sunil Kumar'
  start_time: string; // e.g. '4:00 PM' or '16:00'
  end_time: string; // e.g. '4:25 PM' or '16:25'
  duration: string; // e.g. '25 Min' or '3 Hr 40 Min'
  project_id?: string;
  project_name: string; // e.g. 'OVER HEADS' or '- Jahir Hussain Murugan Ls Ref-Navalur-1Pt-f'
  task_name?: string; // e.g. '--' or 'Quotation & Scope Verification'
  remarks?: string;
  files?: Array<{ name: string; size?: string; url?: string }>;
  created_at: number;
}

export interface QuotationScheduleTask {
  id: string;
  task_name: string;
  project_id: string;
  project_name: string;
  assignee: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'NOT_STARTED';
  start_date: string; // '2026-06-15'
  end_date: string; // '2026-07-10'
  milestone_date?: string; // '18 Jun' or '2026-06-18'
  stage_label?: string; // 'Client Meeting', 'Send Quotation', etc.
  color_theme?: string; // 'green' | 'blue' | 'red' | 'orange' | 'purple'
  completed_at?: string; // '03 Oct 2026, 04:25 PM'
  duration_days?: number;
  progress_percentage: number;
  remarks?: string;
  group_name?: string; // e.g. 'Unassigned' or project name
  actual_start?: string;
  actual_end?: string;
  forecast_end?: string;
  image_url?: string;
  tag?: string;
  progress_user?: string;
  progress_date?: string;
  wbs_task_id?: string;
  todos?: Array<{ id: string; text: string; done: boolean }>;
  materials?: Array<{ id: string; name: string; quantity: string; unit: string }>;
  workforce?: Array<{ id: string; role: string; count: number }>;
  equipment?: Array<{ id: string; name: string; count: number }>;
  progressUpdates?: Array<{ id: string; user: string; amount: string; date: string; note?: string; proof_url?: string }>;
  statusLogs?: Array<{ id: string; text: string; timestamp: string; user?: string }>;
  messages?: Array<{ id: string; user: string; text: string; time: string }>;
}

const TIMESHEET_STORAGE_KEY = 'booshnam_team_timesheets_v1';

// Initial default entries matching user Image 2 and Time Log View
export const INITIAL_TIMESHEETS: TimesheetEntry[] = [
  {
    id: 'ts-01',
    date: '2026-10-03',
    display_date: '3 Oct, 2026',
    party_name: 'Site Supervisor - 1 - Sunil Kumar',
    start_time: '4:00 PM',
    end_time: '4:25 PM',
    duration: '25 Min',
    project_name: 'OVER HEADS',
    task_name: '--',
    remarks: 'Jd Rajendran sembakkkam client site sembakkkam purpose site visit',
    files: [
      { name: 'sembakkam_site_inspection_01.jpg', size: '240 KB', url: '/crane-construction.png' },
      { name: 'sembakkam_site_inspection_02.jpg', size: '180 KB', url: '/engineer-silhouette.jpg' }
    ],
    created_at: Date.now() - 86400000
  },
  {
    id: 'ts-02',
    date: '2026-10-03',
    display_date: '03 Oct, 2026',
    party_name: 'Site Supervisor - 1 - Sunil Kumar',
    start_time: '11:50 AM',
    end_time: '3:30 PM',
    duration: '3 Hr 40 Min',
    project_name: '- Jahir Hussain Murugan Ls Ref-Navalur-1Pt-f',
    task_name: 'Site Topographical & Soil Inspection',
    remarks: 'Field site reconnaissance, borehole demarcations.',
    created_at: Date.now() - 90000000
  },
  {
    id: 'ts-03',
    date: '2026-10-03',
    display_date: '03 Oct, 2026',
    party_name: 'Site Supervisor - 1 - Sunil Kumar',
    start_time: '10:10 AM',
    end_time: '10:55 AM',
    duration: '45 Min',
    project_name: 'OVER HEADS',
    task_name: 'Project Schedule Coordination',
    remarks: 'Weekly resource scheduling and labour allocation.',
    created_at: Date.now() - 95000000
  },
  {
    id: 'ts-04',
    date: '2026-10-01',
    display_date: '01 Oct, 2026',
    party_name: 'Site Supervisor - 1 - Sunil Kumar',
    start_time: '5:40 PM',
    end_time: '6:25 PM',
    duration: '45 Min',
    project_name: 'OVER HEADS',
    task_name: 'Quotation Commercial Review',
    remarks: 'Vetted material quantity rate sheet for client quotation.',
    created_at: Date.now() - 250000000
  },
  {
    id: 'ts-05',
    date: '2026-10-01',
    display_date: '01 Oct, 2026',
    party_name: 'Site Supervisor - 1 - Sunil Kumar',
    start_time: '4:55 PM',
    end_time: '5:10 PM',
    duration: '15 Min',
    project_name: 'OVER HEADS',
    task_name: 'Quotation Client Query Log',
    remarks: 'Clarified structural SBC assumptions with client team.',
    created_at: Date.now() - 255000000
  },
  {
    id: 'ts-06',
    date: '2026-10-01',
    display_date: '01 Oct, 2026',
    party_name: 'Site Supervisor - 1 - Sunil Kumar',
    start_time: '4:10 PM',
    end_time: '4:30 PM',
    duration: '20 Min',
    project_name: 'OVER HEADS',
    task_name: 'Quotation Scope Sign-off',
    remarks: 'Internal team scope validation.',
    created_at: Date.now() - 258000000
  },
  {
    id: 'ts-07',
    date: '2026-10-01',
    display_date: '01 Oct, 2026',
    party_name: 'Site Supervisor - 1 - Sunil Kumar',
    start_time: '3:40 PM',
    end_time: '4:00 PM',
    duration: '20 Min',
    project_name: 'OVER HEADS',
    task_name: 'Quotation Document Export',
    remarks: 'Prepared official Booshnam stamped PDF quotation.',
    created_at: Date.now() - 260000000
  },
  {
    id: 'ts-08',
    date: '2026-10-01',
    display_date: '01 Oct, 2026',
    party_name: 'Site Supervisor - 1 - Sunil Kumar',
    start_time: '2:45 PM',
    end_time: '3:10 PM',
    duration: '25 Min',
    project_name: 'OVER HEADS',
    task_name: 'Site Log Briefing',
    remarks: 'Labour attendance and safety gear briefing.',
    created_at: Date.now() - 263000000
  },
  {
    id: 'ts-09',
    date: '2026-10-01',
    display_date: '01 Oct, 2026',
    party_name: 'Site Supervisor - 1 - Sunil Kumar',
    start_time: '1:15 PM',
    end_time: '1:40 PM',
    duration: '25 Min',
    project_name: 'OVER HEADS',
    task_name: 'Daily Timesheet Entry',
    remarks: 'Logged machinery fuel hours and site equipment usage.',
    created_at: Date.now() - 268000000
  }
];

export const DEFAULT_TIMESHEET_FILES = [
  { name: 'sembakkam_site_inspection_01.jpg', size: '240 KB', url: '/crane-construction.png' },
  { name: 'sembakkam_site_inspection_02.jpg', size: '180 KB', url: '/engineer-silhouette.jpg' }
];

export function getStoredTimesheets(): TimesheetEntry[] {
  try {
    const raw = localStorage.getItem(TIMESHEET_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let modified = false;
        parsed.forEach((t: any) => {
          if (!t.files || t.files.length === 0 || !t.files[0]?.url) {
            t.files = [...DEFAULT_TIMESHEET_FILES];
            modified = true;
          }
          if (t.id === 'ts-01') {
            t.remarks = 'Jd Rajendran sembakkkam client site sembakkkam purpose site visit';
            t.task_name = '--';
            t.project_name = 'OVER HEADS';
            t.display_date = '3 Oct, 2026';
            t.start_time = '4:00 PM';
            t.end_time = '4:25 PM';
            t.duration = '25 Min';
            modified = true;
          }
        });
        if (modified) {
          localStorage.setItem(TIMESHEET_STORAGE_KEY, JSON.stringify(parsed));
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load timesheets', e);
  }
  // Initialize with defaults if empty
  try {
    localStorage.setItem(TIMESHEET_STORAGE_KEY, JSON.stringify(INITIAL_TIMESHEETS));
  } catch (e) {}
  return INITIAL_TIMESHEETS;
}

export function saveTimesheet(entry: Omit<TimesheetEntry, 'id' | 'created_at'>): TimesheetEntry {
  const current = getStoredTimesheets();
  const newEntry: TimesheetEntry = {
    ...entry,
    files: entry.files && entry.files.length > 0 ? entry.files : [...DEFAULT_TIMESHEET_FILES],
    id: `ts-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    created_at: Date.now()
  };
  const updated = [newEntry, ...current];
  try {
    localStorage.setItem(TIMESHEET_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('booshnam_timesheets_updated', { detail: updated }));
  } catch (e) {
    console.error('Failed to save timesheet', e);
  }
  return newEntry;
}

export function updateTimesheet(id: string, partial: Partial<TimesheetEntry>): TimesheetEntry[] {
  const current = getStoredTimesheets();
  const updated = current.map(item => item.id === id ? { ...item, ...partial } : item);
  try {
    localStorage.setItem(TIMESHEET_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('booshnam_timesheets_updated', { detail: updated }));
  } catch (e) {}
  return updated;
}

export function deleteTimesheet(id: string): TimesheetEntry[] {
  const current = getStoredTimesheets();
  const updated = current.filter(item => item.id !== id);
  try {
    localStorage.setItem(TIMESHEET_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('booshnam_timesheets_updated', { detail: updated }));
  } catch (e) {}
  return updated;
}

// Calculate duration string from start & stop time strings (e.g. "04:00 PM" and "04:25 PM" or "14:00" and "15:30")
export function calculateDurationString(startStr: string, stopStr: string): string {
  if (!startStr || !stopStr) return '';
  const parseTimeToMinutes = (t: string): number | null => {
    const clean = t.trim().toUpperCase();
    const isPM = clean.includes('PM');
    const isAM = clean.includes('AM');
    const timeOnly = clean.replace(/AM|PM/g, '').trim();
    const parts = timeOnly.split(':').map(Number);
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
    let hours = parts[0];
    const minutes = parts[1];
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const startMin = parseTimeToMinutes(startStr);
  const stopMin = parseTimeToMinutes(stopStr);

  if (startMin === null || stopMin === null) return '';

  let diff = stopMin - startMin;
  if (diff < 0) diff += 24 * 60; // Crosses midnight

  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;

  if (hrs > 0 && mins > 0) return `${hrs} Hr ${mins} Min`;
  if (hrs > 0) return `${hrs} Hr`;
  return `${mins} Min`;
}

// Format a date string 'YYYY-MM-DD' into 'DD MMM, YYYY'
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    return `${day} ${month}, ${year}`;
  } catch (e) {
    return dateStr;
  }
}
