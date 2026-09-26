import React, { useState } from 'react';
import { 
  HardHat, Calendar, Sun, CloudRain, Users, 
  Package, AlertCircle, CheckCircle2, Plus, Check
} from 'lucide-react';
import { Project, DPR } from '../types';
import { UserProfileDropdown } from '../components/UserProfileDropdown';

interface SiteOpsViewProps {
  project: Project | null;
  dprs: DPR[];
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const SiteOpsView: React.FC<SiteOpsViewProps> = ({ 
  project, 
  dprs,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  const [selectedDPR, setSelectedDPR] = useState<DPR>(dprs[0]);
  const [isApproved, setIsApproved] = useState<boolean>(selectedDPR?.status === 'APPROVED');

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
      {/* Edge-to-edge Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-brand text-white text-[10px] font-bold rounded">
                SITE OPERATIONS
              </span>
              <h1 className="text-xl font-bold text-slate-900">Daily Progress Reports (DPR)</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Standardized digital site log: work progress, manpower tally, material usage, and delays.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-3.5 py-2 bg-brand hover:bg-brand-dark text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 self-start md:self-auto cursor-pointer">
            <Plus className="w-4 h-4" />
            <span>Submit Today's DPR</span>
          </button>
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <UserProfileDropdown showBell={true} />
        </div>
      </div>

      {selectedDPR ? (
        <div className="space-y-6 p-6">
          {/* Top DPR Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm bg-slate-100 text-slate-900 px-2 py-0.5 rounded">
                  {selectedDPR.report_number}
                </span>
                <span className="text-sm font-semibold text-slate-700">Date: {selectedDPR.date}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isApproved || selectedDPR.status === 'APPROVED' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {isApproved ? 'APPROVED' : selectedDPR.status}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Prepared by: <strong className="text-slate-700">{selectedDPR.supervisor_name}</strong>
              </div>
            </div>

            {/* Weather Widget */}
            <div className="flex items-center gap-3 bg-amber-50/70 border border-amber-200/60 px-3.5 py-2 rounded-lg text-xs text-amber-900">
              <Sun className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <div className="font-bold">{selectedDPR.weather}</div>
                <div className="text-[11px] text-amber-700">{selectedDPR.temperature_celsius}°C • Full shift feasible</div>
              </div>
            </div>
          </div>

          {/* Section 1: Work Executed Today */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              1. Work Activities Executed
            </h3>
            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-800 whitespace-pre-line leading-relaxed font-mono border border-slate-100">
              {selectedDPR.work_summary}
            </div>
          </div>

          {/* Section 2: Delay Log */}
          {selectedDPR.delay_reasons && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                2. Site Stoppages & Delays
              </h3>
              <div className="bg-red-50/60 border border-red-200/60 p-3.5 rounded-xl text-xs text-red-900 leading-relaxed flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <div>{selectedDPR.delay_reasons}</div>
              </div>
            </div>
          )}

          {/* Section 3: Manpower Headcount Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              3. Site Manpower Headcount (38 Workers)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {selectedDPR.manpower_records?.map((m) => (
                <div key={m.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">{m.trade_name}</div>
                  <div className="text-xl font-black text-slate-900 mt-1">{m.headcount} <span className="text-xs font-normal text-slate-500">workers</span></div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{m.total_hours} total man-hours</div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Materials Consumed */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              4. Materials Consumed on Site Today
            </h3>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
              {selectedDPR.material_consumed?.map((mat) => (
                <div key={mat.id} className="p-3 flex items-center justify-between text-xs bg-white hover:bg-slate-50">
                  <div>
                    <div className="font-bold text-slate-800">{mat.material_name}</div>
                    <div className="text-[11px] text-slate-400">Activity: {mat.activity}</div>
                  </div>
                  <div className="font-mono font-bold text-slate-900">
                    {mat.quantity} {mat.unit}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PM Signoff Action Bar */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 p-4 rounded-xl">
            <div className="text-xs text-slate-500">
              Project Manager Review: Verify manpower and activities before permanent ledger locking.
            </div>

            {!isApproved ? (
              <button
                onClick={() => setIsApproved(true)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition-colors self-end"
              >
                <Check className="w-4 h-4" />
                <span>PM Sign-off & Lock DPR</span>
              </button>
            ) : (
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Signed Off by PM (Rajesh Kumar)
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-slate-200 m-6">
          <HardHat className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-semibold text-slate-600">No DPR Submitted Today</p>
          <p className="text-xs text-slate-400 mt-1">Click "Submit Today's DPR" to log site work progress, manpower, and materials.</p>
        </div>
      )}
    </div>
  );
};

