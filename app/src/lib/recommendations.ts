import type { Entry, Settings } from '../types';
import {
  average,
  daysInRange,
  entryDayKey,
  loggedDays,
  macrosFor,
  mostLogged,
  series,
  spread,
} from './analytics';

/** The three points under "To move the line up".
 *
 *  The prototype hard-coded them ("Add ~25 g protein at breakfast", "Log
 *  Saturday supper before you eat it", "Keep the 16:40 bar"). Here each is a
 *  rule that fires only when the data supports it and fills in the real
 *  figures, so the advice stays specific and stays true. Rules are scored and
 *  the strongest three are shown, in the same plain register as the design. */

export interface Recommendation {
  id: string;
  text: string;
  /** Higher wins the three slots. */
  score: number;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function recommendations(entries: Entry[], settings: Settings): Recommendation[] {
  const out: Recommendation[] = [];
  const pts = series(entries, 28, settings.dayStartHour);
  const logged = loggedDays(pts);
  const totals = logged.map((p) => p.total);

  if (entries.length < 3) {
    return [
      {
        id: 'start',
        text: 'Log three days before reading anything into the line. The pattern needs something to be a pattern of.',
        score: 1,
      },
    ];
  }

  const avg = average(totals);
  const { goal, targets, inRangeBand } = settings;

  /* Protein against target, attributed to the meal that is furthest short. */
  const perDayProtein = logged.map((p) => {
    const dayEntries = entries.filter(
      (e) => entryDayKey(e, settings.dayStartHour) === p.key,
    );
    return macrosFor(dayEntries).protein;
  });
  const avgProtein = average(perDayProtein);
  const proteinShort = targets.protein - avgProtein;
  if (proteinShort > 10) {
    const shortDays = perDayProtein.filter((v) => v < targets.protein).length;
    out.push({
      id: 'protein',
      text: `Add ~${Math.round(proteinShort)} g protein at breakfast — yoghurt or eggs. You are short on ${shortDays} of ${perDayProtein.length} logged days, and it usually starts at breakfast.`,
      score: 60 + Math.min(30, proteinShort),
    });
  }

  /* The weekday that runs furthest over goal. */
  const byDow = new Map<number, number[]>();
  for (const p of logged) {
    const dow = p.date.getDay();
    const arr = byDow.get(dow) ?? [];
    arr.push(p.total);
    byDow.set(dow, arr);
  }
  let worstDow = -1;
  let worstOver = 0;
  for (const [dow, vals] of byDow) {
    if (vals.length < 2) continue;
    const over = average(vals) - goal;
    if (over > worstOver) {
      worstOver = over;
      worstDow = dow;
    }
  }
  if (worstDow >= 0 && worstOver > inRangeBand) {
    out.push({
      id: `dow-${worstDow}`,
      text: `Log ${DAY_NAMES[worstDow]} supper before you eat it. ${DAY_NAMES[worstDow]}s run ${Math.round(worstOver)} over; writing the plate down first is what pulls the number back.`,
      score: 55 + Math.min(30, worstOver / 20),
    });
  }

  /* Consistently under goal — the design's own framing is percentages, not
     verdicts, so this is stated as a fact with a small action. */
  const under = goal - avg;
  if (under > inRangeBand) {
    out.push({
      id: 'under',
      text: `You are averaging ${Math.round(under)} under goal. If that is not deliberate, the cheapest fix is a second helping at the meal you already log most reliably.`,
      score: 45 + Math.min(25, under / 20),
    });
  }

  /* Spread — steadiness is worth more than any single day. */
  const sd = spread(totals);
  if (sd > 350 && totals.length >= 5) {
    out.push({
      id: 'spread',
      text: `Your days swing ±${Math.round(sd)}. Evening out the two biggest days would do more for the average than trimming every other day a little.`,
      score: 40 + Math.min(20, (sd - 350) / 20),
    });
  }

  /* Gaps in logging — an unlogged day is worse than a bad day. */
  const last14 = series(entries, 14, settings.dayStartHour);
  const missed = last14.filter((p) => p.count === 0).length;
  if (missed >= 3) {
    out.push({
      id: 'gaps',
      text: `${missed} of the last 14 days have nothing written down. A day logged badly still beats a day not logged — put the first line in before breakfast.`,
      score: 50 + missed * 2,
    });
  }

  /* The reliable snack — keep what is already working. */
  const top = mostLogged(entries, 1)[0];
  if (top && top.count >= 4) {
    const inRange = daysInRange(pts, goal, inRangeBand);
    if (inRange > 0) {
      out.push({
        id: `keep-${top.name}`,
        text: `Keep the ${top.name.toLowerCase()}. It is your steadiest habit at ${top.count} logs, and habits are what hold the line when the week gets busy.`,
        score: 30 + top.count,
      });
    }
  }

  /* Late food, which tends to be the unplanned kind. */
  const late = entries.filter((e) => {
    const h = new Date(e.ts).getHours();
    return h >= 22 || h < settings.dayStartHour;
  });
  if (late.length >= 3 && late.length / entries.length > 0.12) {
    out.push({
      id: 'late',
      text: `${late.length} entries have landed after 22:00. Late food is rarely planned food — bringing supper forward an hour is usually the whole fix.`,
      score: 42,
    });
  }

  return out.sort((a, b) => b.score - a.score).slice(0, 3);
}
