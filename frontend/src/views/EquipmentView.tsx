import React from 'react';
import { Truck, Plus, CheckCircle2, AlertTriangle, Clock, Wrench } from 'lucide-react';
import { Asset, Project } from '../types';
import { UserProfileDropdown } from '../components/UserProfileDropdown';

interface EquipmentViewProps {
  project: Project | null;
  assets: Asset[];
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const EquipmentView: React.FC<EquipmentViewProps> = ({ 
  project, 
  assets,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
      {/* Edge-to-edge Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-brand text-white text-[10px] font-bold rounded">
                PLANT & MACHINERY
              </span>
              <h1 className="text-xl font-bold text-slate-900">Equipment & Heavy Asset Fleet</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Owned & leased heavy machinery, utilization meter hours, and maintenance tracking.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-3.5 py-2 bg-brand hover:bg-brand-dark text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 self-start md:self-auto cursor-pointer">
            <Plus className="w-4 h-4" />
            <span>Allocate Machine to Site</span>
          </button>
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <UserProfileDropdown showBell={true} />
        </div>
      </div>

      {/* Asset Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {assets.map((asset) => (
          <div key={asset.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 hover:border-slate-300 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xs font-bold bg-slate-100 text-slate-900 px-2 py-0.5 rounded">
                  {asset.asset_code}
                </span>
                <h3 className="font-bold text-sm text-slate-900 mt-2">{asset.name}</h3>
                <div className="text-xs text-slate-400 mt-0.5">{asset.category}</div>
              </div>

              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {asset.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg text-xs">
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Ownership</span>
                <span className="font-semibold text-slate-800">{asset.ownership}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Hourly Cost Rate</span>
                <span className="font-bold text-brand font-mono">₹{asset.hourly_cost_rate}/hr</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Meter Hours</span>
                <span className="font-mono font-semibold text-slate-800">{asset.meter_hours} hrs</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Assigned Site</span>
                <span className="font-semibold text-slate-800 truncate block">{asset.current_project_name || 'Yard'}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-slate-400" /> Maintenance OK
              </span>
              <button className="text-brand font-bold hover:underline">
                Log Hours →
              </button>
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
};
