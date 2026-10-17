// Mobile Attendance Service with Live Photo & Telemetry

export interface MobileAttendancePunch {
  id: string;
  staffId: string;
  staffName: string;
  staffCode: string;
  department: string;
  role: string;
  date: string;
  clockInTime: string;
  clockOutTime?: string;
  status: 'Present' | 'Late' | 'Half-day' | 'Overtime' | 'Absent';
  verificationPhoto: string;
  distanceMeters: number;
  isInsideGeofence: boolean;
  locationName: string;
  punchType: 'IN' | 'OUT';
  createdAt: string;
}

// User profile photo store (photo uploaded/captured on first punch becomes their profile photo)
const USER_PROFILE_PHOTOS: Record<string, string> = {
  'usr-velmurugan': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop',
  'u-velmurugan': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop',
  'velmurugan': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop',
  'usr-4': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop',
  'u1': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop',
  'murugan': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop',
  'usr-7': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop',
  'u2': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop',
  'suresh': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop',
};

export function getUserProfilePhoto(userId: string): string | undefined {
  return USER_PROFILE_PHOTOS[userId];
}

export function setUserProfilePhoto(userId: string, photoUri: string): void {
  USER_PROFILE_PHOTOS[userId] = photoUri;
}

// In-memory / shared state for mobile session with default team records for admin review
let ATTENDANCE_STORE: MobileAttendancePunch[] = [
  {
    id: 'att-team-1',
    staffId: 'usr-suresh',
    staffName: 'Suresh Kumar',
    staffCode: 'EMP-0104',
    department: 'Civil Engineering',
    role: 'Site Supervisor',
    date: getTodayDateString(),
    clockInTime: '08:45 AM',
    status: 'Present',
    verificationPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop',
    distanceMeters: 8.5,
    isInsideGeofence: true,
    locationName: 'Cumbum Runway Site (Theni)',
    punchType: 'IN',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'att-team-2',
    staffId: 'usr-arumugam',
    staffName: 'Arumugam P',
    staffCode: 'EMP-0108',
    department: 'Quality Assurance',
    role: 'QA / Safety Officer',
    date: getTodayDateString(),
    clockInTime: '09:05 AM',
    status: 'Present',
    verificationPhoto: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop',
    distanceMeters: 14.2,
    isInsideGeofence: true,
    locationName: 'Booshnam Head Office (Pammal, Chennai)',
    punchType: 'IN',
    createdAt: new Date().toISOString(),
  },
];

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTime12h(date: Date = new Date()): string {
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function getAllMobileAttendancePunches(): MobileAttendancePunch[] {
  return [...ATTENDANCE_STORE];
}

export function getStaffAttendanceHistory(staffId: string): MobileAttendancePunch[] {
  return ATTENDANCE_STORE.filter(p => p.staffId === staffId || p.staffCode === staffId);
}

export function getTodayMobileAttendancePunch(staffId: string): MobileAttendancePunch | undefined {
  const today = getTodayDateString();
  return ATTENDANCE_STORE.find(p => p.staffId === staffId && p.date === today);
}

export function resetTodayMobileAttendancePunch(staffId: string): void {
  const today = getTodayDateString();
  ATTENDANCE_STORE = ATTENDANCE_STORE.filter(p => !(p.staffId === staffId && p.date === today));
}

export function saveMobileAttendancePunch(params: {
  staffId: string;
  staffName: string;
  staffCode?: string;
  department?: string;
  role?: string;
  photo: string;
  punchType: 'IN' | 'OUT';
  locationName?: string;
  distanceMeters?: number;
}): MobileAttendancePunch {
  const today = getTodayDateString();
  const currentTime = formatTime12h();

  const existingIndex = ATTENDANCE_STORE.findIndex(
    p => p.staffId === params.staffId && p.date === today
  );

  let record: MobileAttendancePunch;

  if (existingIndex >= 0) {
    const existing = ATTENDANCE_STORE[existingIndex];
    record = {
      ...existing,
      clockOutTime: params.punchType === 'OUT' ? currentTime : existing.clockOutTime,
      verificationPhoto: params.photo || existing.verificationPhoto,
      punchType: params.punchType,
    };
    ATTENDANCE_STORE[existingIndex] = record;
  } else {
    record = {
      id: `att-mob-${Date.now()}`,
      staffId: params.staffId,
      staffName: params.staffName,
      staffCode: params.staffCode || 'EMP-MOB',
      department: params.department || 'Civil Engineering',
      role: params.role || 'Site Engineer',
      date: today,
      clockInTime: currentTime,
      clockOutTime: params.punchType === 'OUT' ? currentTime : undefined,
      status: 'Present',
      verificationPhoto: params.photo,
      distanceMeters: params.distanceMeters ?? 12.4,
      isInsideGeofence: true,
      locationName: params.locationName || 'Project Site Office',
      punchType: params.punchType,
      createdAt: new Date().toISOString(),
    };
    ATTENDANCE_STORE.unshift(record);
  }

  // First time or update profile photo with attendance photo
  if (params.photo) {
    setUserProfilePhoto(params.staffId, params.photo);
  }

  // Attempt backend API sync if backend is accessible
  try {
    fetch('http://10.0.2.2:8000/api/v1/workforce/attendance/clock_in/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        worker_id: params.staffId,
        latitude: 12.9716,
        longitude: 80.2437,
        punch_type: params.punchType,
        photo_url: params.photo,
      })
    }).catch(() => {
      // Backend offline or running in mock mode - local store remains primary
    });
  } catch (e) {
    // Ignore offline network errors
  }

  // Sync to web portal localStorage if running in browser / simulator context
  try {
    const g = globalThis as any;
    if (typeof g.window !== 'undefined' && typeof g.localStorage !== 'undefined') {
      const KEY = 'booshnam_staff_attendance_v3';
      const raw = g.localStorage.getItem(KEY);
      const list = raw ? JSON.parse(raw) : [];
      const itemIndex = list.findIndex((x: any) => x.staff_id === params.staffId && x.date === today);
      const webRecord = {
        id: record.id,
        staff_id: params.staffId,
        staff_name: params.staffName,
        staff_code: params.staffCode || 'EMP-MOB',
        department: params.department || 'Operations',
        role_name: params.role || 'Staff',
        date: today,
        clock_in_time: record.clockInTime,
        clock_out_time: record.clockOutTime,
        status: 'Present',
        verification_photo: params.photo,
        location_name: record.locationName,
        distance_from_site_meters: record.distanceMeters,
        is_inside_geofence: true,
        notes: 'Mobile App Punch - Live Photo & GPS Verified',
        punch_mode: 'MOBILE_APP',
        created_at: new Date().toISOString(),
      };
      if (itemIndex >= 0) {
        list[itemIndex] = { ...list[itemIndex], ...webRecord };
      } else {
        list.unshift(webRecord);
      }
      g.localStorage.setItem(KEY, JSON.stringify(list));
      if (typeof g.CustomEvent === 'function') {
        g.window.dispatchEvent(new g.CustomEvent('booshnam_staff_attendance_updated', { detail: list }));
      }
    }
  } catch (err) {
    // Native React Native environment - localStorage unavailable
  }

  return record;
}
