import { useMemo, useState } from 'react';
import { useStore } from '../state/store';
import { Chart } from '../components/Chart';
import {
  average,
  fmt,
  loggedDays,
  macroSplit,
  macrosFor,
  series,
  spread,
  toDisplayEnergy,
} from '../lib/analytics';
import { recommendations } from '../lib/recommendations';

const RANGES = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: 'Year', days: 365 },
];

/** A one-line read on the period, in the design's register: descriptive, no
 *  praise and no telling-off — and no verdict at all until there are enough
 *  days to justify one. Calling a single logged day "well under" would be the
 *  chart lying about its own confidence. */
function headline(avg: number, goal: number, band: number, sd: number, days: number): string {
  if (avg === 0 || days === 0) return 'Nothing to read yet';
  if (days < 3) return days === 1 ? 'One day down' : 'Too early to say';
  const delta = avg - goal;
  if (sd > 500) return 'Uneven, week to week';
  if (Math.abs(delta) <= band) return 'Steady, close to the line';
  if (delta < 0) return delta < -band * 3 ? 'Well under, consistently' : 'Steady, a little under';
  return delta > band * 3 ? 'Running well over' : 'Steady, a little over';
}

interface Props {
  onDetail: () => void;
}

export function Trends({ onDetail }: Props) {
  const { state, toggleRec } = useStore();
  const { entries, settings, recsDone } = state;
  const [days, setDays] = useState(7);

  const points = useMemo(
    () => series(entries, days, settings.dayStartHour),
    [entries, days, settings.dayStartHour],
  );
  const logged = loggedDays(points);
  const avg = average(logged.map((p) => p.total));
  const sd = spread(logged.map((p) => p.total));
  const delta = avg - settings.goal;

  const periodEntries = useMemo(() => {
    const first = points[0]?.date.getTime() ?? 0;
    return entries.filter((e) => e.ts >= first);
  }, [entries, points]);
  const split = macroSplit(macrosFor(periodEntries));

  const lastMonthAvg = useMemo(() => {
    if (!settings.compareLastMonth) return undefined;
    const prev = series(entries, days * 2, settings.dayStartHour).slice(0, days);
    const prevLogged = loggedDays(prev);
    return prevLogged.length ? average(prevLogged.map((p) => p.total)) : undefined;
  }, [entries, days, settings.compareLastMonth, settings.dayStartHour]);

  const recs = useMemo(() => recommendations(entries, settings), [entries, settings]);
  const doneCount = recs.filter((r) => recsDone[r.id]).length;

  const widest = Math.max(split.protein, split.carbs, split.fat, 1);
  const barWidth = (pct: number) => `${Math.round((pct / widest) * 170)}px`;

  return (
    <div className="scr">
      <div style={{ padding: '14px 0 4px' }}>
        <div className="kick">
          {days === 7 ? 'Last seven days' : days === 30 ? 'Last thirty days' : 'The year so far'}
        </div>
        <h3 style={{ margin: '6px 0 0' }}>
          {headline(avg, settings.goal, settings.inRangeBand, sd, logged.length)}
        </h3>
      </div>
      <p
        className="hand"
        style={{ fontSize: 19, color: 'var(--color-accent-700)', margin: '8px 0 0' }}
      >
        {logged.length === 0
          ? 'no days logged in this stretch'
          : logged.length < 3
            ? `${logged.length} of ${days} days written down so far`
            : `avg ${fmt(toDisplayEnergy(avg, settings.units))} — ${fmt(Math.abs(delta))} ${delta < 0 ? 'under' : 'over'} goal`}
      </p>

      <div className="seg" style={{ marginTop: 14, width: '100%' }}>
        {RANGES.map((r) => (
          <label className="seg-opt" key={r.days} style={{ flex: 1, justifyContent: 'center' }}>
            <input
              type="radio"
              name="range"
              checked={days === r.days}
              onChange={() => setDays(r.days)}
            />
            {r.label}
          </label>
        ))}
      </div>

      <Chart points={points} settings={settings} lastMonthAvg={lastMonthAvg} />

      {periodEntries.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div className="kick">Where the calories come from</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 10 }}>
            {[
              { label: 'Protein', pct: split.protein, bg: 'var(--color-accent)' },
              { label: 'Carbs', pct: split.carbs, bg: 'var(--color-accent-300)' },
              { label: 'Fat', pct: split.fat, bg: 'var(--color-neutral-400)' },
            ].map((row) => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ font: '400 12px var(--font-body)', width: 56 }}>{row.label}</span>
                <span style={{ height: 9, width: barWidth(row.pct), background: row.bg }} />
                <span className="hand" style={{ fontSize: 17 }}>
                  {row.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 20, paddingTop: 12, borderTop: '1px solid var(--color-text)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span className="kick">To move the line up</span>
          <span className="kick" style={{ marginLeft: 'auto' }}>
            {doneCount} of {recs.length} done
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
          {recs.map((r, i) => (
            <div key={r.id} style={{ display: 'flex', gap: 10, opacity: recsDone[r.id] ? 0.5 : 1 }}>
              <span
                className="hand"
                style={{
                  fontSize: 22,
                  lineHeight: 1,
                  color: 'var(--color-accent-700)',
                  width: 16,
                  flex: 'none',
                }}
              >
                {i + 1}
              </span>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    font: '400 13px/1.55 var(--font-body)',
                    margin: 0,
                    textDecoration: recsDone[r.id] ? 'line-through' : undefined,
                  }}
                >
                  {r.text}
                </p>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '4px 0', fontSize: 12 }}
                  onClick={() => toggleRec(r.id)}
                >
                  {recsDone[r.id] ? 'Done ✓ — undo' : 'Mark as done'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="btn btn-secondary btn-block" style={{ marginTop: 18 }} onClick={onDetail}>
        See detailed analytics
      </button>
    </div>
  );
}
