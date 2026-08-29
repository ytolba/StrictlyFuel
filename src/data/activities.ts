import type { ComponentProps } from "react";
import type { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ActivityType } from "../types/fuel";

export type ActivityCategory =
  | "Endurance"
  | "Triathlon / Multi-Sport"
  | "Strength"
  | "High Intensity / Functional"
  | "Team Sports"
  | "Racquet / Court Sports"
  | "Combat Sports"
  | "Outdoor / Recreation"
  | "Other";

export type ActivityDefinition = {
  id: ActivityType;
  label: string;
  shortLabel: string;
  category: ActivityCategory;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  searchTerms?: string[];
};

/**
 * Per-sport glyphs.
 *
 * These come from MaterialCommunityIcons rather than Ionicons: Ionicons has no
 * glyph for running, swimming, skiing, boxing, volleyball or weightlifting, so
 * every activity in a category used to share one generic icon (all eleven
 * endurance sports were a walking figure, every team sport was two people).
 * MaterialCommunityIcons ships real sport glyphs, so each activity can show
 * what it actually is.
 *
 * A handful of sports genuinely have no glyph in any bundled set — lacrosse,
 * elliptical and climbing among them — and fall back to the nearest honest
 * match rather than to something misleading.
 */
const ICON_BY_ACTIVITY: Partial<Record<ActivityType, ActivityDefinition["icon"]>> = {
  // Endurance
  running: "run",
  trail_running: "run-fast",
  walking: "walk",
  hiking: "hiking",
  cycling: "bike",
  indoor_cycling: "bike-fast",
  mountain_biking: "bike-pedal-mountain",
  swimming: "swim",
  rowing: "rowing",
  elliptical: "orbit",          // no elliptical glyph; the looping path is the idea
  stair_climber: "stairs-up",

  // Triathlon / multi-sport
  triathlon: "medal",
  sprint_triathlon: "medal",
  olympic_triathlon: "medal",
  ironman_70_3: "trophy",
  ironman: "trophy",
  brick_workout: "repeat-variant",
  swim_bike: "swim",
  bike_run: "run",

  // Strength
  strength: "dumbbell",
  bodybuilding: "arm-flex",
  powerlifting: "weight-lifter",
  olympic_weightlifting: "weight",
  strength_training: "dumbbell",
  calisthenics: "gymnastics",
  circuit_training: "repeat-variant",

  // High intensity / functional
  crossfit: "kettlebell",
  hyrox: "timer",
  hiit: "lightning-bolt",
  bootcamp: "account-group",
  functional_fitness: "human-handsup",
  conditioning: "heart-pulse",

  // Team sports
  soccer: "soccer",
  basketball: "basketball",
  football: "football",
  rugby: "rugby",
  hockey: "hockey-sticks",
  lacrosse: "hockey-sticks",    // no lacrosse glyph; a stick sport is the closest
  volleyball: "volleyball",
  baseball: "baseball",
  softball: "baseball-bat",

  // Racquet / court
  tennis: "tennis",
  pickleball: "table-tennis",   // paddle sport, which is what the glyph shows
  badminton: "badminton",
  squash: "racquetball",
  racquetball: "racquetball",

  // Combat
  boxing: "boxing-glove",
  kickboxing: "karate",
  muay_thai: "karate",
  wrestling: "kabaddi",
  brazilian_jiu_jitsu: "kabaddi",
  mma: "mixed-martial-arts",
  martial_arts: "karate",

  // Outdoor / recreation
  skiing: "ski",
  snowboarding: "snowboard",
  cross_country_skiing: "ski-cross-country",
  climbing: "terrain",          // no climber glyph
  surfing: "surfing",
  kayaking: "kayaking",
  paddleboarding: "rowing",

  // Other
  general_cardio: "heart-pulse",
  mixed_training: "shape",
  endurance: "infinity",
  other: "dots-horizontal",
};

const entries = (category: ActivityCategory, icon: ActivityDefinition["icon"], rows: Array<[ActivityType, string, string?, string[]?]>): ActivityDefinition[] =>
  rows.map(([id, label, shortLabel, searchTerms]) => ({
    id,
    label,
    shortLabel: shortLabel || label,
    category,
    // The per-category icon is now only a fallback for an activity added
    // without its own glyph.
    icon: ICON_BY_ACTIVITY[id] || icon,
    searchTerms,
  }));

