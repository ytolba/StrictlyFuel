import type { FuelTarget, MealFix, MealIngredient, MealMacros, MealScore, WorkoutDraft } from "../types/fuel";
import { rankMealAdjustments } from "./mealImprovement";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const statusFor = (ratio: number): "excellent" | "good" | "adjust" => ratio >= 0.88 ? "excellent" : ratio >= 0.68 ? "good" : "adjust";
const CARB_MISS_EXPONENT = 3.6;

type LimitAnchor = { minutes: number; fat: number; fiber: number; protein: number; calories: number };
const digestionLimits = (minutes: number) => {
  const anchors: LimitAnchor[] = [
    { minutes: 0, fat: 4, fiber: 2, protein: 15, calories: 250 },
    { minutes: 30, fat: 6, fiber: 3, protein: 20, calories: 350 },
    { minutes: 60, fat: 10, fiber: 5, protein: 28, calories: 500 },
    { minutes: 90, fat: 15, fiber: 8, protein: 38, calories: 650 },
    { minutes: 120, fat: 22, fiber: 11, protein: 48, calories: 800 },
    { minutes: 180, fat: 35, fiber: 16, protein: 60, calories: 1100 },
    { minutes: 240, fat: 45, fiber: 22, protein: 70, calories: 1400 },
  ];
  const bounded = clamp(minutes, 0, 240);
  let left = anchors[0];
  let right = anchors[anchors.length - 1];
  for (let index = 1; index < anchors.length; index += 1) {
    if (bounded <= anchors[index].minutes) {
      left = anchors[index - 1];
      right = anchors[index];
      break;
    }
  }
  const progress = right.minutes === left.minutes ? 0 : (bounded - left.minutes) / (right.minutes - left.minutes);
  const value = (key: "fat" | "fiber" | "protein" | "calories") => left[key] + (right[key] - left[key]) * progress;
  return { fat: value("fat"), fiber: value("fiber"), protein: value("protein"), calories: value("calories") };
};

