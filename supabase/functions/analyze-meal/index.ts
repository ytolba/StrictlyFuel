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
          portionLowerGrams: { type: "number" },
          portionUpperGrams: { type: "number" },
          portionBasis: { type: "string", enum: ["count", "package", "geometry", "user", "unknown"] },
          detectedCount: { type: "number" },
          detectedUnit: { type: "string", enum: ["piece", "slice", "tbsp", "tsp", "cup", "unknown"] },
          requiresQuantityConfirmation: { type: "boolean" },
          quantityQuestion: { type: "string" },
          quantityOptions: { type: "array", items: { type: "string" }, maxItems: 4 },
          foodState: { type: "string", enum: ["raw", "dry", "cooked", "prepared", "unknown"] },
          foodConfidence: { type: "integer", minimum: 0, maximum: 100 },
          portionConfidence: { type: "integer", minimum: 0, maximum: 100 },
          // Last resort only: used when the food catalog has no match at all.
          fallbackNutritionPer100g: nutritionShape,
        },
        required: ["id", "name", "lookupQuery", "portionDescription", "estimatedGrams", "portionLowerGrams", "portionUpperGrams", "portionBasis", "detectedCount", "detectedUnit", "requiresQuantityConfirmation", "quantityQuestion", "quantityOptions", "foodState", "foodConfidence", "portionConfidence", "fallbackNutritionPer100g"],
      },
    },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
    uncertaintyPercent: { type: "number", minimum: 8, maximum: 65 },
    hasReliableScaleReference: { type: "boolean" },
    captureQuality: { type: "string", enum: ["good", "usable", "poor"] },
    captureIssues: { type: "array", items: { type: "string" }, maxItems: 4 },
    needsUserInput: { type: "boolean" },
    followUpQuestion: { type: "string" },
    followUpOptions: { type: "array", items: { type: "string" }, maxItems: 4 },
    uncertainItemIds: { type: "array", items: { type: "string" }, maxItems: 4 },
  },
  required: ["mealName", "items", "confidence", "uncertaintyPercent", "hasReliableScaleReference", "captureQuality", "captureIssues", "needsUserInput", "followUpQuestion", "followUpOptions", "uncertainItemIds"],
};

const INSTRUCTIONS = [
  "You are the visual evidence layer for a workout-fueling app. Identify every visible food and topping separately, then estimate edible grams. Photos may show the same plate from two angles; reconcile them as one meal and never duplicate an item across views.",
  "First count discrete items. Use count-based portions for foods with reliable standard units such as rice cakes, bread slices, whole fruit, gels, or packaged pieces. Use geometry only for amorphous foods.",
  "Return a realistic lower and upper gram bound for every item. Bounds must reflect occlusion, camera angle, thickness, and lack of scale. Never output a narrow range merely because a point estimate was requested.",
  "Use generic visible food names such as chocolate sandwich cookies, white rice, grilled chicken, or banana. Do not guess or add a brand name. Name a branded product only when its distinctive packaging or appearance makes the identity genuinely obvious, such as a clearly visible Oreo cookie.",
  "mealName must be a short plain description of the visible foods, not a guessed recipe title or restaurant product.",
  "Keep food-identification confidence separate from portion confidence.",
  "Never invent oil, butter, sauce, sugar or recipe ingredients that are not visible. However, do not merge visible toppings into their base food: nut butter, honey or syrup, dry oats, sauces, oils and spreads must each be separate items.",
  "lookupQuery must be a short generic nutrition-database query and must preserve state. Dry rolled oats and cooked oatmeal are different foods; raw rice and cooked rice are different foods.",
  "Set foodState from visible evidence. For dry flakes sprinkled as a topping use dry, not cooked.",
  "A reliable scale reference means a package with known printed dimensions, a user-supplied plate dimension, or another object whose exact size is explicitly known. A plate that merely looks typical is not reliable scale.",
  "Spreads, oils, dressings, syrup, honey, nut butter, granola, loose dry cereal and partly hidden ingredients are high-impact visual portions. Unless a package amount, measuring utensil, or user statement gives the amount, set requiresQuantityConfirmation true and give practical household-measure options.",
  "For quantity options use food-specific units, for example 1 tbsp, 2 tbsp, 3 tbsp for nut butter or honey, not small/medium/large.",
  "fallbackNutritionPer100g is a conservative last resort and is discarded whenever the app finds catalog data.",
  "Do not calculate totals.",
  "Set needsUserInput when any meaningful identity is below 70 confidence, any portion is below 65, any item requires quantity confirmation, capture quality is poor, or meal uncertainty exceeds 30 percent.",
  "When user input is needed, ask exactly one short question about the single uncertainty that would most change calories or carbohydrates. Give 2 to 4 short, mutually exclusive answer options and list the affected item ids.",
  "When confidence is adequate, return an empty followUpQuestion and empty followUpOptions and uncertainItemIds arrays.",
].join(" ");

