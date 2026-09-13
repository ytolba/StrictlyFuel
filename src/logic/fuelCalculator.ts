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

type NumericAnchor = { minutes: number; value: number };
type TimingAnchor = { minutes: number; low: number; high: number };

const interpolate = (minutes: number, anchors: NumericAnchor[]) => {
  if (minutes <= anchors[0].minutes) return anchors[0].value;
  for (let index = 1; index < anchors.length; index += 1) {
    const right = anchors[index];
    if (minutes <= right.minutes) {
      const left = anchors[index - 1];
      const progress = (minutes - left.minutes) / Math.max(1, right.minutes - left.minutes);
      return left.value + (right.value - left.value) * progress;
    }
  }
  return anchors[anchors.length - 1].value;
};

const durationDemand = (minutes: number) => interpolate(minutes, [
  { minutes: 0, value: 0 },
  { minutes: 30, value: 0.08 },
  { minutes: 45, value: 0.22 },
  { minutes: 60, value: 0.38 },
  { minutes: 90, value: 0.64 },
  { minutes: 120, value: 0.82 },
  { minutes: 180, value: 1 },
]);

/**
 * Maximum useful pre-workout carbohydrate dose for the planned session.
 * This prevents a four-hour digestion window from creating a race-sized meal
 * for a short workout that simply does not need it.
 */
const durationCeilingPerKg = (minutes: number) => interpolate(minutes, [
  { minutes: 0, value: 0.2 },
  { minutes: 30, value: 0.45 },
  { minutes: 45, value: 0.65 },
  { minutes: 60, value: 0.9 },
  { minutes: 90, value: 1.4 },
  { minutes: 120, value: 2 },
  { minutes: 180, value: 3 },
  { minutes: 240, value: 4 },
]);

const timingGuide = (minutes: number) => {
  const anchors: TimingAnchor[] = [
    { minutes: 0, low: 0.15, high: 0.3 },
    { minutes: 30, low: 0.25, high: 0.5 },
    { minutes: 60, low: 0.45, high: 0.8 },
    { minutes: 90, low: 0.75, high: 1.25 },
    { minutes: 120, low: 1, high: 1.75 },
    { minutes: 180, low: 1.5, high: 2.75 },
    { minutes: 240, low: 2, high: 4 },
  ];
  if (minutes <= anchors[0].minutes) return anchors[0];
  for (let index = 1; index < anchors.length; index += 1) {
    const right = anchors[index];
    if (minutes <= right.minutes) {
      const left = anchors[index - 1];
      const progress = (minutes - left.minutes) / Math.max(1, right.minutes - left.minutes);
      return {
        minutes,
        low: left.low + (right.low - left.low) * progress,
        high: left.high + (right.high - left.high) * progress,
      };
    }
  }
  return anchors[anchors.length - 1];
};

const timingBand = (minutes: number) => {
  if (minutes <= 30) return { low: 0.25, high: 0.5, label: "15–30 minutes before" };
  if (minutes <= 60) return { low: 0.5, high: 0.75, label: "30–60 minutes before" };
  if (minutes <= 90) return { low: 0.75, high: 1, label: "60–90 minutes before" };
  if (minutes <= 120) return { low: 1, high: 1.2, label: "90–120 minutes before" };
  if (minutes <= 180) return { low: 1.25, high: 2, label: "2–3 hours before" };
  return { low: 2, high: 3, label: "3–4 hours before" };
};

type AvailabilityAnchor = { minutes: number; fast: number; medium: number; slow: number };

/**
 * A smooth practical availability mix. These are not glycaemic-index claims:
 * they describe how much of the target should come from lower-burden versus
 * more structured foods for the time available to digest the whole meal.
 */
export const availabilityMixForMinutes = (minutes: number): [number, number, number] => {
  const anchors: AvailabilityAnchor[] = [
    { minutes: 0, fast: 0.88, medium: 0.12, slow: 0 },
    { minutes: 30, fast: 0.76, medium: 0.24, slow: 0 },
    { minutes: 60, fast: 0.58, medium: 0.37, slow: 0.05 },
    { minutes: 90, fast: 0.42, medium: 0.43, slow: 0.15 },
    { minutes: 120, fast: 0.28, medium: 0.47, slow: 0.25 },
    { minutes: 180, fast: 0.16, medium: 0.42, slow: 0.42 },
    { minutes: 240, fast: 0.1, medium: 0.35, slow: 0.55 },
  ];
  const bounded = clamp(minutes, anchors[0].minutes, anchors[anchors.length - 1].minutes);
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
  const fast = left.fast + (right.fast - left.fast) * progress;
  const medium = left.medium + (right.medium - left.medium) * progress;
  return [fast, medium, Math.max(0, 1 - fast - medium)];
};

