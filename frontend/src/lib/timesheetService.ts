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
  updated_at?: number;
  last_updated_at?: string; // e.g. '14 Oct, 2026, 11:55 AM'
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
  image_uploaded_at?: string;
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

// Initial entries: clean empty state, no dummy data
export const INITIAL_TIMESHEETS: TimesheetEntry[] = [];

export const DEFAULT_TIMESHEET_FILES: Array<{ name: string; size?: string; url?: string }> = [];

export function getStoredTimesheets(): TimesheetEntry[] {
  try {
    const raw = localStorage.getItem(TIMESHEET_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Strip out any legacy dummy/mock entries
        const cleaned = parsed.filter((t: any) => 
          !t.id?.match(/^ts-0[1-9]$/) &&
          t.project_name !== 'OVER HEADS' &&
          !(t.remarks && t.remarks.includes('sembakkkam'))
        );
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(TIMESHEET_STORAGE_KEY, JSON.stringify(cleaned));
        }
        return cleaned;
      }
    }
  } catch (e) {
    console.error('Failed to load timesheets', e);
  }
  return [];
}

export function saveTimesheet(entry: Omit<TimesheetEntry, 'id' | 'created_at'>): TimesheetEntry {
  const current = getStoredTimesheets();
  const newEntry: TimesheetEntry = {
    ...entry,
    files: entry.files && entry.files.length > 0 ? entry.files : [],
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
  const now = Date.now();
  const formatted = formatDisplayDateTime(now);
  const updated = current.map(item => item.id === id ? { 
    ...item, 
    ...partial,
    updated_at: partial.updated_at || now,
    last_updated_at: partial.last_updated_at || formatted
  } : item);
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

// Format a date/timestamp into 'DD MMM, YYYY, hh:mm A'
export function formatDisplayDateTime(val?: number | string | Date): string {
  if (!val) return '';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedHours = String(hours).padStart(2, '0');
    return `${day} ${month}, ${year}, ${formattedHours}:${minutes} ${ampm}`;
  } catch (e) {
    return String(val);
  }
}
