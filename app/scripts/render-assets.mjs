/* Renders the icon and splash SVGs to the PNGs @capacitor/assets expects.
   Uses the container's Chromium rather than pulling in a native image
   toolchain — the sources are plain SVG and a browser renders them exactly. */

import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', 'assets-src');
const OUT = join(HERE, '..', 'assets');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });

for (const [name, size] of [
  ['icon', 1024],
  ['splash', 2732],
]) {
  const svg = readFileSync(join(SRC, `${name}.svg`), 'utf8');
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<style>html,body{margin:0;padding:0;overflow:hidden}svg{display:block}</style>${svg}`,
    { waitUntil: 'load' },
  );
  await page.screenshot({ path: join(OUT, `${name}.png`), omitBackground: false });
  await page.close();
  console.log(`rendered assets/${name}.png at ${size}×${size}`);
}

// @capacitor/assets also looks for a dark variant; the app is light-only, so
// point it at the same sheet rather than letting it invent one.
const svg = readFileSync(join(SRC, 'splash.svg'), 'utf8');
const page = await browser.newPage({ viewport: { width: 2732, height: 2732 } });
await page.setContent(`<style>html,body{margin:0;padding:0;overflow:hidden}</style>${svg}`);
await page.screenshot({ path: join(OUT, 'splash-dark.png') });
await page.close();
console.log('rendered assets/splash-dark.png');

await browser.close();
