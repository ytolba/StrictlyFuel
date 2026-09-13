import { FUEL_FOODS } from "../src/data/fuelFoods";
import { calculateHealthScore } from "../src/logic/healthScore";
import { householdAmountToGrams } from "../src/logic/householdMeasures";
import { selectTodayWorkouts } from "../src/logic/healthWorkouts";
import { availabilityMixForMinutes, calculateFuelTarget } from "../src/logic/fuelCalculator";
import { rankMealAdjustments } from "../src/logic/mealImprovement";
import { scoreMeal } from "../src/logic/mealScore";
import { calculateMealMacros, classifyCarbSpeed, validateMacroCalories } from "../src/logic/nutritionEngine";
import { buildRaceFuelPlan } from "../src/logic/raceFueling";
import { raceById } from "../src/data/races";
import { POST_WORKOUT_MEALS } from "../src/data/postWorkoutMeals";
import { calculateRecoveryTarget, rankRecoveryMeals, scaleRecoveryMeal } from "../src/logic/recoveryNutrition";
import { EMPTY_NUTRITION_PROFILE } from "../src/types/nutritionProfile";
import type { FuelFood, FuelTarget, MealIngredient, MealMacros, WorkoutDraft } from "../src/types/fuel";

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
const scoredCarbs = (carbs: number, carbTarget = 80) => {
  const macros: MealMacros = {
    calories: carbs * 4,
    carbs,
    protein: 10,
    fat: 4,
    fiber: 2,
    fastCarbs: carbs * 0.4,
    mediumCarbs: carbs * 0.4,
    slowCarbs: carbs * 0.2,
    unclassifiedCarbs: 0,
  };
  return scoreMeal(macros, target(carbTarget), workout());
};

const exactFuelScore = scoredCarbs(80);
const mildShortfallScore = scoredCarbs(64);
const halfTargetScore = scoredCarbs(40);
const severeShortfallScore = scoredCarbs(16);
const extremeExcessScore = scoredCarbs(160);
assert(exactFuelScore.total >= 90, "A meal inside the carb range should still be capable of an excellent Fuel Score");
assert(mildShortfallScore.total >= 55 && mildShortfallScore.total < 78, "A meaningful but fixable carb shortfall should land below Strong fit");
assert(halfTargetScore.total <= 40, "A meal at half the carb target must score low, not near 50");
assert(severeShortfallScore.total <= 20 && severeShortfallScore.headline === "Far from your fuel target", "A meal nowhere near the carb target must receive a very low score and clear headline");
assert(extremeExcessScore.total <= 40, "An extreme carbohydrate excess must also receive a low workout-specific score");
assert(severeShortfallScore.total < halfTargetScore.total && halfTargetScore.total < mildShortfallScore.total && mildShortfallScore.total < exactFuelScore.total, "Fuel Score should improve monotonically as carbohydrate amount approaches target");

const easyShortRun = calculateFuelTarget({ ...workout(90), durationMinutes: 30, intensity: "easy" });
const moderateRun = calculateFuelTarget({ ...workout(90), durationMinutes: 75, intensity: "moderate" });
const hardRun = calculateFuelTarget({ ...workout(90), durationMinutes: 75, intensity: "hard", heartRateZones: [3, 4, 5] });
const laterHardRun = calculateFuelTarget({ ...workout(180), durationMinutes: 75, intensity: "hard", heartRateZones: [3, 4, 5] });
const sixtyMinuteRun = calculateFuelTarget({ ...workout(90), durationMinutes: 60 });
const sixtyOneMinuteRun = calculateFuelTarget({ ...workout(90), durationMinutes: 61 });
assert(easyShortRun.carbTarget < moderateRun.carbTarget, "A short easy workout should not receive the same carb target as a longer moderate workout");
assert(hardRun.carbTarget > moderateRun.carbTarget, "Hard work and high HR zones should raise the carb target");
assert(laterHardRun.carbTarget > hardRun.carbTarget, "More digestion time should permit a larger pre-workout target for the same demanding session");
assert(Math.abs(sixtyOneMinuteRun.carbTarget - sixtyMinuteRun.carbTarget) <= 5, "The target must not jump sharply at a duration boundary");
assert(moderateRun.carbRange[0] <= moderateRun.carbTarget && moderateRun.carbRange[1] >= moderateRun.carbTarget, "The personalized target must remain inside its working range");
assert((moderateRun.carbRange[1] - moderateRun.carbRange[0]) / moderateRun.carbTarget <= 0.35, "The working range should stay narrow enough for Fuel Score to detect a real miss");
const mix60 = availabilityMixForMinutes(60);
const mix61 = availabilityMixForMinutes(61);
const mix30 = availabilityMixForMinutes(30);
const mix180 = availabilityMixForMinutes(180);
assert(Math.max(...mix60.map((value, index) => Math.abs(value - mix61[index]))) < 0.01, "Carb availability targets must change smoothly rather than jump at timing boundaries");
assert(mix30[0] > mix180[0] && mix30[2] < mix180[2], "Closer workouts should favor faster availability while earlier meals can include more structured carbohydrate");
assert(Math.abs(mix61.reduce((sum, value) => sum + value, 0) - 1) < 0.001, "Availability target shares must always sum to 100%");

