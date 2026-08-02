import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth';
import { Capacitor } from '@capacitor/core';

/** Face ID, behind the login screen's FACE key.
 *
 *  The design offers it as an alternative to the PIN, not a replacement: if
 *  biometry is unavailable or the user dismisses the prompt, the keypad is
 *  still sitting there. */

export interface BiometryStatus {
  available: boolean;
  /** "Face ID", "Touch ID", or null when there is none. */
  label: string | null;
}

export async function checkBiometry(): Promise<BiometryStatus> {
  if (!Capacitor.isNativePlatform()) return { available: false, label: null };
  try {
    const info = await BiometricAuth.checkBiometry();
    if (!info.isAvailable) return { available: false, label: null };
    const label =
      info.biometryType === BiometryType.faceId
        ? 'Face ID'
        : info.biometryType === BiometryType.touchId
          ? 'Touch ID'
          : 'Biometrics';
    return { available: true, label };
  } catch {
    return { available: false, label: null };
  }
}

/** Returns true only on a successful authentication. Every failure path —
 *  cancelled, locked out, unavailable — returns false, because the caller's
 *  response is the same in all of them: stay on the keypad. */
export async function authenticate(reason = 'Open your ledger'): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    await BiometricAuth.authenticate({
      reason,
      cancelTitle: 'Use PIN',
      allowDeviceCredential: false,
      iosFallbackTitle: 'Use PIN',
    });
    return true;
  } catch {
    return false;
  }
}
