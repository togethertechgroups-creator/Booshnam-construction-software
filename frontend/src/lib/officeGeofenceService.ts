// Office Geofence Service
// Configured for Booshnam Associates Head Office
// Address: Plot No. 8, Door No. 2, LIC Colony, 6th Street, Near Shankar Nagar, Pammal, Anakaputhur, Chennai – 600075

export interface GeofenceConfig {
  id: string;
  name: string;
  address: string;
  shortAddress: string;
  latitude: number;
  longitude: number;
  radiusMeters: number; // Allowed boundary radius around the office building
}

export const BOOSHNAM_OFFICE_GEOFENCE: GeofenceConfig = {
  id: 'office-pammal-chennai',
  name: 'Booshnam Head Office',
  address: 'Plot No. 8, Door No. 2, LIC Colony, 6th Street, Near Shankar Nagar, Pammal, Anakaputhur, Chennai – 600075',
  shortAddress: 'Plot No. 8, LIC Colony, 6th St, Pammal, Chennai - 600075',
  latitude: 12.9680,
  longitude: 80.1340,
  radiusMeters: 150, // 150 meters covers the building, compound, and adjacent street
};

export interface StaffRoleMeta {
  role_code?: string;
  role_name?: string;
  designation?: string;
  department?: string;
}

/**
 * Checks whether a staff member is office-based or site-based.
 * Office Staff: Architecture, Accounts, Marketing, Administration, Management, Directors, Estimation, etc.
 * Site Staff: Site Engineers, Site Supervisors, Safety Officers on field, Masons, Foremen.
 */
export function isStaffOfficeBased(staff?: StaffRoleMeta | null): boolean {
  if (!staff) return true;
  const role = (staff.role_code || staff.role_name || staff.designation || '').toLowerCase();
  const dept = (staff.department || '').toLowerCase();

  // Explicit site engineers & supervisors are site-based
  if (
    role.includes('site engineer') || 
    role === 'site_engineer' || 
    role.includes('site supervisor') || 
    role === 'supervisor' ||
    role.includes('field supervisor') ||
    dept.includes('construction') && (role.includes('engineer') || role.includes('supervisor'))
  ) {
    return false;
  }

  // All other staff are Office Staff (Pammal, Chennai Head Office)
  return true;
}

/**
 * Haversine formula to compute great-circle distance in meters between two GPS coordinates
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export interface GeofenceCheckResult {
  isOfficeStaff: boolean;
  targetName: string;
  targetAddress: string;
  targetLatitude: number;
  targetLongitude: number;
  currentLatitude?: number;
  currentLongitude?: number;
  distanceMeters: number;
  allowedRadiusMeters: number;
  isInsideGeofence: boolean;
  locationStatus: 'INSIDE_OFFICE' | 'OUTSIDE_OFFICE' | 'INSIDE_SITE' | 'OUTSIDE_SITE';
  statusText: string;
  canPunch: boolean;
}

/**
 * Evaluates whether a given staff member at given (or detected) GPS coordinates is inside the required geofence.
 */
export function evaluateStaffGeofence(
  staff: StaffRoleMeta | null,
  currentLat?: number,
  currentLon?: number,
  customSiteName?: string
): GeofenceCheckResult {
  const officeStaff = isStaffOfficeBased(staff);

  if (officeStaff) {
    // Must be at Booshnam Head Office: Plot No. 8, LIC Colony, 6th Street, Pammal, Chennai - 600075
    const targetLat = BOOSHNAM_OFFICE_GEOFENCE.latitude;
    const targetLon = BOOSHNAM_OFFICE_GEOFENCE.longitude;
    const allowedRadius = BOOSHNAM_OFFICE_GEOFENCE.radiusMeters;

    let distance = 10;
    if (typeof currentLat === 'number' && typeof currentLon === 'number') {
      distance = calculateHaversineDistanceMeters(currentLat, currentLon, targetLat, targetLon);
    }

    const isInside = distance <= allowedRadius;

    return {
      isOfficeStaff: true,
      targetName: BOOSHNAM_OFFICE_GEOFENCE.name,
      targetAddress: BOOSHNAM_OFFICE_GEOFENCE.address,
      targetLatitude: targetLat,
      targetLongitude: targetLon,
      currentLatitude: currentLat,
      currentLongitude: currentLon,
      distanceMeters: distance,
      allowedRadiusMeters: allowedRadius,
      isInsideGeofence: isInside,
      locationStatus: isInside ? 'INSIDE_OFFICE' : 'OUTSIDE_OFFICE',
      statusText: isInside
        ? `${distance}m • Inside Office Geofence (Pammal, Chennai)`
        : `${distance > 1000 ? (distance / 1000).toFixed(1) + ' km' : distance + 'm'} away • Outside Office Geofence`,
      canPunch: isInside,
    };
  }

  // Site-based staff (Site Engineer / Supervisor)
  const defaultSiteLat = 9.7282; // Theni Runway Project
  const defaultSiteLon = 77.2882;
  const siteAllowedRadius = 250;

  let distance = 12;
  if (typeof currentLat === 'number' && typeof currentLon === 'number') {
    distance = calculateHaversineDistanceMeters(currentLat, currentLon, defaultSiteLat, defaultSiteLon);
  }

  const isInside = distance <= siteAllowedRadius;

  return {
    isOfficeStaff: false,
    targetName: customSiteName || 'Active Construction Site',
    targetAddress: 'Approved Project Construction Zone',
    targetLatitude: defaultSiteLat,
    targetLongitude: defaultSiteLon,
    currentLatitude: currentLat,
    currentLongitude: currentLon,
    distanceMeters: distance,
    allowedRadiusMeters: siteAllowedRadius,
    isInsideGeofence: isInside,
    locationStatus: isInside ? 'INSIDE_SITE' : 'OUTSIDE_SITE',
    statusText: isInside
      ? `${distance}m • Inside Site Geofence`
      : `${distance > 1000 ? (distance / 1000).toFixed(1) + ' km' : distance + 'm'} away • Outside Site Geofence`,
    canPunch: isInside,
  };
}
