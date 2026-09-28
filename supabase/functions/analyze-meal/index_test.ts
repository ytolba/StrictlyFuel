Deno.env.set("MEAL_ANALYSIS_TEST", "1");
const { normalize } = await import("./index.ts");

const item = (overrides: Record<string, unknown>) => ({
  id: "a", name: "banana", lookupQuery: "banana raw", portionDescription: "slices", estimatedGrams: 120,
  portionLowerGrams: 95, portionUpperGrams: 150, portionBasis: "geometry", detectedCount: 9, detectedUnit: "slice",
  requiresQuantityConfirmation: false, quantityQuestion: "", quantityOptions: [], foodState: "raw",
  foodConfidence: 92, portionConfidence: 80, fallbackNutritionPer100g: { calories: 89, carbs: 22.8, protein: 1.1, fat: 0.3, fiber: 2.6 },
  ...overrides,
});
const meal = (items: unknown[]) => ({ mealName: "test", items, confidence: 80, uncertaintyPercent: 20, hasReliableScaleReference: false, captureQuality: "good", captureIssues: [], needsUserInput: false, followUpQuestion: "", followUpOptions: [], uncertainItemIds: [] });

Deno.test("a normal banana portion is kept as estimated", () => {
  const out = normalize(meal([item({})]), 1, false);
  if (out.items[0].estimatedGrams !== 120 || out.items[0].requiresQuantityConfirmation) throw new Error(JSON.stringify(out.items[0]));
});

Deno.test("an implausible single-item weight becomes a question, not a silent number", () => {
  const out = normalize(meal([item({ estimatedGrams: 1062, portionLowerGrams: 1009, portionUpperGrams: 1115 })]), 1, false);
  const banana = out.items[0];
  if (!banana.requiresQuantityConfirmation || banana.portionConfidence > 30 || !out.needsUserInput) throw new Error(JSON.stringify(banana));
});

Deno.test("an amount the member entered is trusted even when large", () => {
  const out = normalize(meal([item({ name: "cooked rice", estimatedGrams: 800, portionBasis: "user" })]), 1, true);
  if (out.items[0].requiresQuantityConfirmation) throw new Error("User-entered amount was questioned.");
});

Deno.test("an empty or broken reply produces no items", () => {
  if (normalize({}, 1, false).items.length !== 0) throw new Error("Expected no items.");
});
