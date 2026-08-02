/* Headless smoke test.
 *
 * Walks first run → ledger → scan → trends → settings against the built app,
 * failing on any console error, page error, or missing landmark. This is the
 * check that the thing actually runs; the pixel work is verified against the
 * prototype by eye, from the screenshots it drops in scripts/shots/. */

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SHOTS = join(HERE, 'shots');
const BASE = process.env.BASE_URL ?? 'http://localhost:4173';

mkdirSync(SHOTS, { recursive: true });

const problems = [];
// The container ships its own Chromium; point at it rather than downloading one.
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
});
// iPhone 15 Pro viewport, the size the design was drawn for (390 wide).
const context = await browser.newContext({
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();

page.on('console', (msg) => {
  if (msg.type() === 'error') problems.push(`console: ${msg.text()}`);
});
page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));

const shot = async (name) => {
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
};

const expect = async (label, locator) => {
  try {
    await locator.first().waitFor({ state: 'visible', timeout: 6000 });
    console.log(`  ok   ${label}`);
  } catch {
    problems.push(`missing: ${label}`);
    console.log(`  MISS ${label}`);
  }
};

console.log('first run');
await page.goto(BASE, { waitUntil: 'networkidle' });
await expect('greek wordmark', page.locator('text=ΙΝΤΑΚΙΝΓ'));
await expect('the 100% line', page.locator('text=/100% of it is just knowing/'));
await shot('01-welcome');

await page.locator('button:has-text("Start a ledger")').click();
await expect('goal step', page.locator('text=What are you measuring against?'));
await shot('02-goal');

await page.locator('button:has-text("Set the target")').click();
await expect('PIN step', page.locator('text=Lock the ledger'));
const pins = page.locator('input[type="password"]');
await pins.nth(0).fill('1234');
await pins.nth(1).fill('1234');
await shot('03-pin');
await page.locator('button:has-text("Open the ledger")').click();

console.log('today, empty');
await expect('empty state', page.locator('text=nothing written down yet'));
await expect('dateline rail', page.locator('text=/DAY \\d+/'));
await expect('tab bar', page.locator('button.tab:has-text("Trends")'));
await shot('04-today-empty');

console.log('photo flow');
await page.locator('button:has-text("Photograph a meal instead")').click();
await expect('range headline', page.locator('text=kcal, best guess'));
await page.locator('button:has-text("Add what\'s on the plate")').click();
await expect('plate picker', page.locator('text=Basmati rice, 1 cup'));
await page.locator('button:has-text("Chicken thigh, grilled")').click();
await page.locator('button:has-text("Add what\'s on the plate")').click();
await page.locator('button:has-text("Basmati rice, 1 cup")').click();
await expect('summed range', page.locator('text=400–480'));
await shot('05-photo');
await page.locator('button:has-text("Write it in as 400–480")').click();

console.log('today, with a line');
await expect('the logged line', page.locator('.erow').first());
await expect('ate today', page.locator('text=Ate today'));
await expect('protein hero', page.locator('text=Protein'));
await shot('06-today-logged');

console.log('entry edit');
await page.locator('.erow').first().click();
await expect('entry screen', page.locator('button:has-text("Save the change")'));
await expect('delete', page.locator('button:has-text("Delete this line")'));
await shot('07-entry');
await page.locator('button:has-text("Save the change")').click();

console.log('scan');
await page.locator('button:has-text("Scan a barcode")').click();
await expect('scan copy', page.locator('text=hold the barcode in the frame'));
await expect('manual barcode', page.locator('input[placeholder="type the numbers"]'));
await shot('08-scan');
await page.locator('button:has-text("← Today")').click();

console.log('trends');
await page.locator('button.tab:has-text("Trends")').click();
await expect('range switcher', page.locator('label:has-text("30 days")'));
await expect('recommendations', page.locator('text=To move the line up'));
await shot('09-trends');

await page.locator('button:has-text("See detailed analytics")').click();
await expect('detail', page.locator('text=Detailed analytics'));
await shot('10-detail');

console.log('settings');
await page.locator('button.tab:has-text("Settings")').click();
await expect('five groups', page.locator('button.sec'));
await expect('chart group', page.locator('text=Your chart, your way'));
await shot('11-settings');

await page.locator('button.sec:has-text("Your chart, your way")').click();
await expect('live preview', page.locator('text=Live preview'));
await expect('band slider', page.locator('input.band'));
await page.locator('button.chip:has-text("Newspaper bars")').click();
await page.locator('button.chip:has-text("Full process")').click();
await shot('12-chart-settings');

console.log('persistence');
await page.reload({ waitUntil: 'networkidle' });
await expect('PIN keypad after reload', page.locator('button.key:has-text("7")'));
for (const d of ['1', '2', '3', '4']) {
  await page.locator(`button.key:has-text("${d}")`).first().click();
}
await expect('ledger survived reload', page.locator('.erow').first());
await shot('13-after-reload');

await browser.close();

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('\nall good — screenshots in scripts/shots/');
