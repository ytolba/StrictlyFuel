import type { ActivityType, FuelTarget, HeartRateZone, WorkoutDraft } from "../types/fuel";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round5 = (value: number) => Math.max(5, Math.round(value / 5) * 5);

const activityFactor: Partial<Record<ActivityType, number>> = {
  running: 1,
  trail_running: 1,
  walking: 0.65,
  cycling: 1,
  indoor_cycling: 1,
  mountain_biking: 1.03,
  swimming: 0.95,
  rowing: 0.98,
  elliptical: 0.82,
  stair_climber: 0.92,
  triathlon: 1.05,
  sprint_triathlon: 1.03,
  olympic_triathlon: 1.06,
  ironman_70_3: 1.1,
  ironman: 1.12,
  brick_workout: 1.07,
  swim_bike: 1.05,
  bike_run: 1.08,
  strength: 0.72,
  bodybuilding: 0.74,
  powerlifting: 0.66,
  olympic_weightlifting: 0.78,
  strength_training: 0.72,
  calisthenics: 0.72,
  circuit_training: 0.88,
  crossfit: 0.95,
  hiit: 0.96,
  bootcamp: 0.9,
  functional_fitness: 0.9,
  conditioning: 0.92,
  soccer: 1,
  basketball: 0.95,
  football: 0.9,
  rugby: 0.96,
  hockey: 0.98,
  lacrosse: 0.95,
  volleyball: 0.78,
  baseball: 0.68,
  softball: 0.66,
  tennis: 0.9,
  pickleball: 0.76,
  badminton: 0.83,
  squash: 0.96,
  racquetball: 0.9,
  boxing: 0.96,
  kickboxing: 0.98,
  muay_thai: 0.98,
  wrestling: 1,
  brazilian_jiu_jitsu: 0.9,
  mma: 1,
  martial_arts: 0.88,
  hiking: 0.82,
  hyrox: 1,
  skiing: 0.9,
  snowboarding: 0.82,
  cross_country_skiing: 1.02,
  climbing: 0.82,
  surfing: 0.78,
  kayaking: 0.88,
  paddleboarding: 0.72,
  general_cardio: 0.84,
  mixed_training: 0.9,
  endurance: 1,
  other: 0.85,
};

const intensityFactor = { easy: 0.8, moderate: 1, hard: 1.15 } as const;

const zoneFactors: Record<HeartRateZone, number> = {
  1: 0.72,
  2: 0.86,
  3: 1,
  4: 1.14,
  5: 1.24,
};

/**
 * A planned interval session can include several zones. The average describes
 * most of the work while a smaller peak-zone contribution captures intervals
 * without pretending the entire workout happens at its hardest effort.
 */
const effortFactor = (workout: WorkoutDraft) => {
  const simple = intensityFactor[workout.intensity];
  const zones = [...new Set(workout.heartRateZones || [])];
  if (!zones.length) return simple;
  const average = zones.reduce((sum, zone) => sum + zoneFactors[zone], 0) / zones.length;
  const peak = Math.max(...zones.map((zone) => zoneFactors[zone]));
  const zoneDemand = average * 0.72 + peak * 0.28;
  return clamp(simple * 0.35 + zoneDemand * 0.65, 0.72, 1.24);
};

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
  const demand = (activityFactor[workout.activityType] || 0.85) * durationFactor(workout.durationMinutes) * effortFactor(workout);
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
    rationale: `Built for a ${workout.durationMinutes}-minute ${workout.intensity} ${workout.activityType} session${workout.heartRateZones?.length ? ` spanning HR zones ${workout.heartRateZones.join(", ")}` : ""} with ${workout.startsInMinutes} minutes to digest.`,
  };
}
