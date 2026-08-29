import type { MealMacros, WorkoutDraft } from "../types/fuel";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export function calculateMealTiming(macros: MealMacros, workout: WorkoutDraft) {
  const sizeMinutes = clamp(macros.calories / 8, 10, 55);
  const burdenMinutes = clamp(macros.fat * 1.5 + macros.fiber * 2.2 + Math.max(0, macros.protein - 15) * 0.5, 0, 70);
  const fastShare = macros.carbs > 0 ? macros.fastCarbs / macros.carbs : 0;
  const speedAdjustment = fastShare >= 0.6 ? -15 : fastShare <= 0.2 ? 15 : 0;
  const activityAdjustment = /running|hyrox|crossfit|soccer|basketball|combat|boxing|wrestling/.test(workout.activityType) ? 10 : 0;
  const bestMinutes = Math.round(clamp(35 + sizeMinutes + burdenMinutes + speedAdjustment + activityAdjustment, 25, 210) / 5) * 5;
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
