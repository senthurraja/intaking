import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import type { Settings } from '../types';

/** Meal reminders and the evening nudge.
 *
 *  These are the two switches in Settings › Entry & reminders that cannot work
 *  as a web page — they are the clearest thing the native build buys you, and
 *  they need the paid Apple Developer Program to survive past a 7-day
 *  free-provisioning signature. */

const MEAL_ID_BASE = 100;
const NUDGE_ID = 200;

const MEAL_BODIES = [
  'Breakfast — write it down before the day gets away.',
  'Lunch. A line now beats a guess tonight.',
  'Supper. Log the plate before you eat it.',
];

function parseTime(hhmm: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export async function ensurePermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const current = await LocalNotifications.checkPermissions();
  if (current.display === 'granted') return true;
  const asked = await LocalNotifications.requestPermissions();
  return asked.display === 'granted';
}

/** Rewrites the whole schedule from settings. Called whenever a reminder
 *  switch or time changes — simpler and less error-prone than diffing. */
export async function syncSchedule(settings: Settings): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const pending = await LocalNotifications.getPending();
  const ours = pending.notifications.filter(
    (n) => n.id === NUDGE_ID || (n.id >= MEAL_ID_BASE && n.id < MEAL_ID_BASE + 24),
  );
  if (ours.length) {
    await LocalNotifications.cancel({ notifications: ours.map((n) => ({ id: n.id })) });
  }

  const wanted: Parameters<typeof LocalNotifications.schedule>[0]['notifications'] = [];

  if (settings.mealReminders) {
    settings.reminderTimes.forEach((t, i) => {
      const at = parseTime(t);
      if (!at) return;
      wanted.push({
        id: MEAL_ID_BASE + i,
        title: 'Intaking',
        body: MEAL_BODIES[i] ?? 'Time to log a meal.',
        schedule: { on: { hour: at.hour, minute: at.minute }, allowWhileIdle: true },
      });
    });
  }

  if (settings.nudgeIfEmpty) {
    wanted.push({
      id: NUDGE_ID,
      title: 'Intaking',
      body: 'Nothing written down today. Even one line keeps the streak.',
      schedule: { on: { hour: 21, minute: 0 }, allowWhileIdle: true },
    });
  }

  if (!wanted.length) return;
  const granted = await ensurePermission();
  if (!granted) return;
  await LocalNotifications.schedule({ notifications: wanted });
}

export async function cancelAll(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) {
    await LocalNotifications.cancel({
      notifications: pending.notifications.map((n) => ({ id: n.id })),
    });
  }
}
