import type { Entry, Macros, Meal, Settings } from '../types';

/* Everything the Trends and Detailed Analytics screens show, computed from the
   real ledger. The prototype hard-coded these figures (2,095 average, 19/26 in
   range, "Saturday is the outlier"); here they are derived, so the screens tell
   the truth about whatever has actually been logged. */

const MS_DAY = 86_400_000;

/** The ledger day an entry belongs to, honouring "day starts at 04:00" — a
 *  01:00 snack counts to the day before. Returned as local midnight. */
export function ledgerDate(ts: number, dayStartHour: number): Date {
  const d = new Date(ts - dayStartHour * 3_600_000);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function dayKey(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function entryDayKey(e: Entry, dayStartHour: number): string {
  return dayKey(ledgerDate(e.ts, dayStartHour));
}

export function todayKey(dayStartHour: number): string {
  return dayKey(ledgerDate(Date.now(), dayStartHour));
}

/** Which meal a timestamp falls in, used to pre-fill the confirm sheet. */
export function mealForDate(d: Date): Meal {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 4 && h < 10.5) return 'breakfast';
  if (h < 12) return 'morning';
  if (h < 15) return 'lunch';
  if (h < 18) return 'afternoon';
  if (h < 22) return 'supper';
  return 'evening';
}

export const MEAL_LABEL: Record<Meal, string> = {
  breakfast: 'breakfast',
  morning: 'morning',
  lunch: 'lunch',
  afternoon: 'afternoon',
  supper: 'supper',
  evening: 'evening',
};

export function hhmm(ts: number): string {
  const d = new Date(ts);
  return `${`${d.getHours()}`.padStart(2, '0')}:${`${d.getMinutes()}`.padStart(2, '0')}`;
}

/* ── energy ───────────────────────────────────────────────────────────── */

export function toDisplayEnergy(kcal: number, units: Settings['units']): number {
  return units === 'kJ' ? Math.round(kcal * 4.184) : Math.round(kcal);
}

export function energyLabel(units: Settings['units']): string {
  return units === 'kJ' ? 'kJ' : 'kcal';
}

export function fmt(n: number): string {
  return Math.round(n).toLocaleString();
}

/* ── grouping ─────────────────────────────────────────────────────────── */

export function entriesForDay(entries: Entry[], key: string, dayStartHour: number): Entry[] {
  return entries
    .filter((e) => entryDayKey(e, dayStartHour) === key)
    .sort((a, b) => a.ts - b.ts);
}

export function dayTotal(entries: Entry[]): number {
  return entries.reduce((t, e) => t + e.kcal, 0);
}

/** Macros for a set of entries. Entries carrying real macro data (anything
 *  scanned) contribute exactly; the rest are apportioned from their calories on
 *  a typical mixed-diet split, so a hand-typed day still reads sensibly rather
 *  than showing zero protein. */
export function macrosFor(entries: Entry[]): Macros {
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  for (const e of entries) {
    if (e.macros) {
      protein += e.macros.protein;
      carbs += e.macros.carbs;
      fat += e.macros.fat;
    } else {
      protein += (e.kcal * 0.18) / 4;
      carbs += (e.kcal * 0.5) / 4;
      fat += (e.kcal * 0.32) / 9;
    }
  }
  return { protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat) };
}

/** The share of energy each macro contributes, as whole percentages summing
 *  to 100 — the "Where the calories come from" bars. */
export function macroSplit(m: Macros): { protein: number; carbs: number; fat: number } {
  const kcal = m.protein * 4 + m.carbs * 4 + m.fat * 9;
  if (kcal <= 0) return { protein: 0, carbs: 0, fat: 0 };
  const p = Math.round(((m.protein * 4) / kcal) * 100);
  const c = Math.round(((m.carbs * 4) / kcal) * 100);
  return { protein: p, carbs: c, fat: Math.max(0, 100 - p - c) };
}

/* ── series ───────────────────────────────────────────────────────────── */

export interface DayPoint {
  key: string;
  date: Date;
  total: number;
  count: number;
  /** Sat/Sun, for the weekend shading option. */
  weekend: boolean;
}

/** The last `days` ledger days, oldest first, including days with nothing
 *  logged (they carry total 0 and count 0 so gaps stay visible). */
