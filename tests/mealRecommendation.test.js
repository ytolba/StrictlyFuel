/**
 * Recommended meals must work with zero AI, so these run against the real
 * catalog and the real ranking with no network and no model available.
 *
 * Run with `npm test` (transpiles src/ with tsc, then node --test).
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { rankMealTemplates, isEligible, MIN_RECOMMENDATION_SCORE } = require("../.test-build/logic/mealRecommendation.js");
const { CURATED_MEAL_TEMPLATES } = require("../.test-build/data/mealTemplates.js");
const { calculateFuelTarget } = require("../.test-build/logic/fuelCalculator.js");

const EMPTY_PROFILE = { sensitivities: [], conditions: [], dietaryPatterns: [] };

const workoutFor = (overrides = {}) => ({
  id: "test-workout",
  activityType: "running",
  durationMinutes: 60,
  startsInMinutes: 90,
  bodyWeightKg: 72,
  intensity: "moderate",
  heartRateZones: [],
  createdAt: new Date().toISOString(),
  ...overrides,
});

const rank = (workout, profile = EMPTY_PROFILE) =>
  rankMealTemplates(CURATED_MEAL_TEMPLATES, { target: calculateFuelTarget(workout), workout, profile });

test("the bundled catalog is non-trivial", () => {
  assert.ok(CURATED_MEAL_TEMPLATES.length > 100, "expected a real catalog to rank against");
});

test("a standard session returns usable recommendations with no AI", () => {
  const results = rank(workoutFor());
  assert.ok(results.length > 0, "no eligible meals for a standard 60-minute run");
  for (const meal of results) {
    assert.ok(meal.score.total >= MIN_RECOMMENDATION_SCORE, `${meal.template.name} scored below the floor`);
    assert.ok(meal.ingredients.length > 0, `${meal.template.name} has no ingredients`);
    assert.ok(meal.macros.carbs > 0, `${meal.template.name} has no carbs`);
  }
});

test("results are ordered best-first", () => {
  const ranks = rank(workoutFor()).map((meal) => meal.rank);
  const sorted = [...ranks].sort((a, b) => b - a);
  assert.deepEqual(ranks, sorted);
});

test("no two recommendations share a name", () => {
  const names = rank(workoutFor()).map((meal) => meal.template.name);
  assert.equal(new Set(names).size, names.length);
});

test("dairy sensitivity removes every dairy meal", () => {
  const profile = { ...EMPTY_PROFILE, sensitivities: ["dairy"] };
  const results = rank(workoutFor(), profile);
  assert.ok(results.length > 0, "a dairy-free athlete should still get options");
  assert.equal(results.filter((meal) => meal.template.allergens.includes("dairy")).length, 0);
});

test("gluten and celiac are both honoured", () => {
  for (const marker of [{ sensitivities: ["gluten"] }, { conditions: ["celiac"] }]) {
    const results = rank(workoutFor(), { ...EMPTY_PROFILE, ...marker });
    assert.equal(
      results.filter((meal) => meal.template.allergens.includes("gluten")).length,
      0,
      `gluten meal survived ${JSON.stringify(marker)}`
    );
  }
});

test("vegan excludes anything not tagged vegan", () => {
  const results = rank(workoutFor(), { ...EMPTY_PROFILE, dietaryPatterns: ["vegan"] });
  assert.ok(results.length > 0, "a vegan athlete should still get options");
  for (const meal of results) assert.ok(meal.template.dietaryTags.includes("vegan"), meal.template.name);
});

test("a short session never gets a meal built for a long one", () => {
  const workout = workoutFor({ durationMinutes: 20, startsInMinutes: 30 });
  for (const meal of rank(workout)) {
    assert.ok(meal.template.minWorkoutMinutes <= 20, `${meal.template.name} needs a longer session`);
  }
});

test("eligibility is an exclusion, not a preference", () => {
  const dairyMeal = CURATED_MEAL_TEMPLATES.find((meal) => meal.template ? false : meal.allergens.includes("dairy"));
  assert.ok(dairyMeal, "expected at least one dairy meal in the catalog");
  assert.equal(isEligible(dairyMeal, { ...EMPTY_PROFILE, sensitivities: ["lactose"] }, workoutFor()), false);
  assert.equal(isEligible(dairyMeal, EMPTY_PROFILE, workoutFor()), true);
});

test("carb targets scale the same meal differently", () => {
  const easy = rank(workoutFor({ durationMinutes: 40, intensity: "easy" }));
  const hard = rank(workoutFor({ durationMinutes: 150, intensity: "hard" }));
  assert.ok(easy.length && hard.length, "both sessions should produce recommendations");
  const easyCarbs = easy[0].macros.carbs;
  const hardCarbs = hard[0].macros.carbs;
  assert.ok(hardCarbs > easyCarbs, `expected a bigger meal for the harder session (${hardCarbs} vs ${easyCarbs})`);
});

test("a profile that excludes everything fails closed, not loudly", () => {
  const results = rank(workoutFor(), {
    sensitivities: ["dairy", "gluten"],
    conditions: ["celiac"],
    dietaryPatterns: ["vegan", "vegetarian", "halal"],
  });
  assert.ok(Array.isArray(results), "must still return an array");
});
