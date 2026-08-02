/** The meals the ledger groups entries under. The prototype's sample day used
 *  exactly these labels, and the "By meal" analytics block reports on them. */
export type Meal =
  | 'breakfast'
  | 'morning'
  | 'lunch'
  | 'afternoon'
  | 'supper'
  | 'evening';

/** How an entry got into the ledger — drives the "scanned" tag on the line and
 *  the entry-method split in the detailed analytics. */
export type EntrySource = 'typed' | 'scanned' | 'photo';

export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
}

export interface Entry {
  id: string;
  /** Epoch ms of when it was eaten. The ledger day is derived from this via
   *  the user's "day starts at" setting, so a 01:00 snack counts to yesterday. */
  ts: number;
  name: string;
  /** The figure written into the ledger. For a photo range this is the midpoint. */
  kcal: number;
  /** Present only on photo entries logged as a range — the design insists a
   *  photo produces "480–620", not a false single figure. */
  kcalLow?: number;
  kcalHigh?: number;
  meal: Meal;
  source: EntrySource;
  servings: number;
  macros?: Macros;
  barcode?: string;
  /** Relative path in the app's data directory, for photo entries. */
  photoPath?: string;
}

/** A food the user saved themselves, after a barcode came back with no match. */
export interface CustomFood {
  barcode?: string;
  name: string;
  kcalPerServing: number;
  servingSize?: string;
  macros?: Macros;
  createdAt: number;
}

/** A product resolved from a barcode, either from Open Food Facts or from the
 *  user's own saved foods. */
export interface Product {
  barcode: string;
  name: string;
  brand?: string;
  servingLabel?: string;
  kcalPerServing: number;
  macros?: Macros;
  /** True when it came from the user's own list rather than the online table. */
  custom?: boolean;
}

export type ChartShape = 'sketched' | 'thin' | 'bars' | 'dots';
export type InkPalette = 'cyan' | 'magenta' | 'process' | 'ink';

export interface Settings {
  goal: number;
  targets: Macros;
  /** Hour (0–23) at which a new ledger day begins. */
  dayStartHour: number;
  units: 'kcal' | 'kJ';

  scanAddsInstantly: boolean;
  photoAsRange: boolean;
  mealReminders: boolean;
  reminderTimes: string[];
  nudgeIfEmpty: boolean;

  // "Your chart, your way"
  chartShape: ChartShape;
  ink: InkPalette;
  compareGoal: boolean;
  compareAvg7: boolean;
  compareLastMonth: boolean;
  shadeWeekends: boolean;
  handwrittenFigures: boolean;
  zeroBaseline: boolean;
  /** ± kcal of goal that still counts as "in range". */
  inRangeBand: number;
  weekStart: 'mon' | 'sun';

  sync: boolean;
  biometricEnabled: boolean;
}

export interface Auth {
  /** SHA-256 of the PIN. The PIN itself is never stored. */
  pinHash: string | null;
  email: string;
  createdAt: number;
}

export interface PersistedState {
  entries: Entry[];
  settings: Settings;
  customFoods: CustomFood[];
  auth: Auth;
  /** Recommendation ids the user has ticked off. */
  recsDone: Record<string, boolean>;
  onboarded: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  goal: 2200,
  targets: { protein: 150, carbs: 240, fat: 70 },
  dayStartHour: 4,
  units: 'kcal',

  scanAddsInstantly: true,
  photoAsRange: true,
  mealReminders: true,
  reminderTimes: ['08:00', '13:00', '20:00'],
  nudgeIfEmpty: false,

  chartShape: 'sketched',
  ink: 'cyan',
  compareGoal: true,
  compareAvg7: true,
  compareLastMonth: false,
  shadeWeekends: true,
  handwrittenFigures: true,
  zeroBaseline: false,
  inRangeBand: 150,
  weekStart: 'mon',

  sync: false,
  biometricEnabled: false,
};
