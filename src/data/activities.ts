import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";
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
  icon: ComponentProps<typeof Ionicons>["name"];
  searchTerms?: string[];
};

const entries = (category: ActivityCategory, icon: ActivityDefinition["icon"], rows: Array<[ActivityType, string, string?, string[]?]>): ActivityDefinition[] =>
  rows.map(([id, label, shortLabel, searchTerms]) => ({ id, label, shortLabel: shortLabel || label, category, icon, searchTerms }));

export const ACTIVITY_CATALOG: ActivityDefinition[] = [
  ...entries("Endurance", "walk-outline", [
    ["running", "Running", "Run", ["jog", "jogging"]], ["trail_running", "Trail Running", "Trail Run"], ["walking", "Walking", "Walk"],
    ["hiking", "Hiking", "Hike"], ["cycling", "Cycling", "Bike", ["ride", "road bike"]], ["indoor_cycling", "Indoor Cycling", "Indoor Bike", ["spin"]],
    ["mountain_biking", "Mountain Biking", "MTB"], ["swimming", "Swimming", "Swim"], ["rowing", "Rowing", "Row"],
    ["elliptical", "Elliptical"], ["stair_climber", "Stair Climber", "Stairs"],
  ]),
  ...entries("Triathlon / Multi-Sport", "trophy-outline", [
    ["triathlon", "Triathlon"], ["sprint_triathlon", "Sprint Triathlon", "Sprint Tri"], ["olympic_triathlon", "Olympic Triathlon", "Olympic Tri"],
    ["ironman_70_3", "Ironman 70.3", "70.3"], ["ironman", "Ironman"], ["brick_workout", "Brick Workout", "Brick"],
    ["swim_bike", "Swim + Bike"], ["bike_run", "Bike + Run"],
  ]),
  ...entries("Strength", "barbell-outline", [
    ["strength", "Weightlifting", "Lift"], ["bodybuilding", "Bodybuilding"], ["powerlifting", "Powerlifting"],
    ["olympic_weightlifting", "Olympic Weightlifting", "Olympic Lift"], ["strength_training", "Strength Training", "Strength"],
    ["calisthenics", "Calisthenics"], ["circuit_training", "Circuit Training", "Circuit"],
  ]),
  ...entries("High Intensity / Functional", "flash-outline", [
    ["crossfit", "CrossFit"], ["hyrox", "Hyrox"], ["hiit", "HIIT"], ["bootcamp", "Bootcamp"],
    ["functional_fitness", "Functional Fitness", "Functional"], ["conditioning", "Conditioning"],
  ]),
  ...entries("Team Sports", "people-outline", [
    ["soccer", "Soccer", "Soccer", ["football"]], ["basketball", "Basketball"], ["football", "Football"], ["rugby", "Rugby"],
    ["hockey", "Hockey"], ["lacrosse", "Lacrosse"], ["volleyball", "Volleyball"], ["baseball", "Baseball"], ["softball", "Softball"],
  ]),
  ...entries("Racquet / Court Sports", "tennisball-outline", [
    ["tennis", "Tennis"], ["pickleball", "Pickleball"], ["badminton", "Badminton"], ["squash", "Squash"], ["racquetball", "Racquetball"],
  ]),
  ...entries("Combat Sports", "fitness-outline", [
    ["boxing", "Boxing"], ["kickboxing", "Kickboxing"], ["muay_thai", "Muay Thai"], ["wrestling", "Wrestling"],
    ["brazilian_jiu_jitsu", "Brazilian Jiu-Jitsu", "BJJ", ["jiu jitsu", "grappling"]], ["mma", "MMA"], ["martial_arts", "Martial Arts"],
  ]),
  ...entries("Outdoor / Recreation", "trail-sign-outline", [
    ["skiing", "Skiing"], ["snowboarding", "Snowboarding"], ["cross_country_skiing", "Cross-Country Skiing", "XC Skiing"],
    ["climbing", "Climbing"], ["surfing", "Surfing"], ["kayaking", "Kayaking"], ["paddleboarding", "Paddleboarding", "Paddleboard"],
  ]),
  ...entries("Other", "apps-outline", [
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
