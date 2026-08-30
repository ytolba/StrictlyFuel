export type RaceKind = "half_marathon" | "marathon" | "trail_50k" | "trail_100k" | "gran_fondo" | "century_ride" | "sprint_triathlon" | "olympic_triathlon" | "ironman_70_3" | "ironman";
export type GutTrainingLevel = "new" | "practiced" | "high";
export type FuelInterval = 20 | 30;
export type RaceSegmentKind = "swim" | "bike" | "run";

export type RaceDefinition = {
  id: RaceKind;
  name: string;
  shortName: string;
  category: "running" | "cycling" | "triathlon";
  distance: string;
  defaultMinutes: number;
  segments: { kind: RaceSegmentKind; label: string; share: number }[];
};

export type RaceFuelItem = { name: string; count: number; carbsEach: number; totalCarbs: number; note: string };
export type RaceFuelSegment = { kind: RaceSegmentKind; label: string; durationMinutes: number; rate: number; targetCarbs: number; packCarbs: number; items: RaceFuelItem[] };
export type RaceFuelStop = { minute: number; label: string; carbs: number };
export type RaceFuelPlan = {
  race: RaceDefinition;
  durationMinutes: number;
  preRaceCarbs: number;
  totalTargetCarbs: number;
  totalPackedCarbs: number;
  segments: RaceFuelSegment[];
  timeline: RaceFuelStop[];
  intervalMinutes: FuelInterval;
  evidenceNote: string;
};
