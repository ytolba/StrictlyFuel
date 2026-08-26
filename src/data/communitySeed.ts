import { calculateFuelTarget } from "../logic/fuelCalculator";
import { calculateMealMacros } from "../logic/nutritionEngine";
import { scoreMeal } from "../logic/mealScore";
import { foodById } from "./fuelFoods";
import type { FuelMeal, FuelPost, MealIngredient, WorkoutDraft } from "../types/fuel";

const ingredient = (foodId: string, grams: number, post: string): MealIngredient => ({
  id: `${post}-${foodId}`,
  food: foodById(foodId)!,
  grams,
});

const makePost = (
  id: string,
  username: string,
  activityType: WorkoutDraft["activityType"],
  durationMinutes: number,
  startsInMinutes: number,
  bodyWeightKg: number,
  name: string,
  foods: [string, number][],
  caption: string,
  saves: number,
  copies: number
): FuelPost => {
  const workout: WorkoutDraft = { id: `workout-${id}`, activityType, durationMinutes, startsInMinutes, bodyWeightKg, intensity: "moderate", createdAt: new Date().toISOString() };
  const target = calculateFuelTarget(workout);
  const ingredients = foods.map(([foodId, grams]) => ingredient(foodId, grams, id));
  const macros = calculateMealMacros(ingredients);
  const meal: FuelMeal = {
    id: `meal-${id}`,
    userId: `demo-${id}`,
    workoutId: workout.id,
    name,
    ingredients,
    macros,
    score: scoreMeal(macros, target, workout),
    source: "manual",
    isEstimate: false,
    createdAt: workout.createdAt,
  };
  return {
    id,
    userId: meal.userId,
    username,
    meal,
    workout,
    target,
    caption,
    visibility: { workout: true, macros: true, ingredients: true },
    saves,
    copies,
    likes: Math.round(saves * 0.7),
    createdAt: workout.createdAt,
    isDemo: true,
  };
};

export const COMMUNITY_SEED: FuelPost[] = [
  makePost("seed-tempo", "maya.runs", "running", 60, 90, 64, "Rice, banana + honey", [["white-rice", 150], ["banana", 118], ["honey", 16], ["greek-yogurt", 100]], "Simple, familiar, and easy before tempo work.", 327, 184),
  makePost("seed-ride", "ridewithleo", "cycling", 120, 120, 78, "Bagel + fruit fuel", [["bagel", 105], ["banana", 118], ["fruit-juice", 240]], "My reliable two-hour ride breakfast.", 241, 138),
  makePost("seed-lift", "nina.lifts", "strength", 70, 75, 68, "Quick rice-cake stack", [["rice-cakes", 36], ["honey", 18], ["banana", 100], ["greek-yogurt", 120]], "Light enough to train hard without feeling empty.", 196, 121),
  makePost("seed-hyrox", "omar.moves", "hyrox", 90, 150, 82, "Oats, mango + maple", [["oats", 234], ["mango", 165], ["maple-syrup", 30], ["greek-yogurt", 170]], "More runway today, so I went with a fuller bowl.", 174, 96),
];