assert(householdAmountToGrams("Honey", "1 tbsp")?.grams === 21, "One tablespoon of honey must convert to 21g");
assert(householdAmountToGrams("Honey", "1 tsp")?.grams === 7, "One teaspoon of honey must convert to 7g");
assert(householdAmountToGrams("Dry rolled oats", "1/2 cup")?.grams === 40, "Half a cup of dry oats must convert to 40g");
assert(householdAmountToGrams("Cooked white rice", "1 cup")?.grams === 158, "One cup of cooked rice must convert to 158g");
assert(householdAmountToGrams("Banana", "1 medium banana")?.grams === 118, "A medium banana must use the food-specific reference portion");
assert(householdAmountToGrams("Peanut butter", "2 tbsp")?.grams === 32, "Two tablespoons of nut butter must convert to 32g");
assert(householdAmountToGrams("Olive oil", "1 tbsp")?.grams === 13.5, "One tablespoon of oil must use oil density");
assert(householdAmountToGrams("Plain rice cakes", "2 pieces")?.grams === 18, "Two visible rice cakes must resolve by count rather than visual volume");
assert(householdAmountToGrams("Unknown food", "1 tbsp") === null, "Unknown volume measures must fail closed instead of guessing grams");

// Regression fixture for the photographed rice-cake meal that exposed the old
// architecture's undercount. Vision still has to identify the foods, but once
// amounts are confirmed the database layer must produce a plausible total and
// must never treat dry oat flakes as cooked oatmeal.
const photographedRiceCakeMeal = calculateMealMacros([
  ingredient(food("rice-cakes"), 18),
  ingredient(food("banana"), 118),
  ingredient(food("peanut-butter"), 32),
  ingredient(food("honey"), 21),
  ingredient(food("dry-rolled-oats"), 20),
]);
assert(photographedRiceCakeMeal.carbs >= 70 && photographedRiceCakeMeal.carbs <= 90, "The confirmed rice-cake meal should land near 80g carbs, not the old 44g underestimate");
assert(photographedRiceCakeMeal.calories >= 450 && photographedRiceCakeMeal.calories <= 600, "Dense visible toppings must contribute their full database-derived energy");
assert(food("dry-rolled-oats").per100g.carbs > food("oats").per100g.carbs * 4, "Dry oats must stay distinct from cooked oatmeal in catalog matching");
const todayReference = new Date(2026, 7, 30, 12, 0, 0);
const overlappingWorkouts = selectTodayWorkouts([
  { id: "overnight", startDate: new Date(2026, 7, 29, 23, 45).toISOString(), endDate: new Date(2026, 7, 30, 0, 30).toISOString() },
  { id: "latest", startDate: new Date(2026, 7, 30, 17, 0).toISOString(), endDate: new Date(2026, 7, 30, 18, 0).toISOString() },
  { id: "yesterday", startDate: new Date(2026, 7, 29, 10, 0).toISOString(), endDate: new Date(2026, 7, 29, 11, 0).toISOString() },
], todayReference);
assert(overlappingWorkouts.map((item) => item.id).join(",") === "latest,overnight", "Today detection must use local-day overlap and prefer the most recent workout");

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

