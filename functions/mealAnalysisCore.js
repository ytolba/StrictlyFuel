const round = (value, precision = 0) => {
  const factor = 10 ** precision;
  return Math.round(Number(value || 0) * factor) / factor;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value || 0)));

const MEAL_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    mealName: { type: "string" },
    items: { type: "array", items: { type: "object", additionalProperties: false, properties: {
      id: { type: "string" }, name: { type: "string" }, portionDescription: { type: "string" }, estimatedGrams: { type: "number" }, calories: { type: "number" }, carbs: { type: "number" }, protein: { type: "number" }, fat: { type: "number" }, confidence: { type: "integer", minimum: 0, maximum: 100 }, visualEvidence: { type: "string" },
    }, required: ["id", "name", "portionDescription", "estimatedGrams", "calories", "carbs", "protein", "fat", "confidence", "visualEvidence"] } },
    confidence: { type: "integer", minimum: 0, maximum: 100 }, uncertaintyPercent: { type: "number", minimum: 10, maximum: 60 }, hasReliableScaleReference: { type: "boolean" }, needsUserInput: { type: "boolean" }, followUpQuestion: { type: "string" }, assumptions: { type: "array", items: { type: "string" } }, warnings: { type: "array", items: { type: "string" } },
  },
  required: ["mealName", "items", "confidence", "uncertaintyPercent", "hasReliableScaleReference", "needsUserInput", "followUpQuestion", "assumptions", "warnings"],
};

function buildMealRequest(imageBase64, context = "", model = "gpt-5.6-sol") {
  return {
    model, store: false, reasoning: { effort: "high" }, max_output_tokens: 6000,
    instructions: "You are a conservative sports-nutrition image analyst. Identify only visible foods. Estimate portions from reliable visual scale cues, perspective, depth, preparation method, and likely hidden oils or sauces. Calibrate against realistic cooked serving weights and do not mistake spread-out food or plate coverage for dense volume. Never claim precision the photo cannot support. Split mixed meals into components. Calories must be consistent with 4 kcal/g carbohydrate, 4 kcal/g protein, and 9 kcal/g fat. Confidence fields are integer percentages from 0 to 100: output 65 for 65%, never 0.65 or 1. Set hasReliableScaleReference false unless a known-size object, package label, or user-provided plate size makes scale trustworthy. If scale is not reliable, set needsUserInput true and ask about the one or two portions with the greatest calorie impact. Return no medical advice.",
    input: [{ role: "user", content: [
      { type: "input_text", text: `Estimate this meal for an athlete. User context: ${String(context || "No additional context.").slice(0, 500)} Include every visible food, realistic uncertainty, assumptions, and one high-value follow-up question when needed.` },
      { type: "input_image", image_url: `data:image/jpeg;base64,${imageBase64}`, detail: "high" },
    ] }],
    text: { format: { type: "json_schema", name: "strictlyfuel_meal_analysis", strict: true, schema: MEAL_SCHEMA } },
  };
}

function normalizeMealAnalysis(raw) {
  const items = Array.isArray(raw.items) ? raw.items.map((item, index) => ({
    id: String(item.id || `item-${index + 1}`),
    name: String(item.name || "Unknown food").slice(0, 80),
    portionDescription: String(item.portionDescription || "Estimated portion").slice(0, 120),
    estimatedGrams: round(clamp(item.estimatedGrams, 0, 5000)),
    calories: round(clamp(item.calories, 0, 5000)),
    carbs: round(clamp(item.carbs, 0, 1000), 1),
    protein: round(clamp(item.protein, 0, 1000), 1),
    fat: round(clamp(item.fat, 0, 1000), 1),
    confidence: round(clamp(item.confidence, 0, 100)),
    visualEvidence: String(item.visualEvidence || "").slice(0, 180),
  })) : [];

  const summed = items.reduce((total, item) => ({
    calories: total.calories + item.calories,
    carbs: total.carbs + item.carbs,
    protein: total.protein + item.protein,
    fat: total.fat + item.fat,
  }), { calories: 0, carbs: 0, protein: 0, fat: 0 });

  const macroCalories = summed.carbs * 4 + summed.protein * 4 + summed.fat * 9;
  const reportedCalories = summed.calories;
  const difference = reportedCalories > 0 ? Math.abs(macroCalories - reportedCalories) / reportedCalories : 0;
  const correctedCalories = difference > 0.18 ? macroCalories : reportedCalories;
  const hasReliableScaleReference = raw.hasReliableScaleReference === true;
  const uncertaintyPercent = clamp(Math.max(raw.uncertaintyPercent || 25, hasReliableScaleReference ? 15 : 30), 10, 60);
  const uncertainty = uncertaintyPercent / 100;
  const calibratedConfidence = Math.min(clamp(raw.confidence, 0, 100), 100 - uncertaintyPercent, hasReliableScaleReference ? 90 : 78);
  const needsUserInput = Boolean(raw.needsUserInput) || items.length === 0 || !hasReliableScaleReference || calibratedConfidence < 75;
  const followUpQuestion = String(raw.followUpQuestion || (!hasReliableScaleReference && items.length ? "What size was the plate, and roughly how much of the largest carb or protein portion did you serve?" : "")).slice(0, 180);

  return {
    mealName: String(raw.mealName || "Estimated meal").slice(0, 100),
    items,
    totals: {
      calories: round(correctedCalories),
      carbs: round(summed.carbs, 1),
      protein: round(summed.protein, 1),
      fat: round(summed.fat, 1),
    },
    ranges: {
      calories: [round(correctedCalories * (1 - uncertainty)), round(correctedCalories * (1 + uncertainty))],
      carbs: [round(summed.carbs * (1 - uncertainty), 1), round(summed.carbs * (1 + uncertainty), 1)],
      protein: [round(summed.protein * (1 - uncertainty), 1), round(summed.protein * (1 + uncertainty), 1)],
      fat: [round(summed.fat * (1 - uncertainty), 1), round(summed.fat * (1 + uncertainty), 1)],
    },
    confidence: round(calibratedConfidence),
    needsUserInput,
    followUpQuestion,
    assumptions: Array.isArray(raw.assumptions) ? raw.assumptions.slice(0, 8).map((value) => String(value).slice(0, 180)) : [],
    warnings: Array.isArray(raw.warnings) ? raw.warnings.slice(0, 5).map((value) => String(value).slice(0, 180)) : [],
    disclaimer: "Photo estimates are approximate. Confirm portions before logging.",
  };
}

module.exports = { buildMealRequest, normalizeMealAnalysis };
