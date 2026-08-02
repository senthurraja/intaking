import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { Logo } from '../components/Logo';
import { authenticate, checkBiometry } from '../lib/biometrics';
import { streak } from '../lib/analytics';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface Props {
  onUnlock: () => void;
}

export function Login({ onUnlock }: Props) {
  const { state, verifyPin } = useStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [biometry, setBiometry] = useState<{ available: boolean; label: string | null }>({
    available: false,
    label: null,
  });

  useEffect(() => {
    checkBiometry().then(setBiometry);
  }, []);

  /* Offer Face ID unprompted when it is enabled — the keypad stays available
     underneath if the user dismisses it. */
  useEffect(() => {
    if (!state.settings.biometricEnabled || !biometry.available) return;
    let cancelled = false;
    authenticate('Open your ledger').then((ok) => {
      if (ok && !cancelled) onUnlock();
    });
    return () => {
      cancelled = true;
    };
  }, [state.settings.biometricEnabled, biometry.available, onUnlock]);

  useEffect(() => {
    if (pin.length !== 4) return;
    let cancelled = false;
    (async () => {
      const ok = await verifyPin(pin);
      if (cancelled) return;
      if (ok) {
        setTimeout(onUnlock, 160);
      } else {
        setError('That is not the PIN.');
        setPin('');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pin, verifyPin, onUnlock]);

  const press = (d: string) => {
    setError(null);
    setPin((p) => (p.length >= 4 ? p : p + d));
  };

  const useBiometrics = async () => {
    const ok = await authenticate('Open your ledger');
    if (ok) onUnlock();
    else setError('Face ID did not match. Use the PIN.');
  };

  const run = streak(state.entries, state.settings.dayStartHour);
  const today = DAYS[new Date().getDay()];

  return (
    <div className="scrf">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '26px 0 0' }}>
        <Logo size={32} />
        <span className="greek" style={{ fontSize: 26 }}>
          ΙΝΤΑΚΙΝΓ
        </span>
      </div>
      <div style={{ height: 2, background: 'var(--color-text)', margin: '16px 0 2px' }} />
      <div style={{ height: 1, background: 'var(--color-text)', opacity: 0.35 }} />
      <p
        className="hand"
        style={{ fontSize: 23, margin: '18px 0 0', color: 'var(--color-accent-700)' }}
      >
        welcome back — open the ledger
      </p>

      <div className="ruled" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', height: 34 }}>
          <span className="kick" style={{ width: 76 }}>
            Name
          </span>
          <span style={{ font: '400 15px var(--font-body)' }}>
            {state.auth.email || 'this phone'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', height: 34 }}>
          <span className="kick" style={{ width: 76 }}>
            PIN
          </span>
          <span style={{ display: 'flex', gap: 9 }}>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`pip ${pin.length > i ? 'pip-on' : ''}`} />
            ))}
          </span>
          <span
            className="hand"
            style={{ marginLeft: 'auto', fontSize: 17, color: 'rgba(32,30,29,.4)' }}
          >
            {pin.length ? `${4 - pin.length} to go` : '4 digits'}
          </span>
        </div>
      </div>

      {error && (
        <p
          className="hand"
          style={{ fontSize: 18, color: 'var(--color-accent-2-700)', margin: '10px 0 0' }}
        >
          {error}
        </p>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3,1fr)',
          gap: 10,
          marginTop: error ? 14 : 26,
        }}
      >
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button className="key" key={d} onClick={() => press(d)}>
            {d}
          </button>
        ))}
        <button
          className="key"
          style={{ borderColor: 'transparent', fontSize: 12, letterSpacing: '.1em' }}
          onClick={useBiometrics}
          disabled={!biometry.available}
        >
          {biometry.available ? (biometry.label === 'Touch ID' ? 'TOUCH' : 'FACE') : ''}
        </button>
        <button className="key" onClick={() => press('0')}>
          0
        </button>
        <button
          className="key"
          style={{ borderColor: 'transparent' }}
          onClick={() => {
            setError(null);
            setPin((p) => p.slice(0, -1));
          }}
        >
          ⌫
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 16,
          font: '400 12.5px var(--font-body)',
        }}
      >
        <span style={{ color: 'rgba(32,30,29,.45)' }}>Open {today}</span>
        {biometry.available && (
          <button
            className="btn btn-ghost"
            style={{ padding: 0, fontSize: 12.5 }}
            onClick={useBiometrics}
          >
            Use {biometry.label} instead
          </button>
        )}
      </div>
      <p
        style={{
          font: '400 11.5px/1.5 var(--font-body)',
          color: 'rgba(32,30,29,.45)',
          margin: '20px 0 0',
        }}
      >
        {run > 0 ? `${run}-day streak waiting. ` : ''}
        {state.entries.length} entries, all on this phone.
      </p>
    </div>
  );
}
