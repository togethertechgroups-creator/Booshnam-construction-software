import {
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification,
  subscribeToTopic,
} from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform, Alert } from 'react-native';

const BACKEND_URL = 'http://192.168.1.6:8000/api/v1';

/**
 * Request notification permissions (required for Android 13+ and iOS)
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  } catch (error) {
    console.warn('[PushNotification] Permission request error:', error);
    return false;
  }
}

/**
 * Register FCM device token with the SiteOps Django backend
 */
export async function registerDeviceToken(userPhone?: string, roleCode?: string) {
  try {
    const messaging = getMessaging();
    const fcmToken = await getToken(messaging);
    console.log('[PushNotification] FCM Device Token obtained successfully:', fcmToken);

    // Subscribe to broadcast topics
    await subscribeToTopic(messaging, 'all');
    if (roleCode) {
      await subscribeToTopic(messaging, `role_${roleCode.toLowerCase()}`);
    } else {
      await subscribeToTopic(messaging, 'role_site_engineer');
      await subscribeToTopic(messaging, 'role_admin');
    }

    // Register with backend
    try {
      await fetch(`${BACKEND_URL}/notifications/register-device/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fcm_token: fcmToken,
          phone: userPhone || '',
          role_code: roleCode || 'SITE_ENGINEER',
          platform: Platform.OS,
        }),
      });
      console.log('[PushNotification] Device registered successfully with backend!');
    } catch (apiErr) {
      console.log('[PushNotification] Backend register attempt finished');
    }

    return fcmToken;
  } catch (err) {
    console.warn('[PushNotification] Error getting FCM token:', err);
    return null;
  }
}

/**
 * Initialize Foreground & Background Push Notification Listeners
 */
export function setupPushNotificationListeners(onNotificationReceived?: (data: any) => void) {
  try {
    const messaging = getMessaging();

    // 1. Foreground message handler
    const unsubscribeForeground = onMessage(messaging, async remoteMessage => {
      console.log('[PushNotification] Foreground message received:', remoteMessage);
      if (remoteMessage.notification) {
        Alert.alert(
          remoteMessage.notification.title || '🔔 Notification',
          remoteMessage.notification.body || ''
        );
      }
      if (onNotificationReceived) {
        onNotificationReceived(remoteMessage.data);
      }
    });

    // 2. Notification opened from background state
    onNotificationOpenedApp(messaging, remoteMessage => {
      console.log('[PushNotification] Notification opened from background:', remoteMessage);
      if (onNotificationReceived) {
        onNotificationReceived(remoteMessage.data);
      }
    });

    // 3. Notification opened from quit state
    getInitialNotification(messaging).then(remoteMessage => {
      if (remoteMessage) {
        console.log('[PushNotification] App opened from quit state by notification:', remoteMessage);
        if (onNotificationReceived) {
          onNotificationReceived(remoteMessage.data);
        }
      }
    });

    return unsubscribeForeground;
  } catch (e) {
    console.warn('[PushNotification] Listener setup error:', e);
    return () => {};
  }
}
