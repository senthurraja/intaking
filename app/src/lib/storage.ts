import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

/** Persistence.
 *
 *  Structured data goes through @capacitor/preferences, which is UserDefaults
 *  on iOS — it survives app updates and is included in device backups, unlike
 *  WKWebView's localStorage, which iOS is free to evict under storage
 *  pressure. On the web (dev server) the plugin falls back to localStorage
 *  automatically, so the same code runs in both places.
 *
 *  Photos are far too big for UserDefaults, so they go to the app's Data
 *  directory as files and the entry keeps only the filename. */

const KEY = 'intaking.state.v1';

export async function loadRaw(): Promise<string | null> {
  const { value } = await Preferences.get({ key: KEY });
  return value ?? null;
}

export async function saveRaw(json: string): Promise<void> {
  await Preferences.set({ key: KEY, value: json });
}

export async function clearAll(): Promise<void> {
  await Preferences.remove({ key: KEY });
}

const PHOTO_DIR = 'photos';

/** Writes a captured photo into the app's data directory and returns the
 *  filename to store on the entry. */
export async function savePhoto(base64: string, id: string): Promise<string> {
  const name = `${PHOTO_DIR}/${id}.jpeg`;
  try {
    await Filesystem.mkdir({
      path: PHOTO_DIR,
      directory: Directory.Data,
      recursive: true,
    });
  } catch {
    // already exists — the plugin throws rather than no-opping
  }
  await Filesystem.writeFile({
    path: name,
    data: base64,
    directory: Directory.Data,
  });
  return name;
}

/** Resolves a stored photo path to something an <img src> can display. */
export async function photoSrc(path: string): Promise<string | null> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { uri } = await Filesystem.getUri({
        path,
        directory: Directory.Data,
      });
      return Capacitor.convertFileSrc(uri);
    }
    const { data } = await Filesystem.readFile({
      path,
      directory: Directory.Data,
    });
    return `data:image/jpeg;base64,${data as string}`;
  } catch {
    return null;
  }
}

export async function deletePhoto(path: string): Promise<void> {
  try {
    await Filesystem.deleteFile({ path, directory: Directory.Data });
  } catch {
    // the file may already be gone; deleting an entry should not fail on it
  }
}

/** SHA-256, used to store the PIN as a hash rather than in the clear. */
export async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
