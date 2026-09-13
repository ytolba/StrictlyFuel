import type { CarbSpeed, FuelFood, MealIngredient, MealMacros } from "../types/fuel";

const round = (value: number, places = 1) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const nonnegative = (value?: number) => Math.max(0, Number(value) || 0);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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

export type CarbSpeedClassification = {
  tier: CarbSpeed;
  confidence: number;
  reason: string;
};

type CarbAvailability = {
  fast: number;
  medium: number;
  slow: number;
  unknown: number;
  available: number;
  confidence: number;
};

const TIER_PROFILE: Record<Exclude<CarbSpeed, "unknown">, [number, number, number]> = {
  // A tier is a center of gravity, not a claim that every gram behaves alike.
  fast: [0.82, 0.18, 0],
  medium: [0.14, 0.72, 0.14],
  slow: [0, 0.24, 0.76],
};

/**
 * Practical food-level classification for workout fueling. This is not a
 * glycemic-index claim. Strong structure/name evidence is considered before
 * nutrient thresholds, and incomplete records fail closed as `unknown`.
 */
export function classifyCarbSpeed(food: Pick<FuelFood, "per100g"> & Partial<Pick<FuelFood, "name" | "category" | "ingredientsText">>): CarbSpeedClassification {
  const carbs = nonnegative(food.per100g.carbs);
  const fiber = Math.min(carbs, nonnegative(food.per100g.fiber));
  const fat = nonnegative(food.per100g.fat);
  const protein = nonnegative(food.per100g.protein);
  const sugar = Math.min(carbs, nonnegative(food.per100g.sugar));
  const text = `${food.name || ""} ${food.category || ""} ${food.ingredientsText || ""}`.toLowerCase();
  const name = String(food.name || "").toLowerCase();
  const sugarAlcohols = Math.min(carbs, nonnegative(food.per100g.sugarAlcohols));

  if (carbs < 1) return { tier: "unknown", confidence: 100, reason: "This food has no meaningful carbohydrate to classify." };

  if (sugarAlcohols / Math.max(1, carbs) >= 0.3) {
    return { tier: "unknown", confidence: 92, reason: "A large share of carbohydrate is sugar alcohol, which is not reliable workout fuel and may affect gut comfort." };
  }

  // Candy, gels, syrups and caloric sweet drinks are concentrated, rapidly
  // available carbohydrates. This rule deliberately runs before fat/fiber
  // thresholds so a noisy label cannot turn candy into a slow carb.
  if (/\b(candy|gumm(?:y|ies)|sour belts?|candy belts?|fruit chews?|licorice|jelly beans?|hard candy|marshmallows?|energy gels?|sports drinks?|honey|maple syrup|corn syrup|glucose syrup|dextrose|maltodextrin|juice|soda|soft drink|jam|jelly)\b/.test(name)) {
    if (/\b(chocolate|cookie|biscuit|cake|pastry|donut|ice cream)\b/.test(name) || fat >= 12) {
      return { tier: "medium", confidence: 86, reason: "Concentrated sugar is present, but substantial fat or a mixed dessert structure can slow availability." };
    }
    return { tier: "fast", confidence: 95, reason: "This is a concentrated sugar or sports-fuel source with little intact food structure." };
  }

  if (/\b(chocolate|cookie|biscuit|cake|pastry|donut|ice cream)\b/.test(name)) {
    return { tier: "medium", confidence: 84, reason: "Sugar is combined with fat, protein, or a mixed baked-food structure." };
  }
  if (/\b(oats?|oatmeal|whole grain|whole wheat|brown rice|quinoa|barley|bran|beans?|lentils?|legumes?|chickpeas?|sweet potato|nuts?|nut butter|peanut butter)\b/.test(name)) {
    return { tier: "slow", confidence: 88, reason: "Intact structure, fiber, or fat generally makes this a slower practical carb source." };
  }
  if (/\b(white rice|white bread|bagels?|rice cakes?|pretzels?|cream of rice|corn flakes?|rice cereal|pasta|noodles?)\b/.test(name)) {
    return { tier: "medium", confidence: 86, reason: "This is a refined starch with moderate practical availability in a normal serving." };
  }
  if (/\b(banana|apples?|oranges?|berries|grapes?|mango|pineapple|fruit)\b/.test(name)) {
    return { tier: "medium", confidence: 82, reason: "Whole-fruit structure makes its carbohydrate availability more gradual than juice or candy." };
  }

  const rapidIngredient = /\b(sugar|sucrose|glucose|dextrose|maltodextrin|corn syrup|rice syrup|tapioca syrup|honey|maple syrup|fruit juice concentrate)\b/.test(text);
  const substantialFatIngredient = /\b(oil|butter|cream|peanut|almond|cashew|coconut|cocoa butter)\b/.test(text);
  if (rapidIngredient && fiber < 3) {
    return substantialFatIngredient || fat >= 10 || protein >= 10
      ? { tier: "medium", confidence: 80, reason: "Rapid carbohydrate ingredients are mixed with enough fat or protein to moderate whole-food availability." }
      : { tier: "fast", confidence: 86, reason: "The ingredient list is led by rapidly available carbohydrate and the macro profile is low in fiber and fat." };
  }

  if (sugar > 0) {
    const digestible = Math.max(1, carbs - fiber - nonnegative(food.per100g.sugarAlcohols) - nonnegative(food.per100g.allulose));
    const sugarShare = sugar / digestible;
    if (sugarShare >= 0.65 && fiber < 3) {
      return fat >= 10 || protein >= 10
        ? { tier: "medium", confidence: 82, reason: "Most digestible carbohydrate is sugar, but fat or protein may slow the mixed food." }
        : { tier: "fast", confidence: 90, reason: "Most digestible carbohydrate is sugar and the food is low in fiber and fat." };
    }
    if (fiber >= 6) return { tier: "slow", confidence: 78, reason: "The printed nutrient profile is high in fiber without dominant sugar." };
    if (fat >= 10 || protein >= 12 || fiber >= 3) return { tier: "medium", confidence: 74, reason: "The printed nutrient profile suggests a mixed digestion burden." };
    return { tier: "medium", confidence: 68, reason: "The printed sugar and macro profile supports a middle-speed estimate." };
  }

  return { tier: "unknown", confidence: 0, reason: "Sugar, food structure, or a verified tier is missing, so StrictlyFuel will not guess." };
}

