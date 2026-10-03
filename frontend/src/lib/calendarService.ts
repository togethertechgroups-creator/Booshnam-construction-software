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
  dayOfWeek?: string; // e.g. "Friday"
  category?: 'National' | 'Gazetted' | 'Festival' | 'Company' | 'Restricted' | 'Site Off' | string;
  applicableTo?: 'All Workforce' | 'Office Only' | 'Site Only' | string;
  description?: string;
  isOptional?: boolean;
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

export const getDayOfWeekName = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return '';
  }
  const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
  return dateObj.toLocaleDateString('en-US', { weekday: 'long' });
};

// Default standard gazetted holidays for 2026 in India (construction context)
export const DEFAULT_HOLIDAYS_2026: PublicHoliday[] = [
  { id: 'hol-2026-1', name: 'New Year Day', date: '2026-01-01', year: 2026, month: 1, day: 1, dayOfWeek: 'Thursday', category: 'Gazetted', applicableTo: 'All Workforce' },
  { id: 'hol-2026-2', name: 'Pongal / Makar Sankranti', date: '2026-01-14', year: 2026, month: 1, day: 14, dayOfWeek: 'Wednesday', category: 'Festival', applicableTo: 'All Workforce' },
  { id: 'hol-2026-3', name: 'Republic Day', date: '2026-01-26', year: 2026, month: 1, day: 26, dayOfWeek: 'Monday', category: 'National', applicableTo: 'All Workforce' },
  { id: 'hol-2026-4', name: 'Maha Shivaratri', date: '2026-02-15', year: 2026, month: 2, day: 15, dayOfWeek: 'Sunday', category: 'Festival', applicableTo: 'All Workforce' },
  { id: 'hol-2026-5', name: 'Holi', date: '2026-03-03', year: 2026, month: 3, day: 3, dayOfWeek: 'Tuesday', category: 'Festival', applicableTo: 'All Workforce' },
  { id: 'hol-2026-6', name: 'Eid-ul-Fitr (Ramzan)', date: '2026-03-21', year: 2026, month: 3, day: 21, dayOfWeek: 'Saturday', category: 'Festival', applicableTo: 'All Workforce' },
  { id: 'hol-2026-7', name: 'Tamil New Year / Dr. Ambedkar Jayanti', date: '2026-04-14', year: 2026, month: 4, day: 14, dayOfWeek: 'Tuesday', category: 'Gazetted', applicableTo: 'All Workforce' },
  { id: 'hol-2026-8', name: 'May Day (Workers Day)', date: '2026-05-01', year: 2026, month: 5, day: 1, dayOfWeek: 'Friday', category: 'National', applicableTo: 'All Workforce' },
  { id: 'hol-2026-9', name: 'Bakrid / Eid al-Adha', date: '2026-05-27', year: 2026, month: 5, day: 27, dayOfWeek: 'Wednesday', category: 'Festival', applicableTo: 'All Workforce' },
  { id: 'hol-2026-10', name: 'Muharram', date: '2026-06-26', year: 2026, month: 6, day: 26, dayOfWeek: 'Friday', category: 'Festival', applicableTo: 'All Workforce' },
  { id: 'hol-2026-11', name: 'Independence Day', date: '2026-08-15', year: 2026, month: 8, day: 15, dayOfWeek: 'Saturday', category: 'National', applicableTo: 'All Workforce' },
  { id: 'hol-2026-12', name: 'Ganesh Chaturthi', date: '2026-09-14', year: 2026, month: 9, day: 14, dayOfWeek: 'Monday', category: 'Festival', applicableTo: 'All Workforce' },
  { id: 'hol-2026-13', name: 'Mahatma Gandhi Jayanti', date: '2026-10-02', year: 2026, month: 10, day: 2, dayOfWeek: 'Friday', category: 'National', applicableTo: 'All Workforce' },
  { id: 'hol-2026-14', name: 'Ayudha Puja / Dussehra', date: '2026-10-20', year: 2026, month: 10, day: 20, dayOfWeek: 'Tuesday', category: 'Festival', applicableTo: 'All Workforce' },
  { id: 'hol-2026-15', name: 'Diwali (Deepavali)', date: '2026-11-08', year: 2026, month: 11, day: 8, dayOfWeek: 'Sunday', category: 'Festival', applicableTo: 'All Workforce' },
  { id: 'hol-2026-16', name: 'Christmas Day', date: '2026-12-25', year: 2026, month: 12, day: 25, dayOfWeek: 'Friday', category: 'Festival', applicableTo: 'All Workforce' },
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
      if (Array.isArray(parsed)) {
        return parsed.map(h => ({
          ...h,
          dayOfWeek: h.dayOfWeek || getDayOfWeekName(h.date),
        }));
      }
    }
  } catch (e) {
    console.error('Failed to get stored holidays:', e);
  }
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

export interface HolidayInput {
  name: string;
  date: string;
  category?: 'National' | 'Gazetted' | 'Festival' | 'Company' | 'Restricted' | 'Site Off' | string;
  applicableTo?: 'All Workforce' | 'Office Only' | 'Site Only' | string;
  description?: string;
  dayOfWeek?: string;
  isOptional?: boolean;
}

export const addPublicHoliday = (
  nameOrInput: string | HolidayInput,
  dateStr?: string,
  extra?: Partial<PublicHoliday>
): PublicHoliday => {
  let name = '';
  let date = '';
  let category: string = 'Company';
  let applicableTo: string = 'All Workforce';
  let description: string = '';
  let dayOfWeek: string = '';

  if (typeof nameOrInput === 'object') {
    name = nameOrInput.name;
    date = nameOrInput.date;
    category = nameOrInput.category || 'Company';
    applicableTo = nameOrInput.applicableTo || 'All Workforce';
    description = nameOrInput.description || '';
    dayOfWeek = nameOrInput.dayOfWeek || getDayOfWeekName(date);
  } else {
    name = nameOrInput;
    date = dateStr || '';
    category = extra?.category || 'Company';
    applicableTo = extra?.applicableTo || 'All Workforce';
    description = extra?.description || '';
    dayOfWeek = extra?.dayOfWeek || getDayOfWeekName(date);
  }

  const parts = date.split('-').map(Number);
  const year = parts[0] || new Date().getFullYear();
  const month = parts[1] || (new Date().getMonth() + 1);
  const day = parts[2] || new Date().getDate();

  const newHoliday: PublicHoliday = {
    id: `hol-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name: name.trim(),
    date,
    year,
    month,
    day,
    dayOfWeek: dayOfWeek || getDayOfWeekName(date),
    category,
    applicableTo,
    description: description.trim(),
  };

  const current = getStoredHolidays();
  // Filter out any holiday on the same date with the same name, or just add
  const updated = [...current, newHoliday].sort((a, b) => a.date.localeCompare(b.date));
  saveStoredHolidays(updated);
  return newHoliday;
};

export const updatePublicHoliday = (holiday: PublicHoliday): void => {
  const current = getStoredHolidays();
  const parts = holiday.date.split('-').map(Number);
  const updatedItem: PublicHoliday = {
    ...holiday,
    year: parts[0] || holiday.year,
    month: parts[1] || holiday.month,
    day: parts[2] || holiday.day,
    dayOfWeek: holiday.dayOfWeek || getDayOfWeekName(holiday.date),
  };

  const updated = current.map(h => (h.id === holiday.id ? updatedItem : h))
    .sort((a, b) => a.date.localeCompare(b.date));
  saveStoredHolidays(updated);
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
