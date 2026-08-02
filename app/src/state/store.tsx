import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_SETTINGS,
  type CustomFood,
  type Entry,
  type PersistedState,
  type Settings,
} from '../types';
import { deletePhoto, loadRaw, saveRaw, sha256 } from '../lib/storage';
import { syncSchedule } from '../lib/notifications';

const EMPTY: PersistedState = {
  entries: [],
  settings: DEFAULT_SETTINGS,
  customFoods: [],
  auth: { pinHash: null, email: '', createdAt: Date.now() },
  recsDone: {},
  onboarded: false,
};

/** Merges a loaded blob over the defaults, one level deep on the nested
 *  objects. Settings gain keys as the app grows; a state saved by an older
 *  build must not come back missing half of them. */
function hydrate(raw: string): PersistedState {
  const parsed = JSON.parse(raw) as Partial<PersistedState>;
  return {
    ...EMPTY,
    ...parsed,
    settings: {
      ...DEFAULT_SETTINGS,
      ...(parsed.settings ?? {}),
      targets: { ...DEFAULT_SETTINGS.targets, ...(parsed.settings?.targets ?? {}) },
    },
    auth: { ...EMPTY.auth, ...(parsed.auth ?? {}) },
    entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    customFoods: Array.isArray(parsed.customFoods) ? parsed.customFoods : [],
    recsDone: parsed.recsDone ?? {},
  };
}

export interface Store {
  ready: boolean;
  state: PersistedState;
  addEntry: (entry: Omit<Entry, 'id'>) => Entry;
  updateEntry: (id: string, patch: Partial<Entry>) => void;
  removeEntry: (id: string) => void;
  clearEntries: () => void;
  patchSettings: (patch: Partial<Settings>) => void;
  addCustomFood: (food: CustomFood) => void;
  setPin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  setEmail: (email: string) => void;
  toggleRec: (id: string) => void;
  finishOnboarding: () => void;
  signOut: () => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(EMPTY);
  const [ready, setReady] = useState(false);
  const dirty = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await loadRaw();
        if (!cancelled && raw) setState(hydrate(raw));
      } catch {
        // A corrupt blob should not brick the app — start clean rather than
        // refusing to launch. The user's data is gone either way at that point.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Persist on change, debounced — rapid edits (dragging the band slider)
     should not mean a write per frame. */
  useEffect(() => {
    if (!ready || !dirty.current) return;
    const t = setTimeout(() => {
      saveRaw(JSON.stringify(state)).catch(() => {});
    }, 180);
    return () => clearTimeout(t);
  }, [state, ready]);

  const mutate = useCallback((fn: (s: PersistedState) => PersistedState) => {
    dirty.current = true;
    setState(fn);
  }, []);

  const addEntry = useCallback(
    (entry: Omit<Entry, 'id'>) => {
      const full: Entry = { ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
      mutate((s) => ({ ...s, entries: [...s.entries, full] }));
      return full;
    },
    [mutate],
  );

  const updateEntry = useCallback(
    (id: string, patch: Partial<Entry>) => {
      mutate((s) => ({
        ...s,
        entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      }));
    },
    [mutate],
  );

  const removeEntry = useCallback(
    (id: string) => {
      mutate((s) => {
        const gone = s.entries.find((e) => e.id === id);
        if (gone?.photoPath) deletePhoto(gone.photoPath);
        return { ...s, entries: s.entries.filter((e) => e.id !== id) };
      });
    },
    [mutate],
  );

  const clearEntries = useCallback(() => {
    mutate((s) => {
      for (const e of s.entries) if (e.photoPath) deletePhoto(e.photoPath);
      return { ...s, entries: [] };
    });
  }, [mutate]);

  const patchSettings = useCallback(
    (patch: Partial<Settings>) => {
      mutate((s) => {
        const settings = { ...s.settings, ...patch };
        // Reminder switches take effect immediately, not on next launch.
        if (
          patch.mealReminders !== undefined ||
          patch.nudgeIfEmpty !== undefined ||
          patch.reminderTimes !== undefined
        ) {
          syncSchedule(settings).catch(() => {});
        }
        return { ...s, settings };
      });
    },
    [mutate],
  );

  const addCustomFood = useCallback(
    (food: CustomFood) => {
      mutate((s) => ({ ...s, customFoods: [...s.customFoods, food] }));
    },
    [mutate],
  );

  const setPin = useCallback(
    async (pin: string) => {
      const pinHash = await sha256(pin);
      mutate((s) => ({ ...s, auth: { ...s.auth, pinHash } }));
    },
    [mutate],
  );

  const verifyPin = useCallback(
    async (pin: string) => {
      if (!state.auth.pinHash) return true;
      return (await sha256(pin)) === state.auth.pinHash;
    },
    [state.auth.pinHash],
  );

  const setEmail = useCallback(
    (email: string) => mutate((s) => ({ ...s, auth: { ...s.auth, email } })),
    [mutate],
  );

  const toggleRec = useCallback(
    (id: string) =>
      mutate((s) => ({ ...s, recsDone: { ...s.recsDone, [id]: !s.recsDone[id] } })),
    [mutate],
  );

  const finishOnboarding = useCallback(
    () => mutate((s) => ({ ...s, onboarded: true })),
    [mutate],
  );

  /* Sign out returns to the front page but keeps the ledger — the design's
     wording is "locks the ledger", not "erases it". Wiping data is a separate,
     clearly-labelled action in Data & privacy. */
  const signOut = useCallback(() => {
    dirty.current = true;
    setState((s) => ({ ...s }));
  }, []);

  const value = useMemo<Store>(
    () => ({
      ready,
      state,
      addEntry,
      updateEntry,
      removeEntry,
      clearEntries,
      patchSettings,
      addCustomFood,
      setPin,
      verifyPin,
      setEmail,
      toggleRec,
      finishOnboarding,
      signOut,
    }),
    [
      ready,
      state,
      addEntry,
      updateEntry,
      removeEntry,
      clearEntries,
      patchSettings,
      addCustomFood,
      setPin,
      verifyPin,
      setEmail,
      toggleRec,
      finishOnboarding,
      signOut,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
