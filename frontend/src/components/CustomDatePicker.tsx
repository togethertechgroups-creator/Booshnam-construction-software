import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';

export interface CustomDatePickerProps {
  value: string; // ISO format: "YYYY-MM-DD" or empty string ""
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  align?: 'left' | 'right';
  title?: string;
  disabled?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  placeholder = 'DD-MM-YYYY',
  className = '',
  inputClassName = '',
  align = 'left',
  title = 'Select Date',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value or default to current date
  const parsedDate = value ? new Date(value + 'T00:00:00') : null;
  const initialYear = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.getFullYear() : new Date().getFullYear();
  const initialMonth = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.getMonth() : new Date().getMonth();

  const [currentYear, setCurrentYear] = useState(initialYear);
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');

  // Keep view in sync when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setCurrentYear(d.getFullYear());
        setCurrentMonth(d.getMonth());
      }
    }
  }, [value]);

  // Click outside to dismiss
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setViewMode('days');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Format date to display (DD-MM-YYYY)
  const displayFormatted = (val: string) => {
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
    }
    return val;
  };

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  const handleSelectDate = (year: number, month: number, day: number) => {
    const formatted = `${year}-${pad(month + 1)}-${pad(day)}`;
    onChange(formatted);
    setIsOpen(false);
    setViewMode('days');
  };

  const handleTodayClick = () => {
    const today = new Date();
    const formatted = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    onChange(formatted);
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setIsOpen(false);
    setViewMode('days');
  };

  const handleClearClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  const handlePrev = () => {
    if (viewMode === 'days') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(prev => prev - 1);
      } else {
        setCurrentMonth(prev => prev - 1);
      }
    } else if (viewMode === 'months') {
      setCurrentYear(prev => prev - 1);
    } else if (viewMode === 'years') {
      setCurrentYear(prev => prev - 12);
    }
  };

  const handleNext = () => {
    if (viewMode === 'days') {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(prev => prev + 1);
      } else {
        setCurrentMonth(prev => prev + 1);
      }
    } else if (viewMode === 'months') {
      setCurrentYear(prev => prev + 1);
    } else if (viewMode === 'years') {
      setCurrentYear(prev => prev + 12);
    }
  };

  // Generate calendar days
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const calendarDays: Array<{
    day: number;
    month: number;
    year: number;
    isCurrentMonth: boolean;
    isSelected: boolean;
    isToday: boolean;
  }> = [];

  const todayObj = new Date();
  const isTodayDate = (y: number, m: number, d: number) =>
    todayObj.getFullYear() === y && todayObj.getMonth() === m && todayObj.getDate() === d;

  const isSelectedDate = (y: number, m: number, d: number) => {
    if (!value) return false;
    const parts = value.split('-');
    if (parts.length !== 3) return false;
    return Number(parts[0]) === y && Number(parts[1]) - 1 === m && Number(parts[2]) === d;
  };

  // Previous month trailing days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const m = currentMonth === 0 ? 11 : currentMonth - 1;
    const y = currentMonth === 0 ? currentYear - 1 : currentYear;
    calendarDays.push({
      day: d,
      month: m,
      year: y,
      isCurrentMonth: false,
      isSelected: isSelectedDate(y, m, d),
      isToday: isTodayDate(y, m, d),
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push({
      day: d,
      month: currentMonth,
      year: currentYear,
      isCurrentMonth: true,
      isSelected: isSelectedDate(currentYear, currentMonth, d),
      isToday: isTodayDate(currentYear, currentMonth, d),
    });
  }

  // Next month leading days (to complete 35 or 42 grid slots)
  const remainingSlots = (calendarDays.length <= 35 ? 35 : 42) - calendarDays.length;
  for (let d = 1; d <= remainingSlots; d++) {
    const m = currentMonth === 11 ? 0 : currentMonth + 1;
    const y = currentMonth === 11 ? currentYear + 1 : currentYear;
    calendarDays.push({
      day: d,
      month: m,
      year: y,
      isCurrentMonth: false,
      isSelected: isSelectedDate(y, m, d),
      isToday: isTodayDate(y, m, d),
    });
  }

  // Year grid (12 years range)
  const yearStart = Math.floor(currentYear / 12) * 12;
  const yearsList = Array.from({ length: 12 }, (_, i) => yearStart + i);

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
      {/* Input Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setViewMode('days');
          }
        }}
        title={title}
        className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 bg-white border border-slate-200 rounded-[5px] text-xs text-slate-800 transition-all cursor-pointer select-none text-left ${
          isOpen ? 'ring-2 ring-red-500/20 border-red-500 shadow-sm' : 'hover:border-slate-300'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''} ${inputClassName}`}
      >
        <span className={`font-mono text-[11px] truncate ${value ? 'font-semibold text-slate-800' : 'text-slate-400 font-normal'}`}>
          {value ? displayFormatted(value) : placeholder}
        </span>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {value && !disabled && (
            <span
              role="button"
              onClick={handleClearClick}
              title="Clear date"
              className="p-0.5 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
            >
              <X className="w-3 h-3 text-slate-400 hover:text-red-500" />
            </span>
          )}
          <CalendarIcon className={`w-3.5 h-3.5 transition-colors ${isOpen ? 'text-red-600' : 'text-slate-400'}`} />
        </div>
      </button>

      {/* Floating Card Popup */}
      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 ${
            align === 'right' ? 'right-0' : 'left-0'
          } z-50 w-72 bg-white rounded-[5px] border border-slate-200 shadow-2xl p-4 text-slate-800 animate-in fade-in zoom-in-95 duration-150 select-none`}
        >
          {/* Card Top Header */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
            {/* Prev Button */}
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Month & Year Title Toggle Button */}
            <button
              type="button"
              onClick={() => {
                if (viewMode === 'days') setViewMode('months');
                else if (viewMode === 'months') setViewMode('years');
                else setViewMode('days');
              }}
              className="px-2.5 py-1 rounded-lg hover:bg-slate-100 text-xs font-bold text-slate-800 hover:text-red-600 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>
                {viewMode === 'days' && `${MONTH_NAMES[currentMonth]} ${currentYear}`}
                {viewMode === 'months' && `${currentYear}`}
                {viewMode === 'years' && `${yearStart} – ${yearStart + 11}`}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Next Button */}
            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* View Mode: Days Grid */}
          {viewMode === 'days' && (
            <div>
              {/* Day of Week Header */}
              <div className="grid grid-cols-7 mb-1.5">
                {WEEKDAYS.map((w, idx) => (
                  <div
                    key={w}
                    className={`text-[10px] font-bold text-center py-1 ${
                      idx === 0 ? 'text-red-500' : 'text-slate-400'
                    }`}
                  >
                    {w}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectDate(item.year, item.month, item.day)}
                    className={`h-8 w-8 mx-auto text-xs flex items-center justify-center rounded-xl transition-all cursor-pointer font-medium ${
                      item.isSelected
                        ? 'bg-red-600 text-white font-bold shadow-md shadow-red-500/30 scale-105'
                        : item.isToday
                        ? 'border border-red-500 text-red-600 font-bold bg-red-50/50 hover:bg-red-100'
                        : item.isCurrentMonth
                        ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        : 'text-slate-300 hover:bg-slate-50 hover:text-slate-500'
                    }`}
                  >
                    {item.day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* View Mode: Months Grid */}
          {viewMode === 'months' && (
            <div className="grid grid-cols-3 gap-2 py-2">
              {SHORT_MONTHS.map((mName, idx) => {
                const isSelectedMonth = currentMonth === idx;
                return (
                  <button
                    key={mName}
                    type="button"
                    onClick={() => {
                      setCurrentMonth(idx);
                      setViewMode('days');
                    }}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelectedMonth
                        ? 'bg-red-600 text-white font-bold shadow-md shadow-red-500/20'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {mName}
                  </button>
                );
              })}
            </div>
          )}

          {/* View Mode: Years Grid */}
          {viewMode === 'years' && (
            <div className="grid grid-cols-3 gap-2 py-2">
              {yearsList.map(yr => {
                const isSelectedYr = currentYear === yr;
                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => {
                      setCurrentYear(yr);
                      setViewMode('months');
                    }}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelectedYr
                        ? 'bg-red-600 text-white font-bold shadow-md shadow-red-500/20'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {yr}
                  </button>
                );
              })}
            </div>
          )}

          {/* Card Footer: Quick Shortcuts */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-[11px]">
            <button
              type="button"
              onClick={handleTodayClick}
              className="font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
            >
              Today
            </button>
            <div className="flex items-center gap-2">
              {value && (
                <button
                  type="button"
                  onClick={handleClearClick}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CustomDatePicker;
