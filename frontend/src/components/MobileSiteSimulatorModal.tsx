import React, { useState, useRef, useEffect } from 'react';
import { 
  X, MapPin, CheckCircle2, Camera, HardHat, 
  AlertTriangle, Check, Smartphone, Send, User, RefreshCw, Upload, 
  Clock, ShieldCheck, ShieldAlert, ArrowRight, ArrowLeft, Fingerprint,
  Building2, Sparkles, AlertCircle
} from 'lucide-react';
import { Project } from '../types';
import { getStaffMembers, StaffMember } from '../lib/staffService';
import { 
  saveStaffAttendancePunch, 
  formatTime12h, 
  getTodayDateString 
} from '../lib/staffAttendanceService';
import { 
  BOOSHNAM_OFFICE_GEOFENCE, 
  isStaffOfficeBased 
} from '../lib/officeGeofenceService';

interface MobileSiteSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  initialStaffId?: string;
}

export const MobileSiteSimulatorModal: React.FC<MobileSiteSimulatorModalProps> = ({
  isOpen,
  onClose,
  project,
  initialStaffId
}) => {
  if (!isOpen) return null;

  const staffList = getStaffMembers();
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    initialStaffId || staffList[0]?.id || ''
  );

  useEffect(() => {
    if (initialStaffId && staffList.some(s => s.id === initialStaffId)) {
      setSelectedStaffId(initialStaffId);
    }
  }, [initialStaffId]);

  // Bottom Navigation Tab: 'snag' | 'punch' | 'dpr'
  // Punch In is the central prominent action
  const [activeTab, setActiveTab] = useState<'punch' | 'snag' | 'dpr'>('punch');

  // Guided Punch-In Steps: 1: location -> 2: photo -> 3: confirm -> success
  const [punchStep, setPunchStep] = useState<'location' | 'photo' | 'confirm' | 'success'>('location');
  const [punchType, setPunchType] = useState<'IN' | 'OUT'>('IN');

  // Geofence / Location State
  // Allows testing both: INSIDE location (valid) & OUTSIDE location (blocks punch & shows notification)
  const [geofenceSimMode, setGeofenceSimMode] = useState<'INSIDE' | 'OUTSIDE'>('INSIDE');
  const [locationAlertToast, setLocationAlertToast] = useState<string | null>(null);

  // Live Photo Verification State (Mandatory)
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Result state
  const [clockedInPhoto, setClockedInPhoto] = useState<string | null>(null);
  const [clockedInTime, setClockedInTime] = useState<string | null>(null);

  // Other tabs mock states
  const [snagLogged, setSnagLogged] = useState(false);
  const [dprLogged, setDprLogged] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const selectedStaff: StaffMember | undefined = staffList.find(s => s.id === selectedStaffId) || staffList[0];
  const isOffice = selectedStaff ? isStaffOfficeBased(selectedStaff) : false;
  const targetLocationName = isOffice 
    ? `${BOOSHNAM_OFFICE_GEOFENCE.name} (Pammal, Chennai)`
    : (project?.name ? `${project.name} Site Office` : 'Government Medical College Site Office');

  // Reset steps when changing staff
  const handleSelectStaff = (id: string) => {
    setSelectedStaffId(id);
    setPunchStep('location');
    setCapturedPhoto(null);
    setPhotoError(null);
    setLocationAlertToast(null);
    setClockedInPhoto(null);
    setClockedInTime(null);
  };

  // Step 1 -> Step 2 validation (Geofence check)
  const handleProceedToPhoto = () => {
    if (geofenceSimMode === 'OUTSIDE') {
      setLocationAlertToast('நீங்க location-ல இருந்து வெளியே இருக்கீங்க! (You are outside the designated site location)');
      return;
    }
    setLocationAlertToast(null);
    setPunchStep('photo');
  };

  // Quick webcam toggle
  const startCamera = async () => {
    setPhotoError(null);
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
        setPhotoError(null);
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
          setPhotoError(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Step 2 -> Step 3 validation (Mandatory live photo check)
  const handleProceedToConfirm = () => {
    if (!capturedPhoto) {
      setPhotoError('Live photo capture is strictly mandatory to verify identity.');
      return;
    }
    setPunchStep('confirm');
  };

  // Step 3: Final Submission & Mark "Present"
  const handleConfirmAndMarkPresent = () => {
    if (!selectedStaff || !capturedPhoto) return;

    const currentTime = formatTime12h();
    const distance = geofenceSimMode === 'INSIDE' ? 12 : 450;

    saveStaffAttendancePunch({
      staffId: selectedStaff.id,
      staffName: selectedStaff.name,
      staffCode: selectedStaff.employee_code,
      department: selectedStaff.department,
      roleName: selectedStaff.role_name || selectedStaff.designation,
      photo: capturedPhoto,
      punchType,
      status: 'Present',
      punchMode: 'MOBILE_APP',
      locationName: targetLocationName,
      distanceMeters: distance,
    });

    setClockedInPhoto(capturedPhoto);
    setClockedInTime(currentTime);
    setPunchStep('success');

    // Dispatch global event for instant web portal sync
    window.dispatchEvent(new CustomEvent('siteops_toast', {
      detail: `Attendance Marked: ${selectedStaff.name} is PRESENT (${selectedStaff.department})`
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
      {/* Mobile Device Frame */}
      <div className="w-full max-w-[400px] h-[810px] bg-slate-900 rounded-[50px] p-3 shadow-2xl ring-8 ring-slate-800 relative flex flex-col overflow-hidden border border-slate-700">
        
        {/* Dynamic Island / Notch */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-full z-30 flex items-center justify-between px-3">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-800 ring-1 ring-slate-700"></div>
          <div className="w-12 h-1.5 bg-slate-800 rounded-full"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
        </div>

        {/* Screen Content Container */}
        <div className="w-full h-full bg-slate-50 rounded-[40px] overflow-hidden flex flex-col relative pt-7">
          
          {/* Top Status & App Bar */}
          <div className="px-4 py-2.5 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0 shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                BP
              </div>
              <div>
                <div className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">
                  Booshnam SiteOps
                </div>
                <div className="text-xs font-bold text-slate-900 truncate max-w-[190px]">
                  {project?.name || 'Mobile Field App'}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer"
              title="Close Simulator"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Location Alert Popup Banner (Tamil & English notification if outside location) */}
          {locationAlertToast && (
            <div className="bg-red-600 text-white px-4 py-2.5 text-xs font-bold shadow-md flex items-center justify-between animate-in slide-in-from-top-2 duration-200 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-300 animate-pulse" />
                <span className="truncate">{locationAlertToast}</span>
              </div>
              <button 
                onClick={() => setLocationAlertToast(null)} 
                className="text-white/80 hover:text-white p-0.5 ml-2 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Screen Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
            
            {/* ═══════════════════════════════════════════════════════
                TAB 1: PUNCH IN (MAIN CENTER ACTION)
            ═══════════════════════════════════════════════════════ */}
            {activeTab === 'punch' && (
              <div className="space-y-3 text-left">
                
                {/* Staff Member & Department Selector */}
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>Select Staff Member</span>
                    </label>
                    {selectedStaff && (
                      <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {selectedStaff.department || 'Operations'}
                      </span>
                    )}
                  </div>

                  <select
                    value={selectedStaffId}
                    onChange={(e) => handleSelectStaff(e.target.value)}
                    className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition"
                  >
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.employee_code}) - {s.designation}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5 pt-0.5">
                    <span className="font-semibold text-slate-700">Role: {selectedStaff?.designation || selectedStaff?.role_name}</span>
                    <span className="text-slate-400 text-[10px]">ID: {selectedStaff?.employee_code}</span>
                  </div>
                </div>

                {/* 3-Step Progress Indicator */}
                {punchStep !== 'success' && (
                  <div className="bg-white px-3 py-2.5 rounded-2xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between relative">
                      <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 -z-0"></div>
                      
                      {/* Step 1 Pill */}
                      <button
                        type="button"
                        onClick={() => setPunchStep('location')}
                        className={`flex flex-col items-center gap-1 z-10 cursor-pointer ${
                          punchStep === 'location' ? 'scale-105' : ''
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition ${
                          punchStep === 'location'
                            ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-xs'
                            : punchStep === 'photo' || punchStep === 'confirm'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {punchStep === 'photo' || punchStep === 'confirm' ? <Check className="w-3.5 h-3.5" /> : '1'}
                        </div>
                        <span className={`text-[10px] font-bold ${punchStep === 'location' ? 'text-emerald-700' : 'text-slate-500'}`}>
                          Location
                        </span>
                      </button>

                      {/* Step 2 Pill */}
                      <button
                        type="button"
                        onClick={() => {
                          if (geofenceSimMode === 'INSIDE') setPunchStep('photo');
                        }}
                        className={`flex flex-col items-center gap-1 z-10 cursor-pointer ${
                          punchStep === 'photo' ? 'scale-105' : ''
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition ${
                          punchStep === 'photo'
                            ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-xs'
                            : punchStep === 'confirm'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {punchStep === 'confirm' ? <Check className="w-3.5 h-3.5" /> : '2'}
                        </div>
                        <span className={`text-[10px] font-bold ${punchStep === 'photo' ? 'text-emerald-700' : 'text-slate-500'}`}>
                          Live Photo
                        </span>
                      </button>

                      {/* Step 3 Pill */}
                      <button
                        type="button"
                        onClick={() => {
                          if (capturedPhoto && geofenceSimMode === 'INSIDE') setPunchStep('confirm');
                        }}
                        className={`flex flex-col items-center gap-1 z-10 cursor-pointer ${
                          punchStep === 'confirm' ? 'scale-105' : ''
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition ${
                          punchStep === 'confirm'
                            ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-xs'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          3
                        </div>
                        <span className={`text-[10px] font-bold ${punchStep === 'confirm' ? 'text-emerald-700' : 'text-slate-500'}`}>
                          Confirm OK
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────
                    STEP 1: LOCATION GEOFENCE CHECK
                ───────────────────────────────────────────────────────── */}
                {punchStep === 'location' && (
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Step 1: Location Verification</div>
                          <div className="text-[10px] text-slate-400">Mandatory GPS Geofence Check</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        *Mandatory
                      </span>
                    </div>

                    {/* Workplace Destination Information */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Designated Workplace
                      </div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{targetLocationName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Department: <strong className="text-slate-800">{selectedStaff?.department}</strong>
                      </div>
                    </div>

                    {/* Simulation Toggle: Inside Site vs Outside Site */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <span>Simulator Geolocation State</span>
                        <span>Click to toggle test</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setGeofenceSimMode('INSIDE');
                            setLocationAlertToast(null);
                          }}
                          className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            geofenceSimMode === 'INSIDE'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Inside Site (12m)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setGeofenceSimMode('OUTSIDE');
                            setLocationAlertToast('நீங்க location-ல இருந்து வெளியே இருக்கீங்க (You are outside designated location)');
                          }}
                          className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            geofenceSimMode === 'OUTSIDE'
                              ? 'bg-red-600 text-white border-red-600 shadow-sm'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Outside Site (450m)</span>
                        </button>
                      </div>
                    </div>

                    {/* Geofence Status Card */}
                    {geofenceSimMode === 'INSIDE' ? (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                        <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Location Verified: Inside Site Perimeter</span>
                        </div>
                        <p className="text-[11px] text-emerald-700">
                          Current GPS distance is <strong>12.4 meters</strong> from center. You are authorized to punch attendance.
                        </p>
                      </div>
                    ) : (
                      /* REQUIRED TAMIL ALERT CARD WHEN OUTSIDE */
                      <div className="p-3.5 bg-red-50 border-2 border-red-400 rounded-xl space-y-2 animate-pulse">
                        <div className="flex items-start gap-2.5 text-red-800">
                          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-black text-sm text-red-700 leading-tight">
                              நீங்க location-ல இருந்து வெளியே இருக்கீங்க!
                            </div>
                            <div className="text-[11px] font-bold text-red-600 mt-0.5">
                              You are outside the designated site location (450m away).
                            </div>
                          </div>
                        </div>
                        <p className="text-[10.5px] text-red-700 leading-normal bg-white/60 p-2 rounded-lg border border-red-200">
                          Attendance punch is locked until you are within 100 meters of the authorized site/office boundary.
                        </p>
                      </div>
                    )}

                    {/* Proceed Button */}
                    <button
                      type="button"
                      onClick={handleProceedToPhoto}
                      className={`w-full py-3 rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition cursor-pointer ${
                        geofenceSimMode === 'INSIDE'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-98'
                          : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <span>Proceed to Live Photo (Step 2)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────
                    STEP 2: MANDATORY LIVE PHOTO VERIFICATION
                ───────────────────────────────────────────────────────── */}
                {punchStep === 'photo' && (
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <Camera className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Step 2: Live Photo Verification</div>
                          <div className="text-[10px] text-slate-400">Real-time Selfie Capture</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        *Mandatory
                      </span>
                    </div>

                    {photoError && (
                      <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                        <span>{photoError}</span>
                      </div>
                    )}

                    {/* Camera Viewport / Image Preview */}
                    <div className="relative w-full aspect-square bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-slate-800 shadow-inner">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${isCapturing ? 'block' : 'hidden'}`}
                      />

                      {capturedPhoto && !isCapturing && (
                        <div className="w-full h-full relative">
                          <img
                            src={capturedPhoto}
                            alt="Captured verification selfie"
                            className="w-full h-full object-cover"
                          />
                          {/* Live Verification Stamp Overlay */}
                          <div className="absolute bottom-2 left-2 right-2 bg-slate-950/75 backdrop-blur-xs text-white p-2 rounded-xl text-[10px] space-y-0.5 border border-white/10">
                            <div className="font-bold text-emerald-400 flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Live Identity Verified</span>
                            </div>
                            <div className="text-white/80 truncate">{selectedStaff?.name} • {selectedStaff?.department}</div>
                            <div className="text-white/60 text-[9px]">GPS: 12.9716° N, 80.2437° E • {formatTime12h()}</div>
                          </div>
                        </div>
                      )}

                      {!isCapturing && !capturedPhoto && (
                        <div className="text-center p-6 space-y-2">
                          <div className="w-14 h-14 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto ring-4 ring-slate-800/50">
                            <User className="w-7 h-7" />
                          </div>
                          <div className="text-xs font-bold text-white">Live Selfie Required</div>
                          <p className="text-[11px] text-slate-400 max-w-[220px] mx-auto">
                            Both location verification and live photo are mandatory before marking attendance.
                          </p>
                        </div>
                      )}

                      {/* Snap button overlay when webcam is active */}
                      {isCapturing && (
                        <div className="absolute bottom-3 left-0 right-0 flex justify-center z-10">
                          <button
                            type="button"
                            onClick={takeSnapshot}
                            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-extrabold shadow-lg flex items-center gap-1.5 cursor-pointer ring-4 ring-white/20 active:scale-95 transition"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Capture Selfie</span>
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

                    {/* Camera Control Buttons */}
                    <div className="flex items-center gap-2">
                      {!isCapturing ? (
                        <button
                          type="button"
                          onClick={startCamera}
                          className="flex-1 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <Camera className="w-4 h-4 text-emerald-600" />
                          <span>{capturedPhoto ? 'Retake Camera Selfie' : 'Open Live Camera'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          Cancel Camera
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="py-2.5 px-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                        title="Upload photo from mobile device"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload</span>
                      </button>
                    </div>

                    {/* Navigation Buttons: Back & Proceed to Confirm */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setPunchStep('location')}
                        className="py-3 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleProceedToConfirm}
                        disabled={!capturedPhoto}
                        className={`flex-1 py-3 rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition cursor-pointer ${
                          capturedPhoto
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-98'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                        }`}
                      >
                        <span>Next: Confirm Attendance (Step 3)</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────
                    STEP 3: FINAL REVIEW & MARK PRESENT ("OK / CONFIRM")
                ───────────────────────────────────────────────────────── */}
                {punchStep === 'confirm' && (
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Step 3: Confirm Attendance</div>
                          <div className="text-[10px] text-slate-400">Final Verification Review</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        Status: PRESENT
                      </span>
                    </div>

                    {/* Verification Summary Card */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-emerald-500 shrink-0 shadow-xs">
                          {capturedPhoto ? (
                            <img src={capturedPhoto} alt="Selfie" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                              <User className="w-6 h-6 text-slate-400" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-extrabold text-slate-900 truncate">
                            {selectedStaff?.name}
                          </div>
                          <div className="text-xs font-semibold text-emerald-700">
                            {selectedStaff?.department}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {selectedStaff?.employee_code} • {selectedStaff?.designation}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/80 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Punch Time:</span>
                          </span>
                          <span className="font-bold text-slate-900">{formatTime12h()}</span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>Location:</span>
                          </span>
                          <span className="font-bold text-emerald-700 truncate max-w-[170px]">
                            {targetLocationName}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Geofence Status:</span>
                          </span>
                          <span className="font-bold text-emerald-700">12.4m Inside (Verified)</span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Live Selfie:</span>
                          </span>
                          <span className="font-bold text-emerald-700">Attached & Verified</span>
                        </div>
                      </div>
                    </div>

                    {/* OK / Confirm Button */}
                    <div className="space-y-2 pt-1">
                      <button
                        type="button"
                        onClick={handleConfirmAndMarkPresent}
                        className="w-full py-3.5 rounded-xl font-extrabold text-xs text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>OK / CONFIRM PUNCH — MARK PRESENT</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPunchStep('photo')}
                        className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                      >
                        ← Back to Retake Photo
                      </button>
                    </div>
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────
                    SUCCESS / MARKED PRESENT CONFIRMATION
                ───────────────────────────────────────────────────────── */}
                {punchStep === 'success' && (
                  <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-5 text-center space-y-3.5 shadow-md animate-in zoom-in-95 duration-200">
                    <div className="relative mx-auto w-20 h-20">
                      <div className="w-20 h-20 rounded-full overflow-hidden border-3 border-emerald-500 shadow-md">
                        {clockedInPhoto ? (
                          <img src={clockedInPhoto} alt="Punch confirmation" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-xl">
                            ✓
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    </div>

                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-200/80 text-emerald-900 text-xs font-black tracking-wide mb-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                        <span>ATTENDANCE MARKED: PRESENT</span>
                      </div>
                      <div className="font-black text-slate-900 text-base">
                        {selectedStaff?.name}
                      </div>
                      <div className="text-xs font-bold text-emerald-800 mt-0.5">
                        {selectedStaff?.department}
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1">
                        Punched at: <strong>{clockedInTime}</strong> • Geofence Verified
                      </div>
                    </div>

                    {/* Sync to Web Portal confirmation badge */}
                    <div className="p-2.5 bg-white rounded-xl border border-emerald-200 text-[11px] text-slate-700 text-left space-y-1">
                      <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Synced Live with Web Portal</span>
                      </div>
                      <div className="text-[10.5px] text-slate-500">
                        Attendance status is immediately updated for <strong>{selectedStaff?.department} Admin</strong> and <strong>Super Admin</strong>.
                      </div>
                    </div>

                    <div className="pt-1 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPunchStep('location');
                          setCapturedPhoto(null);
                          setClockedInPhoto(null);
                        }}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        Punch for Another Staff Member
                      </button>

                      <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                      >
                        Close Simulator
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════
                TAB 2: eSNAG / TASKS (LEFT TAB)
            ═══════════════════════════════════════════════════════ */}
            {activeTab === 'snag' && (
              <div className="space-y-3 text-left">
                <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                  <span>Report Site Defect / Snag</span>
                  <span className="text-[10px] text-slate-400">Civil & Structural</span>
                </div>
                
                <input 
                  type="text" 
                  placeholder="Location (e.g. Tower A Floor 8)"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none"
                  defaultValue="Tower A, Column C14"
                />

                <textarea
                  placeholder="Defect description..."
                  rows={3}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none"
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
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
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

            {/* ═══════════════════════════════════════════════════════
                TAB 3: DPR REPORTS (RIGHT TAB)
            ═══════════════════════════════════════════════════════ */}
            {activeTab === 'dpr' && (
              <div className="space-y-3 text-left">
                <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                  <span>Today's DPR Summary</span>
                  <span className="text-[10px] text-slate-400">{getTodayDateString()}</span>
                </div>

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
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none"
                  defaultValue="Floor 9 post-tensioned tendon layout completed. Beam shuttering aligned. Ready for structural inspection."
                />

                {!dprLogged ? (
                  <button
                    onClick={() => setDprLogged(true)}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
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

          {/* ═══════════════════════════════════════════════════════
              MOBILE BOTTOM NAVIGATION BAR (CENTER PUNCH IN BUTTON)
          ═══════════════════════════════════════════════════════ */}
          <div className="h-16 bg-white border-t border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-lg relative">
            {/* 1. Left Tab: eSnag / Tasks */}
            <button
              onClick={() => setActiveTab('snag')}
              className={`flex flex-col items-center gap-1 text-[10px] font-bold transition cursor-pointer w-16 ${
                activeTab === 'snag' ? 'text-emerald-700' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Camera className="w-5 h-5" />
              <span>eSnag</span>
            </button>

            {/* 2. CENTER TAB: PUNCH IN (PROMINENT STANDOUT ELEVATED BUTTON) */}
            <div className="relative -top-4 flex flex-col items-center">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('punch');
                  if (punchStep === 'success') {
                    setPunchStep('location');
                  }
                }}
                className={`w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-xl transition-all transform active:scale-90 cursor-pointer ${
                  activeTab === 'punch'
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white ring-4 ring-emerald-100 shadow-emerald-600/40 scale-105'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                }`}
                title="Punch In Attendance"
              >
                <Fingerprint className="w-6 h-6 stroke-[2.2]" />
              </button>
              <span className={`text-[10px] font-black tracking-tight mt-1 ${
                activeTab === 'punch' ? 'text-emerald-700' : 'text-slate-500'
              }`}>
                Punch In
              </span>
            </div>

            {/* 3. Right Tab: DPR Reports */}
            <button
              onClick={() => setActiveTab('dpr')}
              className={`flex flex-col items-center gap-1 text-[10px] font-bold transition cursor-pointer w-16 ${
                activeTab === 'dpr' ? 'text-emerald-700' : 'text-slate-400 hover:text-slate-600'
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
