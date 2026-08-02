import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import type { Entry } from '../types';
import { entryDayKey, hhmm } from './analytics';

/** CSV export.
 *
 *  On device the file lands in the app's Documents directory, which the Files
 *  app exposes because Info.plist sets UIFileSharingEnabled — so "Export" means
 *  the user can actually get at it, AirDrop it, or open it in Numbers. In the
 *  browser it falls back to an ordinary download. */

function esc(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export function toCsv(entries: Entry[], dayStartHour: number): string {
  const header = [
    'date', 'time', 'name', 'kcal', 'kcal_low', 'kcal_high',
    'meal', 'source', 'servings', 'protein_g', 'carbs_g', 'fat_g', 'barcode',
  ];
  const rows = [...entries]
    .sort((a, b) => a.ts - b.ts)
    .map((e) =>
      [
        entryDayKey(e, dayStartHour),
        hhmm(e.ts),
        e.name,
        Math.round(e.kcal),
        e.kcalLow ?? '',
        e.kcalHigh ?? '',
        e.meal,
        e.source,
        e.servings,
        e.macros?.protein ?? '',
        e.macros?.carbs ?? '',
        e.macros?.fat ?? '',
        e.barcode ?? '',
      ].map(esc).join(','),
    );
  return [header.join(','), ...rows].join('\n');
}

export async function exportCsv(entries: Entry[], dayStartHour: number): Promise<string> {
  const csv = toCsv(entries, dayStartHour);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `intaking-${stamp}.csv`;

  if (!Capacitor.isNativePlatform()) {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return filename;
  }

  await Filesystem.writeFile({
    path: filename,
    data: csv,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
  });
  return filename;
}
