import { useState } from 'react';
import { useStore } from '../state/store';
import { Chart } from '../components/Chart';
import { exportCsv } from '../lib/export';
import { checkBiometry } from '../lib/biometrics';
import { series } from '../lib/analytics';
import type { ChartShape, InkPalette } from '../types';

type Group = 'goal' | 'entry' | 'chart' | 'data' | 'about';

const SHAPES: { value: ChartShape; label: string }[] = [
  { value: 'sketched', label: 'Sketched line' },
  { value: 'thin', label: 'Thin print line' },
  { value: 'bars', label: 'Newspaper bars' },
  { value: 'dots', label: 'Dot plot' },
];

const INKS: { value: InkPalette; label: string }[] = [
  { value: 'cyan', label: 'Black & cyan' },
  { value: 'magenta', label: 'Black & magenta' },
  { value: 'process', label: 'Full process' },
  { value: 'ink', label: 'Ink only' },
];

interface Props {
  onSignOut: () => void;
  onToast: (message: string) => void;
}

export function SettingsScreen({ onSignOut, onToast }: Props) {
  const { state, patchSettings, clearEntries } = useStore();
  const { settings, entries, customFoods } = state;
  const [open, setOpen] = useState<Record<Group, boolean>>({
    goal: true,
    entry: false,
    chart: false,
    data: false,
    about: false,
  });
  const [confirmClear, setConfirmClear] = useState(false);

  const toggle = (g: Group) => setOpen((o) => ({ ...o, [g]: !o[g] }));
  const chev = (g: Group) => (open[g] ? '−' : '+');

  const remindersOn =
    (settings.mealReminders ? settings.reminderTimes.length : 0) + (settings.nudgeIfEmpty ? 1 : 0);

  const preview = series(entries, 7, settings.dayStartHour);

  const doExport = async () => {
    try {
      const name = await exportCsv(entries, settings.dayStartHour);
      onToast(`Saved ${name} — find it in Files › On My iPhone › Intaking.`);
    } catch {
      onToast('Could not write the file.');
    }
  };

  const enableBiometrics = async () => {
    const bio = await checkBiometry();
    if (!bio.available) {
      onToast('No Face ID or Touch ID is set up on this phone.');
      return;
    }
    patchSettings({ biometricEnabled: !settings.biometricEnabled });
  };

  return (
    <div className="scr">
      <div style={{ padding: '14px 0 4px' }}>
        <div className="kick">Intaking · v1.0</div>
        <h3 style={{ margin: '6px 0 0' }}>Settings</h3>
      </div>

      <div style={{ marginTop: 16 }}>
        {/* ── Goal & targets ─────────────────────────────────────────── */}
        <button className="sec" onClick={() => toggle('goal')}>
          <span className="sec-t">Goal &amp; targets</span>
          <span className="sec-n">{settings.goal.toLocaleString()} kcal</span>
          <span className="sec-c">{chev('goal')}</span>
        </button>
        {open.goal && (
          <div className="secbody">
            <div className="srow">
              <div style={{ flex: 1 }}>
                <div className="srow-l">Daily calorie goal</div>
                <div className="srow-s">Fixed target, not adjusted for activity</div>
              </div>
              <input
                className="handinput"
                style={{ fontSize: 22, width: 70 }}
                inputMode="numeric"
                value={settings.goal}
                onChange={(e) =>
                  patchSettings({ goal: Math.max(0, Number(e.target.value.replace(/[^\d]/g, '')) || 0) })
                }
              />
            </div>
            {(['protein', 'carbs', 'fat'] as const).map((k) => (
              <div className="srow" key={k}>
                <div style={{ flex: 1 }}>
                  <div className="srow-l" style={{ textTransform: 'capitalize' }}>
                    {k} target
                  </div>
                </div>
                <input
                  className="handinput"
                  style={{ fontSize: 20, width: 56 }}
                  inputMode="numeric"
                  value={settings.targets[k]}
                  onChange={(e) =>
                    patchSettings({
                      targets: {
                        ...settings.targets,
                        [k]: Math.max(0, Number(e.target.value.replace(/[^\d]/g, '')) || 0),
                      },
                    })
                  }
                />
                <span className="kick">g</span>
              </div>
            ))}
            <div className="srow">
              <div style={{ flex: 1 }}>
                <div className="srow-l">Day starts at</div>
                <div className="srow-s">Late-night food counts to the day before</div>
              </div>
              <input
                className="handinput"
                style={{ fontSize: 20, width: 56 }}
                inputMode="numeric"
                value={`${String(settings.dayStartHour).padStart(2, '0')}:00`}
                onChange={(e) => {
                  const h = Number(e.target.value.replace(/[^\d]/g, '').slice(0, 2));
                  if (Number.isFinite(h) && h >= 0 && h <= 23) patchSettings({ dayStartHour: h });
                }}
              />
            </div>
          </div>
        )}

        {/* ── Entry & reminders ──────────────────────────────────────── */}
        <button className="sec" onClick={() => toggle('entry')}>
          <span className="sec-t">Entry &amp; reminders</span>
          <span className="sec-n">{remindersOn} on</span>
          <span className="sec-c">{chev('entry')}</span>
        </button>
        {open.entry && (
          <div className="secbody">
            <div className="srow">
              <div style={{ flex: 1 }}>
                <div className="srow-l">Units</div>
              </div>
              <div className="seg">
                {(['kcal', 'kJ'] as const).map((u) => (
                  <label className="seg-opt" key={u}>
                    <input
                      type="radio"
                      name="units"
                      checked={settings.units === u}
                      onChange={() => patchSettings({ units: u })}
                    />
                    {u}
                  </label>
                ))}
              </div>
            </div>
            <Toggle
              label="Scan adds instantly"
              sub="Skip the confirm sheet when the match is certain"
              on={settings.scanAddsInstantly}
              onChange={(v) => patchSettings({ scanAddsInstantly: v })}
            />
            <Toggle
              label="Photo estimates as a range"
              sub="Off logs the midpoint only"
              on={settings.photoAsRange}
              onChange={(v) => patchSettings({ photoAsRange: v })}
            />
            <Toggle
              label="Meal reminders"
              sub={settings.reminderTimes.join(' · ')}
              on={settings.mealReminders}
              onChange={(v) => patchSettings({ mealReminders: v })}
            />
            <Toggle
              label="Nudge if nothing logged by 21:00"
              on={settings.nudgeIfEmpty}
              onChange={(v) => patchSettings({ nudgeIfEmpty: v })}
            />
          </div>
        )}

        {/* ── Your chart, your way ───────────────────────────────────── */}
        <button className="sec" onClick={() => toggle('chart')}>
          <span className="sec-t">Your chart, your way</span>
          <span className="sec-n">{SHAPES.find((s) => s.value === settings.chartShape)?.label}</span>
          <span className="sec-c">{chev('chart')}</span>
        </button>
        {open.chart && (
          <div className="secbody">
            <p
              style={{
                font: '400 12.5px/1.6 var(--font-body)',
                color: 'rgba(32,30,29,.62)',
                margin: '8px 0 12px',
              }}
            >
              Everything on the Trends page is yours to set — shape, ink and what counts as a good
              day.
            </p>

            <div
              style={{
                border: '1px solid rgba(32,30,29,.18)',
                padding: 12,
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <Chart points={preview} settings={settings} />
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: '.12em',
                  textTransform: 'uppercase',
                  color: 'rgba(32,30,29,.45)',
                  marginTop: 6,
                }}
              >
                Live preview
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              <div>
                <div className="srow-l" style={{ marginBottom: 7 }}>
                  Chart shape
                </div>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {SHAPES.map((s) => (
                    <button
                      key={s.value}
                      className={`chip ${settings.chartShape === s.value ? 'chip-on' : ''}`}
                      onClick={() => patchSettings({ chartShape: s.value })}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="srow-l" style={{ marginBottom: 7 }}>
                  Ink
                </div>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {INKS.map((s) => (
                    <button
                      key={s.value}
                      className={`chip ${settings.ink === s.value ? 'chip-on' : ''}`}
                      onClick={() => patchSettings({ ink: s.value })}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="srow-l" style={{ marginBottom: 7 }}>
                  Compare against
                </div>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  <button
                    className={`chip ${settings.compareGoal ? 'chip-on' : ''}`}
                    onClick={() => patchSettings({ compareGoal: !settings.compareGoal })}
                  >
                    Goal line
                  </button>
                  <button
                    className={`chip ${settings.compareAvg7 ? 'chip-on' : ''}`}
                    onClick={() => patchSettings({ compareAvg7: !settings.compareAvg7 })}
                  >
                    7-day average
                  </button>
                  <button
                    className={`chip ${settings.compareLastMonth ? 'chip-on' : ''}`}
                    onClick={() => patchSettings({ compareLastMonth: !settings.compareLastMonth })}
                  >
                    Previous period
                  </button>
                </div>
              </div>

              <Toggle
                label="Shade weekends"
                sub="Prints Sat &amp; Sun in the second ink"
                on={settings.shadeWeekends}
                onChange={(v) => patchSettings({ shadeWeekends: v })}
                flush
              />
              <Toggle
                label="Handwritten figures"
                sub="Off sets every number in the serif"
                on={settings.handwrittenFigures}
                onChange={(v) => patchSettings({ handwrittenFigures: v })}
                flush
              />
              <Toggle
                label="Y axis starts at zero"
                sub="Off zooms to your own range"
                on={settings.zeroBaseline}
                onChange={(v) => patchSettings({ zeroBaseline: v })}
                flush
              />

              <div>
                <div className="srow-l">"In range" band</div>
                <div className="srow-s" style={{ marginBottom: 9 }}>
                  A day inside ±{settings.inRangeBand} kcal counts as on target
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, color: 'rgba(32,30,29,.5)' }}>±50</span>
                  <input
                    className="band"
                    type="range"
                    min={50}
                    max={300}
                    step={10}
                    value={settings.inRangeBand}
                    onChange={(e) => patchSettings({ inRangeBand: Number(e.target.value) })}
                  />
                  <span style={{ fontSize: 11, color: 'rgba(32,30,29,.5)' }}>±300</span>
                  <span className="hand" style={{ fontSize: 19, width: 40, textAlign: 'right' }}>
                    ±{settings.inRangeBand}
                  </span>
                </div>
              </div>

              <div>
                <div className="srow-l" style={{ marginBottom: 7 }}>
                  Week starts on
                </div>
                <div className="seg" style={{ width: '100%' }}>
                  {(
                    [
                      ['mon', 'Monday'],
                      ['sun', 'Sunday'],
                    ] as const
                  ).map(([value, label]) => (
                    <label
                      className="seg-opt"
                      key={value}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      <input
                        type="radio"
                        name="wk"
                        checked={settings.weekStart === value}
                        onChange={() => patchSettings({ weekStart: value })}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Data & privacy ─────────────────────────────────────────── */}
        <button className="sec" onClick={() => toggle('data')}>
          <span className="sec-t">Data &amp; privacy</span>
          <span className="sec-n">{entries.length} entries</span>
          <span className="sec-c">{chev('data')}</span>
        </button>
        {open.data && (
          <div className="secbody">
            <div className="srow">
              <div style={{ flex: 1 }}>
                <div className="srow-l">Export as CSV</div>
                <div className="srow-s">{entries.length} entries</div>
              </div>
              <button className="btn btn-ghost" style={{ padding: 0 }} onClick={doExport}>
                Export
              </button>
            </div>
            <Toggle
              label="Sync"
              sub="On this phone only — nothing leaves it"
              on={settings.sync}
              onChange={() => onToast('There is no server to sync to. That is the design.')}
            />
            <Toggle
              label="Unlock with Face ID"
              sub="Offered before the keypad when you open the app"
              on={settings.biometricEnabled}
              onChange={enableBiometrics}
            />
            <div className="srow">
              <div style={{ flex: 1 }}>
                <div className="srow-l">Your own foods</div>
                <div className="srow-s">{customFoods.length} saved</div>
              </div>
            </div>
            <div className="srow">
              <div style={{ flex: 1 }}>
                <div className="srow-l" style={{ color: 'var(--color-accent-2-700)' }}>
                  Clear all entries
                </div>
                <div className="srow-s">Cannot be undone</div>
              </div>
              <button
                className="btn btn-ghost"
                style={{ padding: 0, color: 'var(--color-accent-2-700)' }}
                onClick={() => setConfirmClear(true)}
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* ── About ──────────────────────────────────────────────────── */}
        <button className="sec" onClick={() => toggle('about')}>
          <span className="sec-t">About</span>
          <span className="sec-n">v1.0</span>
          <span className="sec-c">{chev('about')}</span>
        </button>
        {open.about && (
          <div className="secbody">
            <div className="srow">
              <div style={{ flex: 1 }}>
                <div className="srow-l">Food table</div>
                <div className="srow-s">Open Food Facts · looked up live</div>
              </div>
            </div>
            <div className="srow">
              <div style={{ flex: 1 }}>
                <div className="srow-l">Privacy</div>
                <div className="srow-s">
                  Entries never leave the phone. Barcodes are sent to Open Food Facts to look a
                  product up; nothing else is.
                </div>
              </div>
            </div>
            <div className="srow" style={{ border: 0 }}>
              <div style={{ flex: 1 }}>
                <div className="srow-l">
                  {state.auth.email ? `Signed in as ${state.auth.email}` : 'Signed in on this phone'}
                </div>
                <div className="srow-s">Locks the ledger and returns to the keypad</div>
              </div>
              <button className="btn btn-ghost" style={{ padding: 0 }} onClick={onSignOut}>
                Sign out
              </button>
            </div>
            <p
              className="hand"
              style={{ fontSize: 18, color: 'rgba(32,30,29,.4)', margin: '16px 0 0' }}
            >
              kept by hand since{' '}
              {new Date(state.auth.createdAt).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'long',
              })}
            </p>
          </div>
        )}
      </div>

      {confirmClear && (
        <div className="sheet-backdrop" onClick={() => setConfirmClear(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h4 style={{ margin: 0 }}>Clear every entry?</h4>
            <p
              style={{
                font: '400 13.5px/1.6 var(--font-body)',
                color: 'rgba(32,30,29,.65)',
                marginTop: 8,
              }}
            >
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'} and any photos attached
              to them. Your goal, settings and saved foods stay. This cannot be undone.
            </p>
            <button
              className="btn btn-primary btn-block"
              style={{ background: 'var(--color-accent-2-600)' }}
              onClick={() => {
                clearEntries();
                setConfirmClear(false);
                onToast('The ledger is empty.');
              }}
            >
              Clear the ledger
            </button>
            <button className="btn btn-ghost btn-block" onClick={() => setConfirmClear(false)}>
              Keep it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({
  label,
  sub,
  on,
  onChange,
  flush,
}: {
  label: string;
  sub?: string;
  on: boolean;
  onChange: (v: boolean) => void;
  flush?: boolean;
}) {
  return (
    <div className="srow" style={flush ? { border: 0, padding: 0 } : undefined}>
      <div style={{ flex: 1 }}>
        <div className="srow-l">{label}</div>
        {sub && <div className="srow-s">{sub}</div>}
      </div>
      <button
        className={`sw ${on ? 'sw-on' : ''}`}
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
      >
        <i />
      </button>
    </div>
  );
}
