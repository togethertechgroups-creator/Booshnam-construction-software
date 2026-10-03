import React, { useState, useRef } from 'react';
import { 
  X, MapPin, CheckCircle2, Camera, HardHat, 
  AlertTriangle, Check, Smartphone, Send, User, RefreshCw, Upload, Clock, ShieldCheck
} from 'lucide-react';
import { Project } from '../types';
import { getStaffMembers, StaffMember } from '../lib/staffService';
import { 
  saveStaffAttendancePunch, 
  formatTime12h, 
  getStaffLatestRecordToday 
} from '../lib/staffAttendanceService';
import { 
  BOOSHNAM_OFFICE_GEOFENCE, 
  isStaffOfficeBased 
} from '../lib/officeGeofenceService';

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

  const staffList = getStaffMembers();
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    staffList[0]?.id || ''
  );
  const [activeTab, setActiveTab] = useState<'attendance' | 'snag' | 'dpr'>('attendance');
  const [punchType, setPunchType] = useState<'IN' | 'OUT'>('IN');
  const [clockedInPhoto, setClockedInPhoto] = useState<string | null>(null);
  const [clockedInTime, setClockedInTime] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [snagLogged, setSnagLogged] = useState(false);
  const [dprLogged, setDprLogged] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const selectedStaff = staffList.find(s => s.id === selectedStaffId) || staffList[0];

  // Quick webcam toggle
  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        fileInputRef.current?.click();
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCapturing(true);
    } catch {
      // Fallback to file picker
      fileInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 400, 400);
        const data = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedPhoto(data);
        stopCamera();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setCapturedPhoto(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePunchSubmit = () => {
    if (!selectedStaff) return;
    const photoToSave = capturedPhoto || `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="%23dcfce7"/><circle cx="60" cy="46" r="22" fill="%2316a34a"/><path d="M24 102c0-19.882 16.118-36 36-36s36 16.118 36 36" fill="%2315803d"/></svg>`;

    const isOffice = isStaffOfficeBased(selectedStaff);

    saveStaffAttendancePunch({
      staffId: selectedStaff.id,
      staffName: selectedStaff.name,
      staffCode: selectedStaff.employee_code,
      department: selectedStaff.department,
      roleName: selectedStaff.role_name || selectedStaff.designation,
      photo: photoToSave,
      punchType,
      punchMode: 'MOBILE_APP',
      locationName: isOffice 
        ? `${BOOSHNAM_OFFICE_GEOFENCE.name} (Pammal, Chennai)`
        : (project?.name ? `${project.name} Site` : 'Site Office'),
      distanceMeters: 14,
    });

    setClockedInPhoto(photoToSave);
    setClockedInTime(formatTime12h());
  };

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
            {/* Tab 1: Attendance GPS with Live Photo */}
            {activeTab === 'attendance' && (
              <div className="space-y-3.5 text-left">
                {/* Staff Member Selector */}
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Staff Member
                  </label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => {
                      setSelectedStaffId(e.target.value);
                      setClockedInPhoto(null);
                      setClockedInTime(null);
                      setCapturedPhoto(null);
                    }}
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2 focus:ring-1 focus:ring-brand outline-none"
                  >
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.designation})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Geofence & Punch Type Toggle */}
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 font-semibold text-slate-700 min-w-0 pr-1">
                      <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span className="truncate">
                        {isStaffOfficeBased(selectedStaff) ? 'Office: LIC Colony, Pammal' : (project?.name || 'Site') + ' Center'}
                      </span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                      12.4m Inside
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPunchType('IN')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition ${
                        punchType === 'IN'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Punch IN
                    </button>
                    <button
                      type="button"
                      onClick={() => setPunchType('OUT')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition ${
                        punchType === 'OUT'
                          ? 'bg-red-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Punch OUT
                    </button>
                  </div>
                </div>

                {/* Photo Capture Section */}
                {!clockedInPhoto ? (
                  <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-slate-500" />
                        <span>Live Verification Selfie</span>
                      </span>
                      <span className="text-[10px] text-red-500 font-semibold">*Required</span>
                    </div>

                    {/* Camera Preview or Placeholder */}
                    <div className="relative w-full aspect-square bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${isCapturing ? 'block' : 'hidden'}`}
                      />

                      {capturedPhoto && !isCapturing && (
                        <img
                          src={capturedPhoto}
                          alt="Captured selfie"
                          className="w-full h-full object-cover"
                        />
                      )}

                      {!isCapturing && !capturedPhoto && (
                        <div className="text-center p-4 space-y-2">
                          <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                            <User className="w-6 h-6" />
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Take a live selfie or upload photo to verify attendance
                          </p>
                        </div>
                      )}

                      {/* Snap button while camera is on */}
                      {isCapturing && (
                        <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                          <button
                            type="button"
                            onClick={takeSnapshot}
                            className="px-4 py-1.5 bg-red-600 text-white rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 hover:bg-red-700 cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Capture</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      {!isCapturing ? (
                        <button
                          type="button"
                          onClick={startCamera}
                          className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>{capturedPhoto ? 'Retake' : 'Open Camera'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold transition cursor-pointer"
                        >
                          Cancel Camera
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                        title="Upload photo from device"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload</span>
                      </button>
                    </div>

                    {/* Punch Submit Button */}
                    <button
                      type="button"
                      onClick={handlePunchSubmit}
                      className={`w-full py-3.5 rounded-xl font-bold text-xs text-white shadow-md transition flex items-center justify-center gap-2 cursor-pointer ${
                        punchType === 'IN'
                          ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                          : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        SUBMIT PUNCH {punchType} ({formatTime12h()})
                      </span>
                    </button>
                  </div>
                ) : (
                  /* Verified Success Card */
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-3">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-500 mx-auto shadow-sm">
                      <img
                        src={clockedInPhoto}
                        alt="Punch confirmation"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Punch {punchType} Verified!</span>
                      </div>
                      <div className="font-bold text-slate-900 text-sm">
                        {selectedStaff?.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Timestamp: {clockedInTime} • Geofence Verified
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setClockedInPhoto(null);
                        setClockedInTime(null);
                        setCapturedPhoto(null);
                      }}
                      className="text-xs text-emerald-700 hover:underline font-semibold cursor-pointer"
                    >
                      Punch for Another Staff Member
                    </button>
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
