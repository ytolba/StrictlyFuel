export type HouseholdMeasureResult = {
  grams: number;
  quantity: number;
  unit: "tsp" | "tbsp" | "cup" | "piece" | "slice" | "oz";
  source: "food_specific" | "mass";
};

type FoodMeasures = Partial<Record<HouseholdMeasureResult["unit"], number>>;

const RULES: Array<{ pattern: RegExp; grams: FoodMeasures }> = [
  { pattern: /\bhoney\b/i, grams: { tsp: 7, tbsp: 21, cup: 336 } },
  { pattern: /\bmaple syrup\b/i, grams: { tsp: 6.7, tbsp: 20, cup: 315 } },
  { pattern: /\b(agave|corn syrup|molasses|syrup)\b/i, grams: { tsp: 7, tbsp: 20, cup: 320 } },
  { pattern: /\b(peanut|almond|cashew|sunflower|nut) butter\b/i, grams: { tsp: 5.3, tbsp: 16, cup: 256 } },
  { pattern: /\b(oil|olive oil|avocado oil|coconut oil)\b/i, grams: { tsp: 4.5, tbsp: 13.5, cup: 216 } },
  { pattern: /\b(oat|oatmeal)s?\b/i, grams: { tbsp: 5, cup: 80 } },
  { pattern: /\b(cooked )?(white |brown |jasmine |basmati )?rice\b/i, grams: { tbsp: 10, cup: 158 } },
  { pattern: /\bbanana\b/i, grams: { piece: 118 } },
  { pattern: /\bapple\b/i, grams: { piece: 182 } },
  { pattern: /\borange\b/i, grams: { piece: 131 } },
  { pattern: /\b(medjool )?date\b/i, grams: { piece: 24 } },
  { pattern: /\b(bread|toast)\b/i, grams: { slice: 28 } },
  { pattern: /\bbagel\b/i, grams: { piece: 95 } },
  { pattern: /\brice cakes?\b/i, grams: { piece: 9 } },
];

const fractions: Record<string, number> = { "¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 };

function quantityFromText(input: string) {
  const normalized = input.toLowerCase().replace(/(\d)\s+(\d+)\s*\/\s*(\d+)/, (_, whole, top, bottom) => String(Number(whole) + Number(top) / Number(bottom)));
  const unicode = Object.entries(fractions).find(([symbol]) => normalized.includes(symbol));
  if (unicode) return Number(normalized.match(/\d+(?=\s*[¼½¾⅓⅔])/)?.[0] || 0) + unicode[1];
  const fraction = normalized.match(/(\d+)\s*\/\s*(\d+)/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  return Number(normalized.match(/\d+(?:\.\d+)?/)?.[0] || 1);
}

function unitFromText(input: string): HouseholdMeasureResult["unit"] | null {
  const value = input.toLowerCase();
  if (/\b(tablespoons?|tbsps?|tbsp)\b/.test(value)) return "tbsp";
  if (/\b(teaspoons?|tsps?|tsp)\b/.test(value)) return "tsp";
  if (/\b(cups?|c)\b/.test(value)) return "cup";
  if (/\b(ounces?|oz)\b/.test(value)) return "oz";
  if (/\b(slices?)\b/.test(value)) return "slice";
  if (/\b(pieces?|whole|medium|small|large|banana|apple|orange|dates?|bagels?)\b/.test(value)) return "piece";
  return null;
}

/** Convert only when the food/unit pair has a reliable deterministic rule. */
export function householdAmountToGrams(foodName: string, answer: string): HouseholdMeasureResult | null {
  const unit = unitFromText(answer);
  if (!unit) return null;
  const quantity = quantityFromText(answer);
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 20) return null;
  if (unit === "oz") return { grams: Math.round(quantity * 28.3495 * 10) / 10, quantity, unit, source: "mass" };
  const gramsPerUnit = RULES.find((candidate) => candidate.pattern.test(foodName) && candidate.grams[unit] != null)?.grams[unit];
  if (!gramsPerUnit) return null;
  const grams = Math.round(quantity * gramsPerUnit * 10) / 10;
  if (grams < 0.5 || grams > 2500) return null;
  return { grams, quantity, unit, source: "food_specific" };
}
