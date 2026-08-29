import type { FuelTarget, MealFix, MealIngredient, MealMacros, MealScore, WorkoutDraft } from "../types/fuel";
import { FUEL_FOODS } from "../data/fuelFoods";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const statusFor = (ratio: number): "excellent" | "good" | "adjust" => ratio >= 0.88 ? "excellent" : ratio >= 0.68 ? "good" : "adjust";

export function scoreMeal(macros: MealMacros, target: FuelTarget, workout: WorkoutDraft): MealScore {
  const carbError = Math.abs(macros.carbs - target.carbTarget) / Math.max(1, target.carbTarget);
  const carbRatio = clamp(1 - carbError, 0, 1);
  const carbScore = Math.round(carbRatio * 40);

  const distributionError = (
    Math.abs(macros.fastCarbs - target.fastCarbs) +
    Math.abs(macros.mediumCarbs - target.mediumCarbs) +
    Math.abs(macros.slowCarbs - target.slowCarbs)
  ) / Math.max(1, target.carbTarget * 2);
  const distributionRatio = clamp(1 - distributionError, 0, 1);
  const distributionScore = Math.round(distributionRatio * 25);

  const time = workout.startsInMinutes;
  const fatLimit = time <= 30 ? 5 : time <= 60 ? 8 : time <= 120 ? 15 : 24;
  const fiberLimit = time <= 30 ? 3 : time <= 60 ? 5 : time <= 120 ? 9 : 15;
  const fatPenalty = clamp((macros.fat - fatLimit) / Math.max(1, fatLimit), 0, 1);
  const fiberPenalty = clamp((macros.fiber - fiberLimit) / Math.max(1, fiberLimit), 0, 1);
  const comfortRatio = clamp(1 - (fatPenalty * 0.55 + fiberPenalty * 0.45), 0, 1);
  const comfortScore = Math.round(comfortRatio * 20);

  const timingRatio = clamp(distributionRatio * 0.72 + comfortRatio * 0.28, 0, 1);
  const timingScore = Math.round(timingRatio * 15);
  const total = clamp(carbScore + distributionScore + comfortScore + timingScore, 0, 100);

  const carbDetail = macros.carbs < target.carbRange[0]
    ? `${Math.round(macros.carbs)} g logged. Add about ${Math.max(1, Math.round(target.carbTarget - macros.carbs))} g to reach the working target.`
    : macros.carbs > target.carbRange[1]
      ? `${Math.round(macros.carbs)} g logged, above the ${target.carbRange[0]}–${target.carbRange[1]} g range.`
      : `${Math.round(macros.carbs)} g lands inside your ${target.carbRange[0]}–${target.carbRange[1]} g range.`;

  const distributionDetail = `Meal: ${Math.round(macros.fastCarbs)} g fast, ${Math.round(macros.mediumCarbs)} g medium, ${Math.round(macros.slowCarbs)} g slow. Target: ${target.fastCarbs}/${target.mediumCarbs}/${target.slowCarbs} g.`;
  const comfortDetail = macros.fat > fatLimit || macros.fiber > fiberLimit
    ? `${Math.round(macros.fat)} g fat and ${Math.round(macros.fiber)} g fiber may feel heavy with ${time} minutes remaining.`
    : `${Math.round(macros.fat)} g fat and ${Math.round(macros.fiber)} g fiber are reasonable for this window.`;

  const components = [
    { id: "carbs" as const, label: "Carbohydrate amount", score: carbScore, maxScore: 40, status: statusFor(carbRatio), detail: carbDetail },
    { id: "distribution" as const, label: "Carb composition", score: distributionScore, maxScore: 25, status: statusFor(distributionRatio), detail: distributionDetail },
    { id: "timing" as const, label: "Timing fit", score: timingScore, maxScore: 15, status: statusFor(timingRatio), detail: `${target.timingLabel}. The carb mix and digestion burden are evaluated for this window.` },
    { id: "comfort" as const, label: "Likely comfort", score: comfortScore, maxScore: 20, status: statusFor(comfortRatio), detail: comfortDetail },
  ];

  return {
    total,
    headline: total >= 90 ? "Dialed in" : total >= 78 ? "Strong fit" : total >= 60 ? "Close, with room to improve" : "Needs a few adjustments",
    summary: total >= 85
      ? `This meal fits your ${workout.startsInMinutes}-minute fueling window well.`
      : "A small change can bring this meal closer to your workout target.",
    components,
  };
}

export function suggestMealFixes(_ingredients: MealIngredient[], macros: MealMacros, target: FuelTarget, _workout: WorkoutDraft): MealFix[] {
  const fixes: MealFix[] = [];
  const carbGap = target.carbTarget - macros.carbs;
  if (carbGap > 5) {
    const neededSpeed = macros.fastCarbs < target.fastCarbs ? "fast" : macros.mediumCarbs < target.mediumCarbs ? "medium" : "slow";
    const candidate = FUEL_FOODS.find((item) => item.carbSpeed === neededSpeed && item.per100g.carbs >= 20 && item.category !== "fat");
    if (candidate) {
      const grams = Math.max(5, Math.round((Math.min(carbGap, 35) / candidate.per100g.carbs) * 100));
      fixes.push({ id: `add-${candidate.id}`, action: "add", ingredientName: candidate.name, grams, detail: `Adds about ${Math.round(candidate.per100g.carbs * grams / 100)} g ${neededSpeed} carbs.` });
    }
  }

  return fixes.slice(0, 2);
}

export function futureMealNotes(macros: MealMacros, workout: WorkoutDraft) {
  const notes: string[] = [];
  const fatLimit = workout.startsInMinutes <= 30 ? 5 : workout.startsInMinutes <= 60 ? 8 : workout.startsInMinutes <= 120 ? 15 : 24;
  const fiberLimit = workout.startsInMinutes <= 30 ? 3 : workout.startsInMinutes <= 60 ? 5 : workout.startsInMinutes <= 120 ? 9 : 15;
  if (macros.fat > fatLimit) notes.push(`This meal is a little high in fat for ${workout.startsInMinutes} minutes before training. Next time, use less of the highest-fat ingredient or eat it earlier.`);
  if (macros.fiber > fiberLimit) notes.push(`Fiber is above the usual comfort range for this timing. Next time, choose a lower-fiber carb source or give the meal more time.`);
  if (macros.protein > 35 && workout.startsInMinutes < 90) notes.push("This is protein-heavy for a close pre-workout window. Next time, keep the protein portion smaller and put more room toward carbohydrate.");
  if (macros.calories > 750 && workout.startsInMinutes < 120) notes.push("The total meal volume may feel heavy this close to training. Next time, eat earlier or use a more compact carbohydrate source.");
  return notes.slice(0, 3);
}
