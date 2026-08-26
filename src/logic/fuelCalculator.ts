import type { ActivityType, FuelTarget, WorkoutDraft } from "../types/fuel";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round5 = (value: number) => Math.max(5, Math.round(value / 5) * 5);

const activityFactor: Record<ActivityType, number> = {
  running: 1,
  cycling: 1,
  swimming: 0.95,
  triathlon: 1.05,
  strength: 0.72,
  crossfit: 0.95,
  soccer: 1,
  basketball: 0.95,
  football: 0.9,
  hiking: 0.82,
  hyrox: 1,
  endurance: 1,
  other: 0.85,
};

const intensityFactor = { easy: 0.8, moderate: 1, hard: 1.15 } as const;

const durationFactor = (minutes: number) => {
  if (minutes <= 30) return 0.6;
  if (minutes <= 45) return 0.8;
  if (minutes <= 60) return 1;
  if (minutes <= 90) return 1.15;
  if (minutes <= 120) return 1.35;
  return 1.5;
};

const timingBand = (minutes: number) => {
  if (minutes <= 30) return { low: 0.25, high: 0.5, label: "15–30 minutes before" };
  if (minutes <= 60) return { low: 0.5, high: 0.75, label: "30–60 minutes before" };
  if (minutes <= 90) return { low: 0.75, high: 1, label: "60–90 minutes before" };
  if (minutes <= 120) return { low: 1, high: 1.2, label: "90–120 minutes before" };
  if (minutes <= 180) return { low: 1.25, high: 2, label: "2–3 hours before" };
  return { low: 2, high: 3, label: "3–4 hours before" };
};

const speedMix = (minutes: number): [number, number, number] => {
  if (minutes <= 30) return [0.8, 0.2, 0];
  if (minutes <= 60) return [0.65, 0.35, 0];
  if (minutes <= 90) return [0.48, 0.42, 0.1];
  if (minutes <= 120) return [0.35, 0.45, 0.2];
  if (minutes <= 180) return [0.22, 0.45, 0.33];
  return [0.15, 0.35, 0.5];
};

const intraTarget = (minutes: number): FuelTarget["intraWorkout"] => {
  if (minutes < 60) return { required: false, lowPerHour: 0, highPerHour: 0, note: "No dedicated intra-workout carbohydrates are usually needed for this session." };
  if (minutes <= 75) return { required: false, lowPerHour: 0, highPerHour: 30, note: "A small top-up is optional for a hard session; an easy session usually needs none." };
  if (minutes <= 150) return { required: true, lowPerHour: 30, highPerHour: 60, note: "Aim for a steady 30–60 g of carbohydrate per hour." };
  return { required: true, lowPerHour: 60, highPerHour: 90, note: "Build toward 60–90 g per hour and practice this intake in training." };
};

export function calculateFuelTarget(workout: WorkoutDraft): FuelTarget {
  const timing = timingBand(workout.startsInMinutes);
  const demand = activityFactor[workout.activityType] * durationFactor(workout.durationMinutes) * intensityFactor[workout.intensity];
  const lowPerKg = clamp(timing.low * demand, 0.25, 4);
  const highPerKg = clamp(Math.max(lowPerKg + 0.15, timing.high * demand), 0.4, 4);
  const low = round5(workout.bodyWeightKg * lowPerKg);
  const high = Math.max(low + 5, round5(workout.bodyWeightKg * highPerKg));
  const carbTarget = round5(low + (high - low) * 0.55);
  const [fastRatio, mediumRatio] = speedMix(workout.startsInMinutes);
  const fastCarbs = Math.round(carbTarget * fastRatio);
  const mediumCarbs = Math.round(carbTarget * mediumRatio);
  const slowCarbs = Math.max(0, carbTarget - fastCarbs - mediumCarbs);

  return {
    workoutId: workout.id,
    carbTarget,
    carbRange: [low, high],
    gramsPerKgRange: [Number(lowPerKg.toFixed(2)), Number(highPerKg.toFixed(2))],
    fastCarbs,
    mediumCarbs,
    slowCarbs,
    intraWorkout: intraTarget(workout.durationMinutes),
    timingLabel: timing.label,
    rationale: `Built for a ${workout.durationMinutes}-minute ${workout.intensity} ${workout.activityType} session with ${workout.startsInMinutes} minutes to digest.`,
  };
}

