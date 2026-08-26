import type { FuelTarget, MealIngredient } from "../types/fuel";
import { calculateMealMacros } from "./nutritionEngine";

export function scaleMealToTarget(ingredients: MealIngredient[], target: FuelTarget): MealIngredient[] {
  const currentCarbs = calculateMealMacros(ingredients).carbs;
  if (currentCarbs <= 0) return ingredients;
  const scale = Math.min(2.5, Math.max(0.5, target.carbTarget / currentCarbs));
  return ingredients.map((ingredient) => {
    const isCarbSource = ingredient.food.per100g.carbs >= 10;
    return {
      ...ingredient,
      id: `${ingredient.id}-copy-${Date.now()}`,
      grams: Math.max(1, Math.round(ingredient.grams * (isCarbSource ? scale : Math.min(1.2, Math.max(0.85, scale))))),
    };
  });
}

