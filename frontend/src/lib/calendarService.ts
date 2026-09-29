export interface WeeklyOffConfig {
  Su: boolean;
  Mo: boolean;
  Tu: boolean;
  We: boolean;
  Th: boolean;
  Fr: boolean;
  Sa: boolean;
}

export interface PublicHoliday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  year: number;
  month: number; // 1-12 (1 for Jan, 12 for Dec)
  day: number;
}

const WEEKLY_OFF_KEY = 'booshnam_weekly_offs_v1';
const HOLIDAYS_KEY = 'booshnam_holidays_calendar_v1';

// Default: Sunday is weekoff, Mo-Sa are working (as in construction companies)
export const DEFAULT_WEEKLY_OFFS: WeeklyOffConfig = {
  Su: true,
  Mo: false,
  Tu: false,
  We: false,
  Th: false,
  Fr: false,
  Sa: false,
};

// Default standard gazetted holidays for 2026 in India (construction context)
export const DEFAULT_HOLIDAYS_2026: PublicHoliday[] = [
  { id: 'hol-2026-1', name: 'New Year Day', date: '2026-01-01', year: 2026, month: 1, day: 1 },
  { id: 'hol-2026-2', name: 'Pongal / Makar Sankranti', date: '2026-01-14', year: 2026, month: 1, day: 14 },
  { id: 'hol-2026-3', name: 'Republic Day', date: '2026-01-26', year: 2026, month: 1, day: 26 },
  { id: 'hol-2026-4', name: 'Maha Shivaratri', date: '2026-02-15', year: 2026, month: 2, day: 15 },
  { id: 'hol-2026-5', name: 'Holi', date: '2026-03-03', year: 2026, month: 3, day: 3 },
  { id: 'hol-2026-6', name: 'Eid-ul-Fitr (Ramzan)', date: '2026-03-21', year: 2026, month: 3, day: 21 },
  { id: 'hol-2026-7', name: 'Tamil New Year / Dr. Ambedkar Jayanti', date: '2026-04-14', year: 2026, month: 4, day: 14 },
  { id: 'hol-2026-8', name: 'May Day (Workers Day)', date: '2026-05-01', year: 2026, month: 5, day: 1 },
  { id: 'hol-2026-9', name: 'Bakrid / Eid al-Adha', date: '2026-05-27', year: 2026, month: 5, day: 27 },
  { id: 'hol-2026-10', name: 'Muharram', date: '2026-06-26', year: 2026, month: 6, day: 26 },
  { id: 'hol-2026-11', name: 'Independence Day', date: '2026-08-15', year: 2026, month: 8, day: 15 },
  { id: 'hol-2026-12', name: 'Ganesh Chaturthi', date: '2026-09-14', year: 2026, month: 9, day: 14 },
  { id: 'hol-2026-13', name: 'Mahatma Gandhi Jayanti', date: '2026-10-02', year: 2026, month: 10, day: 2 },
  { id: 'hol-2026-14', name: 'Ayudha Puja / Dussehra', date: '2026-10-20', year: 2026, month: 10, day: 20 },
  { id: 'hol-2026-15', name: 'Diwali (Deepavali)', date: '2026-11-08', year: 2026, month: 11, day: 8 },
  { id: 'hol-2026-16', name: 'Christmas Day', date: '2026-12-25', year: 2026, month: 12, day: 25 },
];

export const getWeeklyOffs = (): WeeklyOffConfig => {
  try {
    const raw = localStorage.getItem(WEEKLY_OFF_KEY);
    if (raw) {
      return { ...DEFAULT_WEEKLY_OFFS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to get weekly offs:', e);
  }
  return DEFAULT_WEEKLY_OFFS;
};

export const saveWeeklyOffs = (offs: WeeklyOffConfig): void => {
  try {
    localStorage.setItem(WEEKLY_OFF_KEY, JSON.stringify(offs));
    window.dispatchEvent(new CustomEvent('booshnam_calendar_updated'));
  } catch (e) {
    console.error('Failed to save weekly offs:', e);
  }
};

export const getStoredHolidays = (): PublicHoliday[] => {
  try {
    const raw = localStorage.getItem(HOLIDAYS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to get stored holidays:', e);
  }
  // Return empty list initially to match reference screenshot empty state unless user adds or initializes
  return [];
};

export const saveStoredHolidays = (holidays: PublicHoliday[]): void => {
  try {
    localStorage.setItem(HOLIDAYS_KEY, JSON.stringify(holidays));
    window.dispatchEvent(new CustomEvent('booshnam_calendar_updated'));
  } catch (e) {
    console.error('Failed to save public holidays:', e);
  }
};

export const addPublicHoliday = (name: string, dateStr: string): PublicHoliday => {
  const dateObj = new Date(dateStr);
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();

  const newHoliday: PublicHoliday = {
    id: `hol-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name: name.trim(),
    date: dateStr,
    year,
    month,
    day,
  };

  const current = getStoredHolidays();
  const updated = [...current, newHoliday].sort((a, b) => a.date.localeCompare(b.date));
  saveStoredHolidays(updated);
  return newHoliday;
};

export const deletePublicHoliday = (id: string): void => {
  const current = getStoredHolidays();
  const updated = current.filter(h => h.id !== id);
  saveStoredHolidays(updated);
};

export const loadDefaultHolidays = (): PublicHoliday[] => {
  saveStoredHolidays(DEFAULT_HOLIDAYS_2026);
  return DEFAULT_HOLIDAYS_2026;
};
