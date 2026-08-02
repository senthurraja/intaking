import { useState } from 'react';
import { useStore } from '../state/store';
import {
  dayTotal,
  entriesForDay,
  fmt,
  hhmm,
  mealForDate,
  todayKey,
  MEAL_LABEL,
} from '../lib/analytics';
import type { Meal, Product } from '../types';

const SERVINGS: { label: string; value: number }[] = [
  { label: '½', value: 0.5 },
  { label: '1', value: 1 },
  { label: '1½', value: 1.5 },
  { label: '2', value: 2 },
];

const MEALS: Meal[] = ['breakfast', 'morning', 'lunch', 'afternoon', 'supper', 'evening'];

interface Props {
  product: Product;
  onBack: () => void;
  onLogged: () => void;
}

export function Confirm({ product, onBack, onLogged }: Props) {
  const { state, addEntry } = useStore();
  const { settings } = state;

  const now = new Date();
  const [servings, setServings] = useState(1);
  const [meal, setMeal] = useState<Meal>(mealForDate(now));

  const kcal = Math.round(product.kcalPerServing * servings);
  const macros = product.macros
    ? {
        protein: Math.round(product.macros.protein * servings),
        carbs: Math.round(product.macros.carbs * servings),
        fat: Math.round(product.macros.fat * servings),
      }
    : undefined;

  const today = entriesForDay(state.entries, todayKey(settings.dayStartHour), settings.dayStartHour);
  const leftAfter = settings.goal - dayTotal(today) - kcal;

  const write = () => {
    addEntry({
      ts: Date.now(),
      name: product.name,
      kcal,
      meal,
      source: product.custom ? 'typed' : 'scanned',
      servings,
      macros,
      barcode: product.barcode || undefined,
    });
    onLogged();
  };

  return (
    <div className="scr">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0 12px' }}>
        <button className="btn btn-ghost" style={{ padding: 0 }} onClick={onBack}>
          ← Scan
        </button>
        <span className="kick" style={{ marginLeft: 'auto' }}>
          {product.barcode ? product.barcode.split('').join(' ') : 'By hand'}
        </span>
      </div>

      <div className="kick">{product.custom ? 'Your own food' : 'Matched'}</div>
      <h3 style={{ margin: '6px 0 2px' }}>{product.name}</h3>
      <p style={{ font: '400 13px var(--font-body)', color: 'rgba(32,30,29,.6)', margin: 0 }}>
        {[product.brand, product.servingLabel].filter(Boolean).join(' · ') || 'per serving'}
      </p>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: 16 }}>
        <span className="hand" style={{ fontSize: 52, lineHeight: 0.8 }}>
          {fmt(kcal)}
        </span>
        <span className="kick" style={{ paddingBottom: 8 }}>
          kcal
        </span>
        {macros && (
          <span
            style={{
              marginLeft: 'auto',
              font: '400 12px var(--font-body)',
              color: 'rgba(32,30,29,.55)',
              textAlign: 'right',
            }}
          >
            P {macros.protein}g · C {macros.carbs}g
            <br />F {macros.fat}g
          </span>
        )}
      </div>

      <div className="ruled" style={{ marginTop: 18 }}>
        <div className="row">
          <span style={{ font: '400 13px var(--font-body)' }}>Servings</span>
          <span className="hand" style={{ marginLeft: 'auto', fontSize: 19 }}>
            {SERVINGS.find((s) => s.value === servings)?.label ?? servings}
          </span>
        </div>
        <div className="row">
          <span style={{ font: '400 13px var(--font-body)' }}>Meal</span>
          <span className="hand" style={{ marginLeft: 'auto', fontSize: 19 }}>
            {MEAL_LABEL[meal]}
          </span>
        </div>
        <div className="row">
          <span style={{ font: '400 13px var(--font-body)' }}>Time</span>
          <span className="hand" style={{ marginLeft: 'auto', fontSize: 19 }}>
            {hhmm(now.getTime())}
          </span>
        </div>
      </div>

      <div className="seg" style={{ marginTop: 16, width: '100%' }}>
        {SERVINGS.map((s) => (
          <label
            className="seg-opt"
            key={s.label}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <input
              type="radio"
              name="srv"
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

      <p
        className="hand"
        style={{
          fontSize: 18,
          color: leftAfter < 0 ? 'var(--color-accent-2-700)' : 'var(--color-accent-2-700)',
          margin: '18px 0 0',
        }}
      >
        {leftAfter >= 0
          ? `this leaves you ${fmt(leftAfter)} for the rest of the day`
          : `this puts you ${fmt(-leftAfter)} over`}
      </p>

      <button className="btn btn-primary btn-block" style={{ marginTop: 10 }} onClick={write}>
        Write it into today
      </button>
      <button className="btn btn-ghost btn-block" onClick={onBack}>
        Not this — scan again
      </button>
    </div>
  );
}