const intraTarget = (workout: WorkoutDraft, demandIndex: number, sportDemand: number): FuelTarget["intraWorkout"] => {
  const minutes = workout.durationMinutes;
  if (minutes < 60) return { required: false, lowPerHour: 0, highPerHour: 0, note: "No dedicated intra-workout carbohydrates are usually needed for this session." };
  if (minutes <= 75) {
    return demandIndex >= 0.62
      ? { required: false, lowPerHour: 0, highPerHour: 30, note: "A 20–30 g top-up is optional for this harder session; it is not a requirement." }
      : { required: false, lowPerHour: 0, highPerHour: 0, note: "No dedicated intra-workout carbohydrates are usually needed for this session." };
  }
  if (sportDemand < 0.8 && minutes <= 120) {
    return { required: false, lowPerHour: 0, highPerHour: 30, note: "Carbohydrate during this session is optional; use up to 30 g per hour if volume or effort is unusually high." };
  }
  if (minutes <= 150) {
    const highPerHour = demandIndex >= 0.68 ? 60 : 45;
    return { required: true, lowPerHour: 30, highPerHour, note: `Aim for a steady 30–${highPerHour} g of carbohydrate per hour.` };
  }
  const lowPerHour = demandIndex >= 0.66 ? 60 : 45;
  const highPerHour = demandIndex >= 0.76 ? 90 : 60;
  return { required: true, lowPerHour, highPerHour, note: `Build toward ${lowPerHour}–${highPerHour} g per hour and practice this intake in training.` };
};

export function calculateFuelTarget(workout: WorkoutDraft): FuelTarget {
  const timing = timingBand(workout.startsInMinutes);
  const guide = timingGuide(workout.startsInMinutes);
  const sportDemand = activityFactor[workout.activityType] || 0.85;
  const effort = effortFactor(workout);
  const durationIndex = durationDemand(workout.durationMinutes);
  const effortIndex = clamp((effort - 0.72) / (1.24 - 0.72), 0, 1);
  const sportIndex = clamp((sportDemand - 0.65) / (1.12 - 0.65), 0, 1);
  const demandIndex = clamp(durationIndex * 0.5 + effortIndex * 0.35 + sportIndex * 0.15, 0, 1);

  // Current consensus uses a broad 1–4 g/kg over the 1–4 hours before longer
  // exercise. Strictly selects one point within that timing envelope from the
  // actual session demand, then applies a duration ceiling so short workouts
  // do not inherit endurance-race portions merely because the user eats early.
  const timingSelectedPerKg = guide.low + (guide.high - guide.low) * demandIndex;
  const ceilingAdjustment = (0.9 + effortIndex * 0.2) * (0.85 + sportIndex * 0.15);
  const selectedPerKg = clamp(Math.min(timingSelectedPerKg, durationCeilingPerKg(workout.durationMinutes) * ceilingAdjustment), 0.15, 4);
  // The guideline envelope is intentionally broad; the score needs a tighter
  // working range around the personalized point so a large miss is not graded
  // as acceptable. Twelve percent still accommodates labels and normal portions.
  const lowPerKg = clamp(selectedPerKg * 0.88, 0.15, 4);
  const highPerKg = clamp(Math.max(selectedPerKg * 1.12, lowPerKg + 0.1), 0.25, 4);
  const low = round5(workout.bodyWeightKg * lowPerKg);
  const high = Math.max(low + 5, round5(workout.bodyWeightKg * highPerKg));
  const carbTarget = clamp(round5(workout.bodyWeightKg * selectedPerKg), low, high);
  const [fastRatio, mediumRatio] = availabilityMixForMinutes(workout.startsInMinutes);
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
    intraWorkout: intraTarget(workout, demandIndex, sportDemand),
    timingLabel: timing.label,
    rationale: `Built from ${workout.bodyWeightKg} kg body weight, a ${workout.durationMinutes}-minute ${workout.intensity} ${workout.activityType} session${workout.heartRateZones?.length ? ` spanning HR zones ${workout.heartRateZones.join(", ")}` : ""}, and ${workout.startsInMinutes} minutes to digest. The selected target is ${selectedPerKg.toFixed(2)} g/kg with a practical ±12% working range. The fast, medium, and slow split is a smooth whole-meal availability estimate, not a glycaemic-index prescription.`,
    availabilityModelVersion: "2026.08",
  };
}
