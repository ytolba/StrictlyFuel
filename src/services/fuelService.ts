import { supabase } from "../lib/supabase";
import type { FuelMeal, FuelPost, FuelTarget, WorkoutDraft } from "../types/fuel";
import { nutritionForIngredient } from "../logic/nutritionEngine";

const scorePercent = (score: number, max: number) => Math.max(0, Math.min(100, Math.round((score / Math.max(1, max)) * 100)));

export async function saveWorkout(userId: string, workout: WorkoutDraft, target: FuelTarget) {
  const { error: workoutError } = await supabase.from("workouts").upsert({
    id: workout.id, user_id: userId, activity_type: workout.activityType, duration_minutes: workout.durationMinutes,
    intensity: workout.intensity, starts_in_minutes: workout.startsInMinutes, body_weight_kg: workout.bodyWeightKg,
    heart_rate_zones: workout.heartRateZones || [],
    created_at: workout.createdAt, updated_at: new Date().toISOString(),
  });
  if (workoutError) throw workoutError;
  const { error: targetError } = await supabase.from("fuel_targets").upsert({
    workout_id: workout.id, carb_target_g: target.carbTarget, carb_low_g: target.carbRange[0], carb_high_g: target.carbRange[1],
    grams_per_kg_low: target.gramsPerKgRange[0], grams_per_kg_high: target.gramsPerKgRange[1],
    fast_carbs_g: target.fastCarbs, medium_carbs_g: target.mediumCarbs, slow_carbs_g: target.slowCarbs,
    intra_required: target.intraWorkout.required, intra_low_g_per_hour: target.intraWorkout.lowPerHour,
    intra_high_g_per_hour: target.intraWorkout.highPerHour, intra_note: target.intraWorkout.note,
    timing_label: target.timingLabel, rationale: target.rationale,
    availability_model_version: target.availabilityModelVersion || "2026.08",
  }, { onConflict: "workout_id" });
  if (targetError) throw targetError;
}

export async function saveMeal(userId: string, meal: FuelMeal) {
  const { error: mealError } = await supabase.from("meals").upsert({
    id: meal.id, user_id: userId, workout_id: meal.workoutId, name: meal.name, image_path: meal.imageUri || null,
    source: meal.source, is_estimate: meal.isEstimate, confidence: meal.confidence ?? null,
    calories: meal.macros.calories, carbs_g: meal.macros.carbs, protein_g: meal.macros.protein, fat_g: meal.macros.fat,
    fiber_g: meal.macros.fiber, fast_carbs_g: meal.macros.fastCarbs, medium_carbs_g: meal.macros.mediumCarbs,
    slow_carbs_g: meal.macros.slowCarbs, unclassified_carbs_g: meal.macros.unclassifiedCarbs,
    available_carbs_g: meal.macros.availableCarbs ?? meal.macros.carbs,
    carb_availability_confidence: meal.macros.carbSpeedConfidence ?? meal.score.confidence ?? null,
    created_at: meal.createdAt, updated_at: new Date().toISOString(),
  });
  if (mealError) throw mealError;
  await supabase.from("meal_items").delete().eq("meal_id", meal.id);
  const items = meal.ingredients.map((item, position) => {
    const nutrition = nutritionForIngredient(item);
    return {
      meal_id: meal.id, position, food_name_snapshot: item.food.name, quantity: 1, grams: item.grams,
      calories: nutrition.calories, carbs_g: nutrition.carbs,
      protein_g: nutrition.protein, fat_g: nutrition.fat, fiber_g: nutrition.fiber,
      carb_speed_tier_id: item.food.carbSpeed, confidence: item.confidence ?? null, is_estimate: Boolean(item.estimated),
      food_confidence: item.foodConfidence ?? null, portion_confidence: item.portionConfidence ?? null,
      nutrition_match_confidence: item.nutritionMatchConfidence ?? null,
    };
  });
  const { error: itemError } = await supabase.from("meal_items").insert(items);
  if (itemError) throw itemError;
  const components = meal.score.components;
  const byId = (id: string) => components.find((component) => component.id === id);
  const { error: analysisError } = await supabase.from("meal_analyses").upsert({
    meal_id: meal.id, strictly_score: meal.score.total,
    carb_score: scorePercent(byId("carbs")?.score || 0, byId("carbs")?.maxScore || 1),
    timing_score: scorePercent(byId("timing")?.score || 0, byId("timing")?.maxScore || 1),
    distribution_score: scorePercent(byId("distribution")?.score || 0, byId("distribution")?.maxScore || 1),
    comfort_score: scorePercent(byId("comfort")?.score || 0, byId("comfort")?.maxScore || 1),
    headline: meal.score.headline, summary: meal.score.summary, components,
    model_version: "fuel-score-v3.0", provisional: Boolean(meal.score.provisional),
  }, { onConflict: "meal_id" });
  if (analysisError) throw analysisError;
}

