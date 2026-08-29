import type { FuelFood, MealIngredient, MealMacros } from "../types/fuel";

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const WHOLE_FOOD = /fruit|banana|berr|apple|orange|mango|grape|date|raisin|potato|vegetable|broccoli|avocado|rice|oat|quinoa|chicken|turkey|beef|fish|salmon|egg|milk|plain yogurt|greek yogurt|nut|seed|olive oil|honey|maple syrup/i;
const MINIMALLY_PROCESSED = /bread|toast|pasta|couscous|bagel|tortilla|cereal|granola|rice cake/i;
const ULTRA_PROCESSED = /sports drink|energy drink|soda|candy|gumm|carb(?:ohydrate)? gel|energy gel|chew|protein bar|meal replacement|artificial/i;

export type ProcessingLevel = "whole" | "minimal" | "processed" | "ultra_processed";
export type HealthSuggestion = { id: string; title: string; detail: string; gain: number };
export type HealthResult = { score: number; note: string; suggestions: HealthSuggestion[]; processing: { level: ProcessingLevel; reason: string }[] };

export function classifyFoodProcessingLevel(food: FuelFood): { level: ProcessingLevel; reason: string } {
  const name = food.name.toLowerCase();
  if (ULTRA_PROCESSED.test(name)) return { level: "ultra_processed", reason: "A formulated performance or convenience product." };
  if (WHOLE_FOOD.test(name) && !/flavored|sweetened|instant/.test(name)) return { level: "whole", reason: "A whole or plainly prepared recognizable food." };
  if (MINIMALLY_PROCESSED.test(name) || food.source === "usda") return { level: "minimal", reason: "A recognizable food with limited processing." };
  if (food.source === "open_food_facts" || food.source === "label") return { level: "processed", reason: "A packaged food whose quality depends on its formulation." };
  return { level: "minimal", reason: "No strong sign of heavy formulation in the available data." };
}

/** General food quality only. Workout timing and digestion never affect this score. */
export function calculateHealthScore(ingredients: MealIngredient[], macros: MealMacros): HealthResult {
  const processing = ingredients.map((item) => classifyFoodProcessingLevel(item.food));
  const counts = processing.reduce((sum, item) => ({ ...sum, [item.level]: sum[item.level] + 1 }), { whole: 0, minimal: 0, processed: 0, ultra_processed: 0 } as Record<ProcessingLevel, number>);
  const itemCount = Math.max(1, ingredients.length);
  const wholeShare = (counts.whole + counts.minimal * 0.65) / itemCount;
  const ultraShare = counts.ultra_processed / itemCount;
  const fiberPer500Calories = macros.calories > 0 ? macros.fiber / macros.calories * 500 : 0;
  const variety = new Set(ingredients.map((item) => item.food.category)).size;

  const score = clamp(
    62 + wholeShare * 25 + Math.min(7, variety * 1.5) + Math.min(6, fiberPer500Calories) - ultraShare * 24 - counts.processed * 3
  );
  const note = score >= 85
    ? "Built mostly from whole or minimally processed foods."
    : score >= 70
      ? "Mostly recognizable foods, with a little room to improve overall quality."
      : "Useful fuel can still be more processed. This rating only reflects everyday food quality.";

  const suggestions: HealthSuggestion[] = [];
  if (counts.ultra_processed > 0) suggestions.push({ id: "processing", title: "Use a whole-food option when timing allows", detail: "One item is highly formulated. Outside a tight workout window, fruit, oats, rice or potatoes can provide similar carbohydrates.", gain: Math.min(12, counts.ultra_processed * 6) });
  if (wholeShare < 0.6) suggestions.push({ id: "whole", title: "Anchor the meal with one recognizable food", detail: "A fruit, vegetable, plain grain or simply prepared protein would raise the everyday food quality.", gain: 6 });
  if (fiberPer500Calories < 3 && macros.calories > 250) suggestions.push({ id: "fiber", title: "Add produce when your timing allows", detail: "Fruit or vegetables add fiber and variety. Keep this separate from your immediate pre-workout plan if you train soon.", gain: 4 });
  if (variety < 2 && ingredients.length > 1) suggestions.push({ id: "variety", title: "Add another whole-food group", detail: "A simple fruit or vegetable adds variety without turning this into a different meal.", gain: 3 });

  return { score, note, suggestions: suggestions.sort((a, b) => b.gain - a.gain).slice(0, 3), processing };
}
