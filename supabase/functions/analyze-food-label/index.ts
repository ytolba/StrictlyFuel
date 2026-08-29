import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { consumeAiCredit, limitReachedResponse } from "../_shared/aiCredits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const labelSchema = {
  type: "object", additionalProperties: false,
  properties: {
    productName: { type: "string" }, brand: { type: "string" }, barcode: { type: "string" },
    servingLabel: { type: "string" }, servingGrams: { type: "number" },
    caloriesPerServing: { type: "number" }, carbsPerServing: { type: "number" }, proteinPerServing: { type: "number" },
    fatPerServing: { type: "number" }, fiberPerServing: { type: "number" }, sugarPerServing: { type: "number" },
    sodiumMgPerServing: { type: "number" }, ingredientsText: { type: "string" },
    carbSpeed: { type: "string", enum: ["fast", "medium", "slow"] }, carbSpeedReason: { type: "string" },
    confidence: { type: "integer", minimum: 0, maximum: 100 }, needsCorrection: { type: "boolean" },
  },
  required: ["productName", "brand", "barcode", "servingLabel", "servingGrams", "caloriesPerServing", "carbsPerServing", "proteinPerServing", "fatPerServing", "fiberPerServing", "sugarPerServing", "sodiumMgPerServing", "ingredientsText", "carbSpeed", "carbSpeedReason", "confidence", "needsCorrection"],
};

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
        sodium_mg_per_100g: safeNumber(food.sodiumMgPerServing) * factor, data_quality_score: Math.min(70, safeNumber(food.confidence, 100)),
        is_verified: false, raw_source_data: { contribution_user_id: userId, captured_at: new Date().toISOString(), serving_label: food.servingLabel, serving_grams: grams },
      };
      const { data, error } = await admin.from("foods").upsert(row, { onConflict: "source_id,source_product_id" }).select().single();
      if (error) throw error;
      await admin.from("food_portions").upsert({ food_id: data.id, label: String(food.servingLabel || "1 serving"), amount: 1, unit: "serving", gram_weight: grams, is_default: true, source_description: "User-submitted package label" }, { onConflict: "food_id,label,amount,unit" });
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
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_LABEL_MODEL") || "gpt-5.6-luna", store: false, reasoning: { effort: "low" }, max_output_tokens: 3000,
        instructions: "Extract only text and nutrition values visible on this package. Never guess a missing number. Convert nothing beyond directly reading the serving values. Use 0 for an unreadable numeric field and set needsCorrection true. Classify carb speed practically from the visible ingredients, fiber, fat, food structure, and intended pre-workout use. This classification is an estimate.",
        input: [{ role: "user", content: [
          { type: "input_text", text: "Read the product name, brand, barcode if visible, serving size, full nutrition facts, and ingredient list. Flag any uncertain fields for correction." },
          { type: "input_image", image_url: `data:image/jpeg;base64,${image}`, detail: "high" },
        ] }],
        text: { format: { type: "json_schema", name: "strictlyfuel_label", strict: true, schema: labelSchema } },
      }), signal: AbortSignal.timeout(50_000),
    });
    if (!response.ok) {
      console.error("OpenAI label response", response.status, (await response.text()).slice(0, 600));
      return Response.json({ error: "The label could not be read. Try a flatter, brighter photo." }, { status: 502, headers: corsHeaders });
    }
    const payload = await response.json();
    const outputText = payload.output_text || payload.output?.flatMap((item: any) => item.content || []).find((part: any) => part.type === "output_text")?.text;
    if (!outputText) throw new Error("No label details were returned.");
    return Response.json(JSON.parse(outputText), { headers: corsHeaders });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "Label scan failed." }, { status: 500, headers: corsHeaders });
  }
});
