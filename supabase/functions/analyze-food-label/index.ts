import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { consumeAiCredit, limitReachedResponse } from "../_shared/aiCredits.ts";
import { callVision, corsHeaders } from "../_shared/ai.ts";

const labelSchema = {
  type: "object", additionalProperties: false,
  properties: {
    productName: { type: "string" }, brand: { type: "string" }, barcode: { type: "string" },
    servingLabel: { type: "string" }, servingGrams: { type: "number" },
    caloriesPerServing: { type: "number" }, carbsPerServing: { type: "number" }, proteinPerServing: { type: "number" },
    fatPerServing: { type: "number" }, fiberPerServing: { type: "number" }, sugarPerServing: { type: "number" },
    sugarAlcoholsPerServing: { type: "number" },
    sugarAlcoholType: { type: "string", enum: ["erythritol", "mannitol", "isomalt", "lactitol", "maltitol", "xylitol", "sorbitol", "hydrogenated_starch_hydrolysates", "unknown"] },
    allulosePerServing: { type: "number" },
    sodiumMgPerServing: { type: "number" }, ingredientsText: { type: "string" },
    carbSpeed: { type: "string", enum: ["fast", "medium", "slow"] }, carbSpeedReason: { type: "string" },
    confidence: { type: "integer", minimum: 0, maximum: 100 }, needsCorrection: { type: "boolean" },
  },
  required: ["productName", "brand", "barcode", "servingLabel", "servingGrams", "caloriesPerServing", "carbsPerServing", "proteinPerServing", "fatPerServing", "fiberPerServing", "sugarPerServing", "sugarAlcoholsPerServing", "sugarAlcoholType", "allulosePerServing", "sodiumMgPerServing", "ingredientsText", "carbSpeed", "carbSpeedReason", "confidence", "needsCorrection"],
};

/**
 * Transcription only. Every field here is written straight into public.foods by
 * the `save` action below, so a guessed number becomes catalog data other
 * athletes rely on — hence the hard rule against inferring anything.
 */
const LABEL_INSTRUCTIONS = [
  "Extract only text and nutrition values visible on this package. Never guess a missing number and convert nothing.",
  "Use 0 for an unreadable numeric field and set needsCorrection true.",
  "Record sugar alcohols and allulose only when printed; name a sugar alcohol type only when the label states it, otherwise unknown.",
  "Classify carb speed practically from visible ingredients, fiber, fat and food structure. It is an estimate.",
].join(" ");

const safeNumber = (value: unknown, max = 10000) => Math.min(max, Math.max(0, Number(value) || 0));

function serverClient() {
  const secrets = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Object.values(secrets)[0];
  const url = Deno.env.get("SUPABASE_URL");
  if (!url || !key) throw new Error("Database credentials are unavailable.");
  return createClient(url, String(key), { auth: { persistSession: false } });
}

