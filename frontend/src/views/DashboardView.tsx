import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, AlertTriangle, Users, CheckCircle2, 
  Clock, DollarSign, ArrowUpRight, ArrowDownRight, 
  Layers, HardHat, Calendar, ShieldCheck,
  Maximize2, Minimize2
} from 'lucide-react';
import { Project, Role } from '../types';
import { UserProfileDropdown } from '../components/UserProfileDropdown';
import { toggleBrowserFullscreen, addFullscreenChangeListener } from '../lib/fullscreenService';

interface DashboardViewProps {
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject: (p: Project) => void;
  onNavigate: (view: string) => void;
  activeRole: Role;
  canViewCost: boolean;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  selectedProject,
  onSelectProject,
  onNavigate,
  canViewCost,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  const activeProj = selectedProject || projects[0];

  const totalPortfolioBudget = projects.reduce((acc, p) => {
    const b = Number(p.estimated_budget || (p as any).project_value || 0);
    const inVal = Number(p.cash_in || 0);
    return acc + (b > 0 ? b : inVal);
  }, 0);
  const totalPortfolioActual = projects.reduce((acc, p) => acc + Number(p.actual_cost || p.cash_out || 0), 0);
  const portfolioBurnRate = totalPortfolioBudget > 0 ? (totalPortfolioActual / totalPortfolioBudget * 100).toFixed(1) : '0';

