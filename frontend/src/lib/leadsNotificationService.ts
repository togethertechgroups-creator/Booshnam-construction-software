import { Lead } from '../types';

export type FollowUpStatus = 'OVERDUE' | 'TODAY' | 'UPCOMING' | 'NONE';

export interface FollowUpInfo {
  status: FollowUpStatus;
  label: string;
  badgeClass: string;
  dotClass: string;
  diffDays: number;
  formattedDate: string;
}

export function parseDateString(dateStr?: string): Date | null {
  if (!dateStr || !dateStr.trim()) return null;
  const clean = dateStr.trim();
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    } else if (parts[2]?.length === 4) {
      // DD-MM-YYYY
      return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }
  }
  const d = new Date(clean);
  return isNaN(d.getTime()) ? null : d;
}

export function getFollowUpStatus(dateStr?: string): FollowUpInfo {
  if (!dateStr || !dateStr.trim()) {
    return {
      status: 'NONE',
      label: 'No follow up',
      badgeClass: 'bg-slate-50 text-slate-400 border border-slate-200',
      dotClass: 'bg-slate-300',
      diffDays: 0,
      formattedDate: ''
    };
  }

  const targetDate = parseDateString(dateStr);
  if (!targetDate) {
    return {
      status: 'NONE',
      label: dateStr,
      badgeClass: 'bg-slate-50 text-slate-600 border border-slate-200',
      dotClass: 'bg-slate-400',
      diffDays: 0,
      formattedDate: dateStr
    };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const formattedDate = `${pad(target.getDate())}-${pad(target.getMonth() + 1)}-${target.getFullYear()}`;

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const daysAgo = Math.abs(diffDays);
    return {
      status: 'OVERDUE',
      label: `${formattedDate} (${daysAgo}d overdue)`,
      badgeClass: 'bg-red-50 text-red-700 border border-red-200 font-bold',
      dotClass: 'bg-red-600',
      diffDays,
      formattedDate
    };
  } else if (diffDays === 0) {
    return {
      status: 'TODAY',
      label: `${formattedDate} (Due Today)`,
      badgeClass: 'bg-amber-50 text-amber-800 border border-amber-300 font-bold',
      dotClass: 'bg-amber-500',
      diffDays: 0,
      formattedDate
    };
  } else if (diffDays <= 3) {
    return {
      status: 'UPCOMING',
      label: `${formattedDate} (in ${diffDays}d)`,
      badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold',
      dotClass: 'bg-blue-500',
      diffDays,
      formattedDate
    };
  } else {
    return {
      status: 'UPCOMING',
      label: formattedDate,
      badgeClass: 'bg-slate-50 text-slate-700 border border-slate-200 font-medium',
      dotClass: 'bg-slate-400',
      diffDays,
      formattedDate
    };
  }
}

const VIEWED_REMINDERS_KEY = 'booshnam_viewed_reminders_v1';

export function getViewedRemindersMap(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(VIEWED_REMINDERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function isReminderViewed(leadId: string, followupDate?: string): boolean {
  if (!followupDate) return true;
  const viewedMap = getViewedRemindersMap();
  return viewedMap[leadId] === followupDate || viewedMap[leadId] === 'viewed';
}

export function markRemindersAsViewed(leadIds?: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const saved = localStorage.getItem('booshnam_leads_v2');
    const leads: Lead[] = saved ? JSON.parse(saved) : [];
    const viewedMap = getViewedRemindersMap();

    if (leadIds && leadIds.length > 0) {
      leadIds.forEach(id => {
        const lead = leads.find(l => l.id === id);
        if (lead && lead.followup_date) {
          viewedMap[id] = lead.followup_date;
        } else {
          viewedMap[id] = 'viewed';
        }
      });
    } else {
      leads.forEach((l) => {
        if (l.followup_date) {
          const info = getFollowUpStatus(l.followup_date);
          if (info.status === 'OVERDUE' || info.status === 'TODAY' || info.diffDays <= 1) {
            viewedMap[l.id] = l.followup_date;
          }
        }
      });
    }

    localStorage.setItem(VIEWED_REMINDERS_KEY, JSON.stringify(viewedMap));
    window.dispatchEvent(new Event('booshnam_leads_updated'));
    window.dispatchEvent(new Event('booshnam_reminders_viewed'));
  } catch {}
}

export function clearViewedReminders(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(VIEWED_REMINDERS_KEY);
    window.dispatchEvent(new Event('booshnam_leads_updated'));
    window.dispatchEvent(new Event('booshnam_reminders_viewed'));
  } catch {}
}

export function getDueFollowUpsCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const saved = localStorage.getItem('booshnam_leads_v2');
    if (!saved) return 0;
    const leads: Lead[] = JSON.parse(saved);
    if (!Array.isArray(leads)) return 0;

    const viewedMap = getViewedRemindersMap();
    let count = 0;
    leads.forEach(l => {
      if (l.followup_date) {
        const info = getFollowUpStatus(l.followup_date);
        if (info.status === 'OVERDUE' || info.status === 'TODAY') {
          // Only count if this reminder hasn't been viewed yet
          const isViewed = viewedMap[l.id] === l.followup_date || viewedMap[l.id] === 'viewed';
          if (!isViewed) {
            count++;
          }
        }
      }
    });
    return count;
  } catch {
    return 0;
  }
}

export function getTotalDueFollowUpsCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const saved = localStorage.getItem('booshnam_leads_v2');
    if (!saved) return 0;
    const leads: Lead[] = JSON.parse(saved);
    if (!Array.isArray(leads)) return 0;
    let count = 0;
    leads.forEach(l => {
      if (l.followup_date) {
        const info = getFollowUpStatus(l.followup_date);
        if (info.status === 'OVERDUE' || info.status === 'TODAY') {
          count++;
        }
      }
    });
    return count;
  } catch {
    return 0;
  }
}
