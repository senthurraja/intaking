import { useCallback, useEffect, useState } from 'react';
import { useStore } from './state/store';
import { Watermark } from './components/Watermark';
import { Onboarding } from './screens/Onboarding';
import { Login } from './screens/Login';
import { Today } from './screens/Today';
import { Scan } from './screens/Scan';
import { Confirm } from './screens/Confirm';
import { NoMatch } from './screens/NoMatch';
import { Photo } from './screens/Photo';
import { EntryScreen } from './screens/EntryScreen';
import { Trends } from './screens/Trends';
import { Detail } from './screens/Detail';
import { SettingsScreen } from './screens/SettingsScreen';
import { mealForDate } from './lib/analytics';
import type { Entry, Product } from './types';

type Screen =
  | 'today'
  | 'scan'
  | 'confirm'
  | 'nomatch'
  | 'photo'
  | 'entry'
  | 'trends'
  | 'detail'
  | 'settings';

const IN_TODAY: Screen[] = ['today', 'scan', 'confirm', 'nomatch', 'photo', 'entry'];
const IN_TRENDS: Screen[] = ['trends', 'detail'];

export default function App() {
  const { ready, state, addEntry } = useStore();
  const [unlocked, setUnlocked] = useState(false);
  const [screen, setScreen] = useState<Screen>('today');
  const [product, setProduct] = useState<Product | null>(null);
  const [barcode, setBarcode] = useState('');
  const [entry, setEntry] = useState<Entry | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2800);
  }, []);

  /* Keep the open entry in step with the store, so an edit is reflected if the
     user comes straight back to it — and so deleting it cannot leave a stale
     screen pointing at a line that no longer exists. */
  useEffect(() => {
    if (!entry) return;
    const fresh = state.entries.find((e) => e.id === entry.id);
    if (!fresh) setEntry(null);
    else if (fresh !== entry) setEntry(fresh);
  }, [state.entries, entry]);

  const onFound = useCallback(
    (p: Product) => {
      /* "Scan adds instantly" — when the table returns an unambiguous match the
         design skips the confirm sheet and just writes the line. */
      if (state.settings.scanAddsInstantly && !p.custom) {
        addEntry({
          ts: Date.now(),
          name: p.name,
          kcal: p.kcalPerServing,
          meal: mealForDate(new Date()),
          source: 'scanned',
          servings: 1,
          macros: p.macros,
          barcode: p.barcode || undefined,
        });
        setScreen('today');
        showToast(`${p.name} — ${Math.round(p.kcalPerServing)} kcal, written in.`);
        return;
      }
      setProduct(p);
      setScreen('confirm');
    },
    [state.settings.scanAddsInstantly, addEntry, showToast],
  );

  if (!ready) {
    return (
      <div className="phone">
        <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
          <div className="spin" />
        </div>
      </div>
    );
  }

  if (!state.onboarded) {
    return (
      <div className="phone">
        <Watermark />
        <Onboarding
          onDone={() => {
            setUnlocked(true);
            setScreen('today');
          }}
        />
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="phone">
        <Watermark />
        <Login onUnlock={() => setUnlocked(true)} />
      </div>
    );
  }

  const inToday = IN_TODAY.includes(screen);
  const inTrends = IN_TRENDS.includes(screen);

  return (
    <div className="phone">
      <Watermark />

      {screen === 'today' && (
        <Today
          onScan={() => setScreen('scan')}
          onPhoto={() => setScreen('photo')}
          onOpenEntry={(e) => {
            setEntry(e);
            setScreen('entry');
          }}
          onDetail={() => setScreen('detail')}
        />
      )}

      {screen === 'scan' && (
        <Scan
          onBack={() => setScreen('today')}
          onFound={onFound}
          onNoMatch={(code) => {
            setBarcode(code);
            setScreen('nomatch');
          }}
        />
      )}

      {screen === 'confirm' && product && (
        <Confirm
          product={product}
          onBack={() => setScreen('scan')}
          onLogged={() => {
            setScreen('today');
            showToast('Written into today.');
          }}
        />
      )}

      {screen === 'nomatch' && (
        <NoMatch
          barcode={barcode}
          onBack={() => setScreen('scan')}
          onSaved={(p) => {
            setProduct(p);
            setScreen('confirm');
          }}
        />
      )}

      {screen === 'photo' && (
        <Photo
          onBack={() => setScreen('today')}
          onLogged={() => {
            setScreen('today');
            showToast('Written into today.');
          }}
        />
      )}

      {screen === 'entry' && entry && (
        <EntryScreen entry={entry} onBack={() => setScreen('today')} />
      )}

      {screen === 'trends' && <Trends onDetail={() => setScreen('detail')} />}

      {screen === 'detail' && <Detail onBack={() => setScreen('trends')} />}

      {screen === 'settings' && (
        <SettingsScreen
          onSignOut={() => {
            setUnlocked(false);
            setScreen('today');
          }}
          onToast={showToast}
        />
      )}

      <div className="tabs">
        <button className="tab" onClick={() => setScreen('today')}>
          Today
          <span className={inToday ? 'dot' : 'dotless'} />
        </button>
        <button className="tab" onClick={() => setScreen('trends')}>
          Trends
          <span className={inTrends ? 'dot' : 'dotless'} />
        </button>
        <button className="tab" onClick={() => setScreen('settings')}>
          Settings
          <span className={screen === 'settings' ? 'dot' : 'dotless'} />
        </button>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
