import { calculateMealMacros } from "./nutritionEngine";
import { scaleMealToTarget } from "./mealScaling";
import { scoreMeal } from "./mealScore";
import { calculateMealTiming } from "./mealTiming";
import { ingredientsForTemplate, type CuratedMealTemplate } from "../data/mealTemplates";
import type { FuelTarget, MealIngredient, WorkoutDraft } from "../types/fuel";
import type { NutritionProfile } from "../types/nutritionProfile";

/**
 * Recommended meals, without a language model.
 *
 * Everything a recommendation needs is already structured: the catalog carries
 * dietary tags, allergens, timing windows and activity compatibility, and the
 * fuel target is arithmetic. So the pipeline is
 *
 *   eligible templates  ->  scale to the carb target  ->  score  ->  rank
 *
 * all of it deterministic and unit-testable. Sending a hundred meals to an LLM
 * and asking which one to eat would cost tokens, add latency, and give a
 * different answer to the same question on a second run.
 *
 * Kept as pure functions separate from the screen so the ranking can be tested
 * and reused (Discover, post-workout suggestions) without mounting React.
 */

export type MealRecommendation = {
  template: CuratedMealTemplate;
  ingredients: MealIngredient[];
  macros: ReturnType<typeof calculateMealMacros>;
  score: ReturnType<typeof scoreMeal>;
  timing: ReturnType<typeof calculateMealTiming>;
  /** Ranking value. Higher is a better fit; not shown to the athlete. */
  rank: number;
  /** Why this meal ranked where it did, for debugging and future UI. */
  rankBreakdown: { fuelScore: number; activityMatch: number; timingFit: number };
};

/**
 * A recommendation is a promise, not filler. Anything below this stays
 * available in the manual builder but is never presented as a pick.
 */
export const MIN_RECOMMENDATION_SCORE = 90;

const ACTIVITY_MATCH_BONUS = 16;
const MAX_TIMING_BONUS = 20;

/**
 * Hard eligibility. These are exclusions, never preferences: an allergen or a
 * dietary pattern must remove a meal outright rather than lower its rank.
 */
export function isEligible(meal: CuratedMealTemplate, profile: NutritionProfile, workout: WorkoutDraft): boolean {
  const excluded = new Set([...profile.sensitivities, ...profile.conditions]);
  if (meal.allergens.includes("dairy") && (excluded.has("dairy") || excluded.has("lactose"))) return false;
  if (meal.allergens.includes("gluten") && (excluded.has("gluten") || excluded.has("celiac"))) return false;
  if (profile.dietaryPatterns.includes("vegan") && !meal.dietaryTags.includes("vegan")) return false;
  if (profile.dietaryPatterns.includes("vegetarian") && !meal.dietaryTags.includes("vegetarian")) return false;
  if (profile.dietaryPatterns.includes("halal") && !meal.dietaryTags.includes("halal")) return false;
  // A long-session meal in front of a 20-minute easy spin is not a fit.
  if (workout.durationMinutes < meal.minWorkoutMinutes) return false;
  return true;
}

/**
 * Rank the eligible meals.
 *
 * `scoreMeal` already judges the scaled meal against the target (carbs, carb
 * speed split, timing, comfort), so ranking only adds the two things that are
 * about *this* session rather than the food: whether the meal is meant for this
 * sport, and how close its natural eating window is to when training starts.
 */
export function rankMealTemplates(
  templates: CuratedMealTemplate[],
  { target, workout, profile }: { target: FuelTarget; workout: WorkoutDraft; profile: NutritionProfile }
): MealRecommendation[] {
  return templates
    .filter((meal) => isEligible(meal, profile, workout))
    .map((meal) => {
      const ingredients = scaleMealToTarget(ingredientsForTemplate(meal), target);
      const macros = calculateMealMacros(ingredients);
      const score = scoreMeal(macros, target, workout);
      const timing = calculateMealTiming(macros, workout);
      const activityMatch = meal.activityTypes.includes(workout.activityType) ? ACTIVITY_MATCH_BONUS : 0;
      // Every 5 minutes away from the ideal eating time costs one point.
      const timingFit = Math.max(0, MAX_TIMING_BONUS - Math.abs(timing.bestMinutes - workout.startsInMinutes) / 5);
      return {
        template: meal,
        ingredients,
        macros,
        score,
        timing,
        rank: score.total + activityMatch + timingFit,
        rankBreakdown: { fuelScore: score.total, activityMatch, timingFit },
      };
    })
    .filter((meal) => meal.score.total >= MIN_RECOMMENDATION_SCORE)
    .sort((a, b) => b.rank - a.rank)
    // The catalog is combinatorial (fruit x sweetener x base), so near-identical
    // names can collide. Keep the best-ranked one of each name.
    .filter((meal, index, all) => all.findIndex((other) => other.template.name === meal.template.name) === index);
}
