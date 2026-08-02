import { useMemo } from 'react';
import { useStore } from '../state/store';
import {
  average,
  daysInRange,
  dayTotal,
  energyLabel,
  entriesForDay,
  fmt,
  hhmm,
  loggedDays,
  macrosFor,
  series,
  streak,
  toDisplayEnergy,
  todayKey,
} from '../lib/analytics';
import type { Entry } from '../types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface Props {
  onScan: () => void;
  onPhoto: () => void;
  onOpenEntry: (e: Entry) => void;
  onDetail: () => void;
}

export function Today({ onScan, onPhoto, onOpenEntry, onDetail }: Props) {
  const { state } = useStore();
  const { entries, settings, auth } = state;

  const key = todayKey(settings.dayStartHour);
  const today = useMemo(
    () => entriesForDay(entries, key, settings.dayStartHour),
    [entries, key, settings.dayStartHour],
  );

  const now = new Date();
  const ate = dayTotal(today);
  const remaining = settings.goal - ate;
  const over = remaining < 0;
  const macros = macrosFor(today);
  const unit = energyLabel(settings.units);

  const dayNumber = Math.max(
    1,
    Math.floor((Date.now() - auth.createdAt) / 86_400_000) + 1,
  );
  const run = streak(entries, settings.dayStartHour);

  const week = useMemo(() => series(entries, 7, settings.dayStartHour), [entries, settings]);
  const weekLogged = loggedDays(week);
  const weekAvg = average(weekLogged.map((p) => p.total));
  const inRange = daysInRange(week, settings.goal, settings.inRangeBand);
  const outlier = weekLogged.reduce<{ label: string; delta: number } | null>((acc, p) => {
    const delta = p.total - settings.goal;
    if (!acc || Math.abs(delta) > Math.abs(acc.delta)) {
      return { label: DAYS[p.date.getDay()], delta };
    }
    return acc;
  }, null);

  const figure = toDisplayEnergy(Math.abs(over ? -remaining : remaining), settings.units);

  return (
    <div className="scr">
      {/* the dateline rail — the same furniture as the front page */}
      <div style={{ padding: '16px 0 0' }}>
        <div style={{ height: 2, background: 'var(--color-text)' }} />
        <div className="mastrow">
          <span>
            {DAYS[now.getDay()].slice(0, 3).toUpperCase()} {now.getDate()}{' '}
            {MONTHS[now.getMonth()].toUpperCase()} {now.getFullYear()}
          </span>
          <span>DAY {dayNumber}</span>
          <span>STREAK {run}</span>
        </div>
        <div style={{ height: 1, background: 'var(--color-text)', opacity: 0.4 }} />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginTop: 20,
        }}
      >
        <div style={{ paddingTop: 6 }}>
          <div className="kick">{DAYS[now.getDay()]}</div>
          <div style={{ font: '600 26px/1 var(--font-heading)', marginTop: 7 }}>
            {now.getDate()} {MONTHS[now.getMonth()]}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            className={settings.handwrittenFigures ? 'hand' : undefined}
            style={{
              fontSize: settings.handwrittenFigures ? 78 : 54,
              lineHeight: 0.72,
              color: over ? 'var(--color-accent-2-700)' : 'var(--color-accent-700)',
              fontFamily: settings.handwrittenFigures ? undefined : 'var(--font-heading)',
              fontWeight: settings.handwrittenFigures ? undefined : 600,
            }}
          >
            {fmt(figure)}
          </div>
          <div className="kick" style={{ marginTop: 8 }}>
            {over ? 'over' : 'left of'} {fmt(toDisplayEnergy(settings.goal, settings.units))}
          </div>
        </div>
      </div>

      {today.length > 0 ? (
        <>
          <div className="ruled" style={{ marginTop: 22 }}>
            {today.map((e) => (
              <button className="erow" key={e.id} onClick={() => onOpenEntry(e)}>
                <span className="etime">{hhmm(e.ts)}</span>
                <span className="ename">
                  {e.name}{' '}
                  {e.source !== 'typed' && (
                    <span className="etag">{e.source === 'scanned' ? 'scanned' : 'photo'}</span>
                  )}
                </span>
                <span className="ekcal">
                  {e.kcalLow != null && e.kcalHigh != null
                    ? `${fmt(toDisplayEnergy(e.kcalLow, settings.units))}–${fmt(toDisplayEnergy(e.kcalHigh, settings.units))}`
                    : fmt(toDisplayEnergy(e.kcal, settings.units))}
                </span>
              </button>
            ))}
            <div className="row" style={{ alignItems: 'center' }}>
              <span className="etime">—</span>
              <span style={{ font: '400 13px var(--font-body)', color: 'rgba(32,30,29,.4)' }}>
                tap a line to edit it
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
              marginTop: 12,
              paddingTop: 8,
              borderTop: '1px solid var(--color-text)',
            }}
          >
            <span className="kick">Ate today</span>
            <span style={{ marginLeft: 'auto', font: '400 14px var(--font-body)' }}>
              {fmt(toDisplayEnergy(ate, settings.units))} {unit}
            </span>
          </div>

          {/* protein is the macro you coach against; carbs and fat sit as small print */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginTop: 18 }}>
            <div>
              <div className="kick">Protein</div>
              <div className="hand" style={{ fontSize: 34, lineHeight: 0.9 }}>
                {macros.protein}
                <span style={{ fontSize: 16 }}>g</span>
              </div>
              <div
                style={{
                  font: '400 10.5px var(--font-body)',
                  color: 'rgba(32,30,29,.5)',
                  marginTop: 3,
                }}
              >
                of {settings.targets.protein} g
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 16,
                paddingBottom: 4,
                font: '400 12px var(--font-body)',
                color: 'rgba(32,30,29,.6)',
              }}
            >
              <span>Carbs {macros.carbs} g</span>
              <span>Fat {macros.fat} g</span>
            </div>
          </div>

          {weekLogged.length >= 3 && (
            <div
              style={{
                marginTop: 22,
                paddingTop: 14,
                borderTop: '1px solid var(--color-text)',
              }}
            >
              <div className="kick">Week in review</div>
              <div style={{ display: 'flex', gap: 22, marginTop: 9 }}>
                <div>
                  <div className="hand" style={{ fontSize: 24 }}>
                    {fmt(toDisplayEnergy(weekAvg, settings.units))}
                  </div>
                  <div
                    style={{ font: '400 10.5px var(--font-body)', color: 'rgba(32,30,29,.5)' }}
                  >
                    daily average
                  </div>
                </div>
                <div>
                  <div className="hand" style={{ fontSize: 24 }}>
                    {inRange} / {weekLogged.length}
                  </div>
                  <div
                    style={{ font: '400 10.5px var(--font-body)', color: 'rgba(32,30,29,.5)' }}
                  >
                    days in range
                  </div>
                </div>
                {outlier && (
                  <div>
                    <div className="hand" style={{ fontSize: 24 }}>
                      {outlier.delta > 0 ? '+' : ''}
                      {fmt(outlier.delta)}
                    </div>
                    <div
                      style={{ font: '400 10.5px var(--font-body)', color: 'rgba(32,30,29,.5)' }}
                    >
                      {outlier.label}
                    </div>
                  </div>
                )}
              </div>
              <button
                className="btn btn-ghost"
                style={{ padding: '6px 0', marginTop: 6 }}
                onClick={onDetail}
              >
                Read the full week →
              </button>
            </div>
          )}

          <div className="btnw" style={{ marginTop: 20 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={onScan}>
              Scan a barcode
            </button>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onPhoto}>
              Photo of a meal
            </button>
          </div>
        </>
      ) : (
        <div style={{ marginTop: 26, paddingTop: 22, borderTop: '1px solid var(--color-text)' }}>
          <div className="ruled" style={{ height: 68, opacity: 0.5 }} />
          <p
            className="hand"
            style={{ fontSize: 25, color: 'var(--color-accent-700)', margin: '18px 0 0' }}
          >
            nothing written down yet
          </p>
          <p
            style={{
              font: '400 13.5px/1.6 var(--font-body)',
              color: 'rgba(32,30,29,.62)',
              margin: '6px 0 0',
            }}
          >
            Start with whatever is nearest — a packet, a plate, a coffee. The first line is the
            hard one.
          </p>
          <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} onClick={onScan}>
            Scan your first item
          </button>
          <button className="btn btn-ghost btn-block" onClick={onPhoto}>
            Photograph a meal instead
          </button>
        </div>
      )}
    </div>
  );
}