export function series(entries: Entry[], days: number, dayStartHour: number): DayPoint[] {
  const byDay = new Map<string, Entry[]>();
  for (const e of entries) {
    const k = entryDayKey(e, dayStartHour);
    const list = byDay.get(k);
    if (list) list.push(e);
    else byDay.set(k, [e]);
  }
  const out: DayPoint[] = [];
  const start = ledgerDate(Date.now(), dayStartHour);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(start.getTime() - i * MS_DAY);
    const k = dayKey(d);
    const list = byDay.get(k) ?? [];
    const dow = d.getDay();
    out.push({
      key: k,
      date: d,
      total: dayTotal(list),
      count: list.length,
      weekend: dow === 0 || dow === 6,
    });
  }
  return out;
}

/** Days that actually have entries — averages should not be dragged down by
 *  days the user simply did not open the app. */
export function loggedDays(points: DayPoint[]): DayPoint[] {
  return points.filter((p) => p.count > 0);
}

export function average(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Population standard deviation, shown as the "Spread ±" figure. */
export function spread(nums: number[]): number {
  if (nums.length < 2) return 0;
  const mean = average(nums);
  return Math.sqrt(average(nums.map((n) => (n - mean) ** 2)));
}

/** A trailing mean over `window` days, used for the faint 7-day average line
 *  drawn behind the main trend. */
export function rollingAverage(points: DayPoint[], window = 7): number[] {
  return points.map((_, i) => {
    const slice = points.slice(Math.max(0, i - window + 1), i + 1).filter((p) => p.count > 0);
    return slice.length ? average(slice.map((p) => p.total)) : 0;
  });
}

/** Consecutive ledger days with at least one entry, counting back from today
 *  (or from yesterday, so the streak does not read as broken before the first
 *  entry of the current day). */
export function streak(entries: Entry[], dayStartHour: number): number {
  if (!entries.length) return 0;
  const logged = new Set(entries.map((e) => entryDayKey(e, dayStartHour)));
  const start = ledgerDate(Date.now(), dayStartHour);
  let n = 0;
  const todayLogged = logged.has(dayKey(start));
  for (let i = todayLogged ? 0 : 1; ; i++) {
    const d = new Date(start.getTime() - i * MS_DAY);
    if (!logged.has(dayKey(d))) break;
    n++;
    if (n > 3650) break;
  }
  return n;
}

export function daysInRange(points: DayPoint[], goal: number, band: number): number {
  return loggedDays(points).filter((p) => Math.abs(p.total - goal) <= band).length;
}

/** Mean total per weekday, Monday-first or Sunday-first per the setting. */
export function weekdayPattern(
  points: DayPoint[],
  weekStart: Settings['weekStart'],
): { label: string; avg: number; weekend: boolean }[] {
  const order = weekStart === 'sun' ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 0];
  const names = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return order.map((dow) => {
    const vals = loggedDays(points)
      .filter((p) => p.date.getDay() === dow)
      .map((p) => p.total);
    return { label: names[dow], avg: average(vals), weekend: dow === 0 || dow === 6 };
  });
}

export function mealAverages(
  entries: Entry[],
  dayStartHour: number,
): { meal: Meal; avg: number }[] {
  const meals: Meal[] = ['breakfast', 'morning', 'lunch', 'afternoon', 'supper', 'evening'];
  return meals
    .map((meal) => {
      const relevant = entries.filter((e) => e.meal === meal);
      if (!relevant.length) return { meal, avg: 0 };
      // average per day that had this meal, not per entry
      const byDay = new Map<string, number>();
      for (const e of relevant) {
        const k = entryDayKey(e, dayStartHour);
        byDay.set(k, (byDay.get(k) ?? 0) + e.kcal);
      }
      return { meal, avg: average([...byDay.values()]) };
    })
    .filter((m) => m.avg > 0);
}

export function mostLogged(entries: Entry[], limit = 3): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const e of entries) {
    const k = e.name.trim();
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function sourceSplit(entries: Entry[]): { scanned: number; photo: number; typed: number } {
  const n = entries.length;
  if (!n) return { scanned: 0, photo: 0, typed: 0 };
  const c = { scanned: 0, photo: 0, typed: 0 };
  for (const e of entries) c[e.source]++;
  return {
    scanned: Math.round((c.scanned / n) * 100),
    photo: Math.round((c.photo / n) * 100),
    typed: Math.round((c.typed / n) * 100),
  };
}
