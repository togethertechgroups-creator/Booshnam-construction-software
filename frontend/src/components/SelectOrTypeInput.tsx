import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check, UserPlus } from 'lucide-react';

export interface SelectOption {
  name: string;
  label?: string;
  roleHint?: string;
}

interface SelectOrTypeInputProps {
  value: string;
  onChange: (val: string) => void;
  options: (string | SelectOption)[];
  placeholder?: string;
  className?: string;
}

export const SelectOrTypeInput: React.FC<SelectOrTypeInputProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select or type a name...',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options to SelectOption objects
  const normalizedOptions: SelectOption[] = options.map(opt =>
    typeof opt === 'string' ? { name: opt, label: opt } : opt
  );

  // Filter based on input value
  const searchLower = (value || '').toLowerCase().trim();
  const filtered = normalizedOptions.filter(opt =>
    !searchLower ||
    opt.name.toLowerCase().includes(searchLower) ||
    (opt.label && opt.label.toLowerCase().includes(searchLower)) ||
    (opt.roleHint && opt.roleHint.toLowerCase().includes(searchLower))
  );

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (name: string) => {
    onChange(name);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(true);
  };

  const isCustomName = Boolean(
    value.trim() && !normalizedOptions.some(o => o.name.toLowerCase() === value.trim().toLowerCase())
  );

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`w-full pl-3 ${value ? 'pr-14' : 'pr-8'} py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition shadow-2xs`}
        />

        <div className="absolute right-2 flex items-center gap-0.5">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer transition-colors"
            title="Toggle suggestions list"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
            <span>Select from team or type custom name</span>
            {filtered.length > 0 && <span>{filtered.length} available</span>}
          </div>

          {filtered.length > 0 ? (
            filtered.map((opt, idx) => {
              const isSelected = value.trim().toLowerCase() === opt.name.toLowerCase();
              return (
                <button
                  key={`${opt.name}-${idx}`}
                  type="button"
                  onClick={() => handleSelect(opt.name)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-red-50/70 transition-colors cursor-pointer ${
                    isSelected ? 'font-bold text-red-600 bg-red-50/40' : 'text-slate-700'
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="font-semibold truncate">{opt.label || opt.name}</span>
                    {opt.roleHint && <span className="text-[10px] text-slate-400 truncate">{opt.roleHint}</span>}
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-red-600 shrink-0" />}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-xs text-slate-400 text-center">
              No matching team members in list
            </div>
          )}

          {/* If the user typed a custom name that is not in the list */}
          {isCustomName && (
            <div className="border-t border-slate-100 px-2 pt-1.5 mt-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span className="truncate">Use custom name: <strong>"{value.trim()}"</strong></span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
