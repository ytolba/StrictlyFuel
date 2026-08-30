import { FUEL_FOODS } from "../src/data/fuelFoods";
import { calculateHealthScore } from "../src/logic/healthScore";
import { rankMealAdjustments } from "../src/logic/mealImprovement";
import { calculateMealMacros, validateMacroCalories } from "../src/logic/nutritionEngine";
import { buildRaceFuelPlan } from "../src/logic/raceFueling";
import { raceById } from "../src/data/races";
import { POST_WORKOUT_MEALS } from "../src/data/postWorkoutMeals";
import { calculateRecoveryTarget, rankRecoveryMeals, scaleRecoveryMeal } from "../src/logic/recoveryNutrition";
import { EMPTY_NUTRITION_PROFILE } from "../src/types/nutritionProfile";
import type { FuelFood, FuelTarget, MealIngredient, WorkoutDraft } from "../src/types/fuel";

const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const food = (id: string) => {
  const found = FUEL_FOODS.find((item) => item.id === id);
  if (!found) throw new Error(`Missing fixture ${id}`);
  return found;
};
const ingredient = (value: FuelFood, grams = value.defaultGrams): MealIngredient => ({ id: `item-${value.id}`, food: value, grams });
const custom = (id: string, name: string, category: FuelFood["category"], carbs: number, protein = 0, fat = 0, fiber = 0): FuelFood => ({
  id, name, category, aliases: [], emoji: "", carbSpeed: carbs > 10 ? "medium" : "slow", timing: "", defaultGrams: 100, servingLabel: "1 serving",
  per100g: { calories: carbs * 4 + protein * 4 + fat * 9, carbs, protein, fat, fiber }, source: "usda", isVerified: true,
});
const workout = (startsInMinutes = 75): WorkoutDraft => ({ id: "workout", activityType: "running", durationMinutes: 75, intensity: "moderate", startsInMinutes, bodyWeightKg: 75, createdAt: "2026-08-28T00:00:00Z" });
const target = (carbTarget: number): FuelTarget => ({ workoutId: "workout", carbTarget, carbRange: [carbTarget - 8, carbTarget + 8], gramsPerKgRange: [0.8, 1.2], fastCarbs: carbTarget * 0.4, mediumCarbs: carbTarget * 0.4, slowCarbs: carbTarget * 0.2, intraWorkout: { required: false, lowPerHour: 0, highPerHour: 0, note: "" }, timingLabel: "", rationale: "" });
const fixFor = (items: MealIngredient[], carbTarget: number, startsInMinutes = 75) => rankMealAdjustments(items, calculateMealMacros(items), target(carbTarget), workout(startsInMinutes))[0];

const riceCakeFix = fixFor([ingredient(food("rice-cakes"), 18), ingredient(food("honey"), 14)], 52, 45);
assert(riceCakeFix?.action === "increase" && /rice cake/i.test(riceCakeFix.ingredientName), "Rice cakes + honey should increase an existing food first");

const pastaFix = fixFor([ingredient(food("white-pasta"), 140), ingredient(food("chicken"), 100)], 75);
assert(pastaFix?.action === "increase" && /pasta/i.test(pastaFix.ingredientName), "Pasta meal should increase pasta, never add rice");

const yogurtFix = fixFor([ingredient(food("greek-yogurt"), 170)], 40);
assert(yogurtFix?.action === "add" && /berr|banana|granola|honey|date/i.test(yogurtFix.ingredientName), "Yogurt should receive a natural sweet addition");

const berries = FUEL_FOODS.find((item) => /blueberries/i.test(item.name));
assert(berries, "Blueberries fixture should exist");
const yogurtBerryFix = fixFor([ingredient(food("greek-yogurt"), 170), ingredient(berries as FuelFood, 80)], 40);
assert(yogurtBerryFix?.action === "increase" && /berr/i.test(yogurtBerryFix.ingredientName), "Yogurt + berries should increase berries first");

const chickenSaladFix = fixFor([ingredient(food("chicken"), 120), ingredient(custom("salad", "Mixed salad vegetables", "fruit", 4, 2, 0, 3), 120)], 55);
assert(chickenSaladFix?.action === "add" && /rice|potato|couscous|bread|fruit|banana|apple|orange/i.test(chickenSaladFix.ingredientName), "Chicken salad should get a natural savory accompaniment");

const bananaFix = fixFor([ingredient(food("banana"), 118)], 48, 45);
assert(bananaFix?.action === "increase" && /banana/i.test(bananaFix.ingredientName), "Banana close to training should be treated as useful existing fuel");