const candyBeltsSpeed = classifyCarbSpeed({ name: "Sour candy belts", per100g: { calories: 370, carbs: 88, sugar: 62, protein: 1, fat: 0, fiber: 0 } });
assert(candyBeltsSpeed.tier === "fast" && candyBeltsSpeed.confidence >= 90, "Candy belts must classify as fast, never slow");
const fattyCandySpeed = classifyCarbSpeed({ name: "Chocolate candy", per100g: { calories: 540, carbs: 60, sugar: 50, protein: 7, fat: 30, fiber: 3 } });
assert(fattyCandySpeed.tier === "medium", "A high-fat chocolate candy should be mixed/medium rather than falsely fast or slow");
const unknownSpeed = classifyCarbSpeed({ name: "Unidentified plated item", per100g: { calories: 200, carbs: 30, protein: 5, fat: 5, fiber: 2 } });
assert(unknownSpeed.tier === "unknown", "Incomplete food evidence must remain unclassified instead of defaulting to medium");
const unknownFood: FuelFood = { ...custom("unknown-carb", "Unidentified plated item", "grain", 30, 5, 5, 2), carbSpeed: "unknown" };
const unknownMacros = calculateMealMacros([ingredient(unknownFood)]);
assert(unknownMacros.unclassifiedCarbs === 30 && unknownMacros.fastCarbs + unknownMacros.mediumCarbs + unknownMacros.slowCarbs === 0, "Unknown carbs must stay visibly unclassified");
const candyFood: FuelFood = { ...custom("candy-belts", "Sour candy belts", "sports", 88, 1, 0, 0), carbSpeed: "fast", carbSpeedConfidence: 95, per100g: { calories: 356, carbs: 88, sugar: 70, protein: 1, fat: 0, fiber: 0 } };
const candyMacros = calculateMealMacros([ingredient(candyFood)]);
assert(candyMacros.fastCarbs > candyMacros.mediumCarbs * 3 && candyMacros.slowCarbs === 0, "Concentrated low-fat candy should remain predominantly fast after whole-meal modelling");
const polyolFood: FuelFood = { ...custom("polyol-chews", "Sugar-free chews", "sports", 80, 0, 0, 0), carbSpeed: "unknown", source: "label", carbSpeedConfidence: 0, per100g: { calories: 80, carbs: 80, protein: 0, fat: 0, fiber: 0, sugarAlcohols: 60, sugarAlcoholType: "maltitol" } };
const polyolMacros = calculateMealMacros([ingredient(polyolFood)]);
assert(polyolMacros.availableCarbs === 20 && polyolMacros.unclassifiedCarbs === 20, "Polyols must remain in label carbs but must not count as dependable workout carbohydrate");
const whiteBreadOnly = calculateMealMacros([ingredient(food("white-bread"), 100)]);
const oliveOil = custom("oil", "Olive oil", "fat", 0, 0, 100, 0);
const whiteBreadWithFat = calculateMealMacros([ingredient(food("white-bread"), 100), ingredient(oliveOil, 20)]);
assert(whiteBreadWithFat.fastCarbs < whiteBreadOnly.fastCarbs && whiteBreadWithFat.slowCarbs > whiteBreadOnly.slowCarbs, "Fat elsewhere on the plate should modestly shift the whole-meal availability estimate later");
const closeTarget: FuelTarget = { ...target(80), fastCarbs: 72, mediumCarbs: 8, slowCarbs: 0 };
const allFast: MealMacros = { calories: 340, carbs: 80, protein: 5, fat: 2, fiber: 1, fastCarbs: 80, mediumCarbs: 0, slowCarbs: 0, unclassifiedCarbs: 0, availableCarbs: 80, carbSpeedConfidence: 100 };
const allSlow: MealMacros = { ...allFast, fastCarbs: 0, slowCarbs: 80 };
assert(scoreMeal(allFast, closeTarget, workout(30)).total > scoreMeal(allSlow, closeTarget, workout(30)).total + 12, "A fast-availability meal should clearly outrank an equally sized slow meal close to training");
const uncertainScore = scoreMeal({ ...allFast, fastCarbs: 0, unclassifiedCarbs: 80, carbSpeedConfidence: 0 }, closeTarget, workout(30));
assert(uncertainScore.provisional === true && uncertainScore.confidence === 0, "Unknown availability must produce an explicit provisional score instead of a hidden guess");

const wholeMeal = [ingredient(food("white-rice"), 180), ingredient(food("chicken"), 140), ingredient(custom("avocado", "Avocado", "fat", 9, 2, 15, 7), 70), ingredient(custom("broccoli", "Broccoli", "fruit", 7, 3, 0, 3), 100)];
assert(calculateHealthScore(wholeMeal, calculateMealMacros(wholeMeal)).score >= 85, "Balanced whole-food meal should earn a strong Health Score");
const additiveHeavyGel: FuelFood = { ...food("carb-gel"), ingredientsText: "glucose syrup, maltodextrin, artificial flavor, red 40, potassium sorbate, acesulfame potassium" };
const gelMeal = [ingredient(additiveHeavyGel, 64)];
assert(calculateHealthScore(gelMeal, calculateMealMacros(gelMeal)).score < 65, "Highly formulated fuel should score lower for everyday health quality");
const smallBanana = [ingredient(food("banana"), 20)];
const largeBanana = [ingredient(food("banana"), 500)];
assert(calculateHealthScore(smallBanana, calculateMealMacros(smallBanana)).score === calculateHealthScore(largeBanana, calculateMealMacros(largeBanana)).score, "Health Score must not change with portion size or macros");

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
const completedHealthWorkout = calculateRecoveryTarget({
  ...recoveryWorkout,
  durationMinutes: 60,
  intensity: "moderate",
  completedWorkout: { source: "apple_health", id: "health-workout", completedAt: "2026-08-30T10:00:00.000Z", activeCalories: 520, averageHeartRate: 152, maxHeartRate: 182 },
}, "standard");
assert(completedHealthWorkout.carbs > standardRecovery.carbs, "A sustained completed Health workout should receive a higher recovery carbohydrate target");

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
