import { useMemo, useState } from 'react';
import { useStore } from '../state/store';
import { cameraAvailable, promptForPhoto } from '../lib/camera';
import { savePhoto } from '../lib/storage';
import { fmt, mealForDate } from '../lib/analytics';
import { PLATE_GROUPS, PLATE_ITEMS, type PlateItem } from '../lib/plateItems';

interface Props {
  onBack: () => void;
  onLogged: () => void;
}

interface Chosen extends PlateItem {
  uid: string;
}

export function Photo({ onBack, onLogged }: Props) {
  const { state, addEntry } = useStore();
  const asRangeByDefault = state.settings.photoAsRange;
  const [preview, setPreview] = useState<string | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [items, setItems] = useState<Chosen[]>([]);
  const [picking, setPicking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // custom item fields
  const [customName, setCustomName] = useState('');
  const [customLow, setCustomLow] = useState('');
  const [customHigh, setCustomHigh] = useState('');

  const range = useMemo(
    () =>
      items.reduce(
        (acc, i) => ({ low: acc.low + i.low, high: acc.high + i.high }),
        { low: 0, high: 0 },
      ),
    [items],
  );
  const mid = Math.round((range.low + range.high) / 2);

  const takePhoto = async () => {
    setMessage(null);
    if (!cameraAvailable()) {
      setMessage('The camera only works in the installed app — tick the plate below instead.');
      return;
    }
    try {
      const shot = await promptForPhoto();
      if (!shot) return;
      setPreview(shot.preview);
      setBase64(shot.base64);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'The camera would not open.');
    }
  };

  const add = (item: PlateItem) => {
    setItems((list) => [...list, { ...item, uid: `${Date.now()}-${Math.random()}` }]);
    setPicking(false);
  };

  const addCustom = () => {
    const low = Number(customLow);
    const high = Number(customHigh || customLow);
    if (!customName.trim() || !Number.isFinite(low) || low <= 0) return;
    add({
      label: customName.trim(),
      low: Math.round(low),
      high: Math.round(Math.max(high, low)),
      group: 'Extras',
    });
    setCustomName('');
    setCustomLow('');
    setCustomHigh('');
  };

  const write = async (asRange: boolean) => {
    if (!items.length) {
      setMessage('Tick what was on the plate first.');
      return;
    }
    let photoPath: string | undefined;
    const id = `${Date.now()}`;
    if (base64) {
      try {
        photoPath = await savePhoto(base64, id);
      } catch {
        // Losing the photo must not lose the entry — the numbers are the point.
      }
    }
    const now = new Date();
    addEntry({
      ts: now.getTime(),
      name: items.length === 1 ? items[0].label : `Plate — ${items.map((i) => i.label.split(',')[0].toLowerCase()).slice(0, 3).join(', ')}`,
      kcal: mid,
      kcalLow: asRange ? range.low : undefined,
      kcalHigh: asRange ? range.high : undefined,
      meal: mealForDate(now),
      source: 'photo',
      servings: 1,
      photoPath,
    });
    onLogged();
  };

  return (
    <div className="scr">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0 12px' }}>
        <button className="btn btn-ghost" style={{ padding: 0 }} onClick={onBack}>
          ← Today
        </button>
        <span className="kick" style={{ marginLeft: 'auto' }}>
          Estimate
        </span>
      </div>

      <button
        onClick={takePhoto}
        style={{
          width: '100%',
          height: 190,
          border: preview ? '1px solid rgba(32,30,29,.25)' : '1px dashed rgba(32,30,29,.4)',
          borderRadius: 'var(--radius-md)',
          display: 'grid',
          placeItems: 'center',
          backgroundColor: 'var(--color-surface)',
          backgroundImage: preview
            ? undefined
            : 'radial-gradient(circle,rgba(0,0,0,.16) 30%,transparent 32%)',
          backgroundSize: '4px 4px',
          padding: 0,
          overflow: 'hidden',
          cursor: 'pointer',
        }}
      >
        {preview ? (
          <img
            src={preview}
            alt="The meal you photographed"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div className="hand" style={{ fontSize: 22, color: 'var(--color-accent-700)' }}>
              photograph the plate
            </div>
            <div
              style={{
                font: '400 12px var(--font-body)',
                color: 'rgba(32,30,29,.55)',
                marginTop: 2,
              }}
            >
              or choose one from the library
            </div>
          </div>
        )}
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: 20 }}>
        <span className="hand" style={{ fontSize: 40, lineHeight: 0.85 }}>
          {items.length ? `${fmt(range.low)}–${fmt(range.high)}` : '—'}
        </span>
        <span className="kick" style={{ paddingBottom: 7 }}>
          kcal, best guess
        </span>
      </div>

      {/* the bracket under the range, from the design */}
      <svg
        width="300"
        height="26"
        viewBox="0 0 300 26"
        style={{ marginTop: 6, overflow: 'visible', maxWidth: '100%' }}
        aria-hidden="true"
      >
        <path
          d="M2 4 C2 18 4 20 12 21 L140 21 C148 20 149 15 150 4 C151 15 152 20 160 21 L288 21 C296 20 296 18 296 4"
          fill="none"
          stroke="#201e1d"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>

      <p
        style={{
          font: '400 13px/1.6 var(--font-body)',
          color: 'rgba(32,30,29,.65)',
          marginTop: 4,
        }}
      >
        A photo can't be exact. Tick what's on the plate and the range tightens.
      </p>

      {message && (
        <p
          className="hand"
          style={{ fontSize: 18, color: 'var(--color-accent-2-700)', margin: '10px 0 0' }}
        >
          {message}
        </p>
      )}

      <div className="ruled" style={{ marginTop: 8 }}>
        {items.map((i) => (
          <button
            key={i.uid}
            className="erow"
            onClick={() => setItems((list) => list.filter((x) => x.uid !== i.uid))}
          >
            <span className="ename" style={{ flex: 1 }}>
              {i.label}
            </span>
            <span className="ekcal">
              {i.low}–{i.high}
            </span>
            <span style={{ color: 'rgba(32,30,29,.35)', fontSize: 15, flex: 'none' }}>×</span>
          </button>
        ))}
        <div className="row" style={{ alignItems: 'center' }}>
          <span style={{ font: '400 13px var(--font-body)', color: 'rgba(32,30,29,.4)' }}>
            {items.length ? 'tap a line to take it off' : 'nothing on the plate yet'}
          </span>
        </div>
      </div>

      <button className="btn btn-secondary btn-block" style={{ marginTop: 12 }} onClick={() => setPicking(true)}>
        Add what's on the plate
      </button>

      {/* Which of these leads is the "Photo estimates as a range" setting —
          the design's honest default is the range, but the switch is real. */}
      <button
        className="btn btn-primary btn-block"
        style={{ marginTop: 16 }}
        disabled={!items.length}
        onClick={() => write(asRangeByDefault)}
      >
        {!items.length
          ? 'Write it in'
          : asRangeByDefault
            ? `Write it in as ${fmt(range.low)}–${fmt(range.high)}`
            : `Write it in as ${fmt(mid)}`}
      </button>
      <button
        className="btn btn-ghost btn-block"
        disabled={!items.length}
        onClick={() => write(!asRangeByDefault)}
      >
        {!items.length
          ? 'Or log the other way'
          : asRangeByDefault
            ? `Log the midpoint instead — ${fmt(mid)}`
            : `Log the range instead — ${fmt(range.low)}–${fmt(range.high)}`}
      </button>

      {picking && (
        <div className="sheet-backdrop" onClick={() => setPicking(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <h4 style={{ margin: 0 }}>What's on the plate?</h4>
              <button
                className="btn btn-ghost"
                style={{ marginLeft: 'auto', padding: 0 }}
                onClick={() => setPicking(false)}
              >
                Close
              </button>
            </div>

            {PLATE_GROUPS.map((group) => (
              <div key={group} style={{ marginTop: 16 }}>
                <div className="kick">{group}</div>
                <div className="ruled" style={{ marginTop: 6 }}>
                  {PLATE_ITEMS.filter((i) => i.group === group).map((i) => (
                    <button className="erow" key={i.label} onClick={() => add(i)}>
                      <span className="ename" style={{ flex: 1 }}>
                        {i.label}
                      </span>
                      <span className="ekcal">
                        {i.low}–{i.high}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ marginTop: 20, paddingTop: 12, borderTop: '1px solid var(--color-text)' }}>
              <div className="kick">Something else</div>
              <div className="ruled" style={{ marginTop: 6 }}>
                <div className="row">
                  <span style={{ font: '400 13px var(--font-body)', flex: 'none' }}>Item</span>
                  <input
                    className="handinput"
                    placeholder="tap to write"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                </div>
                <div className="row">
                  <span style={{ font: '400 13px var(--font-body)', flex: 'none' }}>Low</span>
                  <input
                    className="handinput"
                    inputMode="numeric"
                    placeholder="—"
                    value={customLow}
                    onChange={(e) => setCustomLow(e.target.value.replace(/[^\d]/g, ''))}
                  />
                </div>
                <div className="row">
                  <span style={{ font: '400 13px var(--font-body)', flex: 'none' }}>High</span>
                  <input
                    className="handinput"
                    inputMode="numeric"
                    placeholder="—"
                    value={customHigh}
                    onChange={(e) => setCustomHigh(e.target.value.replace(/[^\d]/g, ''))}
                  />
                </div>
              </div>
              <button className="btn btn-secondary btn-block" style={{ marginTop: 10 }} onClick={addCustom}>
                Add it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
