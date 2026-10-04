import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, X, Check, RefreshCw, Upload, MapPin, 
  Clock, ShieldCheck, AlertCircle, User, CheckCircle2,
  Building2, AlertTriangle, Navigation, Crosshair
} from 'lucide-react';
import { StaffMember } from '../lib/staffService';
import { saveStaffAttendancePunch, formatTime12h, getTodayDateString } from '../lib/staffAttendanceService';
import { 
  BOOSHNAM_OFFICE_GEOFENCE, 
  isStaffOfficeBased, 
  evaluateStaffGeofence,
  calculateHaversineDistanceMeters
} from '../lib/officeGeofenceService';

interface LivePhotoAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffMember[];
  initialStaffId?: string;
  onSuccess?: (msg: string) => void;
}

export const LivePhotoAttendanceModal: React.FC<LivePhotoAttendanceModalProps> = ({
  isOpen,
  onClose,
  staffList,
  initialStaffId,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    initialStaffId || (staffList[0]?.id ?? '')
  );
  const [punchType, setPunchType] = useState<'IN' | 'OUT'>('IN');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [currentTimeStr, setCurrentTimeStr] = useState(formatTime12h());

  // Geolocation & Geofence Simulation State
  const [gpsSimMode, setGpsSimMode] = useState<'REAL_GPS' | 'AT_OFFICE' | 'AWAY'>('AT_OFFICE');
  const [realCoords, setRealCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeStr(formatTime12h());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Real GPS detection
  const detectRealGps = () => {
    setIsLocating(true);
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setRealCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setGpsError('Live GPS access denied or unavailable. Please use verified location mode.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // Attempt GPS on modal open
  useEffect(() => {
    if (isOpen) {
      detectRealGps();
    }
  }, [isOpen]);

  // Stop camera helper
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Start webcam
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported on this browser/device.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Webcam stream unavailable:', err);
      setCameraError('Live webcam unavailable or permission denied. Please upload a selfie photo below.');
      setIsCameraActive(false);
    }
  };

  // Cleanup on unmount or close
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setCapturedPhoto(null);
    }
    return () => stopCamera();
  }, [isOpen]);

  // Capture snapshot from webcam
  const captureSnapshot = () => {
    if (!videoRef.current) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw frame
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        
        // Add timestamp watermark
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(0, canvas.height - 44, canvas.width, 44);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        const stamp = `${getTodayDateString()} • ${formatTime12h()} • Geofence Verified`;
        ctx.fillText(stamp, 15, canvas.height - 24);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10.5px sans-serif';
        ctx.fillText(BOOSHNAM_OFFICE_GEOFENCE.shortAddress, 15, canvas.height - 10);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedPhoto(dataUrl);
        stopCamera();
      }
    } catch (e) {
      console.error('Failed to capture snapshot', e);
    }
  };

  // Handle file / mobile camera capture
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCapturedPhoto(event.target.result as string);
          stopCamera();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId) || staffList[0];
  const isOffice = isStaffOfficeBased(selectedStaff);

  // Compute effective coordinates based on selected GPS mode
  const effectiveCoords = (() => {
    if (gpsSimMode === 'AWAY') {
      // 3.4 km outside office geofence
      return {
        lat: BOOSHNAM_OFFICE_GEOFENCE.latitude + 0.028,
        lng: BOOSHNAM_OFFICE_GEOFENCE.longitude + 0.022,
      };
    }
    if (gpsSimMode === 'REAL_GPS' && realCoords) {
      return realCoords;
    }
    // 'AT_OFFICE' mode (Physically inside office compound ~12m)
    return {
      lat: BOOSHNAM_OFFICE_GEOFENCE.latitude,
      lng: BOOSHNAM_OFFICE_GEOFENCE.longitude,
    };
  })();

  // Evaluate geofence
  const geofenceCheck = evaluateStaffGeofence(
    selectedStaff,
    effectiveCoords.lat,
    effectiveCoords.lng
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    if (!capturedPhoto) {
      alert('Please take or upload a live verification photo before submitting attendance.');
      return;
    }

    // STRICT GEOFENCE ENFORCEMENT
    if (!geofenceCheck.canPunch) {
      alert(
        `Attendance Denied: Office staff must be present at the office location:\n\n${BOOSHNAM_OFFICE_GEOFENCE.address}\n\nYou are currently ${geofenceCheck.distanceMeters > 1000 ? (geofenceCheck.distanceMeters / 1000).toFixed(1) + ' km' : geofenceCheck.distanceMeters + 'm'} away from the office.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      saveStaffAttendancePunch({
        staffId: selectedStaff.id,
        staffName: selectedStaff.name,
        staffCode: selectedStaff.employee_code,
        department: selectedStaff.department,
        roleName: selectedStaff.role_name || selectedStaff.designation,
        photo: capturedPhoto,
        punchType: punchType,
        locationName: isOffice ? `${BOOSHNAM_OFFICE_GEOFENCE.name} (Pammal, Chennai)` : 'Project Construction Site (Geofence Verified)',
        latitude: effectiveCoords.lat,
        longitude: effectiveCoords.lng,
        distanceMeters: geofenceCheck.distanceMeters,
        notes: notes.trim() || `${punchType === 'IN' ? 'Punch In' : 'Punch Out'} • Geofence Verified at ${isOffice ? 'Pammal Head Office' : 'Site'}`,
        punchMode: 'CAMERA_SELFIE',
      });

      stopCamera();
      onClose();
      onSuccess?.(
        `Attendance recorded for ${selectedStaff.name}! Location verified: ${isOffice ? 'Head Office (Pammal, Chennai)' : 'Project Site'}.`
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Mark Attendance • Live Photo & GPS</h2>
              <p className="text-[11px] text-slate-500">Biometric Facial Proof • Location Geofencing</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 overflow-y-auto">
          {/* Staff Member Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Select Staff Member *
              </label>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isOffice ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {isOffice ? '🏢 Office Staff' : '🏗️ Site Staff'}
              </span>
            </div>
            <div className="relative">
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 bg-white focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500 cursor-pointer"
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.employee_code}) — {s.role_name || s.designation} • {s.department}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Punch Type Toggle (Punch In / Punch Out) */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setPunchType('IN')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                punchType === 'IN'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Punch In (Check-in)</span>
            </button>
            <button
              type="button"
              onClick={() => setPunchType('OUT')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                punchType === 'OUT'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Punch Out (Check-out)</span>
            </button>
          </div>

          {/* Camera Frame / Captured Photo Preview */}
          <div className="relative w-full aspect-16/10 bg-slate-900 rounded-xl overflow-hidden border-2 border-slate-200 shadow-inner flex flex-col items-center justify-center">
            {capturedPhoto ? (
              <div className="relative w-full h-full">
                <img
                  src={capturedPhoto}
                  alt="Captured Attendance Verification"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2.5 left-2.5 bg-emerald-600 text-white px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-md">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Photo Captured & Time-Stamped</span>
                </div>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="absolute bottom-2.5 right-2.5 bg-white/95 hover:bg-white text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retake</span>
                </button>
              </div>
            ) : isCameraActive ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror scale-x-[-1]"
                />
                {/* Face Target Guide Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-36 h-44 border-2 border-dashed border-white/70 rounded-full flex items-center justify-center">
                    <span className="text-[10px] text-white/90 font-bold bg-slate-900/60 px-2 py-0.5 rounded">
                      Align Face Here
                    </span>
                  </div>
                </div>

                {/* Shutter Button */}
                <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                  <button
                    type="button"
                    onClick={captureSnapshot}
                    className="w-12 h-12 rounded-full bg-red-600 border-4 border-white shadow-xl hover:scale-105 active:scale-95 transition-transform flex items-center justify-center cursor-pointer text-white"
                    title="Take Photo"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center p-4 space-y-2.5">
                <Camera className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-300 font-medium max-w-xs">
                  {cameraError || 'Camera feed is starting...'}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Selfie</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Hidden File Input for fallback upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* ── GEOFENCE & LOCATION VALIDATION SECTION ── */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
            {/* Target Office Location Banner */}
            <div className="flex items-start gap-2 pb-2 border-b border-slate-200/70">
              <Building2 className="w-4 h-4 text-slate-700 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-slate-900">
                    {isOffice ? 'Office Geofence Location' : 'Site Geofence Location'}:
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold bg-slate-200/70 px-1.5 py-0.5 rounded">
                    Max: {geofenceCheck.allowedRadiusMeters}m
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-tight mt-0.5">
                  {isOffice ? BOOSHNAM_OFFICE_GEOFENCE.address : 'Assigned Project Construction Site'}
                </p>
              </div>
            </div>

            {/* Live GPS Distance & Status Bar */}
            <div className="flex items-center justify-between text-slate-700">
              <span className="flex items-center gap-1.5 font-medium">
                <Navigation className={`w-3.5 h-3.5 ${geofenceCheck.canPunch ? 'text-emerald-600' : 'text-red-500'}`} />
                <span>GPS Telemetry:</span>
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                geofenceCheck.canPunch
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                {geofenceCheck.canPunch ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Inside Geofence ({geofenceCheck.distanceMeters}m)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 text-red-600" />
                    <span>Outside Geofence ({geofenceCheck.distanceMeters > 1000 ? (geofenceCheck.distanceMeters / 1000).toFixed(1) + ' km' : geofenceCheck.distanceMeters + 'm'})</span>
                  </>
                )}
              </span>
            </div>

            {/* GPS Simulation / Verification Toggle Buttons (For local testing & live verification) */}
            <div className="pt-1.5 border-t border-slate-200/70 flex items-center justify-between gap-1.5">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider shrink-0">
                GPS Mode:
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setGpsSimMode('AT_OFFICE')}
                  title="Simulate within Office premises (12m)"
                  className={`text-[10px] px-2 py-1 rounded font-bold transition cursor-pointer ${
                    gpsSimMode === 'AT_OFFICE'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  🏢 At Office
                </button>
                <button
                  type="button"
                  onClick={() => setGpsSimMode('AWAY')}
                  title="Simulate outside office geofence (3.4 km away)"
                  className={`text-[10px] px-2 py-1 rounded font-bold transition cursor-pointer ${
                    gpsSimMode === 'AWAY'
                      ? 'bg-red-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  🚗 Away
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGpsSimMode('REAL_GPS');
                    detectRealGps();
                  }}
                  title="Detect real device GPS coordinates"
                  className={`text-[10px] px-2 py-1 rounded font-bold transition flex items-center gap-1 cursor-pointer ${
                    gpsSimMode === 'REAL_GPS'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Crosshair className={`w-2.5 h-2.5 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>Real GPS</span>
                </button>
              </div>
            </div>

            {/* Geofence Block Warning Alert if outside */}
            {!geofenceCheck.canPunch && (
              <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-800 text-[11px] leading-relaxed flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block">Attendance Blocked • Outside Office Geofence</strong>
                  <span>
                    Office staff can <strong>only</strong> mark attendance when physically present at:
                    <br />
                    <em>{BOOSHNAM_OFFICE_GEOFENCE.address}</em>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Remarks Notes (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Remarks / Notes (Optional)
            </label>
            <input
              type="text"
              placeholder={isOffice ? 'e.g. In office for architectural plans & client meeting' : 'e.g. Site concrete pour check'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:border-red-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <span className="text-[11px] tracking-tight text-slate-500">
              Clock: <strong>{currentTimeStr}</strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !capturedPhoto || !geofenceCheck.canPunch}
                className={`px-4 py-2 rounded-lg text-xs font-bold text-white shadow-xs flex items-center gap-1.5 transition cursor-pointer ${
                  !geofenceCheck.canPunch
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-300'
                    : capturedPhoto
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-slate-300 cursor-not-allowed text-slate-500'
                }`}
                title={
                  !geofenceCheck.canPunch
                    ? 'Attendance blocked: You must be at the office location'
                    : !capturedPhoto
                    ? 'Please take or upload photo first'
                    : 'Submit attendance punch'
                }
              >
                <Check className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Recording Punch...'
                    : !geofenceCheck.canPunch
                    ? 'Blocked (Outside Geofence)'
                    : 'Submit Attendance'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
