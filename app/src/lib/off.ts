import { CapacitorHttp } from '@capacitor/core';
import type { CustomFood, Product } from '../types';

/** Open Food Facts — the barcode table behind the scan flow.
 *
 *  Free, no API key, ~3 million products, and permissively CORS'd so it works
 *  from the WebView. Requests go through CapacitorHttp rather than fetch so
 *  they are made natively on device: that sidesteps CORS entirely and lets us
 *  send the User-Agent string Open Food Facts asks integrators for (fetch
 *  forbids setting that header).
 *
 *  The user's own saved foods are checked first, so a food they corrected once
 *  keeps their figures rather than being overwritten by the public table. */

const BASE = 'https://world.openfoodfacts.org/api/v2/product';
const UA = 'Intaking/1.0 (personal calorie ledger)';
const FIELDS = [
  'product_name',
  'product_name_en',
  'brands',
  'serving_size',
  'quantity',
  'nutriments',
].join(',');

function num(v: unknown): number | undefined {
  const n = typeof v === 'string' ? Number.parseFloat(v) : (v as number);
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
}

interface Nutriments {
  [k: string]: unknown;
}

/** Energy per serving where the product declares one, else per 100 g/ml. The
 *  second value tells the caller which basis was used, so the confirm sheet can
 *  say "per 100 g" honestly instead of implying a serving. */
function readEnergy(n: Nutriments): { kcal: number; per100: boolean } | null {
  const kcalServing = num(n['energy-kcal_serving']);
  if (kcalServing && kcalServing > 0) return { kcal: kcalServing, per100: false };

  const kjServing = num(n['energy-kj_serving']) ?? num(n['energy_serving']);
  if (kjServing && kjServing > 0) return { kcal: kjServing / 4.184, per100: false };

  const kcal100 = num(n['energy-kcal_100g']);
  if (kcal100 && kcal100 > 0) return { kcal: kcal100, per100: true };

  const kj100 = num(n['energy-kj_100g']) ?? num(n['energy_100g']);
  if (kj100 && kj100 > 0) return { kcal: kj100 / 4.184, per100: true };

  return null;
}

function readMacros(n: Nutriments, per100: boolean) {
  const k = (base: string) => num(n[`${base}${per100 ? '_100g' : '_serving'}`]) ?? 0;
  const protein = k('proteins');
  const carbs = k('carbohydrates');
  const fat = k('fat');
  if (!protein && !carbs && !fat) return undefined;
  return {
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
  };
}

export function customToProduct(f: CustomFood): Product {
  return {
    barcode: f.barcode ?? '',
    name: f.name,
    servingLabel: f.servingSize,
    kcalPerServing: f.kcalPerServing,
    macros: f.macros,
    custom: true,
  };
}

/** Looks a barcode up, user's own foods first. Returns null when neither
 *  source knows it — which is the design's "No match" path. */
export async function lookupBarcode(
  barcode: string,
  customFoods: CustomFood[],
): Promise<Product | null> {
  const own = customFoods.find((f) => f.barcode === barcode);
  if (own) return customToProduct(own);

  let data: Record<string, unknown>;
  try {
    const res = await CapacitorHttp.get({
      url: `${BASE}/${encodeURIComponent(barcode)}.json`,
      params: { fields: FIELDS },
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      connectTimeout: 10_000,
      readTimeout: 10_000,
    });
    if (res.status === 404) return null;
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`Open Food Facts returned ${res.status}`);
    }
    data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
  } catch (err) {
    // A network failure is not a "no match" — the caller must be able to tell
    // the difference, so it surfaces as an error rather than an empty result.
    throw new Error(
      err instanceof Error && err.message
        ? `Could not reach the food table: ${err.message}`
        : 'Could not reach the food table.',
    );
  }

  if (data.status === 0 || !data.product) return null;

  const p = data.product as Record<string, unknown>;
  const nutriments = (p.nutriments ?? {}) as Nutriments;
  const energy = readEnergy(nutriments);
  if (!energy) return null;

  const name =
    (p.product_name_en as string) || (p.product_name as string) || 'Unnamed product';
  const servingSize = (p.serving_size as string) || '';

  return {
    barcode,
    name: name.trim(),
    brand: ((p.brands as string) || '').split(',')[0].trim() || undefined,
    servingLabel: energy.per100 ? 'per 100 g' : servingSize || 'per serving',
    kcalPerServing: Math.round(energy.kcal),
    macros: readMacros(nutriments, energy.per100),
  };
}
