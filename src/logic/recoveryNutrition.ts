import { foodById } from "../data/fuelFoods";
import { calculateMealMacros } from "./nutritionEngine";
import type { MealIngredient, WorkoutDraft } from "../types/fuel";
import type { NutritionProfile } from "../types/nutritionProfile";
import type {
  RecoveryMealRecommendation,
  RecoveryMealTemplate,
  RecoveryTarget,
  RecoveryWindow,
} from "../types/recovery";

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const round5 = (value: number) => Math.round(value / 5) * 5;

const strengthActivities = new Set([
  "strength", "strength_training", "bodybuilding", "powerlifting", "olympic_weightlifting", "calisthenics",
]);

export function calculateRecoveryTarget(workout: WorkoutDraft, window: RecoveryWindow): RecoveryTarget {
  const weight = clamp(workout.bodyWeightKg || 70, 40, 180);
  const strengthFocused = strengthActivities.has(workout.activityType);
  const highDemand = workout.durationMinutes >= 90 || (workout.intensity === "hard" && workout.durationMinutes >= 60);
  const light = workout.durationMinutes < 45 && workout.intensity === "easy";

  let category: RecoveryTarget["category"] = light
    ? "post_workout_light"
    : highDemand
      ? "post_workout_high_demand"
      : "post_workout_standard";
  let carbsPerKg = light ? 0.4 : highDemand ? 0.9 : strengthFocused ? 0.55 : 0.65;

  if (window === "same_day") carbsPerKg = Math.max(carbsPerKg, strengthFocused ? 0.7 : 0.9);
  if (window === "rapid") {
    category = "post_workout_rapid_recovery";
    carbsPerKg = strengthFocused ? 0.8 : 1.1;
  }

  const carbLow = window === "rapid" ? 55 : light ? 25 : 35;
  const carbHigh = window === "rapid" ? 130 : highDemand ? 115 : 95;
  const carbs = round5(clamp(weight * carbsPerKg, carbLow, carbHigh));
  const proteinPerKg = strengthFocused ? 0.35 : 0.3;
  const protein = round5(clamp(weight * proteinPerKg, 20, 40));

  const timingHeadline = window === "rapid"
    ? "Start recovery within about 30–60 minutes"
    : window === "same_day"
      ? "Have this meal within about 1–2 hours"
      : "Have this when your next normal meal fits";

  const rationale = window === "rapid"
    ? "Your next demanding session is close, so carbohydrate replacement is the priority alongside a useful protein serving."
    : highDemand
      ? "This was a demanding session, so the meal leans higher in carbohydrate while keeping a complete protein serving."
      : light
        ? "A lighter session usually needs a normal balanced meal, not an oversized recovery feed."
        : "This target supports glycogen replacement and muscle repair without turning recovery into a rigid macro chase.";

  return {
    category,
    carbs,
    carbRange: [round5(carbs * 0.9), round5(carbs * 1.1)],
    protein,
    proteinRange: [Math.max(20, round5(protein * 0.85)), Math.min(45, round5(protein * 1.15))],
    window,
    timingHeadline,
    rationale,
    hydrationNote: "Rehydrate to thirst. After heavy sweating, include fluid and a familiar sodium source with the meal.",
  };
}

export function isRecoveryMealEligible(template: RecoveryMealTemplate, profile: NutritionProfile, target: RecoveryTarget) {
  if (!template.recoveryCategories.includes(target.category)) return false;
  const exclusions = new Set([...profile.sensitivities, ...profile.conditions]);
  if (template.allergens.includes("dairy") && (exclusions.has("dairy") || exclusions.has("lactose"))) return false;
  if (template.allergens.includes("gluten") && (exclusions.has("gluten") || exclusions.has("celiac"))) return false;
  if (template.allergens.includes("eggs") && exclusions.has("eggs")) return false;
  if (template.allergens.includes("soy") && exclusions.has("soy")) return false;
  if (template.allergens.includes("peanuts") && exclusions.has("peanuts")) return false;
  if (profile.dietaryPatterns.includes("vegan") && !template.dietaryTags.includes("vegan")) return false;
  if (profile.dietaryPatterns.includes("vegetarian") && !template.dietaryTags.includes("vegetarian")) return false;
  if (profile.dietaryPatterns.includes("halal") && !template.dietaryTags.includes("halal")) return false;
  return true;
}

function snap(value: number, increment = 10) {
  return Math.max(increment, Math.round(value / increment) * increment);
}

function adjustAnchor(
  items: MealIngredient[],
  template: RecoveryMealTemplate,
  foodId: string,
  macro: "carbs" | "protein",
  targetValue: number,
) {
  const blueprint = template.ingredients.find((item) => item.foodId === foodId);
  const index = items.findIndex((item) => item.food.id === foodId);
  if (!blueprint || index < 0 || blueprint.scalable === false) return items;
  const perGram = items[index].food.per100g[macro] / 100;
  if (perGram <= 0) return items;
  const currentMacro = calculateMealMacros(items)[macro];
  const desiredGrams = items[index].grams + (targetValue - currentMacro) / perGram;
  const grams = snap(
    clamp(desiredGrams, blueprint.minGrams || blueprint.grams * 0.6, blueprint.maxGrams || blueprint.grams * 2),
    blueprint.incrementGrams || 10,
  );
  return items.map((item, itemIndex) => itemIndex === index ? { ...item, grams } : item);
}