async function currentUserId(request: Request, admin: any) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  return data.user?.id || null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await request.json();
    const admin = serverClient();
    const userId = await currentUserId(request, admin);
    if (!userId) return Response.json({ error: "Sign in before contributing a product label." }, { status: 401, headers: corsHeaders });

    if (body.action === "save") {
      const food = body.food || {};
      const grams = Math.max(1, safeNumber(food.servingGrams, 5000));
      const factor = 100 / grams;
      const sourceProductId = food.barcode ? `barcode:${String(food.barcode).replace(/\D/g, "")}` : `contribution:${crypto.randomUUID()}`;
      const row = {
        source_id: "label", source_product_id: sourceProductId, barcode: String(food.barcode || "").replace(/\D/g, "") || null,
        name: String(food.productName || "Contributed product").slice(0, 140), brand: String(food.brand || "").slice(0, 100) || null,
        description: String(food.ingredientsText || "").slice(0, 1500) || null, category: "packaged food",
        carb_speed_tier_id: ["fast", "medium", "slow"].includes(food.carbSpeed) ? food.carbSpeed : "medium",
        carb_speed_confidence: Math.min(70, safeNumber(food.confidence, 100)), carb_speed_reason: String(food.carbSpeedReason || "Estimated from the package label.").slice(0, 240),
        calories_per_100g: safeNumber(food.caloriesPerServing) * factor, carbs_per_100g: safeNumber(food.carbsPerServing) * factor,
        protein_per_100g: safeNumber(food.proteinPerServing) * factor, fat_per_100g: safeNumber(food.fatPerServing) * factor,
        fiber_per_100g: safeNumber(food.fiberPerServing) * factor, sugar_per_100g: safeNumber(food.sugarPerServing) * factor,
        sugar_alcohols_per_100g: safeNumber(food.sugarAlcoholsPerServing) * factor,
        sugar_alcohol_type: safeNumber(food.sugarAlcoholsPerServing) > 0 ? String(food.sugarAlcoholType || "unknown") : null,
        allulose_per_100g: safeNumber(food.allulosePerServing) * factor,
        sodium_mg_per_100g: safeNumber(food.sodiumMgPerServing) * factor, data_quality_score: Math.min(70, safeNumber(food.confidence, 100)),
        is_verified: false, raw_source_data: { contribution_user_id: userId, captured_at: new Date().toISOString(), serving_label: food.servingLabel, serving_grams: grams },
      };
      const { data, error } = await admin.from("foods").upsert(row, { onConflict: "source_id,source_product_id" }).select().single();
      if (error) throw error;
      await admin.from("food_portions").upsert({ food_id: data.id, label: String(food.servingLabel || "1 serving"), amount: 1, unit: "serving", gram_weight: grams, is_default: true, source_description: "User-submitted package label" }, { onConflict: "food_id,label,amount,unit" });
      const barcode = String(food.barcode || "").replace(/\D/g, "");
      if (barcode.length >= 8) {
        const aliases = new Set([barcode]);
        if (barcode.length === 12) aliases.add(`0${barcode}`);
        if (barcode.length === 13 && barcode.startsWith("0")) aliases.add(barcode.slice(1));
        await admin.from("food_barcode_aliases").upsert([...aliases].map((code) => ({ barcode: code, food_id: data.id, source: "label" })), { onConflict: "barcode" });
      }
      return Response.json({ food: data, reviewStatus: "pending" }, { headers: corsHeaders });
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return Response.json({ error: "Label scanning has not been configured yet." }, { status: 503, headers: corsHeaders });
    const image = String(body.imageBase64 || "");
    if (!image || image.length > 8_000_000) return Response.json({ error: "Use one clear label photo under 6 MB." }, { status: 400, headers: corsHeaders });

    // Reading a label is a vision call, so it spends the same weekly allowance
    // as a meal scan. Saving a contributed product (above) stays free.
    const credit = await consumeAiCredit(request, "scan");
    if (!credit) return Response.json({ error: "We could not verify your scan allowance. Please sign in and try again." }, { status: 401, headers: corsHeaders });
    if (!credit.allowed) return limitReachedResponse(credit);
    // Reading printed values off a package is transcription, not reasoning, so
    // the output is a fixed set of ~20 short fields. The old 3000-token ceiling
    // was roughly three times what the schema can even produce.
    const result = await callVision({
      feature: "label_vision",
      request,
      userId,
      apiKey,
      instructions: LABEL_INSTRUCTIONS,
      userText: "Read the product name, brand, barcode if visible, serving size, nutrition facts and ingredient list. Flag uncertain fields for correction.",
      imageBase64: image,
      schemaName: "strictlyfuel_label",
      schema: labelSchema,
      maxOutputTokens: 900,
      timeoutMs: 50_000,
    });

    if (!result.ok) {
      return Response.json({ error: "The label could not be read. Try a flatter, brighter photo." }, { status: 502, headers: corsHeaders });
    }
    return Response.json(JSON.parse(result.text), { headers: corsHeaders });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "Label scan failed." }, { status: 500, headers: corsHeaders });
  }
});