const number = (value: unknown, max: number) => Math.min(max, Math.max(0, Number(value) || 0));
const round = (value: number, precision = 0) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

const encoder = new TextEncoder();
const base64Url = (value: Uint8Array | string) => {
  const text = typeof value === "string" ? value : String.fromCharCode(...value);
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
}

async function imageFingerprint(image: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(image));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function createRefinementToken(userId: string, image: string, secret: string) {
  const payload = base64Url(JSON.stringify({ userId, image: await imageFingerprint(image), expiresAt: Date.now() + 10 * 60_000 }));
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(payload)));
  return `${payload}.${base64Url(signature)}`;
}

async function validRefinementToken(token: string, userId: string, image: string, secret: string) {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return false;
    const signatureBytes = Uint8Array.from(decodeBase64Url(signature), (character) => character.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", await hmacKey(secret), signatureBytes, encoder.encode(payload));
    if (!valid) return false;
    const decoded = JSON.parse(decodeBase64Url(payload));
    return decoded.userId === userId && decoded.expiresAt > Date.now() && decoded.image === await imageFingerprint(image);
  } catch {
    return false;
  }
}

const HIGH_IMPACT_VISUAL_PORTION = /\b(peanut butter|almond butter|cashew butter|nut butter|seed butter|honey|maple syrup|syrup|oil|butter|dressing|sauce|spread|granola|dry oats?|rolled oats?|cereal topping)\b/i;

function defaultQuantityOptions(name: string) {
  if (/\b(peanut butter|almond butter|cashew butter|nut butter|seed butter|spread)\b/i.test(name)) return ["1 tbsp", "2 tbsp", "3 tbsp", "4 tbsp"];
  if (/\b(honey|maple syrup|syrup)\b/i.test(name)) return ["1 tsp", "1 tbsp", "2 tbsp", "3 tbsp"];
  if (/\b(dry oats?|rolled oats?|granola|cereal topping)\b/i.test(name)) return ["1 tbsp", "¼ cup", "½ cup", "¾ cup"];
  if (/\b(oil|butter|dressing|sauce)\b/i.test(name)) return ["1 tsp", "1 tbsp", "2 tbsp", "3 tbsp"];
  return [];
}