  const formatCompactCost = (amt: number = 0) => {
    if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(2)} Cr`;
    if (amt >= 100000) return `₹${(amt / 100000).toFixed(2)} L`;
    return `₹${amt.toLocaleString('en-IN')}`;
  };

  // Fullscreen State & Toggle
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const unsub = addFullscreenChangeListener((fs) => {
      setIsFullscreen(fs);
    });
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      unsub();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  const toggleFullscreen = async () => {
    const nextState = !isFullscreen;
    setIsFullscreen(nextState);
    try {
      await toggleBrowserFullscreen();
    } catch (e) {}
  };

  return (
    <div className={`flex-1 flex flex-col min-w-0 bg-white transition-all duration-300 ${
      isFullscreen ? `fixed top-0 right-0 bottom-0 z-[100] overflow-y-auto bg-white ${isSidebarOpen ? 'left-64' : 'left-[72px]'}` : ''
    }`}>
      {/* Edge-to-edge Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white px-6 py-4 border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-[26px] font-bold text-[#262626] font-heading tracking-tight">
              Executive Site Overview
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('site_ops')}
            className="px-3.5 py-2 bg-brand hover:bg-brand-dark text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <HardHat className="w-4 h-4" />
            <span>Review Today's DPR</span>
          </button>
          <button
            onClick={() => onNavigate('approvals')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-all flex items-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-brand" />
            <span>Pending Approvals (2)</span>
          </button>
          <div className="h-6 w-px bg-slate-200 ml-1 mr-1 hidden sm:block" />
          {/* Expand / Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isFullscreen
                ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Full Screen'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Full Screen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-red-600" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <UserProfileDropdown showBell={true} />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Budget / Variance */}
        {canViewCost ? (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Portfolio Budget</span>
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-brand">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {formatCompactCost(totalPortfolioBudget)}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                <span>Spent: <strong>{formatCompactCost(totalPortfolioActual)}</strong></span>
                <span className="text-brand font-bold">({portfolioBurnRate}%)</span>
              </div>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-brand h-full rounded-full" 
                style={{ width: `${Math.min(Number(portfolioBurnRate), 100)}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Active Sites</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-3">
              {projects.length} Projects
            </div>
            <div className="text-xs text-slate-500 mt-1">
              All sites actively reporting DPR & GPS
            </div>
          </div>
        )}

        {/* Labor On Site Today */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Verified Labor Today</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              48 Workers
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-700 font-medium mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>100% Inside GPS Geofence</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-3">
            Masons: 14 • Barbenders: 18 • Helpers: 16
          </div>
        </div>

        {/* Site DPR Reports Status */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Daily Progress Reports</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-brand">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              100%
              <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 font-bold rounded">
                Filed Today
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              All active sites submitted DPR with labor logs & photos
            </div>
          </div>
          <button 
            onClick={() => onNavigate('site_ops')}
            className="text-xs font-semibold text-brand hover:underline mt-3 inline-block"
          >
            View DPR Reports →
          </button>
        </div>

        {/* Procurement 3-Way Match Status */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Procurement 3-Way Match</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              100% Verified
            </div>
            <div className="text-xs text-slate-500 mt-1">
              PO-0089 matched GRN-0045 & INV-081
            </div>
          </div>
          <button 
            onClick={() => onNavigate('procurement')}
            className="text-xs font-semibold text-brand hover:underline mt-3 inline-block"
          >
            Track Order Flow →
          </button>
        </div>
      </div>

      {/* Featured Active Project Deep Dive Card */}
      {activeProj && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-[10px] font-bold">
                  {activeProj.code}
                </span>
                <h2 className="text-lg font-bold text-slate-900">{activeProj.name}</h2>
                <span className="text-xs text-slate-500">({activeProj.project_type})</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Client: <strong>{activeProj.client_name}</strong> • Location: {activeProj.location}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onSelectProject?.(activeProj);
                  onNavigate('projects');
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
              >
                View WBS Schedule
              </button>
              <button
                onClick={() => onNavigate('budget')}
                className="px-3 py-1.5 bg-brand text-white rounded-lg text-xs font-semibold hover:bg-brand-dark transition-colors"
              >
                Cost Plan & BOQ
              </button>
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Progress S-Curve summary */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Milestone Progress</span>
                <span className="font-bold text-brand">{activeProj.progress_percentage}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-brand h-full rounded-full transition-all duration-500"
                  style={{ width: `${activeProj.progress_percentage}%` }}
                ></div>
              </div>
              <div className="text-xs text-slate-500 leading-relaxed">
                Superstructure Post-Tensioned slab for Floor 9 in progress. 44.5% overall physical completion achieved.
              </div>
            </div>

            {/* Financial Health */}
            {canViewCost && (
              <div className="space-y-2 border-l border-slate-100 pl-0 md:pl-6">
                <span className="text-xs font-semibold text-slate-700 block">Project Cost Control</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-lg">
                    <div className="text-slate-400 text-[10px] uppercase">Budget</div>
                    <div className="font-bold text-slate-800 mt-0.5">
                      {formatCompactCost(activeProj.estimated_budget || (activeProj as any).project_value || activeProj.cash_in || 0)}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg">
                    <div className="text-slate-400 text-[10px] uppercase">Actual Cost</div>
                    <div className="font-bold text-slate-800 mt-0.5">
                      {formatCompactCost(activeProj.actual_cost || activeProj.cash_out || 0)}
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>
                    Variance: {formatCompactCost(Math.max(0, (activeProj.estimated_budget || activeProj.cash_in || 0) - (activeProj.actual_cost || activeProj.cash_out || 0)))} remaining
                  </span>
                </div>
              </div>
            )}

            {/* Quick Actions & Recent Site Log */}
            <div className="space-y-2 border-l border-slate-100 pl-0 md:pl-6">
              <span className="text-xs font-semibold text-slate-700 block">Today's Site Execution</span>
              <div className="text-xs text-slate-600 bg-amber-50/70 border border-amber-200/60 p-2.5 rounded-lg">
                <div className="font-bold text-amber-900 flex items-center justify-between">
                  <span>DPR-0118 (Submitted)</span>
                  <span className="text-[10px] bg-amber-100 px-1.5 py-0.5 rounded text-amber-800">Pending Signoff</span>
                </div>
                <div className="text-[11px] text-amber-800 mt-1 line-clamp-2">
                  Mesh tying on Floor 9 slab completed. Concrete batching pump power interruption resolved.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Portfolio Projects Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">All Active Construction Projects</h3>
          <span className="text-xs text-slate-500">{projects.length} Total Projects Managed</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div 
              key={p.id}
              onClick={() => onSelectProject(p)}
              className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${
                activeProj?.id === p.id 
                  ? 'border-brand ring-2 ring-brand/10 shadow-md' 
                  : 'border-slate-200 hover:border-slate-300 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    {p.code}
                  </span>
                  <h4 className="font-bold text-sm text-slate-900 mt-1.5 leading-snug">{p.name}</h4>
                  <div className="text-xs text-slate-400 mt-0.5">{p.client_name}</div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  p.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {p.status}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500">Progress</span>
                  <span className="font-bold text-slate-800">{p.progress_percentage}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-brand h-full rounded-full" 
                    style={{ width: `${p.progress_percentage}%` }}
                  ></div>
                </div>
              </div>

              {canViewCost && (
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-50">
                  <span>Budget: ₹{(p.estimated_budget! / 10000000).toFixed(1)} Cr</span>
                  <span className="text-slate-900 font-semibold">Spent: ₹{(p.actual_cost! / 10000000).toFixed(1)} Cr</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
};
