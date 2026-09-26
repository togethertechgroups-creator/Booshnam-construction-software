import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';

export interface CustomMonthPickerProps {
  value: string; // Format: "YYYY-MM"
  onChange: (value: string) => void;
  maxDate?: Date;
  onShowToast?: (msg: string) => void;
}

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const CustomMonthPicker: React.FC<CustomMonthPickerProps> = ({
  value,
  onChange,
  maxDate = new Date(),
  onShowToast
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value or default to current year
  const parsedYear = value ? parseInt(value.split('-')[0], 10) : new Date().getFullYear();
  const parsedMonth = value ? parseInt(value.split('-')[1], 10) - 1 : -1;

  const [viewYear, setViewYear] = useState(parsedYear);

  // Keep view in sync when value changes externally
  useEffect(() => {
    if (value) {
      setViewYear(parseInt(value.split('-')[0], 10));
    }
  }, [value]);

  // Click outside to dismiss
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectMonth = (monthIndex: number) => {
    const selectedDate = new Date(viewYear, monthIndex, 1);
    const max = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

    if (selectedDate > max) {
      if (onShowToast) {
        onShowToast(`Cannot select future months (${SHORT_MONTHS[monthIndex]} ${viewYear})`);
      }
      return;
    }

    const padMonth = monthIndex < 9 ? `0${monthIndex + 1}` : `${monthIndex + 1}`;
    onChange(`${viewYear}-${padMonth}`);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  const handleThisMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    const padMonth = today.getMonth() < 9 ? `0${today.getMonth() + 1}` : `${today.getMonth() + 1}`;
    onChange(`${today.getFullYear()}-${padMonth}`);
    setViewYear(today.getFullYear());
    setIsOpen(false);
  };

  const formatDisplay = () => {
    if (!value) return '----------, ----';
    const [y, m] = value.split('-');
    const mIndex = parseInt(m, 10) - 1;
    return `${SHORT_MONTHS[mIndex]}, ${y}`;
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center w-9 h-9 bg-white border ${value ? 'border-red-500 text-red-600 bg-red-50/50' : 'border-slate-200 text-slate-700'} rounded-lg hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 shadow-xs transition-colors cursor-pointer`}
        title={formatDisplay()}
      >
        <CalendarIcon className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 select-none">
          
          {/* Header */}
          <div className="p-3 border-b border-red-100/60 bg-white flex items-center justify-between">
            <button 
              type="button"
              onClick={() => setViewYear(prev => prev - 1)}
              className="p-1 hover:bg-red-50 rounded-lg text-slate-600 hover:text-red-600 transition-colors cursor-pointer"
            >
              {'<'}
            </button>
            <span className="text-sm font-bold text-slate-900">{viewYear}</span>
            <button 
              type="button"
              onClick={() => setViewYear(prev => prev + 1)}
              className="p-1 hover:bg-red-50 rounded-lg text-slate-600 hover:text-red-600 transition-colors cursor-pointer"
            >
              {'>'}
            </button>
          </div>

          {/* Month Grid */}
          <div className="p-3 grid grid-cols-4 gap-2">
            {SHORT_MONTHS.map((month, idx) => {
              const isSelected = viewYear === parsedYear && idx === parsedMonth;
              const isFuture = new Date(viewYear, idx, 1) > new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => handleSelectMonth(idx)}
                  className={`
                    py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer
                    ${isSelected 
                      ? 'bg-red-600 text-white shadow-sm font-bold' 
                      : isFuture 
                        ? 'text-slate-300 cursor-not-allowed hover:bg-transparent'
                        : 'text-slate-700 hover:bg-red-50 hover:text-red-600'
                    }
                  `}
                >
                  {month}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-100 flex items-center justify-between bg-white">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-semibold text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleThisMonth}
              className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline transition-colors cursor-pointer"
            >
              This month
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
