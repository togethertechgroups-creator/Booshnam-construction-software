import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, CheckCircle2, Clock, Plus, Camera, 
  MapPin, Check, User, ArrowRight,
  Maximize2, Minimize2
} from 'lucide-react';
import { Snag, Project } from '../types';
import { UserProfileDropdown } from '../components/UserProfileDropdown';
import { toggleBrowserFullscreen, addFullscreenChangeListener } from '../lib/fullscreenService';

interface SnagsViewProps {
  project: Project | null;
  snags: Snag[];
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const SnagsView: React.FC<SnagsViewProps> = ({ 
  project, 
  snags: initialSnags,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  const [snagsList, setSnagsList] = useState<Snag[]>(initialSnags);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredSnags = snagsList.filter(s => {
    if (statusFilter === 'ALL') return true;
    return s.status === statusFilter;
  });

  const handleResolve = (snagId: string) => {
    setSnagsList(prev => prev.map(s => s.id === snagId ? { ...s, status: 'RESOLVED' as const, resolution_notes: 'Remediated & curing completed.' } : s));
  };

  const handleClose = (snagId: string) => {
    setSnagsList(prev => prev.map(s => s.id === snagId ? { ...s, status: 'CLOSED' as const } : s));
  };

  // Fullscreen State & Toggle
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const unsub = addFullscreenChangeListener((fs) => { setIsFullscreen(fs); });
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false); };
    window.addEventListener('keydown', handleKeyDown);
    return () => { unsub(); window.removeEventListener('keydown', handleKeyDown); };
  }, [isFullscreen]);

  const toggleFullscreen = async () => {
    setIsFullscreen(prev => !prev);
    try { await toggleBrowserFullscreen(); } catch (e) {}
  };

  return (
    <div className={`flex-1 flex flex-col min-w-0 bg-white transition-all duration-300 ${
      isFullscreen ? `fixed top-0 right-0 bottom-0 z-[100] overflow-y-auto bg-white ${isSidebarOpen ? 'left-64' : 'left-[72px]'}` : ''
    }`}>
      {/* Edge-to-edge Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-[26px] font-bold text-[#262626] font-heading tracking-tight">Site Snag Lists & Observations</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-3.5 py-2 bg-brand hover:bg-brand-dark text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 self-start md:self-auto cursor-pointer">
            <Plus className="w-4 h-4" />
            <span>Log New Snag / Observation</span>
          </button>
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isFullscreen ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
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
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Snag Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSnags.length === 0 ? (
            <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl p-8 bg-slate-50/50">
              <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">No Snags or Observations Recorded</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                There are currently no active defect observations or snag list items for this project.
              </p>
            </div>
          ) : (
            filteredSnags.map((snag) => (
              <div key={snag.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 hover:border-slate-300 transition-all">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="tracking-tight font-bold text-xs bg-slate-100 text-slate-900 px-2 py-0.5 rounded">
                        {snag.snag_number}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        snag.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                        snag.severity === 'MAJOR' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {snag.severity}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm mt-1.5">{snag.title}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{snag.location_details || (snag as any).location || 'On Site'}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                    snag.status === 'OPEN' ? 'bg-red-50 text-red-700 border border-red-200' :
                    snag.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    snag.status === 'RESOLVED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                    'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {snag.status}
                  </span>
                </div>

                {/* Description & Trade */}
                <div className="space-y-2 text-xs">
                  <p className="text-slate-600">{snag.description}</p>
                  <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-50">
                    <span>Trade: <strong className="text-slate-700">{snag.category || (snag as any).trade || 'General'}</strong></span>
                    <span>Due: <strong className="text-slate-700">{snag.due_date}</strong></span>
                  </div>
                </div>

                {/* Rectification Notes if any */}
                {snag.resolution_notes && (
                  <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 border border-slate-100">
                    <span className="font-semibold text-slate-700">Rectification Log:</span>
                    <p className="text-slate-600">{snag.resolution_notes}</p>
                  </div>
                )}

                {/* Footer / Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <User className="w-3.5 h-3.5" />
                    <span>Assigned: <strong className="text-slate-700">{snag.assigned_to_name}</strong></span>
                  </div>

                  <div>
                    {snag.status === 'OPEN' || snag.status === 'IN_PROGRESS' ? (
                      <button
                        onClick={() => handleResolve(snag.id)}
                        className="px-3 py-1 bg-brand hover:bg-brand-dark text-white rounded text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Mark Rectified
                      </button>
                    ) : snag.status === 'RESOLVED' ? (
                      <button
                        onClick={() => handleClose(snag.id)}
                        className="px-3 py-1 bg-slate-900 hover:bg-black text-white rounded text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Verify & Close
                      </button>
                    ) : (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Closed & Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
