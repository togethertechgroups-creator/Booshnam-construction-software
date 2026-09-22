import React, { useState } from 'react';
import { 
  X, MapPin, CheckCircle2, Camera, HardHat, 
  AlertTriangle, Check, Smartphone, Send
} from 'lucide-react';
import { Project } from '../types';

interface MobileSiteSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
}

export const MobileSiteSimulatorModal: React.FC<MobileSiteSimulatorModalProps> = ({
  isOpen,
  onClose,
  project
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'attendance' | 'snag' | 'dpr'>('attendance');
  const [clockedIn, setClockedIn] = useState(false);
  const [snagLogged, setSnagLogged] = useState(false);
  const [dprLogged, setDprLogged] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-sm p-4 animate-fade-in">
      {/* Mobile Device Frame */}
      <div className="w-full max-w-[390px] h-[780px] bg-slate-900 rounded-[48px] p-3 shadow-2xl ring-8 ring-slate-800 relative flex flex-col overflow-hidden">
        {/* Notch / Speaker */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-32 h-5 bg-slate-950 rounded-full z-20 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-slate-900 mr-2"></div>
          <div className="w-10 h-1 bg-slate-800 rounded-full"></div>
        </div>

        {/* Screen Content */}
        <div className="w-full h-full bg-slate-50 rounded-[38px] overflow-hidden flex flex-col relative pt-7">
          {/* Mobile Top Bar */}
          <div className="px-5 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-brand uppercase tracking-wider">SiteOps Mobile</div>
              <div className="text-xs font-bold text-slate-900 truncate max-w-[180px]">
                {project?.name || 'Site Field App'}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Screen Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Tab 1: Attendance GPS */}
            {activeTab === 'attendance' && (
              <div className="space-y-4 text-center">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="w-12 h-12 rounded-full bg-brand-50 text-brand flex items-center justify-center mx-auto">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900">GPS Site Clock-in</h3>
                  <p className="text-[11px] text-slate-500">
                    Geofenced check-in. Current location verified within {project?.geofence_radius_meters || 300}m boundary.
                  </p>

                  <div className="p-2.5 bg-slate-50 rounded-lg text-xs font-mono text-slate-600">
                    Distance: <strong>12.4 meters</strong> from site center
                  </div>
                </div>

                {!clockedIn ? (
                  <button
                    onClick={() => setClockedIn(true)}
                    className="w-full py-5 bg-brand hover:bg-brand-dark active:scale-[0.98] text-white rounded-2xl font-black text-base tracking-wide shadow-lg shadow-brand/30 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-6 h-6" />
                    <span>CLOCK IN (GPS)</span>
                  </button>
                ) : (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                    <div className="font-bold text-sm">Clock-in Verified!</div>
                    <div className="text-[11px] text-emerald-700">
                      Timestamp: 08:15 AM • Status: Present
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Snag Quick Snap */}
            {activeTab === 'snag' && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-900">Report Site Defect / Snag</div>
                
                <input 
                  type="text" 
                  placeholder="Location (e.g. Tower A Floor 8)"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs"
                  defaultValue="Tower A, Column C14"
                />

                <textarea
                  placeholder="Defect description..."
                  rows={3}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs"
                  defaultValue="Cover block displaced before concrete pour. Reinforcement touching shuttering."
                />

                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center bg-white space-y-1">
                  <Camera className="w-6 h-6 text-slate-400 mx-auto" />
                  <div className="text-[11px] font-semibold text-slate-700">Attach Defect Photo</div>
                  <div className="text-[10px] text-slate-400">Camera auto-geotags lat/lng</div>
                </div>

                {!snagLogged ? (
                  <button
                    onClick={() => setSnagLogged(true)}
                    className="w-full py-3 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-bold shadow-md shadow-brand/20 transition-all"
                  >
                    Submit Snag to PM
                  </button>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs font-bold text-emerald-800">
                    Snag SNAG-0027 Registered!
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Quick DPR */}
            {activeTab === 'dpr' && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-900">Today's DPR Summary</div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                    <span className="text-slate-400 text-[10px] block">Weather</span>
                    <span className="font-bold text-slate-800">Clear 30°C</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                    <span className="text-slate-400 text-[10px] block">Headcount</span>
                    <span className="font-bold text-slate-800">38 Workers</span>
                  </div>
                </div>

                <textarea
                  placeholder="Activities executed today..."
                  rows={4}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs"
                  defaultValue="Floor 9 post-tensioned tendon layout completed. Beam shuttering aligned. Ready for structural inspection."
                />

                {!dprLogged ? (
                  <button
                    onClick={() => setDprLogged(true)}
                    className="w-full py-3 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-bold shadow-md shadow-brand/20 transition-all"
                  >
                    Submit DPR for Signoff
                  </button>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs font-bold text-emerald-800">
                    DPR Submitted to PM!
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Tabs for Mobile (Att, Snags, DPR) */}
          <div className="h-16 bg-white border-t border-slate-200 px-6 flex items-center justify-around">
            <button
              onClick={() => setActiveTab('attendance')}
              className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
                activeTab === 'attendance' ? 'text-brand' : 'text-slate-400'
              }`}
            >
              <MapPin className="w-5 h-5" />
              <span>Clock-in</span>
            </button>
            <button
              onClick={() => setActiveTab('snag')}
              className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
                activeTab === 'snag' ? 'text-brand' : 'text-slate-400'
              }`}
            >
              <Camera className="w-5 h-5" />
              <span>eSnag</span>
            </button>
            <button
              onClick={() => setActiveTab('dpr')}
              className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
                activeTab === 'dpr' ? 'text-brand' : 'text-slate-400'
              }`}
            >
              <HardHat className="w-5 h-5" />
              <span>DPR</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
