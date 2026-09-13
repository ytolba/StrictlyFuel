import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { POST_WORKOUT_MEALS } from "../data/postWorkoutMeals";
import type { ActivityType } from "../types/fuel";
import type { RecoveryCategory, RecoveryIngredientBlueprint, RecoveryMealTemplate } from "../types/recovery";

const CACHE_KEY = "strictlyfuel:post-workout-meals:v2";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type RecoveryTemplateRow = {
  slug: string;
  name: string;
  description: string;
  prep_minutes: number;
  instructions: string[] | null;
  dietary_tags: string[] | null;
  allergens: string[] | null;
  activity_types: string[] | null;
  ingredient_blueprint: RecoveryIngredientBlueprint[] | null;
  recovery_categories: string[] | null;
  cuisine_category: string | null;
  meal_type: RecoveryMealTemplate["mealType"] | null;
  preparation_difficulty: RecoveryMealTemplate["difficulty"] | null;
  is_portion_scalable: boolean | null;
  primary_carb_food_id: string | null;
  primary_protein_food_id: string | null;
};

let memoryCache: { at: number; templates: RecoveryMealTemplate[] } | null = null;

function toTemplate(row: RecoveryTemplateRow): RecoveryMealTemplate | null {
  const ingredients = Array.isArray(row.ingredient_blueprint)
    ? row.ingredient_blueprint.filter((item) => item && typeof item.foodId === "string" && Number(item.grams) > 0)
    : [];
  if (!ingredients.length || !row.primary_carb_food_id || !row.primary_protein_food_id) return null;
  return {
    id: row.slug,
    name: row.name,
    description: row.description,
    ingredients,
    instructions: row.instructions || [],
    prepMinutes: row.prep_minutes,
    difficulty: row.preparation_difficulty || "easy",
    cuisine: row.cuisine_category || "Everyday",
    mealType: row.meal_type || "lunch",
    dietaryTags: row.dietary_tags || [],
    allergens: row.allergens || [],
    activityTypes: (row.activity_types || []) as ActivityType[],
    recoveryCategories: (row.recovery_categories || []) as RecoveryCategory[],
    primaryCarbFoodId: row.primary_carb_food_id,
    primaryProteinFoodId: row.primary_protein_food_id,
    portionScalable: row.is_portion_scalable !== false,
  };
}

export async function fetchRecoveryMealTemplates(options: { force?: boolean } = {}) {
  if (!options.force && memoryCache && Date.now() - memoryCache.at < CACHE_TTL_MS) return memoryCache.templates;
  if (!options.force) {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { at: number; templates: RecoveryMealTemplate[] };
        if (parsed.templates?.length && Date.now() - parsed.at < CACHE_TTL_MS) {
          memoryCache = parsed;
          return parsed.templates;
        }
      }
    } catch {
      // Continue to Supabase, then the bundled recovery library.
    }
  }

  try {
    const { data, error } = await supabase
      .from("meal_templates")
      .select("slug,name,description,prep_minutes,instructions,dietary_tags,allergens,activity_types,ingredient_blueprint,recovery_categories,cuisine_category,meal_type,preparation_difficulty,is_portion_scalable,primary_carb_food_id,primary_protein_food_id")
      .eq("is_verified", true)
      .eq("purpose", "post_workout")
      .limit(250);
    if (error) throw error;
    const templates = ((data as RecoveryTemplateRow[] | null) || []).map(toTemplate).filter((item): item is RecoveryMealTemplate => item !== null);
    if (templates.length) {
      memoryCache = { at: Date.now(), templates };
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache)).catch(() => undefined);
      return templates;
    }
  } catch (error) {
    console.warn("Recovery meal fetch failed; using bundled meals", error);
  }
  return POST_WORKOUT_MEALS;
}
