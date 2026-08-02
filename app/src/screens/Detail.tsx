import { useMemo } from 'react';
import { useStore } from '../state/store';
import {
  average,
  daysInRange,
  fmt,
  loggedDays,
  macrosFor,
  mealAverages,
  MEAL_LABEL,
  mostLogged,
  series,
  sourceSplit,
  spread,
  streak,
  toDisplayEnergy,
  weekdayPattern,
} from '../lib/analytics';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface Props {
  onBack: () => void;
}

export function Detail({ onBack }: Props) {
  const { state } = useStore();
  const { entries, settings } = state;

  const points = useMemo(() => series(entries, 28, settings.dayStartHour), [entries, settings]);
  const logged = loggedDays(points);
  const totals = logged.map((p) => p.total);

  const periodEntries = useMemo(() => {
    const first = points[0]?.date.getTime() ?? 0;
    return entries.filter((e) => e.ts >= first);
  }, [entries, points]);

  const avg = average(totals);
  const sd = spread(totals);
  const inRange = daysInRange(points, settings.goal, settings.inRangeBand);
  const run = streak(entries, settings.dayStartHour);
  const pattern = weekdayPattern(points, settings.weekStart);
  const meals = mealAverages(periodEntries, settings.dayStartHour);
  const top = mostLogged(periodEntries, 3);
  const split = sourceSplit(periodEntries);
  const macros = macrosFor(periodEntries);
  const perDayMacros = logged.length
    ? {
        protein: Math.round(macros.protein / logged.length),
        carbs: Math.round(macros.carbs / logged.length),
        fat: Math.round(macros.fat / logged.length),
      }
    : { protein: 0, carbs: 0, fat: 0 };

  const first = points[0]?.date;
  const last = points[points.length - 1]?.date;

  const outlier = logged.reduce<{ day: string; delta: number } | null>((acc, p) => {
    const delta = p.total - settings.goal;
    if (!acc || Math.abs(delta) > Math.abs(acc.delta)) {
      return { day: DAYS[p.date.getDay()], delta };
    }
    return acc;
  }, null);

  const maxPattern = Math.max(...pattern.map((p) => p.avg), 1);
  const maxMeal = Math.max(...meals.map((m) => m.avg), 1);

  if (!logged.length) {
    return (
      <div className="scr">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0 12px' }}>
          <button className="btn btn-ghost" style={{ padding: 0 }} onClick={onBack}>
            ← Trends
          </button>
        </div>
        <h3 style={{ margin: '0 0 4px' }}>Detailed analytics</h3>
        <p className="hand" style={{ fontSize: 22, color: 'var(--color-accent-700)', marginTop: 20 }}>
          nothing logged in the last four weeks
        </p>
        <p style={{ font: '400 13.5px/1.6 var(--font-body)', color: 'rgba(32,30,29,.65)' }}>
          Log a few days and this page fills itself in — averages, spread, the weekday pattern and
          where the calories actually come from.
        </p>
      </div>
    );
  }

  return (
    <div className="scr">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0 12px' }}>
        <button className="btn btn-ghost" style={{ padding: 0 }} onClick={onBack}>
          ← Trends
        </button>
        <span className="kick" style={{ marginLeft: 'auto' }}>
          {first && last
            ? `${first.getDate()} ${MONTHS[first.getMonth()]} – ${last.getDate()} ${MONTHS[last.getMonth()]}`
            : ''}
        </span>
      </div>
      <h3 style={{ margin: '0 0 4px' }}>Detailed analytics</h3>
      <p
        style={{
          font: '400 12.5px/1.6 var(--font-body)',
          color: 'rgba(32,30,29,.6)',
          margin: 0,
        }}
      >
        Four weeks, {logged.length} logged {logged.length === 1 ? 'day' : 'days'},{' '}
        {periodEntries.length} entries.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '14px 18px',
          marginTop: 18,
          paddingTop: 12,
          borderTop: '1px solid var(--color-text)',
        }}
      >
        <Stat
          label="Daily average"
          value={fmt(toDisplayEnergy(avg, settings.units))}
          note={`${avg - settings.goal < 0 ? '−' : '+'}${fmt(Math.abs(avg - settings.goal))} vs goal`}
        />
        <Stat label="Spread" value={`±${fmt(sd)}`} note={sd < 300 ? 'tight' : 'wide'} />
        <Stat
          label="Days in range"
          value={`${inRange} / ${logged.length}`}
          note={`±${settings.inRangeBand} of goal`}
        />
        <Stat
          label="Current streak"
          value={`${run} ${run === 1 ? 'day' : 'days'}`}
          note={run > 0 ? 'running now' : 'start one today'}
        />
      </div>

      <div style={{ marginTop: 22 }}>
        <div className="kick">Weekday pattern</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100, marginTop: 10 }}>
          {pattern.map((p, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${Math.max(2, (p.avg / maxPattern) * 96)}px`,
                background: p.weekend ? 'var(--color-accent-2-300)' : 'var(--color-neutral-300)',
              }}
            />
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 5,
            fontSize: 10,
            color: 'rgba(32,30,29,.5)',
          }}
        >
          {pattern.map((p, i) => (
            <span key={i} style={{ flex: 1, textAlign: 'center' }}>
              {p.label}
            </span>
          ))}
        </div>
        {outlier && (
          <p
            className="hand"
            style={{ fontSize: 18, margin: '8px 0 0', color: 'var(--color-accent-700)' }}
          >
            {outlier.day} is the outlier — {outlier.delta > 0 ? '+' : ''}
            {fmt(outlier.delta)}
          </p>
        )}
      </div>

      {meals.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div className="kick">By meal</div>
          <div className="ruled" style={{ marginTop: 8 }}>
            {meals.map((m) => (
              <div className="row" key={m.meal}>
                <span style={{ font: '400 13.5px var(--font-body)', textTransform: 'capitalize' }}>
                  {MEAL_LABEL[m.meal]}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(32,30,29,.5)' }}>avg</span>
                <span className="hand" style={{ marginLeft: 'auto', fontSize: 18 }}>
                  {fmt(toDisplayEnergy(m.avg, settings.units))}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 44, marginTop: 8 }}>
            {meals.map((m) => (
              <div
                key={m.meal}
                style={{
                  flex: 1,
                  height: `${Math.max(2, (m.avg / maxMeal) * 42)}px`,
                  background: 'var(--color-accent-200)',
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 22 }}>
        <div className="kick">Macros against target</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          {[
            { label: 'Protein', have: perDayMacros.protein, want: settings.targets.protein, bg: 'var(--color-accent)' },
            { label: 'Carbs', have: perDayMacros.carbs, want: settings.targets.carbs, bg: 'var(--color-accent-300)' },
            { label: 'Fat', have: perDayMacros.fat, want: settings.targets.fat, bg: 'var(--color-neutral-400)' },
          ].map((m) => (
            <div key={m.label}>
              <div style={{ display: 'flex', font: '400 12px var(--font-body)' }}>
                <span>{m.label}</span>
                <span style={{ marginLeft: 'auto', color: 'rgba(32,30,29,.55)' }}>
                  {m.have} g of {m.want} g
                </span>
              </div>
              <div
                style={{
                  height: 8,
                  background: 'var(--color-neutral-200)',
                  marginTop: 5,
                  position: 'relative',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${Math.min(100, m.want ? (m.have / m.want) * 100 : 0)}%`,
                    background: m.bg,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {top.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div className="kick">Most logged</div>
          <div className="ruled" style={{ marginTop: 8 }}>
            {top.map((t) => (
              <div className="row" key={t.name}>
                <span
                  style={{
                    font: '400 13.5px var(--font-body)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.name}
                </span>
                <span className="hand" style={{ marginLeft: 'auto', fontSize: 18 }}>
                  {t.count}×
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: 20,
          paddingTop: 12,
          borderTop: '1px solid var(--color-text)',
          display: 'flex',
          gap: 24,
        }}
      >
        <Stat label="Scanned" value={`${split.scanned}%`} big />
        <Stat label="Photo" value={`${split.photo}%`} big />
        <Stat label="Typed" value={`${split.typed}%`} big />
      </div>

      <button className="btn btn-ghost btn-block" style={{ marginTop: 16 }} onClick={onBack}>
        Back to the week
      </button>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  big,
}: {
  label: string;
  value: string;
  note?: string;
  big?: boolean;
}) {
  return (
    <div>
      <div className="kick">{label}</div>
      <div className="hand" style={{ fontSize: big ? 22 : 26 }}>
        {value}
      </div>
      {note && (
        <div style={{ font: '400 11px var(--font-body)', color: 'rgba(32,30,29,.55)' }}>{note}</div>
      )}
    </div>
  );
}
