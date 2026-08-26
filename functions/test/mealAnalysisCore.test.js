const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeMealAnalysis } = require("../mealAnalysisCore");

test("sums meal components and creates uncertainty ranges", () => {
  const result = normalizeMealAnalysis({ mealName: "Chicken rice bowl", confidence: 74, uncertaintyPercent: 20, hasReliableScaleReference: true, needsUserInput: false, assumptions: [], warnings: [], items: [
    { id: "1", name: "Rice", portionDescription: "1 cup", estimatedGrams: 180, calories: 240, carbs: 52, protein: 5, fat: 1, confidence: 80, visualEvidence: "bowl base" },
    { id: "2", name: "Chicken", portionDescription: "5 oz", estimatedGrams: 142, calories: 235, carbs: 0, protein: 44, fat: 5, confidence: 75, visualEvidence: "sliced pieces" },
  ] });
  assert.equal(result.totals.carbs, 52);
  assert.equal(result.totals.protein, 49);
  assert.deepEqual(result.ranges.calories, [380, 570]);
});

test("corrects calorie totals that conflict materially with macros", () => {
  const result = normalizeMealAnalysis({ confidence: 50, uncertaintyPercent: 25, items: [{ id: "1", name: "Food", calories: 100, carbs: 50, protein: 10, fat: 10 }] });
  assert.equal(result.totals.calories, 330);
});

test("clamps invalid values and requests input for an empty result", () => {
  const result = normalizeMealAnalysis({ confidence: 200, uncertaintyPercent: 2, items: [] });
  assert.equal(result.confidence, 70);
  assert.equal(result.needsUserInput, true);
  assert.deepEqual(result.ranges.calories, [0, 0]);
});
