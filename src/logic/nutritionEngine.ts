import type { CarbSpeed, FuelFood, MealIngredient, MealMacros } from "../types/fuel";

const round = (value: number, places = 1) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

export function nutritionForIngredient(ingredient: MealIngredient): MealMacros {
  const factor = Math.max(0, ingredient.grams) / 100;
  const carbs = ingredient.food.per100g.carbs * factor;
  return {
    calories: round(ingredient.food.per100g.calories * factor),
    carbs: round(carbs),
    protein: round(ingredient.food.per100g.protein * factor),
    fat: round(ingredient.food.per100g.fat * factor),
    fiber: round(ingredient.food.per100g.fiber * factor),
    fastCarbs: ingredient.food.carbSpeed === "fast" ? round(carbs) : 0,
    mediumCarbs: ingredient.food.carbSpeed === "medium" ? round(carbs) : 0,
    slowCarbs: ingredient.food.carbSpeed === "slow" ? round(carbs) : 0,
  };
}

export function calculateMealMacros(ingredients: MealIngredient[]): MealMacros {
  const total = ingredients.reduce((result, ingredient) => {
    const item = nutritionForIngredient(ingredient);
    (Object.keys(result) as (keyof MealMacros)[]).forEach((key) => { result[key] += item[key]; });
    return result;
  }, { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0, fastCarbs: 0, mediumCarbs: 0, slowCarbs: 0 });

  (Object.keys(total) as (keyof MealMacros)[]).forEach((key) => { total[key] = round(total[key]); });
  return total;
}

export function inferCarbSpeed(food: Pick<FuelFood, "per100g">): CarbSpeed {
  const { carbs, fiber, fat, protein } = food.per100g;
  if (fiber >= 6 || fat >= 10) return "slow";
  if (fiber >= 3 || fat >= 4 || protein >= 8) return "medium";
  if (carbs >= 10) return "fast";
  return "medium";
}

