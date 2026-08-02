/** The plate library behind the photo estimate.
 *
 *  A photograph cannot tell you a calorie count, and the design is explicit
 *  that it should not pretend to: "A photo can't be exact. Tick what's on the
 *  plate and the range tightens." So rather than invent a single figure, the
 *  photo screen asks what is on the plate and adds up honest low–high ranges
 *  per component. Everything here is a typical home-portion range; the user can
 *  always add an item with their own numbers.
 *
 *  (If you later want the estimate made automatically from the image, this is
 *  the seam: a vision model returns a list of {label, low, high} and the rest of
 *  the screen is unchanged. See docs/IOS.md.) */

export interface PlateItem {
  label: string;
  low: number;
  high: number;
  group: string;
}

export const PLATE_ITEMS: PlateItem[] = [
  // protein
  { label: 'Chicken thigh, grilled', low: 210, high: 260, group: 'Protein' },
  { label: 'Chicken breast, grilled', low: 165, high: 220, group: 'Protein' },
  { label: 'Salmon fillet', low: 280, high: 360, group: 'Protein' },
  { label: 'White fish fillet', low: 140, high: 190, group: 'Protein' },
  { label: 'Beef mince, cooked', low: 250, high: 330, group: 'Protein' },
  { label: 'Lamb curry portion', low: 350, high: 480, group: 'Protein' },
  { label: 'Two eggs, fried', low: 180, high: 230, group: 'Protein' },
  { label: 'Two eggs, boiled', low: 140, high: 160, group: 'Protein' },
  { label: 'Paneer, 100 g', low: 260, high: 320, group: 'Protein' },
  { label: 'Tofu, 150 g', low: 110, high: 170, group: 'Protein' },
  { label: 'Dal, one bowl', low: 180, high: 260, group: 'Protein' },
  { label: 'Chickpea curry', low: 220, high: 320, group: 'Protein' },

  // carbohydrate
  { label: 'Basmati rice, 1 cup', low: 190, high: 220, group: 'Carbs' },
  { label: 'Rice, large portion', low: 300, high: 400, group: 'Carbs' },
  { label: 'Roti / chapati', low: 90, high: 130, group: 'Carbs' },
  { label: 'Naan', low: 260, high: 360, group: 'Carbs' },
  { label: 'Pasta, cooked bowl', low: 300, high: 420, group: 'Carbs' },
  { label: 'Two slices of bread', low: 150, high: 220, group: 'Carbs' },
  { label: 'Jacket potato', low: 220, high: 300, group: 'Carbs' },
  { label: 'Chips, side portion', low: 300, high: 450, group: 'Carbs' },
  { label: 'Porridge, made up', low: 200, high: 280, group: 'Carbs' },

  // vegetables and sides
  { label: 'Salad, oil dressing', low: 80, high: 140, group: 'Sides' },
  { label: 'Salad, undressed', low: 25, high: 50, group: 'Sides' },
  { label: 'Steamed vegetables', low: 40, high: 90, group: 'Sides' },
  { label: 'Roast vegetables', low: 120, high: 200, group: 'Sides' },
  { label: 'Yoghurt, small pot', low: 90, high: 150, group: 'Sides' },
  { label: 'Avocado, half', low: 120, high: 170, group: 'Sides' },
  { label: 'Cheese, a slice', low: 80, high: 120, group: 'Sides' },

  // extras
  { label: 'Olive oil, a drizzle', low: 60, high: 130, group: 'Extras' },
  { label: 'Butter, a knob', low: 50, high: 110, group: 'Extras' },
  { label: 'Mayonnaise / sauce', low: 60, high: 160, group: 'Extras' },
  { label: 'Gravy', low: 30, high: 70, group: 'Extras' },
];

export const PLATE_GROUPS = ['Protein', 'Carbs', 'Sides', 'Extras'];
