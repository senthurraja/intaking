import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

/** Photo capture for the meal-estimate flow.
 *
 *  Returns raw base64 (no data: prefix) so it can go straight to the
 *  filesystem. Quality is deliberately modest — these are working notes on a
 *  plate, not photographs, and a year of them should not fill the phone. */

export interface CapturedPhoto {
  base64: string;
  /** A data URI for immediate display, before the file is written. */
  preview: string;
}

export function cameraAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

async function take(source: CameraSource): Promise<CapturedPhoto | null> {
  try {
    const photo = await Camera.getPhoto({
      quality: 70,
      width: 1400,
      correctOrientation: true,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source,
      promptLabelHeader: 'Photograph the plate',
      promptLabelPhoto: 'Choose from library',
      promptLabelPicture: 'Take a photo',
    });
    if (!photo.base64String) return null;
    return {
      base64: photo.base64String,
      preview: `data:image/${photo.format || 'jpeg'};base64,${photo.base64String}`,
    };
  } catch (err) {
    // The user cancelling the picker throws; that is not an error condition.
    const message = err instanceof Error ? err.message.toLowerCase() : '';
    if (message.includes('cancel')) return null;
    throw err;
  }
}

export const capturePhoto = () => take(CameraSource.Camera);
export const pickPhoto = () => take(CameraSource.Photos);
export const promptForPhoto = () => take(CameraSource.Prompt);

export async function ensurePhotoPermission(): Promise<boolean> {
  if (!cameraAvailable()) return false;
  const status = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
  return status.camera === 'granted' || status.photos === 'granted';
}