const normalCalories = validateMacroCalories({ source: "label", isVerified: true, per100g: { calories: 420, protein: 30, carbs: 50, fat: 10, fiber: 0 } });
assert(normalCalories.status === "consistent" && normalCalories.selectedCalories === 420, "Normal label rounding must remain trusted");
const impossibleCalories = validateMacroCalories({ source: "ai_estimate", isVerified: false, per100g: { calories: 900, protein: 30, carbs: 50, fat: 10, fiber: 0 } });
assert(impossibleCalories.status === "suspicious" && impossibleCalories.selectedCalories < 500, "Impossible calorie totals must be rejected");
const erythritol = validateMacroCalories({ source: "label", isVerified: true, per100g: { calories: 0, protein: 0, carbs: 10, fat: 0, fiber: 0, sugarAlcohols: 10, sugarAlcoholType: "erythritol" } });
assert(erythritol.adjustedEstimate === 0, "Erythritol must not receive 4 kcal/g");
const xylitol = validateMacroCalories({ source: "label", isVerified: true, per100g: { calories: 24, protein: 0, carbs: 10, fat: 0, fiber: 0, sugarAlcohols: 10, sugarAlcoholType: "xylitol" } });
assert(xylitol.adjustedEstimate === 24, "Xylitol must use its specific energy factor");
const allulose = validateMacroCalories({ source: "label", isVerified: true, per100g: { calories: 4, protein: 0, carbs: 10, fat: 0, fiber: 0, allulose: 10 } });
assert(allulose.adjustedEstimate === 4 && allulose.status === "consistent", "Allulose must use about 0.4 kcal/g");
const detailedFiber = validateMacroCalories({ source: "label", isVerified: true, per100g: { calories: 28, protein: 0, carbs: 10, fat: 0, fiber: 6, solubleFiber: 2, insolubleFiber: 4 } });
assert(detailedFiber.adjustedEstimate === 20 && detailedFiber.status === "consistent", "Detailed fiber must not blindly receive 4 kcal/g");

const wholeMeal = [ingredient(food("white-rice"), 180), ingredient(food("chicken"), 140), ingredient(custom("avocado", "Avocado", "fat", 9, 2, 15, 7), 70), ingredient(custom("broccoli", "Broccoli", "fruit", 7, 3, 0, 3), 100)];
assert(calculateHealthScore(wholeMeal, calculateMealMacros(wholeMeal)).score >= 85, "Balanced whole-food meal should earn a strong Health Score");
const gelMeal = [ingredient(food("carb-gel"), 64)];
assert(calculateHealthScore(gelMeal, calculateMealMacros(gelMeal)).score < 65, "Highly formulated fuel should score lower for everyday health quality");

const halfPlan = buildRaceFuelPlan({ race: raceById("half_marathon"), durationMinutes: 120, bodyWeightKg: 75, gutTraining: "practiced", intervalMinutes: 30 });
assert(halfPlan.totalTargetCarbs >= 60 && halfPlan.totalTargetCarbs <= 120, "Half-marathon plan should stay in a moderate carbohydrate range");
assert(halfPlan.totalPackedCarbs >= halfPlan.totalTargetCarbs, "Race packing list should cover the calculated carbohydrate target");
const triPlan = buildRaceFuelPlan({ race: raceById("ironman_70_3"), durationMinutes: 360, bodyWeightKg: 75, gutTraining: "practiced", intervalMinutes: 20 });
assert(triPlan.segments.length === 3 && triPlan.segments[0].rate === 0, "Triathlon must split swim, bike and run with no swim intake");
assert((triPlan.segments.find((segment) => segment.kind === "bike")?.rate || 0) > (triPlan.segments.find((segment) => segment.kind === "run")?.rate || 0), "Long-course triathlon should place the higher tolerable intake on the bike");

assert(POST_WORKOUT_MEALS.length >= 30, "Recovery catalog should contain a substantial set of complete meals");
for (const template of POST_WORKOUT_MEALS) {
  assert(template.ingredients.some((item) => item.role === "protein"), `${template.name} needs a protein anchor`);
  assert(template.ingredients.some((item) => item.role === "carb"), `${template.name} needs a carbohydrate anchor`);
  assert(template.ingredients.some((item) => item.role === "produce"), `${template.name} needs produce`);
}

const recoveryWorkout = workout(0);
const standardRecovery = calculateRecoveryTarget(recoveryWorkout, "standard");
const rapidRecovery = calculateRecoveryTarget({ ...recoveryWorkout, durationMinutes: 150, intensity: "hard" }, "rapid");
assert(rapidRecovery.carbs > standardRecovery.carbs, "Rapid recovery should raise carbohydrate priority after a demanding session");
assert(standardRecovery.protein >= 20 && standardRecovery.protein <= 40, "Recovery protein should remain in a practical meal-sized range");

const chickenRice = POST_WORKOUT_MEALS.find((item) => item.name === "Chicken Rice Bowl");
assert(chickenRice, "Chicken Rice Bowl fixture should exist");
const scaledChickenRice = scaleRecoveryMeal(chickenRice!, standardRecovery);
const fixedBefore = chickenRice!.ingredients.filter((item) => ![chickenRice!.primaryCarbFoodId, chickenRice!.primaryProteinFoodId].includes(item.foodId));
for (const fixed of fixedBefore) {
  const after = scaledChickenRice.ingredients.find((item) => item.food.id === fixed.foodId);
  assert(after?.grams === fixed.grams, `Scaling should not randomly change ${fixed.foodId}`);
}

const recoveryRecommendations = rankRecoveryMeals(POST_WORKOUT_MEALS, { workout: recoveryWorkout, window: "standard", profile: EMPTY_NUTRITION_PROFILE });
assert(recoveryRecommendations.length >= 5, "A standard workout should return several recovery meals");
assert(recoveryRecommendations[0].score.total >= 80, "Best recovery meal should closely fit its carbohydrate and protein targets");
const veganRecovery = rankRecoveryMeals(POST_WORKOUT_MEALS, { workout: recoveryWorkout, window: "standard", profile: { ...EMPTY_NUTRITION_PROFILE, dietaryPatterns: ["vegan"] } });
assert(veganRecovery.length > 0 && veganRecovery.every((item) => item.template.dietaryTags.includes("vegan")), "Vegan recovery recommendations must fail closed");

console.log("StrictlyFuel deterministic nutrition, recovery-meal, meal-improvement and race-fueling scenarios passed.");
