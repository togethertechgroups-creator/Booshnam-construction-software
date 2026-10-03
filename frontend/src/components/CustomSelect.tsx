import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface SelectOption {
  label: string;
  value: string;
  dotColor?: string; // Optional dot indicator class, e.g., 'bg-emerald-500'
  description?: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (string | SelectOption)[];
  placeholder?: string;
  prefix?: string;
  icon?: React.ReactNode;
  badge?: string | number;
  className?: string;
  triggerClassName?: string;
  dropdownClassName?: string;
  align?: 'left' | 'right';
  disabled?: boolean;
  variant?: 'brand' | 'purple' | 'slate' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  searchable?: boolean;
  showCheckmark?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  prefix,
  icon,
  badge,
  className = '',
  triggerClassName = '',
  dropdownClassName = '',
  align = 'left',
  disabled = false,
  variant = 'brand',
  size = 'md',
  searchable,
  showCheckmark = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize options
  const normalizedOptions: SelectOption[] = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'string') {
        return { label: opt, value: opt };
      }
      return opt;
    });
  }, [options]);

  const selectedOption = normalizedOptions.find((o) => o.value === value) ||
    normalizedOptions.find((o) => o.value.toLowerCase() === (value || '').toLowerCase()) || {
    label: value || placeholder,
    value: value || '',
  };

  // Auto-enable search if there are 8 or more items
  const shouldShowSearch = searchable !== undefined ? searchable : normalizedOptions.length >= 8;

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.description && opt.description.toLowerCase().includes(q)) ||
        opt.value.toLowerCase().includes(q)
    );
  }, [normalizedOptions, searchQuery]);

  // Click outside to dismiss
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      // Focus search input on open
      if (shouldShowSearch) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, shouldShowSearch]);

  // Helper for status dot colors
  const getStatusDot = (val: string) => {
    const lower = val.toLowerCase();
    if (
      lower === 'normal' ||
      lower === 'ongoing' ||
      lower === 'complete' ||
      lower === 'completed' ||
      lower === 'active' ||
      lower === 'on time' ||
      lower === 'on track'
    ) {
      return 'bg-emerald-500';
    }
    if (
      lower === 'at risk' ||
      lower === 'rejected' ||
      lower === 'critical' ||
      lower === 'urgent' ||
      lower === 'blocked' ||
      lower === 'high'
    ) {
      return 'bg-rose-500';
    }
    if (
      lower === 'onhold' ||
      lower === 'pending' ||
      lower === 'in review' ||
      lower === 'in progress' ||
      lower === 'planning' ||
      lower === 'medium' ||
      lower === 'supervisor verified'
    ) {
      return 'bg-amber-500';
    }
    if (lower === 'not started' || lower === 'low' || lower === 'paid') {
      return 'bg-sky-400';
    }
    return null;
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'slate':
      case 'subtle':
        return {
          openTrigger: 'ring-2 ring-slate-400/20 border-slate-400 shadow-sm',
          chevronOpen: 'text-slate-700',
          itemActive: 'bg-slate-100 text-slate-900 font-bold',
          checkColor: 'text-slate-700',
          searchFocus: 'focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20',
        };
      case 'purple':
      case 'brand':
      default:
        return {
          openTrigger: 'ring-2 ring-red-500/20 border-red-500 shadow-xs',
          chevronOpen: 'text-red-600',
          itemActive: 'bg-red-50 text-red-700 font-bold',
          checkColor: 'text-red-600',
          searchFocus: 'focus:border-red-500 focus:ring-1 focus:ring-red-500/20',
        };
    }
  };

  const styles = getVariantStyles();

  // Size styling
  const sizeClasses = {
    sm: 'h-8 px-2.5 text-xs py-1',
    md: 'h-9 px-3 text-xs py-1.5',
    lg: 'h-10 px-3.5 text-sm py-2',
  }[size];

  const dot = selectedOption.dotColor || getStatusDot(selectedOption.value);

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${isOpen ? 'z-30' : ''} ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 transition-all duration-150 cursor-pointer select-none text-left shadow-2xs hover:border-slate-300 hover:bg-slate-50/50 ${
          isOpen ? styles.openTrigger : ''
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''} ${sizeClasses} ${triggerClassName}`}
      >
        <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
          {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
          {prefix && <span className="text-slate-400 font-normal shrink-0">{prefix}</span>}
          {dot && <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />}
          <span className="truncate">{selectedOption.label}</span>
          {badge !== undefined && (
            <span className="ml-1 px-1.5 py-0.5 bg-slate-100 text-slate-600 font-bold text-[10px] rounded-md">
              {badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? `rotate-180 ${styles.chevronOpen}` : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Card */}
      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 ${
            align === 'right' ? 'right-0' : 'left-0'
          } z-50 w-full min-w-[200px] max-w-sm bg-white rounded-xl border border-slate-200/90 shadow-2xl p-1.5 text-xs text-slate-800 animate-in fade-in zoom-in-95 duration-150 select-none ring-1 ring-black/5 ${dropdownClassName}`}
        >
          {/* Search bar inside dropdown if enabled/many options */}
          {shouldShowSearch && (
            <div className="p-1 mb-1 border-b border-slate-100">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className={`w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 outline-none ${styles.searchFocus}`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto py-0.5 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-center text-slate-400 text-xs italic">
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                const optDot = opt.dotColor || getStatusDot(opt.value);

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2.5 transition-colors cursor-pointer text-xs rounded-lg group ${
                      isSelected
                        ? styles.itemActive
                        : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2 truncate">
                        {opt.icon && <span className="text-slate-400 shrink-0">{opt.icon}</span>}
                        {optDot && <span className={`w-2 h-2 rounded-full shrink-0 ${optDot}`} />}
                        <span className="truncate">{opt.label}</span>
                        {opt.badge !== undefined && (
                          <span className="ml-auto px-1.5 py-0.5 bg-slate-100 text-slate-500 font-semibold text-[10px] rounded-md">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.description && (
                        <span className="text-[10px] text-slate-400 truncate mt-0.5">
                          {opt.description}
                        </span>
                      )}
                    </div>
                    {showCheckmark && isSelected && (
                      <Check className={`w-4 h-4 ${styles.checkColor} shrink-0`} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
