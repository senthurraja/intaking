import { useState } from 'react';
import { useStore } from '../state/store';
import { customToProduct } from '../lib/off';
import type { Product } from '../types';

interface Props {
  barcode: string;
  onBack: () => void;
  onSaved: (product: Product) => void;
}

export function NoMatch({ barcode, onBack, onSaved }: Props) {
  const { state, addCustomFood } = useStore();
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [serving, setServing] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const k = Number(kcal);
    if (!name.trim()) {
      setError('It needs a name.');
      return;
    }
    if (!Number.isFinite(k) || k <= 0) {
      setError('How many kcal in one serving?');
      return;
    }
    const anyMacro = protein || carbs || fat;
    const food = {
      barcode: barcode || undefined,
      name: name.trim(),
      kcalPerServing: Math.round(k),
      servingSize: serving.trim() || undefined,
      macros: anyMacro
        ? {
            protein: Math.round(Number(protein) || 0),
            carbs: Math.round(Number(carbs) || 0),
            fat: Math.round(Number(fat) || 0),
          }
        : undefined,
      createdAt: Date.now(),
    };
    addCustomFood(food);
    onSaved(customToProduct(food));
  };

  return (
    <div className="scr">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0 12px' }}>
        <button className="btn btn-ghost" style={{ padding: 0 }} onClick={onBack}>
          ← Scan
        </button>
        <span className="kick" style={{ marginLeft: 'auto' }}>
          {barcode.split('').join(' ')}
        </span>
      </div>

      <div className="kick">No match</div>
      <h3 style={{ margin: '6px 0 4px', textWrap: 'pretty' }}>That barcode isn't in the table</h3>
      <p
        style={{
          font: '400 13.5px/1.6 var(--font-body)',
          color: 'rgba(32,30,29,.65)',
          margin: 0,
        }}
      >
        Three million barcodes, and this one slipped through. Type what's on the label once and
        it's yours for good.
      </p>

      <div className="ruled" style={{ marginTop: 20 }}>
        <div className="row">
          <span style={{ font: '400 13px var(--font-body)', flex: 'none' }}>Name</span>
          <input
            className="handinput"
            placeholder="tap to write"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="row">
          <span style={{ font: '400 13px var(--font-body)', flex: 'none' }}>kcal per serving</span>
          <input
            className="handinput"
            inputMode="numeric"
            placeholder="—"
            value={kcal}
            onChange={(e) => setKcal(e.target.value.replace(/[^\d]/g, ''))}
          />
        </div>
        <div className="row">
          <span style={{ font: '400 13px var(--font-body)', flex: 'none' }}>Serving size</span>
          <input
            className="handinput"
            placeholder="—"
            value={serving}
            onChange={(e) => setServing(e.target.value)}
          />
        </div>
        <div className="row">
          <span style={{ font: '400 13px var(--font-body)', flex: 'none' }}>Protein g</span>
          <input
            className="handinput"
            inputMode="numeric"
            placeholder="optional"
            value={protein}
            onChange={(e) => setProtein(e.target.value.replace(/[^\d]/g, ''))}
          />
        </div>
        <div className="row">
          <span style={{ font: '400 13px var(--font-body)', flex: 'none' }}>Carbs g</span>
          <input
            className="handinput"
            inputMode="numeric"
            placeholder="optional"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value.replace(/[^\d]/g, ''))}
          />
        </div>
        <div className="row">
          <span style={{ font: '400 13px var(--font-body)', flex: 'none' }}>Fat g</span>
          <input
            className="handinput"
            inputMode="numeric"
            placeholder="optional"
            value={fat}
            onChange={(e) => setFat(e.target.value.replace(/[^\d]/g, ''))}
          />
        </div>
      </div>

      {error && (
        <p
          className="hand"
          style={{ fontSize: 18, color: 'var(--color-accent-2-700)', margin: '14px 0 0' }}
        >
          {error}
        </p>
      )}

      <p
        className="hand"
        style={{ fontSize: 18, color: 'var(--color-accent-700)', margin: '18px 0 0' }}
      >
        saved to your own foods — {state.customFoods.length} so far
      </p>
      <button className="btn btn-primary btn-block" style={{ marginTop: 10 }} onClick={save}>
        Add it by hand
      </button>
      <button className="btn btn-ghost btn-block" onClick={onBack}>
        Try the scan again
      </button>
    </div>
  );
}
