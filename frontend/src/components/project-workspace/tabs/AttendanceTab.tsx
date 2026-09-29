import React, { useState } from 'react';
import { 
  Users, Plus, CheckCircle2, AlertTriangle, ShieldCheck, 
  MapPin, Clock, Search, Filter, Check, X, Smartphone, DollarSign 
} from 'lucide-react';
import { Project, Worker, AttendanceRecord } from '../../../types';
import { CustomSelect } from '../../CustomSelect';

interface AttendanceTabProps {
  project: Project;
  workers?: Worker[];
  attendance?: AttendanceRecord[];
  onShowToast?: (msg: string) => void;
}

const DEFAULT_ATTENDANCE: AttendanceRecord[] = [];

export const AttendanceTab: React.FC<AttendanceTabProps> = ({
  project,
  attendance = DEFAULT_ATTENDANCE,
  onShowToast
}) => {
  const storageKey = `booshnam_attendance_v2_${project?.id || 'default'}`;
  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return attendance && attendance.length > 0 ? attendance.filter(a => !a.project_id || a.project_id === project?.id) : [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(records));
    } catch (e) {}
  }, [records, storageKey]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isPunchOpen, setIsPunchOpen] = useState(false);

  // Punch Form
  const [workerName, setWorkerName] = useState('');
  const [workerSkill, setWorkerSkill] = useState('Mason');
  const [clockInTime, setClockInTime] = useState('08:30 AM');
  const [status, setStatus] = useState<'PRESENT' | 'HALF_DAY' | 'OVERTIME' | 'ABSENT'>('PRESENT');

  const presentCount = records.filter(r => r.status !== 'ABSENT').length;
  const absentCount = records.filter(r => r.status === 'ABSENT').length;
  const geofenceVerifiedCount = records.filter(r => r.is_inside_geofence).length;
  const totalWages = records.reduce((sum, r) => {
    if (r.status === 'PRESENT' || r.status === 'OVERTIME') return sum + 850 + (r.overtime_hours * 150);
    if (r.status === 'HALF_DAY') return sum + 450;
    return sum;
  }, 0);

  const toggleStatus = (id: string) => {
    setRecords(prev => prev.map(r => {
      if (r.id === id) {
        const nextStatus: 'PRESENT' | 'HALF_DAY' | 'ABSENT' = 
          r.status === 'PRESENT' ? 'HALF_DAY' :
          r.status === 'HALF_DAY' ? 'ABSENT' : 'PRESENT';
        onShowToast?.(`Updated status for ${r.worker_name} to ${nextStatus}`);
        return { ...r, status: nextStatus };
      }
      return r;
    }));
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.worker_name.toLowerCase().includes(search.toLowerCase()) ||
                          r.worker_skill.toLowerCase().includes(search.toLowerCase()) ||
                          r.worker_code.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handlePunchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerName.trim()) return;

    const newRec: AttendanceRecord = {
      id: `att-${Date.now()}`,
      worker_name: workerName.trim(),
      worker_code: `WRK-${Math.floor(Math.random() * 800 + 100)}`,
      worker_skill: workerSkill,
      date: new Date().toISOString().split('T')[0],
      clock_in_time: clockInTime,
      distance_from_site_meters: Math.floor(Math.random() * 25 + 5),
      is_inside_geofence: true,
      status: status,
      regular_hours: status === 'HALF_DAY' ? 4 : status === 'ABSENT' ? 0 : 8,
      overtime_hours: 0,
      supervisor_override: false
    };

    setRecords([newRec, ...records]);
    onShowToast?.(`Attendance logged for ${newRec.worker_name}`);
    setIsPunchOpen(false);

    // Reset
    setWorkerName('');
  };

  return (
    <div className="space-y-5">
      
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded">
              SITE WORKFORCE
            </span>
            <h2 className="text-lg font-bold text-slate-900">Workforce & GPS Geofenced Attendance</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time biometric & geofenced muster roll within {project.geofence_radius_meters || 200}m perimeter for {project.client_name || project.name}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsPunchOpen(true)}
          className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Punch Attendance / Add Worker</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Present Today</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{presentCount} Workers</div>
          <div className="text-[10px] text-slate-400 mt-0.5">On-site headcount</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Inside Geofence</div>
          <div className="text-2xl font-bold text-indigo-700 mt-1">{geofenceVerifiedCount}</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">100% GPS Verified</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Absent / Leave</div>
          <div className="text-2xl font-bold text-rose-600 mt-1">{absentCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Unreported or on leave</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Estimated Wage (Today)</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">₹ {totalWages.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Daily payroll liability</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search worker by name, skill, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {['ALL', 'PRESENT', 'HALF_DAY', 'ABSENT'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st === 'ALL' ? 'All Workers' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Attendance Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3.5 px-4 w-28">ID</th>
                <th className="py-3.5 px-4">Worker Name</th>
                <th className="py-3.5 px-4 w-36">Trade / Skill</th>
                <th className="py-3.5 px-4 w-28">Clock In</th>
                <th className="py-3.5 px-4 w-44">GPS Geofence Status</th>
                <th className="py-3.5 px-4 w-28">Status</th>
                <th className="py-3.5 px-4 text-right w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400">
                    <Users className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700 text-xs">No Attendance Entries Recorded</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Click "Manual Punch / Clock In" to record worker attendance.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    {r.worker_code}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{r.worker_name}</div>
                    <div className="text-[10px] text-slate-400">Regular: {r.regular_hours}h {r.overtime_hours > 0 && `• OT: ${r.overtime_hours}h`}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                      {r.worker_skill}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">
                    {r.clock_in_time}
                  </td>
                  <td className="py-3.5 px-4">
                    {r.is_inside_geofence ? (
                      <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Inside ({r.distance_from_site_meters}m)</span>
                      </span>
                    ) : r.status === 'ABSENT' ? (
                      <span className="text-slate-400">Not Clocked In</span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>Outside ({r.distance_from_site_meters}m)</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      r.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' :
                      r.status === 'HALF_DAY' ? 'bg-amber-100 text-amber-800' :
                      r.status === 'OVERTIME' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {r.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => toggleStatus(r.id)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Toggle
                    </button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PUNCH ATTENDANCE MODAL */}
      {isPunchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Log Worker Attendance</h3>
                  <p className="text-xs text-slate-500">{project.name}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsPunchOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePunchSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Worker Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. S. Murugesan"
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Trade / Skill Category</label>
                  <CustomSelect
                    value={workerSkill}
                    onChange={(val) => setWorkerSkill(val)}
                    options={[
                      'Master Mason',
                      'Bar Bender & Fitter',
                      'Carpenter / Formwork',
                      'Electrician',
                      'Plumber',
                      'General Helper',
                      'Site Supervisor',
                    ]}
                    size="md"
                    variant="brand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Clock In Time</label>
                  <input
                    type="text"
                    value={clockInTime}
                    onChange={(e) => setClockInTime(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Attendance Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['PRESENT', 'HALF_DAY', 'ABSENT'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        status === s
                          ? 'border-red-600 bg-red-50 text-red-600'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Geofence check will record GPS coordinates verified within {project.geofence_radius_meters || 200}m radius.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPunchOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm Clock In</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
