import { Platform, PermissionsAndroid, Alert } from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  CameraOptions,
  ImageLibraryOptions,
} from 'react-native-image-picker';

// Built-in site selfie fallback photos if running on emulator or offline
export const SAMPLE_SELFIE_PHOTOS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=600&auto=format&fit=crop',
];

export interface CameraResult {
  success: boolean;
  uri?: string;
  cancelled?: boolean;
  error?: string;
}

export async function requestAndroidCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Booshnam Camera Permission',
        message: 'Booshnam requires camera access to capture live selfie attendance verification.',
        buttonNeutral: 'Ask Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'Grant Camera',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('Camera permission check failed:', err);
    return false;
  }
}

export async function captureSelfiePhoto(): Promise<CameraResult> {
  try {
    const hasPermission = await requestAndroidCameraPermission();
    if (!hasPermission) {
      Alert.alert(
        'Camera Permission',
        'Camera permission was not granted. You can switch selfie photo or choose an image.'
      );
      return { success: false, error: 'Permission denied' };
    }

    const options: CameraOptions = {
      mediaType: 'photo',
      cameraType: 'front',
      quality: 0.8,
      maxWidth: 1200,
      maxHeight: 1200,
      saveToPhotos: false,
    };

    const response = await launchCamera(options);

    if (response.didCancel) {
      return { success: false, cancelled: true };
    }

    if (response.errorCode) {
      console.warn('launchCamera error:', response.errorMessage);
      return { success: false, error: response.errorMessage };
    }

    const asset = response.assets?.[0];
    if (asset?.uri) {
      return { success: true, uri: asset.uri };
    }

    return { success: false, error: 'No image captured' };
  } catch (error: any) {
    console.warn('Native camera capture failed, using fallback:', error?.message);
    return { success: false, error: error?.message };
  }
}

export async function pickPhotoFromGallery(): Promise<CameraResult> {
  try {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1200,
      maxHeight: 1200,
      selectionLimit: 1,
    };

    const response = await launchImageLibrary(options);

    if (response.didCancel) {
      return { success: false, cancelled: true };
    }

    if (response.errorCode) {
      console.warn('launchImageLibrary error:', response.errorMessage);
      return { success: false, error: response.errorMessage };
    }

    const asset = response.assets?.[0];
    if (asset?.uri) {
      return { success: true, uri: asset.uri };
    }

    return { success: false, error: 'No image selected' };
  } catch (error: any) {
    console.warn('Gallery pick failed, using fallback:', error?.message);
    return { success: false, error: error?.message };
  }
}
