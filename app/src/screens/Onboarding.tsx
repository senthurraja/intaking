import { useState } from 'react';
import { useStore } from '../state/store';
import { Logo } from '../components/Logo';
import { checkBiometry } from '../lib/biometrics';
import { ensurePermission as ensureNotifyPermission, syncSchedule } from '../lib/notifications';

/* First run. The prototype opened on a 1280px landing page — that is a
   marketing surface for a browser, not a screen in a phone app, so its
   furniture (the Greek wordmark, the percent mark, the "100%" line and the
   three lettered explainers) is reset here as the app's own first-run
   sequence: brand, then the goal it will measure you against, then the PIN. */

interface Props {
  onDone: () => void;
}

export function Onboarding({ onDone }: Props) {
  const { patchSettings, setPin, setEmail, finishOnboarding, state } = useStore();
  const [step, setStep] = useState(0);

  const [goal, setGoal] = useState(String(state.settings.goal));
  const [protein, setProtein] = useState(String(state.settings.targets.protein));
  const [carbs, setCarbs] = useState(String(state.settings.targets.carbs));
  const [fat, setFat] = useState(String(state.settings.targets.fat));
  const [email, setLocalEmail] = useState('');

  const [pin, setLocalPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const saveGoal = () => {
    const g = Number(goal);
    if (!Number.isFinite(g) || g < 800 || g > 8000) {
      setError('A daily goal between 800 and 8,000 kcal.');
      return;
    }
    patchSettings({
      goal: Math.round(g),
      targets: {
        protein: Math.max(0, Math.round(Number(protein) || 0)),
        carbs: Math.max(0, Math.round(Number(carbs) || 0)),
        fat: Math.max(0, Math.round(Number(fat) || 0)),
      },
    });
    if (email.trim()) setEmail(email.trim());
    setError(null);
    setStep(2);
  };

  const savePin = async () => {
    if (!/^\d{4}$/.test(pin)) {
      setError('Four digits.');
      return;
    }
    if (pin !== confirm) {
      setError('The two PINs are different.');
      return;
    }
    await setPin(pin);
    const bio = await checkBiometry();
    if (bio.available) patchSettings({ biometricEnabled: true });
    const notify = await ensureNotifyPermission();
    if (notify) syncSchedule({ ...state.settings, mealReminders: true }).catch(() => {});
    finishOnboarding();
    onDone();
  };

  return (
    <div className="scrf">
      {step === 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '30px 0 0' }}>
            <Logo size={30} />
            <span className="greek" style={{ fontSize: 17 }}>
              ΙΝΤΑΚΙΝΓ
            </span>
          </div>
          <div style={{ height: 2, background: 'var(--color-text)', margin: '14px 0 3px' }} />
          <div style={{ height: 1, background: 'var(--color-text)', opacity: 0.35 }} />

          <div className="kick" style={{ marginTop: 30 }}>
            A calorie ledger you keep by hand
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 18 }}>
            <Logo size={64} strokeWidth={2.2} />
            <div>
              <div className="greek" style={{ fontSize: 44, lineHeight: 0.92 }}>
                ΙΝΤΑΚΙΝΓ
              </div>
              <div
                style={{
                  font: '400 10px var(--font-body)',
                  letterSpacing: '.28em',
                  color: 'rgba(32,30,29,.5)',
                  marginTop: 7,
                }}
              >
                I N T A K I N G
              </div>
            </div>
          </div>

          <p style={{ font: '400 16px/1.6 var(--font-body)', margin: '24px 0 0' }}>
            Scan the barcode. Drop the photo. Write the number down. Intaking keeps the day as a
            ruled page and reads the pattern back to you — percentages, not verdicts.
          </p>
          <p
            className="hand"
            style={{ fontSize: 23, color: 'var(--color-accent-700)', margin: '18px 0 0' }}
          >
            100% of it is just knowing where the day went
          </p>

          <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {[
              ['Α · ΣΚΑΝ', 'The barcode does the typing', 'Point at the packet; the entry lands in the day with its macros.'],
              ['Β · ΦΩΤΟ', 'A plate becomes a range', 'Photograph a meal and get 480–620, not a false single figure.'],
              ['Γ · ΤΡΕΝΔ', 'The pattern, drawn your way', "Rolling averages, macro split, streaks — with the chart's shape and ink under your control."],
            ].map(([kicker, title, body]) => (
              <div key={kicker}>
                <div className="greek" style={{ fontSize: 13, color: 'var(--color-accent-700)' }}>
                  {kicker}
                </div>
                <h4 style={{ margin: '6px 0 4px', fontSize: 17 }}>{title}</h4>
                <p
                  style={{
                    font: '400 13.5px/1.6 var(--font-body)',
                    color: 'rgba(32,30,29,.72)',
                    margin: 0,
                  }}
                >
                  {body}
                </p>
              </div>
            ))}
          </div>

          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 28 }}
            onClick={() => setStep(1)}
          >
            Start a ledger
          </button>
          <p
            style={{
              font: '400 11.5px var(--font-body)',
              color: 'rgba(32,30,29,.5)',
              margin: '14px 0 0',
              textAlign: 'center',
            }}
          >
            On this phone only. Nothing leaves it.
          </p>
        </>
      )}

      {step === 1 && (
        <>
          <div style={{ padding: '30px 0 0' }} className="kick">
            Step 1 of 2
          </div>
          <h3 style={{ margin: '8px 0 4px' }}>What are you measuring against?</h3>
          <p
            style={{
              font: '400 13.5px/1.6 var(--font-body)',
              color: 'rgba(32,30,29,.65)',
              margin: 0,
            }}
          >
            A fixed daily target, not adjusted for activity. You can change it any time in
            Settings.
          </p>

          <div className="ruled" style={{ marginTop: 22 }}>
            <div className="row">
              <span style={{ font: '400 14px var(--font-body)' }}>Daily goal</span>
              <input
                className="handinput"
                style={{ fontSize: 22 }}
                inputMode="numeric"
                value={goal}
                onChange={(e) => setGoal(e.target.value.replace(/[^\d]/g, ''))}
              />
              <span className="kick" style={{ flex: 'none' }}>
                kcal
              </span>
            </div>
            <div className="row">
              <span style={{ font: '400 14px var(--font-body)' }}>Protein</span>
              <input
                className="handinput"
                inputMode="numeric"
                value={protein}
                onChange={(e) => setProtein(e.target.value.replace(/[^\d]/g, ''))}
              />
              <span className="kick" style={{ flex: 'none' }}>
                g
              </span>
            </div>
            <div className="row">
              <span style={{ font: '400 14px var(--font-body)' }}>Carbs</span>
              <input
                className="handinput"
                inputMode="numeric"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value.replace(/[^\d]/g, ''))}
              />
              <span className="kick" style={{ flex: 'none' }}>
                g
              </span>
            </div>
            <div className="row">
              <span style={{ font: '400 14px var(--font-body)' }}>Fat</span>
              <input
                className="handinput"
                inputMode="numeric"
                value={fat}
                onChange={(e) => setFat(e.target.value.replace(/[^\d]/g, ''))}
              />
              <span className="kick" style={{ flex: 'none' }}>
                g
              </span>
            </div>
            <div className="row">
              <span style={{ font: '400 14px var(--font-body)' }}>Name</span>
              <input
                className="handinput"
                style={{ fontSize: 16 }}
                placeholder="optional"
                value={email}
                onChange={(e) => setLocalEmail(e.target.value)}
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

          <button className="btn btn-primary btn-block" style={{ marginTop: 22 }} onClick={saveGoal}>
            Set the target
          </button>
          <button className="btn btn-ghost btn-block" onClick={() => setStep(0)}>
            Back
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <div style={{ padding: '30px 0 0' }} className="kick">
            Step 2 of 2
          </div>
          <h3 style={{ margin: '8px 0 4px' }}>Lock the ledger</h3>
          <p
            style={{
              font: '400 13.5px/1.6 var(--font-body)',
              color: 'rgba(32,30,29,.65)',
              margin: 0,
            }}
          >
            Four digits, kept on this phone as a hash — the PIN itself is never stored, here or
            anywhere else.
          </p>

          <div className="ruled" style={{ marginTop: 22 }}>
            <div className="row">
              <span style={{ font: '400 14px var(--font-body)' }}>PIN</span>
              <input
                className="handinput"
                style={{ fontSize: 22, letterSpacing: '.3em' }}
                inputMode="numeric"
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setLocalPin(e.target.value.replace(/[^\d]/g, ''))}
              />
            </div>
            <div className="row">
              <span style={{ font: '400 14px var(--font-body)' }}>Again</span>
              <input
                className="handinput"
                style={{ fontSize: 22, letterSpacing: '.3em' }}
                inputMode="numeric"
                type="password"
                maxLength={4}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value.replace(/[^\d]/g, ''))}
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

          <button className="btn btn-primary btn-block" style={{ marginTop: 22 }} onClick={savePin}>
            Open the ledger
          </button>
          <button className="btn btn-ghost btn-block" onClick={() => setStep(1)}>
            Back
          </button>
        </>
      )}
    </div>
  );
}
