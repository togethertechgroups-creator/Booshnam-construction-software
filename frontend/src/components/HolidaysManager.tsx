import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit3,
  Search,
  Sparkles,
  CheckCircle2,
  Building2,
  HardHat,
  Users,
  Flag,
  Info,
  X,
  Check,
  CalendarDays,
  LayoutGrid,
  List
} from 'lucide-react';
import {
  PublicHoliday,
  HolidayInput,
  getStoredHolidays,
  addPublicHoliday,
  updatePublicHoliday,
  deletePublicHoliday,
  loadDefaultHolidays,
  getDayOfWeekName
} from '../lib/calendarService';
import { CustomSelect } from './CustomSelect';

interface HolidaysManagerProps {
  onShowToast?: (msg: string) => void;
}

const HOLIDAY_CATEGORIES = [
  { value: 'National', label: 'National Holiday' },
  { value: 'Gazetted', label: 'Gazetted / Public Holiday' },
  { value: 'Festival', label: 'Festival / Religious' },
  { value: 'Company', label: 'Company Holiday' },
  { value: 'Site Off', label: 'Site Off / Shutdown' },
  { value: 'Restricted', label: 'Restricted / Optional' },
];

const APPLICABLE_OPTIONS = [
  { value: 'All Workforce', label: 'All Workforce (Office & Site)' },
  { value: 'Office Only', label: 'Office Staff Only' },
  { value: 'Site Only', label: 'Site Staff & Workers Only' },
];

