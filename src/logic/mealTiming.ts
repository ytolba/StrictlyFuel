import type { MealMacros, WorkoutDraft } from "../types/fuel";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export function calculateMealTiming(macros: MealMacros, workout: WorkoutDraft) {
  const sizeMinutes = clamp(macros.calories / 8, 10, 55);
  const burdenMinutes = clamp(macros.fat * 1.5 + macros.fiber * 2.2 + Math.max(0, macros.protein - 15) * 0.5, 0, 70);
  const classified = macros.fastCarbs + macros.mediumCarbs + macros.slowCarbs;
  // Smooth ordered availability index: 0 = fast center, 0.5 = medium, 1 = slow.
  // This avoids a 15-minute jump when a meal crosses an arbitrary share cutoff.
  const availabilityIndex = classified > 0 ? (macros.mediumCarbs * 0.5 + macros.slowCarbs) / classified : 0.5;
  const speedAdjustment = clamp((availabilityIndex - 0.42) * 42, -15, 24);
  const uncertaintyAdjustment = (macros.carbSpeedConfidence ?? 100) < 65 ? 5 : 0;
  const activityAdjustment = /running|hyrox|crossfit|soccer|basketball|combat|boxing|wrestling/.test(workout.activityType) ? 10 : 0;
  const bestMinutes = Math.round(clamp(35 + sizeMinutes + burdenMinutes + speedAdjustment + uncertaintyAdjustment + activityAdjustment, 25, 210) / 5) * 5;
  const low = Math.max(15, bestMinutes - 15);
  const high = bestMinutes + 15;
  const eatInMinutes = Math.max(0, workout.startsInMinutes - bestMinutes);
  const eatAt = new Date(Date.now() + eatInMinutes * 60_000);
  return { bestMinutes, window: [low, high] as [number, number], eatInMinutes, eatAt };
}

export const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours} hr${remainder ? ` ${remainder} min` : ""}` : `${remainder} min`;
};
