import React from 'react';
import { 
  Building2, ChevronDown, MapPin, Bell, Search, 
  CheckCircle2, User as UserIcon
} from 'lucide-react';
import { Project, Role, User } from '../types';

interface TopNavProps {
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject: (project: Project) => void;
  activeRole: Role;
  user: User;
  pendingApprovalsCount: number;
  onOpenApprovals: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  projects,
  selectedProject,
  onSelectProject,
  activeRole,
  user,
  pendingApprovalsCount,
  onOpenApprovals
}) => {
  const [showProjectDropdown, setShowProjectDropdown] = React.useState(false);

  return (
    <header className="h-16 bg-white border-b border-slate-200 fixed top-0 right-0 left-64 z-20 flex items-center justify-between px-6">
      {/* Project Selector & Location */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowProjectDropdown(!showProjectDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 hover:bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold text-slate-900 transition-colors shadow-sm"
          >
            <Building2 className="w-4 h-4 text-brand" />
            <div className="text-left">
              <div className="leading-tight truncate max-w-[200px]">
                {selectedProject ? selectedProject.name : 'Select Project'}
              </div>
              <div className="text-[10px] text-slate-400 font-normal">
                {selectedProject?.code} • {selectedProject?.project_type}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {showProjectDropdown && (
            <div className="absolute left-0 mt-1.5 w-72 bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Switch Active Project
              </div>
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectProject(p);
                    setShowProjectDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    selectedProject?.id === p.id ? 'bg-brand-50/50 text-brand font-bold' : 'text-slate-700'
                  }`}
                >
                  <div>
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-[11px] text-slate-400">{p.code} • {p.location}</div>
                  </div>
                  {selectedProject?.id === p.id && (
                    <CheckCircle2 className="w-4 h-4 text-brand shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Site Geofence Indicator */}
        {selectedProject && (
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/80">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>Site GPS: <strong>{selectedProject.latitude}, {selectedProject.longitude}</strong></span>
            <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-semibold ml-1">
              {selectedProject.geofence_radius_meters}m Geofence
            </span>
          </div>
        )}
      </div>

      {/* Search & Actions */}
      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search projects, POs, DPRs, drawings..."
            className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand w-64 transition-all"
          />
        </div>

        {/* Approvals Bell */}
        <button
          onClick={onOpenApprovals}
          className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          title="Pending Approvals"
        >
          <Bell className="w-4 h-4" />
          {pendingApprovalsCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-brand text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {pendingApprovalsCount}
            </span>
          )}
        </button>

        {/* Current User Card */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            {user.first_name[0]}{user.last_name[0]}
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-semibold text-slate-800 leading-tight">
              {user.first_name} {user.last_name}
            </div>
            <div className="text-[10px] text-brand font-medium leading-tight">
              {activeRole.name}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