const sourceConfidenceCap: Record<FuelFood["source"], number> = {
  strictly: 95,
  usda: 92,
  label: 92,
  open_food_facts: 82,
  ai_estimate: 60,
};

/** Resolve a stored label against stronger nutrient/name evidence. */
function resolvedCarbClassification(food: FuelFood): CarbSpeedClassification {
  const inferred = classifyCarbSpeed(food);
  const fallback = food.isVerified ? 90 : food.dataQualityScore ?? (food.source === "strictly" ? 78 : 65);
  const storedConfidence = Math.min(sourceConfidenceCap[food.source], food.carbSpeedConfidence ?? fallback);
  if (food.carbSpeed === "unknown") return inferred.confidence >= 78 && inferred.tier !== "unknown" ? inferred : { ...inferred, tier: "unknown", confidence: 0 };
  if (inferred.tier !== "unknown" && inferred.confidence >= 80 && inferred.confidence > storedConfidence + 4) return inferred;
  if (storedConfidence < 75 && inferred.tier === "unknown") return { tier: "unknown", confidence: 0, reason: inferred.reason };
  return { tier: food.carbSpeed, confidence: storedConfidence, reason: food.carbSpeedReason || inferred.reason };
}

function carbAvailabilityForIngredient(ingredient: MealIngredient): CarbAvailability {
  const factor = Math.max(0, ingredient.grams) / 100;
  const totalCarbs = nonnegative(ingredient.food.per100g.carbs) * factor;
  // Polyols and allulose remain visible in label carbs but are not counted as
  // dependable workout carbohydrate. Fiber remains included to stay aligned
  // with common sports-nutrition carbohydrate targets and mixed data sources.
  const nonFuelCarbs = (nonnegative(ingredient.food.per100g.sugarAlcohols) + nonnegative(ingredient.food.per100g.allulose)) * factor;
  const available = Math.max(0, totalCarbs - Math.min(totalCarbs, nonFuelCarbs));
  const classification = resolvedCarbClassification(ingredient.food);
  if (!available || classification.tier === "unknown") {
    return { fast: 0, medium: 0, slow: 0, unknown: available, available, confidence: 0 };
  }

  // Evidence below 75% is shown partly as unclassified rather than converted
  // into false precision. Verified records remain fully classified.
  const reliability = clamp((classification.confidence - 50) / 25, 0, 1);
  const classified = available * reliability;
  const [fast, medium, slow] = TIER_PROFILE[classification.tier];
  return {
    fast: classified * fast,
    medium: classified * medium,
    slow: classified * slow,
    unknown: available - classified,
    available,
    confidence: classification.confidence,
  };
}

