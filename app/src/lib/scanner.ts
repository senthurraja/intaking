import {
  BarcodeScanner,
  BarcodeFormat,
  LensFacing,
} from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';

/** The barcode camera.
 *
 *  On iOS the ML Kit plugin renders the camera preview *behind* the WebView and
 *  relies on the page being transparent to show through — hence the
 *  `body.scanning` class, which clears the paper ground and hides the watermark
 *  and tab bar while the viewfinder is live. Everything drawn on top (the
 *  frame, the magenta scan line, the buttons) is ordinary DOM. */

const FORMATS = [
  BarcodeFormat.Ean13,
  BarcodeFormat.Ean8,
  BarcodeFormat.UpcA,
  BarcodeFormat.UpcE,
  BarcodeFormat.Code128,
  BarcodeFormat.Code39,
  BarcodeFormat.Itf,
];

export function scanningAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

export async function isSupported(): Promise<boolean> {
  if (!scanningAvailable()) return false;
  try {
    const { supported } = await BarcodeScanner.isSupported();
    return supported;
  } catch {
    return false;
  }
}

/** Asks for camera access. Returns false if the user has denied it, so the
 *  caller can offer the type-it-in path instead of failing silently. */
export async function ensurePermission(): Promise<boolean> {
  const { camera } = await BarcodeScanner.requestPermissions();
  return camera === 'granted' || camera === 'limited';
}

export interface ScanSession {
  stop: () => Promise<void>;
}

/** Starts the viewfinder. `onCode` fires once with the first barcode read;
 *  the session stops itself at that point so a single packet cannot log twice. */
export async function startScan(
  onCode: (value: string) => void,
  onError?: (message: string) => void,
): Promise<ScanSession> {
  let stopped = false;

  const listener = await BarcodeScanner.addListener('barcodesScanned', async (event) => {
    if (stopped) return;
    const first = event.barcodes?.[0];
    const value = first?.rawValue || first?.displayValue;
    if (!value) return;
    stopped = true;
    await stop();
    onCode(value.trim());
  });

  const errorListener = await BarcodeScanner.addListener('scanError', (event) => {
    onError?.(event.message ?? 'The camera stopped unexpectedly.');
  });

  async function stop(): Promise<void> {
    stopped = true;
    document.body.classList.remove('scanning');
    try {
      await BarcodeScanner.stopScan();
    } catch {
      // stopping a scanner that has already stopped is not an error worth surfacing
    }
    await listener.remove().catch(() => {});
    await errorListener.remove().catch(() => {});
  }

  document.body.classList.add('scanning');
  try {
    await BarcodeScanner.startScan({ formats: FORMATS, lensFacing: LensFacing.Back });
  } catch (err) {
    await stop();
    throw err;
  }

  return { stop };
}
