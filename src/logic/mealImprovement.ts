import { FUEL_FOODS } from "../data/fuelFoods";
import type { FuelFood, FuelTarget, MealFix, MealIngredient, MealMacros, WorkoutDraft } from "../types/fuel";

const SWEET = /yogurt|yoghurt|oat|cereal|granola|smoothie|fruit|banana|berr|honey|maple|rice cake|pancake|waffle/i;
const SAVORY = /chicken|turkey|beef|fish|salmon|egg|rice|pasta|potato|salad|vegetable|couscous|bread|toast|sandwich/i;
const STARCH = /rice|pasta|noodle|potato|oat|bread|toast|bagel|cereal|granola|couscous|tortilla|pancake|waffle|rice cake/i;
const QUICK = /banana|honey|maple|jam|juice|date|rice cake|white bread|sports drink/i;

const roundTo = (value: number, step: number) => Math.max(step, Math.round(value / step) * step);
const carbImpact = (food: FuelFood, grams: number) => Math.round(food.per100g.carbs * grams / 100);

function reasonableStep(food: FuelFood) {
  const name = food.name.toLowerCase();
  if (/honey|maple|syrup|jam/.test(name)) return 7;
  if (/rice cake/.test(name)) return 9;
  if (/bread|toast/.test(name)) return 28;
  if (/banana/.test(name)) return 59;
  if (/fruit|berr|grape/.test(name)) return 25;
  return 10;
}

function maxAddition(food: FuelFood) {
  const name = food.name.toLowerCase();
  if (/honey|maple|syrup|jam/.test(name)) return 42;
  if (/rice cake/.test(name)) return 54;
  if (/bread|toast|bagel/.test(name)) return 140;
  if (/banana|apple|orange/.test(name)) return 236;
  if (/rice|pasta|noodle|potato|oat|couscous/.test(name)) return 280;
  if (/berr|fruit/.test(name)) return 240;
  return Math.max(100, food.defaultGrams * 1.5);
}

function servingPhrase(food: FuelFood, grams: number) {
  const ratio = grams / Math.max(1, food.defaultGrams);
  if (ratio >= 0.85 && ratio <= 1.2) return `about 1 ${food.servingLabel}`;
  if (ratio >= 1.35 && ratio <= 1.7) return `about 1½ servings`;
  if (ratio >= 0.4 && ratio <= 0.65) return `about ½ serving`;
  return `about ${grams} g`;
}

function existingCandidate(ingredients: MealIngredient[], carbGap: number, workout: WorkoutDraft) {
  return ingredients
    .filter((item) => item.food.per100g.carbs >= 8 && item.food.category !== "fat" && item.food.category !== "protein")
    .map((item) => {
      const needed = roundTo(carbGap / Math.max(0.01, item.food.per100g.carbs / 100), reasonableStep(item.food));
      const speedFit = workout.startsInMinutes <= 60
        ? item.food.carbSpeed === "fast" ? 25 : item.food.carbSpeed === "medium" ? 8 : -15
        : item.food.carbSpeed === "slow" ? 12 : 18;
      const familiar = STARCH.test(item.food.name) ? 18 : 8;
      const feasible = needed <= maxAddition(item.food) ? 35 : -40;
      return { item, needed, rank: speedFit + familiar + feasible };
    })
    .filter(({ needed, item }) => needed <= maxAddition(item.food))
    .sort((a, b) => b.rank - a.rank)[0];
}

function compatibleFoods(ingredients: MealIngredient[], workout: WorkoutDraft) {
  const names = ingredients.map((item) => item.food.name).join(" ");
  const sweet = SWEET.test(names) && !SAVORY.test(names);
  const savory = SAVORY.test(names);
  const preferred = sweet
    ? [/berr/i, /banana/i, /granola/i, /honey/i, /date/i, /maple/i]
    : /egg/i.test(names)
      ? [/bread|toast/i, /potato/i, /banana|apple|orange|fruit/i]
      : savory
        ? [/white rice|jasmine rice/i, /potato/i, /couscous/i, /bread|toast/i, /banana|apple|orange|fruit/i]
        : [/banana/i, /bread|toast/i, /rice cake/i, /fruit/i];
  const close = workout.startsInMinutes <= 60;
  return preferred.flatMap((pattern) => FUEL_FOODS.filter((food) => pattern.test(food.name)))
    .filter((food, index, all) => all.findIndex((other) => other.id === food.id) === index)
    .filter((food) => !close || food.carbSpeed !== "slow")
    .sort((a, b) => (close && QUICK.test(b.name) ? 1 : 0) - (close && QUICK.test(a.name) ? 1 : 0));
}

/**
 * Returns one minimal, natural adjustment. Existing foods are deliberately
 * hard-prioritized before any new ingredient is considered.
 */
export function rankMealAdjustments(ingredients: MealIngredient[], macros: MealMacros, target: FuelTarget, workout: WorkoutDraft): MealFix[] {
  const carbGap = Math.round(target.carbTarget - macros.carbs);
  if (carbGap <= 5) return [];

  const existing = existingCandidate(ingredients, carbGap, workout);
  if (existing) {
    const impact = carbImpact(existing.item.food, existing.needed);
    return [{
      id: `increase-${existing.item.id}`,
      action: "increase",
      ingredientId: existing.item.id,
      foodId: existing.item.food.id,
      ingredientName: existing.item.food.name,
      grams: existing.needed,
      carbImpact: impact,
      detail: `Add ${servingPhrase(existing.item.food, existing.needed)} of what is already on your plate. That adds about ${impact} g carbs.`,
    }];
  }

  const addition = compatibleFoods(ingredients, workout)[0];
  if (!addition) return [];
  const grams = Math.min(maxAddition(addition), roundTo(carbGap / Math.max(0.01, addition.per100g.carbs / 100), reasonableStep(addition)));
  const impact = carbImpact(addition, grams);
  const isTopUp = workout.startsInMinutes >= 150 && macros.carbs >= target.carbRange[0] * 0.75;
  return [{
    id: `${isTopUp ? "topup" : "add"}-${addition.id}`,
    action: isTopUp ? "top_up" : "add",
    foodId: addition.id,
    ingredientName: addition.name,
    grams,
    carbImpact: impact,
    detail: isTopUp
      ? `Keep this meal as-is. Have ${servingPhrase(addition, grams)} closer to training for about ${impact} g carbs.`
      : `Add ${servingPhrase(addition, grams)}. It fits this meal naturally and adds about ${impact} g carbs.`,
  }];
}
