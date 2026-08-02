import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { fmt, hhmm, MEAL_LABEL } from '../lib/analytics';
import { photoSrc } from '../lib/storage';
import type { Entry, Meal } from '../types';

const SERVINGS = [
  { label: '½', value: 0.5 },
  { label: '1', value: 1 },
  { label: '1½', value: 1.5 },
  { label: '2', value: 2 },
];
const MEALS: Meal[] = ['breakfast', 'morning', 'lunch', 'afternoon', 'supper', 'evening'];

const SOURCE_LABEL = {
  scanned: 'Scanned',
  photo: 'From a photo',
  typed: 'Written by hand',
} as const;

interface Props {
  entry: Entry;
  onBack: () => void;
}

export function EntryScreen({ entry, onBack }: Props) {
  const { updateEntry, removeEntry } = useStore();
  const [name, setName] = useState(entry.name);
  const [servings, setServings] = useState(entry.servings || 1);
  const [meal, setMeal] = useState<Meal>(entry.meal);
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (entry.photoPath) photoSrc(entry.photoPath).then(setPhoto);
  }, [entry.photoPath]);

  /* Servings scale from the entry's original per-serving figure, so going
     1 → 2 → 1 lands back on the number that was written down. */
  const perServing = entry.kcal / (entry.servings || 1);
  const kcal = Math.round(perServing * servings);
  const scale = servings / (entry.servings || 1);

  const save = () => {
    updateEntry(entry.id, {
      name: name.trim() || entry.name,
      servings,
      meal,
      kcal,
      kcalLow: entry.kcalLow != null ? Math.round(entry.kcalLow * scale) : undefined,
      kcalHigh: entry.kcalHigh != null ? Math.round(entry.kcalHigh * scale) : undefined,
      macros: entry.macros
        ? {
            protein: Math.round((entry.macros.protein / (entry.servings || 1)) * servings),
            carbs: Math.round((entry.macros.carbs / (entry.servings || 1)) * servings),
            fat: Math.round((entry.macros.fat / (entry.servings || 1)) * servings),
          }
        : undefined,
    });
    onBack();
  };

  const remove = () => {
    removeEntry(entry.id);
    onBack();
  };

  return (
    <div className="scr">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0 12px' }}>
        <button className="btn btn-ghost" style={{ padding: 0 }} onClick={onBack}>
          ← Today
        </button>
        <span className="kick" style={{ marginLeft: 'auto' }}>
          Logged entry
        </span>
      </div>

      <div className="kick">{SOURCE_LABEL[entry.source]}</div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{
          font: '600 25px var(--font-heading)',
          border: 0,
          background: 'none',
          width: '100%',
          padding: 0,
          margin: '6px 0 2px',
          color: 'var(--color-text)',
          letterSpacing: '-0.015em',
        }}
      />
      <p style={{ font: '400 13px var(--font-body)', color: 'rgba(32,30,29,.6)', margin: 0 }}>
        Written in at {hhmm(entry.ts)}
      </p>

      {photo && (
        <img
          src={photo}
          alt="The meal as photographed"
          style={{
            width: '100%',
            height: 160,
            objectFit: 'cover',
            marginTop: 14,
            borderRadius: 'var(--radius-md)',
          }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: 18 }}>
        <span className="hand" style={{ fontSize: 54, lineHeight: 0.8 }}>
          {entry.kcalLow != null && entry.kcalHigh != null
            ? `${fmt(entry.kcalLow * scale)}–${fmt(entry.kcalHigh * scale)}`
            : fmt(kcal)}
        </span>
        <span className="kick" style={{ paddingBottom: 8 }}>
          kcal
        </span>
      </div>

      <div className="seg" style={{ marginTop: 20, width: '100%' }}>
        {SERVINGS.map((s) => (
          <label className="seg-opt" key={s.label} style={{ flex: 1, justifyContent: 'center' }}>
            <input
              type="radio"
              name="esrv"
              checked={servings === s.value}
              onChange={() => setServings(s.value)}
            />
            {s.label}
          </label>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
        {MEALS.map((m) => (
          <button
            key={m}
            className={`chip ${meal === m ? 'chip-on' : ''}`}
            onClick={() => setMeal(m)}
          >
            {MEAL_LABEL[m]}
          </button>
        ))}
      </div>

      <div className="ruled" style={{ marginTop: 18 }}>
        <div className="row">
          <span style={{ font: '400 13px var(--font-body)' }}>Meal</span>
          <span className="hand" style={{ marginLeft: 'auto', fontSize: 19 }}>
            {MEAL_LABEL[meal]}
          </span>
        </div>
        <div className="row">
          <span style={{ font: '400 13px var(--font-body)' }}>Time</span>
          <span className="hand" style={{ marginLeft: 'auto', fontSize: 19 }}>
            {hhmm(entry.ts)}
          </span>
        </div>
      </div>

      <button className="btn btn-primary btn-block" style={{ marginTop: 20 }} onClick={save}>
        Save the change
      </button>
      <button
        className="btn btn-ghost btn-block"
        style={{ color: 'var(--color-accent-2-700)' }}
        onClick={remove}
      >
        Delete this line
      </button>
    </div>
  );
}