function normalize(raw: any, imageCount: number, refinement: boolean) {
  const reliableScale = raw.hasReliableScaleReference === true;
  const items = Array.isArray(raw.items) ? raw.items.slice(0, 16).map((item: any, index: number) => {
    const fallback = item.fallbackNutritionPer100g || {};
    const estimatedGrams = Math.max(1, round(number(item.estimatedGrams, 5000)));
    const portionBasis = ["count", "package", "geometry", "user", "unknown"].includes(item.portionBasis) ? item.portionBasis : "unknown";
    const highImpact = HIGH_IMPACT_VISUAL_PORTION.test(String(item.name || ""));
    const needsQuantity = Boolean(item.requiresQuantityConfirmation) || (!refinement && highImpact && !["package", "user"].includes(portionBasis));
    const denseVisual = highImpact && !["package", "user"].includes(portionBasis);
    const lowerFloor = denseVisual ? estimatedGrams * 0.5 : !reliableScale && portionBasis === "geometry" ? estimatedGrams * 0.72 : estimatedGrams * 0.9;
    const upperFloor = denseVisual ? estimatedGrams * 1.8 : !reliableScale && portionBasis === "geometry" ? estimatedGrams * 1.35 : estimatedGrams * 1.1;
    const portionLowerGrams = Math.max(1, round(Math.min(estimatedGrams, number(item.portionLowerGrams, 5000) || lowerFloor, lowerFloor)));
    const portionUpperGrams = Math.max(estimatedGrams, round(Math.max(number(item.portionUpperGrams, 5000) || upperFloor, upperFloor)));
    const portionCap = reliableScale ? 95 : imageCount > 1 ? 84 : 72;
    return {
      id: String(item.id || `item-${index + 1}`),
      name: String(item.name || "Unknown food").slice(0, 80),
      lookupQuery: String(item.lookupQuery || item.name || "").slice(0, 100),
      portionDescription: String(item.portionDescription || "Estimated portion").slice(0, 120),
      estimatedGrams,
      portionLowerGrams,
      portionUpperGrams,
      portionBasis,
      detectedCount: round(number(item.detectedCount, 100), 1),
      detectedUnit: ["piece", "slice", "tbsp", "tsp", "cup", "unknown"].includes(item.detectedUnit) ? item.detectedUnit : "unknown",
      requiresQuantityConfirmation: needsQuantity,
      quantityQuestion: needsQuantity ? String(item.quantityQuestion || `How much ${item.name || "of this item"} did you use?`).slice(0, 140) : "",
      quantityOptions: needsQuantity
        ? (Array.isArray(item.quantityOptions) && item.quantityOptions.length ? item.quantityOptions : defaultQuantityOptions(String(item.name || ""))).map((value: unknown) => String(value).slice(0, 40)).filter(Boolean).slice(0, 4)
        : [],
      foodState: ["raw", "dry", "cooked", "prepared", "unknown"].includes(item.foodState) ? item.foodState : "unknown",
      foodConfidence: round(number(item.foodConfidence, 100)),
      portionConfidence: Math.min(round(number(item.portionConfidence, 100)), portionCap, needsQuantity ? 55 : 100),
      fallbackNutritionPer100g: {
        calories: round(number(fallback.calories, 1000)), carbs: round(number(fallback.carbs, 100), 1),
        protein: round(number(fallback.protein, 100), 1), fat: round(number(fallback.fat, 100), 1),
        fiber: round(number(fallback.fiber, 50), 1),
      },
    };
  }) : [];
  const minimumUncertainty = reliableScale ? 10 : imageCount > 1 ? 18 : 26;
  const uncertaintyPercent = Math.max(number(raw.uncertaintyPercent, 65) || 30, minimumUncertainty);
  const confidenceCap = reliableScale ? 92 : imageCount > 1 ? 84 : 72;
  const confidence = Math.min(number(raw.confidence, 100), 100 - uncertaintyPercent, confidenceCap);
  const captureQuality = ["good", "usable", "poor"].includes(raw.captureQuality) ? raw.captureQuality : "usable";
  const uncertainItems = items.filter((item: any) => item.foodConfidence < 70 || item.portionConfidence < 65 || item.requiresQuantityConfirmation);
  const needsUserInput = Boolean(raw.needsUserInput) || uncertaintyPercent > 30 || uncertainItems.length > 0 || captureQuality === "poor";
  const rawIds = Array.isArray(raw.uncertainItemIds) ? raw.uncertainItemIds.map(String) : [];
  const uncertainItemIds = [...new Set([...rawIds, ...uncertainItems.map((item: any) => item.id)])]
    .filter((id) => items.some((item: any) => item.id === id))
    .slice(0, 4);
  const lowest = [...items].sort((a: any, b: any) => {
    const aRisk = (a.requiresQuantityConfirmation ? 100 : 0) + (100 - Math.min(a.foodConfidence, a.portionConfidence));
    const bRisk = (b.requiresQuantityConfirmation ? 100 : 0) + (100 - Math.min(b.foodConfidence, b.portionConfidence));
    return bRisk - aRisk;
  })[0];
  const defaultQuestion = lowest
    ? lowest.foodConfidence < lowest.portionConfidence
      ? `What is the food shown as ${lowest.name}?`
      : `About how much ${lowest.name} was on the plate?`
    : "What was the approximate size of this meal?";
  const fallbackOptions = lowest?.quantityOptions?.length ? lowest.quantityOptions : lowest?.foodConfidence < lowest?.portionConfidence
    ? []
    : ["Small serving", "Medium serving", "Large serving"];
  return {
    mealName: String(raw.mealName || "Estimated meal").slice(0, 100),
    items,
    confidence: round(confidence),
    uncertaintyPercent: round(uncertaintyPercent),
    hasReliableScaleReference: reliableScale,
    imageCount,
    captureQuality,
    captureIssues: (Array.isArray(raw.captureIssues) ? raw.captureIssues : []).map((value: unknown) => String(value).slice(0, 100)).filter(Boolean).slice(0, 4),
    needsUserInput,
    followUpQuestion: needsUserInput ? String(raw.followUpQuestion || defaultQuestion).slice(0, 180) : "",
    followUpOptions: needsUserInput
      ? (Array.isArray(raw.followUpOptions) ? raw.followUpOptions : fallbackOptions).map((value: unknown) => String(value).slice(0, 48)).filter(Boolean).slice(0, 4)
      : [],
    uncertainItemIds: needsUserInput ? uncertainItemIds : [],
    // Retained for the client type; no longer requested from the model.
    assumptions: [] as string[],
    warnings: [] as string[],
    disclaimer: "Photo portions are estimates, not measurements. Confirming high-impact amounts improves accuracy, but you can continue with the wider visual estimate.",
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return Response.json({ error: "Meal analysis has not been configured yet." }, { status: 503, headers: corsHeaders });

    const { imageBase64, imagesBase64: rawImages = [], context = "", refinementToken = "" } = await request.json();
    const images = (Array.isArray(rawImages) && rawImages.length ? rawImages : [imageBase64]).map(String).filter(Boolean).slice(0, 2);
    if (!images.length || images.some((image) => image.length > 8_000_000) || images.reduce((sum, image) => sum + image.length, 0) > 13_000_000) {
      return Response.json({ error: "Use one or two compressed meal photos under 9 MB total." }, { status: 400, headers: corsHeaders });
    }
    const imageEvidence = images.join(".");

    const userId = await callerId(request);
    if (!userId) return Response.json({ error: "Sign in before scanning a meal." }, { status: 401, headers: corsHeaders });
    const signingSecret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const isRefinement = Boolean(signingSecret && refinementToken && await validRefinementToken(String(refinementToken), userId, imageEvidence, signingSecret));
    if (!isRefinement) {
      const credit = await consumeAiCredit(request, "scan");
      if (!credit) return Response.json({ error: "We could not verify your scan allowance. Please sign in and try again." }, { status: 401, headers: corsHeaders });
      if (!credit.allowed) return limitReachedResponse(credit);
    }

    const result = await callVision({
      feature: "meal_vision",
      request,
      userId,
      apiKey,
      instructions: INSTRUCTIONS,
      userText: `Analyze ${images.length} photo${images.length === 1 ? "" : "s"} of the same meal. Identify and portion every visible food exactly as shown, reconcile duplicate views, preserve dry/cooked state, and prefer generic names. Workout context: ${String(context).slice(0, 500) || "none"}.`,
      imagesBase64: images,
      schemaName: "strictlyfuel_meal_vision",
      schema,
      // Sized for the trimmed schema: ~8 short fields per food, up to 16 foods.
      maxOutputTokens: 2600,
      reasoningEffort: "medium",
    });

    if (!result.ok) {
      return Response.json({ error: "The meal estimate could not finish. Please try the photo again." }, { status: 502, headers: corsHeaders });
    }
    const nextToken = signingSecret ? await createRefinementToken(userId, imageEvidence, signingSecret) : "";
    return Response.json({ ...normalize(JSON.parse(result.text), images.length, isRefinement), refinementToken: nextToken }, { headers: corsHeaders });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "Meal analysis failed." }, { status: 500, headers: corsHeaders });
  }
});