export const ACTIVITY_CATALOG: ActivityDefinition[] = [
  ...entries("Endurance", "run", [
    ["running", "Running", "Run", ["jog", "jogging"]], ["trail_running", "Trail Running", "Trail Run"], ["walking", "Walking", "Walk"],
    ["hiking", "Hiking", "Hike"], ["cycling", "Cycling", "Bike", ["ride", "road bike"]], ["indoor_cycling", "Indoor Cycling", "Indoor Bike", ["spin"]],
    ["mountain_biking", "Mountain Biking", "MTB"], ["swimming", "Swimming", "Swim"], ["rowing", "Rowing", "Row"],
    ["elliptical", "Elliptical"], ["stair_climber", "Stair Climber", "Stairs"],
  ]),
  ...entries("Triathlon / Multi-Sport", "medal", [
    ["triathlon", "Triathlon"], ["sprint_triathlon", "Sprint Triathlon", "Sprint Tri"], ["olympic_triathlon", "Olympic Triathlon", "Olympic Tri"],
    ["ironman_70_3", "Ironman 70.3", "70.3"], ["ironman", "Ironman"], ["brick_workout", "Brick Workout", "Brick"],
    ["swim_bike", "Swim + Bike"], ["bike_run", "Bike + Run"],
  ]),
  ...entries("Strength", "dumbbell", [
    ["strength", "Weightlifting", "Lift"], ["bodybuilding", "Bodybuilding"], ["powerlifting", "Powerlifting"],
    ["olympic_weightlifting", "Olympic Weightlifting", "Olympic Lift"], ["strength_training", "Strength Training", "Strength"],
    ["calisthenics", "Calisthenics"], ["circuit_training", "Circuit Training", "Circuit"],
  ]),
  ...entries("High Intensity / Functional", "lightning-bolt", [
    ["crossfit", "CrossFit"], ["hyrox", "Hyrox"], ["hiit", "HIIT"], ["bootcamp", "Bootcamp"],
    ["functional_fitness", "Functional Fitness", "Functional"], ["conditioning", "Conditioning"],
  ]),
  ...entries("Team Sports", "account-group", [
    ["soccer", "Soccer", "Soccer", ["football"]], ["basketball", "Basketball"], ["football", "Football"], ["rugby", "Rugby"],
    ["hockey", "Hockey"], ["lacrosse", "Lacrosse"], ["volleyball", "Volleyball"], ["baseball", "Baseball"], ["softball", "Softball"],
  ]),
  ...entries("Racquet / Court Sports", "tennis", [
    ["tennis", "Tennis"], ["pickleball", "Pickleball"], ["badminton", "Badminton"], ["squash", "Squash"], ["racquetball", "Racquetball"],
  ]),
  ...entries("Combat Sports", "boxing-glove", [
    ["boxing", "Boxing"], ["kickboxing", "Kickboxing"], ["muay_thai", "Muay Thai"], ["wrestling", "Wrestling"],
    ["brazilian_jiu_jitsu", "Brazilian Jiu-Jitsu", "BJJ", ["jiu jitsu", "grappling"]], ["mma", "MMA"], ["martial_arts", "Martial Arts"],
  ]),
  ...entries("Outdoor / Recreation", "hiking", [
    ["skiing", "Skiing"], ["snowboarding", "Snowboarding"], ["cross_country_skiing", "Cross-Country Skiing", "XC Skiing"],
    ["climbing", "Climbing"], ["surfing", "Surfing"], ["kayaking", "Kayaking"], ["paddleboarding", "Paddleboarding", "Paddleboard"],
  ]),
  ...entries("Other", "shape", [
    ["general_cardio", "General Cardio", "Cardio"], ["mixed_training", "Mixed Training", "Mixed"], ["endurance", "General Endurance", "Endurance"], ["other", "Other"],
  ]),
];

export const ACTIVITY_CATEGORIES = [...new Set(ACTIVITY_CATALOG.map((activity) => activity.category))] as ActivityCategory[];
export const DEFAULT_ACTIVITIES: ActivityType[] = ["running", "cycling", "strength", "swimming"];

export const getActivity = (id: ActivityType) => ACTIVITY_CATALOG.find((activity) => activity.id === id) || ACTIVITY_CATALOG[ACTIVITY_CATALOG.length - 1];

const NON_CARDIO_ACTIVITIES = new Set<ActivityType>([
  "strength", "bodybuilding", "powerlifting", "olympic_weightlifting",
  "strength_training", "calisthenics", "climbing", "other",
]);

/** Activities where planned heart-rate zones materially improve demand estimates. */
export const supportsHeartRateZones = (id: ActivityType) => !NON_CARDIO_ACTIVITIES.has(id);

export const searchActivities = (query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return ACTIVITY_CATALOG;
  const words = normalized.split(/\s+/).filter(Boolean);
  return ACTIVITY_CATALOG.filter((activity) => {
    const haystack = [activity.label, activity.shortLabel, activity.id.replace(/_/g, " "), ...(activity.searchTerms || [])].join(" ").toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
};
