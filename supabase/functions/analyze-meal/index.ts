import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { consumeAiCredit, corsHeaders, limitReachedResponse } from "../_shared/aiCredits.ts";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    mealName: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" }, name: { type: "string" }, portionDescription: { type: "string" },
          estimatedGrams: { type: "number" }, calories: { type: "number" }, carbs: { type: "number" },
          protein: { type: "number" }, fat: { type: "number" }, fiber: { type: "number" },
          confidence: { type: "integer", minimum: 0, maximum: 100 }, visualEvidence: { type: "string" },
        },
        required: ["id", "name", "portionDescription", "estimatedGrams", "calories", "carbs", "protein", "fat", "fiber", "confidence", "visualEvidence"],
      },
    },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
    uncertaintyPercent: { type: "number", minimum: 10, maximum: 60 },
    hasReliableScaleReference: { type: "boolean" }, needsUserInput: { type: "boolean" },
    followUpQuestion: { type: "string" }, assumptions: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["mealName", "items", "confidence", "uncertaintyPercent", "hasReliableScaleReference", "needsUserInput", "followUpQuestion", "assumptions", "warnings"],
};

const number = (value: unknown, max: number) => Math.min(max, Math.max(0, Number(value) || 0));
const round = (value: number, precision = 0) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

function normalize(raw: any) {
  const items = Array.isArray(raw.items) ? raw.items.slice(0, 16).map((item: any, index: number) => ({
    id: String(item.id || `item-${index + 1}`), name: String(item.name || "Unknown food").slice(0, 80),
    portionDescription: String(item.portionDescription || "Estimated portion").slice(0, 120),
    estimatedGrams: round(number(item.estimatedGrams, 5000)), calories: round(number(item.calories, 5000)),
    carbs: round(number(item.carbs, 1000), 1), protein: round(number(item.protein, 1000), 1),
    fat: round(number(item.fat, 1000), 1), fiber: round(number(item.fiber, 500), 1),
    confidence: round(number(item.confidence, 100)), visualEvidence: String(item.visualEvidence || "").slice(0, 180),
  })) : [];
  const totals = items.reduce((sum: any, item: any) => ({
    calories: sum.calories + item.calories, carbs: sum.carbs + item.carbs, protein: sum.protein + item.protein,
    fat: sum.fat + item.fat, fiber: sum.fiber + item.fiber,
  }), { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0 });
  const macroCalories = totals.carbs * 4 + totals.protein * 4 + totals.fat * 9;
  if (totals.calories && Math.abs(macroCalories - totals.calories) / totals.calories > 0.2) totals.calories = macroCalories;
  const reliableScale = raw.hasReliableScaleReference === true;
  const uncertaintyPercent = Math.max(number(raw.uncertaintyPercent, 60) || 28, reliableScale ? 14 : 28);
  const confidence = Math.min(number(raw.confidence, 100), 100 - uncertaintyPercent, reliableScale ? 90 : 76);
  const range = (value: number) => [round(value * (1 - uncertaintyPercent / 100), 1), round(value * (1 + uncertaintyPercent / 100), 1)];
  return {
    mealName: String(raw.mealName || "Estimated meal").slice(0, 100), items,
    totals: { calories: round(totals.calories), carbs: round(totals.carbs, 1), protein: round(totals.protein, 1), fat: round(totals.fat, 1), fiber: round(totals.fiber, 1) },
    ranges: { calories: range(totals.calories).map(Math.round), carbs: range(totals.carbs), protein: range(totals.protein), fat: range(totals.fat), fiber: range(totals.fiber) },
    confidence: round(confidence), needsUserInput: Boolean(raw.needsUserInput) || !reliableScale || confidence < 75,
    followUpQuestion: String(raw.followUpQuestion || (!reliableScale ? "What size was the plate, and roughly how much of the largest carb portion did you serve?" : "")).slice(0, 180),
    assumptions: Array.isArray(raw.assumptions) ? raw.assumptions.slice(0, 8) : [], warnings: Array.isArray(raw.warnings) ? raw.warnings.slice(0, 5) : [],
    disclaimer: "Photo estimates are approximate. Confirm every food and portion before logging.",
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

    // Spend the credit before calling the model. The client keeps its own
    // counter for instant UI, but this is the gate that actually holds:
    // reinstalling the app resets local storage, not the usage ledger.
    const credit = await consumeAiCredit(request, "scan");
    if (!credit) return Response.json({ error: "We could not verify your scan allowance. Please sign in and try again." }, { status: 401, headers: corsHeaders });
    if (!credit.allowed) return limitReachedResponse(credit);
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MEAL_MODEL") || "gpt-5.6-luna", store: false,
        reasoning: { effort: "low" }, max_output_tokens: 4500,
        instructions: "You estimate visible meals for pre-workout planning. Identify only foods supported by visual evidence. Split mixed dishes into useful components. Estimate realistic cooked weights using plate geometry, depth, preparation, and scale cues. Account for visible or strongly implied oils and sauces, but label assumptions. Keep calories consistent with macros. Never invent precision. If no reliable scale object is visible, require a brief portion confirmation. This is a practical estimate, not medical advice.",
        input: [{ role: "user", content: [
          { type: "input_text", text: `Estimate every visible component and portion. Workout context: ${String(context).slice(0, 700) || "Not provided"}. Give the most useful follow-up question when scale is uncertain.` },
          { type: "input_image", image_url: `data:image/jpeg;base64,${image}`, detail: "high" },
        ] }],
        text: { format: { type: "json_schema", name: "strictlyfuel_meal", strict: true, schema } },
      }),
      signal: AbortSignal.timeout(55_000),
    });
    if (!response.ok) {
      console.error("OpenAI meal response", response.status, (await response.text()).slice(0, 600));
      return Response.json({ error: "The meal estimate could not finish. Please try the photo again." }, { status: 502, headers: corsHeaders });
    }
    const payload = await response.json();
    const outputText = payload.output_text || payload.output?.flatMap((item: any) => item.content || []).find((part: any) => part.type === "output_text")?.text;
    if (!outputText) throw new Error("No meal estimate was returned.");
    return Response.json(normalize(JSON.parse(outputText)), { headers: corsHeaders });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "Meal analysis failed." }, { status: 500, headers: corsHeaders });
  }
});
