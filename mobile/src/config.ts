import { Platform } from 'react-native';

/**
 * SiteOps Mobile App Configuration
 * 
 * WIRELESS & LOCAL DEBUGGING:
 * 1. When connected via ADB (Wi-Fi or USB) with 'adb reverse tcp:8000 tcp:8000',
 *    'http://127.0.0.1:8000/api/v1' routes directly to your development PC's Django backend.
 * 2. If running standalone on phone without adb reverse, LAN_HOST_IP is used as direct Wi-Fi endpoint.
 */

// Host PC IP on local Wi-Fi network
export const LAN_HOST_IP = '192.168.1.13';
export const BACKEND_PORT = 8000;
export const METRO_PORT = 8081;

// Primary API endpoint: uses loopback with adb reverse
export const BACKEND_URL = Platform.select({
  android: `http://127.0.0.1:${BACKEND_PORT}/api/v1`,
  ios: `http://localhost:${BACKEND_PORT}/api/v1`,
  default: `http://localhost:${BACKEND_PORT}/api/v1`,
});

// Direct LAN endpoint: direct Wi-Fi communication without ADB reverse
export const BACKEND_LAN_URL = `http://${LAN_HOST_IP}:${BACKEND_PORT}/api/v1`;

export default {
  BACKEND_URL,
  BACKEND_LAN_URL,
  LAN_HOST_IP,
  BACKEND_PORT,
  METRO_PORT,
};
