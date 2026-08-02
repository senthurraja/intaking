import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store';
import { lookupBarcode } from '../lib/off';
import { ensurePermission, isSupported, scanningAvailable, startScan, type ScanSession } from '../lib/scanner';
import type { Product } from '../types';

interface Props {
  onBack: () => void;
  onFound: (product: Product) => void;
  onNoMatch: (barcode: string) => void;
}

type Phase = 'idle' | 'scanning' | 'looking' | 'error';

export function Scan({ onBack, onFound, onNoMatch }: Props) {
  const { state } = useStore();
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const [supported, setSupported] = useState(false);
  const session = useRef<ScanSession | null>(null);

  useEffect(() => {
    isSupported().then(setSupported);
  }, []);

  /* The viewfinder must never outlive the screen — leaving it running would
     leave the WebView transparent over a dead camera. */
  useEffect(
    () => () => {
      session.current?.stop();
      session.current = null;
      document.body.classList.remove('scanning');
    },
    [],
  );

  const resolve = useCallback(
    async (barcode: string) => {
      setPhase('looking');
      setMessage(null);
      try {
        const product = await lookupBarcode(barcode, state.customFoods);
        if (product) onFound(product);
        else onNoMatch(barcode);
      } catch (err) {
        setPhase('error');
        setMessage(err instanceof Error ? err.message : 'Something went wrong.');
      }
    },
    [state.customFoods, onFound, onNoMatch],
  );

  const begin = async () => {
    setMessage(null);
    if (!scanningAvailable()) {
      setMessage('The camera only works in the installed app. Type the numbers instead.');
      return;
    }
    const granted = await ensurePermission();
    if (!granted) {
      setMessage('Camera access is off. Turn it on in iOS Settings › Intaking, or type the numbers.');
      return;
    }
    setPhase('scanning');
    try {
      session.current = await startScan(
        (value) => {
          session.current = null;
          resolve(value);
        },
        (msg) => {
          setPhase('error');
          setMessage(msg);
        },
      );
    } catch (err) {
      setPhase('error');
      setMessage(err instanceof Error ? err.message : 'The camera would not start.');
    }
  };

  const cancel = async () => {
    await session.current?.stop();
    session.current = null;
    setPhase('idle');
  };

  /* Live viewfinder — the page is transparent here and the native camera preview
     shows through, so everything below is drawn over the picture. */
  if (phase === 'scanning') {
    return (
      <div className="scan-overlay">
        <div className="scan-window" />
        <div className="scan-line" />
        <div style={{ marginTop: 'auto', textAlign: 'center' }}>
          <p
            className="hand"
            style={{
              fontSize: 21,
              color: '#f3f2f2',
              textShadow: '0 1px 3px rgba(0,0,0,.6)',
              margin: '0 0 16px',
            }}
          >
            hold the barcode in the frame — it adds itself
          </p>
          <button
            className="btn btn-primary btn-block"
            style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
            onClick={cancel}
          >
            Stop scanning
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="scr">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0 12px' }}>
        <button className="btn btn-ghost" style={{ padding: 0 }} onClick={onBack}>
          ← Today
        </button>
        <span className="kick" style={{ marginLeft: 'auto' }}>
          Step 1 of 2
        </span>
      </div>

      <div
        style={{
          position: 'relative',
          height: 300,
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-neutral-300)',
          backgroundImage: 'radial-gradient(circle,rgba(0,0,0,.28) 30%,transparent 32%)',
          backgroundSize: '4px 4px',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 26,
            right: 26,
            top: 75,
            height: 150,
            border: '1px solid rgba(243,242,242,.9)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 26,
            right: 26,
            top: 149,
            height: 2,
            background: 'var(--color-accent-2)',
          }}
        />
        {phase === 'looking' ? (
          <div style={{ display: 'grid', placeItems: 'center', gap: 10, zIndex: 1 }}>
            <div className="spin" />
            <span className="hand" style={{ fontSize: 19 }}>
              reading the table…
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 96, zIndex: 1 }}>
            {[3, 6, 2, 8, 3, 2, 7, 3, 5, 2, 9].map((w, i) => (
              <div key={i} style={{ width: w, height: 96, background: '#201e1d' }} />
            ))}
          </div>
        )}
      </div>

      <p
        className="hand"
        style={{ fontSize: 20, margin: '16px 0 0', color: 'var(--color-accent-700)' }}
      >
        hold the barcode in the frame — it adds itself
      </p>
      <p
        style={{
          font: '400 13px/1.6 var(--font-body)',
          color: 'rgba(32,30,29,.6)',
          marginTop: 6,
        }}
      >
        Read against Open Food Facts — about 3 million products. No packet? Type the numbers
        underneath it.
      </p>

      {message && (
        <p
          className="hand"
          style={{ fontSize: 18, color: 'var(--color-accent-2-700)', margin: '12px 0 0' }}
        >
          {message}
        </p>
      )}

      <button
        className="btn btn-primary btn-block"
        style={{ marginTop: 14 }}
        onClick={begin}
        disabled={phase === 'looking' || (scanningAvailable() && !supported)}
      >
        {phase === 'looking' ? 'Looking it up…' : 'Open the camera'}
      </button>

      <div className="ruled" style={{ marginTop: 20 }}>
        <div className="row">
          <span style={{ font: '400 13px var(--font-body)' }}>Barcode</span>
          <input
            className="handinput"
            inputMode="numeric"
            placeholder="type the numbers"
            value={manual}
            onChange={(e) => setManual(e.target.value.replace(/[^\d]/g, ''))}
          />
        </div>
      </div>
      <button
        className="btn btn-secondary btn-block"
        style={{ marginTop: 12 }}
        disabled={manual.length < 6 || phase === 'looking'}
        onClick={() => resolve(manual)}
      >
        Look this code up
      </button>
    </div>
  );
}
