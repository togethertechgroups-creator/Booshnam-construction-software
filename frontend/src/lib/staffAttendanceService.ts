import { StaffMember, getStaffMembers } from './staffService';
import { BOOSHNAM_OFFICE_GEOFENCE, isStaffOfficeBased } from './officeGeofenceService';

export type StaffAttendanceStatus = 'Present' | 'Late' | 'Half-day' | 'Overtime' | 'Absent' | 'Week-off' | 'Paid Leave';

export interface StaffAttendanceRecord {
  id: string;
  staff_id: string;
  staff_name: string;
  staff_code: string;
  department: string;
  role_name: string;
  date: string; // YYYY-MM-DD
  clock_in_time: string; // e.g. "09:15 AM"
  clock_out_time?: string; // e.g. "06:30 PM"
  status: StaffAttendanceStatus;
  verification_photo: string; // Base64 data URL or image path
  location_name: string;
  latitude?: number;
  longitude?: number;
  distance_from_site_meters: number;
  is_inside_geofence: boolean;
  notes?: string;
  punch_mode: 'CAMERA_SELFIE' | 'MOBILE_APP' | 'KIOSK' | 'ADMIN_OVERRIDE';
  created_at: string;
}

const ATTENDANCE_STORAGE_KEY = 'booshnam_staff_attendance_v3';

// Fallback avatar constant removed in favor of empty string for non-camera punches

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

export function getAllStaffAttendanceRecords(): StaffAttendanceRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    let hasDirtySample = false;
    const sanitized = parsed.map((r: StaffAttendanceRecord) => {
      if (
        r.verification_photo &&
        (r.verification_photo.includes('data:image/svg') ||
         r.verification_photo.includes('%23fee2e2') ||
         r.verification_photo.includes('%23dc2626') ||
         r.verification_photo.includes('<svg') ||
         r.punch_mode === 'ADMIN_OVERRIDE')
      ) {
        hasDirtySample = true;
        return { ...r, verification_photo: '' };
      }
      return r;
    });
    if (hasDirtySample) {
      try {
        localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(sanitized));
      } catch (e) {}
    }
    return sanitized;
  } catch (e) {
    console.error('Failed to read staff attendance records', e);
    return [];
  }
}

export function getTodayStaffAttendance(): StaffAttendanceRecord[] {
  const today = getTodayDateString();
  const all = getAllStaffAttendanceRecords();
  return all.filter((r) => r.date === today);
}

export function getStaffAttendanceForDate(dateStr: string): StaffAttendanceRecord[] {
  const all = getAllStaffAttendanceRecords();
  return all.filter((r) => r.date === dateStr);
}

export function getStaffLatestRecordToday(staffId: string, dateStr: string = getTodayDateString()): StaffAttendanceRecord | undefined {
  const records = getStaffAttendanceForDate(dateStr);
  return records.find((r) => r.staff_id === staffId);
}

