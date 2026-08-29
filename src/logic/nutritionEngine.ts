import type { CarbSpeed, FuelFood, MealIngredient, MealMacros } from "../types/fuel";

const round = (value: number, places = 1) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const nonnegative = (value?: number) => Math.max(0, Number(value) || 0);

const SUGAR_ALCOHOL_ENERGY: Record<NonNullable<FuelFood["per100g"]["sugarAlcoholType"]>, number | null> = {
  erythritol: 0,
  mannitol: 1.6,
  isomalt: 2,
  lactitol: 2,
  maltitol: 2.1,
  xylitol: 2.4,
  sorbitol: 2.6,
  hydrogenated_starch_hydrolysates: 3,
  unknown: null,
};

export type CalorieValidation = {
  status: "consistent" | "estimated" | "suspicious";
  reportedCalories: number;
  basicEstimate: number;
  adjustedEstimate: number;
  selectedCalories: number;
  toleranceCalories: number;
  reason: string;
};

/** Calculate metabolizable energy without changing the displayed Total Carbs. */
export function calculateEnergyFromNutrients(nutrients: FuelFood["per100g"]) {
  const protein = nonnegative(nutrients.protein);
  const fat = nonnegative(nutrients.fat);
  const totalCarbs = nonnegative(nutrients.carbs);
  const fiber = Math.min(totalCarbs, nonnegative(nutrients.fiber));
  const solubleFiber = Math.min(fiber, nonnegative(nutrients.solubleFiber));
  const insolubleFiber = Math.min(Math.max(0, fiber - solubleFiber), nonnegative(nutrients.insolubleFiber));
  const specifiedFiber = solubleFiber + insolubleFiber;
  const sugarAlcohols = Math.min(Math.max(0, totalCarbs - fiber), nonnegative(nutrients.sugarAlcohols));
  const allulose = Math.min(Math.max(0, totalCarbs - fiber - sugarAlcohols), nonnegative(nutrients.allulose));
  const alcohol = nonnegative(nutrients.alcohol);
  const sugarAlcoholFactor = SUGAR_ALCOHOL_ENERGY[nutrients.sugarAlcoholType || "unknown"];
  const basicEstimate = protein * 4 + totalCarbs * 4 + fat * 9 + alcohol * 7;
  const hasDetailedFiber = specifiedFiber > 0;
  const hasKnownSugarAlcohol = sugarAlcohols > 0 && sugarAlcoholFactor !== null;
  const hasSpecialCarbs = allulose > 0 || hasKnownSugarAlcohol || hasDetailedFiber;

  if (!hasSpecialCarbs) {
    return { basicEstimate: round(basicEstimate), adjustedEstimate: round(basicEstimate), hasSpecialCarbs: false };
  }

  const unclassifiedFiber = Math.max(0, fiber - specifiedFiber);
  const fiberCalories = solubleFiber * 2 + unclassifiedFiber * 2;
  const sugarAlcoholCalories = hasKnownSugarAlcohol ? sugarAlcohols * (sugarAlcoholFactor as number) : sugarAlcohols * 4;
  const digestibleCarbs = Math.max(0, totalCarbs - fiber - sugarAlcohols - allulose);
  const adjustedEstimate = protein * 4 + fat * 9 + digestibleCarbs * 4 + fiberCalories + sugarAlcoholCalories + allulose * 0.4 + alcohol * 7;
  return { basicEstimate: round(basicEstimate), adjustedEstimate: round(adjustedEstimate), hasSpecialCarbs: true };
}

/** Context-aware sanity check. Reliable source calories win when reasonably consistent. */
export function validateMacroCalories(food: Pick<FuelFood, "per100g" | "source" | "isVerified">): CalorieValidation {
  const reportedCalories = nonnegative(food.per100g.calories);
  const energy = calculateEnergyFromNutrients(food.per100g);
  const reference = energy.hasSpecialCarbs ? energy.adjustedEstimate : energy.basicEstimate;
  const fiber = nonnegative(food.per100g.fiber);
  const special = nonnegative(food.per100g.sugarAlcohols) + nonnegative(food.per100g.allulose);
  const toleranceRatio = special > 0 ? 0.3 : fiber >= 10 ? 0.25 : food.isVerified ? 0.2 : 0.22;
  const toleranceCalories = Math.max(35, reference * toleranceRatio);

  if (!reportedCalories) {
    return { status: "estimated", reportedCalories, basicEstimate: energy.basicEstimate, adjustedEstimate: energy.adjustedEstimate, selectedCalories: reference, toleranceCalories: round(toleranceCalories), reason: "Calories were calculated from the available nutrients." };
  }
  if (Math.abs(reportedCalories - reference) <= toleranceCalories) {
    return { status: "consistent", reportedCalories, basicEstimate: energy.basicEstimate, adjustedEstimate: energy.adjustedEstimate, selectedCalories: reportedCalories, toleranceCalories: round(toleranceCalories), reason: "Reported calories are consistent with the nutrient profile and normal rounding." };
  }
  return { status: "suspicious", reportedCalories, basicEstimate: energy.basicEstimate, adjustedEstimate: energy.adjustedEstimate, selectedCalories: reference, toleranceCalories: round(toleranceCalories), reason: "Reported calories conflict with the macros, so the nutrient-based estimate is used until the match is reviewed." };
}

export function nutritionForIngredient(ingredient: MealIngredient): MealMacros {
  const factor = Math.max(0, ingredient.grams) / 100;
  const carbs = ingredient.food.per100g.carbs * factor;
  const calorieValidation = validateMacroCalories(ingredient.food);
  return {
    calories: round(calorieValidation.selectedCalories * factor),
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

export function validateMealNutrition(ingredients: MealIngredient[]) {
  return ingredients.map((ingredient) => ({ ingredientId: ingredient.id, foodName: ingredient.food.name, ...validateMacroCalories(ingredient.food) })).filter((result) => result.status === "suspicious");
}

export function inferCarbSpeed(food: Pick<FuelFood, "per100g">): CarbSpeed {
  const { carbs, fiber, fat, protein } = food.per100g;
  if (fiber >= 6 || fat >= 10) return "slow";
  if (fiber >= 3 || fat >= 4 || protein >= 8) return "medium";
  if (carbs >= 10) return "fast";
  return "medium";
}