/**
 * Fat, fiber and protein elsewhere in a meal can moderate the availability of
 * its carbohydrate. This small, capped shift models the whole plate without
 * pretending that a photo or label can predict an individual's glucose curve.
 */
function applyWholeMealMatrix(macros: MealMacros): MealMacros {
  const classified = macros.fastCarbs + macros.mediumCarbs + macros.slowCarbs;
  if (classified <= 0) return macros;
  const carbBase = Math.max(15, macros.availableCarbs ?? macros.carbs);
  const fiberSignal = clamp((macros.fiber / carbBase - 0.04) / 0.16, 0, 1);
  const fatSignal = clamp((macros.fat / carbBase - 0.08) / 0.35, 0, 1);
  const proteinSignal = clamp((macros.protein / carbBase - 0.18) / 0.45, 0, 1);
  const delay = clamp(fiberSignal * 0.2 + fatSignal * 0.2 + proteinSignal * 0.08, 0, 0.42);
  const fastToMedium = macros.fastCarbs * delay * 0.78;
  const mediumToSlow = macros.mediumCarbs * delay * 0.52;
  return {
    ...macros,
    fastCarbs: round(macros.fastCarbs - fastToMedium),
    mediumCarbs: round(macros.mediumCarbs + fastToMedium - mediumToSlow),
    slowCarbs: round(macros.slowCarbs + mediumToSlow),
  };
}

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
  const availability = carbAvailabilityForIngredient(ingredient);
  const calorieValidation = validateMacroCalories(ingredient.food);
  return {
    calories: round(calorieValidation.selectedCalories * factor),
    carbs: round(carbs),
    protein: round(ingredient.food.per100g.protein * factor),
    fat: round(ingredient.food.per100g.fat * factor),
    fiber: round(ingredient.food.per100g.fiber * factor),
    fastCarbs: round(availability.fast),
    mediumCarbs: round(availability.medium),
    slowCarbs: round(availability.slow),
    unclassifiedCarbs: round(availability.unknown),
    availableCarbs: round(availability.available),
    carbSpeedConfidence: availability.available > 0 ? round((availability.available - availability.unknown) / availability.available * 100) : 100,
  };
}

export function calculateMealMacros(ingredients: MealIngredient[]): MealMacros {
  const total = ingredients.reduce((result, ingredient) => {
    const item = nutritionForIngredient(ingredient);
    result.calories += item.calories;
    result.carbs += item.carbs;
    result.protein += item.protein;
    result.fat += item.fat;
    result.fiber += item.fiber;
    result.fastCarbs += item.fastCarbs;
    result.mediumCarbs += item.mediumCarbs;
    result.slowCarbs += item.slowCarbs;
    result.unclassifiedCarbs += item.unclassifiedCarbs;
    result.availableCarbs = (result.availableCarbs || 0) + (item.availableCarbs || 0);
    return result;
  }, { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0, fastCarbs: 0, mediumCarbs: 0, slowCarbs: 0, unclassifiedCarbs: 0, availableCarbs: 0 } as MealMacros);
  total.carbSpeedConfidence = (total.availableCarbs || 0) > 0
    ? round((total.fastCarbs + total.mediumCarbs + total.slowCarbs) / (total.availableCarbs || 1) * 100)
    : 100;
  total.calories = round(total.calories);
  total.carbs = round(total.carbs);
  total.protein = round(total.protein);
  total.fat = round(total.fat);
  total.fiber = round(total.fiber);
  total.fastCarbs = round(total.fastCarbs);
  total.mediumCarbs = round(total.mediumCarbs);
  total.slowCarbs = round(total.slowCarbs);
  total.unclassifiedCarbs = round(total.unclassifiedCarbs);
  total.availableCarbs = round(total.availableCarbs || 0);
  total.carbSpeedConfidence = round(total.carbSpeedConfidence || 0);
  return applyWholeMealMatrix(total);
}

export function validateMealNutrition(ingredients: MealIngredient[]) {
  return ingredients.map((ingredient) => ({ ingredientId: ingredient.id, foodName: ingredient.food.name, ...validateMacroCalories(ingredient.food) })).filter((result) => result.status === "suspicious");
}

export function inferCarbSpeed(food: Pick<FuelFood, "per100g"> & Partial<Pick<FuelFood, "name" | "category" | "ingredientsText">>): CarbSpeed {
  return classifyCarbSpeed(food).tier;
}
