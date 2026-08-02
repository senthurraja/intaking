# Intaking

A calorie ledger you keep by hand. React + Capacitor, built as a real iOS app
from the Claude Design handoff in `../project/`.

**→ To get it onto your iPhone, see [docs/IOS.md](docs/IOS.md).**

```bash
npm install
npm run dev      # browser, for UI work
npm run ios      # build + sync + open Xcode
npm run smoke    # headless walk-through of the whole flow
```

---

## What it does

Everything the prototype showed, wired to real data:

- **Barcode scanning** — the phone camera reads the packet, the code is looked up
  against [Open Food Facts](https://world.openfoodfacts.org) (~3M products, no
  API key), and the entry lands with its macros. A code with no match opens the
  "add it by hand" path, and the food is saved to your own list for next time.
- **Meal photos** — real capture or library pick, stored on the filesystem, with
  the estimate built as an honest low–high range from what you tick off the
  plate. Log the range or the midpoint.
- **The ledger** — every line is tappable: edit servings, meal and name, or
  delete it. Clearing all entries drops Today into its empty state.
- **Trends and analytics** — computed, not canned. Rolling averages, macro
  split, spread, days in range, streak, weekday pattern, per-meal averages,
  most-logged foods and the scanned/photo/typed split.
- **Recommendations** — the three points under "To move the line up" are rules
  that fire on your actual data and fill in real figures. Below three logged
  days the app says so rather than inventing a verdict.
- **Settings** — five collapsible groups. "Your chart, your way" genuinely
  redraws the chart: shape, ink palette, comparison overlays, weekend shading,
  handwritten figures, zero baseline, the ±band and week start.
- **Local only** — entries, photos and settings live on the phone. The barcode
  lookup is the single outbound request.

---

## Layout

```
src/
  types.ts            Entry, Settings, Product, and the defaults
  state/store.tsx     the store: persistence, debounced writes, all mutations
  lib/
    analytics.ts      ledger days, totals, macros, series, streak, patterns
    recommendations.ts   the rules behind "To move the line up"
    off.ts            Open Food Facts client
    scanner.ts        ML Kit camera session
    camera.ts         photo capture
    plateItems.ts     the plate library behind the photo range
    storage.ts        Preferences + Filesystem + the PIN hash
    export.ts         CSV
    notifications.ts  meal reminders
    biometrics.ts     Face ID
    native.ts         status bar / keyboard setup
  components/
    Chart.tsx         the configurable trend chart
    Watermark.tsx     the floral watermark
    watermarkSvg.ts   ← extracted verbatim from the prototype, do not hand-edit
    Logo.tsx          the % mark
  screens/            one file per screen
  styles/
    tokens.css        Broadsheet design system, ported from the handoff
    app.css           the app's own classes, ported from the prototype
```

---

## How this maps to the design

The design is `../project/Intaking - Journey.dc.html`. Three deliberate
departures, all forced by the move from a desktop prototype to a phone:

**The phone frame became the viewport.** The prototype drew a 390×800 rounded
rectangle with a painted-on `9:41` status bar, because it ran in a desktop
browser. On a real device that frame *is* the screen, so `.phone` fills it, the
fake status bar is gone in favour of the real one, and the prototype's fixed
36px/64px insets became `env(safe-area-inset-*)` so the ledger clears the notch
and the home bar.

**The landing page became onboarding.** The 1280px marketing page — masthead,
three lettered explainers, sample-week ledger — is a browser artefact; an app
does not open on a landing page. Its brand furniture (the Greek wordmark, the
percent mark, the "100%" line, the Α/Β/Γ explainers) is reset as the first-run
sequence in `screens/Onboarding.tsx`, which then collects the goal and PIN the
real app needs and the prototype never asked for.

**Hard-coded figures became computed ones.** The prototype's 2,095 average, 19/26
in range, "Saturday is the outlier" and its three fixed recommendations were
illustrative. They are all derived now, which means they are sometimes less
tidy — a new install has nothing to average — and the screens say so plainly
instead of showing invented numbers.

Everything else is the design: the same tokens, the same type scale, the same
ruled paper, the same dateline rail, the same handwritten figures in Caveat, the
same collapsible settings, and the same watermark — that last one extracted
verbatim from the prototype's SVG rather than retyped, so its five crossing vine
strands and two rotated layers are byte-for-byte what was designed.

Two fixes to things the prototype could not get right because it had no data:
carbs and fat now come from real macros where an entry has them (falling back to
an energy split where it does not), and the goal figure flips to magenta with an
"over" label when you go past it, using the ink role the design reserved for
exactly that.

---

## Verifying

`npm run smoke` drives a headless Chromium through first run → empty ledger →
photo entry → edit → scan → trends → analytics → settings → reload, failing on
any console error or missing landmark, and drops screenshots in
`scripts/shots/`. It is the check that the app runs; the pixels are verified
against the prototype by eye.