export function scaleRecoveryMeal(template: RecoveryMealTemplate, target: RecoveryTarget) {
  const original = template.ingredients.flatMap((item, index) => {
    const food = foodById(item.foodId);
    return food ? [{ id: `${template.id}-${index}`, food, grams: item.grams }] : [];
  });
  if (original.length !== template.ingredients.length) return { ingredients: [], adjustmentSummary: [] };

  let ingredients = adjustAnchor(original, template, template.primaryCarbFoodId, "carbs", target.carbs);
  ingredients = adjustAnchor(ingredients, template, template.primaryProteinFoodId, "protein", target.protein);
  // Plant protein anchors contribute meaningful carbohydrate. One final carb
  // pass keeps the plate close without introducing another unrelated food.
  ingredients = adjustAnchor(ingredients, template, template.primaryCarbFoodId, "carbs", target.carbs);

  const adjustmentSummary = ingredients.flatMap((item, index) => {
    const before = original[index];
    if (!before || Math.abs(before.grams - item.grams) < 1) return [];
    const direction = item.grams > before.grams ? "Increased" : "Reduced";
    return [`${direction} ${item.food.name.toLowerCase()} to ${formatRecoveryPortion(item)}`];
  });
  return { ingredients, adjustmentSummary };
}

function fitScore(actual: number, target: number, points: number) {
  if (!target) return points;
  const error = Math.abs(actual - target) / target;
  return Math.round(points * clamp(1 - error * 1.75, 0, 1));
}

export function scoreRecoveryMeal(template: RecoveryMealTemplate, ingredients: MealIngredient[], target: RecoveryTarget) {
  const macros = calculateMealMacros(ingredients);
  const carbFit = fitScore(macros.carbs, target.carbs, 40);
  const proteinFit = fitScore(macros.protein, target.protein, 30);
  const recoveryFit = template.recoveryCategories.includes(target.category) ? 20 : 8;
  const mealBalance = target.window === "rapid"
    ? Math.round(clamp(10 - Math.max(0, macros.fat - 20) * 0.4, 2, 10))
    : 10;
  const total = clamp(carbFit + proteinFit + recoveryFit + mealBalance, 0, 100);
  return {
    macros,
    score: {
      total,
      carbFit,
      proteinFit,
      recoveryFit,
      headline: total >= 90 ? "Excellent recovery fit" : total >= 80 ? "Strong recovery fit" : "Useful recovery option",
    },
  };
}

export function rankRecoveryMeals(
  templates: RecoveryMealTemplate[],
  input: { workout: WorkoutDraft; window: RecoveryWindow; profile: NutritionProfile },
): RecoveryMealRecommendation[] {
  const target = calculateRecoveryTarget(input.workout, input.window);
  return templates
    .filter((template) => isRecoveryMealEligible(template, input.profile, target))
    .flatMap((template) => {
      const scaled = scaleRecoveryMeal(template, target);
      if (!scaled.ingredients.length) return [];
      const result = scoreRecoveryMeal(template, scaled.ingredients, target);
      const activityBonus = template.activityTypes.includes(input.workout.activityType) ? 8 : 0;
      return [{
        template,
        target,
        ingredients: scaled.ingredients,
        macros: result.macros,
        score: result.score,
        rank: result.score.total + activityBonus,
        adjustmentSummary: scaled.adjustmentSummary,
      }];
    })
    // Keep a safe dietary option visible even when plant proteins contribute
    // enough carbohydrate that the two macro targets cannot both be hit
    // perfectly through portion changes alone.
    .filter((item) => item.score.total >= 70)
    .sort((a, b) => b.rank - a.rank);
}

const fraction = (value: number) => {
  const quarters = Math.round(value * 4) / 4;
  const whole = Math.floor(quarters);
  const part = quarters - whole;
  const suffix = part === 0.25 ? "¼" : part === 0.5 ? "½" : part === 0.75 ? "¾" : "";
  return `${whole || ""}${suffix || (whole ? "" : "0")}`;
};

export function formatRecoveryPortion(item: MealIngredient) {
  const id = item.food.id;
  if (["chicken", "chicken-thigh", "lean-ground-beef", "sirloin-steak", "turkey-breast", "salmon", "firm-tofu"].includes(id)) {
    return `${(item.grams / 28.35).toFixed(item.grams % 28 === 0 ? 0 : 1)} oz`;
  }
  if (id === "whole-eggs") return `${Math.max(1, Math.round(item.grams / 50))} egg${item.grams >= 100 ? "s" : ""}`;
  if (["white-rice", "jasmine-rice"].includes(id)) return `${fraction(item.grams / 160)} cups`;
  if (id === "brown-rice") return `${fraction(item.grams / 195)} cups`;
  if (id === "quinoa") return `${fraction(item.grams / 185)} cups`;
  if (id === "white-pasta") return `${fraction(item.grams / 140)} cups`;
  if (id === "wholegrain-bread") return `${Math.max(1, Math.round(item.grams / 40))} slices`;
  if (id === "corn-tortillas") return `${Math.max(1, Math.round(item.grams / 26))} tortillas`;
  if (id === "greek-yogurt" || id === "cottage-cheese") return `${Math.round(item.grams)} g`;
  return `${Math.round(item.grams)} g`;
}