const QUICK_PRESET_NAMES = [
  { name: 'Gandhi Jayanti', category: 'National' },
  { name: 'Diwali (Deepavali)', category: 'Festival' },
  { name: 'Pongal / Makar Sankranti', category: 'Festival' },
  { name: 'Republic Day', category: 'National' },
  { name: 'Independence Day', category: 'National' },
  { name: 'Tamil New Year', category: 'Gazetted' },
  { name: 'May Day (Workers Day)', category: 'National' },
  { name: 'Ayudha Puja / Dussehra', category: 'Festival' },
  { name: 'Eid-ul-Fitr', category: 'Festival' },
  { name: 'Christmas Day', category: 'Festival' },
  { name: 'Site Safety Day', category: 'Site Off' },
  { name: 'Annual Plant Maintenance', category: 'Site Off' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Helper to format YYYY-MM-DD
const formatDateStr = (year: number, monthZeroIndexed: number, day: number): string => {
  const m = String(monthZeroIndexed + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

export const HolidaysManager: React.FC<HolidaysManagerProps> = ({ onShowToast }) => {
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedApplicableFilter, setSelectedApplicableFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Month navigation for main calendar view
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState<number>(() => new Date().getMonth());
  const [currentCalendarYear, setCurrentCalendarYear] = useState<number>(() => new Date().getFullYear());

  // Modal State for "Mark Holidays"
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingHolidayId, setEditingHolidayId] = useState<string | null>(null);

  // Form State inside Modal
  const [modalDate, setModalDate] = useState<string>(() => {
    const today = new Date();
    return formatDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  });
  const [modalName, setModalName] = useState<string>('');
  const [modalCategory, setModalCategory] = useState<string>('National');
  const [modalApplicableTo, setModalApplicableTo] = useState<string>('All Workforce');
  const [modalDescription, setModalDescription] = useState<string>('');

  // Interactive Calendar inside Modal (for picking date)
  const [modalPickerMonth, setModalPickerMonth] = useState<number>(() => new Date().getMonth());
  const [modalPickerYear, setModalPickerYear] = useState<number>(() => new Date().getFullYear());

  // Load holidays from storage
  const refreshHolidays = () => {
    const data = getStoredHolidays();
    setHolidays(data);
  };

  useEffect(() => {
    refreshHolidays();
    const handleCalendarUpdate = () => {
      refreshHolidays();
    };
    window.addEventListener('booshnam_calendar_updated', handleCalendarUpdate);
    return () => window.removeEventListener('booshnam_calendar_updated', handleCalendarUpdate);
  }, []);

  // When modalDate changes, sync modal picker month & year
  useEffect(() => {
    if (modalDate) {
      const [y, m] = modalDate.split('-').map(Number);
      if (y && m) {
        setModalPickerYear(y);
        setModalPickerMonth(m - 1);
      }
    }
  }, [modalDate]);

  // Derived Day of Week for Modal
  const modalDayOfWeek = useMemo(() => {
    return getDayOfWeekName(modalDate);
  }, [modalDate]);

  // Open modal to Mark a New Holiday (optionally for a specific date)
  const handleOpenMarkHolidayModal = (initialDateStr?: string) => {
    setEditingHolidayId(null);
    const dateToUse = initialDateStr || formatDateStr(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    setModalDate(dateToUse);
    setModalName('');
    setModalCategory('National');
    setModalApplicableTo('All Workforce');
    setModalDescription('');

    const [y, m] = dateToUse.split('-').map(Number);
    if (y && m) {
      setModalPickerYear(y);
      setModalPickerMonth(m - 1);
    }
    setIsModalOpen(true);
  };

  // Open modal to Edit an Existing Holiday
  const handleEditHoliday = (holiday: PublicHoliday) => {
    setEditingHolidayId(holiday.id);
    setModalDate(holiday.date);
    setModalName(holiday.name);
    setModalCategory(holiday.category || 'Company');
    setModalApplicableTo(holiday.applicableTo || 'All Workforce');
    setModalDescription(holiday.description || '');

    const [y, m] = holiday.date.split('-').map(Number);
    if (y && m) {
      setModalPickerYear(y);
      setModalPickerMonth(m - 1);
    }
    setIsModalOpen(true);
  };

  // Save or Update Holiday
  const handleSaveHoliday = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!modalName.trim()) {
      onShowToast?.('Please enter a holiday name or reason.');
      return;
    }
    if (!modalDate) {
      onShowToast?.('Please select a valid date.');
      return;
    }

    const dayOfWeek = getDayOfWeekName(modalDate);

    if (editingHolidayId) {
      const existing = holidays.find(h => h.id === editingHolidayId);
      if (existing) {
        const updated: PublicHoliday = {
          ...existing,
          name: modalName.trim(),
          date: modalDate,
          dayOfWeek,
          category: modalCategory,
          applicableTo: modalApplicableTo,
          description: modalDescription.trim(),
        };
        updatePublicHoliday(updated);
        onShowToast?.(`Holiday "${updated.name}" updated successfully.`);
      }
    } else {
      const input: HolidayInput = {
        name: modalName.trim(),
        date: modalDate,
        category: modalCategory,
        applicableTo: modalApplicableTo,
        description: modalDescription.trim(),
        dayOfWeek,
      };
      addPublicHoliday(input);
      onShowToast?.(`Holiday "${input.name}" marked on ${modalDate} (${dayOfWeek}).`);
    }

    refreshHolidays();
    setIsModalOpen(false);
  };

  // Delete Holiday
  const handleDeleteHoliday = (holiday: PublicHoliday) => {
    if (window.confirm(`Are you sure you want to remove the holiday "${holiday.name}" on ${holiday.date}?`)) {
      deletePublicHoliday(holiday.id);
      refreshHolidays();
      onShowToast?.(`Holiday "${holiday.name}" removed.`);
      if (isModalOpen && editingHolidayId === holiday.id) {
        setIsModalOpen(false);
      }
    }
  };

  // Load default 2026 holidays
  const handleLoadDefaults = () => {
    if (holidays.length > 0) {
      if (!window.confirm('This will load standard 2026 Indian gazetted holidays into your calendar. Continue?')) {
        return;
      }
    }
    loadDefaultHolidays();
    refreshHolidays();
    setSelectedYear(2026);
    setCurrentCalendarYear(2026);
    onShowToast?.('16 standard gazetted holidays loaded for 2026.');
  };

  // Filtered holidays list
  const filteredHolidays = useMemo(() => {
    return holidays.filter(h => {
      // Filter by selected year if in list view or overview
      const [y] = h.date.split('-').map(Number);
      if (selectedYear !== 0 && y !== selectedYear) return false;

      // Category filter
      if (selectedCategoryFilter !== 'all' && h.category !== selectedCategoryFilter) return false;

      // Applicability filter
      if (selectedApplicableFilter !== 'all' && h.applicableTo !== selectedApplicableFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = h.name.toLowerCase().includes(q);
        const matchDate = h.date.includes(q);
        const matchCategory = (h.category || '').toLowerCase().includes(q);
        const matchDay = (h.dayOfWeek || '').toLowerCase().includes(q);
        if (!matchName && !matchDate && !matchCategory && !matchDay) return false;
      }

      return true;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [holidays, selectedYear, selectedCategoryFilter, selectedApplicableFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const yearHolidays = holidays.filter(h => {
      const [y] = h.date.split('-').map(Number);
      return y === selectedYear;
    });

    const todayStr = formatDateStr(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    const upcoming = yearHolidays.filter(h => h.date >= todayStr).length;
    const nationalGazetted = yearHolidays.filter(h => h.category === 'National' || h.category === 'Gazetted').length;
    const festival = yearHolidays.filter(h => h.category === 'Festival').length;
    const companySite = yearHolidays.filter(h => h.category === 'Company' || h.category === 'Site Off').length;

    return {
      total: yearHolidays.length,
      upcoming,
      nationalGazetted,
      festival,
      companySite,
    };
  }, [holidays, selectedYear]);

  // Category badge color
  const getCategoryBadgeClass = (category?: string) => {
    switch (category) {
      case 'National':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Gazetted':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Festival':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Site Off':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Company':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  // Helper to generate calendar matrix for a month
  const generateMonthMatrix = (year: number, monthZeroIndexed: number) => {
    const firstDay = new Date(year, monthZeroIndexed, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, monthZeroIndexed + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, monthZeroIndexed, 0).getDate();

    const matrix: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isSunday: boolean;
      isToday: boolean;
    }> = [];

    const todayStr = formatDateStr(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonth = monthZeroIndexed === 0 ? 11 : monthZeroIndexed - 1;
      const prevYear = monthZeroIndexed === 0 ? year - 1 : year;
      const dateStr = formatDateStr(prevYear, prevMonth, dayNum);
      const isSunday = new Date(prevYear, prevMonth, dayNum).getDay() === 0;
      matrix.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isSunday,
        isToday: dateStr === todayStr,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateStr(year, monthZeroIndexed, day);
      const isSunday = new Date(year, monthZeroIndexed, day).getDay() === 0;
      matrix.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        isSunday,
        isToday: dateStr === todayStr,
      });
    }

    // Next month padding to fill grid (multiple of 7)
    const totalCells = Math.ceil(matrix.length / 7) * 7;
    const remaining = totalCells - matrix.length;
    for (let day = 1; day <= remaining; day++) {
      const nextMonth = monthZeroIndexed === 11 ? 0 : monthZeroIndexed + 1;
      const nextYear = monthZeroIndexed === 11 ? year + 1 : year;
      const dateStr = formatDateStr(nextYear, nextMonth, day);
      const isSunday = new Date(nextYear, nextMonth, day).getDay() === 0;
      matrix.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: false,
        isSunday,
        isToday: dateStr === todayStr,
      });
    }

    return matrix;
  };

  // Main calendar matrix
  const mainCalendarDays = useMemo(() => {
    return generateMonthMatrix(currentCalendarYear, currentCalendarMonth);
  }, [currentCalendarYear, currentCalendarMonth]);

  // Modal picker matrix
  const modalPickerDays = useMemo(() => {
    return generateMonthMatrix(modalPickerYear, modalPickerMonth);
  }, [modalPickerYear, modalPickerMonth]);

  // Map holidays by date for rapid lookup
  const holidaysByDate = useMemo(() => {
    const map: Record<string, PublicHoliday[]> = {};
    for (const h of holidays) {
      if (!map[h.date]) map[h.date] = [];
      map[h.date].push(h);
    }
    return map;
  }, [holidays]);

  // Month navigation handlers for main calendar
  const handlePrevMonth = () => {
    if (currentCalendarMonth === 0) {
      setCurrentCalendarMonth(11);
      setCurrentCalendarYear(y => y - 1);
    } else {
      setCurrentCalendarMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentCalendarMonth === 11) {
      setCurrentCalendarMonth(0);
      setCurrentCalendarYear(y => y + 1);
    } else {
      setCurrentCalendarMonth(m => m + 1);
    }
  };

  const handleTodayJump = () => {
    const now = new Date();
    setCurrentCalendarMonth(now.getMonth());
    setCurrentCalendarYear(now.getFullYear());
  };

  // Modal picker month navigation
  const handleModalPickerPrevMonth = () => {
    if (modalPickerMonth === 0) {
      setModalPickerMonth(11);
      setModalPickerYear(y => y - 1);
    } else {
      setModalPickerMonth(m => m - 1);
    }
  };

  const handleModalPickerNextMonth = () => {
    if (modalPickerMonth === 11) {
      setModalPickerMonth(0);
      setModalPickerYear(y => y + 1);
    } else {
      setModalPickerMonth(m => m + 1);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6 animate-in fade-in duration-150">

      {/* ── ACTION CONTROLS BAR ── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Left: Search & Filter */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search holiday name, date, day..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="w-32">
            <CustomSelect
              value={String(selectedYear)}
              onChange={val => {
                const y = Number(val);
                setSelectedYear(y);
                setCurrentCalendarYear(y);
              }}
              options={[
                { label: 'Year 2025', value: '2025' },
                { label: 'Year 2026', value: '2026' },
                { label: 'Year 2027', value: '2027' },
                { label: 'All Years', value: '0' },
              ]}
            />
          </div>

          <div className="w-40">
            <CustomSelect
              value={selectedCategoryFilter}
              onChange={val => setSelectedCategoryFilter(val)}
              options={[
                { label: 'All Categories', value: 'all' },
                ...HOLIDAY_CATEGORIES.map(c => ({ label: c.label, value: c.value })),
              ]}
            />
          </div>
        </div>

        {/* Right: View Mode Toggle & Primary Actions */}
        <div className="flex items-center gap-2 self-end lg:self-auto flex-wrap">
          {/* View Switch */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Calendar
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
          </div>

          {/* Load 2026 Defaults Button (if empty or needed) */}
          {holidays.length === 0 && (
            <button
              type="button"
              onClick={handleLoadDefaults}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Prepopulate 2026 Gazetted Holidays"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Load Standard 2026
            </button>
          )}

          {/* PRIMARY BUTTON: "Mark Holidays" */}
          <button
            type="button"
            onClick={() => handleOpenMarkHolidayModal()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Mark Holidays
          </button>
        </div>
      </div>

      {/* ── VIEW MODE 1: INTERACTIVE MONTHLY CALENDAR VIEW ── */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Calendar Header with Month/Year Navigation */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                {MONTH_NAMES[currentCalendarMonth]} {currentCalendarYear}
              </h2>

              <button
                type="button"
                onClick={handleTodayJump}
                className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 rounded-md hover:bg-indigo-50 transition cursor-pointer"
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                <span>Sunday (Weekly Off)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                <span>Marked Holiday</span>
              </div>
            </div>
          </div>

          {/* Weekday Labels Grid */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100/70 text-center py-2.5 text-xs font-bold text-slate-600">
            <div className="text-red-600">Sunday</div>
            <div>Monday</div>
            <div>Tuesday</div>
            <div>Wednesday</div>
            <div>Thursday</div>
            <div>Friday</div>
            <div>Saturday</div>
          </div>

          {/* Calendar 7-Column Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-50/30">
            {mainCalendarDays.map((cell, idx) => {
              const cellHolidays = holidaysByDate[cell.dateStr] || [];
              const hasHoliday = cellHolidays.length > 0;

              return (
                <div
                  key={`${cell.dateStr}-${idx}`}
                  className={`h-[85px] p-1.5 transition-colors relative flex flex-col group overflow-hidden ${
                    !cell.isCurrentMonth
                      ? 'bg-slate-50/50 text-slate-400 opacity-60'
                      : cell.isSunday
                      ? 'bg-red-50/20'
                      : 'bg-white'
                  } hover:bg-indigo-50/30`}
                >
                  {/* Date Number and Add Trigger */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                        cell.isToday
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : cell.isSunday
                          ? 'text-red-600 font-extrabold'
                          : 'text-slate-800'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {/* Quick "+" button to mark holiday on hover */}
                    <button
                      type="button"
                      onClick={() => handleOpenMarkHolidayModal(cell.dateStr)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition cursor-pointer text-[10px] font-bold flex items-center gap-0.5"
                      title={`Mark holiday for ${cell.dateStr}`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Sunday Weekly Off Tag */}
                  {cell.isSunday && (
                    <div className="text-[9px] font-semibold text-red-500 mb-0.5 flex items-center gap-1 leading-none">
                      <span>Weekly Off</span>
                    </div>
                  )}

                  {/* Marked Holidays List inside cell */}
                  <div className="flex flex-col gap-0.5 mt-auto overflow-y-auto min-h-0 scrollbar-hide pb-0.5">
                    {cellHolidays.map(h => (
                      <div
                        key={h.id}
                        onClick={() => handleEditHoliday(h)}
                        className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-semibold border cursor-pointer transition-all hover:scale-[1.02] shadow-2xs ${getCategoryBadgeClass(
                          h.category
                        )}`}
                        title={`${h.name} (${h.category || 'Holiday'}) - Click to edit`}
                      >
                        <div className="font-bold truncate leading-tight">{h.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── VIEW MODE 2: TABLE / CARD LIST VIEW ── */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {filteredHolidays.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400">
              <CalendarDays className="w-12 h-12 mb-3 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">No holidays found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                No holidays match your current filter or no holidays have been marked yet for {selectedYear || 'this period'}.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => handleOpenMarkHolidayModal()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Mark New Holiday
                </button>
                {holidays.length === 0 && (
                  <button
                    type="button"
                    onClick={handleLoadDefaults}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition cursor-pointer"
                  >
                    Load Standard 2026 Holidays
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              <div className="grid grid-cols-12 px-6 py-3 bg-slate-50/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <div className="col-span-3 sm:col-span-2">Date & Day</div>
                <div className="col-span-5 sm:col-span-4">Holiday Reason / Name</div>
                <div className="hidden sm:block sm:col-span-2">Category</div>
                <div className="hidden md:block md:col-span-2">Applicable To</div>
                <div className="col-span-4 sm:col-span-2 text-right">Actions</div>
              </div>

              {filteredHolidays.map(holiday => {
                const dayName = holiday.dayOfWeek || getDayOfWeekName(holiday.date);
                const [y, m, d] = holiday.date.split('-').map(Number);
                const monthShort = MONTH_NAMES[m - 1]?.slice(0, 3) || '';

                return (
                  <div
                    key={holiday.id}
                    className="grid grid-cols-12 px-6 py-3.5 items-center hover:bg-slate-50/60 transition-colors text-xs"
                  >
                    {/* Date & Day */}
                    <div className="col-span-3 sm:col-span-2 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center text-center shrink-0">
                        <span className="text-[10px] font-black text-indigo-500 uppercase leading-none">
                          {monthShort}
                        </span>
                        <span className="text-base font-extrabold text-indigo-700 leading-tight">
                          {d}
                        </span>
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{dayName}</div>
                        <div className="text-[11px] text-slate-400">{holiday.date}</div>
                      </div>
                    </div>

                    {/* Holiday Name & Remarks */}
                    <div className="col-span-5 sm:col-span-4 pr-4">
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        {holiday.name}
                      </div>
                      {holiday.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {holiday.description}
                        </p>
                      )}
                    </div>

                    {/* Category */}
                    <div className="hidden sm:block sm:col-span-2">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${getCategoryBadgeClass(
                          holiday.category
                        )}`}
                      >
                        {holiday.category || 'Company'}
                      </span>
                    </div>

                    {/* Applicable To */}
                    <div className="hidden md:block md:col-span-2">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        {holiday.applicableTo?.includes('Site') ? (
                          <HardHat className="w-3.5 h-3.5 text-amber-600" />
                        ) : holiday.applicableTo?.includes('Office') ? (
                          <Building2 className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <Users className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                        <span className="text-xs font-medium">
                          {holiday.applicableTo || 'All Workforce'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="col-span-4 sm:col-span-2 flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleEditHoliday(holiday)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 text-slate-600 transition cursor-pointer"
                        title="Edit Holiday"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteHoliday(holiday)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-600 transition cursor-pointer"
                        title="Delete Holiday"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: MARK / MANAGE HOLIDAYS (CALENDAR + DETAILS) ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingHolidayId ? 'Edit Holiday' : 'Mark Holiday'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select a date on the calendar, enter the holiday reason and day details.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Split into Interactive Calendar Picker + Form Fields */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto max-h-[calc(85vh-130px)]">
              {/* Left Column: Interactive Mini Calendar (md:col-span-5) */}
              <div className="md:col-span-5 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-bold text-xs text-slate-800">
                    {MONTH_NAMES[modalPickerMonth]} {modalPickerYear}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleModalPickerPrevMonth}
                      className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleModalPickerNextMonth}
                      className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Weekday headers */}
                <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-500 mb-1.5">
                  <span className="text-red-500">Su</span>
                  <span>Mo</span>
                  <span>Tu</span>
                  <span>We</span>
                  <span>Th</span>
                  <span>Fr</span>
                  <span>Sa</span>
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {modalPickerDays.map((cell, idx) => {
                    const isSelected = cell.dateStr === modalDate;
                    const cellHols = holidaysByDate[cell.dateStr] || [];
                    const hasHoliday = cellHols.length > 0;

                    return (
                      <button
                        key={`${cell.dateStr}-${idx}`}
                        type="button"
                        onClick={() => setModalDate(cell.dateStr)}
                        className={`h-8 rounded-lg text-xs font-semibold flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs font-bold scale-105 z-10'
                            : cell.isToday
                            ? 'border border-indigo-400 text-indigo-700 bg-indigo-50/50'
                            : !cell.isCurrentMonth
                            ? 'text-slate-300'
                            : cell.isSunday
                            ? 'text-red-600 hover:bg-red-100/50'
                            : 'text-slate-700 hover:bg-slate-200/60'
                        }`}
                      >
                        <span>{cell.dayNumber}</span>
                        {/* Dot indicator if holiday marked */}
                        {hasHoliday && !isSelected && (
                          <span className="w-1 h-1 rounded-full bg-indigo-600 absolute bottom-1" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Info summary under mini calendar */}
                <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-500 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Selected Date:</span>
                    <span className="font-bold text-indigo-600">{modalDate}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Day of Week:</span>
                    <span className="font-bold text-slate-800">{modalDayOfWeek}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Form Inputs (md:col-span-7) */}
              <form onSubmit={handleSaveHoliday} className="md:col-span-7 space-y-4">
                {/* Date Banner */}
                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                      Selected Day
                    </span>
                    <h4 className="text-sm font-extrabold text-indigo-950 mt-0.5">
                      {modalDayOfWeek}, {modalDate}
                    </h4>
                  </div>
                  <input
                    type="date"
                    value={modalDate}
                    onChange={e => setModalDate(e.target.value)}
                    className="text-xs bg-white border border-indigo-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Holiday Name / Reason */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Holiday Name / Reason <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gandhi Jayanti, Diwali, Site Safety Day"
                    value={modalName}
                    onChange={e => setModalName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium"
                  />
                </div>

                {/* Quick Presets Chips */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                    Quick Suggestions
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {QUICK_PRESET_NAMES.map(preset => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setModalName(preset.name);
                          setModalCategory(preset.category);
                        }}
                        className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category & Applicability */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Holiday Type / Category
                    </label>
                    <CustomSelect
                      value={modalCategory}
                      onChange={val => setModalCategory(val)}
                      options={HOLIDAY_CATEGORIES}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Applicable To
                    </label>
                    <CustomSelect
                      value={modalApplicableTo}
                      onChange={val => setModalApplicableTo(val)}
                      options={APPLICABLE_OPTIONS}
                    />
                  </div>
                </div>

                {/* Description / Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Description / Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Paid holiday for all site workers and office staff"
                    value={modalDescription}
                    onChange={e => setModalDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                {/* Existing Holiday Notice if date already has holiday */}
                {holidaysByDate[modalDate] && holidaysByDate[modalDate].length > 0 && !editingHolidayId && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Existing holiday on this date: </span>
                      {holidaysByDate[modalDate].map(h => h.name).join(', ')}.
                      <span className="block text-[11px] text-amber-700 mt-0.5">
                        You can still mark another holiday or edit the existing one.
                      </span>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              {editingHolidayId ? (
                <button
                  type="button"
                  onClick={() => {
                    const h = holidays.find(x => x.id === editingHolidayId);
                    if (h) handleDeleteHoliday(h);
                  }}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Holiday
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveHoliday()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  {editingHolidayId ? 'Update Holiday' : 'Mark Holiday'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
