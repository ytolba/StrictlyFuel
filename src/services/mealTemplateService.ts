import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { CURATED_MEAL_TEMPLATES, type CuratedMealTemplate } from "../data/mealTemplates";
import type { ActivityType } from "../types/fuel";

/**
 * The recommended-meal catalog, served from Supabase.
 *
 * `public.meal_templates` is the source of truth: it lets the catalog be
 * corrected, extended or re-tagged without shipping a build. The bundled
 * `CURATED_MEAL_TEMPLATES` stays as an offline fallback so a cold start with no
 * signal — or an unseeded table — still produces recommendations rather than an
 * empty screen.
 *
 * No model is involved at any point; ranking lives in logic/mealRecommendation.
 *
 * Portion maths deliberately stays local. `ingredient_blueprint` stores the
 * app's own food ids, which resolve against bundled nutrition data, so the
 * whole catalog costs one query and no per-ingredient lookups.
 */

const CACHE_KEY = "strictlyfuel:meal-templates:v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type TemplateRow = {
  slug: string;
  name: string;
  description: string;
  prep_minutes: number;
  instructions: string[] | null;
  dietary_tags: string[] | null;
  allergens: string[] | null;
  activity_types: string[] | null;
  ideal_timing_minutes: number;
  timing_low_minutes: number;
  timing_high_minutes: number;
  min_workout_minutes: number;
  ingredient_blueprint: Array<{ foodId: string; grams: number }> | null;
};

const TEMPLATE_COLUMNS =
  "slug,name,description,prep_minutes,instructions,dietary_tags,allergens,activity_types,ideal_timing_minutes,timing_low_minutes,timing_high_minutes,min_workout_minutes,ingredient_blueprint";

function toTemplate(row: TemplateRow): CuratedMealTemplate | null {
  const ingredients = Array.isArray(row.ingredient_blueprint)
    ? row.ingredient_blueprint.filter((item) => item && typeof item.foodId === "string" && Number(item.grams) > 0)
    : [];
  // A template whose blueprint did not survive the round trip cannot be scaled
  // or scored, so drop it rather than show a meal with no food in it.
  if (!ingredients.length) return null;

  return {
    id: row.slug,
    name: row.name,
    description: row.description,
    ingredients: ingredients.map((item) => ({ foodId: item.foodId, grams: Number(item.grams) })),
    prepMinutes: row.prep_minutes,
    instructions: row.instructions || [],
    dietaryTags: row.dietary_tags || [],
    allergens: row.allergens || [],
    idealTimingMinutes: row.ideal_timing_minutes,
    timingWindow: [row.timing_low_minutes, row.timing_high_minutes],
    activityTypes: (row.activity_types || []) as ActivityType[],
    minWorkoutMinutes: row.min_workout_minutes,
  };
}

export type TemplateSource = "network" | "cache" | "bundled";

let memoryCache: { at: number; templates: CuratedMealTemplate[] } | null = null;

async function readDiskCache(): Promise<CuratedMealTemplate[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; templates: CuratedMealTemplate[] };
    if (!parsed?.templates?.length || Date.now() - parsed.at > CACHE_TTL_MS) return null;
    return parsed.templates;
  } catch {
    return null;
  }
}

/**
 * Fetch the catalog: memory, then disk, then Supabase, then the bundled set.
 *
 * Eligibility filtering happens in `rankMealTemplates` rather than in SQL. The
 * verified catalog is a few hundred small rows, so one cached query a day beats
 * a round trip every time a filter changes, and it keeps the exclusion rules in
 * one testable place instead of split between SQL and TypeScript.
 */
export async function fetchMealTemplates(options: { force?: boolean } = {}): Promise<{
  templates: CuratedMealTemplate[];
  source: TemplateSource;
}> {
  if (!options.force && memoryCache && Date.now() - memoryCache.at < CACHE_TTL_MS) {
    return { templates: memoryCache.templates, source: "cache" };
  }

  if (!options.force) {
    const cached = await readDiskCache();
    if (cached?.length) {
      memoryCache = { at: Date.now(), templates: cached };
      return { templates: cached, source: "cache" };
    }
  }

  try {
    const { data, error } = await supabase
      .from("meal_templates")
      .select(TEMPLATE_COLUMNS)
      .eq("is_verified", true)
      .limit(500);
    if (error) throw error;

    const templates = ((data as TemplateRow[] | null) || [])
      .map(toTemplate)
      .filter((item): item is CuratedMealTemplate => item !== null);

    if (templates.length) {
      memoryCache = { at: Date.now(), templates };
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), templates })).catch(() => undefined);
      return { templates, source: "network" };
    }
  } catch (error) {
    // Offline, or the table has not been seeded. Recommendations keep working
    // either way — this feature has no AI dependency to lose.
    console.warn("Meal template fetch failed; using the bundled catalog", error);
  }

  return { templates: CURATED_MEAL_TEMPLATES, source: "bundled" };
}

/** Rows shaped for seeding `public.meal_templates` from the bundled catalog. */
export function templateSeedRows() {
  return CURATED_MEAL_TEMPLATES.map((meal) => ({
    slug: meal.id,
    name: meal.name,
    description: meal.description,
    prep_minutes: meal.prepMinutes,
    instructions: meal.instructions,
    dietary_tags: meal.dietaryTags,
    allergens: meal.allergens,
    activity_types: meal.activityTypes,
    ideal_timing_minutes: meal.idealTimingMinutes,
    timing_low_minutes: meal.timingWindow[0],
    timing_high_minutes: meal.timingWindow[1],
    min_workout_minutes: meal.minWorkoutMinutes,
    ingredient_blueprint: meal.ingredients,
    is_verified: true,
  }));
}
