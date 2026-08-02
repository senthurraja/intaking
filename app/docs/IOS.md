# Getting Intaking onto your iPhone

Everything below happens on your Mac. The repo already contains a complete Xcode
project (`ios/`) — you do not need to create one.

---

## 1. What you need first

| | |
|---|---|
| **macOS** | Sonoma or later is safest |
| **Xcode** | 15 or later, free from the Mac App Store |
| **CocoaPods** | `sudo gem install cocoapods` (or `brew install cocoapods`) |
| **Node** | 20 or later — `brew install node` |
| **Your iPhone** | iOS 15.0 or later, plus a USB-C/Lightning cable for the first install |

The first Xcode launch downloads its iOS platform support and takes a while. Let
it finish before going on.

---

## 2. One-time setup

```bash
git clone <your repo url>
cd <repo>/app

npm install                  # JavaScript dependencies
npm run build                # compiles the web app into dist/
npx cap sync ios             # copies dist/ into the Xcode project + wires plugins

cd ios/App
pod install                  # installs the native pods (ML Kit, Capacitor, …)
cd ../..
```

`pod install` is the step that could not run in the cloud container that built
this — CocoaPods only runs on macOS. It downloads Google's ML Kit barcode
framework, which is a few hundred megabytes, so give it a minute on the first
run.

Then open the project:

```bash
npx cap open ios
```

> **Open `App.xcworkspace`, never `App.xcodeproj`.** `npx cap open ios` does the
> right thing automatically. If you open the bare project instead, the pods are
> not linked and the build fails with a wall of "no such module" errors.

---

## 3. Set up signing

In Xcode:

1. Select the **App** project in the left sidebar, then the **App** target.
2. Go to the **Signing & Capabilities** tab.
3. Tick **Automatically manage signing**.
4. In **Team**, choose your Apple ID. If it is not listed: **Xcode → Settings →
   Accounts → +** and sign in with your Apple ID.

### The bundle identifier

It is currently `com.intaking.ledger`. Bundle IDs must be globally unique across
the App Store, so if Xcode complains that it is already taken, change it to
something of your own — `com.yourname.intaking` — in the same panel. If you do,
also update `appId` in `capacitor.config.ts` so the two stay in step.

### Free Apple ID vs the paid program

Both work. The difference is entirely in how long the signature lasts:

- **Free Apple ID.** Xcode issues a 7-day certificate. After a week the app
  refuses to launch until you plug the phone in and hit ▶ again. You are also
  limited to 3 sideloaded apps at once, and **push and local notifications do
  not work**, which means the meal reminders and the 21:00 nudge stay silent.
- **Apple Developer Program ($99/yr, ~£79).** A 1-year certificate, unlimited
  apps, working notifications, and TestFlight.

Nothing in the code changes between the two — it is the Team dropdown and
nothing else.

---

## 4. Build and run

1. Plug the iPhone in. Unlock it and tap **Trust** if asked.
2. In Xcode's toolbar, set the run destination (next to the scheme name) to your
   iPhone rather than a simulator.
3. Press **▶** (or `⌘R`).

The first build takes several minutes because ML Kit is compiling. Later builds
are much quicker.

### "Untrusted Developer" on first launch

The app installs but refuses to open. This is expected with a personal team. On
the iPhone:

**Settings → General → VPN & Device Management → Developer App →** your Apple ID
**→ Trust**.

Then launch it from the home screen. You only do this once per certificate.

---

## 5. Making changes later

The web app is the source of truth; the Xcode project is just a shell around it.

```bash
npm run ios      # build + sync + open Xcode, all in one
```

Then press ▶ again. If Xcode is already open, `npm run sync` is enough — Xcode
picks up the new `public/` folder on the next build.

For day-to-day UI work you do not need Xcode at all:

```bash
npm run dev      # http://localhost:5173 in a browser
```

Everything works there except the four things that need real hardware: barcode
scanning, the camera, Face ID, and notifications. Each degrades with a message
rather than breaking — the scan screen, for instance, offers a "type the
numbers" field instead.

---

## 6. Troubleshooting

**`pod install` fails with a CDN or SSL error.**
Run `pod repo update` and try again. On a fresh CocoaPods install the first sync
of the spec repo is large and sometimes times out.

**"Sandbox: rsync … Operation not permitted".**
Xcode 15's sandboxing versus CocoaPods. Set **Build Settings →
`ENABLE_USER_SCRIPT_SANDBOXING` → No** on the App target.

**"No such module 'Capacitor'".**
You opened `App.xcodeproj` instead of `App.xcworkspace`. Close it and run
`npx cap open ios`.

**The camera is black in the Simulator.**
The Simulator has no camera. Barcode scanning and photo capture only work on a
physical device — this is an Apple limitation, not a bug in the app.

**Reminders never fire.**
Local notifications need the paid Apple Developer Program. On a free personal
team they are silently dropped.

**Build fails on Apple Silicon with an architecture error.**
Add `arm64` to **Excluded Architectures** for **Any iOS Simulator SDK** on the
App target. Only affects simulator builds; device builds are unaffected.

**The app launches to a white screen.**
`dist/` was not copied. Run `npm run build && npx cap sync ios` and rebuild.

---

## 7. If you later want TestFlight

Once you have the paid program, TestFlight lets you install over the air with no
cable and no 7-day expiry:

1. Create the app record at [App Store Connect](https://appstoreconnect.apple.com)
   using the same bundle ID.
2. In Xcode: **Product → Destination → Any iOS Device**, then
   **Product → Archive**.
3. When the Organizer opens: **Distribute App → TestFlight & App Store**.
4. Install TestFlight on your iPhone and the build appears within a few minutes.

You do not need to submit to the App Store or pass review to use TestFlight for
yourself.

---

## Notes on what this app does natively

| Feature | Plugin | Works without the $99? |
|---|---|---|
| Barcode scanning | `@capacitor-mlkit/barcode-scanning` | Yes |
| Meal photos | `@capacitor/camera` | Yes |
| Face ID unlock | `@aparajita/capacitor-biometric-auth` | Yes |
| Saved data | `@capacitor/preferences` (UserDefaults) | Yes |
| CSV export to Files | `@capacitor/filesystem` | Yes |
| Meal reminders | `@capacitor/local-notifications` | **No** |

Barcodes are looked up against [Open Food Facts](https://world.openfoodfacts.org),
which is free and needs no API key. That lookup is the only network request the
app makes; entries, photos and settings never leave the phone.

### Where a vision model would slot in

The photo flow currently asks what is on the plate and sums honest per-item
ranges, which works offline and needs no API key. If you want the estimate made
from the image itself, the seam is `src/lib/plateItems.ts` and the `items` state
in `src/screens/Photo.tsx`: anything that returns a list of
`{label, low, high}` drops straight in. Note that calling a vision API from the
app would mean shipping an API key inside the binary, where it can be extracted
— that normally wants a small proxy server, which is a bigger change than it
first appears and would break the "nothing leaves this phone" promise the app
currently makes in Settings.