export function scoreMeal(macros: MealMacros, target: FuelTarget, workout: WorkoutDraft): MealScore {
  const availableCarbs = macros.availableCarbs ?? macros.carbs;
  const carbRangeLow = Math.max(1, target.carbRange[0]);
  const carbRangeHigh = Math.max(carbRangeLow, target.carbRange[1]);
  const carbAmountFit = availableCarbs < carbRangeLow
    ? Math.pow(clamp(availableCarbs / carbRangeLow, 0, 1), CARB_MISS_EXPONENT)
    : availableCarbs > carbRangeHigh
      ? Math.pow(clamp(carbRangeHigh / Math.max(1, availableCarbs), 0, 1), CARB_MISS_EXPONENT)
      : 1;
  const carbScore = Math.round(carbAmountFit * 55);

  const classifiedCarbs = macros.fastCarbs + macros.mediumCarbs + macros.slowCarbs;
  const classifiedRatio = clamp(classifiedCarbs / Math.max(1, availableCarbs), 0, 1);
  const actualFast = classifiedCarbs > 0 ? macros.fastCarbs / classifiedCarbs : 0;
  const actualMedium = classifiedCarbs > 0 ? macros.mediumCarbs / classifiedCarbs : 0;
  const targetTotal = Math.max(1, target.fastCarbs + target.mediumCarbs + target.slowCarbs);
  const targetFast = target.fastCarbs / targetTotal;
  const targetMedium = target.mediumCarbs / targetTotal;
  // Ordered earth-mover distance: fast-to-slow errors cost more than adjacent
  // fast-to-medium or medium-to-slow errors.
  const orderedDistance = (
    Math.abs(actualFast - targetFast) +
    Math.abs(actualFast + actualMedium - targetFast - targetMedium)
  ) / 2;
  const knownMixFit = Math.pow(clamp(1 - orderedDistance, 0, 1), 1.35);
  // Missing evidence is neutral rather than secretly treated as medium, but it
  // lowers confidence and cannot earn full composition credit.
  const rawDistributionRatio = knownMixFit * classifiedRatio + 0.5 * (1 - classifiedRatio);
  // A perfect split of a tiny carb serving is not a strong fueling result.
  // This gate preserves useful composition feedback while making
  // the total score answer the primary question: did this meal fuel the target?
  const carbSupportGate = Math.sqrt(carbAmountFit);
  const distributionRatio = rawDistributionRatio * carbSupportGate;
  const distributionScore = Math.round(distributionRatio * 20);

  const time = workout.startsInMinutes;
  const limits = digestionLimits(time);
  const amountOver = (actual: number, limit: number) => clamp((actual - limit) / Math.max(1, limit), 0, 1);
  const fatPenalty = amountOver(macros.fat, limits.fat);
  const fiberPenalty = amountOver(macros.fiber, limits.fiber);
  const proteinPenalty = amountOver(macros.protein, limits.protein);
  const volumePenalty = amountOver(macros.calories, limits.calories);
  const comfortRatio = clamp(1 - (fatPenalty * 0.34 + fiberPenalty * 0.34 + volumePenalty * 0.2 + proteinPenalty * 0.12), 0, 1);
  const comfortScore = Math.round(comfortRatio * 10);

  const rawTimingRatio = clamp(rawDistributionRatio * 0.58 + comfortRatio * 0.42, 0, 1);
  const timingRatio = rawTimingRatio * carbSupportGate;
  const timingScore = Math.round(timingRatio * 15);
  const total = clamp(carbScore + distributionScore + comfortScore + timingScore, 0, 100);

  const carbDetail = availableCarbs < target.carbRange[0]
    ? `${Math.round(availableCarbs)} g available carbohydrate. Add about ${Math.max(1, Math.round(target.carbTarget - availableCarbs))} g to reach the working target.`
    : availableCarbs > target.carbRange[1]
      ? `${Math.round(availableCarbs)} g available carbohydrate, above the ${target.carbRange[0]}–${target.carbRange[1]} g range.`
      : `${Math.round(availableCarbs)} g available carbohydrate lands inside your ${target.carbRange[0]}–${target.carbRange[1]} g range.`;

  const distributionDetail = macros.unclassifiedCarbs > 0
    ? `Estimated availability: ${Math.round(macros.fastCarbs)} g fast, ${Math.round(macros.mediumCarbs)} g medium, ${Math.round(macros.slowCarbs)} g slow, and ${Math.round(macros.unclassifiedCarbs)} g unclassified. Confirm unclear foods before relying on the split.`
    : `Estimated availability: ${Math.round(macros.fastCarbs)} g fast, ${Math.round(macros.mediumCarbs)} g medium, ${Math.round(macros.slowCarbs)} g slow. Target: ${target.fastCarbs}/${target.mediumCarbs}/${target.slowCarbs} g.`;
  const comfortDetail = fatPenalty > 0 || fiberPenalty > 0 || proteinPenalty > 0 || volumePenalty > 0
    ? `The meal's fat, fiber, protein, or overall size may be heavy with ${time} minutes remaining.`
    : `The meal's fat, fiber, protein, and size are reasonable for this window.`;

  const components = [
    { id: "carbs" as const, label: "Carbohydrate amount", score: carbScore, maxScore: 55, status: statusFor(carbAmountFit), detail: carbDetail },
    { id: "distribution" as const, label: "Carb availability", score: distributionScore, maxScore: 20, status: statusFor(distributionRatio), detail: distributionDetail },
    { id: "timing" as const, label: "Timing fit", score: timingScore, maxScore: 15, status: statusFor(timingRatio), detail: `${target.timingLabel}. The whole-meal availability estimate and digestion burden are evaluated for this window.` },
    { id: "comfort" as const, label: "Likely comfort", score: comfortScore, maxScore: 10, status: statusFor(comfortRatio), detail: comfortDetail },
  ];

  const shortfall = Math.max(0, Math.round(target.carbTarget - availableCarbs));
  const carbExcess = Math.max(0, Math.round(availableCarbs - target.carbTarget));
  const confidence = Math.round(clamp(macros.carbSpeedConfidence ?? classifiedRatio * 100, 0, 100));
  const provisional = confidence < 70 || classifiedRatio < 0.75;
  const summary = availableCarbs < carbRangeLow
    ? carbAmountFit < 0.5
      ? `This meal is about ${shortfall} g short. Fuel Score stays low when the carbohydrate amount is far from your workout target.`
      : `Add about ${shortfall} g of carbohydrate to bring this meal into your working range.`
    : availableCarbs > carbRangeHigh
      ? carbAmountFit < 0.5
        ? `This meal is about ${carbExcess} g over target. Fuel Score stays low when the carbohydrate load is far beyond this workout's needs.`
        : `Reduce roughly ${carbExcess} g of carbohydrate or save part of the meal for later.`
      : total >= 85
        ? provisional
          ? `The amount fits well. Confirm unclear foods before relying on the fast, medium, and slow estimate.`
          : `This meal fits your ${workout.startsInMinutes}-minute fueling window well.`
        : "A small change can bring this meal closer to your workout target.";

  return {
    total,
    headline: total >= 90
      ? "Dialed in"
      : total >= 78
        ? "Strong fit"
        : total >= 60
          ? "Close, with room to improve"
          : total >= 40
            ? "Major fuel mismatch"
            : "Far from your fuel target",
    summary,
    components,
    confidence,
    provisional,
  };
}

export function suggestMealFixes(ingredients: MealIngredient[], macros: MealMacros, target: FuelTarget, workout: WorkoutDraft): MealFix[] {
  return rankMealAdjustments(ingredients, macros, target, workout);
}

export function futureMealNotes(macros: MealMacros, workout: WorkoutDraft) {
  const notes: string[] = [];
  const limits = digestionLimits(workout.startsInMinutes);
  if (macros.fat > limits.fat) notes.push(`This meal is a little high in fat for ${workout.startsInMinutes} minutes before training. Next time, use less of the highest-fat ingredient or eat it earlier.`);
  if (macros.fiber > limits.fiber) notes.push(`Fiber is above the usual comfort range for this timing. Next time, choose a lower-fiber carb source or give the meal more time.`);
  if (macros.protein > limits.protein) notes.push("This is protein-heavy for the available window. Next time, keep the protein portion smaller and put more room toward carbohydrate.");
  if (macros.calories > limits.calories) notes.push("The total meal size may feel heavy for the available window. Next time, eat earlier or use a more compact carbohydrate source.");
  return notes.slice(0, 3);
}
