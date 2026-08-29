import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { consumeAiCredit, limitReachedResponse } from "../_shared/aiCredits.ts";
import { callVision, callerId, corsHeaders } from "../_shared/ai.ts";

/**
 * Photo -> foods + portions. The one place in StrictlyFuel where a model is
 * genuinely the right tool: recognising what is on a plate and judging how much
 * of it there is cannot be done from structured data.
 *
 * Everything downstream is deterministic. The model returns names, grams and
 * two confidences; the app resolves each name against the food catalog and
 * calculates macros in code. The model is never asked to add anything up —
 * see `mealAnalysisService.ts`.
 *
 * Output is kept to what the UI actually renders. Earlier versions also asked
 * for `visualEvidence`, `preparation`, `assumptions` and `warnings`; no screen
 * ever displayed them, and on a six-item plate they were the largest part of
 * the response.
 */

const nutritionShape = {
  type: "object", additionalProperties: false,
  properties: {
    calories: { type: "number" }, carbs: { type: "number" }, protein: { type: "number" },
    fat: { type: "number" }, fiber: { type: "number" },
  },
  required: ["calories", "carbs", "protein", "fat", "fiber"],
};

const schema = {
  type: "object", additionalProperties: false,
  properties: {
    mealName: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          lookupQuery: { type: "string" },
          portionDescription: { type: "string" },
          estimatedGrams: { type: "number" },
          foodConfidence: { type: "integer", minimum: 0, maximum: 100 },
          portionConfidence: { type: "integer", minimum: 0, maximum: 100 },
          // Last resort only: used when the food catalog has no match at all.
          fallbackNutritionPer100g: nutritionShape,
        },
        required: ["id", "name", "lookupQuery", "portionDescription", "estimatedGrams", "foodConfidence", "portionConfidence", "fallbackNutritionPer100g"],
      },
    },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
    uncertaintyPercent: { type: "number", minimum: 8, maximum: 65 },
    hasReliableScaleReference: { type: "boolean" },
    needsUserInput: { type: "boolean" },
    followUpQuestion: { type: "string" },
  },
  required: ["mealName", "items", "confidence", "uncertaintyPercent", "hasReliableScaleReference", "needsUserInput", "followUpQuestion"],
};

const INSTRUCTIONS = [
  "Vision layer for a workout-fueling app. Identify each visible food separately and estimate cooked edible grams from plate geometry, count, thickness and any visible scale reference.",
  "Keep food-identification confidence separate from portion confidence.",
  "Never invent oil, butter, sauce, sugar or recipe ingredients that are not visible.",
  "lookupQuery: a short generic nutrition-database query, including cooked/raw state when visible.",
  "fallbackNutritionPer100g is a conservative last resort and is discarded whenever the app finds catalog data.",
  "Do not calculate totals. Ask one follow-up question only when portion uncertainty materially changes the result, otherwise return an empty string.",
].join(" ");

const number = (value: unknown, max: number) => Math.min(max, Math.max(0, Number(value) || 0));
const round = (value: number, precision = 0) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

function normalize(raw: any) {
  const reliableScale = raw.hasReliableScaleReference === true;
  const items = Array.isArray(raw.items) ? raw.items.slice(0, 16).map((item: any, index: number) => {
    const fallback = item.fallbackNutritionPer100g || {};
    return {
      id: String(item.id || `item-${index + 1}`),
      name: String(item.name || "Unknown food").slice(0, 80),
      lookupQuery: String(item.lookupQuery || item.name || "").slice(0, 100),
      portionDescription: String(item.portionDescription || "Estimated portion").slice(0, 120),
      estimatedGrams: Math.max(1, round(number(item.estimatedGrams, 5000))),
      foodConfidence: round(number(item.foodConfidence, 100)),
      portionConfidence: Math.min(round(number(item.portionConfidence, 100)), reliableScale ? 95 : 76),
      fallbackNutritionPer100g: {
        calories: round(number(fallback.calories, 1000)), carbs: round(number(fallback.carbs, 100), 1),
        protein: round(number(fallback.protein, 100), 1), fat: round(number(fallback.fat, 100), 1),
        fiber: round(number(fallback.fiber, 50), 1),
      },
    };
  }) : [];
  const uncertaintyPercent = Math.max(number(raw.uncertaintyPercent, 65) || 28, reliableScale ? 10 : 24);
  const confidence = Math.min(number(raw.confidence, 100), 100 - uncertaintyPercent, reliableScale ? 92 : 78);
  return {
    mealName: String(raw.mealName || "Estimated meal").slice(0, 100),
    items,
    confidence: round(confidence),
    uncertaintyPercent: round(uncertaintyPercent),
    hasReliableScaleReference: reliableScale,
    needsUserInput: Boolean(raw.needsUserInput) || items.some((item: any) => item.portionConfidence < 65),
    followUpQuestion: String(raw.followUpQuestion || (!reliableScale ? "What size was the plate or bowl, and roughly how much of the largest food did you serve?" : "")).slice(0, 180),
    // Retained for the client type; no longer requested from the model.
    assumptions: [] as string[],
    warnings: [] as string[],
    disclaimer: "Photo portions are estimates. Tap any food to correct it before scoring.",
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return Response.json({ error: "Meal analysis has not been configured yet." }, { status: 503, headers: corsHeaders });

    const { imageBase64, context = "" } = await request.json();
    const image = String(imageBase64 || "");
    if (!image || image.length > 8_000_000) return Response.json({ error: "Use one compressed meal photo under 6 MB." }, { status: 400, headers: corsHeaders });

    const credit = await consumeAiCredit(request, "scan");
    if (!credit) return Response.json({ error: "We could not verify your scan allowance. Please sign in and try again." }, { status: 401, headers: corsHeaders });
    if (!credit.allowed) return limitReachedResponse(credit);

    const result = await callVision({
      feature: "meal_vision",
      request,
      userId: await callerId(request),
      apiKey,
      instructions: INSTRUCTIONS,
      userText: `Identify and portion every visible food. Workout context: ${String(context).slice(0, 300) || "none"}.`,
      imageBase64: image,
      schemaName: "strictlyfuel_meal_vision",
      schema,
      // Sized for the trimmed schema: ~8 short fields per food, up to 16 foods.
      maxOutputTokens: 1800,
    });

    if (!result.ok) {
      return Response.json({ error: "The meal estimate could not finish. Please try the photo again." }, { status: 502, headers: corsHeaders });
    }
    return Response.json(normalize(JSON.parse(result.text)), { headers: corsHeaders });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "Meal analysis failed." }, { status: 500, headers: corsHeaders });
  }
});
