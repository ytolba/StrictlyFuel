import type { FuelFood, MealIngredient, MealMacros } from "../types/fuel";

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const WHOLE_FOOD = /fruit|banana|berr|apple|orange|mango|grape|date|raisin|potato|vegetable|broccoli|avocado|rice|oat|quinoa|chicken|turkey|beef|fish|salmon|egg|milk|plain yogurt|greek yogurt|nut|seed|olive oil|honey|maple syrup/i;

type FlagTier = "major" | "moderate" | "minor";
type IngredientFlag = { id: string; label: string; tier: FlagTier; penalty: number; detail: string };
export type ProcessingLevel = "whole" | "minimal" | "processed" | "ultra_processed";
export type HealthSuggestion = { id: string; title: string; detail: string; gain: number };
export type HealthResult = { score: number; note: string; suggestions: HealthSuggestion[]; processing: { level: ProcessingLevel; reason: string }[] };

const RULES: Array<{ pattern: RegExp; flag: Omit<IngredientFlag, "id"> }> = [
  { pattern: /partially hydrogenated|hydrogenated shortening|potassium bromate|bromated flour|brominated vegetable oil/, flag: { label: "High-concern formulation", tier: "major", penalty: 24, detail: "A high-penalty ingredient appears in the ingredient list." } },
  { pattern: /red 3|red 40|yellow 5|yellow 6|blue 1|blue 2|green 3|titanium dioxide/, flag: { label: "Artificial color", tier: "major", penalty: 18, detail: "Synthetic coloring meaningfully lowers ingredient quality." } },
  { pattern: /bha\b|bht\b|tbhq|propyl gallate|sodium nitrite|sodium nitrate/, flag: { label: "Synthetic preservative", tier: "major", penalty: 18, detail: "A higher-penalty synthetic preservative is listed." } },
  { pattern: /high fructose corn syrup|aspartame|acesulfame potassium|acesulfame k|sucralose|saccharin/, flag: { label: "Highly formulated sweetener", tier: "moderate", penalty: 12, detail: "A highly formulated sweetener lowers the clean-ingredient rating." } },
  { pattern: /artificial flavor|artificial flavour|maltodextrin|modified food starch|modified corn starch/, flag: { label: "Highly formulated additive", tier: "moderate", penalty: 8, detail: "A formulation additive makes the ingredient list less simple." } },
  { pattern: /polysorbate 80|carrageenan|carboxymethylcellulose|cellulose gum|propylene glycol/, flag: { label: "Texture additive", tier: "minor", penalty: 5, detail: "A texture or stabilizing additive slightly lowers ingredient quality." } },
  { pattern: /mono- and diglycerides|monoglycerides|diglycerides|soy lecithin|sunflower lecithin|xanthan gum|guar gum/, flag: { label: "Processing aid", tier: "minor", penalty: 3, detail: "A common processing aid adds a small formulation penalty." } },
];

const ingredientText = (food: FuelFood) => (food.ingredientsText || "").trim().toLowerCase();

function flagsFor(food: FuelFood): IngredientFlag[] {
  const text = ingredientText(food);
  if (!text) return [];
  return RULES.flatMap((rule, index) => rule.pattern.test(text) ? [{ ...rule.flag, id: `${food.id}-${index}` }] : []);
}

export function classifyFoodProcessingLevel(food: FuelFood): { level: ProcessingLevel; reason: string } {
  const flags = flagsFor(food);
  if (flags.some((item) => item.tier === "major")) return { level: "ultra_processed", reason: "The printed ingredient list contains a high-penalty additive." };
  if (flags.some((item) => item.tier === "moderate")) return { level: "processed", reason: "The printed ingredient list contains formulation additives." };
  if (ingredientText(food)) return { level: flags.length ? "minimal" : "whole", reason: flags.length ? "Mostly simple ingredients with a small processing aid." : "No flagged additives were found in the available ingredient list." };
  if (WHOLE_FOOD.test(food.name) && (food.source === "strictly" || food.source === "usda")) return { level: "whole", reason: "A recognizable single food with no packaged formulation attached." };
  return { level: "minimal", reason: "No complete ingredient list is available for a stronger claim." };
}

/** Ingredient quality only. Calories, portion size, meal size, macros, and workout fit never affect this score. */
export function calculateHealthScore(ingredients: MealIngredient[], _macros?: MealMacros): HealthResult {
  if (!ingredients.length) return { score: 0, note: "No ingredients are available to rate.", suggestions: [], processing: [] };
  const uniqueFoods = [...new Map(ingredients.map((item) => [item.food.id, item.food])).values()];
  const allFlags = uniqueFoods.flatMap(flagsFor);
  const missingLists = uniqueFoods.filter((food) => !ingredientText(food) && !(WHOLE_FOOD.test(food.name) && (food.source === "strictly" || food.source === "usda"))).length;
  const complexityPenalty = uniqueFoods.reduce((sum, food) => {
    const text = ingredientText(food);
    if (!text) return sum;
    const count = text.split(/,|;/).filter(Boolean).length;
    return sum + Math.max(0, Math.min(8, count - 8) * 0.75);
  }, 0);
  const score = clamp(100 - allFlags.reduce((sum, flag) => sum + flag.penalty, 0) - complexityPenalty - missingLists * 5);
  const note = allFlags.length === 0
    ? missingLists ? "No flagged additives were found, but some foods do not include a complete ingredient list." : "The available ingredient lists are simple and contain no flagged additives."
    : allFlags.some((item) => item.tier === "major") ? "One or more high-penalty ingredients brought this rating down." : "The ingredient list contains formulation additives that lowered the rating.";
  const suggestions = [...new Map(allFlags.map((flag) => [flag.label, flag])).values()]
    .sort((a, b) => b.penalty - a.penalty)
    .slice(0, 4)
    .map((flag) => ({ id: flag.id, title: flag.label, detail: flag.detail, gain: flag.penalty }));
  return { score, note, suggestions, processing: uniqueFoods.map(classifyFoodProcessingLevel) };
}
