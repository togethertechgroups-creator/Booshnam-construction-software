import React from 'react';
import { Menu } from 'lucide-react';

export interface SidebarToggleButtonProps {
  isSidebarOpen?: boolean;
  onToggle?: () => void;
  className?: string;
}

export const SidebarToggleButton: React.FC<SidebarToggleButtonProps> = ({
  isSidebarOpen = true,
  onToggle,
  className = ''
}) => {
  if (!onToggle) return null;

  return (
    <button
      onClick={onToggle}
      type="button"
      title={isSidebarOpen ? "Collapse Menu" : "Expand Menu (Hamburger)"}
      aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
      className={`p-2 rounded-xl bg-red-600 hover:bg-red-700 text-white border border-red-700/20 shadow-sm hover:shadow ring-2 ring-red-100 transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95 group ${className}`}
    >
      <Menu className="w-5 h-5 text-white transition-transform group-hover:scale-105" />
    </button>
  );
};