/**
 * Turn a Postgres/PostgREST failure into something an athlete can act on.
 *
 * The raw messages leak schema detail ("insert or update on table
 * \"fuel_posts\" violates foreign key constraint ...") and tell the person
 * nothing about what to do next.
 */
function describePublishError(error: { code?: string; message?: string }): string {
  switch (error.code) {
    case "22P02": // invalid input syntax — almost always a malformed uuid
      return "This post could not be created. Please rebuild the meal and try sharing again.";
    case "23503": // foreign key violation — the meal or workout is not saved yet
      return "This meal hasn’t finished saving to your account yet. Wait a moment and try again.";
    case "23505": // unique violation — user_id + meal_id already published
      return "You’ve already shared this meal with the community.";
    case "42501": // RLS denied
      return "You can only share meals saved to your own account. Try signing out and back in.";
    case "PGRST301":
      return "Your session has expired. Sign in again and try sharing.";
    default:
      return error.message || "Your meal could not be published. Please try again.";
  }
}

/**
 * Publish a meal to the community feed.
 *
 * `fuel_posts` has a foreign key to both `meals` and `workouts`, and its insert
 * policy re-checks that the meal belongs to the caller. Elsewhere in the app
 * meals are saved fire-and-forget, so by the time someone shares one the row
 * may never have reached the server — publishing therefore persists the workout
 * and the meal first, and only then creates the post.
 */
export async function publishFuelPost(
  userId: string,
  post: FuelPost,
  target: FuelTarget
): Promise<void> {
  await saveWorkout(userId, post.workout, target);
  await saveMeal(userId, post.meal);

  const { error } = await supabase.from("fuel_posts").upsert(
    {
      id: post.id, user_id: userId, meal_id: post.meal.id, workout_id: post.workout.id,
      author_username: post.username, caption: post.caption, show_workout: post.visibility.workout,
      show_macros: post.visibility.macros, show_ingredients: post.visibility.ingredients, is_public: true,
      deleted_at: null,
    },
    // Re-sharing the same meal updates the existing post rather than tripping
    // the unique (user_id, meal_id) constraint.
    { onConflict: "user_id,meal_id" }
  );

  if (error) throw new Error(describePublishError(error));
}

// Rich post hydration is intentionally kept separate from the core meal flow.
// Local/demo posts remain visible while live community rows are progressively adopted.
export async function fetchFuelPosts(_activityType?: string): Promise<FuelPost[]> { return []; }

export async function saveCommunityMeal(userId: string, post: FuelPost) {
  const { error } = await supabase.from("saved_meals").upsert({ user_id: userId, post_id: post.id });
  if (error) throw error;
}

export async function removeSavedCommunityMeal(userId: string, postId: string) {
  const { error } = await supabase.from("saved_meals").delete().eq("user_id", userId).eq("post_id", postId);
  if (error) throw error;
}

export async function reportCommunityPost(userId: string, postId: string, reason: string) {
  const { error } = await supabase.from("post_reports").upsert(
    { reporter_id: userId, post_id: postId, reason },
    { onConflict: "post_id,reporter_id" }
  );
  if (error) throw error;
}

export async function blockCommunityUser(userId: string, blockedUserId: string) {
  const { error } = await supabase.from("blocked_users").upsert({ blocker_id: userId, blocked_id: blockedUserId });
  if (error) throw error;
}
