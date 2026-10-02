import React from 'react';
import { X, ShieldCheck, MapPin, Clock, Calendar, User, Briefcase, Building } from 'lucide-react';
import { StaffAttendanceRecord } from '../lib/staffAttendanceService';

interface LivePhotoViewModalProps {
  record: StaffAttendanceRecord | null;
  onClose: () => void;
  onRecapture?: (staffId: string) => void;
}

export const LivePhotoViewModal: React.FC<LivePhotoViewModalProps> = ({
  record,
  onClose,
  onRecapture,
}) => {
  if (!record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Attendance Verification Proof</h2>
              <p className="text-[11px] text-slate-500">Live Snapshot & Geofence Telemetry</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Main Photo Display */}
          <div className="relative w-full aspect-4/3 bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center">
            <img
              src={record.verification_photo}
              alt={`${record.staff_name} live punch photo`}
              className="w-full h-full object-cover"
            />
            {/* Overlay Badge */}
            <div className="absolute top-3 left-3 bg-emerald-600/95 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md backdrop-blur-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Live Selfie Verified</span>
            </div>
            <div className="absolute bottom-3 left-3 bg-slate-900/80 text-white px-3 py-1 rounded-lg text-[11px] font-mono shadow-md backdrop-blur-xs">
              {record.date} • {record.clock_in_time}
            </div>
          </div>

          {/* Staff Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Employee Name</span>
              <span className="font-bold text-slate-900 text-sm">{record.staff_name}</span>
              <span className="text-[10px] text-slate-500 block font-mono">({record.staff_code})</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Role & Department</span>
              <span className="font-bold text-slate-800">{record.role_name}</span>
              <span className="text-[10px] text-slate-500 block">{record.department}</span>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                <Clock className="w-3 h-3 text-emerald-600" />
                <span>Clock In Time</span>
              </span>
              <strong className="text-slate-900 font-mono text-xs">{record.clock_in_time}</strong>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                <Clock className="w-3 h-3 text-red-600" />
                <span>Clock Out Time</span>
              </span>
              <strong className="text-slate-900 font-mono text-xs">
                {record.clock_out_time || 'Currently Working (Active)'}
              </strong>
            </div>
          </div>

          {/* GPS Geofence Telemetry */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 text-xs text-emerald-900">
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Location Verification:</span>
              </span>
              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px]">
                {record.distance_from_site_meters}m from site
              </span>
            </div>
            <p className="text-[11px] text-emerald-800">
              {record.location_name}
            </p>
            {record.notes && (
              <div className="text-[11px] text-slate-600 bg-white/70 p-2 rounded border border-emerald-200/60 mt-1">
                <strong>Remarks:</strong> {record.notes}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {onRecapture ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onRecapture(record.staff_id);
              }}
              className="text-xs font-semibold text-red-600 hover:text-red-700 cursor-pointer"
            >
              Re-capture Attendance Photo
            </button>
          ) : <div />}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
