import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Filter, X } from 'lucide-react';

export interface DepartmentFilterItem {
  id: string;
  name: string;
  shortName?: string;
  count?: number;
}

interface DepartmentMultiSelectFilterProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  departments: DepartmentFilterItem[];
  totalCount?: number;
  labelPrefix?: string;
  className?: string;
}

export const DepartmentMultiSelectFilter: React.FC<DepartmentMultiSelectFilterProps> = ({
  selectedIds,
  onChange,
  departments,
  totalCount,
  labelPrefix = 'Dept',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
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

  const isAllSelected = selectedIds.includes('ALL') || selectedIds.length === 0;

  const handleToggleAll = () => {
    onChange(['ALL']);
  };

  const handleToggleDepartment = (deptId: string) => {
    if (isAllSelected) {
      // Switching from ALL to specific single department
      onChange([deptId]);
      return;
    }

    if (selectedIds.includes(deptId)) {
      const next = selectedIds.filter(id => id !== deptId);
      if (next.length === 0) {
        onChange(['ALL']);
      } else {
        onChange(next);
      }
    } else {
      const next = [...selectedIds, deptId];
      // If all individual departments are now selected, simplify to ALL
      if (next.length >= departments.length) {
        onChange(['ALL']);
      } else {
        onChange(next);
      }
    }
  };

  // Determine button trigger label
  const getTriggerLabel = () => {
    if (isAllSelected) {
      const countText = totalCount !== undefined ? ` (${totalCount})` : '';
      return `All Departments${countText}`;
    }
    if (selectedIds.length === 1) {
      const dept = departments.find(d => d.id === selectedIds[0]);
      if (dept) {
        const countText = dept.count !== undefined ? ` (${dept.count})` : '';
        return `${dept.shortName || dept.name}${countText}`;
      }
    }
    const countSum = selectedIds.reduce((sum, id) => {
      const dept = departments.find(d => d.id === id);
      return sum + (dept?.count || 0);
    }, 0);
    return `${selectedIds.length} Depts (${countSum})`;
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`h-9 px-3 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs ${
          isOpen
            ? 'bg-white border-red-500 ring-2 ring-red-100 text-slate-900'
            : !isAllSelected
            ? 'bg-red-50/70 border-red-200 text-red-700 hover:bg-red-50'
            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white'
        }`}
        title="Filter by Department"
      >
        <div className="flex items-center gap-1.5 truncate">
          <Filter className={`w-3.5 h-3.5 shrink-0 ${!isAllSelected ? 'text-red-600' : 'text-slate-400'}`} />
          <span className="text-slate-400 font-normal shrink-0">{labelPrefix}:</span>
          <span className="font-bold truncate max-w-[170px]">{getTriggerLabel()}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-red-500' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Filter by Department
            </span>
            {!isAllSelected && (
              <button
                type="button"
                onClick={handleToggleAll}
                className="text-[11px] font-bold text-red-600 hover:text-red-700 cursor-pointer flex items-center gap-0.5"
              >
                <span>Reset to All</span>
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto py-1 space-y-0.5">
            {/* All Departments Option */}
            <label
              onClick={handleToggleAll}
              className={`flex items-center justify-between px-3 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                isAllSelected ? 'bg-red-50/80 text-red-900 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                    isAllSelected
                      ? 'bg-red-600 border-red-600 text-white shadow-xs'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {isAllSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span>All Departments</span>
              </div>
              {totalCount !== undefined && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isAllSelected ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {totalCount}
                </span>
              )}
            </label>

            <div className="h-px bg-slate-100 my-1 mx-2" />

            {/* Individual Departments */}
            {departments.map((dept) => {
              const isChecked = isAllSelected || selectedIds.includes(dept.id);
              const isExplicitlyChecked = !isAllSelected && selectedIds.includes(dept.id);

              return (
                <label
                  key={dept.id}
                  onClick={(e) => {
                    e.preventDefault();
                    handleToggleDepartment(dept.id);
                  }}
                  className={`flex items-center justify-between px-3 py-1.5 text-xs cursor-pointer transition-colors ${
                    isExplicitlyChecked
                      ? 'bg-red-50/60 text-red-900 font-bold'
                      : isAllSelected
                      ? 'text-slate-800 hover:bg-slate-50'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate pr-2">
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                        isExplicitlyChecked
                          ? 'bg-red-600 border-red-600 text-white shadow-xs'
                          : isAllSelected
                          ? 'bg-slate-200 border-slate-300 text-slate-600'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="truncate">{dept.name}</span>
                  </div>
                  {dept.count !== undefined && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                        isExplicitlyChecked
                          ? 'bg-red-100 text-red-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {dept.count}
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          {!isAllSelected && (
            <div className="px-3 pt-2 pb-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>{selectedIds.length} selected</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