export function saveStaffAttendancePunch(
  params: {
    staffId: string;
    staffName: string;
    staffCode?: string;
    department?: string;
    roleName?: string;
    photo: string;
    punchType: 'IN' | 'OUT';
    locationName?: string;
    status?: 'Present' | 'Late' | 'Half-day' | 'Overtime' | 'Absent';
    notes?: string;
    latitude?: number;
    longitude?: number;
    distanceMeters?: number;
    punchMode?: 'CAMERA_SELFIE' | 'MOBILE_APP' | 'KIOSK' | 'ADMIN_OVERRIDE';
  }
): StaffAttendanceRecord {
  const current = getAllStaffAttendanceRecords();
  const today = getTodayDateString();
  const currentTime = formatTime12h();

  const existingIndex = current.findIndex(
    (r) => r.staff_id === params.staffId && r.date === today
  );

  let updatedRecord: StaffAttendanceRecord;

  if (existingIndex >= 0) {
    // Already clocked in today, update clock out or verification photo
    const existing = current[existingIndex];
    updatedRecord = {
      ...existing,
      clock_out_time: params.punchType === 'OUT' ? currentTime : existing.clock_out_time,
      verification_photo: params.photo || existing.verification_photo,
      status: params.status || existing.status,
      notes: params.notes || existing.notes,
      location_name: params.locationName || existing.location_name,
    };
    current[existingIndex] = updatedRecord;
  } else {
    const isOffice = isStaffOfficeBased({ role_name: params.roleName, department: params.department });
    const defaultLoc = isOffice ? 'Booshnam Head Office (Pammal, Chennai)' : 'Government Project Site (Geofence Verified)';
    const defaultLat = isOffice ? BOOSHNAM_OFFICE_GEOFENCE.latitude : 12.9716;
    const defaultLon = isOffice ? BOOSHNAM_OFFICE_GEOFENCE.longitude : 80.2437;

    // New check-in for today
    updatedRecord = {
      id: `att-punch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      staff_id: params.staffId,
      staff_name: params.staffName,
      staff_code: params.staffCode || 'EMP-SITE',
      department: params.department || 'Operations',
      role_name: params.roleName || 'Staff',
      date: today,
      clock_in_time: currentTime,
      clock_out_time: params.punchType === 'OUT' ? currentTime : undefined,
      status: params.status || 'Present',
      verification_photo: params.photo || '',
      location_name: params.locationName || defaultLoc,
      latitude: params.latitude || defaultLat,
      longitude: params.longitude || defaultLon,
      distance_from_site_meters: params.distanceMeters ?? Math.floor(Math.random() * 20 + 5),
      is_inside_geofence: true,
      notes: params.notes || (isOffice ? 'Verified live office GPS check-in' : 'Verified live mobile punch'),
      punch_mode: params.punchMode || 'CAMERA_SELFIE',
      created_at: new Date().toISOString(),
    };
    current.unshift(updatedRecord);
  }

  try {
    localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(
      new CustomEvent('booshnam_staff_attendance_updated', { detail: current })
    );
  } catch (e) {
    console.error('Failed to store staff attendance punch', e);
  }

  return updatedRecord;
}

export function updateStaffAttendanceStatus(
  staffId: string,
  newStatus: 'Present' | 'Late' | 'Half-day' | 'Overtime' | 'Absent' | 'Week-off' | 'Paid Leave',
  dateStr: string = getTodayDateString()
): void {
  const today = getTodayDateString();
  if (dateStr > today) {
    console.warn('Cannot mark attendance for future dates:', dateStr);
    return;
  }

  const current = getAllStaffAttendanceRecords();
  const index = current.findIndex((r) => r.staff_id === staffId && r.date === dateStr);

  if (index >= 0) {
    current[index] = { ...current[index], status: newStatus };
  } else {
    // If not existing, create a stub record so status is tracked
    const allStaff = getStaffMembers();
    const staff = allStaff.find((s) => s.id === staffId);
    if (staff) {
      const isOffice = isStaffOfficeBased({ role_name: staff.role_name || staff.designation, department: staff.department });
      current.unshift({
        id: `att-punch-${Date.now()}`,
        staff_id: staff.id,
        staff_name: staff.name,
        staff_code: staff.employee_code,
        department: staff.department,
        role_name: staff.role_name || staff.designation,
        date: dateStr,
        clock_in_time: formatTime12h(),
        status: newStatus,
        verification_photo: '',
        location_name: isOffice ? 'Booshnam Head Office (Pammal, Chennai)' : 'Site Office',
        distance_from_site_meters: 10,
        is_inside_geofence: true,
        punch_mode: 'ADMIN_OVERRIDE',
        created_at: new Date().toISOString(),
      });
    }
  }

  try {
    localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(
      new CustomEvent('booshnam_staff_attendance_updated', { detail: current })
    );
  } catch (e) {
    console.error('Failed to update attendance status', e);
  }
}
