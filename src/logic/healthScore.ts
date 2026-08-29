import type { MealIngredient, MealMacros } from "../types/fuel";

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const CONCENTRATED = /gel|sports drink|syrup|honey|candy|chew|soda|energy drink/i;
const REFINED = /white bread|white rice|cereal|cracker|pretzel|bagel/i;

export type HealthSuggestion = { id: string; title: string; detail: string; gain: number };

export type HealthResult = {
  score: number;
  note: string;
  /** Concrete, ranked ways to raise the rating. Always available to every user. */
  suggestions: HealthSuggestion[];
};

/**
 * A general "how balanced is this as food" rating, deliberately separate from
 * the Fuel Score. A meal can be excellent workout fuel and still be a mediocre
 * everyday meal — the two numbers answer different questions.
 */
export function calculateHealthScore(ingredients: MealIngredient[], macros: MealMacros): HealthResult {
  const wholeFoodCount = ingredients.filter(
    (item) => item.food.source === "usda" && !CONCENTRATED.test(item.food.name)
  ).length;
  const concentrated = ingredients.filter((item) => CONCENTRATED.test(item.food.name));
  const refined = ingredients.filter((item) => REFINED.test(item.food.name));
  const fiberPer500Calories = macros.calories ? (macros.fiber / macros.calories) * 500 : 0;
  const proteinShare = macros.calories ? (macros.protein * 4) / macros.calories : 0;

  const score = clamp(
    68 +
      Math.min(14, wholeFoodCount * 4) +
      Math.min(12, fiberPer500Calories * 1.8) +
      (proteinShare >= 0.15 ? 4 : 0) -
      concentrated.length * 5 -
      Math.max(0, macros.fat - 30) * 0.5
  );

  const note =
    score >= 80
      ? "Mostly familiar whole foods with a useful mix of nutrients."
      : score >= 65
        ? "A reasonable meal, with room for more whole-food variety outside the workout window."
        : "This works as targeted workout fuel, but it is less balanced as an everyday meal.";

  const suggestions: HealthSuggestion[] = [];

  if (fiberPer500Calories < 4) {
    suggestions.push({
      id: "fiber",
      title: "Add a piece of whole fruit or vegetables",
      detail: "Fiber is low for the calories here. Berries, an apple or a side salad lifts it without adding much that sits heavy.",
      gain: 6,
    });
  }
  if (concentrated.length) {
    suggestions.push({
      id: "concentrated",
      title: `Swap one concentrated sugar source`,
      detail: `${concentrated.map((item) => item.food.name).slice(0, 2).join(" and ")} ${concentrated.length > 1 ? "are" : "is"} fast fuel, but replacing one with fruit or oats keeps the carbs and raises the rating.`,
      gain: 5 * Math.min(2, concentrated.length),
    });
  }
  if (refined.length) {
    suggestions.push({
      id: "refined",
      title: "Choose a wholegrain version",
      detail: `Switching ${refined[0].food.name} for a wholegrain equivalent adds fiber and micronutrients at the same carb count.`,
      gain: 4,
    });
  }
  if (proteinShare < 0.12) {
    suggestions.push({
      id: "protein",
      title: "Add a modest protein source",
      detail: "Protein is a small share of this meal. Yoghurt, eggs or a scoop of whey rounds it out — keep the portion small if you train soon.",
      gain: 4,
    });
  }
  if (macros.fat > 30) {
    suggestions.push({
      id: "fat",
      title: "Trim the highest-fat item",
      detail: `${Math.round(macros.fat)} g of fat is on the heavy side. Halving the fattiest ingredient improves both the rating and pre-workout comfort.`,
      gain: 5,
    });
  }
  if (wholeFoodCount < 2) {
    suggestions.push({
      id: "variety",
      title: "Build around one more whole food",
      detail: "Most of this meal comes from processed or estimated items. One more recognisable whole food widens the nutrient base.",
      gain: 5,
    });
  }

  return {
    score,
    note,
    suggestions: suggestions.sort((a, b) => b.gain - a.gain).slice(0, 3),
  };
}
